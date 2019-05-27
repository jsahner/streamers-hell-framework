using API;
using Newtonsoft.Json.Linq;
using System;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace Core
{
    public class Session : WebSocketBehavior
    {
        private static readonly NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();

        public delegate void GeneralSessionHandler(Session session);

        public delegate void OnAuthorizationHandler(Session session, Authorization msg);

        public delegate void OnClientInitializedHandler(Session session, ClientInitialized msg);

        public delegate void OnClientRegisterHandler(Session session, ClientRegister msg);

        public delegate void OnConfigChangeHandler(Session session, ConfigChange msg);

        public delegate void OnExecutionRequestHandler(Session session, ExecutionStartRequest msg);

        public delegate void OnExecutionStartedHandler(Session session, ExecutionStarted msg);

        public delegate void OnExecutionStoppedHandler(Session session, ExecutionStopped msg);

        public delegate void OnInfoHandler(Session session, InfoMessage msg);

        public static event OnAuthorizationHandler OnAuthorization;

        public static event OnClientInitializedHandler OnClientInitialized;

        public static event OnClientRegisterHandler OnClientRegister;

        public static event OnConfigChangeHandler OnConfigChange;

        public static event GeneralSessionHandler OnConfigRegister, OnConfigStart, OnConfigStop, OnSessionClose, OnSubscribe;

        public static event OnExecutionRequestHandler OnExecutionRequest;

        public static event OnExecutionStartedHandler OnExecutionStarted;

        public static event OnExecutionStoppedHandler OnExecutionStopped;

        public static event OnInfoHandler OnInfo;

        public bool Configurer { get; private set; }

        public bool Subscriber { get; private set; }

        protected override void OnClose(CloseEventArgs e)
        {
            OnSessionClose?.Invoke(this);
        }

        protected override void OnMessage(MessageEventArgs e)
        {
            if (!e.IsText)
            {
                return;
            }

            var msg = e.Data;

            logger.Debug(new LogReceivedMessage
            {
                Message = msg,
                Session = ID
            }.ToJson());

            string msgType = null;

            try
            {
                msgType = JObject.Parse(msg)["type"]?.ToObject<string>();

                switch (msgType)
                {
                    case "Authorization":
                        OnAuthorization?.Invoke(this, Authorization.FromJson(msg));
                        return;

                    case "Client.Initialized":
                        OnClientInitialized?.Invoke(this, ClientInitialized.FromJson(msg));
                        return;

                    case "Client.Register":
                        OnClientRegister?.Invoke(this, ClientRegister.FromJson(msg));
                        return;

                    case "Config.Change":
                        if (Configurer)
                        {
                            OnConfigChange?.Invoke(this, ConfigChange.FromJson(msg));
                        }

                        return;

                    case "Config.Register":
                        Configurer = true;
                        Subscriber = true;
                        OnConfigRegister?.Invoke(this);
                        return;

                    case "Config.Start":
                        if (Configurer)
                        {
                            OnConfigStart?.Invoke(this);
                        }

                        return;

                    case "Config.Stop":
                        if (Configurer)
                        {
                            OnConfigStop?.Invoke(this);
                        }

                        return;

                    case "Execution.StartRequest":
                        OnExecutionRequest?.Invoke(this, ExecutionStartRequest.FromJson(msg));
                        return;

                    case "Execution.Started":
                        OnExecutionStarted?.Invoke(this, ExecutionStarted.FromJson(msg));
                        return;

                    case "Execution.Stopped":
                        OnExecutionStopped?.Invoke(this, ExecutionStopped.FromJson(msg));
                        return;

                    case "Info.Message":
                        OnInfo?.Invoke(this, InfoMessage.FromJson(msg));
                        return;

                    case "Info.Subscribe":
                        if (!Subscriber)
                        {
                            Subscriber = true;
                            OnSubscribe?.Invoke(this);
                        }

                        return;

                    case "Info.Unsubscribe":
                        Subscriber = false;
                        return;

                    default:
                        logger.Info(new LogReceivedUnknownMessageType
                        {
                            MessageType = msgType,
                            Session = ID
                        }.ToJson());

                        return;
                }
            }
            catch (Exception ex)
            {
                //logger.Error()
                logger.Error(new LogMessageHandlingError
                {
                    Exception = ex,
                    MessageType = msgType,
                    Session = ID
                }.ToJson());
            }
        }
    }
}