# KeySwap

This application can swap two key bindings (A-Z) on the user's keyboard.

## Important

This program uses the windows API to register a keyboard hook that provides this modification. This is a deep system manipulation that is executed in real time and more complex than a global key logger. Hence, unfortunately, this application is prone to errors and **may crash silently**. It could also happen that your virus scanner falsely identifies this program as a virus.

To reduce the risk of a silent crash, **restart the application** after changing the keys to swap. You could also exclude this process from your virus scanner.