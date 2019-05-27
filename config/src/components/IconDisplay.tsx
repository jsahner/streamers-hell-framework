import React from "react";
import styled from "styled-components";
import { Icon } from "../api";

const StyledImage = styled.span<{ data: string }>`
  background-image: url(data:image/png;base64,${props => props.data});
  background-repeat: no-repeat;
  background-size: contain;
  display: inline-block;
  height: 1.5em;
  margin: 0;
  padding: 0;
  vertical-align: text-bottom;
  width: 1.5em;
`;

interface Props {
  icon: Icon;
}

export default function IconDisplay(props: Props) {
  const {
    icon: { data, type }
  } = props;

  switch (type) {
    case "emoji":
      return <span role="img">{data}</span>;
    case "png":
      return <StyledImage role="img" data={data} />;
    default:
      return <></>;
  }
}
