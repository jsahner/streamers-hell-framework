import React from "react";
import styled from "styled-components";
import { ClientOption, ConfigAvailableModification, Icon } from "../api";
import ModificationSection from "./ModificationSection";
import OptionsSection from "./OptionsSection";

interface Props {
  icon?: Icon;
  id: string;
  mods: ConfigAvailableModification[];
  options: ClientOption[];
  socket: WebSocket;
}

const FlexContainer = styled.div`
  display: flex;
  flex-flow: row wrap;
`;

export default class ClientSection extends React.Component<Props> {
  render() {
    const { id, mods, options, socket } = this.props;

    return (
      <>
        {options.length > 0 && (
          <OptionsSection
            clientId={id}
            key={id + "options"}
            options={options}
          />
        )}

        <FlexContainer>
          {mods.map(mod => (
            <ModificationSection
              clientId={id}
              icon={mod.icon}
              key={mod.name}
              mod={mod}
              socket={socket}
            />
          ))}
        </FlexContainer>
      </>
    );
  }
}
