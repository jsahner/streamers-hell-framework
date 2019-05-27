using API;

namespace Core.Storage
{
    public class InternalOptions
    {
        public bool AllowNoModification { get; set; }
        public int Duration { get; set; }
        public string DurationTooltip { get; set; } = "Choose how long you want this modification to run";
        public string EbsUrl { get; set; } = "ws://localhost:30000";
        public int Frequency { get; set; }
        public int Id { get; set; } = 1;
        public int MaxModifications { get; set; }
        public VotingModeEnum Mode { get; set; }
        public string ModificationsHeader { get; set; } = "Modifications";
        public string NextPollText { get; set; } = "Next poll in %duration% seconds";
        public string NoModificationName { get; set; } = "No Modification";
        public string NoModificationTooltip { get; set; } = "Choose this if you want to express that no modification at all should be activated";
        public string NotRegisteredHeader { get; set; } = "Please log in";
        public string NotRegisteredText { get; set; } = "Only registered users may participate";
        public Participants Participants { get; set; }
        public string PluralityName { get; set; } = "Plurality";
        public string PluralityTooltip { get; set; } = "Chooses most popular modification";
        public string PollEndedText { get; set; } = "Poll ended";
        public string SecondsLeftText { get; set; } = "%duration% seconds left to vote";
        public string SubscribersOnlyHeader { get; set; } = "Subscribers only";
        public string SubscribersOnlyText { get; set; } = "Only subscribers of this channel may use this extension";
        public string VotingModeHeader { get; set; } = "Voting Mode";
        public string WeightedRandomName { get; set; } = "Weighted Random";
        public string WeightedRandomTooltip { get; set; } = "Lucky Draw: number of votes determine chance of being chosen";
        public string WinnerName { get; set; } = "Winner";
        public string WinnerText { get; set; } = "%icon% %mod%\n%votes% of %totalVotes% votes (%percentage%)\nWill run for %duration% seconds";
        public string WinnerTextNoModification { get; set; } = "%icon% %mod%\nReceived %votes% of %totalVotes% votes (%percentage%)";
    }
}