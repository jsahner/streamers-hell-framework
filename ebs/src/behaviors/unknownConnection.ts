import jwt from "jsonwebtoken";
import WebSocket from "ws";
import { ViewerAuthorization } from "../API";
import { authMessageDecoder, extensionJwtDecoder } from "../decoders";
import { EBS_KEY, streamers, unknowns, viewers } from "../globals";
import { LogUnknownConnectionKill } from "../interfaces/logMessages";
import log from "../log";
import ChannelConnection from "./channelConnection";
import { Connection } from "./connection";
import ViewerConnection from "./viewerConnection";

/**
 * An established WebSocket connection that has not been authorized yet.
 */
export default class UnknownConnection extends Connection {
  constructor(ws: WebSocket) {
    super(ws);
    this.ws.on("close", () => this.removeFromGlobals());
    this.ws.on("message", data => this.onMessage(data));
  }

  public kill(): void {
    this.removeFromGlobals();
    this.ws.terminate();
  }

  private async onMessage(data: WebSocket.Data) {
    this.removeFromGlobals();

    if (typeof data !== "string") {
      return this.kill();
    }

    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case "Authorization":
          const connection = await ChannelConnection.from(
            this.ws,
            authMessageDecoder.runWithException(msg)
          );

          const { channelId } = connection;

          if (streamers.has(channelId)) {
            const logMsg: LogUnknownConnectionKill = {
              reason: `Channel ${connection.channelId} already connected`,
              type: "ConnectionKilled"
            };

            log.info(logMsg);
            connection.kill();
            return;
          }

          streamers.set(channelId, connection);
          return;

        case "ViewerAuthorization":
          const auth: ViewerAuthorization = msg;

          viewers.add(
            new ViewerConnection(
              this.ws,
              extensionJwtDecoder.runWithException(
                jwt.verify(auth.token, EBS_KEY)
              )
            )
          );
          return;

        default:
          const logUnknownMessage: LogUnknownConnectionKill = {
            reason: "Sent unknown message",
            type: "ConnectionKilled"
          };

          log.info(logUnknownMessage);
          return this.kill();
      }
    } catch (err) {
      const logError: LogUnknownConnectionKill = {
        reason: JSON.stringify(err),
        type: "ConnectionKilled"
      };

      log.error(logError);
      this.kill();
    }
  }

  private removeFromGlobals() {
    unknowns.delete(this);
  }
}
