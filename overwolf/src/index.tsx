import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";
import * as serviceWorker from "./serviceWorker";
import { Overwolf } from "./overwolf";

declare const overwolf: Overwolf;

try {
  // detect whether client is running in Overwolf; if so, maximize window
  overwolf.windows.getCurrentWindow(result => {
    if (result.status === "success") {
      const id = result.window.id;
      overwolf.windows.maximize(id);
    }
  });
} catch {}

ReactDOM.render(<App />, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
