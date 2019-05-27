using API;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WebSocketSharp;

namespace Empatica
{
    public static class Program
    {
        /// <summary>
        /// Handles connection to E4
        /// </summary>
        private static EmpaticaProvider provider;

        /// <summary>
        /// Connection to SHF
        /// </summary>
        private static WebSocket ws;

        public static void Main(string[] args)
        {
            var url = args.Length > 0 ? args[0] : "ws://127.0.0.1:61000";
            ws = new WebSocket(url);

            // subscribe to the provided events
            EmpaticaProvider.OnData += (msg) => Send(msg.ToJson());
            EmpaticaProvider.OnStart += OnStart;
            EmpaticaProvider.OnStop += OnStop;

            // if the connection gets closed, try to reconnect in one second
            ws.OnClose += async (o, e) =>
            {
                await Task.Delay(1000).ConfigureAwait(false);
                ws.Connect();
            };

            ws.OnMessage += OnMessage;
            ws.OnOpen += OnOpen;

            // try to connect
            ws.Connect();

            do
            {
                Console.Write("> ");
            } while (Console.ReadLine() != "exit");
        }

        private static void HandleExecutionRequest(ExecutionStartRequest msg)
        {
            var length = TimeSpan.FromSeconds(Convert.ToDouble(msg.Length));
            EmpaticaProvider.ExecuteAsync(msg.ModificationId, length).ConfigureAwait(false);
        }

        private static void HandleInitialize(ClientInitialize msg)
        {
            try
            {
                var address = msg.Options[Globals.E4_SERVER_ADDRESS].String;
                var port = Convert.ToInt32(msg.Options[Globals.E4_SERVER_PORT].Double);
                var e4id = msg.Options[Globals.E4_ID].String;

                // reconnect according to provided options, closes current connection
                provider?.Close();

                provider = new EmpaticaProvider(address, port);
                provider.Initialize(e4id);

                Send(new ClientInitialized
                {
                    Modifications = new List<string>
                    {
                        Globals.EDA_ID,
                        Globals.HEART_RATE_ID,
                        Globals.TEMPERATURE_ID
                    }
                }.ToJson());
            }
            catch (Exception e)
            {
                // initialization failed
                Console.Error.WriteLineAsync(e.Message);

                provider = null;
                Send(new ClientInitialized { Modifications = new List<string>() }.ToJson());
            }
        }

        /// <summary>
        /// Handles incoming messages from SHF.
        /// </summary>
        private static void OnMessage(object sender, MessageEventArgs e)
        {
            if (!e.IsText)
            {
                return;
            }

            switch (JObject.Parse(e.Data)["type"].ToObject<string>())
            {
                case "Client.Initialize":
                    HandleInitialize(ClientInitialize.FromJson(e.Data));
                    return;

                case "Execution.StartRequest":
                    HandleExecutionRequest(ExecutionStartRequest.FromJson(e.Data));
                    return;

                default:
                    return;
            }
        }

        /// <summary>
        /// Once the connection to SHF is open, register all modifications and three options.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private static void OnOpen(object sender, EventArgs e)
        {
            var msg = new ClientRegister()
            {
                Id = "Empatica",
                Modifications = new List<ClientRegisterModification>(),
                Options = new List<ClientRegisterOption>(),
                Type = ClientRegisterType.ClientRegister
            };

            msg.Options.Add(new ClientRegisterOption
            {
                Default = "",
                Description = "E4 ID",
                Id = Globals.E4_ID
            });

            msg.Options.Add(new ClientRegisterOption
            {
                Default = "localhost",
                Description = "Server Address",
                Id = Globals.E4_SERVER_ADDRESS
            });

            msg.Options.Add(new ClientRegisterOption
            {
                Default = 12000,
                Description = "Server Port",
                Id = Globals.E4_SERVER_PORT,
                NumType = NumType.Int
            });

            msg.Modifications.Add(new ClientRegisterModification
            {
                Description = "Measure heart rate",
                Icon = new Icon
                {
                    Data = "💓",
                    Type = IconType.Emoji
                },
                Name = Globals.HEART_RATE_ID
            });

            msg.Modifications.Add(new ClientRegisterModification
            {
                Description = "Measure stress level",
                Icon = new Icon
                {
                    Data = "😓",
                    Type = IconType.Emoji
                },
                Name = Globals.EDA_ID
            });

            msg.Modifications.Add(new ClientRegisterModification
            {
                Description = "Measure body temperature",
                Icon = new Icon
                {
                    Data = "🌡️",
                    Type = IconType.Emoji
                },
                Name = Globals.TEMPERATURE_ID
            });

            Send(msg.ToJson());
        }

        /// <summary>
        /// Notifies SHF about a started modification.
        /// </summary>
        private static void OnStart(string modificationId) => Send(new ExecutionStarted { ModificationId = modificationId }.ToJson());

        /// <summary>
        /// Notifies SHF about a stopped modification.
        /// </summary>
        /// <param name="modificationId"></param>
        private static void OnStop(string modificationId) => Send(new ExecutionStopped { Modifications = new List<string> { modificationId } }.ToJson());

        /// <summary>
        /// Send message to SHF
        /// </summary>
        private static void Send(string msg) => ws.SendAsync(msg, null);
    }
}