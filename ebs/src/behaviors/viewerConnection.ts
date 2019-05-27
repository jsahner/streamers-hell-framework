import jwt from "jsonwebtoken";
import WebSocket from "ws";
import {
  NextPoll,
  ResultVotingMode,
  SetConfig,
  ViewerAuthorization,
  ViewerRole,
  Vote
} from "../API";
import { extensionJwtDecoder, voteDecoder } from "../decoders";
import { EBS_KEY, streamers, viewers } from "../globals";
import { IVoteOptions } from "../interfaces/internals";
import {
  LogViewerConnectionKill,
  LogViewerDisconnected,
  LogViewerIdentification,
  LogViewerMessageHandlingError,
  LogViewerVote
} from "../interfaces/logMessages";
import { IExtensionJWT } from "../interfaces/twitchMessages";
import log from "../log";
import ChannelConnection from "./channelConnection";
import { Connection } from "./connection";

export enum InternalViewerRole {
  Anonymous,
  Unlinked,
  Linked,
  Subscriber,
  Moderator,
  Broadcaster
}

/**
 * Handles the communication with a viewer on Twitch.
 */
export default class ViewerConnection extends Connection {
  /**
   * ID of channel this viewer is connected to.
   */
  public get channelId() {
    return this.token.channel_id;
  }

  /**
   * Viewer status in channel. Defaults to anonymous.
   */
  public get role(): InternalViewerRole {
    return this.ownRole;
  }

  public set role(value: InternalViewerRole) {
    this.ownRole = value;
  }

  /**
   * Returns the Twitch user ID if available. Otherwise the opaque user ID.
   */
  public get viewerId() {
    return this.token.user_id || this.token.opaque_user_id;
  }

  /**
   * How long the viewer wants to execute a respective modification.
   */
  private duration?: number;

  /**
   * The voting mode this viewer prefers.
   */
  private mode?: ResultVotingMode;

  /**
   * The modification this viewer voted on.
   */
  private modification?: string;

  /**
   * Whether the user voted for "no modification". Takes preference over the
   * modification field.
   */
  private noModification?: boolean;

  /**
   * The role of this viewer.
   */
  private ownRole = InternalViewerRole.Anonymous;

  constructor(socket: WebSocket, private token: IExtensionJWT) {
    super(socket);
    socket.on("close", () => this.onClose());
    socket.on("message", data => this.onMessage(data));

    this.updateAuthorization(token);

    // send initial information
    const channel = this.getChannel();

    if (!channel) {
      return;
    }

    const config = channel.Configuration;

    if (!config) {
      return;
    }

    const configMsg: SetConfig = {
      data: config,
      type: "SetConfig"
    };

    this.send(JSON.stringify(configMsg));

    const nextPoll = channel.NextPoll;
    const now = new Date().getTime();

    if (nextPoll !== undefined && nextPoll > now) {
      const nextPollMsg: NextPoll = {
        in: Math.round((nextPoll - now) / 1000),
        type: "NextPoll"
      };

      this.send(JSON.stringify(nextPollMsg));
    }
  }

  public getChannel(): ChannelConnection | undefined {
    return streamers.get(this.channelId);
  }

  /**
   * Returns the viewer's current votes.
   */
  public getVotes(): IVoteOptions {
    return {
      duration: this.duration,
      mode: this.mode,
      modification: this.modification,
      noModification: this.noModification
    };
  }

  public kill(): void {
    const logMsg: LogViewerConnectionKill = {
      channel: this.channelId,
      type: "ConnectionKilled",
      viewer: this.viewerId
    };

    log.info(logMsg);
    this.ws.terminate();
    this.onClose();
  }

  /**
   * Returns the viewer's current votes and resets them.
   */
  public resetVotes(): IVoteOptions {
    const res = this.getVotes();

    this.duration = undefined;
    this.modification = undefined;
    this.noModification = undefined;
    return res;
  }

  /**
   * Send a message to this viewer through the WebSocket connection.
   */
  public send(msg: string) {
    this.ws.send(msg);
  }

  private getRoleMessage(): ViewerRole {
    let role:
      | "anonymous"
      | "unlinked"
      | "linked"
      | "subscriber"
      | "moderator"
      | "broadcaster";

    switch (this.ownRole) {
      case InternalViewerRole.Anonymous:
        role = "anonymous";
        break;
      case InternalViewerRole.Linked:
        role = "linked";
        break;
      case InternalViewerRole.Unlinked:
        role = "unlinked";
        break;
      case InternalViewerRole.Subscriber:
        role = "subscriber";
        break;
      case InternalViewerRole.Moderator:
        role = "moderator";
        break;
      case InternalViewerRole.Broadcaster:
        role = "broadcaster";
        break;
      default:
        role = "anonymous";
        break;
    }

    return {
      data: role,
      type: "Role"
    };
  }

  /**
   * Executes if the WebSocket connection closes. Deletes this viewer from the
   * global connection list.
   */
  private onClose() {
    const logMsg: LogViewerDisconnected = {
      channel: this.channelId,
      type: "ViewerDisconnected",
      viewer: this.viewerId
    };

    log.info(logMsg);
    viewers.delete(this);
  }

  /**
   * Handles an incoming message.
   */
  private onMessage(data: WebSocket.Data) {
    if (typeof data !== "string") {
      return;
    }

    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case "ViewerAuthorization":
          return this.updateAuthorization(
            extensionJwtDecoder.runWithException(
              jwt.verify((msg as ViewerAuthorization).token, EBS_KEY)
            )
          );

        case "Vote":
          return this.vote(voteDecoder.runWithException(msg));

        default:
          break;
      }
    } catch (err) {
      const logError: LogViewerMessageHandlingError = {
        channel: this.channelId,
        error: err,
        message: data,
        type: "MessageHandlingError",
        viewer: this.viewerId
      };

      log.error(logError);
      return;
    }
  }

  /**
   * Executed upon receiving a new authorization token. Updates the respective
   * properties and sends an IRole message to the client.
   */
  private async updateAuthorization(token: IExtensionJWT) {
    let previousId: string | undefined;

    // necessary comparison in case constructor calls this method
    if (this.token) {
      previousId = this.viewerId;
    }

    this.token = token;

    if (this.viewerId === previousId) {
      previousId = undefined;
    }

    switch (this.token.role) {
      case "viewer":
        if (this.token.user_id) {
          const channel = this.getChannel();

          this.ownRole =
            channel && (await channel.isSubscriber(this.token.user_id))
              ? InternalViewerRole.Subscriber
              : InternalViewerRole.Linked;
        } else {
          this.ownRole = this.token.opaque_user_id.startsWith("U")
            ? InternalViewerRole.Unlinked
            : InternalViewerRole.Anonymous;
        }
        break;

      case "moderator":
        this.ownRole = InternalViewerRole.Moderator;
        break;

      case "broadcaster":
        this.ownRole = InternalViewerRole.Broadcaster;
        break;
    }

    const logAuth: LogViewerIdentification = {
      channel: this.channelId,
      previousId,
      role: InternalViewerRole[this.ownRole].toLowerCase() as any,
      type: "ViewerIdentification",
      viewer: this.viewerId
    };

    log.info(logAuth);
    this.send(JSON.stringify(this.getRoleMessage()));
  }

  /**
   * Handles an incoming vote from this viewer. This can set any of the
   * `duration`, `mode`, `modification` and `noModification` properties.
   */
  private vote(msg: Vote) {
    const { duration, mode, modification, noModification } = msg.data;

    if (mode) {
      this.mode = mode === "reset" ? undefined : mode;
    }

    this.duration = duration || this.duration;

    if (modification) {
      this.noModification = undefined;
      this.modification = modification === "reset" ? undefined : modification;
    }

    if (noModification !== undefined) {
      this.modification = undefined;
      this.noModification = noModification;
      this.duration = undefined;
    }

    const logVote: LogViewerVote = {
      channel: this.channelId,
      duration: this.duration,
      mode: this.mode,
      modification: this.noModification ? null : this.modification,
      type: "Vote",
      viewer: this.viewerId
    };

    log.info(logVote);
  }
}
