# MIDI 2 ATEM

Control your [ATEM Mini](https://crsp.li/ATEMMiniLineup) with a Midi Controll Surface such as the [Behringer X-Touch Mini](https://crsp.li/xtouchmini).

## Development Status

This is pretty much a prototype. I am trying to make as many things as possible configurable through the `config.user.js` file. But at this time it is pretty much tailored to how I use the X-Touch Mini and my ATEM Mini.

## Installation & Usage

### Requirements

Node.JS has to be installed. I am using [NVM](https://github.com/nvm-sh/nvm) to manage my node installation on macOS.

### Installation

1. Download thie Repository ([ZIP](https://github.com/chrisspiegl/midi2atem/archive/refs/heads/main.zip))
2. Unzip and open Terminal into that folder
3. run `npm install`
4. start the app with `npm start`

### Usage

Look into the `config.default.js` file and see if you find what you are looking for. You can then overwrite your choices in the `config.user.js` file so that you always have the `config.default.js` which will be updated with my default values as development continues.

Basically the config file houses most of the mapping information between buttons/controllers and the actions which should happen when a button/controller is pressed or a controller twisted.

You also have options to set the default transition style, change the UpstreamKeyer DVE style (and create multiple styles which you can switch).

The most useful features at the moment (in my opinion) are the ability to change between cameras and also change the DVE for PiP at the same time.

You can also setup buttons which switch the DVE FillSource individually.

## Known Issues & Limitations

- app crash when midi controller not found
  <details>
    <summary>Pans for Reconnection Logic</summary>
    + Make the Connection Reconnect
    + For both: ATEM and MIDI
    + Wait and Reconnect
    + every 5 seconds for one minute (aka 12 times)
    + then every 10 seconds for 2 minutes (aka 12 times)
    + then every 30 seconds for 6 minutes (aka 12 times)
    + stop reconnecting
    + at any moment you have the option to reconnect by clicking a button in the electron interface or restarting the app
    + Don't crash so easy!
    + Catch more errors!
  </details>
- not compatible with Supersource or multiple Mix Effects / Upstream Keyers (don't have a ATEM Mini Extreme to test with)
- audio mappings are currently pretty much hard coded and not configurable

## Future Development ideas (and I am not making any promises)

- full configuration through config file
- full compatibility with the [ATEM Mini Lineup](https://crsp.li/ATEMMiniLineup) (at the moment I only have the ATEM Mini which limits my ability to test anythign else / if you'd like to [support the project](https://ChrisSpiegl.com/donate) and get me a ATEM Mini Extreme ISO I'd greatly appreciate that)
- possibly add compatibility with other Midi Controllers (I only have the X-Touch  Mini so that's what i am developing for)
- adding a menubar application (possibly through electron) to see the connection status and reconnect if necessary (and so you don't have to have a terminal running while using this app)
- configuration through user interface
- adding the ability to control more programs (OBS Studio / Keyboard Shortcuts / OSC Compatible Applications / etc.)
