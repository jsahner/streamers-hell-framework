import Tippy from "@tippy.js/react";
import React from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import {
  Icon,
  NextPoll,
  PollParticipants,
  PollResult,
  PollWinner,
  ResultVotingMode,
  SetConfig,
  SetConfigData,
  StartPoll,
  StartPollOption,
  ViewerAuthorization,
  ViewerRole
} from "./API";
import "./app.scss";
import Main from "./components/Main";
import PollHandler from "./components/PollHandler";
import SmallExplanation from "./components/SmallExplanation";
import TitleDrag from "./components/TitleDrag";
import Winner from "./components/Winner";

Tippy.defaultProps = {
  arrow: true,
  delay: 0,
  duration: 100,
  maxWidth: 250,
  theme: "sh"
};

enum InternalViewerRole {
  Anonymous,
  Unlinked,
  Linked,
  Subscriber,
  Moderator,
  Broadcaster
}

interface IState {
  config?: SetConfigData;
  connected: boolean;
  currentPoll?: {
    allowNothing: boolean;
    duration: number;
    options: StartPollOption[];
  };
  currentResults: {
    mode: { [key in ResultVotingMode]: number };
    mods: {
      [modId: string]: {
        count: number;
        duration: number;
      };
    };
    nothing: number;
  };
  finishedLoading: boolean;
  minRole?: InternalViewerRole;
  nextPoll?: number;
  role: InternalViewerRole;
  winner?: {
    duration: number;
    id: string;
    totalVotes: number;
    votes: number;
  };
}

function toViewerRole(participants: PollParticipants): InternalViewerRole {
  switch (participants) {
    case "all":
      return InternalViewerRole.Anonymous;

    case "logged_in":
      return InternalViewerRole.Unlinked;

    case "subscribers":
      return InternalViewerRole.Subscriber;

    default:
      return InternalViewerRole.Anonymous;
  }
}

export default class App extends React.Component<{}, IState> {
  authorization?: TwitchExtAuthorized;

  readonly socket = new ReconnectingWebSocket(process.env.WS_URL!, [], {
    connectionTimeout: 1000,
    maxReconnectionDelay: 1000,
    minReconnectionDelay: 500,
    minUptime: 1000,
    reconnectionDelayGrowFactor: 1
  });

  readonly descriptions = new Map<string, string>();
  readonly icons = new Map<string, Icon>();
  readonly twitch = window.Twitch ? window.Twitch.ext : null;
  readonly updateTimer = setInterval(
    () =>
      this.setState(prev => ({
        nextPoll:
          prev.nextPoll !== undefined && prev.nextPoll > 0
            ? prev.nextPoll - 1
            : undefined
      })),
    1000
  );

  constructor(props: {}) {
    super(props);

    // this.descriptions.set("HALLOWEEN", { en: 'Play "Halloween Theme"' });
    // this.icons.set("HALLOWEEN", { type: "emoji", data: "🎃" });

    this.state = {
      connected: false,
      currentResults: {
        mode: { weighted_random: 0, plurality: 0 },
        mods: {},
        nothing: 0
      },
      finishedLoading: false,
      role: InternalViewerRole.Anonymous
    };

    this.socket.onclose = () => this.onSocketClose();
    this.socket.onmessage = ev => this.onSocketMessage(ev);
    this.socket.onopen = () => this.onSocketOpen();
  }

  handleStartPoll(msg: StartPoll) {
    // save icons and names of modifications
    this.icons.clear();
    this.descriptions.clear();

    msg.data.options.forEach(o => {
      this.descriptions.set(o.id, o.description);

      if (o.logo) {
        this.icons.set(o.id, o.logo);
      } else {
        this.icons.delete(o.id);
      }
    });

    // save poll in state
    this.setState({ currentPoll: msg.data });
  }

  /**
   * Called on incoming messages either via WebSocket connection to EBS or from PubSub.
   */
  onMessage(msg: string) {
    const o = JSON.parse(msg);

    switch (o.type) {
      case "NextPoll":
        this.setState({ nextPoll: (o as NextPoll).in });
        break;

      case "NextPollCanceled":
        this.setState({ nextPoll: undefined });
        break;

      case "PollResult":
        this.setState({ currentResults: (o as PollResult).data });
        break;

      case "PollStopped":
        this.setState({ currentPoll: undefined });
        break;

      case "PollWinner":
        this.setState({ winner: (o as PollWinner).data });
        setTimeout(() => this.setState({ winner: undefined }), 10000);
        break;

      case "Role":
        let role: InternalViewerRole;

        switch ((o as ViewerRole).data) {
          case "anonymous":
            role = InternalViewerRole.Anonymous;
            break;
          case "linked":
            role = InternalViewerRole.Linked;
            break;
          case "subscriber":
            role = InternalViewerRole.Subscriber;
            break;
          case "unlinked":
            role = InternalViewerRole.Unlinked;
            break;
          case "moderator":
            role = InternalViewerRole.Moderator;
            break;
          case "broadcaster":
            role = InternalViewerRole.Broadcaster;
            break;
          default:
            role = InternalViewerRole.Anonymous;
            break;
        }

        this.setState({ role });
        break;

      case "SetConfig":
        const data = (o as SetConfig).data;
        this.setState({
          config: data,
          minRole: toViewerRole(data.participants)
        });
        break;

      case "StartPoll":
        this.handleStartPoll(o as StartPoll);
        break;
    }
  }

  /**
   * Called when a message arrived via Twitch PubSub.
   */
  onPubSub(target: string, contentType: string, body: string) {
    this.onMessage(body);
  }

  onSocketClose(): void {
    this.setState({ connected: false });
  }

  /**
   * Called when a message arrived via the WebSocket connection to EBS.
   */
  onSocketMessage(ev: MessageEvent): void {
    if (typeof ev.data === "string") {
      this.onMessage(ev.data);
    }
  }

  onSocketOpen(): void {
    this.setState({ connected: true });

    if (!this.authorization) {
      return;
    }

    // send authorization token to EBS
    const msg: ViewerAuthorization = {
      token: this.authorization.token,
      type: "ViewerAuthorization"
    };

    this.socket.send(JSON.stringify(msg));
  }

  componentDidMount() {
    if (this.twitch == null) {
      return;
    }

    // listen to PubSub messages
    this.twitch.listen("broadcast", (target, contentType, msg) =>
      this.onMessage(msg)
    );

    this.twitch.onAuthorized(auth => {
      // once Twitch sends new
      this.authorization = auth;

      const msg: ViewerAuthorization = {
        token: this.authorization.token,
        type: "ViewerAuthorization"
      };

      this.socket.send(JSON.stringify(msg));

      const { finishedLoading } = this.state;

      if (finishedLoading) {
        return;
      }

      this.setState({ finishedLoading: true });
    });
  }

  componentWillUnmount() {
    if (this.twitch) {
      this.twitch.unlisten("broadcast", () => {
        // ignored
      });
    }
  }

  render() {
    const {
      config,
      connected,
      currentPoll,
      currentResults,
      finishedLoading,
      minRole,
      nextPoll,
      role,
      winner
    } = this.state;

    if (!finishedLoading) {
      return (
        <Main>
          <TitleDrag>Loading ...</TitleDrag>
        </Main>
      );
    }

    if (!connected) {
      return (
        <Main>
          <TitleDrag>Not connected</TitleDrag>
        </Main>
      );
    }

    if (minRole === undefined || config === undefined) {
      return (
        <Main>
          <TitleDrag>Streamer not connected</TitleDrag>
        </Main>
      );
    }

    if (role < minRole) {
      // viewer may not participate in polls
      if (minRole === InternalViewerRole.Unlinked) {
        return (
          <Main>
            <TitleDrag>{config.notRegisteredHeader}</TitleDrag>
            <SmallExplanation>{config.notRegisteredText}</SmallExplanation>
          </Main>
        );
      }

      if (minRole === InternalViewerRole.Subscriber) {
        return (
          <Main>
            <TitleDrag>{config.subscribersOnlyHeader}</TitleDrag>
            <SmallExplanation>{config.subscribersOnlyText}</SmallExplanation>
          </Main>
        );
      }
    }

    let winnerSection = <></>;

    if (winner) {
      if (winner.id === "nothing") {
        winnerSection = (
          <Winner
            config={config}
            description={config.noModificationName}
            data={winner}
          />
        );
      }

      const description = this.descriptions.get(winner.id);
      const icon = this.icons.get(winner.id);

      if (description) {
        winnerSection = (
          <Winner
            config={config}
            description={description}
            icon={icon}
            data={winner}
          />
        );
      }
    }

    return (
      <Main>
        <PollHandler
          config={config}
          currentPoll={currentPoll}
          results={currentResults}
          socket={this.socket}
        />
        {winnerSection}
        {nextPoll !== undefined && nextPoll > 0 && (
          <SmallExplanation>
            {config.nextPollText.replace("%duration%", nextPoll.toString())}
          </SmallExplanation>
        )}
      </Main>
    );
  }
}
