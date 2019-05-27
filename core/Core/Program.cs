using System;

namespace Core
{
    internal static class Program
    {
        private static readonly NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();

        public static void Main()
        {
            var manager = new Manager();
            var server = new SimpleHTTPServer("Frontend", 62000);

            Console.WriteLine($"Open your browser on http://localhost:{server.Port}");
#if !DEBUG
            System.Diagnostics.Process.Start($"http://localhost:{server.Port}");
#endif

            logger.Info("Started");

            while (Console.ReadLine() != "exit")
            {
                GC.KeepAlive(manager);
                GC.KeepAlive(server);
            }

            NLog.LogManager.Shutdown(); // Flush and close down internal threads and timers
            Environment.Exit(0);
        }
    }
}