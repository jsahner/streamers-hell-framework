// Common

export type ClientOption = BoolOption | NumberOption | StringOption;

export type ClientRegisterOption =
  | BoolRegisterOption
  | NumberRegisterOption
  | StringRegisterOption;

export type OptionType = boolean | number | string;
export type OptionValues = { [key: string]: OptionType };
export type PollParticipants = "all" | "logged_in" | "subscribers";
export type ResultVotingMode = "plurality" | "weighted_random";
export type VotingMode = "viewers" | ResultVotingMode;

export interface Channel {
  id: number;
  logo: string;
  name: string;
}

export interface Icon {
  data: string;
  type: "emoji" | "png";
}

export interface RegisterOption {
  description: string;
  id: string;
}

export interface NumberRegisterOption extends RegisterOption {
  default: number;
  numType: "double" | "int";
  validValues?: number[];
}

export interface BoolRegisterOption extends RegisterOption {
  default: boolean;
}

export interface StringRegisterOption extends RegisterOption {
  default: string;
  validValues?: string[];
}

export interface BoolOption extends BoolRegisterOption {
  value: boolean;
}

export interface NumberOption extends NumberRegisterOption {
  numType: "double" | "int";
  value: number;
}

export interface StringOption extends StringRegisterOption {
  value: string;
}

export interface ModificationInfo {
  description: string;
  enabled: boolean;
  id: string;
  logo?: Icon;
  maxLength: number;
  minLength: number;
  running: boolean;
  tooltip?: string;
}

// EBS <-> Core

export interface Authorization {
  type: "Authorization";
  data: {
    code: string;
  };
}

export interface AuthorizationSuccess {
  type: "Authorization.Success";
  data: Channel;
}

export interface Ok {
  type: "OK";
}

export interface PollError {
  type: "PollError";
  reason: string;
}

export interface PollResult {
  type: "PollResult";
  data: {
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

export interface PollStarted {
  type: "PollStarted";
}

export interface PollWinner {
  type: "PollWinner";
  data: {
    duration: number;
    id: string;
    totalVotes: number;
    votes: number;
  };
}

export interface SetConfig {
  type: "SetConfig";
  data: SetConfigData;
}

export interface SetConfigData extends InterfaceSettings {
  mode: VotingMode;
  participants: PollParticipants;
}

export interface StartPoll {
  type: "StartPoll";
  data: {
    allowNothing: boolean;
    duration: number;
    options: StartPollOption[];
  };
}

export interface StartPollOption {
  description: string;
  id: string;
  logo?: Icon;
  maxLength: number;
  minLength: number;
  tooltip?: string;
}

// Client Handling

export interface ClientInitialize {
  type: "Client.Initialize";
  modifications: ClientInitializeModification[];
  options: OptionValues;
}

export interface ClientInitializeModification {
  name: string;
  options: OptionValues;
}

export interface ClientInitialized {
  type: "Client.Initialized";
  modifications?: string[];
}

export interface ClientRegister {
  type: "Client.Register";
  icon?: Icon;
  id: string;
  modifications?: ClientRegisterModification[];
  options?: ClientRegisterOption[];
}

export interface ClientRegisterModification {
  description: string;
  icon?: Icon;
  maxLength?: number;
  name: string;
  options?: ClientRegisterOption[];
  tooltip?: string;
}

// Modification Handling

export interface ExecutionStarted {
  type: "Execution.Started";
  modificationId: string;
}

export interface ExecutionStartRequest {
  type: "Execution.StartRequest";
  length: number;
  modificationId: string;
}

export interface ExecutionStopped {
  type: "Execution.Stopped";
  modifications: string[];
}

export interface ExecutionStopRequest {
  type: "Execution.StopRequest";
  modifications?: string[];
}

// Subscriber Messages

export interface InfoMessage {
  type: "Info.Message";
  data: Record<string, any>;
}

export interface InfoOpen {
  type: "Info.Open";
  data: InfoOpenData;
}

export interface InfoOpenData {
  modifications: ModificationInfo[];
  nextPoll?: number;
  pollActive: boolean;
}

export interface InfoSubscribe {
  type: "Info.Subscribe";
}

export interface InfoUnsubscribe {
  type: "Info.Unsubscribe";
}

export interface NextPoll {
  type: "NextPoll";
  in: number;
}

export interface NextPollCanceled {
  type: "NextPollCanceled";
}

// Configuration Handling

export interface ConfigAvailable {
  type: "Config.Available";
  channel?: Channel;
  clients: ConfigAvailableClient[];
  interfaceSettings: InterfaceSettings;
  pollSettings: PollSettings;
}

export interface ConfigAvailableClient {
  icon?: Icon;
  id: string;
  modifications: ConfigAvailableModification[];
  options: ClientOption[];
}

export interface ConfigAvailableModification {
  customDescription?: string;
  customMaxLength: number;
  customMinLength: number;
  description: string;
  enabled: boolean;
  icon?: Icon;
  maxLength: number;
  name: string;
  options?: ClientOption[];
  tooltip?: string;
}

export interface ConfigChange {
  type: "Config.Change";
  clients?: { [id: string]: ConfigChangeClient };
  interfaceSettings: Partial<InterfaceSettings>;
  pollSettings: Partial<PollSettings>;
}

export interface ConfigChangeClient {
  modifications?: { [name: string]: ConfigChangeModification };
  options?: ConfigChangeOptions;
}

export interface ConfigChangeModification {
  description?: string;
  enabled?: boolean;
  maxLength?: number;
  minLength?: number;
  options?: ConfigChangeOptions;
  tooltip?: string;
}

export interface ConfigChangeOptions {
  [key: string]: OptionType;
}

export interface ConfigRegister {
  type: "Config.Register";
}

export interface ConfigStart {
  type: "Config.Start";
}

export interface ConfigStop {
  type: "Config.Stop";
}

export interface InterfaceSettings {
  durationTooltip: string;
  modificationsHeader: string;
  nextPollText: string;
  noModificationName: string;
  noModificationTooltip: string;
  notRegisteredHeader: string;
  notRegisteredText: string;
  pluralityName: string;
  pluralityTooltip: string;
  pollEndedText: string;
  secondsLeftText: string;
  subscribersOnlyHeader: string;
  subscribersOnlyText: string;
  votingModeHeader: string;
  weightedRandomName: string;
  weightedRandomTooltip: string;
  winnerName: string;
  winnerText: string;
  winnerTextNoModification: string;
}

export interface PollSettings {
  allowNoModification: boolean;
  duration: number;
  ebsUrl: string;
  frequency: number;
  maxModifications: number;
  mode: VotingMode;
  participants: PollParticipants;
}

// EBS <=> Twitch Extension

export interface ViewerAuthorization {
  type: "ViewerAuthorization";
  token: string;
}

export interface PollStopped {
  type: "PollStopped";
}

export interface PollWinner {
  type: "PollWinner";
  data: {
    duration: number;
    id: string;
    totalVotes: number;
    votes: number;
  };
}

export interface ViewerRole {
  type: "Role";
  data:
    | "anonymous"
    | "unlinked"
    | "linked"
    | "subscriber"
    | "moderator"
    | "broadcaster";
}

export interface Vote {
  type: "Vote";
  data: {
    duration?: number;
    mode?: ResultVotingMode | "reset";
    modification?: string;

    /**
     * Takes precedence over `modification`
     */
    noModification?: boolean;
  };
}
