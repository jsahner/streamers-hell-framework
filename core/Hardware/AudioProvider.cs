using NAudio.Wave;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace Hardware
{
    public static class AudioProvider
    {
        /// <summary>
        /// Path to folder where audio files should reside.
        /// </summary>
        private const string FOLDER = "Audio";

        /// <summary>
        /// all known audio files, indexed by their given ID
        /// </summary>
        private static readonly Dictionary<string, AudioFile> Files = new Dictionary<string, AudioFile>();

        static AudioProvider()
        {
            // once the AudioPlayer stopped playing back a file, notify SHF
            AudioPlayer.OnPlaybackStopped += modificationId => OnStop?.Invoke(modificationId);
        }

        public static event Global.StartStopHandler OnStart, OnStop;

        /// <summary>
        /// All known audio files
        /// </summary>
        public static IEnumerable<AudioFile> AudioFiles => Files.Values;

        /// <summary>
        /// Iterates over all files in <see cref="FOLDER"/>, checks which ones are audio files and
        /// sets them up as modifications.
        /// </summary>
        public static void Initialize()
        {
            foreach (var path in Directory.CreateDirectory(FOLDER).GetFiles().Select(fileInfo => fileInfo.FullName))
            {
                try
                {
                    TimeSpan duration;
                    using (var reader = new AudioFileReader(path))
                    {
                        duration = reader.TotalTime;
                    }

                    var filename = Path.GetFileNameWithoutExtension(path);
                    var id = $"PLAY:{filename}";

                    Files[id] = new AudioFile
                    {
                        Duration = duration.TotalSeconds,
                        Id = id,
                        Name = filename,
                        Path = path
                    };
                }
                catch { }
            }
        }

        /// <summary>
        /// Start to play an audio file for the specified duration.
        /// </summary>
        public static void Play(string modificationId, TimeSpan time)
        {
            if (Files.TryGetValue(modificationId, out var file))
            {
                AudioPlayer.Play(file.Path, time, modificationId);
                OnStart?.Invoke(modificationId);
            }
        }
    }

    public class AudioFile
    {
        public double Duration { get; set; }
        public string Id { get; set; }
        public string Name { get; set; }
        public string Path { get; set; }
    }
}