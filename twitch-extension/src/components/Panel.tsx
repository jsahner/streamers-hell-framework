import React from "react";
import Scrollbars from "react-custom-scrollbars";
import styled from "styled-components";

const HorizontalTrack = (props: any) => (
  <div {...props} style={{ display: "none" }} className="track-horizontal" />
);

const VerticalThumb = (props: any) => (
  <div
    {...props}
    className="thumb-vertical"
    style={{ backgroundColor: "rgba(255, 255, 255, 0.3)", borderRadius: "2px" }}
  />
);

interface IProps {
  maxHeight: number;
}

const StyledPanel = styled.div<IProps>`
  display: flex;
  flex-direction: column;
  margin-bottom: 0.5rem;
  max-height: ${props => props.maxHeight}px;
  overflow: hidden;
  padding-top: 0.5rem;
  width: 100%;
`;

const Panel: React.FunctionComponent<IProps> = props => {
  const { children, maxHeight } = props;

  return (
    <StyledPanel maxHeight={maxHeight + 17}>
      <Scrollbars
        autoHeight={true}
        autoHeightMax={maxHeight}
        autoHide={true}
        autoHideTimeout={2000}
        renderTrackHorizontal={HorizontalTrack}
        renderThumbVertical={VerticalThumb}
      >
        {children}
      </Scrollbars>
    </StyledPanel>
  );
};

export default Panel;
