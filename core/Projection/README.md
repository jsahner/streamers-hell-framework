# Projections

This project can be used to project virtual environments around the player.
Any image put inside an `images` folder can be used and becomes an individual modification.

Additionally, you may use a Philips Hue Bridge to create matching ambient lighting (will be set to the most dominant color of the respectively chosen image).
This requires an API access key for the bridge and the IP address (this plugin registers itself as "StreamersHell").
Only if both fields are defined and correct, Hue can be used.

## Usage

To retrieve the chosen image, you may implement a plugin of your choice that subscribes to SHF.
This project sends the local file path of the respectively chosen image as an `InfoMessage` in the `projection_image` property.

## Notice

This project was added by request after I handed in my thesis. 
It is an old project that was used during a study that was part of my thesis, in which we evaluated an offline prototype of Streamer's Hell. 
I merely adapted this code to use the renewed API, however, I cannot guarantee that it still works as expected. 
It may still serve as a guideline for own implementations.
