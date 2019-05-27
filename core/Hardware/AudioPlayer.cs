using NAudio.Wave;
using NAudio.Wave.SampleProviders;
using System;

namespace Hardware
{
    public static class AudioPlayer
    {
        public delegate void OnPlaybackHandler(string modificationId);

        public static event OnPlaybackHandler OnPlaybackStopped;

        public static void Play(string path, TimeSpan time, string modificationId)
        {
            var reader = new AudioFileReader(path);
            var player = new WaveOutEvent();

            player.PlaybackStopped += (sender, e) => OnStop(player, reader, modificationId);

            player.Init(new OffsetSampleProvider(reader) { Take = time });
            player.Play();
        }

        private static void OnStop(WaveOutEvent player, AudioFileReader reader, string modificationId)
        {
            reader?.Dispose();
            player?.Dispose();
            OnPlaybackStopped?.Invoke(modificationId);
        }
    }
}