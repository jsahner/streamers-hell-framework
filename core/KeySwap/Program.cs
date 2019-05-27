using System;
using System.Windows.Forms;

namespace KeySwap
{
    internal static class Program
    {
        private static void Main(string[] args)
        {
            Console.WriteLine("Initializing");
            var m = new Manager();
            Console.WriteLine("Done");

            // Keyboard hook must be initialized before running Application.Run(), otherwise it won't work
            Application.Run();
            Console.ReadLine();
            GC.KeepAlive(m);
        }
    }
}