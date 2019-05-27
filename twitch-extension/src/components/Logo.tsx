import React from "react";
import styled from "styled-components";
import { Icon } from "../API";

const PNG = styled.span.attrs((props: { url: string }) => ({
  style: {
    backgroundImage: `url(${props.url})`
  }
}))`
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  display: inline-block;
  height: 1em;
  margin: 0;
  padding: 0;
  width: 2em;
`;

function getUrl(filename: string) {
  return process.env.STATIC_URL + filename;
}

interface IProps {
  logo?: Icon;
}

export default function Logo(props: IProps): JSX.Element {
  const { logo } = props;

  if (!logo) {
    return <></>;
  }

  if (logo.type === "emoji") {
    return <span role="img">{logo.data}</span>;
  }

  const url = getUrl(logo.data);
  return <PNG url={url} />;
}
