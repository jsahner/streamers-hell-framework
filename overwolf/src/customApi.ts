import { ClientInitialize } from "./API";

export type Position = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
export type PositionOption =
  | "Status Badge"
  | "Emotion Badge"
  | "Biometrics"
  | "Nothing";

export interface InitializeMessage extends ClientInitialize {
  options: {
    chartCSS: string;
    chartDelay: number;
    chartEnabled: boolean;
    demoMode: boolean;
    extraCSS: string;
    extraDuration: number;
    extraEnabled: boolean;
    statusCSS: string;
    statusEnabled: boolean;
  };
}
