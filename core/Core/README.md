# Core

This is the main project of Streamer's Hell.

## General

By default, Core opens a non-encrypted WebSocket server on `localhost:61000` to communicate with other clients. Furthermore, it opens a simple HTTP server on port 62000 that serves files from the `Frontend` folder. This includes the `login.html` file used as the redirect from the Twitch OAuth process.

You should copy the build results from the `config` project into this folder. This allows you to open the configuration site in your web browser on [http://localhost:62000](http://localhost:62000).

## Logging

We use the [NLog](https://nlog-project.org/) library for logging purposes. You may customize the used settings through the `NLog.config` file. By default, logs will be printed on the console (level _Info_ and up) and in date-based files (level _Debug_ and up).

Some messages are printed as JSON objects. You can find the most relevant ones below with an examplary JSON object. However, most are self-explaining or simply relate to API calls of clients.

Some messages use the `session` property that refer to the internal ID of the WebSocket connection. If the log message relates to the Extension Background Service (EBS), `session` will be `"EBS"`.

All duration or length properties are denoted as seconds.

### `CancelRequestHandling`

Denotes that an incoming request was canceled. It is currently used for the following requests:

- `ClientRegister`
- `ExecutionStartRequest`
- `PollResult`
- `StartNewPoll`

This log message may be very important in case some modifications are not executed (i.e. after a poll).

```json
{
  "type": "CancelRequestHandling",
  "reason": "Why did we stop?",
  "requestType": "Request name",
  "session": "session"
}
```

### `ClientDisconnected`

```json
{
  "type": "ClientDisconnected",
  "client": "clientId"
}
```

### `ClientInitialized`

```json
{
  "type": "ClientInitialized",
  "client": "clientId",
  "modifications": ["all", "initialized", "modification", "IDs"]
}
```

### `EBSConnectionClosed`

Issued when the connection to the EBS was closed.

```json
{
  "type": "EBSConnectionClosed"
}
```

### `EBSConnectionError`

Issued when the application could not connect to the specified EBS URL.

```json
{
  "type": "EBSConnectionError"
}
```

### `ExecutionStarted`

```json
{
  "type": "ExecutionStarted",
  "modification": "modId"
}
```

### `ExecutionStopped`

```json
{
  "type": "ExecutionStopped",
  "modifications": ["stopped", "mod", "IDs"]
}
```

### `InitializePollTimer`

Issued when a timer was initialized to start a new poll in the specified amount of seconds (relates to `NextPoll` API message).

```json
{
  "type": "InitializePollTimer",
  "duration": 30
}
```

### `MessageHandlingError`

Issued whenever an error occurred while handling an incoming message. The `exception` property is the stringified `Exception` object thrown by the framework.

`messageType` denotes the `type` property of the message that was handled in this request.

```json
{
  "type": "MessageHandlingError",
  "exception": {},
  "messageType": "msgType",
  "session": "session"
}
```

### `PollAbortedEBS`

Printed whenever EBS aborted a poll request. This may happen if another poll is already active or the respective channel is already connected.

```json
{
  "type": "PollAbortedEBS",
  "reason": "Why though?"
}
```

### `PollHandling`

Printed after successful handling of incoming poll results. It shows the chosen modification, poll mode and respective duration.

`chosenPollMode` can be either `"plurality"` or `"weighted_random"`. `data` are the results that were sent by EBS (see EBS documentation).

```json
{
  "type": "PollHandling",
  "chosenModification": "winnerId",
  "chosenPollMode": "plurality",
  "data": {},
  "duration": 30
}
```

### `StartNewPoll`

Printed when starting a new poll. Includes the available options, poll duration and whether it is allowed to vote for "No Modification" (see also EBS documentation).

```json
{
  "type": "StartNewPoll",
  "allowNothing": true,
  "duration": 60,
  "options": [
    {
      "description": "Play spooky audio",
      "id": "MyModId",
      "maxLength": 60,
      "minLength": 30
    }
  ]
}
```