import { Avatar, Button, Icon } from "antd";
import React from "react";
import styled from "styled-components";
import { Channel, ConfigStart, ConfigStop } from "../api";

interface Props {
  channel?: Channel;
  nextPoll?: number;
  pollActive: boolean;
  socket: WebSocket;
}

const Wrapper = styled.div`
  align-items: center;
  color: white;
  display: flex;
  height: 100%;
  justify-content: space-between;
  width: 100%;
`;

const Login = "Login via Twitch";

/**
 * Start authorization process via Twitch.
 */
function login() {
  window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${
    process.env.REACT_APP_CLIENT_ID
  }&redirect_uri=${
    process.env.REACT_APP_REDIRECT_URI
  }&response_type=code&scope=channel_read%20channel_check_subscription`;
}

/**
 * Start polls.
 */
function start(socket: WebSocket) {
  const msg: ConfigStart = { type: "Config.Start" };
  socket.send(JSON.stringify(msg));
}

/**
 * Stops polls and all active modifications.
 */
function stop(socket: WebSocket) {
  const msg: ConfigStop = { type: "Config.Stop" };
  socket.send(JSON.stringify(msg));
}

export default function Header(props: Props) {
  const { channel, nextPoll, pollActive, socket } = props;

  if (channel === undefined) {
    return (
      <Wrapper>
        <Button onClick={login} icon="login" type="primary">
          Login via Twitch
        </Button>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      {pollActive ? (
        <Button onClick={() => stop(socket)} type="danger" icon="stop">
          Stop
        </Button>
      ) : (
        <Button onClick={() => start(socket)} icon="thunderbolt" type="primary">
          Start
        </Button>
      )}
      <div>
        <Avatar size="large" src={channel.logo} shape="square" />{" "}
        <span>{channel.name}</span>
      </div>
      <div>
        {nextPoll && (
          <span>
            <Icon style={{ marginRight: "0.5rem" }} type="loading" />
            Next poll in {nextPoll} seconds
          </span>
        )}
      </div>
    </Wrapper>
  );
}
