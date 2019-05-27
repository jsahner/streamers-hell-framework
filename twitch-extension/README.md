# Twitch Extension

This project is based on the [Native React Boilerplate](https://github.com/twitchdev/extensions-boilerplate).

## Setup

We use _dotenv_ to inject the URLs to your servers into the build process. The provided `env.dev` file is used in the `start` and `host` scripts and is pre-configured for local development. If you want to build for production, create a `.env` file and adapt the URLs accordingly.

- `STATIC_URL`: URL to your EBS static file path (this is usally your `WS_URL` + `static/` using HTTPS)
- `WS_URL`: URL to your EBS WebSocket server

To run an extension on Twitch, you may only use secured connections. As such, make sure that you only use `https` and `wss` connections.

## Development

Make sure that you can use the `localhost.rig.twitch.tv` URL on your development machine by redirecting this URL to 127.0.0.1 in your machine's `hosts` file.

To test this extension, you should download and set up the [Twitch Developer Rig](https://dev.twitch.tv/docs/extensions/rig/). Make sure you can connect to your EBS and execute `npm run host`. This uses Webpack to bundle your files and hosts them on `localhost.rig.twitch.tv:8080`. Create an extension view in the developer rig and you should be able to see the UI. Webpack will automatically produce a new build if you change any file (using Webpack Dev Server and HMR).

To create a production build in the `dist` folder, run `npm run build`. You can zip these files and upload them to Twitch to move your extension to _Hosted Test_.

## General Information

We use Webpack to build this project with Babel 7 and TypeScript. Due to Babel's limitations, the source files are not type-checked during the build. When in doubt, run the TypeScript compiler `tsc` in this directory.