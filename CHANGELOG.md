# Changelog

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
