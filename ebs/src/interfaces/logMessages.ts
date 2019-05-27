import {
  PollResult,
  ResultVotingMode,
  StartPoll,
  StartPollOption
} from "../API";

export interface LogRevokeAccessToken {
  type: "RevokeAccessToken";
  success: boolean;
}

export interface LogAuthorizationError {
  type: "Authorization";
  success: false;
  reason: string;
}

export interface LogAuthorizationSuccess extends LogChannelMessage {
  type: "Authorization";
  success: true;
}

interface LogChannelMessage {
  channel: string;
}

export interface LogPollResult extends LogChannelMessage {
  type: "PollResult";
  intermediate: boolean;
  result: {
    mode: { [key in ResultVotingMode]: number };
    mods: {
      [modId: string]: {
        count: number;
        duration: number;
      };
    };
    nothing: number;
  };
}

interface LogViewerMessage extends LogChannelMessage {
  viewer: string;
}

export interface LogViewerIdentification extends LogViewerMessage {
  type: "ViewerIdentification";
  role:
    | "anonymous"
    | "unlinked"
    | "linked"
    | "subscriber"
    | "broadcaster"
    | "moderator";
  previousId?: string;
}

export interface LogPollCanceled extends LogChannelMessage {
  type: "PollCanceled";
}

export interface LogChannelDisconnect extends LogChannelMessage {
  type: "ChannelDisconnected";
}

export interface LogChannelReceivedMessage extends LogChannelMessage {
  type: "ReceivedMessage";
  message: any;
}

interface LogMessageHandlingError {
  type: "MessageHandlingError";
  message: any;
  error: any;
}

export interface LogChannelMessageHandlingError
  extends LogChannelMessage,
    LogMessageHandlingError {}

export interface LogChannelRevokeAccess extends LogChannelMessage {
  type: "RevokeAccessToken";
}

export interface LogChannelPollStart extends LogChannelMessage {
  type: "PollStart";
  request: {
    allowNothing: boolean;
    duration: number;
    options: StartPollOption[];
  };
}

export interface LogChannelPollHandlingError extends LogChannelMessage {
  type: "PollHandlingError";
  reason: string;
  request: {
    allowNothing: boolean;
    duration: number;
    options: StartPollOption[];
  };
}

interface LogConnectionKill {
  type: "ConnectionKilled";
}

export interface LogUnknownConnectionKill extends LogConnectionKill {
  reason: string;
}

export interface LogViewerConnectionKill
  extends LogViewerMessage,
    LogConnectionKill {}

export interface LogChannelConnectionKill
  extends LogChannelMessage,
    LogConnectionKill {}

export interface LogViewerDisconnected extends LogViewerMessage {
  type: "ViewerDisconnected";
}

export interface LogViewerMessageHandlingError
  extends LogViewerMessage,
    LogMessageHandlingError {}

export interface LogViewerVote extends LogViewerMessage {
  type: "Vote";
  duration?: number;
  mode?: "plurality" | "weighted_random";
  modification?: string | null;
}
