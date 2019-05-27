export interface Overwolf {
  windows: OverwolfWindows;
}

export interface OverwolfWindows {
  getCurrentWindow(
    cb: (p: { status: "success"; window: ODKWindow } | Error) => void
  ): void;

  maximize(
    windowId: string,
    cb?: (p: { status: "success"; window_id: string }) => void
  ): void;
}

export interface Error {
  status: "error";
}

export interface ODKWindow {
  height: number;
  id: string;
  isVisible: boolean;
  left: number;
  name: string;
  parent: string | null;
  top: number;
  width: number;
}
