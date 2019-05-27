import dotenv from "dotenv";
import fs from "fs";
import { join } from "path";
import ChannelConnection from "./behaviors/channelConnection";
import { Connection } from "./behaviors/connection";
import UnknownConnection from "./behaviors/unknownConnection";
import ViewerConnection from "./behaviors/viewerConnection";
import log from "./log";

export const IMAGE_PATH = join(__dirname, "static");

if (!fs.existsSync(IMAGE_PATH)) {
  fs.mkdirSync(IMAGE_PATH);
}

dotenv.config();

export let API_KEY: string;
export let CLIENT_ID: string;
export let EBS_KEY: Buffer;
export let OWNER_ID: string;
export let PORT = 30000;
export let REDIRECT_URI: string;

const {
  API_KEY: apiKey,
  CLIENT_ID: clientId,
  EBS_KEY: ebsKey,
  OWNER_ID: ownerId,
  PORT: port,
  REDIRECT_URI: redirectUri
} = process.env;

if (!apiKey) {
  log.error("API key is missing");
  process.exit(1);
}

if (!clientId) {
  log.error("Client ID is missing");
  process.exit(1);
}

if (!ebsKey) {
  log.error("EBS Key is missing");
  process.exit(1);
}

if (!ownerId) {
  log.error("Owner ID is missing");
  process.exit(1);
}

if (!redirectUri) {
  log.error("Redirect URI is missing");
  process.exit(1);
}

API_KEY = apiKey!;
CLIENT_ID = clientId!;
EBS_KEY = Buffer.from(ebsKey!, "base64");
OWNER_ID = ownerId!;
REDIRECT_URI = redirectUri!;

if (port !== undefined) {
  PORT = +port;
}

export const streamers = new Map<string, ChannelConnection>();
export const unknowns = new Set<UnknownConnection>();
export const viewers = new Set<ViewerConnection>();

// detect broken connections, see https://github.com/websockets/ws#how-to-detect-and-close-broken-connections
function checkAlive(conn: Connection) {
  if (conn.isAlive) {
    conn.checkAlive();
  } else {
    conn.kill();
  }
}

setInterval(() => {
  streamers.forEach(checkAlive);
  unknowns.forEach(checkAlive);
  viewers.forEach(checkAlive);
}, 30000);
