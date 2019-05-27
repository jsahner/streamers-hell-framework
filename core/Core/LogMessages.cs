using API;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;

namespace Core
{
    public class LogCancelRequestHandling
    {
        public string Reason { get; set; }
        public string RequestType { get; set; }
        public string Session { get; set; }
        public string Type => "CancelRequestHandling";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogClientDisconnected
    {
        public string Client { get; set; }

        public string Type => "ClientDisconnected";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogClientInitialized
    {
        public string Client { get; set; }
        public IEnumerable<string> Modifications { get; set; }
        public string Type => "ClientInitialized";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogEBSConnect
    {
        public string Type => "EBSConnect";

        public string Url { get; set; }

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogEBSConnectionClosed
    {
        public string Type => "EBSClose";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogEBSConnectionError
    {
        public Exception Exception { get; set; }

        public string Type => "EBSConnectionError";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogExecutionStarted
    {
        public string Modification { get; set; }

        public string Type => "ExecutionStarted";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogExecutionStopped
    {
        public IEnumerable<string> Modifications { get; set; }

        public string Type => "ExecutionStopped";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogInitializePollTimer
    {
        public int Duration { get; set; }

        public string Type => "InitializePollTimer";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogMessageHandlingError
    {
        public Exception Exception { get; set; }

        public string MessageType { get; set; }

        public string Session { get; set; }

        public string Type => "MessageHandlingError";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogPollAbortedEBS
    {
        public string Reason { get; set; }

        public string Type => "PollAbortedEBS";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogPollHandling
    {
        public string ChosenModification { get; set; }

        public string ChosenPollMode { get; set; }

        public PollResultData Data { get; set; }

        public decimal Duration { get; set; }

        public string Type => "PollHandling";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogReceivedMessage
    {
        public string Message { get; set; }

        public string Session { get; set; }

        public string Type => "ReceivedMessage";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogReceivedUnknownMessageType
    {
        public string MessageType { get; set; }

        public string Session { get; set; }

        public string Type => "UnknownMessageType";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogSetOption
    {
        public string Name { get; set; }

        public string Type => "SetOption";

        public object Value { get; set; }

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }

    public class LogStartNewPoll
    {
        public bool AllowNothing { get; set; }

        public decimal Duration { get; set; }

        public IEnumerable<StartPollOption> Options { get; set; }

        public string Type => "StartNewPoll";

        public string ToJson() => JsonConvert.SerializeObject(this, Helpers.JsonSettings);
    }
}