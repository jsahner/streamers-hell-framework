# EBS

This project is the Extension Background Service of your Twitch extension and serves as the proxy between extension and local Streamer's Hell installation.

## General

The project is written in TypeScript and uses Babel 7 to transpile the source files. Please note that Babel itself does not perform type checks during build, so you should run `npm run typecheck` to make sure that there are no type errors. We use [@babel/preset-env](https://babeljs.io/docs/en/babel-preset-env) to transpile the source files such that they are compiled for the Node version that was used during the transpilation process. We recommend to run and build the project on the same machine.

### Connections

We use [Express](https://expressjs.com/) to handle HTTP requests and [ws](https://github.com/websockets/ws) to handle WebSocket connections. Both run on the same server and port (HTTP connections are upgraded). By default, Express handles requests on the `/static` path to serve image files to clients.

### Image Handling

A PNG image will be validated and written into the `static` folder, using the SHA256 hash as its filename. This ensures that the server does not use too much space in case of repetitive icons. In contrast, emojis are passed as a string to all clients.

## Setup

### Required configuration

We use [dotenv](https://github.com/motdotla/dotenv) to inject environment variables into the process. Place a `.env` file in your current working folder and define the same variables as in the following example (use your own keys):

```dotenv
API_KEY=0123456789abcdef
CLIENT_ID=fedcba9876543210
EBS_KEY=foobar
OWNER_ID=123456789
PORT=30000
REDIRECT_URI=http://localhost:62000/login.html
```

You can find most of these in your Twitch developer dashboard.

#### `API_KEY`

The secure client key of your extension that is used to access the Twitch API. This is the one that automatically invalidates all other keys if creating a new one. As it is only visible immediately after generating a new one (or creating) the extension, you should write it down.

#### `CLIENT_ID`

The client ID of your extension.

#### `EBS_KEY`

This is the shared secret of your extension. Your extension can have multiple shared secrets, however, this project does not support more than one.

#### `OWNER_ID`

This the numerical Twitch ID of the user that owns the Twitch extension. You should be able to see it in the Twitch Developer Rig. Otherwise, use the [Twitch API](https://dev.twitch.tv/docs/v5/reference/users/#get-user-by-id) (you can use your display name in this API call).

#### `PORT`

This is the port that the server should use. If you omit this one, this project default to port 30000.

#### `REDIRECT_URI`

This is the _OAuth Redirect URL_ of your extension. Make sure that it exactly matches the one defined in your developer dashboard.

### SSL

Twitch requires the usage of encrypted connections for extensions, but not for the Developer Rig used for local development. As such, this project uses non-encrypted connections to ease the development process. To use it with an active Twitch Extension, you have the following options:

- Run this project behind a reverse proxy that encrypts all connections and supports WebSockets (e.g. [NGINX](https://www.nginx.com/))
- Change the source code in `index.js` to use an HTTPS server instead. You have to provide the respective certificate and key files yourself using this option.

Beware that using self-signed certificates may render your extension inaccessible for end users.

## Logging

This project uses [Winston](https://github.com/winstonjs/winston) to log messages. Logs are printed as JSON objects on the console and in a `app.log` file. Here is an examplary log output:

```json
{
  "message": {
    "type": "RevokeAccessToken",
    "success": true
  },
  "level": "info",
  "timestamp": "2019-03-01 16:00:00.000"
}
```

The only messages that may be of interest to you are some whose `message` property is a JSON object that has a `type` property. The following sections describe the respective `message` objects with an additional example.

Some messages have common properties:

- `channel` The Channel ID (`string`)
- `viewer` Viewer ID (`string`)

Furthermore, all duration are denoted in seconds.

### `Authorization`

Printed when a connection provided an authorization token for the Twitch API.

```json
{
  "type": "Authorization",
  "success": false,
  "channel": "channel",
  // will only be available if success == false
  "reason": "What happened?"
}
```

### `ChannelDisconnected`

```json
{
  "type": "ChannelDisconnected",
  "channel": "channel"
}
```

### `ConnectionKilled`

Printed if a connection was killed by force. As an example, this may happen if a client did not respond to the last sent PING message.

```json
{
  "type": "ConnectionKilled",
  "reason": "Why was the connection killed?",
  // optional
  "channel": "channel",
  // optional
  "viewer": "viewer"
}
```

### `MessageHandlingError`

Printed if an error occured while handling a message from any connection. Both `message` and `error` may be any valid JSON element.

```json
{
  "type": "MessageHandlingError",
  // originally sent message
  "message": "...",
  // error object returned
  "error": "...",
  "channel": "channel",
  // optional; if not present, message was sent by streamer
  "viewer": "viewer"
}
```

### `PollCanceled`

Printed if a poll was canceled by the streamer.

```json
{
  "type": "PollCanceled",
  "channel": "channel"
}
```

### `PollHandlingError`

Printed if poll handling was canceled for any reason.

```json
{
  "type": "PollHandlingError",
  "reason": "What happened?",
  // original request message, see PollStart
  "request": {
    // ...
  },
  "channel": "channel"
}
```

### `PollResult`

Will be printed if poll results are acquired.

The `mode` property lists the available voting modes and their respective vote count. The `mods` property is an object that has all modification IDs as its keys, with their respective vote count and average voted duration. The `nothing` property determines how many people voted for _No Modification_. It does **not** represent the number of people that did not participate in this vote.

```json
{
  "type": "PollResult",
  "intermediate": false,
  "channel": "channel",
  "result": {
    // availables voting modes with respective vote count
    "mode": {
      "plurality": 10,
      "weighted_random": 8
    },
    // all mod IDs that were available along with their accumulated count and average voted duration length
    "mods": {
      "foo": {
        "count": 5,
        "duration": 20
      },
      "bar": {
        "count": 8,
        "duration": 30
      }
    },
    // how many people voted for "No Modification"
    "nothing": 2
  }
}
```

### `PollStart`

Printed when receiving a request to start a new poll.

```json
{
  "type": "PollStart",
  "request": {
    // whether it is allowed to vote for "no modification"
    "allowNothing": false,
    // duration of vote in seconds
    "duration": 30,
    // available modifications (must be more 2 or more), see also ClientRegisterOption in general API
    "options": [
      {
        "description": "Play a spooky sound",
        "id": "SpookyAudio|MySoundID",
        // optional
        "logo": {
          "data": "👻",
          "type": "emoji"
        },
        "maxLength": 60,
        "minLength": 30,
        // optional
        "tooltip": "Play some spooky sounds to scare the streamer"
      }
    ]
  }
}
```

### `ReceivedMessage`

Printed for all incoming messages from a streamer. `message` can be any valid JSON element.

```json
{
  "type": "ReceivedMessage",
  "channel": "channel",
  "message": "..."
}
```

### `ViewerDisconnected`

```json
{
  "type": "ViewerDisconnected",
  "channel": "channel",
  "viewer": "viewer"
}
```

### `ViewerIdentification`

The identified status of a connected viewer. The `role` property can take the following values:

- `anonymous`
- `unlinked` (registered, does not reveal identity)
- `linked` (registered, does reveal identity)
- `subscriber`
- `broadcaster`
- `moderator`

```json
{
  "type": "ViewerIdentification",
  "role": "subscriber",
  "viewer": "viewer",
  "channel": "channel",
  // optional: supplied in case the viewer ID did change
  "previousId": "old"
}
```

### `Vote`

Printed for any vote received from a viewer. Note that the `mode` vote does not reset between individual polls. If any property is not present, then the respective viewer did not choose his preference or reset it.

```json
{
  "type": "Vote",
  "channel": "channel",
  "viewer": "viewer",
  // only present if a modification was chosen
  "duration": 30,
  // optional, can be either "plurality" or "weighted_random"
  "mode": "plurality",
  // optional, the ID of the chosen modification; null if "No Modification" was chosen
  "modification": "SpookyAudio|MySoundID"
}
```

## Scripts

You can build the project by running `npm run build`. You can find the transpiled files in the `dist` folder. Run the resulting `index.js` file in Node to start the server.

For development, use `npm run serve` to run and auto-reload the project on file changes. You may debug by running `npm run debug` and auto-attaching your IDE to the respective process. To enable this in Visual Studio Code, look for the option _Debug: Toggle Auto Attach_. However, the debug process will not reload on file changes.
