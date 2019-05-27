import { setInterval } from "timers";
import WebSocket from "ws";
import {
  Authorization,
  AuthorizationSuccess,
  NextPoll,
  NextPollCanceled,
  PollError,
  PollParticipants,
  PollResult,
  PollStarted,
  PollStopped,
  SetConfig,
  SetConfigData,
  StartPoll,
  StartPollOption,
  ViewerRole,
  VotingMode
} from "../API";
import CancellationToken from "../cancellationToken";
import {
  nextPollDecoder,
  pollWinnerDecoder,
  setConfigDecoder,
  startPollDecoder
} from "../decoders";
import { streamers, viewers } from "../globals";
import { sleep, toViewerRole, verifyAndSaveImage } from "../helpers";
import { IPoll } from "../interfaces/internals";
import {
  LogAuthorizationSuccess,
  LogChannelDisconnect,
  LogChannelMessageHandlingError,
  LogChannelPollHandlingError,
  LogChannelPollStart,
  LogChannelReceivedMessage,
  LogChannelRevokeAccess,
  LogPollCanceled,
  LogPollResult,
  LogViewerIdentification
} from "../interfaces/logMessages";
import { ITwitchAuth, ITwitchChannel } from "../interfaces/twitchMessages";
import log from "../log";
import TwitchAPI, { revokeAccess } from "../twitchApi";
import { Connection } from "./connection";
import ViewerConnection, { InternalViewerRole } from "./viewerConnection";

const subscriberRole: ViewerRole = {
  data: "subscriber",
  type: "Role"
};
const subscriberMessage = JSON.stringify(subscriberRole);

/**
 * Checks whether the specified scopes suffice
 * @param scopes Scopes in OAuth token
 */
function checkScopes(scopes: string[]): boolean {
  let channelCheckSubscription = false;
  let channelRead = false;

  for (const scope of scopes) {
    switch (scope) {
      case "channel_check_subscription":
        channelCheckSubscription = true;
        break;
      case "channel_read":
        channelRead = true;
        break;
      default:
        continue;
    }

    if (channelCheckSubscription && channelRead) {
      return true;
    }
  }

  return false;
}

function getIntermediatePollResults(
  viewerConnections: ViewerConnection[],
  mode: VotingMode,
  data: IPoll | PollParticipants
): PollResult {
  if (typeof data !== "string") {
    return getPollResults(data, viewerConnections, mode, false);
  }

  if (mode !== "viewers") {
    return {
      data: {
        mode: { plurality: 0, weighted_random: 0 },
        mods: {},
        nothing: 0
      },
      type: "PollResult"
    };
  }

  const minRole = toViewerRole(data);

  const [plurality, weightedRandom] = viewerConnections
    .filter(v => v.role >= minRole)
    .reduce(
      ([p, wr], v): [number, number] => {
        switch (v.getVotes().mode) {
          case "plurality":
            return [p + 1, wr];
          case "weighted_random":
            return [p, wr + 1];
          default:
            return [p, wr];
        }
      },
      [0, 0]
    );

  return {
    data: {
      mode: { plurality, weighted_random: weightedRandom },
      mods: {},
      nothing: 0
    },
    type: "PollResult"
  };
}

function getPollResults(
  poll: IPoll,
  viewerConnections: ViewerConnection[],
  mode: VotingMode,
  reset = true
): PollResult {
  const { allowNothing, options, participants } = poll;

  const optionMap = new Map<string, number>(
    options.map((val, i): [string, number] => [val.id, i])
  );

  const minimumViewerRole = toViewerRole(participants);

  /**
   * Last entry is "no Modification"
   */
  const voteCount = Array<number>(optionMap.size + 1);
  voteCount.fill(0);

  const modeCount = { plurality: 0, weighted_random: 0 };

  const durationCount = Array<{ count: number; sum: number }>(optionMap.size);
  durationCount.fill({ count: 0, sum: 0 });

  for (const viewer of viewerConnections) {
    const v = reset ? viewer.resetVotes() : viewer.getVotes();

    if (viewer.role < minimumViewerRole) {
      // Viewer has insufficient role
      continue;
    }

    if (mode === "viewers" && v.mode) {
      // count mode votes if allowed and specified
      if (v.mode === "plurality") {
        modeCount.plurality++;
      } else {
        modeCount.weighted_random++;
      }
    }

    if (allowNothing && v.noModification) {
      // check if it's allowed to vote for "no modification" and increase count
      voteCount[voteCount.length - 1]++;
      continue;
    }

    if (!v.modification) {
      continue;
    }

    // if modification specified, increase count
    const index = optionMap.get(v.modification);

    if (index === undefined) {
      continue;
    }

    voteCount[index]++;

    if (v.duration === undefined) {
      continue;
    }

    // account for voted duration
    const { minLength, maxLength } = options[index];

    let duration: number;
    if (v.duration < minLength) {
      duration = minLength;
    } else if (v.duration > maxLength) {
      duration = maxLength;
    } else {
      duration = v.duration;
    }

    const counter = durationCount[index];
    counter.count++;
    counter.sum += duration;
  }
  // evaluate modification counts
  const resultMods: {
    [modId: string]: { count: number; duration: number };
  } = {};

  for (const o of options) {
    const index = optionMap.get(o.id);

    if (index !== undefined) {
      const durationCounter = durationCount[index];
      resultMods[o.id] = {
        count: voteCount[index],
        duration:
          durationCounter.count === 0
            ? 0
            : Math.floor(durationCounter.sum / durationCounter.count)
      };
    }
  }

  // return results
  return {
    data: {
      mode: modeCount,
      mods: resultMods,
      nothing: voteCount[voteCount.length - 1]
    },
    type: "PollResult"
  };
}

/**
 * Saves all provided images from an `IStartPoll` message and updates the passed
 * object accordingly.
 */
async function saveImageAndSetFilename(option: StartPollOption) {
  const { logo } = option;

  if (logo === undefined) {
    return;
  }

  if (logo.type === "emoji") {
    return;
  }

  const filename = await verifyAndSaveImage(Buffer.from(logo.data, "base64"));

  if (filename) {
    logo.data = filename;
  } else {
    option.logo = undefined;
  }
}

/**
 * Handles the communication to an authorized streamer/channel.
 */
export default class ChannelConnection extends Connection {
  /**
   * Returns the channel ID.
   */
  public get channelId(): string {
    return this.channel._id;
  }

  /**
   * Returns all known viewers that are connected to this channel.
   */
  public get ownViewers(): ViewerConnection[] {
    const res = Array<ViewerConnection>();

    viewers.forEach(v => {
      if (v.channelId === this.channelId) {
        res.push(v);
      }
    });

    return res;
  }

  /**
   * Returns the current configuration as read-only object.
   */
  public get Configuration(): Readonly<SetConfigData> | undefined {
    return this.config;
  }

  /**
   * Next poll unix timestamp (milliseconds)
   */
  public get NextPoll() {
    return this.nextPoll;
  }

  /**
   * Returns whether a poll is running right now.
   */
  public get pollActive(): boolean {
    return this.currentPoll !== undefined;
  }

  /**
   * Tries to authorize the user and returns a StreamerConnection object.
   */
  public static async from(
    ws: WebSocket,
    msg: Authorization
  ): Promise<ChannelConnection> {
    const { code } = msg.data;

    let auth: ITwitchAuth;
    try {
      auth = await TwitchAPI.authorize(code);
    } catch {
      return Promise.reject(
        `Could not authorize channel. Provided code: ${code}`
      );
    }

    if (!checkScopes(auth.scope)) {
      return Promise.reject("Authorization code grants insufficient rights");
    }

    let tChannel: ITwitchChannel;
    try {
      tChannel = await TwitchAPI.getChannel(auth);
    } catch {
      revokeAccess(auth);
      return Promise.reject(
        "Could not retrieve channel from Twitch API, revoking access token"
      );
    }

    const logAuth: LogAuthorizationSuccess = {
      channel: tChannel._id,
      success: true,
      type: "Authorization"
    };

    log.info(logAuth);

    const res: AuthorizationSuccess = {
      data: {
        id: +tChannel._id,
        logo: tChannel.logo,
        name: tChannel.name
      },
      type: "Authorization.Success"
    };

    ws.send(JSON.stringify(res));
    return new ChannelConnection(ws, auth, tChannel);
  }

  /**
   * Current configuration.
   */
  private config?: SetConfigData;

  /**
   * Sends intermediate poll results.
   */
  private readonly resultTimer: NodeJS.Timer;

  /**
   * The currently active poll.
   */
  private currentPoll?: IPoll;

  /**
   * When the next poll will take place (unix timestamp in milliseconds)
   */
  private nextPoll?: number;

  private constructor(
    socket: WebSocket,
    /**
     * The authorization token of the streamer.
     */
    private owner: ITwitchAuth,
    /**
     * Information about this channel (provided by Twitch API).
     */
    private channel: ITwitchChannel
  ) {
    super(socket);
    this.ws.on("close", () => this.onClose());
    this.ws.on("message", data => this.onMessage(data));

    this.resultTimer = setInterval((): void => {
      let msg: PollResult;

      if (this.config) {
        if (this.currentPoll) {
          msg = getIntermediatePollResults(
            this.ownViewers,
            this.config.mode,
            this.currentPoll
          );
        } else if (this.config.mode === "viewers") {
          msg = getIntermediatePollResults(
            this.ownViewers,
            this.config.mode,
            this.config.participants
          );
        } else {
          return;
        }

        const logPollResult: LogPollResult = {
          channel: this.channelId,
          intermediate: true,
          result: msg.data,
          type: "PollResult"
        };

        log.info(logPollResult);

        this.sendMessageToChannel(JSON.stringify(msg));
      }
    }, 2000);

    // asynchronous update of roles of viewers that were already connected, only
    // changes if viewer is "Linked"
    this.ownViewers.forEach(viewer => {
      const { role, viewerId } = viewer;

      if (role !== InternalViewerRole.Linked) {
        return;
      }

      this.isSubscriber(viewerId).then(subscribed => {
        if (subscribed) {
          viewer.role = InternalViewerRole.Subscriber;
          viewer.send(subscriberMessage);

          const logIdent: LogViewerIdentification = {
            channel: this.channelId,
            role: "subscriber",
            type: "ViewerIdentification",
            viewer: viewerId
          };

          log.info(logIdent);
        }
      });
    });
  }

  /**
   * Sets a token to cancel the current poll handling on this channel.
   */
  public cancelPoll(): void {
    if (this.currentPoll === undefined) {
      return;
    }

    this.currentPoll.cancelToken.cancel();
    this.currentPoll = undefined;

    const logCancel: LogPollCanceled = {
      channel: this.channelId,
      type: "PollCanceled"
    };

    log.info(logCancel);

    this.sendPollStopped();
    this.ownViewers.forEach(v => v.resetVotes());
  }

  /**
   * Checks whether the specified user ID is subscribed to the channel
   * represented by this connection.
   * @param userId
   */
  public isSubscriber(userId: string) {
    return TwitchAPI.isSubscriber(
      this.owner,
      this.channelId.toString(),
      userId
    );
  }

  /**
   * Kill connection, end channel activity and revoke access token.
   */
  public kill() {
    const logDisconnect: LogChannelDisconnect = {
      channel: this.channelId,
      type: "ChannelDisconnected"
    };

    log.info(logDisconnect);

    this.ws.terminate();
    this.onClose();
  }

  /**
   * Handles a `StartPoll` request.
   */
  private async handlePoll({ data: msg }: StartPoll): Promise<PollResult> {
    if (this.pollActive) {
      return Promise.reject("Another poll is already running");
    }

    if (!this.config) {
      return Promise.reject("Streamer did not send configuration yet");
    }

    msg.duration = Math.max(msg.duration, 30);

    const myPoll: IPoll = {
      allowNothing: msg.allowNothing,
      cancelToken: new CancellationToken(),
      options: msg.options,
      participants: this.config.participants
    };

    this.currentPoll = myPoll;

    const { cancelToken } = myPoll;

    await Promise.all(msg.options.map(o => saveImageAndSetFilename(o)));

    if (cancelToken.isCanceled) {
      return Promise.reject("Poll canceled");
    }

    const channelMsg: StartPoll = {
      data: msg,
      type: "StartPoll"
    };

    try {
      await this.sendMessageToChannel(JSON.stringify(channelMsg));
    } catch (err) {
      this.currentPoll = undefined;
      return Promise.reject("Could not send StartPoll message to channel");
    }

    for (let i = 0; i < msg.duration; i++) {
      await sleep(1000);

      if (cancelToken.isCanceled) {
        return Promise.reject("Poll canceled");
      }
    }

    // handling done => set currentPoll to undefined
    this.sendPollStopped();

    this.currentPoll = undefined;
    return getPollResults(myPoll, this.ownViewers, this.config.mode, true);
  }

  /**
   * Stops channel activity and revokes access token.
   */
  private onClose(): void {
    const logDisconnect: LogChannelDisconnect = {
      channel: this.channelId,
      type: "ChannelDisconnected"
    };

    log.info(logDisconnect);

    this.cancelPoll();

    if (this.nextPoll !== undefined && this.nextPoll > new Date().getTime()) {
      const msg: NextPollCanceled = { type: "NextPollCanceled" };
      this.sendMessageToChannel(JSON.stringify(msg));
    }

    this.revokeAccess();

    clearInterval(this.resultTimer);
    streamers.delete(this.channelId);
  }

  /**
   * Handles incoming messages.
   */
  private onMessage(data: WebSocket.Data): void {
    if (typeof data !== "string") {
      return;
    }

    try {
      const msg = JSON.parse(data);

      const logReceived: LogChannelReceivedMessage = {
        channel: this.channelId,
        message: msg,
        type: "ReceivedMessage"
      };

      log.debug(logReceived);

      switch (msg.type) {
        case "NextPoll":
          this.setNextPoll(nextPollDecoder.runWithException(msg));
          break;

        case "NextPollCanceled":
          this.nextPoll = undefined;
          const cancelMsg: NextPollCanceled = { type: "NextPollCanceled" };
          this.sendMessageToChannel(JSON.stringify(cancelMsg));
          break;

        case "PollStopped":
          this.cancelPoll();
          this.nextPoll = undefined;
          break;

        case "SetConfig":
          this.setConfig(setConfigDecoder.runWithException(msg));
          break;

        case "StartPoll":
          this.startPoll(startPollDecoder.runWithException(msg));
          break;

        case "PollWinner":
          if (pollWinnerDecoder.run(msg).ok) {
            this.sendMessageToChannel(data);
          }
          break;

        default:
          break;
      }
    } catch (err) {
      const logError: LogChannelMessageHandlingError = {
        channel: this.channelId,
        error: err,
        message: data,
        type: "MessageHandlingError"
      };

      log.error(logError);
      // TODO: send error message?
    }
  }

  /**
   * Revokes the provided authorization token through the Twitch API.
   */
  private revokeAccess() {
    const logMsg: LogChannelRevokeAccess = {
      channel: this.channelId,
      type: "RevokeAccessToken"
    };

    log.debug(logMsg);
    revokeAccess(this.owner);
  }

  /**
   * Tries to send message via PubSub. If this fails or message is larger than 5KB,
   * message will be sent through the WebSocket connections.
   * @param msg
   */
  private async sendMessageToChannel(msg: string) {
    const msgSize = Buffer.byteLength(msg);

    if (
      msgSize > 5 * 1024 ||
      !(await TwitchAPI.sendPubSub(this.channelId.toString(), msg))
    ) {
      this.ownViewers.forEach(v => v.send(msg));
    }
  }

  /**
   * Sets configuration and sends notification to all viewers.
   */
  private setConfig(msg: SetConfig) {
    this.config = msg.data;
    this.sendMessageToChannel(JSON.stringify(msg));
  }

  private setNextPoll(msg: NextPoll) {
    this.nextPoll = new Date().getTime() + msg.in * 1000;
    this.sendMessageToChannel(JSON.stringify(msg));
  }

  /**
   * Sends a `PollStopped` message to all viewers of the channel.
   */
  private sendPollStopped() {
    const msg: PollStopped = { type: "PollStopped" };
    this.sendMessageToChannel(JSON.stringify(msg));
  }

  /**
   * Handles a `StartPoll` request and sends its results back to the streamer.
   */
  private async startPoll(msg: StartPoll) {
    const logStart: LogChannelPollStart = {
      channel: this.channelId,
      request: msg.data,
      type: "PollStart"
    };

    log.info(logStart);

    let results: PollResult;

    try {
      const pollStart: PollStarted = { type: "PollStarted" };
      this.ws.send(JSON.stringify(pollStart));
      results = await this.handlePoll(msg);
    } catch (err) {
      const errorMsg: PollError = {
        reason: err.toString(),
        type: "PollError"
      };

      this.ws.send(JSON.stringify(errorMsg));

      const logErr: LogChannelPollHandlingError = {
        ...errorMsg,
        channel: this.channelId,
        request: msg.data,
        type: "PollHandlingError"
      };

      log.info(logErr);

      return;
    }

    const logResult: LogPollResult = {
      channel: this.channelId,
      intermediate: false,
      result: results.data,
      type: "PollResult"
    };

    log.info(logResult);

    this.ws.send(JSON.stringify(results));
  }
}
