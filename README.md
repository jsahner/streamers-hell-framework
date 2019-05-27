# Documentation

For instructions on how to build and use the individual projects, check their respective `README` files.

## Implementing your own client

This section describes how to use the publicly available API to register new modifications, subscribe to events that happen in Streamer's Hell and more.

### Register your client

Let's assume you have a client called _SpookyAudio_ and want to register a modification that can play sounds. By default, Streamer's Hell starts a WebSocket server on `localhost` on port 61000. Connect your client to this WebSocket. To register your client with Streamer's Hell, use a `ClientRegister` message.

See the following example:

```json
{
  "type": "Client.Register",
  "id": "SpookyAudio",
  "modifications": [
    {
      "description": "Play a spooky sound",
      "icon": {
        "data": "👻",
        "type": "emoji"
      },
      "maxLength": 30,
      "name": "MySoundID"
    }
  ]
}
```

In this example, you would register your _SpookyAudio_ client that offers a single modification called _Play a spooky sound_. That modification is accompanied by a 👻 emoji as its icon and may run for at most 30 seconds. Internally, this modification will have the ID _MySoundID_. This ID will be used by Streamer's Hell to refer to this particular modification.

### Option Handling

When you register a new client, Streamer's Hell responds with a `ClientInitialize` message. This contains all options that were set by the user. You will receive this message at any time the user changes the configuration of some option that relates to your client.

As an example, imagine your client would take a `string` option called _DeviceID_. Then Streamer's Hell would send a message like this:

```json
{
  "type": "Client.Initialize",
  "modifications": [
    {
      "name": "YourModID",
      "options": {}
    }
  ],
  "options": {
    "DeviceID": "foobar"
  }
}
```

Each time you receive such a message, you should respond with `ClientInitialized` message. This should contain all modification IDs that are ready to be executed. As an example, assume the modification _YourModID_ is ready to be executed. Then respond with the following message:

```json
{
  "type": "Client.Initialized",
  "modifications": ["YourModID"]
}
```

Streamer's Hell only sends requests for modifications that were initialized.

### Start/Stop Requests

If you receive an `ExecutionStartRequest` message, you should start to execute that particular modification.

The following example wants you to execute the modification _YourModID_ for 30 seconds.

```json
{
  "type": "Execution.StartRequest",
  "length": 30,
  "modifiationId": "YourModID"
}
```

After you started your modification, respond with a `ExecutionStarted` message such as the following.

```json
{
  "type": "Execution.Started",
  "modificationId": "YourModID"
}
```

After the specified amount of time, stop your modification and send an `ExecutionStopped` message.

```json
{
  "type": "Execution.Stopped",
  "modifications": ["YourModID"]
}
```

Streamer's Hell may also request that you stop the execution of one or more modifications.

```json
{
  "type": "Execution.StopRequest",
  "modifications": ["YourModID"]
}
```

If the `modifications` property is empty, stop all active modifications. In any case, reply with an appropriate `ExecutionStopped` message.

You may also send `ExecutionStartRequest` messages yourself to request that other modifications should be activated.

### Subscribing

You can subscribe to some events that happen in Streamer's Hell. To subscribe, send a `InfoSubscribe` message to the core. Streamer's Hell will respond with an `InfoOpen` message and start to notify you about ongoing events. The `InfoOpen` messages sends all currently available information as one message.

The following list specifies all kinds of notifications you might receive as a subscriber:

- `ExecutionStarted`
- `ExecutionStopped`
- `InfoMessage`
- `InfoOpen`
- `NextPoll`
- `NextPollCanceled`
- `PollStarted`
- `PollStopped`

Check their respective documentation below. Using an `InfoMessage`, your client can share messages with other subscribers that are connected to Streamer's Hell. As an example, you may use this to implement some visualizations.

## API Classes (for clients)

The definitions in this section are written in TypeScript. You can also use the API definition file in the `core` folder. If Streamer's Hell is talking with your client, it will use the modification IDs you specified. If you are using a public information (i.e. you are a subscriber), the modification ID will be connected through a `|` with the respective client's ID.

Example: if your client is called `SpookyAudio` and offers a modification called `MyID`, the public ID of this modification will be `SpookyAudio|MyID`.

Note: all `length` or `duration` properties are in seconds.

### `BoolRegisterOption`

Use this if your option can only takes one of two values (`true` or `false`).

```ts
interface BoolRegisterOption extends RegisterOption {
  default: boolean;
}
```

### `ClientInitialize`

Sent as an initialization request by Streamer's Hell to your client. Respond with a `ClientInitialized` message after initialization. You will receive no `ExecutionStartRequest` for non-initialized modifications.

```ts
interface ClientInitialize {
  type: "Client.Initialize";
  modifications: ClientInitializeModification[];
  options: OptionValues;
}
```

### `ClientInitializeModification`

Used in `ClientInitialize` messages.

```ts
interface ClientInitializeModification {
  name: string;
  options: OptionValues;
}
```

### `ClientInitialized`

Response to `ClientInitialize` messages. Put all modification IDs that are ready to executed into the `modifications` array. If `modifications` is not present, it will be handled like an empty array.

```ts
interface ClientInitialized {
  type: "Client.Initialized";
  modifications?: string[];
}
```

### `ClientRegister`

Use this to register your client with Streamer's Hell. You may also use this repeatedly on the same connection. However, your client cannot be connected twice at the same time using the same ID.

```ts
interface ClientRegister {
  type: "Client.Register";
  icon?: Icon;
  id: string;
  modifications?: ClientRegisterModification[];
  options?: ClientRegisterOption[];
}
```

### `ClientRegisterModification`

A single modification of your client.

```ts
interface ClientRegisterModification {
  // will be displayed as the "name" of your modification
  description: string;
  icon?: Icon;
  // how long your modification may run at most
  maxLength?: number;
  // the internal id of your modification, will be used for communication by SH
  name: string;
  // optional options this modification may offer or require
  options?: ClientRegisterOption[];
  // an optional tooltip string that will be shown in the Twitch Extension
  tooltip?: string;
}
```

### `ClientRegisterOption`

You may either request an option to be a `bool`, `double`, `int` or `string`.

```ts
type ClientRegisterOption =
  | BoolRegisterOption
  | NumberRegisterOption
  | StringRegisterOption;
```

### `ExecutionStarted`

Usually used as a response for `ExecutionStartRequest` messages. Will be shared with the public modification ID.

```ts
interface ExecutionStarted {
  type: "Execution.Started";
  // use internal modification ID when sending yourself
  modificationId: string;
}
```

### `ExecutionStartRequest`

Sent by SH to request that your client should start to execute the respective modification for the given number of seconds. Respond with an `ExecutionStarted` message after activating.

```ts
interface ExecutionStartRequest {
  type: "Execution.StartRequest";
  length: number;
  modificationId: string;
}
```

### `ExecutionStopped`

Send this message if your client stopped executing a modification for the given duration. Will be shared with subscribers using the public modification ID.

```ts
interface ExecutionStopped {
  type: "Execution.Stopped";
  // use internal modification IDs when sending yourself
  modifications: string[];
}
```

### `ExecutionStopRequest`

Sent by SH to request that your client should stop executing the given modifications. If the optional `modifications` property is not present, stop all modifications. In any case, respond with an according `ExecutionStopped` message.

```ts
interface ExecutionStopRequest {
  type: "Execution.StopRequest";
  modifications?: string[];
}
```

### `Icon`

An optional icon your modification or client may use. This can be either an emoji or a base64-encoded PNG file. If you are using emoji, it can only be a single one (verified by SH). If you are using PNG, SH will check that the respective file is indeed a PNG file. Otherwise, the icon for your modification will be dropped silently.

```ts
interface Icon {
  data: string;
  type: "emoji" | "png";
}
```

### `InfoMessage`

Use this to send messages to subscribers in Streamer's Hell.

```ts
interface InfoMessage {
  type: "Info.Message";
  data: Record<string, any>;
}
```

### `InfoOpen`

Usually sent as a response to `InfoSubscribe` messages or if a client connects or disconnects.

```ts
interface InfoOpen {
  type: "Info.Open";
  data: {
    modifications: ModificationInfo[];
    // if present, number of seconds until the next poll will start
    nextPoll?: number;
    // whether a poll is currently active
    pollActive: boolean;
  };
}
```

### `InfoSubscribe`

Subscribe to events (see above).

```ts
interface InfoSubscribe {
  type: "Info.Subscribe";
}
```

### `InfoUnsubscribe`

Unsubscribe (see above).

```ts
interface InfoUnsubscribe {
  type: "Info.Unsubscribe";
}
```

### `ModificationInfo`

Information about a certain modification.

```ts
interface ModificationInfo {
  // public description
  description: string;
  // whether the user enabled this modification
  enabled: boolean;
  // public modification ID
  id: string;
  // optional icon
  logo?: Icon;
  // user-specified maximum duration in seconds
  maxLength: number;
  // user-specified minimum duration in seconds
  minLength: number;
  // whether this modification is currently running
  running: boolean;
  // optional tooltip/help text
  tooltip?: string;
}
```

### `NextPoll`

Informs that a poll is about to start in the specified amount of seconds.

```ts
interface NextPoll {
  type: "NextPoll";
  in: number;
}
```

### `NextPollCanceled`

Informs that an upcoming poll was canceled.

```ts
interface NextPollCanceled {
  type: "NextPollCanceled";
}
```

### `NumberRegisterOption`

If you need a number, you can specify that it should either be a `double` or an `int` value. Since JSON uses the general `number` type, you may need to cast to the respective type in your parser. You can specify a list of possible values through the `validValues` property. If it is not present, any number will be valid.

```ts
interface NumberRegisterOption extends RegisterOption {
  default: number;
  numType: "double" | "int";
  validValues?: number[];
}
```

### `OptionType`

```ts
type OptionType = boolean | number | string;
```

### `OptionValues`

An object that contains the option IDs along with their user-chosen values.

```ts
interface OptionValues {
  [key: string]: OptionType;
}
```

### `PollStopped`

Sent if a currently active poll was stopped.

```ts
interface PollStopped {
  type: "PollStopped";
}
```

### `PollStarted`

Sent if a poll was just activated.

```ts
interface PollStarted {
  type: "PollStarted";
}
```

### `RegisterOption`

Base interface for `BoolRegisterOption`, `NumberRegisterOption` and `StringRegisterOption`.

```ts
interface RegisterOption {
  description: string;
  id: string;
}
```

### `StringRegisterOption`

Analogue to `NumberRegisterOption`, but uses `string` values.

```ts
interface StringRegisterOption extends RegisterOption {
  default: string;
  validValues?: string[];
}
```
