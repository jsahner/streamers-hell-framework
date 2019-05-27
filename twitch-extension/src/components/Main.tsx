import React from "react";
import Draggable from "react-draggable";
import styled from "styled-components";

const Bound = styled.div`
  height: calc(100vh - 180px);
  left: 0;
  position: absolute;
  top: 100px;
  width: 100vw;
`;

const StyledMain = styled.main`
  background-color: #2f2f2f;
  border-radius: 0.25rem;
  border: thin solid black;
  display: flex;
  flex-direction: column;
  width: 250px;
  /* opacity: 0.25; */
  padding: 0.25rem;
  position: absolute;
  top: 150px;
  left: calc(50% - 125px);
  transition: height 0.1s;
  transition: opacity 0.1s;

  &:hover {
    opacity: 1;
  }
`;

const Main: React.FunctionComponent = ({ children }) => (
  <Bound id="dragbound">
    <Draggable bounds="#dragbound" handle=".handle">
      <StyledMain>{children}</StyledMain>
    </Draggable>
  </Bound>
);

export default Main;
