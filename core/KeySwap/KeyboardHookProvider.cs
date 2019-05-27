// Based on: https://github.com/rvknth043/Global-Low-Level-Key-Board-And-Mouse-Hook

using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Timers;
using WindowsInput;
using WindowsInput.Native;

namespace KeySwap
{
    public delegate void StartStopHandler();

    /// <summary>
    ///     Class for intercepting low level keyboard hooks
    /// </summary>
    public class KeyboardHookProvider
    {
        private const int WM_KEYDOWN = 0x100;
        private const int WM_KEYUP = 0x101;
        private const int WM_SYSKEYDOWN = 0x104;
        private const int WM_SYSKEYUP = 0x105;
        private static readonly InputSimulator Simulator = new InputSimulator();

        /// <summary>
        ///     Hook ID
        /// </summary>
        private readonly IntPtr hookId;

        private volatile bool active;
        private volatile bool ignoreFirstDown;
        private volatile bool ignoreFirstUp;
        private volatile bool ignoreSecondDown;
        private volatile bool ignoreSecondUp;
        private Timer stopTimer;

        public KeyboardHookProvider()
        {
            hookId = SetHook(HookFunc);
        }

        /// <summary>
        ///     Destructor. Unhook current hook
        /// </summary>
        ~KeyboardHookProvider()
        {
            UnhookWindowsHookEx(hookId);
        }

        /// <summary>
        ///     Internal callback processing function
        /// </summary>
        private delegate IntPtr KeyboardHookHandler(int nCode, IntPtr wParam, IntPtr lParam);

        public static event StartStopHandler OnStart, OnStop;

        public string Description => $"Swap {ConvertToChar(First)} and {ConvertToChar(Second)}";

        public VirtualKeyCode First { get; set; }

        public VirtualKeyCode Second { get; set; }

        public static char ConvertToChar(VirtualKeyCode key)
        {
            return Convert.ToChar(MapVirtualKey((uint)key, 2));
        }

        public void Start(TimeSpan time)
        {
            if (active)
            {
                return;
            }

            active = true;
            OnStart?.Invoke();

            stopTimer = new Timer(time.TotalMilliseconds)
            {
                AutoReset = false,
            };

            stopTimer.Elapsed += Stop;
            stopTimer.Start();
        }

        public void Stop()
        {
            Stop(null, null);
            stopTimer?.Stop();
        }

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern int MapVirtualKey(uint uCode, uint uMapType);

        /// <summary>
        ///     Registers hook with Windows API
        /// </summary>
        /// <param name="proc">Callback function</param>
        /// <returns>Hook ID</returns>
        private static IntPtr SetHook(KeyboardHookHandler proc)
        {
            using (var module = Process.GetCurrentProcess().MainModule)
            {
                return SetWindowsHookEx(13, proc, GetModuleHandle(module.ModuleName), 0);
            }
        }

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, KeyboardHookHandler lpfn, IntPtr hMod,
            uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        private IntPtr HookFunc(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (!active || nCode < 0 || First == Second)
            {
                return CallNextHookEx(hookId, nCode, wParam, lParam);
            }

            var inputSimulated = false;

            switch (wParam.ToInt32())
            {
                case WM_KEYDOWN:
                case WM_SYSKEYDOWN:
                    {
                        var key = (VirtualKeyCode)Marshal.ReadInt32(lParam);

                        if (key == First)
                        {
                            if (ignoreFirstDown)
                            {
                                ignoreFirstDown = false;
                                break;
                            }

                            ignoreSecondDown = true;
                            Simulator.Keyboard.KeyDown(Second);
                            inputSimulated = true;
                        }
                        else if (key == Second)
                        {
                            if (ignoreSecondDown)
                            {
                                ignoreSecondDown = false;
                                break;
                            }

                            ignoreFirstDown = true;
                            Simulator.Keyboard.KeyDown(First);
                            inputSimulated = true;
                        }

                        break;
                    }

                case WM_KEYUP:
                case WM_SYSKEYUP:
                    {
                        var key = (VirtualKeyCode)Marshal.ReadInt32(lParam);

                        if (key == First)
                        {
                            if (ignoreFirstUp)
                            {
                                ignoreFirstUp = false;
                                break;
                            }

                            ignoreSecondUp = true;
                            Simulator.Keyboard.KeyUp(Second);
                            inputSimulated = true;
                        }
                        else if (key == Second)
                        {
                            if (ignoreSecondUp)
                            {
                                ignoreSecondUp = false;
                                break;
                            }

                            ignoreFirstUp = true;
                            Simulator.Keyboard.KeyUp(First);
                            inputSimulated = true;
                        }

                        break;
                    }
            }

            return inputSimulated ? (IntPtr)1 : CallNextHookEx(hookId, nCode, wParam, lParam);
        }

        private void Stop(object sender, EventArgs e)
        {
            active = false;
            OnStop?.Invoke();
        }
    }
}