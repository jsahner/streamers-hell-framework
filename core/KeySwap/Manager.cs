using API;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Threading;
using WebSocketSharp;
using WindowsInput.Native;

namespace KeySwap
{
    public class Manager
    {
        private const string MOD_ID = "SwapKeys";

        private readonly KeyboardHookProvider Hook = new KeyboardHookProvider();
        private readonly WebSocket Socket;

        public Manager()
        {
            KeyboardHookProvider.OnStart += OnModStart;
            KeyboardHookProvider.OnStop += OnModStop;

            Socket = new WebSocket("ws://localhost:61000");
            Socket.OnClose += OnClose;
            Socket.OnMessage += OnMessage;
            Socket.OnOpen += OnOpen;
            Socket.Connect();

            Hook = new KeyboardHookProvider();
        }

        private void HandleInitialize(ClientInitialize msg)
        {
            var swapOptions = msg.Modifications[0].Options;

            var first = (VirtualKeyCode)swapOptions["First"].String[0];
            var second = (VirtualKeyCode)swapOptions["Second"].String[0];

            if (first == second)
            {
                return;
            }

            if ((Hook?.First == first && Hook?.Second == second) || (Hook?.Second == first && Hook?.First == second))
            {
                // keys are already configured
                Socket.Send(new ClientInitialized { Modifications = new List<string> { MOD_ID } }.ToJson());
                return;
            }

            Hook.First = first;
            Hook.Second = second;

            OnOpen(null, null);
        }

        private void OnClose(object sender, CloseEventArgs e)
        {
            Thread.Sleep(1000);
            Socket.Connect();
        }

        private void OnMessage(object sender, MessageEventArgs e)
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
                    var startReq = ExecutionStartRequest.FromJson(e.Data);
                    Hook?.Start(TimeSpan.FromSeconds(Convert.ToDouble(startReq.Length)));
                    return;

                case "Execution.StopRequest":
                    Hook?.Stop();
                    return;

                default:
                    return;
            }
        }

        private void OnModStart()
        {
            var msg = new ExecutionStarted { ModificationId = MOD_ID };
            Socket.Send(msg.ToJson());
        }

        private void OnModStop()
        {
            var msg = new ExecutionStopped { Modifications = new List<string> { MOD_ID } };
            Socket.Send(msg.ToJson());
        }

        /// <summary>
        /// Register to SHF. Allow to swap any two key between A and Z.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void OnOpen(object sender, EventArgs e)
        {
            var msg = new ClientRegister()
            {
                Id = "Swapper",
                Modifications = new List<ClientRegisterModification>(),
                Type = ClientRegisterType.ClientRegister
            };

            msg.Modifications.Add(new ClientRegisterModification
            {
                Description = Hook.First == default && Hook.Second == default ? "Swap two keys on keyboard" : Hook.Description,
                Icon = new Icon { Type = IconType.Emoji, Data = "⌨️" },
                Name = MOD_ID,
                Options = new List<ClientRegisterOption>
                {
                    new ClientRegisterOption { Default = "A", Description = "Key 1", Id = "First", ValidValues = new List<ValidValue> { "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z" } },
                    new ClientRegisterOption { Default = "D", Description = "Key 2", Id = "Second", ValidValues = new List<ValidValue> { "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z" } }
                }
            });

            Socket.Send(msg.ToJson());
        }
    }
}