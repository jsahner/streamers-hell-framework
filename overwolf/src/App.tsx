import React from "react";
import { SmoothieChart, TimeSeries } from "smoothie";
import {
  ClientInitialized,
  ClientRegister,
  ExecutionStarted,
  ExecutionStartRequest,
  ExecutionStopped,
  Icon,
  InfoMessage,
  InfoOpen,
  InfoOpenData
} from "./API";
import Blink from "./Blink";
import Badge from "./components/Badge";
import Chart from "./components/Chart";
import Logo from "./components/Logo";
import { InitializeMessage } from "./customApi";
import { Overwolf } from "./overwolf";

declare const overwolf: Overwolf | undefined;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let runningInOverwolf: boolean;

try {
  runningInOverwolf = overwolf !== undefined;
} catch {
  runningInOverwolf = false;
}

const blinkId = "Blink";
const clientId = runningInOverwolf ? "Overwolf" : "OverwolfExternal";
const edaId = "Empatica|EDA";
const heartRateId = "Empatica|HeartRate";
const temperatureId = "Empatica|Temperature";

const blinkStarted: ExecutionStarted = {
  type: "Execution.Started",
  modificationId: blinkId
};
const blinkStartedMsg = JSON.stringify(blinkStarted);

const blinkStopped: ExecutionStopped = {
  type: "Execution.Stopped",
  modifications: [blinkId]
};
const blinkStoppedMsg = JSON.stringify(blinkStopped);

const clientInitialized: ClientInitialized = {
  type: "Client.Initialized",
  modifications: runningInOverwolf ? [blinkId] : []
};
const clientInitializedMsg = JSON.stringify(clientInitialized);

const clientRegister: ClientRegister = {
  type: "Client.Register",
  id: clientId,
  modifications: runningInOverwolf
    ? [
        {
          description: "Simulate blinking eyes",
          icon: {
            data: "👁️",
            type: "emoji"
          },
          name: blinkId
        }
      ]
    : [],
  options: [
    {
      default: true,
      description: "Status Badge: Enabled",
      id: "statusEnabled"
    },
    {
      default: "top: 0; left: 0;",
      description: "Status Badge: custom CSS",
      id: "statusCSS"
    },
    {
      default: true,
      description:
        'Extra Badge: Enabled - Displays content of "overwolfExtra" property in InfoMessage.data, regardless of supplied modification ID',
      id: "extraEnabled"
    },
    {
      default: 0,
      description:
        "Extra Badge: how long to display received data in ms (0 = infinite)",
      id: "extraDuration",
      numType: "int"
    },
    {
      default: "top: 0; right: 0;",
      description: "Extra Badge: custom CSS",
      id: "extraCSS"
    },
    {
      default: true,
      description: "Chart: Enabled",
      id: "chartEnabled"
    },
    {
      default: "bottom: 0; right: 0;",
      description: "Chart: custom CSS",
      id: "chartCSS"
    },
    {
      default: 500,
      description:
        "Chart: Render delay in ms (higher values lead to smoother charts)",
      id: "chartDelay",
      numType: "int"
    },
    {
      default: false,
      description:
        "Demo Mode (uses fake data and displays everything regardless of settings)",
      id: "demoMode"
    }
  ]
};
const registerMsg = JSON.stringify(clientRegister);

const subscribeMsg = JSON.stringify({ type: "Info.Subscribe" });

interface Props {}
interface State {
  active: string[];
  blink: boolean;
  chartCSS: string;
  chartDelay: number;
  chartEnabled: boolean;
  demoMode: boolean;
  extraCSS: string;
  extraDuration: number;
  extraData?: string;
  extraEnabled: boolean;
  showEda: boolean;
  showHeartRate: boolean;
  showTemperature: boolean;
  statusCSS: string;
  statusEnabled: boolean;
}

export default class App extends React.Component<Props, State> {
  readonly icons = new Map<string, Icon>();

  readonly chart = new SmoothieChart({
    grid: { fillStyle: "rgba(0,0,0,0.25)" },
    labels: { fontSize: 12 },
    minValueScale: 1.01,
    maxValueScale: 1.01,
    responsive: true
  });

  readonly demoChart = new SmoothieChart({
    grid: { fillStyle: "rgba(0,0,0,0.25)" },
    labels: { fontSize: 12 },
    minValueScale: 1.01,
    maxValueScale: 1.01,
    responsive: true
  });

  readonly demoData = new TimeSeries();

  readonly edaData: TimeSeries;
  readonly heartRateData: TimeSeries;
  readonly temperatureData: TimeSeries;

  /** Identifier of interval that fills the democ chart with random data */
  demoTimer?: number;

  /** Identifier of timeout function used to reset contents of extra badge */
  extraTimer?: number;

  ws!: WebSocket;

  constructor(props: Props) {
    super(props);

    // add demo data to demo chart
    this.demoChart.addTimeSeries(this.demoData, {
      strokeStyle: "#ffff00",
      fillStyle: "rgba(255,255,0,0.1)",
      lineWidth: 3
    });

    // register data series for Empatica modifications and add to regular chart
    this.edaData = new TimeSeries();
    this.heartRateData = new TimeSeries();
    this.temperatureData = new TimeSeries();

    this.edaData.disabled = this.heartRateData.disabled = this.temperatureData.disabled = true;

    this.chart.addTimeSeries(this.edaData, {
      strokeStyle: "#ffff00",
      fillStyle: "rgba(255,255,0,0.1)",
      lineWidth: 3
    });

    this.chart.addTimeSeries(this.heartRateData, {
      strokeStyle: "#00ff00",
      fillStyle: "rgba(0,255,0,0.1)",
      lineWidth: 3
    });

    this.chart.addTimeSeries(this.temperatureData, {
      strokeStyle: "#ff0000",
      fillStyle: "rgba(255,0,0,0.1)",
      lineWidth: 3
    });

    // initialize state
    this.state = {
      active: [],
      blink: false,
      chartCSS: "",
      chartDelay: 500,
      chartEnabled: true,
      demoMode: false,
      extraCSS: "",
      extraDuration: 0,
      extraEnabled: true,
      showEda: false,
      showHeartRate: false,
      showTemperature: false,
      statusCSS: "",
      statusEnabled: true
    };

    this.initializeSocket();
  }

  handleInfoMessage({ data }: InfoMessage) {
    const { overwolfExtra } = data;
    if (typeof overwolfExtra === "string") {
      // received new content for extra badge
      this.resetExtraTimer(this.state.extraDuration);
      this.setState({ extraData: overwolfExtra.trim() });
    }

    const ms = data.MicroSiemens;
    if (typeof ms === "number") {
      // received EDA value
      this.edaData.append(new Date().getTime(), ms);
    }

    const hr = data.HeartRate;
    if (typeof hr === "number") {
      // received heart rate value
      this.heartRateData.append(new Date().getTime(), hr);
    }

    const tmp = data.Celsius;
    if (typeof tmp === "number") {
      // received temperature value
      this.temperatureData.append(new Date().getTime(), tmp);
    }
  }

  handleInfoOpen({ modifications }: InfoOpenData) {
    // saves all icons
    modifications.forEach(m => m.logo && this.icons.set(m.id, m.logo));

    // sets active modifications
    const active = modifications.filter(mod => mod.running).map(mod => mod.id);
    this.setState({ active }, this.updateProps);
  }

  handleInitialize(msg: InitializeMessage) {
    if (runningInOverwolf) {
      this.ws.send(clientInitializedMsg);
    }

    this.setState(msg.options);

    clearInterval(this.demoTimer);
    this.demoData.clear();

    if (msg.options.demoMode) {
      this.demoTimer = setInterval(
        // feed demo chart with random data every 500 milliseconds
        () => this.demoData.append(new Date().getTime(), Math.random() * 100),
        500
      );
    }

    this.resetExtraTimer(msg.options.extraDuration);
  }

  resetExtraTimer(duration = 0) {
    clearInterval(this.extraTimer);

    if (duration > 0) {
      // if a timeout is set for the extra badge, schedule clearing contents
      this.extraTimer = setInterval(
        () => this.setState({ extraData: "" }),
        duration
      );
    }
  }

  /**
   * Execute blink for specified duration.
   */
  async handleStartRequest({
    length,
    modificationId: id
  }: ExecutionStartRequest) {
    if (id !== blinkId || this.state.blink) {
      return;
    }

    this.setState({ blink: true });
    this.ws.send(blinkStartedMsg);

    await sleep(length * 1000);

    this.setState({ blink: false });
    this.ws.send(blinkStoppedMsg);
  }

  onClose() {
    this.setState(
      {
        active: [],
        blink: false,
        showEda: false,
        showHeartRate: false,
        showTemperature: false
      },
      this.updateProps
    );

    setTimeout(() => {
      this.initializeSocket();
    }, 200);
  }

  onMessage(event: MessageEvent) {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case "Client.Initialize":
        this.handleInitialize(msg as InitializeMessage);
        return;

      case "Execution.StartRequest":
        this.handleStartRequest(msg as ExecutionStartRequest);
        return;

      case "Execution.StopRequest":
        this.setState({ blink: false });
        this.ws.send(blinkStoppedMsg);
        return;

      case "Execution.Started":
        this.setState(
          current => ({
            active: [
              ...current.active,
              (msg as ExecutionStarted).modificationId
            ]
          }),
          this.updateProps
        );
        return;

      case "Execution.Stopped":
        const ids = new Set((msg as ExecutionStopped).modifications);
        this.setState(
          current => ({
            active: current.active.filter(entry => !ids.has(entry))
          }),
          this.updateProps
        );
        return;

      case "Info.Open":
        this.handleInfoOpen((msg as InfoOpen).data);
        return;

      case "Info.Message":
        this.handleInfoMessage(msg);
        return;

      default:
        return;
    }
  }

  onOpen() {
    this.ws.send(registerMsg);
    this.ws.send(subscribeMsg);
  }

  initializeSocket() {
    this.ws = new WebSocket("ws://127.0.0.1:61000");
    this.ws.onclose = () => this.onClose();
    this.ws.onmessage = ev => this.onMessage(ev);
    this.ws.onopen = () => this.onOpen();
  }

  /**
   * Used to find out which data series in the chart need to be displayed.
   */
  updateProps = () => {
    const { active } = this.state;

    const showEda = active.findIndex(a => a === edaId) >= 0;
    this.edaData.disabled = !showEda;

    const showHeartRate = active.findIndex(a => a === heartRateId) >= 0;
    this.heartRateData.disabled = !showHeartRate;

    const showTemperature = active.findIndex(a => a === temperatureId) >= 0;
    this.temperatureData.disabled = !showTemperature;

    this.setState({ showEda, showHeartRate, showTemperature });
  };

  render() {
    const {
      active,
      blink,
      chartDelay,
      chartEnabled,
      chartCSS,
      demoMode,
      extraCSS,
      extraEnabled,
      extraData,
      showEda,
      showHeartRate,
      showTemperature,
      statusCSS,
      statusEnabled
    } = this.state;

    const showBlink = runningInOverwolf && (blink || demoMode);

    const showChart =
      chartEnabled && (showEda || showHeartRate || showTemperature || demoMode);

    const showExtra = extraEnabled && (extraData || demoMode);

    const showStatus = statusEnabled && (active.length > 0 || demoMode);

    return (
      <>
        {showStatus && (
          <Badge customCSS={statusCSS} key="status">
            {demoMode
              ? "👁️"
              : active.map(id => <Logo key={id} logo={this.icons.get(id)} />)}
          </Badge>
        )}

        {showExtra && (
          <Badge customCSS={extraCSS} key="extra">
            {demoMode ? "Extra Badge" : extraData}
          </Badge>
        )}

        {showChart && (
          <Chart
            delay={chartDelay}
            customCSS={chartCSS}
            key="chart"
            chart={demoMode ? this.demoChart : this.chart}
          />
        )}

        {showBlink && <Blink key="blink" />}
      </>
    );
  }
}
