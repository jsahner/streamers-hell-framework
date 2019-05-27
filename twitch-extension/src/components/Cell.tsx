import styled from "styled-components";

interface IProps {
  /**
   * Defaults to "left"
   */
  align?: "left" | "right" | "center" | "justify";
}

const Cell = styled("td")<IProps>`
  border: none;
  padding: 0.25rem;
  text-align: ${props => props.align || "left"};
`;

export default Cell;
