using API;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebSocketSharp;

namespace Hardware
{
    public static class Program
    {
        private static WebSocket ws;

        public static void Main(string[] args)
        {
            var url = args.Length > 0 ? args[0] : "ws://127.0.0.1:61000";
            ws = new WebSocket(url);

            AudioProvider.Initialize();
            AudioProvider.OnStart += OnStart;
            AudioProvider.OnStop += OnStop;

            SwapMouseClicks.OnStart += OnStart;
            SwapMouseClicks.OnStop += OnStop;

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

            if (msg.ModificationId == SwapMouseClicks.MODIFICATION_ID)
            {
                SwapMouseClicks.ExecuteAsync(length).ConfigureAwait(false);
            }
            else
            {
                AudioProvider.Play(msg.ModificationId, length);
            }
        }

        /// <summary>
        /// Automatically initializes all modifications (no dependencies on options)
        /// </summary>
        /// <param name="msg"></param>
        private static void HandleInitialize(ClientInitialize msg)
        {
            var mods = new List<string>();
            mods.AddRange(AudioProvider.AudioFiles.Select(a => a.Id));
            mods.Add(SwapMouseClicks.MODIFICATION_ID);

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
                Id = "Hardware",
                Modifications = new List<ClientRegisterModification>(),
                Type = ClientRegisterType.ClientRegister
            };

            var audioIcon = new Icon
            {
                Data = "🎵",
                Type = IconType.Emoji
            };

            msg.Modifications.AddRange(AudioProvider
                .AudioFiles
                .Select(file => new ClientRegisterModification
                {
                    Description = $"Play {file.Name}",
                    Icon = audioIcon,
                    MaxLength = Convert.ToInt32(file.Duration),
                    Name = file.Id
                })
                .ToList());

            msg.Modifications.Add(new ClientRegisterModification
            {
                Description = "Swap left and right mouse clicks",
                Icon = new Icon
                {
                    Type = IconType.Emoji,
                    Data = "🖱️"
                },
                Name = SwapMouseClicks.MODIFICATION_ID
            });

            Send(msg.ToJson());
        }

        private static void OnStart(string modificationId) => Send(new ExecutionStarted { ModificationId = modificationId }.ToJson());

        private static void OnStop(string modificationId) => Send(new ExecutionStopped { Modifications = new List<string> { modificationId } }.ToJson());

        private static void Send(string msg) => ws.SendAsync(msg, null);
    }
}