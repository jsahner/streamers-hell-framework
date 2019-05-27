import Tippy from "@tippy.js/react";
import React, { ReactNode } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { ResultVotingMode, SetConfigData, StartPollOption, Vote } from "../API";
import ballot from "../assets/ballot.svg";
import Cell from "./Cell";
import Loader from "./Loader";
import Logo from "./Logo";
import Multiline from "./Multiline";
import Panel from "./Panel";
import Row from "./Row";
import Slider from "./Slider";
import SmallExplanation from "./SmallExplanation";
import Table from "./Table";
import Title from "./Title";
import TitleDrag from "./TitleDrag";

const PluralityIcon = (
  <div
    style={{
      backgroundImage: `url(${ballot})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: "contain",
      height: "100%",
      width: "100%"
    }}
  >
    <span style={{ visibility: "hidden" }}>🎃</span>
  </div>
);

export function toPercent(n: number): string {
  return (n * 100).toFixed(1) + "\u202f%";
}

interface IProps {
  config: SetConfigData;
  currentPoll?: {
    allowNothing: boolean;
    duration: number;
    options: StartPollOption[];
  };
  results: {
    mode: { [key in ResultVotingMode]: number };
    mods: {
      [modId: string]: {
        count: number;
        duration: number;
      };
    };
    nothing: number;
  };
  socket: ReconnectingWebSocket;
}

interface IState {
  chosenMode?: ResultVotingMode;
  chosenModification?: StartPollOption | null;
  duration: number;
  /**
   * Remaining time of vote in ms.
   */
  remainingTime: number;
}

export default class PollHandler extends React.Component<IProps, IState> {
  mounted = false;
  end = 0;
  start = 0;

  currentTimer?: number;
  sendDurationTimeout?: number;

  constructor(props: IProps) {
    super(props);

    if (this.props.currentPoll) {
      this.start = new Date().getTime();
      this.end = this.start + this.props.currentPoll.duration * 1000;
      this.currentTimer = setInterval(this.timerHandler, 1000);
    }

    this.state = {
      duration: 0,
      remainingTime: this.end - this.start
    };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillReceiveProps(nextProps: Readonly<IProps>) {
    if (nextProps.currentPoll !== this.props.currentPoll) {
      this.setState({ chosenModification: undefined });

      if (nextProps.currentPoll) {
        this.start = new Date().getTime();
        this.end = this.start + nextProps.currentPoll.duration * 1000;

        this.currentTimer = setInterval(this.timerHandler, 1000);
        this.setState({ remainingTime: this.end - this.start });
      }
    }
  }

  durationHandler = (event: React.FormEvent<HTMLInputElement>) => {
    const duration = event.currentTarget.valueAsNumber;

    this.setState({ duration });

    // debounce to reduce API calls
    clearTimeout(this.sendDurationTimeout);

    this.sendDurationTimeout = window.setTimeout(() => {
      const msg: Vote = {
        data: { duration },
        type: "Vote"
      };

      this.props.socket.send(JSON.stringify(msg));
    }, 500);
  };

  getVotingModeElement(): JSX.Element {
    const { chosenMode } = this.state;
    const { config, results } = this.props;

    switch (config.mode) {
      case "plurality":
        return (
          <>
            <TitleDrag>🗳️ {config.votingModeHeader}</TitleDrag>
            <SmallExplanation>
              {config.pluralityName + " "}
              <Tippy content={<Multiline>{config.pluralityTooltip}</Multiline>}>
                <span className="round">?</span>
              </Tippy>
            </SmallExplanation>
          </>
        );

      case "weighted_random":
        return (
          <>
            <TitleDrag>🗳️ {config.votingModeHeader}</TitleDrag>
            <SmallExplanation>
              {config.weightedRandomName + " "}
              <Tippy
                content={<Multiline>{config.weightedRandomTooltip}</Multiline>}
              >
                <span className="round">?</span>
              </Tippy>
            </SmallExplanation>
          </>
        );

      case "viewers":
        const { plurality, weighted_random: weighted } = results.mode;

        const sum = plurality + weighted;
        const pluralityPercentage = toPercent(sum === 0 ? 0 : plurality / sum);
        const weightedPercentage = toPercent(sum === 0 ? 0 : weighted / sum);

        return (
          <>
            <TitleDrag>🗳️ {config.votingModeHeader}</TitleDrag>
            <Table>
              <Row
                selected={chosenMode === "plurality"}
                onClick={this.setModePlurality}
              >
                <Cell>
                  <Tippy
                    content={
                      <span>
                        <Multiline>{config.pluralityTooltip}</Multiline>
                        <br />
                        <em style={{ fontSize: "0.75em" }}>
                          Icon made by Freepik from www.flaticon.com
                        </em>
                      </span>
                    }
                  >
                    {PluralityIcon}
                  </Tippy>
                </Cell>
                <Cell>{config.pluralityName}</Cell>
                <Cell align="right">{pluralityPercentage}</Cell>
              </Row>
              <Row
                selected={chosenMode === "weighted_random"}
                onClick={this.setModeWeightedRandom}
              >
                <Cell>
                  <Tippy
                    content={
                      <Multiline>{config.weightedRandomTooltip}</Multiline>
                    }
                  >
                    <span>🍀</span>
                  </Tippy>
                </Cell>
                <Cell>{config.weightedRandomName}</Cell>
                <Cell align="right">{weightedPercentage}</Cell>
              </Row>
            </Table>
          </>
        );

      default:
        return <></>;
    }
  }

  timerHandler: TimerHandler = () => {
    if (!this.mounted) {
      return;
    }

    const remainingTime = this.end - new Date().getTime();

    if (remainingTime <= 0) {
      clearInterval(this.currentTimer);
      this.currentTimer = undefined;
      this.setState({ remainingTime: 0 });
    } else {
      this.setState({ remainingTime });
    }
  };

  sendModVote = (mod: StartPollOption): void => {
    const { socket } = this.props;

    if (this.state.chosenModification === mod) {
      this.setState({ chosenModification: undefined });
      const resetMsg: Vote = { data: { modification: "reset" }, type: "Vote" };
      socket.send(JSON.stringify(resetMsg));
      return;
    }

    let { duration } = this.state;

    if (duration > mod.maxLength) {
      duration = mod.maxLength;
    } else if (duration < mod.minLength) {
      duration = mod.minLength;
    }

    const voteMsg: Vote = {
      data: { duration, modification: mod.id },
      type: "Vote"
    };

    socket.send(JSON.stringify(voteMsg));
    this.setState({ chosenModification: mod, duration });
  };

  sendModVoteNothing = () => {
    this.setState({ chosenModification: null });

    const msg: Vote = { data: { noModification: true }, type: "Vote" };
    this.props.socket.send(JSON.stringify(msg));
  };

  toggleMode = (mode: ResultVotingMode) => {
    const { chosenMode } = this.state;
    const { socket } = this.props;

    let resMode: ResultVotingMode | "reset";

    if (mode === chosenMode) {
      resMode = "reset";
      this.setState({ chosenMode: undefined });
    } else {
      resMode = mode;
      this.setState({ chosenMode: mode });
    }

    const msg: Vote = { data: { mode: resMode }, type: "Vote" };
    socket.send(JSON.stringify(msg));
  };

  setModePlurality = () => {
    this.toggleMode("plurality");
  };

  setModeWeightedRandom = () => {
    this.toggleMode("weighted_random");
  };

  render(): ReactNode {
    const { config, currentPoll, results } = this.props;
    const { chosenModification, duration, remainingTime } = this.state;

    const votingModeElement = this.getVotingModeElement();

    if (!currentPoll) {
      return votingModeElement;
    }

    const { mods } = results;
    const sum =
      Object.entries(mods).reduce((prev, [_, { count }]) => prev + count, 0) +
      results.nothing;

    const percentages: { [key: string]: string } = {};
    Object.entries(mods).forEach(([key, value]) => {
      percentages[key] = toPercent(sum === 0 ? 0 : value.count / sum);
    });

    return (
      <>
        {votingModeElement}
        <Title>⚡ {config.modificationsHeader}</Title>
        {chosenModification !== undefined && (
          <>
            <SmallExplanation>
              {chosenModification === null ? (
                "🚫 " + config.noModificationName
              ) : (
                <>
                  <Logo logo={chosenModification.logo} />
                  {" " + chosenModification.description}
                </>
              )}
            </SmallExplanation>
            {chosenModification &&
              chosenModification.minLength < chosenModification.maxLength && (
                <Tippy
                  content={<Multiline>{config.durationTooltip}</Multiline>}
                >
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.25rem",
                      marginTop: "0.25rem"
                    }}
                  >
                    <Slider
                      min={chosenModification.minLength}
                      max={chosenModification.maxLength}
                      onInput={this.durationHandler}
                      value={duration}
                    />
                    <span>{`${duration}\u202fs`}</span>
                  </span>
                </Tippy>
              )}
          </>
        )}

        <Panel key="panel" maxHeight={200}>
          <Table>
            {currentPoll.allowNothing && (
              <Row
                key="nothing"
                onClick={this.sendModVoteNothing}
                selected={chosenModification === null}
              >
                <Cell align="center">
                  <Tippy
                    content={
                      <Multiline>{config.noModificationTooltip}</Multiline>
                    }
                  >
                    <span>🚫</span>
                  </Tippy>
                </Cell>
                <Cell>{config.noModificationName}</Cell>
                <Cell align="right">
                  {toPercent(sum === 0 ? 0 : results.nothing / sum)}
                </Cell>
              </Row>
            )}
            {currentPoll.options.map(entry => (
              <Row
                key={entry.id}
                onClick={() => this.sendModVote(entry)}
                selected={
                  chosenModification != null &&
                  chosenModification.id === entry.id
                }
              >
                <Cell align="center">
                  <Tippy
                    content={entry.tooltip || entry.description}
                    delay={0}
                    duration={100}
                    theme="sh"
                  >
                    <span>
                      <Logo logo={entry.logo} />
                    </span>
                  </Tippy>
                </Cell>
                <Cell>{entry.description}</Cell>
                <Cell align="right">
                  {percentages[entry.id] || toPercent(0)}
                </Cell>
              </Row>
            ))}
          </Table>
        </Panel>

        <SmallExplanation>
          {remainingTime > 0 ? (
            <>
              <Loader />
              {config.secondsLeftText.replace(
                "%duration%",
                Math.round(remainingTime / 1000).toString()
              )}
            </>
          ) : (
            config.pollEndedText
          )}
        </SmallExplanation>
      </>
    );
  }
}
