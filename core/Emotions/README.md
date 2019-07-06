# Emotions

This project uses the Affectiva Emotion SDK to analyze the player's emotions. 
The top emotion will be sent to the Overwolf plugin through an `InfoMessage`. 
The ID of the camera to use can be specified through the configuration client.

## Notice

This project was added by request after I handed in my thesis. 
It is an old project that was used during a study that was part of my thesis, in which we evaluated an offline prototype of Streamer's Hell. 
I merely adapted this code to use the renewed API, however, I cannot guarantee that it still works as expected. 
It may still serve as a guideline for own implementations.

## Build Instructions

To build this project, you need to install the [Affectiva Emotion SDK](https://knowledge.affectiva.com/docs/getting-started-with-the-emotion-sdk-for-windows). 
In case you're getting an installation error regarding the Visual C++ 2015 runtime, uninstall existing VC++2015 and VC++2017 installations from your machine and try again.

After you installed the SDK, copy the `Affdex.dll`, `affdex-native.dll`, `tensorflow.dll` and `opencv_ffmpeg248_64.dll` files from the SDK into this folder. 
After you compiled the project, copy the `data` folder from the SDK folder into the build folder and call it `AffdexData`.

All of the above instructions were tested with SDK version 4.0.0-615.