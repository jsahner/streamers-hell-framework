using API;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebSocketSharp;

namespace Projection
{
    public static class Program
    {
        private static readonly Provider provider = new Provider();
        private static WebSocket ws;

        public static void Main(string[] args)
        {
            var url = args.Length > 0 ? args[0] : "ws://127.0.0.1:61000";

            provider.OnStart += OnStart;
            provider.OnStop += OnStop;

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

        public static void Send(string msg) => ws.SendAsync(msg, null);

        private static void HandleExecutionRequest(ExecutionStartRequest msg)
        {
            var length = TimeSpan.FromSeconds(Convert.ToDouble(msg.Length));
            provider?.Start(msg.ModificationId, length);
        }

        /// <summary>
        /// Automatically initializes all modifications (no dependencies on options)
        /// </summary>
        /// <param name="msg"></param>
        private static void HandleInitialize(ClientInitialize msg)
        {
            var ip = msg.Options["ip"].String;
            var key = msg.Options["key"].String;

            provider.SetHueAppKey(key?.Trim());
            provider.SetHueBridgeIp(ip?.Trim());

            Send(new ClientInitialized { Modifications = provider.Modifications.Select(m => m.Name).ToList() }.ToJson());
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
            var msg = new ClientRegister
            {
                Id = Globals.PLUGIN_ID,
                Modifications = provider?.Modifications.ToList(),
                Options = new List<ClientRegisterOption>
                {
                    new ClientRegisterOption
                    {
                        Default = "",
                        Description = "Hue API access key for your bridge",
                        Id = "key"
                    },
                    new ClientRegisterOption
                    {
                        Default = "",
                        Description = "IP address of Hue Bridge",
                        Id = "ip"
                    }
                },
                Type = ClientRegisterType.ClientRegister
            };

            Send(msg.ToJson());
        }

        private static void OnStart(string id) => Send(new ExecutionStarted { ModificationId = id }.ToJson());

        private static void OnStop(string id) => Send(new ExecutionStopped { Modifications = new List<string> { id } }.ToJson());
    }
}