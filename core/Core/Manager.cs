using API;
using Core.Storage;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Timers;
using WebSocketSharp;
using WebSocketSharp.Server;

namespace Core
{
    public class Manager
    {
        private const string EBS_SESSION = "EBS";

        private static readonly NLog.Logger logger = NLog.LogManager.GetCurrentClassLogger();

        /// <summary>
        /// Maps client ID to ClientState object
        /// </summary>
        private readonly ConcurrentDictionary<string, ClientState> Clients = new ConcurrentDictionary<string, ClientState>();

        private readonly WebSocketServer Server = new WebSocketServer(IPAddress.Loopback, 61000);

        private readonly WebSocketSessionManager SessionManager;

        /// <summary>
        /// Whether the currently active poll allows the "No Modification" option
        /// </summary>
        private bool currentPollAllowsNothing;

        /// <summary>
        /// WebSocket connection to EBS
        /// </summary>
        private WebSocket EBSSocket;

        /// <summary>
        /// Time of next scheduled poll
        /// </summary>
        private DateTime nextPoll;

        private bool pollActive;

        /// <summary>
        /// Starts polls
        /// </summary>
        private Timer pollTimer;

        public Manager()
        {
            // initialize WebSocket services
            Server.AddWebSocketService<Session>("/");
            Session.OnAuthorization += OnAuthorization;
            Session.OnClientInitialized += OnClientInitialized;
            Session.OnClientRegister += OnClientRegister;
            Session.OnConfigChange += OnConfigChange;
            Session.OnConfigRegister += OnConfigRegister;
            Session.OnConfigStart += OnConfigStart;
            Session.OnConfigStop += OnConfigStop;
            Session.OnExecutionRequest += OnExecutionRequest;
            Session.OnExecutionStarted += OnExecutionStarted;
            Session.OnExecutionStopped += OnExecutionStopped;
            Session.OnInfo += OnInfo;
            Session.OnSessionClose += OnSessionClose;
            Session.OnSubscribe += OnSubscribe;

            // start WebSocket server
            logger.Info("Starting WebSocket server");

            // deactivate output from WebSocket library
            Server.Log.Output = (_, __) => { };
            Server.Start();

            SessionManager = Server.WebSocketServices["/"].Sessions;

            InitializeEBSSocket();
        }

        private enum AuthorizedState
        {
            Disconnected,
            Authorizing,
            Authorized
        }

        private enum PollMode
        {
            Plurality, WeightedRandom
        }

        /// <summary>
        /// All connected sessions
        /// </summary>
        private IEnumerable<Session> Sessions => SessionManager.Sessions.Cast<Session>();

        /// <summary>
        /// Current state of authorization against EBS
        /// </summary>
        private AuthorizedState Authorized { get; set; }

        /// <summary>
        /// Information about currently authorized channel on EBS.
        /// </summary>
        private Channel Channel { get; set; }

        /// <summary>
        /// All connected config clients
        /// </summary>
        private IEnumerable<Session> Configurers => Sessions.Where(s => s.Configurer);

        /// <summary>
        /// All connected subscribers
        /// </summary>
        private IEnumerable<Session> Subscribers => Sessions.Where(s => s.Subscriber);

        /// <summary>
        /// Create public modification ID
        /// </summary>
        public static string ConstructModificationId(string clientId, string modificationName)
        {
            return $"{clientId}|{modificationName}";
        }

        /// <summary>
        /// Deconstruct public modification ID into client ID and modification ID
        /// </summary>
        public static bool DeconstructModificationId(string modificationId, out string clientId, out string modificationName)
        {
            if (string.IsNullOrEmpty(modificationId))
            {
                clientId = null;
                modificationName = null;
                return false;
            }

            var splitted = modificationId.Split(new[] { '|' }, 2, StringSplitOptions.RemoveEmptyEntries);

            if (splitted.Length != 2)
            {
                clientId = null;
                modificationName = null;
                return false;
            }

            clientId = splitted[0];
            modificationName = splitted[1];
            return true;
        }

        /// <summary>
        /// Called when connection to EBS was closed. Sets Channel to null and informs subscribers
        /// that a poll stopped (if active).
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void EBSOnClose(object sender, CloseEventArgs e)
        {
            logger.Debug(new LogEBSConnectionClosed().ToJson());

            Authorized = AuthorizedState.Disconnected;
            Channel = null;

            if (pollActive)
            {
                pollActive = false;
                SendMessage(Subscribers, new PollStopped().ToJson());
            }

            SendMessage(Configurers, GetConfigMessage().ToJson());
        }

        /// <summary>
        /// Handles incoming messages from EBS.
        /// </summary>
        private void EBSOnMessage(object sender, MessageEventArgs e)
        {
            if (!e.IsText)
            {
                return;
            }

            logger.Debug(new LogReceivedMessage { Message = e.Data, Session = EBS_SESSION }.ToJson());

            string msgType = null;

            try
            {
                var msg = JObject.Parse(e.Data);
                msgType = msg["type"].ToObject<string>();

                switch (msgType)
                {
                    case "Authorization.Success":
                        // successful authorization
                        OnAuthorizationSuccess(AuthorizationSuccess.FromJson(e.Data));
                        break;

                    case "PollError":
                        // Poll request got canceled
                        var pollError = PollError.FromJson(e.Data);

                        logger.Warn(new LogPollAbortedEBS { Reason = pollError.Reason }.ToJson());

                        pollActive = false;
                        SendMessage(Subscribers, new PollStopped().ToJson());
                        break;

                    case "PollResult":
                        // poll results
                        OnPollResult(PollResult.FromJson(e.Data));

                        pollActive = false;
                        SendMessage(Subscribers, new PollStopped().ToJson());
                        break;

                    case "PollStarted":
                        // poll successfully started from request
                        pollActive = true;

                        SendMessage(Subscribers, new PollStarted().ToJson());
                        break;

                    default:
                        logger.Warn(new LogReceivedUnknownMessageType
                        {
                            MessageType = msgType,
                            Session = EBS_SESSION
                        }.ToJson());

                        break;
                }
            }
            catch (Exception ex)
            {
                logger.Error(new LogMessageHandlingError
                {
                    Exception = ex,
                    MessageType = msgType,
                    Session = EBS_SESSION
                }.ToJson());
            }
        }

        /// <summary>
        /// Queries database and connected clients to get information about all available modifications.
        /// </summary>
        private List<ModificationInfo> GetAllModifications()
        {
            var mods = new List<ModificationInfo>();

            foreach (var entry in Clients)
            {
                var clientId = entry.Key;
                var state = entry.Value;
                var dbClient = Database.Clients.FindById(clientId);

                if (dbClient == null)
                {
                    continue;
                }

                foreach (var dbMod in dbClient.Modifications.Where(m => state.InitializedModifications.ContainsKey(m.Key)))
                {
                    var regMod = state.RegistrationMessage.Modifications.Find(mod => mod.Name == dbMod.Key);

                    if (regMod == null)
                    {
                        continue;
                    }

                    mods.Add(new ModificationInfo
                    {
                        Description = dbMod.Value.CustomDescription ?? regMod.Description,
                        Enabled = dbMod.Value.Enabled,
                        Id = ConstructModificationId(clientId, dbMod.Key),
                        Logo = state.RegistrationMessage.Modifications.Find(m => m.Name == dbMod.Key)?.Icon,
                        MaxLength = dbMod.Value.CustomMaxLength,
                        MinLength = dbMod.Value.CustomMinLength,
                        Running = state.RunningModifications.ContainsKey(dbMod.Key),
                        Tooltip = dbMod.Value.Tooltip ?? regMod.Tooltip,
                    });
                }
            }

            return mods;
        }

        /// <summary>
        /// Constructs message for config client.
        /// </summary>
        private ConfigAvailable GetConfigMessage()
        {
            return new ConfigAvailable
            {
                Channel = Channel,
                Clients = Clients
                    .Select(entry => (DbClient: Database.Clients.FindById(entry.Key), Message: entry.Value.RegistrationMessage))
                    .Where(entry => entry.DbClient != null)
                    .Select(entry => entry.DbClient.ToConfigAvailableClient(entry.Message))
                    .ToList(),
                InterfaceSettings = Database.InterfaceSettings,
                PollSettings = Database.PollSettings,
                Type = ConfigAvailableType.ConfigAvailable
            };
        }

        /// <summary>
        /// Tries to connect to given EBS and sets up the respective listeners.
        /// </summary>
        private void InitializeEBSSocket()
        {
            var url = Database.EbsUrl;

            logger.Debug(new LogEBSConnect { Url = url }.ToJson());

            EBSSocket = new WebSocket(url);
            EBSSocket.OnClose += EBSOnClose;
            EBSSocket.OnMessage += EBSOnMessage;
            EBSSocket.ConnectAsync();

            EBSSocket.Log.Output = (_, __) => { };
        }

        /// <summary>
        /// Initializes the poll timer if the set frequency is larger than 0.
        /// </summary>
        private void InitializeTimer()
        {
            pollTimer?.Close();

            var freq = Database.PollFrequency;

            if (freq <= 0)
            {
                return;
            }

            logger.Debug(new LogInitializePollTimer { Duration = freq }.ToJson());

            pollTimer = new Timer(freq * 1000) { AutoReset = false };
            pollTimer.Elapsed += StartNewPoll;
            pollTimer.Start();

            nextPoll = DateTime.Now + TimeSpan.FromSeconds(freq);

            var msg = new NextPoll { In = freq }.ToJson();

            SendMessage(EBSSocket, msg);
            SendMessage(Subscribers, msg);
        }

        /// <summary>
        /// Called when the login page sends the authorization token. Tries to connect to EBS to authenticate via Twitch.
        /// </summary>
        /// <param name="session"></param>
        /// <param name="msg"></param>
        private void OnAuthorization(Session session, API.Authorization msg)
        {
            SendMessage(session, new Ok().ToJson());

            if (Authorized != AuthorizedState.Disconnected)
            {
                return;
            }

            Authorized = AuthorizedState.Authorizing;

            if (EBSSocket.ReadyState == WebSocketState.Closed)
            {
                try
                {
                    EBSSocket.Connect();
                }
                catch (Exception e)
                {
                    logger.Error(new LogEBSConnectionError { Exception = e }.ToJson());
                    Authorized = AuthorizedState.Disconnected;
                    return;
                }
            }

            logger.Debug("Sending authentication token to EBS");
            SendMessage(EBSSocket, msg.ToJson());
        }

        /// <summary>
        /// Called when the EBS could authorize through the given credentials.
        /// Automatically sends the UI settings for the Twitch Extension.
        /// </summary>
        /// <param name="msg"></param>
        private void OnAuthorizationSuccess(AuthorizationSuccess msg)
        {
            var channel = msg.Data;
            Channel = channel;

            logger.Info("Successfully authorized as channel {channel}", channel.Name);

            Authorized = AuthorizedState.Authorized;
            SendMessage(Configurers, GetConfigMessage().ToJson());

            var uiSettings = Database.InterfaceSettings;

            var setConfig = new SetConfig
            {
                Data = new SetConfigData
                {
                    DurationTooltip = uiSettings.DurationTooltip,
                    Mode = Database.VotingMode,
                    ModificationsHeader = uiSettings.ModificationsHeader,
                    NextPollText = uiSettings.NextPollText,
                    NoModificationName = uiSettings.NoModificationName,
                    NoModificationTooltip = uiSettings.NoModificationTooltip,
                    NotRegisteredHeader = uiSettings.NotRegisteredHeader,
                    NotRegisteredText = uiSettings.NotRegisteredText,
                    Participants = Database.PollParticipants,
                    PluralityName = uiSettings.PluralityName,
                    PluralityTooltip = uiSettings.PluralityTooltip,
                    PollEndedText = uiSettings.PollEndedText,
                    SecondsLeftText = uiSettings.SecondsLeftText,
                    SubscribersOnlyHeader = uiSettings.SubscribersOnlyHeader,
                    SubscribersOnlyText = uiSettings.SubscribersOnlyText,
                    VotingModeHeader = uiSettings.VotingModeHeader,
                    WeightedRandomName = uiSettings.WeightedRandomName,
                    WeightedRandomTooltip = uiSettings.WeightedRandomTooltip,
                    WinnerName = uiSettings.WinnerName,
                    WinnerText = uiSettings.WinnerText,
                    WinnerTextNoModification = uiSettings.WinnerTextNoModification
                }
            }.ToJson();

            SendMessage(EBSSocket, setConfig);
        }

        /// <summary>
        /// Called when a client successfully initialized. Sets initialized modifications for
        /// respective client to provided array.
        /// </summary>
        private void OnClientInitialized(Session session, ClientInitialized msg)
        {
            var entry = Clients.FirstOrDefault(e => e.Value.Session.ID == session.ID);

            if (entry.Equals(default(KeyValuePair<string, ClientState>)))
            {
                return;
            }

            var clientId = entry.Key;
            var state = entry.Value;

            logger.Info(new LogClientInitialized { Client = clientId, Modifications = msg.Modifications }.ToJson());

            state.InitializedModifications.Clear();

            foreach (var mod in msg.Modifications)
            {
                state.InitializedModifications[mod] = default;
            }

            SendInfoOpen();
        }

        /// <summary>
        /// Called when a client registers. If already connected, connection will be killed.
        /// Queries the database and sends back a <see cref="ClientInitialize"/> message.
        /// </summary>
        /// <param name="session"></param>
        /// <param name="msg"></param>
        private void OnClientRegister(Session session, ClientRegister msg)
        {
            msg.VerifyIcons();

            if (Clients.TryGetValue(msg.Id, out var client))
            {
                if (client.Session != session)
                {
                    logger.Info(new LogCancelRequestHandling
                    {
                        Reason = $"Client {msg.Id} tried to register from two separate connections",
                        RequestType = nameof(ClientRegister),
                        Session = session.ID
                    }.ToJson());

                    return;
                }

                client.RegistrationMessage = msg;
            }
            else
            {
                Clients[msg.Id] = new ClientState(session, msg);
            }

            logger.Info("Client {clientId} registered successfully", msg.Id);

            var dbClient = Database.Clients.FindById(msg.Id)?.UpdateFrom(msg) ?? Client.From(msg);
            Database.Clients.Upsert(dbClient);
            SendMessage(Configurers, GetConfigMessage().ToJson());

            var initMsg = new ClientInitialize
            {
                Modifications = dbClient
                    .Modifications
                    .Select(m => new ClientInitializeModification
                    {
                        Name = m.Key,
                        Options = m.Value.Options.ToDictionary(o => o.Key, o =>
                        {
                            switch (o.Value)
                            {
                                case bool b: return b;
                                case decimal d: return d;
                                case string s: return s;
                                default: return (OptionTypeValue)Convert.ToString(o.Value);
                            }
                        })
                    })
                    .ToList(),
                Options = dbClient.Options.ToDictionary(o => o.Key, o =>
                {
                    switch (o.Value)
                    {
                        case bool b: return b;
                        case decimal d: return d;
                        case string s: return s;
                        default: return (OptionTypeValue)Convert.ToString(o.Value);
                    }
                })
            };

            SendMessage(session, initMsg.ToJson());
        }

        /// <summary>
        /// Called when the configuration client sends updated option values. Automatically
        /// broadcasts the changes to all affected clients. If the poll frequency changed to 0,
        /// scheduled polls will be canceled. If the EBS URL changed, connection to EBS will be
        /// closed and reopened. In this case, the user has to reauthenticate.
        /// </summary>
        /// <param name="session"></param>
        /// <param name="message"></param>
        private void OnConfigChange(Session session, ConfigChange message)
        {
            logger.Info("Updating configuration");

            var updateInternal = false;

            if (message.InterfaceSettings != null)
            {
                updateInternal = true;
                Database.UpdateInterfaceSettings(message.InterfaceSettings);
            }

            if (message.PollSettings != null)
            {
                updateInternal = true;
                Database.UpdatePollSettings(message.PollSettings);

                if (message.PollSettings.Frequency == 0)
                {
                    pollTimer?.Close();

                    if (pollTimer != null)
                    {
                        var msg = new NextPollCanceled().ToJson();
                        SendMessage(Subscribers, msg);
                        SendMessage(EBSSocket, msg);
                    }

                    pollTimer = null;
                }

                if (message.PollSettings.EbsUrl != null)
                {
                    EBSSocket?.Close();
                    InitializeEBSSocket();
                }
            }

            if (updateInternal)
            {
                var uiSettings = Database.InterfaceSettings;

                var setConfig = new SetConfig
                {
                    Data = new SetConfigData
                    {
                        DurationTooltip = uiSettings.DurationTooltip,
                        Mode = Database.VotingMode,
                        ModificationsHeader = uiSettings.ModificationsHeader,
                        NextPollText = uiSettings.NextPollText,
                        NoModificationName = uiSettings.NoModificationName,
                        NoModificationTooltip = uiSettings.NoModificationTooltip,
                        NotRegisteredHeader = uiSettings.NotRegisteredHeader,
                        NotRegisteredText = uiSettings.NotRegisteredText,
                        Participants = Database.PollParticipants,
                        PluralityName = uiSettings.PluralityName,
                        PluralityTooltip = uiSettings.PluralityTooltip,
                        PollEndedText = uiSettings.PollEndedText,
                        SecondsLeftText = uiSettings.SecondsLeftText,
                        SubscribersOnlyHeader = uiSettings.SubscribersOnlyHeader,
                        SubscribersOnlyText = uiSettings.SubscribersOnlyText,
                        VotingModeHeader = uiSettings.VotingModeHeader,
                        WeightedRandomName = uiSettings.WeightedRandomName,
                        WeightedRandomTooltip = uiSettings.WeightedRandomTooltip,
                        WinnerName = uiSettings.WinnerName,
                        WinnerText = uiSettings.WinnerText,
                        WinnerTextNoModification = uiSettings.WinnerTextNoModification
                    }
                }.ToJson();

                SendMessage(EBSSocket, setConfig);
            }

            foreach (var c in message.Clients)
            {
                var id = c.Key;
                var client = c.Value;

                var dbClient = Database.Clients.FindById(id)?.UpdateFrom(client);

                if (dbClient == null)
                {
                    continue;
                }

                Database.Clients.Update(dbClient);

                if (!Clients.TryGetValue(id, out var state))
                {
                    continue;
                }

                state.InitializedModifications.Clear();

                var msg = new ClientInitialize
                {
                    Modifications = dbClient
                        .Modifications
                        .Select(m => new ClientInitializeModification
                        {
                            Name = m.Key,
                            Options = m.Value.Options.ToDictionary(o => o.Key, o =>
                            {
                                switch (o.Value)
                                {
                                    case bool b: return b;
                                    case decimal d: return d;
                                    case string s: return s;
                                    default: return (OptionTypeValue)Convert.ToString(o.Value);
                                }
                            })
                        })
                        .ToList(),
                    Options = dbClient.Options.ToDictionary(
                        o => o.Key,
                        o =>
                        {
                            switch (o.Value)
                            {
                                case bool b: return b;
                                case decimal d: return d;
                                case string s: return s;
                                default: return (OptionTypeValue)Convert.ToString(o.Value);
                            }
                        })
                };

                SendMessage(state.Session, msg.ToJson());
            }

            SendMessage(Configurers, GetConfigMessage().ToJson());
            SendInfoOpen();
        }

        /// <summary>
        /// Called when a config client registers.
        /// </summary>
        /// <param name="session"></param>
        private void OnConfigRegister(Session session)
        {
            logger.Debug("Configuration client connected");
            SendMessage(session, GetConfigMessage().ToJson());
            SendInfoOpen(session);
        }

        /// <summary>
        /// Called when the user pressed on the Start button in the config client.
        /// Will start a new poll immediately.
        /// </summary>
        /// <param name="session"></param>
        private void OnConfigStart(Session session)
        {
            SendMessage(Configurers, new ConfigStart().ToJson());
            StartNewPoll(null, null);
        }

        /// <summary>
        /// Called when the user pressed on the Stop button in the config client.
        /// Will cancel active polls, scheduled polls and request all modifications
        /// to stop.
        /// </summary>
        private void OnConfigStop(Session session)
        {
            logger.Info("Stopping all modifications and next polls");

            if (pollActive)
            {
                pollActive = false;
                var stopMsg = new PollStopped().ToJson();
                SendMessage(Subscribers, stopMsg);
                SendMessage(EBSSocket, stopMsg);
            }

            if (pollTimer != null)
            {
                pollTimer.Close();

                var msg = new NextPollCanceled().ToJson();
                SendMessage(Subscribers, msg);
                SendMessage(EBSSocket, msg);
            }
            else
            {
                pollTimer = null;
            }

            SendMessage(Clients.Values.Select(v => v.Session), new ExecutionStopRequest().ToJson());
        }

        /// <summary>
        /// Handles an execution request from the given session. Tries to find the modification and notifies its owner to activate if not already active.
        /// </summary>
        private void OnExecutionRequest(Session session, ExecutionStartRequest msg)
        {
            if (!DeconstructModificationId(msg.ModificationId, out var clientId, out var modificationId))
            {
                logger.Info(new LogCancelRequestHandling
                {
                    Reason = $"Could not deconstruct modification ID {msg.ModificationId}",
                    RequestType = nameof(ExecutionStartRequest),
                    Session = session.ID
                }.ToJson());
                return;
            }

            if (!Clients.TryGetValue(clientId, out var state))
            {
                logger.Info(new LogCancelRequestHandling
                {
                    Reason = $"Client {clientId} unknown",
                    RequestType = nameof(ExecutionStartRequest),
                    Session = session.ID
                }.ToJson());
                return;
            }

            if (!state.InitializedModifications.ContainsKey(modificationId) || state.RunningModifications.ContainsKey(modificationId))
            {
                logger.Info(new LogCancelRequestHandling
                {
                    Reason = $"Modification {modificationId} unknown or already running",
                    RequestType = nameof(ExecutionStartRequest),
                    Session = session.ID
                }.ToJson());

                return;
            }

            var client = Database.Clients.FindById(clientId);

            if (client == null)
            {
                logger.Fatal(new LogCancelRequestHandling
                {
                    Reason = $"Client {clientId} not in database",
                    RequestType = nameof(ExecutionStartRequest),
                    Session = session.ID
                }.ToJson());

                return;
            }

            client.Modifications.TryGetValue(modificationId, out var mod);

            if (mod?.Enabled != true)
            {
                logger.Info(new LogCancelRequestHandling
                {
                    Reason = $"Modification {modificationId} not enabled",
                    RequestType = nameof(ExecutionStartRequest),
                    Session = session.ID
                }.ToJson());

                return;
            }

            var length = msg.Length;

            if (msg.Length < mod.CustomMinLength)
            {
                logger.Info("Increase duration of modification {id} from {old} to {new} seconds", modificationId, msg.Length, mod.CustomMinLength);
                length = mod.CustomMinLength;
            }
            else if (msg.Length > mod.CustomMaxLength)
            {
                logger.Info("Decrease duration of modification {id} from {old} to {new} seconds", modificationId, msg.Length, mod.CustomMaxLength);
                length = mod.CustomMaxLength;
            }

            var startRequest = new ExecutionStartRequest
            {
                ModificationId = modificationId,
                Length = length
            }.ToJson();

            logger.Info("Sending message to client {id}: {msg}", clientId, startRequest);
            SendMessage(state.Session, startRequest);
        }

        /// <summary>
        /// Invoked if an execution started. Checks if the sending session is actually the owner of the modification and sends an according message to subscribers.
        /// </summary>
        private void OnExecutionStarted(Session session, ExecutionStarted msg)
        {
            var client = Clients.FirstOrDefault(c => c.Value.Session.ID == session.ID);

            if (client.Equals(default(KeyValuePair<string, ClientState>)))
            {
                logger.Error(new LogCancelRequestHandling
                {
                    Reason = "Received ExecutionStarted message from unknown session",
                    Session = session.ID
                }.ToJson());
                return;
            }

            var state = client.Value;
            var modId = msg.ModificationId;

            msg.ModificationId = ConstructModificationId(client.Key, modId);

            if (state.InitializedModifications.ContainsKey(modId) && state.RunningModifications.TryAdd(modId, default))
            {
                logger.Info(new LogExecutionStarted { Modification = msg.ModificationId }.ToJson());
                SendMessage(Subscribers, msg.ToJson());
            }
            else
            {
                logger.Info(new LogCancelRequestHandling
                {
                    Reason = $"Modification {msg.ModificationId} not initialized or already running",
                    RequestType = nameof(ExecutionStarted),
                    Session = session.ID
                }.ToJson());
            }
        }

        /// <summary>
        /// Invoked if an execution stoppped. Checks if the sending session is actually the owner of the modification and sends an according message to subscribers.
        /// </summary>
        private void OnExecutionStopped(Session session, ExecutionStopped msg)
        {
            var client = Clients.FirstOrDefault(c => c.Value.Session.ID == session.ID);

            if (client.Equals(default(KeyValuePair<string, ClientState>)))
            {
                return;
            }

            var clientId = client.Key;
            var state = client.Value;
            var mods = msg.Modifications;

            var stopped = mods
                    .Where(m => state.RunningModifications.TryRemove(m, out var _))
                    .Select(name => ConstructModificationId(clientId, name))
                    .ToList();

            if (stopped.Count > 0)
            {
                logger.Info(new LogExecutionStopped { Modifications = stopped }.ToJson());

                msg.Modifications = stopped;
                SendMessage(Subscribers, msg.ToJson());
            }
        }

        /// <summary>
        /// Sends new info message to all subscribers.
        /// </summary>
        private void OnInfo(Session session, InfoMessage msg)
        {
            SendMessage(Subscribers, msg.ToJson());
        }

        /// <summary>
        /// Called once the EBS sends poll results. Will try to activate the respective
        /// modification according to the chosen voting mode.
        /// </summary>
        /// <param name="msg"></param>
        private void OnPollResult(PollResult msg)
        {
            // start new Timer if applicable
            InitializeTimer();

            var mods = msg.Data.Mods;
            var nothing = msg.Data.Nothing;

            var allowedNothing = currentPollAllowsNothing;

            var total = mods.Sum(entry => entry.Value.Count);
            var votes = -1;

            if (allowedNothing)
            {
                total += nothing;
            }

            // check if someone voted
            if (total == 0)
            {
                logger.Info(new LogCancelRequestHandling
                {
                    Reason = "No votes available",
                    RequestType = nameof(PollResult),
                    Session = EBS_SESSION
                }.ToJson());

                return;
            }

            PollMode mode;

            switch (Database.VotingMode)
            {
                case VotingModeEnum.Plurality:
                    mode = PollMode.Plurality;
                    break;

                case VotingModeEnum.WeightedRandom:
                    mode = PollMode.WeightedRandom;
                    break;

                case VotingModeEnum.Viewers:
                    mode = msg.Data.Mode.Plurality > msg.Data.Mode.WeightedRandom
                        ? PollMode.Plurality
                        : PollMode.WeightedRandom;

                    break;

                default:
                    mode = PollMode.Plurality;
                    break;
            }

            string modId = null;
            decimal duration = 0;

            if (mode == PollMode.Plurality)
            {
                // try to find modification with highest vote count
                foreach (var entry in mods)
                {
                    if (entry.Value.Count <= votes)
                    {
                        continue;
                    }

                    votes = (int)entry.Value.Count;
                    modId = entry.Key;
                    duration = entry.Value.Duration;
                }

                // check if "no modification" option was active and how many votes it received
                if (allowedNothing && nothing > votes)
                {
                    modId = null;
                    votes = (int)nothing;
                }
            }
            else
            {
                // weighted random
                var chosen = Helpers.rng.Next(0, (int)total);
                var count = 0;

                foreach (var entry in mods)
                {
                    count += (int)entry.Value.Count;

                    if (count > chosen)
                    {
                        modId = entry.Key;
                        duration = entry.Value.Duration;
                        break;
                    }
                }

                // if loop exits cleanly, then "nothing" was chosen
            }

            if (string.IsNullOrEmpty(modId))
            {
                // "No Modification" won
                logger.Info(new LogPollHandling
                {
                    ChosenModification = modId,
                    ChosenPollMode = mode == PollMode.Plurality ? "plurality" : "weighted_random",
                    Data = msg.Data
                }.ToJson());

                SendMessage(EBSSocket, new PollWinner { Data = new PollWinnerData { Duration = 0, Id = "nothing", TotalVotes = total, Votes = votes } }.ToJson());
                return;
            }

            DeconstructModificationId(modId, out var clientId, out var modName);

            // try to find modification to activate
            if (!Clients.TryGetValue(clientId, out var state))
            {
                logger.Error(new LogCancelRequestHandling
                {
                    Reason = $"Client {clientId} not connected",
                    RequestType = nameof(PollResult),
                    Session = EBS_SESSION
                }.ToJson());

                return;
            }

            if (!state.InitializedModifications.ContainsKey(modName))
            {
                logger.Error(new LogCancelRequestHandling
                {
                    Reason = $"Modification {modName} not initialized",
                    RequestType = nameof(PollResult),
                    Session = EBS_SESSION
                }.ToJson());

                return;
            }

            var client = Database.Clients.FindById(clientId);

            if (client == null)
            {
                logger.Error(new LogCancelRequestHandling
                {
                    Reason = $"Could not find client {clientId} in database",
                    RequestType = nameof(PollResult),
                    Session = EBS_SESSION
                }.ToJson());

                return;
            }

            client.Modifications.TryGetValue(modName, out var dbMod);

            if (dbMod == null)
            {
                logger.Error(new LogCancelRequestHandling
                {
                    Reason = $"Could not find modificcation {modName} in database",
                    RequestType = nameof(PollResult),
                    Session = EBS_SESSION
                }.ToJson());

                return;
            }

            // make sure required duration is in user-set range (could have changed throughout the poll)
            if (duration < dbMod.CustomMinLength)
            {
                logger.Info("[PollResult] Increased duration to {length} seconds", dbMod.CustomMinLength);
                duration = dbMod.CustomMinLength;
            }
            else if (duration > dbMod.CustomMaxLength)
            {
                logger.Info("[PollResult] Decreased duration to {length} seconds", dbMod.CustomMaxLength);
                duration = dbMod.CustomMaxLength;
            }

            logger.Info(new LogPollHandling
            {
                ChosenModification = modId,
                ChosenPollMode = mode == PollMode.Plurality ? "plurality" : "weighted_random",
                Data = msg.Data,
                Duration = duration
            }.ToJson());

            // send start request to client
            var startRequest = new ExecutionStartRequest { Length = duration, ModificationId = modName }.ToJson();
            SendMessage(state.Session, startRequest);

            // notify EBS about winner
            SendMessage(EBSSocket, new PollWinner { Data = new PollWinnerData { Duration = duration, Id = modId, TotalVotes = total, Votes = votes } }.ToJson());
        }

        /// <summary>
        /// Invoked if a core session disconnects. Notifies all subscribers, if it was a client that provided a modification.
        /// </summary>
        private void OnSessionClose(Session session)
        {
            var entry = Clients.FirstOrDefault(e => e.Value.Session.ID == session.ID);

            if (entry.Equals(default(KeyValuePair<string, ClientState>)))
            {
                return;
            }

            if (Clients.TryRemove(entry.Key, out var _))
            {
                logger.Info(new LogClientDisconnected { Client = entry.Key }.ToJson());
                SendInfoOpen();
                SendMessage(Configurers, GetConfigMessage().ToJson());
            }
        }

        /// <summary>
        /// Called when a client becomes a subscriber.
        /// </summary>
        /// <param name="session"></param>
        private void OnSubscribe(Session session)
        {
            SendInfoOpen(session);
        }

        /// <summary>
        /// Sends <see cref="InfoOpen"/> message to all subscribers.
        /// </summary>
        private void SendInfoOpen()
        {
            var msg = new InfoOpen { Data = new InfoOpenData { Modifications = GetAllModifications(), PollActive = pollActive } };

            if (nextPoll > DateTime.Now)
            {
                msg.Data.NextPoll = Convert.ToInt32((nextPoll - DateTime.Now).TotalSeconds);
            }

            SendMessage(Subscribers, msg.ToJson());
        }

        /// <summary>
        /// Sends <see cref="InfoOpen"/> message to specified client.
        /// </summary>
        /// <param name="session"></param>
        private void SendInfoOpen(IWebSocketSession session)
        {
            var msg = new InfoOpen { Data = new InfoOpenData { Modifications = GetAllModifications(), PollActive = pollActive } };

            if (nextPoll > DateTime.Now)
            {
                msg.Data.NextPoll = Convert.ToInt32((nextPoll - DateTime.Now).TotalSeconds);
            }

            SendMessage(session, msg.ToJson());
        }

        /// <summary>
        /// Send message asynchronously to specified sessions.
        /// </summary>
        private void SendMessage(IEnumerable<IWebSocketSession> sessions, string msg)
        {
            foreach (var session in sessions)
            {
                SendMessage(session, msg);
            }
        }

        /// <summary>
        /// Send message asynchronously to specified session.
        /// </summary>
        private void SendMessage(IWebSocketSession session, string msg)
        {
            SendMessage(session?.Context.WebSocket, msg);
        }

        /// <summary>
        /// Send message to specified <see cref="WebSocket"/>
        /// </summary>
        private void SendMessage(WebSocket ws, string msg)
        {
            if (ws?.ReadyState == WebSocketState.Open)
            {
                ws.SendAsync(msg, null);
            }
        }

        /// <summary>
        /// Starts a new poll if the EBS is authorized and no other poll is currently active.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void StartNewPoll(object sender, ElapsedEventArgs e)
        {
            if (Authorized != AuthorizedState.Authorized)
            {
                logger.Error(new LogCancelRequestHandling
                {
                    Reason = "Not authorized",
                    RequestType = nameof(StartNewPoll)
                }.ToJson());

                return;
            }

            if (pollActive)
            {
                logger.Error(new LogCancelRequestHandling
                {
                    Reason = "Another poll is already active",
                    RequestType = nameof(PollResult)
                }.ToJson());

                return;
            }

            var options = GetAllModifications().Where(m => m.Enabled).Select(m => m.ToStartPollOption()).ToList();
            var amount = Database.MaxModifications;

            if (amount > 0 && amount > options.Count)
            {
                // amount of modifications limited => shuffle list and choose the respective amount
                options.Shuffle();
                options = options.Take(amount).ToList();
            }

            var nothingAllowed = Database.AllowNoModification;

            var msg = new StartPoll
            {
                Data = new StartPollData
                {
                    AllowNothing = nothingAllowed,
                    Duration = Database.PollDuration,
                    Options = options
                }
            };

            logger.Info(new LogStartNewPoll
            {
                AllowNothing = msg.Data.AllowNothing,
                Duration = msg.Data.Duration,
                Options = msg.Data.Options,
            }.ToJson());

            currentPollAllowsNothing = nothingAllowed;

            var startMsg = msg.ToJson();
            SendMessage(EBSSocket, startMsg);
        }

        /// <summary>
        /// A helper class to specify the current state of a connected client.
        /// </summary>
        private class ClientState
        {
            public ClientState(IWebSocketSession session, ClientRegister msg)
            {
                RegistrationMessage = msg;
                Session = session;
            }

            /// <summary>
            /// All initialized modifications of this client.
            /// </summary>
            public ConcurrentDictionary<string, byte> InitializedModifications { get; set; } = new ConcurrentDictionary<string, byte>();

            /// <summary>
            /// The original <see cref="ClientRegister"/> message this client used to register.
            /// </summary>
            public ClientRegister RegistrationMessage { get; set; }

            /// <summary>
            /// All currently active modifications.
            /// </summary>
            public ConcurrentDictionary<string, byte> RunningModifications { get; } = new ConcurrentDictionary<string, byte>();

            /// <summary>
            /// The WebSocket session that belongs to this client.
            /// </summary>
            public IWebSocketSession Session { get; }
        }
    }
}