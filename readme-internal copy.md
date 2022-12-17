## Todo

### Frontend

- Store the `inTauri` state in the vuex store for easy access
- Make Backend Event Connection vuex store managed
- Make Backend WebServer Connection vuex store managed
  - Settings should update port / address in vuex store
  - port / address update should be sent as event to backend
    - if port is free ok
    - if port is not free return random free port
- Button to start Backend WebServer
  - Send Event to Start Backend Webserver with vuex stored port
  - If positive all good (frontend should make ping request to some route to confirm backend is online)
  - If port already used fail

### Backend

- Args to start with port so the webserver is booted instantly instead of having to send a manual stdin after backend launched

  - The webserver start should be done by dispatching an action into the queue so it stays within the standard implementation?

- Frontend corresponding features
- Figure out how to handle event messaging more elegantly in one place
- Move Backend Webserver into a File and Class which can just be managed by the `index.js` file

## Later

- Ensure there is only one instance of CTA running (https://github.com/bitfocus/companion/blob/302ad59985674c408ed06e040ac9a9799bfb5386/electron.js#L13)
- Adding the ControlThemAll Codebase would be the next step to confirm that the `atem-connect` and `easymidi` also work with the `caxa` packaging.
- Talking to Tauri Components and File System from inside backend Server: https://github.com/tauri-apps/tauri/tree/next/examples/api/src/components
- StreamDeck Support: https://github.com/julusian/node-elgato-stream-deck
