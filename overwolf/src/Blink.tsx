import React from "react";
import styled, { keyframes } from "styled-components";

const slideBottom = keyframes`
  0% {
    transform: scaleY(0);
  }
  2% {
    transform: scaleY(1);
  }
  4%,
  100% {
    transform: scaleY(0);
  }
`;

const Wrapper = styled.div`
  animation: ${slideBottom} 5s ease infinite;
`;

const StyledBlink = styled.div`
  background: black;
  height: 100vh;
  left: 0;
  position: absolute;
  top: 0;
  width: 100vw;
  z-index: -1;
`;

/**
 * A simulated blink that occurs every 5 seconds across the entire interface
 */
const Blink: React.FunctionComponent<{}> = (): JSX.Element => (
  <Wrapper>
    <StyledBlink />
  </Wrapper>
);

export default Blink;
