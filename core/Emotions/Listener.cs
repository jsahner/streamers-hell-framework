using Affdex;
using System.Collections.Generic;
using System.Linq;

namespace Emotions
{
    class Listener : ImageListener
    {
        public delegate void OnEmotionsHandler(Emoji emoji);

        public event OnEmotionsHandler OnEmotions;

        public void onImageCapture(Frame frame)
        {
        }

        public void onImageResults(Dictionary<int, Face> faces, Frame frame)
        {
            var face = faces.Values.FirstOrDefault();

            if (face != null)
            {
                OnEmotions?.Invoke(face.Emojis.dominantEmoji);
            }
        }
    }
}