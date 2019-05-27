using API;
using LiteDB;
using System;

namespace Core.Storage
{
    public static class Database
    {
        private const int MIN_DURATION = 30;
        private static readonly LiteDatabase DB;
        private static readonly InternalOptions InternalOptions;
        private static readonly NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();
        private static readonly LiteRepository Repo;

        static Database()
        {
            Repo = new LiteRepository("config.db");
            DB = Repo.Database;
            InternalOptions = Repo.FirstOrDefault<InternalOptions>();

            if (InternalOptions == null)
            {
                InternalOptions = new InternalOptions();
                return;
            }

            // check if InternalOptions are valid
            InternalOptions.MaxModifications = Math.Max(InternalOptions.MaxModifications, 0);
            InternalOptions.Duration = Math.Max(InternalOptions.Duration, MIN_DURATION);

            Repo.Upsert(InternalOptions);
        }

        /// <summary>
        /// Whether it's allowed to vote for "no modification"
        /// </summary>
        public static bool AllowNoModification => InternalOptions.AllowNoModification;

        public static LiteCollection<Client> Clients => DB.GetCollection<Client>("clients");

        public static string EbsUrl => InternalOptions.EbsUrl;

        public static InterfaceSettings InterfaceSettings => new InterfaceSettings
        {
            DurationTooltip = InternalOptions.DurationTooltip,
            ModificationsHeader = InternalOptions.ModificationsHeader,
            NextPollText = InternalOptions.NextPollText,
            NoModificationName = InternalOptions.NoModificationName,
            NoModificationTooltip = InternalOptions.NoModificationTooltip,
            NotRegisteredHeader = InternalOptions.NotRegisteredHeader,
            NotRegisteredText = InternalOptions.NotRegisteredText,
            PluralityName = InternalOptions.PluralityName,
            PluralityTooltip = InternalOptions.PluralityTooltip,
            PollEndedText = InternalOptions.PollEndedText,
            SecondsLeftText = InternalOptions.SecondsLeftText,
            SubscribersOnlyHeader = InternalOptions.SubscribersOnlyHeader,
            SubscribersOnlyText = InternalOptions.SubscribersOnlyText,
            VotingModeHeader = InternalOptions.VotingModeHeader,
            WeightedRandomName = InternalOptions.WeightedRandomName,
            WeightedRandomTooltip = InternalOptions.WeightedRandomTooltip,
            WinnerName = InternalOptions.WinnerName,
            WinnerText = InternalOptions.WinnerText,
            WinnerTextNoModification = InternalOptions.WinnerTextNoModification
        };

        /// <summary>
        /// How many modifications should be available in a poll (0 = unlimited)
        /// </summary>
        public static int MaxModifications => InternalOptions.MaxModifications;

        /// <summary>
        /// Duration of a single poll in seconds (minimum of 30 seconds)
        /// </summary>
        public static int PollDuration => InternalOptions.Duration;

        /// <summary>
        /// How often to start a new poll in seconds. If this is 0, polls will only be started on demand.
        /// </summary>
        public static int PollFrequency => InternalOptions.Frequency;

        /// <summary>
        /// Which kind of viewers may participate in votes.
        /// </summary>
        public static Participants PollParticipants => InternalOptions.Participants;

        public static PollSettings PollSettings => new PollSettings
        {
            AllowNoModification = AllowNoModification,
            Duration = PollDuration,
            EbsUrl = EbsUrl,
            Frequency = PollFrequency,
            MaxModifications = MaxModifications,
            Mode = VotingMode,
            Participants = PollParticipants
        };

        /// <summary>
        /// Which voting mode should be used in polls.
        /// </summary>
        public static VotingModeEnum VotingMode => InternalOptions.Mode;

        /// <summary>
        /// Updates all interface settings from the provided object properties that are not null.
        /// </summary>
        public static void UpdateInterfaceSettings(PartialInterfaceSettings options)
        {
            foreach (var prop in options.GetType().GetProperties())
            {
                if (!(prop.GetValue(options) is string value))
                {
                    continue;
                }

                typeof(InternalOptions).GetProperty(prop.Name).SetValue(InternalOptions, value);
                logger.Debug(new LogSetOption
                {
                    Name = prop.Name,
                    Value = value
                }.ToJson());
            }

            Repo.Upsert(InternalOptions);
        }

        /// <summary>
        /// Updates all poll settings from the provided object properties that are not null.
        /// </summary>
        public static void UpdatePollSettings(PartialPollSettings options)
        {
            if (options.AllowNoModification != null)
            {
                logger.Debug(new LogSetOption
                {
                    Name = "AllowNoModification",
                    Value = options.AllowNoModification
                }.ToJson());

                InternalOptions.AllowNoModification = (bool)options.AllowNoModification;
            }

            if (options.EbsUrl != null)
            {
                logger.Debug(new LogSetOption
                {
                    Name = "EbsUrl",
                    Value = options.EbsUrl
                }.ToJson());

                InternalOptions.EbsUrl = options.EbsUrl;
            }

            if (options.MaxModifications != null)
            {
                logger.Debug(new LogSetOption
                {
                    Name = "MaxModifications",
                    Value = options.MaxModifications
                }.ToJson());

                InternalOptions.MaxModifications = (int)options.MaxModifications;
            }

            if (options.Duration != null)
            {
                logger.Debug(new LogSetOption
                {
                    Name = "Duration",
                    Value = options.Duration
                }.ToJson());

                InternalOptions.Duration = (int)options.Duration;
            }

            if (options.Frequency != null)
            {
                logger.Debug(new LogSetOption
                {
                    Name = "Frequency",
                    Value = options.Frequency
                }.ToJson());

                InternalOptions.Frequency = (int)options.Frequency;
            }

            if (options.Participants != null)
            {
                logger.Debug(new LogSetOption
                {
                    Name = "Participants",
                    Value = options.Participants
                }.ToJson());

                InternalOptions.Participants = (Participants)options.Participants;
            }

            if (options.Mode != null)
            {
                logger.Debug(new LogSetOption
                {
                    Name = "Mode",
                    Value = options.Mode
                }.ToJson());

                InternalOptions.Mode = (VotingModeEnum)options.Mode;
            }

            Repo.Upsert(InternalOptions);
        }
    }
}