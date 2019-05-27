import React from "react";
import styled from "styled-components";
import Title from "./Title";

const StyleTitleDrag = styled(Title)`
  &:hover {
    cursor: move;
  }

  &:first-child {
    margin-top: 0;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const TitleDrag: React.FunctionComponent = props => {
  return <StyleTitleDrag className="handle">{props.children}</StyleTitleDrag>;
};

export default TitleDrag;
