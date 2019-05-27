import { PollParticipants, ResultVotingMode, StartPollOption } from "../API";
import CancellationToken from "../cancellationToken";

export interface IPoll {
  allowNothing: boolean;
  cancelToken: CancellationToken;
  options: StartPollOption[];
  participants: PollParticipants;
}

export interface IVoteOptions {
  duration?: number;
  mode?: ResultVotingMode;
  modification?: string;
  /**
   * Overrides `modification` if `true`
   */
  noModification?: boolean;
}
