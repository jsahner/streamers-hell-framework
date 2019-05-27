import {
  array,
  boolean,
  constant,
  Decoder,
  number,
  object,
  oneOf,
  optional,
  string,
  union
} from "@mojotech/json-type-validation";
import {
  Authorization,
  Icon,
  NextPoll,
  PollWinner,
  ResultVotingMode,
  SetConfig,
  StartPoll,
  StartPollOption,
  Vote
} from "./API";
import { IExtensionJWT } from "./interfaces/twitchMessages";

export const authMessageDecoder: Decoder<Authorization> = object({
  data: object({
    code: string()
  }),
  type: constant<"Authorization">("Authorization")
});

export const extensionJwtDecoder: Decoder<IExtensionJWT> = object({
  channel_id: string(),
  exp: number(),
  is_unlinked: optional(boolean()),
  opaque_user_id: string(),
  pubsub_perms: object({
    listen: optional(array(string())),
    send: optional(array(string()))
  }),
  role: oneOf(
    constant<"broadcaster">("broadcaster"),
    constant<"moderator">("moderator"),
    constant<"viewer">("viewer")
  ),
  user_id: optional(string())
});

export const pollWinnerDecoder: Decoder<PollWinner> = object({
  data: object({
    duration: number(),
    id: string(),
    totalVotes: number(),
    votes: number()
  }),
  type: constant<"PollWinner">("PollWinner")
});

export const resultVotingModeDecoder: Decoder<ResultVotingMode> = oneOf(
  constant<"plurality">("plurality"),
  constant<"weighted_random">("weighted_random")
);

export const setConfigDecoder: Decoder<SetConfig> = object({
  data: object({
    durationTooltip: string(),
    mode: oneOf(resultVotingModeDecoder, constant<"viewers">("viewers")),
    modificationsHeader: string(),
    nextPollText: string(),
    noModificationName: string(),
    noModificationTooltip: string(),
    notRegisteredHeader: string(),
    notRegisteredText: string(),
    participants: oneOf(
      constant<"all">("all"),
      constant<"logged_in">("logged_in"),
      constant<"subscribers">("subscribers")
    ),
    pluralityName: string(),
    pluralityTooltip: string(),
    pollEndedText: string(),
    secondsLeftText: string(),
    subscribersOnlyHeader: string(),
    subscribersOnlyText: string(),
    votingModeHeader: string(),
    weightedRandomName: string(),
    weightedRandomTooltip: string(),
    winnerName: string(),
    winnerText: string(),
    winnerTextNoModification: string()
  }),
  type: constant<"SetConfig">("SetConfig")
});

export const iconDecoder: Decoder<Icon> = object({
  data: string(),
  type: union(constant<"emoji">("emoji"), constant<"png">("png"))
});

export const startPollOptionDecoder: Decoder<StartPollOption> = object({
  description: string(),
  id: string(),
  logo: optional(iconDecoder),
  maxLength: number().map(v => Math.max(v, 0)),
  minLength: number().map(v => Math.max(v, 0)),
  tooltip: optional(string())
}).where(o => o.minLength <= o.maxLength, "Specified minLength > maxLength");

export const startPollDecoder: Decoder<StartPoll> = object({
  data: object({
    allowNothing: boolean(),
    duration: number().where(v => v >= 0, "Specified duration < 0"),
    options: array(startPollOptionDecoder)
      .where(a => a.length > 1, "Provided less than 2 options")
      .where(
        a => new Set(a.map(o => o.id)).size === a.length,
        "Multiple options with same ID"
      )
  }),
  type: constant<"StartPoll">("StartPoll")
});

export const voteDecoder: Decoder<Vote> = object({
  data: object({
    duration: optional(
      number().where(d => d >= 0, "Specified duration smaller than 0")
    ),
    mode: optional(oneOf(resultVotingModeDecoder, constant<"reset">("reset"))),
    modification: optional(string()),
    noModification: optional(boolean())
  }),
  type: constant<"Vote">("Vote")
});

export const nextPollDecoder: Decoder<NextPoll> = object({
  in: number().where(d => d >= 0, "Value must be larger than 0"),
  type: constant<"NextPoll">("NextPoll")
});
