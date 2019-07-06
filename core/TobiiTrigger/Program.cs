using API;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using WebSocketSharp;
using WindowsInput;
using WindowsInput.Native;

namespace TobiiTrigger
{
    public static class Program
    {
        private const string MODIFICATION_ID = "Toggle";
        private const string PLUGIN_ID = "TobiiTrigger";

        private static readonly VirtualKeyCode[] Modifiers = new[] { VirtualKeyCode.CONTROL, VirtualKeyCode.MENU };
        private static readonly IKeyboardSimulator Simulator = new InputSimulator().Keyboard;
        private static WebSocket ws;

        public static bool Running { get; set; }

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

        private static async Task HandleExecutionRequest(ExecutionStartRequest msg)
        {
            var length = TimeSpan.FromSeconds(Convert.ToDouble(msg.Length));

            if (Running)
            {
                return;
            }

            Running = true;

            Press();

            await Task.Delay(length).ConfigureAwait(false);

            if (Running)
            {
                Press();
            }
        }

        /// <summary>
        /// Automatically initializes all modifications (no dependencies on options)
        /// </summary>
        private static void HandleInitialize(ClientInitialize _)
        {
            Send(new ClientInitialized { Modifications = new List<string>() { MODIFICATION_ID } }.ToJson());
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
                    _ = HandleExecutionRequest(ExecutionStartRequest.FromJson(e.Data));
                    return;

                case "Execution.StopRequest":
                    if (Running)
                    {
                        Press();
                    }

                    return;

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
                Id = PLUGIN_ID,
                Modifications = new List<ClientRegisterModification>(),
                Type = ClientRegisterType.ClientRegister
            };

            msg.Modifications.Add(new ClientRegisterModification
            {
                Description = "Track eyes",
                Name = MODIFICATION_ID
            });

            Send(msg.ToJson());
        }

        private static void OnStart() => Send(new ExecutionStarted { ModificationId = MODIFICATION_ID }.ToJson());

        private static void OnStop() => Send(new ExecutionStopped { Modifications = new List<string> { MODIFICATION_ID } }.ToJson());

        private static void Press()
        {
            Simulator.ModifiedKeyStroke(Modifiers, VirtualKeyCode.OEM_PERIOD);
            Running = !Running;

            if (Running)
            {
                OnStart();
            }
            else
            {
                OnStop();
            }
        }

        private static void Send(string msg) => ws.SendAsync(msg, null);
    }
}