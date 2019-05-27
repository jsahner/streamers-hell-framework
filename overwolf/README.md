# Overwolf Application

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

The application can be configured completely through the Streamer's Hell configuration client. It assumes that Streamer's Hell is running on localhost:61000.

## Modifications

We provide a simulated eye-blinking effect as a modification for Streamer's Hell. The "blink" will be executed for 200 milliseconds every 5 seconds. The animation will be shown behind all other UI elements, such that they are not hidden. However, it will hide the game if running in Overwolf.

## UI

We use three different UI elements: a status badge, an extra badge and a real-time chart. All can be enabled or disabled through the configuration client. Furthermore, you can inject custom CSS. Since we are using [styled-components](https://www.styled-components.com/), you may even be able to use features beyond standard CSS (check the [documentation](https://www.styled-components.com/docs)). Make sure to use ";" as a delimiter even after the last element.

No UI element assumes an initial position. So you should specify some CSS properties to move the elements where you want them. As an example, the following code would move a UI element to the bottom-right corner:

```css
bottom: 0;
right: 0;
```

### Status Badge

The status badge displays the icons of all currently active modifications (if an icon is available). Only emojis and PNGs are supported right now. The latter will be resized to take the same amount of space as a 🎃 emoji in the same place.

### Extra Badge

The extra badge is similar to the status badge, but the contents can be set through an _InfoMessage_. To set the contents, send an _InfoMessage_ with an `overwolfExtra` property in the data property. Example:

```json
{
  "type": "Info.Message",
  "data": {
    "overwolfExtra": "👻 Spooky"
  }
}
```

This would set the contents of the extra badge to "👻 Spooky". If the `overwolfExtra` property is an empty string, the badge will be hidden. Please note that any new message will overwrite the previous contents.

#### Customization

The extra badge can be customized like the status badge, but offers an additional timeout that specifies how long the last sent string should be displayed. Setting this to a non-positive value will show the current content until the next one arrives. Any value higher than 0 will display the last received content for the set amount of milliseconds.

### Real-Time Chart

This UI element uses [SmoothieCharts](http://smoothiecharts.org/) to display a real-time chart. Right now, it only supports the modifications from the Empatica client. The EDA will be displayed in yellow, the heart rate in green and the current skin temperature in red.

## Using in Overwolf

See [here](http://developers.overwolf.com/documentation/odk-2-0-introduction/creating-your-first-app/) how to run an application in Overwolf. You can create a production build using `npm run build` and load the `build` folder as an unpacked extension. You may need an Overwolf developer account to perform this action.

## Running outside Overwolf

If you do not need any further Overwolf functionality, you may also run or debug this application in a modern web browser of choice (Overwolf uses Chromium internally) by running `npm start` and connecting to [http://localhost:3000](http://localhost:3000) or by building the app and opening it accordingly. 

If the application does not detect the Overwolf SDK on startup, it automatically changes its client ID to `OverwolfExternal` and deactivates the eye blink modification. Therefore, it has its own settings section in the configuration client which can be used to show different interfaces simulateneously on top of the game and, for example, in OBS Studio using the _Browser_ source.

## Demo Mode

You can use the demo mode to test your custom CSS and chart delay settings. It ignores any messages sent by Streamer's Hell and simulates an active blink modification with its respective icon, show the extra badge indefinitely with the content string "Extra Badge" and displays a real-time chart with randomly generated numbers (every 500 milliseconds).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.<br>
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br>
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (Webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `npm run build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
