# Changelog

## 2021-12-28

- Put the whole tauri thing into a branch on the ControlThemAll Github Repository
- Backend: make WebserverController & TauriController work without the others so that they wait or each other and the backend can be launched appropriately.
- Backend: make WebserverController react to checkPort, start, stop, and status actions.
- Frontend: Buttons & Input fields for Port and server Start/Stop as well as display the status
## 2021-12-23

- Backend: Implemented class structure for all things
- Backend: Made Webserver start/stop work and do so gracefully
- Backend: Test & Implement new Event & Queue based actions so the ControlThemAll Controller does not have any logic left over and instead everything is handled inside the respective Controllers (this works at least for one way of communication, when an action is triggered [midi button press] the midi controller sends the attached actions to the event queue and the ControlThemAllController Queue Worker then dispatches the actions in order)
- Backend: Got a working system with SystemController Delay (so the actions are executed in order and are waiting for async tasks)
- Backend: TauriController: built a theoretical connection so that the frontend can send `[{action arrays}]` with commands too (this means that the frontend can trigger `{ handler: 'WebServerController', name: 'start', ...params }` and it will reach the webServer accordingly) [untested]

## 2021-12-22

Starting the development of the Tauri Application which wraps the ControlThemAll Backend into a executable app bundle.

- Tauri Demo Project on new Branch
- Sidecar Node.JS Webserver
- Vue Building for Frontend with Router and Store (no persistence)
- Calling the Sidecar Webserver from inside Vue which is loaded inside Tauri (via ky)
- Running the Backend and Frontend outside of Tauri for easy development
- Communicating between sidecar backend and vue frontend through rust process and events (pass through)
- Know if backend is inside Tauri Container (via arg and stored in `inTauri` const)
- Know if the frontend is inside Tauri Container and show (via `window.__TAURI__` and displayed in sidebar, but needs to be stored in vuex store for easy access through state)

## 2021-06-23

- Added ToggleAudioMixOption
  + Toggle Audio Input or Channel between `On`, `Off`, and `AudioFollowVideo`
- Added Feedback for Audio Mix Option
  + Make button on midi controller on/off based on state of AudioMixOption
- Update name of `ResetAudioGain` to `ResetAudioSourceGain` and `ChangeAudioGain` to `ChangeAudioSourceGain`
- Ability to have MIDI Controller Buttons Flashing between `noteon` and `noteoff` state.
  + This adds a third signification between being off and on for example for states like `FadeToBlack` and in the future `AudioFollowVideo` states.

## 2021-06-21

- Added ability to execute Keyboard Shortcuts as Actions.
- Fixed Errors when closing the app while no WebServer was started.
- Started Implementation of Hotkeys (Global System Keyboard Shortcuts to execute Actions just like with Midi)

## 2021-06-20

- Project renamed to `ControlThemAll` instead of `MIDI2ATEM` since it makes more sense.
- Add Basic WebServer.
- Move files around for more logic.
- Strip the project of testing bloat.
- Add `ncc` & `caxa` for binary building (may support a runnable app via `tauri` in the future).
- Move away form `js` files for configuration and instead now using `yaml` files structure.
- Added ability to enable and disable certain modules (`atem`, `midi`, `webserver`) via config entry (default is all `enabled: false`).


## 2021-06-17

- Move to Event based Communication for MIDI and ATEM connections
- Ability to have actiosn run on `noteOn` and `noteOff` on the Midi Controller
  + This makes it possible so that you can actually run one action when pressing the button down and another when releasing.
- Added Macro Functionaity
  + You can create a list of actions (including delays inbetween) which then run upon one button press
- Added ability to send HTTP Requests upon Button Press (aka open URL)
  + This makes it possible so that you can actually fire events in Companion (eg. `http://127.0.0.1:8888/press/bank/1/24`)
  + One could also use this to send events to OBS Studio via the [obs-websocket](https://obsproject.com/forum/resources/obs-websocket-remote-control-obs-studio-from-websockets.466/) plugin
- Fixed an issue where AudioGainChange would actually reset to default upon hitting `0`
- Include full DVE styling in the default config so that it actually overwrites everything with the reset function
- Added `ResetDveAll` function to reset to the full default properties
- Removed the need for the `range` parameter on the `ChangeAudioGain` action
- Added ability to have the `ChangeUpstreamKeyerFillSource` update instantly
- Use `rate` parameter of the DVE in the FlyKey function of the `ChangeDvePosition`
- Added resending of he MIDI Button States every xx ms (currently 2000 ms)
  + This is necessary becuase the Layers on MIDI controlelrs don't update in the background when they are not active.
  + Sending an update every 2 seconds makes it so that when you switch to a new layer it never stays out of date for longer than 2 seconds.

## 2021-06-11

Initial Release
