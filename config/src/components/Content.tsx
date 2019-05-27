import { Collapse } from "antd";
import React from "react";
import styled from "styled-components";
import {
  ConfigAvailableClient,
  InterfaceSettings,
  ModificationInfo,
  PollSettings
} from "../api";
import ClientSection from "./ClientSection";
import PollSettingsSection from "./PollSettingsSection";
import UISettingsSection from "./UISettingsSection";

const StyledContent = styled.div`
  padding: 24px;
  background: white;
`;

interface Props {
  clients: ConfigAvailableClient[];
  initialized: ModificationInfo[];
  uiSettings?: InterfaceSettings;
  pollSettings?: PollSettings;
  socket: WebSocket;
}

const LeftPadDiv = styled.div`
  padding-left: 24px;
`;

export function Content(props: Props) {
  const { clients, uiSettings, pollSettings, socket } = props;

  return (
    <StyledContent>
      <Collapse bordered={false} defaultActiveKey={["pollSettings"]}>
        {pollSettings && (
          <Collapse.Panel header="Poll Settings" key="pollSettings">
            <LeftPadDiv>
              <PollSettingsSection options={pollSettings} />
            </LeftPadDiv>
          </Collapse.Panel>
        )}
        {uiSettings && (
          <Collapse.Panel header="Twitch Extension Settings" key="uiSettings">
            <LeftPadDiv>
              <UISettingsSection options={uiSettings} />
            </LeftPadDiv>
          </Collapse.Panel>
        )}
        {clients.map(client => (
          <Collapse.Panel header={"Client: " + client.id} key={client.id}>
            <div style={{ paddingLeft: 24 }}>
              <ClientSection
                key={client.id}
                icon={client.icon}
                id={client.id}
                mods={client.modifications}
                options={client.options}
                socket={socket}
              />
            </div>
          </Collapse.Panel>
        ))}
      </Collapse>
    </StyledContent>
  );
}
