import axios from "axios";
import jwt from "jsonwebtoken";
import { API_KEY, CLIENT_ID, EBS_KEY, OWNER_ID, REDIRECT_URI } from "./globals";
import { LogRevokeAccessToken } from "./interfaces/logMessages";
import { IJWT, ITwitchAuth, ITwitchChannel } from "./interfaces/twitchMessages";
import log from "./log";

const API = "https://api.twitch.tv/kraken";
const EXT_API = "https://api.twitch.tv/extensions";
const OAUTH_API = "https://id.twitch.tv/oauth2";

export async function authorize(
  authorizationCode: string
): Promise<ITwitchAuth> {
  return (await axios.post<ITwitchAuth>(
    `${OAUTH_API}/token`,
    {},
    {
      params: {
        client_id: CLIENT_ID,
        client_secret: API_KEY,
        code: authorizationCode,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI
      }
    }
  )).data;
}

export async function getChannel(token: ITwitchAuth): Promise<ITwitchChannel> {
  return (await axios.get<ITwitchChannel>(`${API}/channel`, {
    headers: {
      Accept: "application/vnd.twitchtv.v5+json",
      Authorization: `OAuth ${token.access_token}`,
      "Client-ID": CLIENT_ID
    }
  })).data;
}

export async function isSubscriber(
  owner: ITwitchAuth,
  channelId: string,
  userId: string
): Promise<boolean> {
  try {
    const response = (await axios.get(
      `${API}/channels/${channelId}/subscriptions/${userId}`,
      {
        headers: {
          Accept: "application/vnd.twitchtv.v5+json",
          Authorization: `OAuth ${owner.access_token}`,
          "Client-ID": CLIENT_ID
        }
      }
    )).data;

    if (response.status === 404) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

export async function revokeAccess(token: ITwitchAuth): Promise<void> {
  let success = true;

  try {
    await axios.post(
      `${OAUTH_API}/revoke`,
      {},
      {
        params: {
          client_id: CLIENT_ID,
          token: token.access_token
        }
      }
    );
  } catch (err) {
    success = false;
  }

  const logMsg: LogRevokeAccessToken = {
    success,
    type: "RevokeAccessToken"
  };

  log.debug(logMsg);
}

export async function sendPubSub(
  channelId: string,
  message: string
): Promise<boolean> {
  const jwtoken: IJWT = {
    channel_id: channelId,
    exp: Math.floor(Date.now() / 1000) + 1800, // now plus 30 minutes
    pubsub_perms: { send: ["broadcast"] },
    role: "external",
    user_id: OWNER_ID
  };

  try {
    await axios.post(
      `${EXT_API}/message/${channelId}`,
      {
        content_type: "application/json",
        message,
        targets: ["broadcast"]
      },
      {
        headers: {
          Authorization: `Bearer ${jwt.sign(jwtoken, EBS_KEY)}`,
          "Client-Id": CLIENT_ID,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    log.debug("Could not send message via PubSub: " + JSON.stringify(err));
    return false;
  }

  return true;
}

export default {
  authorize,
  getChannel,
  isSubscriber,
  revokeAccess,
  sendPubSub
};
