# ControlThemAll

Control your [ATEM Mini](https://crsp.li/ATEMMiniLineup) (and more) with a Midi Controll Surface such as the [Behringer X-Touch Mini](https://crsp.li/xtouchmini) (and probably more in the future).

## Development Status

This is pretty much a prototype. I am trying to make as many things as possible configurable through the `config.user.yaml` file. But at this time it is pretty much tailored to how I use the X-Touch Mini and my ATEM Mini.

## Installation & Usage

### Requirements

Node.JS has to be installed. I am using [NVM](https://github.com/nvm-sh/nvm) to manage my node installation on macOS.

I am using [pnpm](https://pnpm.io/) as my package manager of choice and so you may have to install that as well

```bash
npm install -g pnpm
```

### Installation

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

You can also setup buttons which switch the DVE FillSource individually.

## Known Issues & Limitations

- the app constantly checks to see if the midi controller / atem mini are available
  + it is best to only run the application when you actually want to use it.
- not compatible with Supersource or multiple Mix Effects / Upstream Keyers (don't have a ATEM Mini Extreme to test with)

## Future Development ideas (and I am not making any promises)

- full configuration through config file
- full compatibility with the [ATEM Mini Lineup](https://crsp.li/ATEM) (at the moment I only have the ATEM Mini which limits my ability to test anythign else / if you'd like to [support the project](https://ChrisSpiegl.com/donate) so I may be able to upgrade to the ATEM Mini Extreme ISO, that'd be awesome)
- possibly add compatibility with other Midi Controllers (I only have the X-Touch  Mini so that's what I am developing for)
- adding a menubar application (possibly through electron) to see the connection status and reconnect if necessary (and so you don't have to have a terminal running while using this app)
- configuration through user interface
- adding the ability to control more programs (OBS Studio / Keyboard Shortcuts / OSC Compatible Applications / etc.)

## Helpful Libraries

**[ATEM-Connection](https://github.com/nrkno/tv-automation-atem-connection):** Incredible library to interface with the ATEM Mini lineup.

**[node-easymidi](https://github.com/dinchak/node-easymidi):** Makes listenign for Midi Events super easy… 🥁
