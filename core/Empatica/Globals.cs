using API;

namespace Empatica
{
    public static class Globals
    {
        public const string E4_ID = "id";
        public const string E4_SERVER_ADDRESS = "address";
        public const string E4_SERVER_PORT = "port";
        public const string EDA_ID = "EDA";
        public const string HEART_RATE_ID = "HeartRate";
        public const string TEMPERATURE_ID = "Temperature";

        public delegate void OnDataHandler(InfoMessage msg);

        public delegate void OnStartStopHandler(string modificationId);
    }
}