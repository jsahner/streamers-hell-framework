import WebSocket from "ws";

/**
 * An abstract class that all WebSocket connection classes have to extend. The
 * public constructor automatically registers methods for `PING` and `PONG`
 * messages.
 */
export abstract class Connection {
  protected alive = true;

  /**
   * Returns whether this connection responded to the last sent PING message.
   */
  public get isAlive(): boolean {
    return this.alive;
  }

  /**
   * Automatically removes all event listeners from the provided WebSocket,
   * except for ping and pong.
   */
  constructor(protected ws: WebSocket) {
    this.ws.removeAllListeners();
    this.ws.on("ping", data => {
      this.alive = true;
      this.ws.pong(data);
    });
    this.ws.on("pong", () => (this.alive = true));
  }

  /**
   * Kills connection.
   */
  public abstract kill(): void;

  /**
   * Sends a ping to the socket and sets `isAlive` to false.
   */
  public checkAlive(): void {
    this.alive = false;
    this.ws.ping();
  }
}
