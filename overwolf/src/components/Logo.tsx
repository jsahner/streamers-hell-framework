import React from "react";
import styled from "styled-components";
import { Icon } from "../API";

interface PNGProps {
  url: string;
}

const PNG = styled("div")<PNGProps>`
  background-image: url(data:image/png;base64,${props => props.url});
  background-repeat: no-repeat;
  background-size: contain;
  color: transparent;
  display: inline-block;
`;

const Emoji = styled.div.attrs({ role: "img" })`
  display: inline-block;
`;

interface Props {
  logo?: Icon;
}

export default function Logo(props: Props): JSX.Element {
  const { logo } = props;

  if (!logo) {
    return <></>;
  }

  if (logo.type === "emoji") {
    return <Emoji>{logo.data}</Emoji>;
  }

  return (
    <PNG url={logo.data}>
      <span style={{ visibility: "hidden" }} role="img" aria-label="ignore">
        🎃
      </span>
    </PNG>
  );
}
