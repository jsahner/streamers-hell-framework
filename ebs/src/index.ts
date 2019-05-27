import express from "express";
import http from "http";
import WebSocket from "ws";
import UnknownConnection from "./behaviors/unknownConnection";
import { IMAGE_PATH, PORT, unknowns } from "./globals";
import errorHandler from "./handlers/errorHandler";
import log from "./log";

const app = express();
const server = http.createServer(app);

app.use("/static", express.static(IMAGE_PATH));
app.use(errorHandler);

const wss = new WebSocket.Server({ server });
wss.on("connection", ws => unknowns.add(new UnknownConnection(ws)));

server.listen(PORT, () => log.info(`Listening on port ${PORT}`));
