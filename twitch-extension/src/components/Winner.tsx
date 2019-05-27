import React from "react";
import { Icon, SetConfigData } from "../API";
import Logo from "./Logo";
import { toPercent } from "./PollHandler";
import SmallExplanation from "./SmallExplanation";
import Title from "./Title";

interface IProps {
  config: SetConfigData;
  data: {
    duration: number;
    id: string;
    totalVotes: number;
    votes: number;
  };
  description: string;
  icon?: Icon;
}

const Winner: React.FunctionComponent<IProps> = props => {
  const {
    config,
    data: { duration, id, votes, totalVotes },
    description,
    icon
  } = props;

  const text = (id === "nothing"
    ? config.winnerTextNoModification
    : config.winnerText
  )
    .replace(
      "%mod%",
      id === "nothing" ? config.noModificationName : description
    )
    .replace("%votes%", votes.toString())
    .replace("%totalVotes%", totalVotes.toString())
    .replace("%percentage%", toPercent(votes / totalVotes))
    .replace("%duration%", duration.toString());

  const parts: React.ReactNode[] = text.split("%icon%");

  for (let i = 1; i < parts.length; i += 2) {
    parts[i] = (
      <>
        {id === "nothing" ? "🚫" : <Logo logo={icon} />}
        {parts[i]}
      </>
    );
  }

  return (
    <>
      <Title>🏆 {config.winnerName}</Title>
      <SmallExplanation>{parts}</SmallExplanation>
    </>
  );
};

export default Winner;
