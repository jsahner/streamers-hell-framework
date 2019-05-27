import React from "react";
import styled from "styled-components";
import colors from "../colors";

const StyledContainer = styled.div`
  background: none;
  margin-top: 0.5rem;
  width: 100%;
`;

const StyledSkill = styled.div.attrs((props: IProps) => ({
  style: {
    width: props.width * 100 + "%"
  }
}))`
  background-color: ${colors.primaryLight};
  border-radius: 0.25rem;
  box-shadow: 2px 2px 1rem black;
  height: 100%;
  white-space: nowrap;
`;

const Text = styled.span`
  padding-left: 0.25rem;
`;

interface IProps {
  width: number;
}

const ProgressContainer: React.FunctionComponent<IProps> = props => {
  const { children, width } = props;

  return (
    <StyledContainer>
      <StyledSkill width={width}>
        <Text>{children}</Text>
      </StyledSkill>
    </StyledContainer>
  );
};

export default ProgressContainer;
