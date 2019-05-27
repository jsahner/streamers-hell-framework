using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using static Hardware.Global;

namespace Hardware
{
    public static class SwapMouseClicks
    {
        public const string MODIFICATION_ID = nameof(SwapMouseClicks);

        static SwapMouseClicks()
        {
            SwapMouseButton(false);
        }

        public static event StartStopHandler OnStart, OnStop;

        public static async Task ExecuteAsync(TimeSpan time)
        {
            OnStart?.Invoke(MODIFICATION_ID);
            SwapMouseButton(true);

            await Task.Delay(time).ConfigureAwait(false);

            SwapMouseButton(false);
            OnStop?.Invoke(MODIFICATION_ID);
        }

        [DllImport("user32.dll")]
        private static extern bool SwapMouseButton(bool fSwap);
    }
}