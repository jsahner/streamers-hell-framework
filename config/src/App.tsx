import { Layout, Spin } from "antd";
import React from "react";
import {
  Channel,
  ConfigAvailable,
  ConfigAvailableClient,
  ConfigRegister,
  InfoOpen,
  InterfaceSettings,
  ModificationInfo,
  NextPoll,
  PollSettings
} from "./api";
import { Content } from "./components/Content";
import Header from "./components/Header";
import { SendUpdateMessage } from "./Updater";

interface State {
  channel?: Channel;
  clients: ConfigAvailableClient[];
  connected: boolean;
  initialized: ModificationInfo[];
  nextPoll?: number;
  pollActive: boolean;
  pollSettings?: PollSettings;
  savingChanges: boolean;
  uiSettings?: InterfaceSettings;
}

export default class App extends React.Component<{}, State> {
  socket!: WebSocket;

  state: State = {
    clients: [],
    connected: false,
    initialized: [],
    pollActive: false,
    savingChanges: false
  };

  updateTimer = setInterval(() => {
    // send updates to SHF if there are any
    const sent = SendUpdateMessage(this.socket);

    if (sent) {
      this.setState({ savingChanges: true });
    }

    this.setState(prev => ({
      nextPoll:
        prev.nextPoll !== undefined && prev.nextPoll > 0
          ? prev.nextPoll - 1
          : undefined
    }));
  }, 1000);

  constructor(props: {}) {
    super(props);
    this.initializeSocket();
  }

  /**
   * Connect to core and initialize state.
   */
  initializeSocket() {
    this.socket = new WebSocket("ws://localhost:61000");

    this.socket.onclose = () => {
      this.setState({
        channel: undefined,
        connected: false,
        initialized: [],
        nextPoll: undefined
      });
      setTimeout(() => this.initializeSocket(), 1000);
    };

    this.socket.onmessage = ev => this.onMessage(ev.data);

    this.socket.onopen = () => {
      // once connected, register as configuration client
      this.setState({ connected: true });
      const msg: ConfigRegister = {
        type: "Config.Register"
      };

      this.socket.send(JSON.stringify(msg));
    };
  }

  handleAvailable(msg: ConfigAvailable) {
    this.setState({
      channel: msg.channel,
      clients: msg.clients,
      pollSettings: msg.pollSettings,
      savingChanges: false,
      uiSettings: msg.interfaceSettings
    });
  }

  handleInfoOpen(msg: InfoOpen) {
    const { modifications, nextPoll, pollActive } = msg.data;
    this.setState({ initialized: modifications, nextPoll, pollActive });
  }

  onMessage(message: string) {
    const msg = JSON.parse(message);

    switch (msg.type) {
      case "Config.Available":
        this.handleAvailable(msg);
        break;
      case "Info.Open":
        this.handleInfoOpen(msg);
        break;
      case "NextPoll":
        this.setState({ nextPoll: (msg as NextPoll).in });
        break;
      case "NextPollCanceled":
        this.setState({ nextPoll: undefined });
        break;
      case "PollStarted":
        this.setState({ pollActive: true });
        break;
      case "PollStopped":
        this.setState({ pollActive: false });
        break;
    }
  }

  render() {
    const {
      channel,
      clients,
      connected,
      initialized,
      nextPoll,
      pollActive,
      pollSettings,
      savingChanges,
      uiSettings
    } = this.state;

    return (
      <Spin
        spinning={!connected || savingChanges}
        size="large"
        tip={!connected ? "Connecting ..." : "Saving changes ..."}
      >
        <Layout>
          <Layout.Header style={{ paddingLeft: 16, paddingRight: 16 }}>
            <Header
              channel={channel}
              nextPoll={nextPoll}
              pollActive={pollActive}
              socket={this.socket}
            />
          </Layout.Header>

          <Layout.Content
            style={{
              padding: "24px 16px 0",
              overflow: "initial",
              minHeight: "100vh"
            }}
          >
            <Content
              clients={clients}
              initialized={initialized}
              uiSettings={uiSettings}
              pollSettings={pollSettings}
              socket={this.socket}
            />
          </Layout.Content>
        </Layout>
      </Spin>
    );
  }
}
