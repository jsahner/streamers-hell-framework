# Empatica

This application connects to the Empatica [E4 Streaming Server](https://developer.empatica.com/windows-streaming-server.html) and subscribes to changes in the heart rate, skin temperature or skin conductivity of a given device ID. All messages received from the streaming server will be printed on the console.

## Configuration

Upon registering as a client to Streamer's Hell the E4's ID and the streaming server's address should be provided using the configuration tool. Changing these options during runtime forcibly reconnect the provided Empatica device.

## Error Handling

If connecting to the device or subscribing to the data packets takes longer than 5 seconds each, we send an empty _ClientInitialized_ message to Streamer's Hell.
