# ControlThemAll

Control your [ATEM Mini](https://crsp.li/ATEMMiniLineup) (and more) with a Midi Control Surface such as the [Behringer X-Touch Mini](https://crsp.li/xtouchmini) (and probably things like the [Stream Deck](https://crsp.li/StreamDeck) in the future).

This app is based on [Tauri](https://tauri.studio/). But for sake of being able to code front and backend in JavaScript, I am running a sidecar webserver which also handles all the other stuff like the midi controller and atem connection. I am aware that there are benefits to [Rust](https://www.rust-lang.org/) but speed of implementation is more important to me at this stage.

## Development Status

TODO: _THIS IS THE DEV BRANCH FOR THE TAURI VARIANT OF CONTROL THEM ALL_

The Tauri Variant is a way to wrap the ControlThemAll features into an actual macOS app. This, however, comes with the limitation that it may not work for you on all the systems. I am developing on Apple Silicone macOS and I currently don't have any intention to test on other systems as well. If you are up for that, please let me know in an issue and possibly provide a pull request.

This is pretty much a prototype. I am trying to make as many things as possible configurable through the `config.user.yaml` file. But at this time it is pretty much tailored to how I use the X-Touch Mini and my ATEM Mini.

## Installation & Usage

### Requirements

Node.JS has to be installed. I am using [NVM](https://github.com/nvm-sh/nvm) to manage my node installation on macOS.

I am using [pnpm](https://pnpm.io/) as my package manager of choice and so you may have to install that as well

```bash
npm install -g pnpm
```

### Installation

TODO: _OUT OF DATE INSTRUCTIONS FOR INSTALLAION_

1. Download this Repository ([ZIP](https://github.com/chrisspiegl/midi2atem/archive/refs/heads/main.zip))
2. Unzip and open Terminal into that folder
3. run `pnpm install`
4. start the app with `pnpm start`

### Usage

*A full walkthrough of the purpose and configuration file with explaination of most things is available on [YouTube at youtu.be/rnrHVzK5nG4](https://youtu.be/rnrHVzK5nG4).*

Look into the `config.default.yaml` file and see if you find what you are looking for. You can then overwrite your choices in the `config.user.yaml` file so that you always have the `config.default.yaml` which will be updated with my default values as development continues.

Basically the config file houses most of the mapping information between buttons/controllers and the actions which should happen when a button/controller is pressed or a controller twisted.

You also have options to set the default transition style, change the UpstreamKeyer DVE style (and create multiple styles which you can switch).

The most useful features at the moment (in my opinion) are the ability to change between cameras and also change the DVE for PiP at the same time.

## Known Issues & Limitations

- the app constantly checks to see if the midi controller / atem mini are available
  - it is best to only run the application when you actually want to use it.
- not compatible with Supersource or multiple Mix Effects / Upstream Keyers (don't have a ATEM Mini Extreme to test with)

## Future Development ideas (and I am not making any promises)

## Future Development ideas (and I am not making any promises)

- full configuration through config file
- full compatibility with the [ATEM Mini Lineup](https://crsp.li/ATEM) (at the moment I only have the ATEM Mini which limits my ability to test anythign else / if you'd like to [support the project](https://ChrisSpiegl.com/donate) so I may be able to upgrade to the ATEM Mini Extreme ISO, that'd be awesome)
- possibly add compatibility with other Midi Controllers (I only have the X-Touch  Mini so that's what I am developing for)
- adding a menubar application (possibly through electron) to see the connection status and reconnect if necessary (and so you don't have to have a terminal running while using this app)
- configuration through user interface
- adding the ability to control more programs (OBS Studio / Keyboard Shortcuts / OSC Compatible Applications / etc.)

## Helpful Libraries

**[ATEM-Connection](https://github.com/nrkno/tv-automation-atem-connection):** Incredible library to interface with the ATEM Mini lineup.

**[node-easymidi](https://github.com/dinchak/node-easymidi):** Makes listening for Midi Events super easy… 🥁

**[Tauri](https://tauri.studio/):** Alternative to Electron which builds much smaller app bundles.

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
