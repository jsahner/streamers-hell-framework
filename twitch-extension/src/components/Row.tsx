import styled from "styled-components";
import colors from "../colors";

interface IProps {
  selected?: boolean;
}

const Row = styled("tr")<IProps>`
  ${props => props.selected && "background-color: " + colors.primary + ";"}

  &:hover {
    background-color: ${props =>
      props.selected ? colors.primaryDark : colors.primaryLight};
    cursor: pointer;
  }

  transition: all 0.1s;

  &:not(:last-child) {
    border-bottom: thin solid rgba(255, 255, 255, 0.2);
  }
`;

export default Row;
