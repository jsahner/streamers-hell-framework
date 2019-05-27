import React from "react";
import { SmoothieChart } from "smoothie";
import styled from "styled-components";

interface CanvasProps {
  customCSS: string;
}

const StyledCanvas = styled.canvas<CanvasProps>`
  height: 15vh;
  position: absolute;
  width: 20vw;
  z-index: 1;

  ${props => props.customCSS}
`;

interface Props extends CanvasProps {
  chart: SmoothieChart;
  delay: number;
}

const Chart: React.FunctionComponent<Props> = props => (
  <StyledCanvas
    ref={c => c && props.chart.streamTo(c, props.delay)}
    customCSS={props.customCSS}
  />
);

export default Chart;
