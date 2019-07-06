using API;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WebSocketSharp;

namespace Emotions
{
    static class Program
    {
        private static EmotionProvider provider;
        private static WebSocket ws;

        public static void Main(string[] args)
        {
            var url = args.Length > 0 ? args[0] : "ws://127.0.0.1:61000";
            ws = new WebSocket(url);

            ws.OnClose += async (o, e) =>
            {
                await Task.Delay(1000).ConfigureAwait(false);
                ws.Connect();
            };

            ws.OnMessage += OnMessage;
            ws.OnOpen += OnOpen;

            ws.Connect();

            do
            {
                Console.Write("> ");
            } while (Console.ReadLine() != "exit");
        }

        private static void HandleExecutionRequest(ExecutionStartRequest msg)
        {
            var length = TimeSpan.FromSeconds(Convert.ToDouble(msg.Length));
            provider?.Start(length);
        }

        /// <summary>
        /// Automatically initializes all modifications (no dependencies on options)
        /// </summary>
        /// <param name="msg"></param>
        private static void HandleInitialize(ClientInitialize msg)
        {
            var mods = new List<string>();
            var entry = msg.Modifications.Find(v => v.Name == Globals.MODIFICATION_ID);

            if (entry == null)
            {
                return;
            }

            if (!entry.Options.TryGetValue("camera", out var cameraId))
            {
                return;
            }

            provider?.Dispose();

            provider = new EmotionProvider(decimal.ToInt32((decimal)cameraId.Double));
            provider.OnData += Send;
            provider.OnStart += OnStart;
            provider.OnStop += OnStop;

            Send(new ClientInitialized { Modifications = mods }.ToJson());
        }

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

                // does not handle StopRequests
                default:
                    return;
            }
        }

        /// <summary>
        /// Register to SHF.
        /// </summary>
        private static void OnOpen(object sender, EventArgs e)
        {
            var msg = new ClientRegister()
            {
                Id = Globals.PLUGIN_ID,
                Modifications = new List<ClientRegisterModification>(),
                Type = ClientRegisterType.ClientRegister
            };

            var emotionIcon = new Icon
            {
                Data = "📷",
                Type = IconType.Emoji
            };

            msg.Modifications.Add(new ClientRegisterModification()
            {
                Description = "Analyze emotions",
                Icon = emotionIcon,
                Name = Globals.MODIFICATION_ID,
                Options = new List<ClientRegisterOption>()
                {
                    new ClientRegisterOption
                    {
                        Default = 0,
                        Description = "Camera ID",
                        Id = "camera",
                        NumType = NumType.Int
                    }
                },
                Tooltip = "Analyze player's emotions through webcam"
            });

            Send(msg.ToJson());
        }

        private static void OnStart() => Send(new ExecutionStarted { ModificationId = Globals.MODIFICATION_ID }.ToJson());

        private static void OnStop() => Send(new ExecutionStopped { Modifications = new List<string> { Globals.MODIFICATION_ID } }.ToJson());

        private static void Send(string msg) => ws.SendAsync(msg, null);
    }
}