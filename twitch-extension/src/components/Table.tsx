import React from "react";
import styled from "styled-components";

const StyledTable = styled.table.attrs({
  cellPadding: 0,
  cellSpacing: 0
})`
  border-collapse: collapse;
  width: 100%;
`;

const Table: React.FunctionComponent = props => (
  <StyledTable>
    <tbody>{props.children}</tbody>
  </StyledTable>
);

export default Table;
