# Hardware

This application can swap the mouse key bindings on this computer (restored on application startup) and play audio files using [NAudio](https://github.com/naudio/NAudio).

Place all audio files you want into an folder called `Audio`. The respective filenames are automatically used as modification ID. As such, if you have multiple files that only differ in their extension, only one will be picked up. When registering to Streamer's Hell, the length of all audio file will be provided as the respective `maxLength` property.