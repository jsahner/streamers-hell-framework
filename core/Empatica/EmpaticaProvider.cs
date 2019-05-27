using API;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using static Empatica.Globals;

namespace Empatica
{
    public class EmpaticaProvider
    {
        private const string EMPATICA_EDA = "E4_Gsr";
        private const string EMPATICA_HEARTRATE = "E4_Hr";
        private const string EMPATICA_TEMPERATURE = "E4_Temperature";

        private static readonly ManualResetEventSlim DeviceConnected = new ManualResetEventSlim(false);
        private static readonly ManualResetEventSlim SubscribedGsr = new ManualResetEventSlim(false);
        private static readonly ManualResetEventSlim SubscribedHeartRate = new ManualResetEventSlim(false);
        private static readonly ManualResetEventSlim SubscribedTemperature = new ManualResetEventSlim(false);

        private readonly Socket client;
        private readonly CancellationTokenSource taskCancel = new CancellationTokenSource();
        private bool initialized;

        public EmpaticaProvider(string address, int port)
        {
            var endpoint = new IPEndPoint(IPAddress.Parse(address), port);

            try
            {
                client = new Socket(SocketType.Stream, ProtocolType.Tcp)
                {
                    ReceiveTimeout = 1000
                };

                client.Connect(endpoint);
            }
            catch
            {
                client?.Close();
                client = null;
                throw;
            }

            // start to receive data from E4 server
            Task.Run(() => Receive(taskCancel.Token));
        }

        /// <summary>
        /// Disconnect from Empatica
        /// </summary>
        ~EmpaticaProvider()
        {
            try
            {
                Close();
            }
            finally
            {
                // ignore
            }
        }

        /// <summary>
        /// Disconnects and unsubscribes from E4 server.
        /// </summary>
        public void Close()
        {
            taskCancel.Cancel();
            SendE4("device_disconnect");
            client?.Close();
        }

        public static event OnDataHandler OnData;

        public static event OnStartStopHandler OnStart;

        public static event OnStartStopHandler OnStop;

        /// <summary>
        /// Whether the EDA modification is currently active.
        /// </summary>
        public static bool SendEDA { get; set; }

        /// <summary>
        /// Whether the heart rate modification is currently active.
        /// </summary>
        public static bool SendHeartRate { get; set; }

        /// <summary>
        /// Whether the temperature modification is currently active.
        /// </summary>
        public static bool SendTemperature { get; set; }

        /// <summary>
        /// Specified E4 ID.
        /// </summary>
        public string EmpaticaId { get; private set; }

        /// <summary>
        ///  Most recent EDA.
        /// </summary>
        private static double CurrentEDA { get; set; }

        /// <summary>
        ///  Most recent heart rate.
        /// </summary>
        private static double CurrentHeartRate { get; set; }

        /// <summary>
        /// Most recent temperature.
        /// </summary>
        private static double CurrentTemperature { get; set; }

        /// <summary>
        /// Starts the provided modification for the specified duration.
        /// </summary>
        public static async Task ExecuteAsync(string modificationId, TimeSpan time)
        {
            // internally sets the respective properties and sends the most recent values for initialization purposes
            switch (modificationId)
            {
                case EDA_ID:
                    SendEDA = true;
                    OnStart?.Invoke(EDA_ID);

                    SendInfo(new Dictionary<string, object>
                    {
                        ["MicroSiemens"] = CurrentEDA
                    });

                    break;

                case HEART_RATE_ID:
                    SendHeartRate = true;
                    OnStart?.Invoke(HEART_RATE_ID);

                    SendInfo(new Dictionary<string, object>
                    {
                        ["HeartRate"] = CurrentHeartRate
                    });

                    break;

                case TEMPERATURE_ID:
                    SendTemperature = true;
                    OnStart?.Invoke(TEMPERATURE_ID);

                    SendInfo(new Dictionary<string, object>
                    {
                        ["Celsius"] = CurrentTemperature
                    });

                    break;

                default:
                    return;
            }

            // wait for specified time span
            await Task.Delay(time).ConfigureAwait(false);

            // stop modification
            Stop(modificationId);
        }

        /// <summary>
        /// Connect to specified E4.
        /// </summary>
        /// <param name="empaticaId"></param>
        public void Initialize(string empaticaId)
        {
            if (initialized)
            {
                throw new Exception("Already initialized");
            }

            DeviceConnected.Reset();
            SubscribedGsr.Reset();
            SubscribedHeartRate.Reset();
            SubscribedTemperature.Reset();

            if (EmpaticaId != null)
            {
                throw new Exception("Already connected");
            }

            EmpaticaId = empaticaId;

            // connect to specified E4
            SendE4($"device_connect {empaticaId}");
            if (!DeviceConnected.Wait(5000))
            {
                throw new Exception("Could not connect to device");
            }
            DeviceConnected.Reset();

            // subscribe to EDA/GSR
            SendE4("device_subscribe gsr ON");
            if (!SubscribedGsr.Wait(5000))
            {
                throw new Exception("Could not subscribe to GSR");
            }
            SubscribedGsr.Reset();

            // subscribe to heart rate measurements
            SendE4("device_subscribe ibi ON");
            if (!SubscribedHeartRate.Wait(5000))
            {
                throw new Exception("Could not subscribe to heart rate");
            }
            SubscribedHeartRate.Reset();

            // subscribe to temperature measurements
            SendE4("device_subscribe tmp ON");
            if (!SubscribedTemperature.Wait(5000))
            {
                throw new Exception("Could not subscribe to temperature");
            }
            SubscribedTemperature.Reset();

            initialized = true;
        }

        private static void SendInfo(Dictionary<string, object> data)
        {
            var msg = new InfoMessage
            {
                Data = data
            };

            OnData?.Invoke(msg);
        }

        /// <summary>
        /// Called by <see cref="ExecuteAsync"/> once a modification timed out.
        /// </summary>
        private static void Stop(string modificationId)
        {
            switch (modificationId)
            {
                case EDA_ID:
                    SendEDA = false;
                    break;

                case HEART_RATE_ID:
                    SendHeartRate = false;
                    break;

                case TEMPERATURE_ID:
                    SendTemperature = false;
                    break;

                default:
                    return;
            }

            OnStop?.Invoke(modificationId);
        }

        /// <summary>
        /// Handles incoming GSR message.
        /// </summary>
        /// <param name="args"></param>
        private void HandleGsr(IReadOnlyList<string> args)
        {
            if (args.Count < 3)
            {
                return;
            }

            if (!double.TryParse(args[2], out var gsr))
            {
                return;
            }

            CurrentEDA = gsr;

            if (SendEDA)
            {
                SendInfo(new Dictionary<string, object>
                {
                    ["MicroSiemens"] = gsr
                });
            }
        }

        /// <summary>
        /// Handles incoming heart rate message.
        /// </summary>
        /// <param name="args"></param>
        private void HandleHeartRate(IReadOnlyList<string> args)
        {
            if (args.Count < 3)
            {
                return;
            }

            if (!double.TryParse(args[2], out var heartRate))
            {
                return;
            }

            CurrentHeartRate = heartRate;

            if (SendHeartRate)
            {
                SendInfo(new Dictionary<string, object>
                {
                    ["HeartRate"] = heartRate
                });
            }
        }

        /// <summary>
        /// Handle incoming message from Empatica server.
        /// </summary>
        private void HandleReponse(string response)
        {
            if (string.IsNullOrWhiteSpace(response))
            {
                return;
            }

            Console.WriteLine(response);

            var splitted = response.Trim().Split();

            if (splitted[0] == "R")
            {
                // response to a request
                switch (splitted[1])
                {
                    case "device_connect" when splitted[2] == "OK":
                    case "device_connect_btle" when splitted[2] == "OK":
                        DeviceConnected.Set();
                        break;

                    case "device_subscribe" when splitted[2] == "gsr" && splitted[3] == "OK":
                        SubscribedGsr.Set();
                        break;

                    case "device_subscribe" when splitted[2] == "ibi" && splitted[3] == "OK":
                        SubscribedHeartRate.Set();
                        break;

                    case "device_subscribe" when splitted[2] == "tmp" && splitted[3] == "OK":
                        SubscribedTemperature.Set();
                        break;
                }
            }
            else
            {
                // updated values from subscriptions
                switch (splitted[0])
                {
                    case EMPATICA_EDA:
                        HandleGsr(splitted);
                        break;

                    case EMPATICA_TEMPERATURE:
                        HandleTemperature(splitted);
                        break;

                    case EMPATICA_HEARTRATE:
                        HandleHeartRate(splitted);
                        break;
                }
            }
        }

        /// <summary>
        /// Handles incoming temperature message.
        /// </summary>
        private void HandleTemperature(IReadOnlyList<string> args)
        {
            if (args.Count < 3)
            {
                return;
            }

            if (!double.TryParse(args[2], out var celsius))
            {
                return;
            }

            CurrentTemperature = celsius;

            if (SendTemperature)
            {
                SendInfo(new Dictionary<string, object>
                {
                    ["Celsius"] = celsius
                });
            }
        }

        /// <summary>
        /// Receives message from <see cref="client"/>
        /// </summary>
        /// <param name="cancelToken"></param>
        private void Receive(CancellationToken cancelToken)
        {
            var sb = new StringBuilder();

            while (true)
            {
                if (cancelToken.IsCancellationRequested)
                {
                    return;
                }

                var buffer = new byte[1024];
                int received;

                try
                {
                    received = client.Receive(buffer);
                }
                catch
                {
                    continue;
                }

                if (received < 1)
                {
                    continue;
                }

                foreach (var c in Encoding.ASCII.GetString(buffer.Take(received).ToArray()))
                {
                    if (c == '\n' || c == '\r')
                    {
                        if (sb.Length > 0)
                        {
                            HandleReponse(sb.ToString());
                        }

                        sb.Clear();
                    }
                    else
                    {
                        sb.Append(c);
                    }
                }
            }
        }

        /// <summary>
        /// Send message to Empatica server
        /// </summary>
        private void SendE4(string data)
        {
            try
            {
                client?.Send(Encoding.ASCII.GetBytes(data + Environment.NewLine));
            }
            catch { }
        }
    }
}