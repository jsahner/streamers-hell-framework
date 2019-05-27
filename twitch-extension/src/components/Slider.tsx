import styled from "styled-components";
import colors from "../colors";

export default styled.input.attrs({
  type: "range"
})`
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 5px;
  flex-grow: 1;
  height: 2px;
  margin-bottom: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  outline: none;

  ::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    background: ${colors.primaryLight};
    border-color: #042a2b;
    border-radius: 50%;
    cursor: pointer;
    height: 1rem;
    width: 1rem;
  }

  ::-moz-range-thumb {
    background: ${colors.primary};
    border-color: #f3e8ee;
    border-radius: 50%;
    cursor: pointer;
    height: 1rem;
    width: 1rem;
  }
`;
