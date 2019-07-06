using Affdex;
using API;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using static Emotions.Globals;

namespace Emotions
{
    public class EmotionProvider : IDisposable
    {
        private readonly int cameraId;
        private readonly Listener listener = new Listener();

        public EmotionProvider(int cameraId = 0)
        {
            this.cameraId = cameraId;
            listener.OnEmotions += OnEmotions;
        }

        ~EmotionProvider()
        {
            Dispose(false);
        }

        public event OnDataHandler OnData;

        public event StartStopHandler OnStart, OnStop;

        private CameraDetector Detector { get; set; }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        public async Task Start(TimeSpan time)
        {
            if (Detector != null)
            {
                return;
            }

            Detector = new CameraDetector();
            Detector.setCameraId(cameraId);
            Detector.setCameraFPS(5);
            Detector.setClassifierPath("AffdexData");
            Detector.setDetectAllEmojis(true);
            Detector.setImageListener(listener);

            try
            {
                Detector.start();
            }
            catch
            {
                Detector.stop();
                Detector = null;
            }

            OnStart?.Invoke();

            await Task.Delay(time);

            Stop();
        }

        protected virtual void Dispose(bool disposing)
        {
            if (disposing)
            {
                Detector?.stop();
                Detector?.Dispose();
                Detector = null;
            }

            OnStop?.Invoke();
        }

        private void OnEmotions(Emoji emoji)
        {
            string e;

            switch (emoji)
            {
                case Emoji.Disappointed:
                    e = "😞";
                    break;

                case Emoji.Flushed:
                    e = "😳";
                    break;

                case Emoji.Kissing:
                    e = "😗";
                    break;

                case Emoji.Laughing:
                    e = "😆";
                    break;

                case Emoji.Rage:
                    e = "😡";
                    break;

                case Emoji.Relaxed:
                    e = "😊";
                    break;

                case Emoji.Scream:
                    e = "😱";
                    break;

                case Emoji.Smiley:
                    e = "😃";
                    break;

                case Emoji.Smirk:
                    e = "😏";
                    break;

                case Emoji.StuckOutTongue:
                    e = "😛";
                    break;

                case Emoji.StuckOutTongueWinkingEye:
                    e = "😜";
                    break;

                case Emoji.Unknown:
                    e = "😐";
                    break;

                case Emoji.Wink:
                    e = "😉";
                    break;

                default:
                    e = "😐";
                    break;
            }

            var msg = new InfoMessage
            {
                Type = InfoMessageType.InfoMessage,
                Data = new Dictionary<string, object>
                {
                    ["overwolfExtra"] = e
                }
            };

            OnData?.Invoke(msg.ToJson());
        }

        private void Stop()
        {
            using (var d = Detector)
            {
                d?.stop();
                Detector = null;
            }

            OnStop?.Invoke();
        }
    }
}