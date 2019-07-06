namespace Projection
{
    public static class Globals
    {
        public const string PLUGIN_ID = "Projection";

        public delegate void OnDataHandler(string msg);

        public delegate void StartStopHandler(string modificationId);
    }
}