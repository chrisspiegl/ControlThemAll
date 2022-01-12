import { find, isEmpty, difference, flatten } from 'lodash-es'
import got from 'got'
import delay from 'delay'
import merge from 'deepmerge'
import { Enums } from 'atem-connection'

import beforeShutdown from './beforeShutdown.js'
import { ControllerWebServer } from './ControllerWebServer.js'
import { ControllerAtem } from './ControllerAtem.js'
import { ControllerMidi } from './ControllerMidi.js'
import { ControllerStreamDeck } from './ControllerStreamDeck.js'
import { ControllerConfig } from './ControllerConfig.js'
// Import {ControllerKeyboard} from './ControllerKeyboard.js';
// import {ControllerHotkeys} from './ControllerHotkeys.js';

import { asArray, map } from './utils.js'

const MIDI_RESEND_INTERVAL = 500 // Ms
const STREAM_DECK_RESEND_INTERVAL = 1000 // Ms

export class ControlThemAll {
  constructor() {
    console.log('Constructing ControlThemAll Backend')
    this._resendMidiTimer = undefined

    this.controllerMidi = undefined
    this.controllerStreamDeck = undefined
    this.controllerAtem = undefined
    this.controllerWebServer = undefined
    this.controllerConfig = undefined
    this.controllerKeyboard = undefined
    this.controllerHotkeys = undefined

    this.setup()
  }

  async setup() {
    console.log('Setting up ControlThemAll Backend')
    // // Do something when app is closing
    // process.on('exit', this.exitHandler.bind(this, { exit: true }))
    // // catches ctrl+c event
    // process.on('SIGINT', this.exitHandler.bind(this, {cleanup: true}));
    // // Catches "kill pid" (for example: nodemon restart)
    // process.on('SIGUSR1', this.exitHandler.bind(this, {exit: true}));
    // process.on('SIGUSR2', this.exitHandler.bind(this, {exit: true, cleanup: true}));
    // // Catches uncaught exceptions
    // process.on('uncaughtException', this.exitHandler.bind(this, {exit: true}));
    // process.on('uncaughtException', (reason) => console.log('UNHANDLED EXCEPTION:', reason))
    // process.on('unhandledRejection', reason => console.log('UNHANDLED REJECTION:', reason));

    beforeShutdown(this.exitHandler.bind(this, { cleanup: true, exit: true }))

    this.controllerConfig = new ControllerConfig()
    this.config = await this.controllerConfig.getConfig()

    this.midiConnect()
    this.streamDeckConnect()
    this.atemConnect()
    // This.hotKeysConnect();
  }

  /**
   * Atem Controller
   */
  async atemConnect() {
    this.controllerAtem = new ControllerAtem()

    this.controllerAtem.on('connected', this.atemOnConnected.bind(this))
    this.controllerAtem.on('disconnect', this.atemOnDisconnect.bind(this))
    this.controllerAtem.on('stateChanged', this.atemOnStateChanged.bind(this))
    this.controllerAtem.on('log', (message) => console.log(message))

    if (this.config.atem.enabled) {
      this.controllerAtem.connect({
        address: this.config.atem.address,
      })
    }
  }

  /**
   * Midi Controller
   */
  async midiConnect() {
    this.controllerMidi = new ControllerMidi({
      config: await this.controllerConfig.getConfig(),
    })

    this.controllerMidi.on('noteOn', this.midiOnNoteOn.bind(this))
    this.controllerMidi.on('noteOff', this.midiOnNoteOff.bind(this))
    this.controllerMidi.on('controllerChange', this.midiOnControllerChange.bind(this))
    this.controllerMidi.on('connect', this.midiOnConnect.bind(this))
    this.controllerMidi.on('disconnect', this.midiOnDisconnect.bind(this))
    // This.controllerMidi.on('log', (msg) => console.log(msg)) // TODO: reactivate?!

    if (this.config.midi.enabled) {
      this.controllerMidi.connect({
        inputDeviceName: this.config.midi.inputDeviceName || this.config.midi.deviceName,
        outputDeviceName: this.config.midi.outputDeviceName || this.config.midi.deviceName,
        outputChannel: this.config.midi.outputChannel,
      })
    }
  }

  /**
   * Web Server Controller
   */
  async webServerConnect() {
    this.controllerWebServer = new ControllerWebServer({
      port: this.config.webServer.port,
      address: this.config.webServer.address,
      hostname: this.config.webServer.hostname,
      protocol: this.config.webServer.protocol,
    })

    this.controllerWebServer.on('connect', () => console.log('webserver connect'))
    this.controllerWebServer.on('disconnect', () => console.log('webserver disconnect'))
    this.controllerWebServer.on('log', (message) => console.log(message))

    if (this.config.webServer.enabled) {
      this.controllerWebServer.connect()
    }
  }

  /**
   * Stream Deck Controller
   */
  async streamDeckConnect() {
    this.controllerStreamDeck = new ControllerStreamDeck({
      config: await this.controllerConfig.getConfig(),
    })

    this.controllerStreamDeck.on('buttonDown', this.streamDeckOnButtonDown.bind(this))
    this.controllerStreamDeck.on('buttonUp', this.streamDeckOnButtonUp.bind(this))
    this.controllerStreamDeck.on('connect', this.streamDeckOnConnect.bind(this))
    this.controllerStreamDeck.on('disconnect', this.streamDeckOnDisconnect.bind(this))
    this.controllerStreamDeck.on('log', (message) => console.log(message))

    if (this.config.streamDeck.enabled) {
      this.controllerStreamDeck.connect({
        model: this.config.streamDeck.model,
        serialNumber: this.config.streamDeck.serialNumber,
      })
    }
  }

  /**
   * Hot Keys Controller
   */
  async hotKeysConnect() {
    // This.controllerHotkeys = new ControllerHotkeys();
    // if (this.config.hotkeys.enabled) {
    // 	this.controllerHotkeys.connect({});
    // }
    // this.controllerKeyboard = new ControllerKeyboard();
  }

  streamDeckOnConnect(parameters) {
    console.log('onConnect:', parameters)
    if (parameters.isReconnect) {
      console.log('Reconnecting Stream Deck Controller')
    }

    // This.streamDeckStartTimers();
  }

  streamDeckOnDisconnect(parameters) {
    console.log('streamDeck onDisconnect:', parameters)
    this.streamDeckStopTimers()
  }

  streamDeckOnButtonDown(keyIndex) {
    console.log('BUTTON DOWN:', keyIndex)
    const buttonConfig = find(this.config.streamDeck.buttons, { button: keyIndex })
    console.log('buttonConfig:', buttonConfig)
    if (isEmpty(buttonConfig)) {
      return
    }

    const actionConfig = buttonConfig.down
    console.log('buttonConfig:', actionConfig)
    if (isEmpty(actionConfig)) {
      return
    }

    const buttonActionFunction = this.getButtonAction(actionConfig.action)
    if (buttonActionFunction) {
      buttonActionFunction(actionConfig, 0)
    }
  }

  streamDeckOnButtonUp(keyIndex) {
    console.log('BUTTON UP:', keyIndex)
    const buttonConfig = find(this.config.streamDeck.buttons, { button: keyIndex })
    console.log('buttonConfig:', buttonConfig)
    if (isEmpty(buttonConfig)) {
      return
    }

    const actionConfig = buttonConfig.up || buttonConfig
    if (isEmpty(actionConfig)) {
      return
    }

    const buttonActionFunction = this.getButtonAction(actionConfig.action)
    if (buttonActionFunction) {
      buttonActionFunction(actionConfig, 0)
    }
  }

  streamDeckStartTimers() {
    if (!this._resendStreamDeckTimer) {
      this._resendStreamDeckTimer = setInterval(() => {
        // Make sure that the buttons are updated in regular intervals.
        // Simply sending the update every 1000ms or so will update at most 1 second after changing to a different layer.
        this.controllerStreamDeck.updateButtonsViaState(this.config.streamDeck.buttons)
      }, STREAM_DECK_RESEND_INTERVAL)
    }
  }

  streamDeckStopTimers() {
    if (this._resendStreamDeckTimer) {
      clearInterval(this._resendStreamDeckTimer)
      this._resendStreamDeckTimer = undefined
      console.log('streamDeckStopTimers finished')
    }
  }

  midiOnConnect(parameters) {
    console.log('onConnect:', parameters)
    if (parameters.isReconnect) {
      console.log('Reconnecting MIDI Controller')
    }

    this.midiStartTimers()
  }

  midiOnDisconnect(parameters) {
    console.log('midi onDisconnect:', parameters)
    this.midiStopTimers()
  }

  midiOnNoteOn(message) {
    console.log('NOTE ON:', message)
    const { note, velocity: value } = message
    const buttonConfig = find(this.config.buttons, { note })
    console.log('buttonConfig:', buttonConfig)
    if (isEmpty(buttonConfig)) {
      return
    }

    const actionConfig = buttonConfig.noteOn
    console.log('buttonConfig:', actionConfig)
    if (isEmpty(actionConfig)) {
      return
    }

    const buttonActionFunction = this.getButtonAction(actionConfig.action)
    if (buttonActionFunction) {
      buttonActionFunction(actionConfig, value)
    }
  }

  midiOnNoteOff(message) {
    console.log('NOTE OFF:', message)
    const { note, velocity: value } = message
    const buttonConfig = find(this.config.buttons, { note })
    console.log('buttonConfig:', buttonConfig)
    if (isEmpty(buttonConfig)) {
      return
    }

    const actionConfig = buttonConfig.noteOff || buttonConfig
    if (isEmpty(actionConfig)) {
      return
    }

    const buttonActionFunction = this.getButtonAction(actionConfig.action)
    if (buttonActionFunction) {
      buttonActionFunction(actionConfig, value)
    }
  }

  midiOnControllerChange(message) {
    console.log('CONTROLLER CHANGE:', message)
    const { controller: note, value } = message
    const controllerConfig = find(this.config.controllers, { note })
    console.log('controllerConfig:', controllerConfig)
    const controlAction = this.getControllerAction(controllerConfig.action)
    if (controlAction) {
      controlAction(controllerConfig, value)
    }
  }

  midiStartTimers() {
    if (!this._resendMidiTimer) {
      this._resendMidiTimer = setInterval(() => {
        // Make sure that the buttons are updated in regular intervals.
        // This is necessary because layers on the Behringer X-Touch Mini do not update in the background when they are not active.
        // Simply sending the update every 1000ms or so will update at most 1 second after changing to a different layer.
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
        this.controllerMidi.updateControllersViaState(this.config.controllers)
      }, MIDI_RESEND_INTERVAL)
    }
  }

  midiStopTimers() {
    if (this._resendMidiTimer) {
      clearInterval(this._resendMidiTimer)
      this._resendMidiTimer = undefined
      console.log('midiStopTimers finished')
    }
  }

  atemOnConnected(parameters) {
    console.log('atem : connected', parameters)
    this.runStateUpdate(this.controllerAtem.getState(), 'initial')
  }

  atemOnDisconnect(parameters) {
    console.log('atem : disconnect', parameters)
  }

  atemOnStateChanged({ state, pathToChange }) {
    this.runStateUpdate(state, pathToChange)
  }

  getActionChain(name) {
    const actionChains = {
      camWithDve: (mainCamId, dveCamId = undefined) => {
        this.config.dve.fillSource = dveCamId || this.config.dve.fillSource
        if (this.controllerAtem.getUpstreamKeyerType() !== Enums.MixEffectKeyType.DVE) {
          this.controllerAtem.setUpstreamKeyerType({ flyEnabled: true, mixEffectKeyType: Enums.MixEffectKeyType.DVE })
        }

        this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)

        if (this.config.transition.type === 'cut' || this.config.transition.dipWhenProgramAndDveChange === false) {
          this.controllerAtem.changePreviewInput(mainCamId)
          if (this.controllerAtem.isUpstreamKeyerActive()) {
            this.controllerAtem.setTransitionStyle({ nextSelection: [Enums.TransitionSelection.Background], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
          } else {
            this.controllerAtem.setTransitionStyle({ nextSelection: [Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
          }

          this.controllerAtem.setUpstreamKeyerFillSource(this.config.dve.fillSource)
          if (this.config.transition.type === 'auto') {
            this.controllerAtem.autoTransition()
          } else {
            this.controllerAtem.cut()
          }
        } else if (this.controllerAtem.getUpstreamKeyerFillSource() !== this.config.dve.fillSource && this.controllerAtem.isUpstreamKeyerActive()) {
          this.controllerAtem.changePreviewInput(this.config.inputMapping.black)
          this.controllerAtem.setTransitionStyle({ nextSelection: [Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
          if (this.config.transition.type === 'auto') {
            this.controllerAtem.autoTransition()
          } else {
            this.controllerAtem.cut()
          }

          setTimeout(() => {
            this.controllerAtem.setUpstreamKeyerFillSource(this.config.dve.fillSource)
            this.controllerAtem.setTransitionStyle({ nextSelection: [Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
            this.controllerAtem.changePreviewInput(mainCamId)
            if (this.config.transition.type === 'auto') {
              this.controllerAtem.autoTransition()
            } else {
              this.controllerAtem.cut()
            }
          }, this.controllerAtem.getTransitionDuration() * this.config.msPerFrame)
        } else {
          this.controllerAtem.changePreviewInput(mainCamId)
          if (this.controllerAtem.isUpstreamKeyerActive()) {
            this.controllerAtem.setTransitionStyle({ nextSelection: [Enums.TransitionSelection.Background], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
            this.controllerAtem.autoTransition()
          } else {
            this.controllerAtem.setUpstreamKeyerFillSource(this.config.dve.fillSource)
            this.controllerAtem.setTransitionStyle({ nextSelection: [Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
            setTimeout(() => {
              this.controllerAtem.autoTransition()
            }, this.config.msPerFrame * 2)
          }
        }
      },

      camSolo: (camId) => {
        this.controllerAtem.changePreviewInput(camId)
        if (this.controllerAtem.isUpstreamKeyerActive()) {
          this.controllerAtem.setTransitionStyle({ nextSelection: [Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
        } else {
          this.controllerAtem.setTransitionStyle({ nextSelection: [Enums.TransitionSelection.Background], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
        }

        if (this.config.transition.type === 'auto') {
          this.controllerAtem.autoTransition()
        } else {
          this.controllerAtem.cut()
        }
      },

      camInDve: (camId, when = 'auto') => {
        // Console.log(`setting dveFillSource:`, camId)
        // console.log(`setting dveFillSource:`, this.config.dve.fillSource)
        // console.log(`current dveFillSource:`, this.controllerAtem.getUpstreamKeyerFillSource())
        // console.log(`when:`, when)
        if ((when === 'auto' && this.config.dve.fillSource === camId && camId === this.controllerAtem.getUpstreamKeyerFillSource()) || (this.config.dve.fillSource === camId && camId === this.controllerAtem.getProgramInput())) {
          this.getActionChain('switchProgramAndDveSource')()
        } else if (when === 'instant') {
          this.config.dve.fillSource = camId
          this.getActionChain('camWithDve')(this.controllerAtem.getProgramInput())
        } else if (['auto'].includes(when) && this.config.dve.fillSource === camId) {
          this.getActionChain('camWithDve')(this.controllerAtem.getProgramInput())
        } else {
          this.config.dve.fillSource = camId
        }

        this.updateDveButtons()
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
        this.controllerStreamDeck.updateButtonsViaState(this.config.streamDeck.buttons)
      },

      switchProgramAndDveSource: () => {
        const mainCamId = this.controllerAtem.getProgramInput()
        const dveCamId = this.config.dve.fillSource
        this.config.dve.fillSource = mainCamId
        this.getActionChain('camWithDve')(dveCamId)
      },

      changeAudioSourceGain: (options, value) => {
        // Expected value == between 0 and 127
        const { audioIndex, channels, defaultValue, range } = options
        if ((value !== 0 && !value) || value === -1) {
          value = defaultValue
        }

        const faderRange = { min: -10_000, max: 1000, ...range }
        const faderGain = Math.round(map(value, 0, 127, faderRange.min, faderRange.max) / 100) * 100

        for (const channel of asArray(channels)) {
          this.controllerAtem.setFairlightAudioMixerSourceProps(audioIndex, channel, { faderGain })
        }

        this.updateControllerState(this.getControllersByName(options.name), { value }, 'name')
        if (this.controllerMidi) {
          this.controllerMidi.updateControllersViaState(this.config.controllers)
        }
      },

      toggleAudioSourceMixOption: (options) => {
        const { audioIndex, channels, toggle } = options

        function fairlightAudioMixOptions(element) {
          element = `${element}`.toLowerCase()
          if (['audiofollowvideo', 'audiofollowsvideo', 'afv'].includes(element)) {
            element = Enums.FairlightAudioMixOption.AudioFollowVideo
          } else if (['active', 'on'].includes(element)) {
            element = Enums.FairlightAudioMixOption.On
          } else {
            element = Enums.FairlightAudioMixOption.Off
          }

          return element
        }

        // Const defaultValueBasedOnEnum = fairlightAudioMixOptions(defaultValue);
        const toggleBasedOnEnum = toggle.map((element) => fairlightAudioMixOptions(element))

        const fairlightInput = this.controllerAtem.getState().fairlight.inputs[audioIndex]
        if (!fairlightInput) {
          console.log(`Fairlight Input ${audioIndex} not found!`)
          return
        }

        for (const channel of asArray(channels)) {
          const audioChannel = fairlightInput.sources[channel]
          if (!audioChannel) {
            console.log(`Fairlight Input ${audioIndex} channel ${audioChannel} not found!`)
            return
          }

          const mixOptionCurrent = audioChannel.properties.mixOption
          const currentIndex = toggleBasedOnEnum.indexOf(mixOptionCurrent)
          const nextIndex = (currentIndex + 1) % toggleBasedOnEnum.length
          const mixOption = toggleBasedOnEnum[nextIndex]
          this.controllerAtem.setFairlightAudioMixerSourceProps(audioIndex, channel, { mixOption })
        }
      },
    }
    return actionChains[name]
  }

  getButtonAction(name) {
    const buttonActions = {
      RunMacro: async (options, value) => {
        // Console.log(`options:`, options)
        const { name } = options
        const macroConfig = find(this.config.macros, { name })
        const { actions } = macroConfig

        for (const actionConfig of actions) {
          if (isEmpty(actionConfig) || isEmpty(actionConfig.action)) {
            return
          }

          const buttonActionFunction = this.getButtonAction(actionConfig.action)
          // console.log(`before ${actionConfig.action}`)
          if (buttonActionFunction) {
            /* eslint-disable-next-line no-await-in-loop */
            await buttonActionFunction(actionConfig, value)
          }
          // console.log(`after ${actionConfig.action}`)
        }
      },

      Delay: (options) => delay(options.duration),

      KeyboardFire: (options) => this.controllerKeyboard.fire(options.combination),

      KeyboardPress: (options) => this.controllerKeyboard.pressKey(options.combination),

      KeyboardRelease: (options) => this.controllerKeyboard.releaseKey(options.combination),

      KeyboardType: (options) => this.controllerKeyboard.type(options.text),

      KeyboardTypeViaClipboard: (options) => this.controllerKeyboard.typeViaClipboard(options.text),

      KeyboardTypeViaKeyboard: (options) => this.controllerKeyboard.typeViaKeyboard(options.text),

      SendHttpRequest: async (options) => {
        console.log('options:', options)
        let { url, type, body, headers } = options
        if (!url) {
          console.log('url must be present')
          return
        }

        type = isEmpty(type) ? 'get' : type.toLowerCase()
        type = ['get', 'post', 'path', 'delete', 'put', 'head'].includes(type) ? type : 'get'
        body = type !== 'get' && !isEmpty(body) ? body : undefined
        headers = isEmpty(headers) ? { 'Content-Type': 'application/json' } : headers
        try {
          const response = await got[type](options.url, { body, headers })
          console.log('HTTP Request Response:', response.body)
        } catch (error) {
          console.log('HTTP Request Error:', error)
        }
      },

      ResetDveScale: (options) => {
        this.config.dve.stateCurrent = {
          ...this.config.dve.stateDefault,
          ...this.config.dve.stateCurrent,
          sizeX: this.config.dve.stateMain.sizeX,
          sizeY: this.config.dve.stateMain.sizeY,
        }
        this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        this.resetControllersToDefault(this.getControllersByAction('ChangeDveScale'))
        this.controllerMidi.updateControllersViaState(this.config.controllers)
        if (options.buttonsLightOn) {
          this.switchButtonLightOn(options.buttonsLightOn)
        }

        if (options.buttonsLightOff) {
          this.switchButtonLightOff(options.buttonsLightOff)
        }

        this.controllerMidi.updateButtonsViaState(this.config.buttons)
        this.controllerStreamDeck.updateButtonsViaState(this.config.streamDeck.buttons)
      },
      ResetDvePosition: (options) => {
        this.config.dve.stateCurrent = {
          ...this.config.dve.stateDefault,
          ...this.config.dve.stateCurrent,
          sizeX: this.config.dve.stateDefault.sizeX,
          sizeY: this.config.dve.stateDefault.sizeY,
          positionX: this.config.dve.stateDefault.positionX,
          positionY: this.config.dve.stateDefault.positionY,
          maskTop: this.config.dve.stateDefault.maskTop,
          maskBottom: this.config.dve.stateDefault.maskBottom,
          maskRight: this.config.dve.stateDefault.maskRight,
          maskLeft: this.config.dve.stateDefault.maskLeft,
        }
        this.config.dve.stateMain = { ...this.config.dve.stateCurrent }
        this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        this.resetControllersToDefault(this.getControllersByAction('ChangeDvePosition'))
        this.controllerMidi.updateControllersViaState(this.config.controllers)
        if (options.buttonsLightOn) {
          this.switchButtonLightOn(options.buttonsLightOn)
        }

        if (options.buttonsLightOff) {
          this.switchButtonLightOff(options.buttonsLightOff)
        }

        this.controllerMidi.updateButtonsViaState(this.config.buttons)
        this.controllerStreamDeck.updateButtonsViaState(this.config.streamDeck.buttons)
      },
      ResetDveMask: (options) => {
        this.config.dve.stateCurrent = {
          ...this.config.dve.stateDefault,
          ...this.config.dve.stateMain,
          sizeX: this.config.dve.stateMain.sizeX,
          sizeY: this.config.dve.stateMain.sizeY,
          positionX: this.config.dve.stateMain.positionX,
          positionY: this.config.dve.stateMain.positionY,
          maskTop: this.config.dve.stateMain.maskTop,
          maskBottom: this.config.dve.stateMain.maskBottom,
          maskRight: this.config.dve.stateMain.maskRight,
          maskLeft: this.config.dve.stateMain.maskLeft,
        }
        this.config.dve.stateMain = { ...this.config.dve.stateCurrent }
        this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        this.resetControllersToDefault(this.getControllersByAction('ChangeDveMask'))
        this.controllerMidi.updateControllersViaState(this.config.controllers)
        if (options.buttonsLightOn) {
          this.switchButtonLightOn(options.buttonsLightOn)
        }

        if (options.buttonsLightOff) {
          this.switchButtonLightOff(options.buttonsLightOff)
        }

        this.controllerMidi.updateButtonsViaState(this.config.buttons)
        this.controllerStreamDeck.updateButtonsViaState(this.config.streamDeck.buttons)
      },

      ResetDveAll: () => {
        this.config.dve.stateCurrent = {
          ...this.config.dve.stateDefault,
        }
        this.config.dve.stateMain = { ...this.config.dve.stateCurrent }
        this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        this.resetControllersToDefault(this.getControllersByAction('ChangeDveScale'))
        this.resetControllersToDefault(this.getControllersByAction('ChangeDvePosition'))
        this.resetControllersToDefault(this.getControllersByAction('ChangeDveMask'))
        this.controllerMidi.updateControllersViaState(this.config.controllers)
      },

      ResetAudioSourceGain: (options) => this.getActionChain('changeAudioSourceGain')(options),
      ToggleAudioSourceMixOption: (options, value) => this.getActionChain('toggleAudioSourceMixOption')(options, value),

      ChangeDveStyle: (options) => {
        this.config.dve.stateCurrent = {
          ...this.config.dve.stateDefault,
          ...this.config.dve.styles[options.style],
        }
        this.config.dve.stateMain = { ...this.config.dve.stateCurrent }
        this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        if (options.programInput || options.fillSource) {
          if (options.programInput && !options.fillSource) {
            this.getButtonAction('ChangeProgramSource')({ programInput: options.programInput })
          } else if (options.fillSource && !options.programInput) {
            this.getActionChain('camInDve')(this.config.inputMapping[options.fillSource], 'instant')
          } else if (this.controllerAtem.isUpstreamKeyerActive() && this.config.inputMapping[options.fillSource] === this.controllerAtem.getUpstreamKeyerFillSource() && this.config.inputMapping[options.programInput] === this.controllerAtem.getProgramInput()) {
            this.getActionChain('switchProgramAndDveSource')()
          } else {
            this.getActionChain('camWithDve')(this.config.inputMapping[options.programInput], this.config.inputMapping[options.fillSource])
          }
        }

        if (options.buttonsLightOn) {
          this.switchButtonLightOn(options.buttonsLightOn)
        }

        if (options.buttonsLightOff) {
          this.switchButtonLightOff(options.buttonsLightOff)
        }

        this.controllerMidi.updateButtonsViaState(this.config.buttons)
        this.controllerMidi.updateControllersViaState(this.config.controllers)
        this.controllerStreamDeck.updateButtonsViaState(this.config.streamDeck.buttons)
      },

      FadeToBlack: () => this.controllerAtem.fadeToBlack(),

      AutoCutSwitch: () => {
        this.config.transition.type = this.config.transition.type === 'cut' ? 'auto' : 'cut'
        if (this.config.transition.type === 'auto') {
          this.switchButtonLightOn(this.getButtonsByAction('AutoCutSwitch'))
        } else {
          this.switchButtonLightOff(this.getButtonsByAction('AutoCutSwitch'))
        }

        this.controllerMidi.updateButtonsViaState(this.config.buttons)
        this.controllerStreamDeck.updateButtonsViaState(this.config.streamDeck.buttons)
      },

      ChangeProgramSource: (options) => {
        if (options.withUpstreamKeyer) {
          this.getActionChain('camWithDve')(this.config.inputMapping[options.programInput])
        } else {
          this.getActionChain('camSolo')(this.config.inputMapping[options.programInput])
        }
      },

      ChangeUpstreamKeyerFillSource: (options) => {
        this.getActionChain('camInDve')(this.config.inputMapping[options.fillSource], options.when)
      },

      ChangeProgramAndDveFillSource: (options) => {
        this.getActionChain('camInDve')(this.config.inputMapping[options.fillSource])
        this.getActionChain('camWithDve')(this.config.inputMapping[options.programInput])
      },

      SwitchProgramAndUpstreamKeyerFillSource: () => {
        this.getActionChain('switchProgramAndDveSource')()
      },
    }
    return buttonActions[name]
  }

  getControllerAction(name) {
    const controllerActions = {
      ChangeDveScale: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
        this.config.dve.stateCurrent = {
          ...this.config.dve.stateDefault,
          ...this.config.dve.stateMain,
          sizeX: value * 10,
          sizeY: value * 10,
        }
        this.config.dve.stateMain = { ...this.config.dve.stateCurrent }
        this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        this.updateControllerState(this.getControllersByAction('ChangeDveScale'), { value })
        if (this.controllerMidi) {
          this.controllerMidi.updateControllersViaState(this.config.controllers)
        }

        if (options.buttonsLightOn) {
          this.switchButtonLightOn(options.buttonsLightOn)
        }

        if (options.buttonsLightOff) {
          this.switchButtonLightOff(options.buttonsLightOff)
        }

        if (this.controllerMidi) {
          this.controllerMidi.updateButtonsViaState(this.config.buttons)
        }

        if (this.controllerStreamDeck) {
          this.controllerStreamDeck.updateButtonsViaState(this.config.streamDeck.buttons)
        }
      },
      ChangeDvePosition: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
        const me = 0
        const usk = 0
        // Const pos = Math.floor(map(value, 0, 127, 0, Object.keys(positions).length))
        const pos = Math.floor(value % this.config.dve.positions.length)
        this.config.dve.stateCurrent = {
          ...this.config.dve.stateDefault,
          ...this.config.dve.stateCurrent,
          ...this.config.dve.positions[pos],
        }
        this.config.dve.stateMain = { ...this.config.dve.stateCurrent }
        this.controllerAtem.setUpstreamKeyerDVESettings({ rate: this.config.dve.stateMain.rate || 10 })
        this.controllerAtem.setUpstreamKeyerFlyKeyKeyframe(me, usk, Enums.FlyKeyKeyFrame.A, {
          ...this.config.dve.stateMain,
          keyFrameId: Enums.FlyKeyKeyFrame.A,
        })
        this.controllerAtem.runUpstreamKeyerFlyKeyTo(me, usk, Enums.FlyKeyKeyFrame.A)
        // This.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        this.updateControllerState(this.getControllersByAction('ChangeDvePosition'), { value })
        if (this.controllerMidi) {
          this.controllerMidi.updateControllersViaState(this.config.controllers)
        }

        if (options.buttonsLightOn) {
          this.switchButtonLightOn(options.buttonsLightOn)
        }

        if (options.buttonsLightOff) {
          this.switchButtonLightOff(options.buttonsLightOff)
        }

        if (this.controllerMidi) {
          this.controllerMidi.updateButtonsViaState(this.config.buttons)
        }

        if (this.controllerStreamDeck) {
          this.controllerStreamDeck.updateButtonsViaState(this.config.streamDeck.buttons)
        }
      },
      ChangeDveMask: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
        // Console.log(`value:`, value)
        let valueWithDirection = map(value, 0, 128, 0, 10_000)
        // Console.log(`valueWithDirection:`, valueWithDirection)
        valueWithDirection %= 5000
        // Console.log(`valueWithDirection:`, valueWithDirection)
        valueWithDirection = value < 64 ? valueWithDirection - (10_000 / 2) : valueWithDirection
        // Console.log(`valueWithDirection:`, valueWithDirection)
        this.config.dve.stateCurrent = {
          positionX: Math.round(this.config.dve.stateMain.positionX - (valueWithDirection / 2)),
          maskLeft: Math.round(9000 + valueWithDirection),
          maskRight: Math.round(9000 - valueWithDirection),
        }
        // Console.log(`dveStateLocal:`, this.config.dve.stateCurrent)
        // this.config.dve.stateMain = { ...this.config.dve.stateCurrent }
        this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        this.updateControllerState(this.getControllersByAction('ChangeDveMask'), { value })
        if (this.controllerMidi) {
          this.controllerMidi.updateControllersViaState(this.config.controllers)
        }

        if (options.buttonsLightOn) {
          this.switchButtonLightOn(options.buttonsLightOn)
        }

        if (options.buttonsLightOff) {
          this.switchButtonLightOff(options.buttonsLightOff)
        }

        if (this.controllerMidi) {
          this.controllerMidi.updateButtonsViaState(this.config.buttons)
        }

        if (this.controllerStreamDeck) {
          this.controllerStreamDeck.updateButtonsViaState(this.config.streamDeck.buttons)
        }
      },

      ChangeAudioSourceGain: (options, value) => this.getActionChain('changeAudioSourceGain')(options, value),
    }
    return controllerActions[name]
  }

  switchButtonLightOn(buttons) {
    buttons = asArray(buttons)
    // Console.log(`switchButtonLightOn:`, buttons)
    buttons = buttons.map((button) => ({ note: button }))
    this.updateButtonState(buttons, { state: 'noteon', value: 127 }, 'note')
  }

  switchButtonLightFlashing(buttons) {
    buttons = asArray(buttons)
    // Console.log(`switchButtonLightFlashing:`, buttons)
    buttons = buttons.map((button) => ({ note: button }))
    this.updateButtonState(buttons, { state: 'flashingon', value: 127 }, 'note')
  }

  switchButtonLightOff(buttons) {
    buttons = asArray(buttons)
    // Console.log(`switchButtonLightOff:`, buttons)
    buttons = buttons.map((button) => ({ note: button }))
    this.updateButtonState(buttons, { state: 'noteoff', value: 0 }, 'note')
  }

  switchStreamDeckOn(buttons) {
    buttons = asArray(buttons)
    // console.log('switchStreamDeckOn:', buttons)
    buttons = buttons.map((button) => ({ button }))
    this.updateStreamDeckState(buttons, { state: 'buttonon' }, 'button')
  }

  switchStreamDeckFlashing(buttons) {
    buttons = asArray(buttons)
    // console.log('switchStreamDeckFlashing:', buttons)
    buttons = buttons.map((button) => ({ button }))
    this.updateStreamDeckState(buttons, { state: 'flashingon' }, 'button')
  }

  switchStreamDeckOff(buttons) {
    buttons = asArray(buttons)
    // console.log('switchStreamDeckOff:', buttons)
    buttons = buttons.map((button) => ({ button }))
    this.updateStreamDeckState(buttons, { state: 'buttonoff' }, 'button')
  }

  updateStreamDeckState(buttonStates, overwrite = {}, via = 'action') {
    buttonStates = asArray(buttonStates)
    buttonStates = buttonStates.map((buttonState) => ({ state: 'buttonoff', ...buttonState, ...overwrite }))
    this.config.streamDeck.buttons = this.config.streamDeck.buttons.map((button) => {
      const updatedButtonState = find(buttonStates, (element) => element[via] === button[via])
      if (updatedButtonState) {
        button.value = updatedButtonState.value
        button.state = updatedButtonState.state
      }

      return button
    })
  }

  getButtonsByAction(action) {
    return this.config.buttons.filter((element) => element.action === action || element.noteOn?.action === action || element.noteOff?.action === action).map((element) => element.note)
    // Return map(filter(this.config.buttons, (el) => el.action === action || el.noteOn?.action === action || el.noteOff?.action === action), (el) => el.note)
  }

  getButtonsByNoteOffAction(action) {
    this.config.buttons.filter((element) => element.noteOff?.action === action).map((element) => element.note)
    // Return map(filter(this.config.buttons, (el) => el.noteOff?.action === action), (el) => el.note)
  }

  getButtonsByNoteOnAction(action) {
    return this.config.buttons.filter((element) => element.noteOn?.action === action).map((element) => element.note)
    // Return map(filter(this.config.buttons, (el) => el.noteOn?.action === action), (el) => el.note)
  }

  getControllersByAction(action) {
    return this.config.controllers.filter((element) => element.action === action)
    // Return filter(this.config.controllers, (el) => el.action === action)
  }

  getControllersByName(name) {
    return this.config.controllers.filter((element) => element.name === name)
    // Return filter(this.config.controllers, (el) => el.name === name)
  }

  updateButtonState(buttonStates, overwrite = {}, via = 'action') {
    buttonStates = asArray(buttonStates)
    buttonStates = buttonStates.map((buttonState) => ({ state: 'noteoff', value: buttonState.defaultValue || 0, ...buttonState, ...overwrite }))
    this.config.buttons = this.config.buttons.map((button) => {
      const updatedButtonState = find(buttonStates, (element) => element[via] === button[via])
      if (updatedButtonState) {
        button.value = updatedButtonState.value
        button.state = updatedButtonState.state
      }

      return button
    })
  }

  updateDveButtons() {
    const nameOfInput = Object.keys(this.config.inputMapping).find((key) => this.config.inputMapping[key] === this.config.dve.fillSource)

    const buttonsForDveSelection = this.config.feedback.buttonsForActiveUpstreamKeyerFillSource
    const buttonActiveDveFillSource = buttonsForDveSelection[nameOfInput]

    const streamDecksForDveSelection = this.config.streamDeck.feedback.activeUpstreamKeyerFillSource
    const streamDeckActiveDveFillSource = streamDecksForDveSelection[nameOfInput]

    this.switchButtonLightOff(difference(flatten(Object.values(buttonsForDveSelection)), buttonActiveDveFillSource))
    this.switchButtonLightOn(buttonActiveDveFillSource)

    this.switchStreamDeckOff(difference(flatten(Object.values(streamDecksForDveSelection)), streamDeckActiveDveFillSource))
    this.switchStreamDeckOn(streamDeckActiveDveFillSource)
  }

  updateControllerState(controllerStates, overwrite = {}, via = 'action') {
    controllerStates = asArray(controllerStates)
    controllerStates = controllerStates.map((controllerState) => ({ state: 'cc', value: controllerState.defaultValue || 0, ...controllerState, ...overwrite }))
    this.config.controllers = this.config.controllers.map((controller) => {
      const updatedControllerState = find(controllerStates, (element) => element[via] === controller[via])
      if (updatedControllerState) {
        controller.value = updatedControllerState.value
      }

      return controller
    })
  }

  resetControllersToDefault(controllerStates) {
    // Console.log(`resetControllersToDefault:`, controllerStates)
    controllerStates = asArray(controllerStates)
    const { controllers } = this.config
    controllerStates = controllerStates.map((controllerState) => merge(controllerState, { state: 'cc', value: controllerState.defaultValue || 0 }))
    controllers.map((controller) => {
      const updatedControllerState = find(controllerStates, (element) => element.action === controller.action)
      if (updatedControllerState) {
        controller.value = updatedControllerState.value
      }

      return controller
    })
  }

  feedbackFairlightAudioMixOptions(audioIndex, audioChannel) {
    const forFairlightInputAudioMixOption = this.config.feedback.forFairlightInputAudioMixOption
    const feedbackForAudioIndex = forFairlightInputAudioMixOption[audioIndex]
    if (feedbackForAudioIndex) {
      const feedbackForAudioChannel = feedbackForAudioIndex[audioChannel]
      if (feedbackForAudioChannel) {
        const mixOptionCurrent = this.controllerAtem.getState().fairlight.inputs[audioIndex].sources[audioChannel].properties.mixOption
        const mixOptionCurrentName = Enums.FairlightAudioMixOption[mixOptionCurrent]
        const noteStates = feedbackForAudioChannel[mixOptionCurrentName]
        if (noteStates.noteOn) {
          this.switchButtonLightOn(noteStates.noteOn)
        }

        if (noteStates.noteOff) {
          this.switchButtonLightOff(noteStates.noteOff)
        }
      } else {
        console.log(`No feedback configured for audio index ${audioIndex} and channel ${audioChannel}.`)
      }
    } else {
      console.log(`No feedback configured for audio index ${audioIndex}.`)
    }
  }

  runStateUpdate(state, pathToChange = null) {
    const me = 0
    const usk = 0
    pathToChange = asArray(pathToChange)
    if (pathToChange.length !== 1 || !pathToChange.includes('info.lastTime')) {
      console.log('pathToChange:', pathToChange)
    }

    const isInitial = pathToChange.length === 1 && pathToChange[0] === 'initial'

    for (const path of pathToChange) {
      if (isInitial) {
        // Find all ChangeAudioSourceGain controllers and set them to their default
        for (const controller of this.config.controllers) {
          if (controller.defaultValue) {
            const controlAction = this.getControllerAction(controller.action)
            if (controlAction) {
              controlAction(controller)
            }
          }
        }

        // Transition Type is not transmitted from ATEM State so it is just a state on the midi controller itself
        if (this.config.transition.type === 'auto') {
          this.switchButtonLightOn(this.getButtonsByAction('AutoCutSwitch'))
        } else {
          this.switchButtonLightOff(this.getButtonsByAction('AutoCutSwitch'))
        }

        // Initial Audio Channel Mix Option Feedback (On, Off, AudioFollowVideo)
        for (const audioIndex in this.config.feedback.forFairlightInputAudioMixOption) {
          if (!Object.prototype.hasOwnProperty.call(this.config.feedback.forFairlightInputAudioMixOption, audioIndex)) {
            continue
          }

          for (const audioChannel in this.config.feedback.forFairlightInputAudioMixOption[audioIndex]) {
            if (!Object.prototype.hasOwnProperty.call(this.config.feedback.forFairlightInputAudioMixOption[audioIndex], audioChannel)) {
              continue
            }

            this.feedbackFairlightAudioMixOptions(audioIndex, audioChannel)
          }
        }
      }

      // Updating Audio Mix Option Feedback
      // On / Off / AudioFollowVideo
      if (isInitial || path.includes('fairlight.inputs')) {
        try {
          const [, audioIndex, audioChannel] = /fairlight\.inputs\.(\d*)\.sources\.(-\d*)\.properties/g.exec(path)
          this.feedbackFairlightAudioMixOptions(audioIndex, audioChannel)
        } catch {
          console.log('could not handle fairlight/initial inputs')
        }
      }

      // Updating Active Camera in Program & DVE Feedback
      if (isInitial || path.includes('video.mixEffects')) {
        const programInput = state.video.mixEffects[me].programInput
        const hasDve = state.video.mixEffects[me].upstreamKeyers[usk].onAir

        const buttonsForProgramInputWithoutDve = this.config.feedback.buttonsForProgramInputWithoutDve
        const buttonsForProgramInputWithDve = this.config.feedback.buttonsForProgramInputWithDve

        const streamDeckForProgramInputWithoutDve = this.config.streamDeck.feedback.programInputWithoutDve
        const streamDeckForProgramInputWithDve = this.config.streamDeck.feedback.programInputWithDve

        const nameOfInput = Object.keys(this.config.inputMapping).find((key) => this.config.inputMapping[key] === programInput)

        const buttonsForProgramInput = hasDve ? buttonsForProgramInputWithDve[nameOfInput] : buttonsForProgramInputWithoutDve[nameOfInput]
        const buttonsForProgramInputAll = [...flatten(Object.values(buttonsForProgramInputWithoutDve)), ...flatten(Object.values(buttonsForProgramInputWithDve))]

        const streamDeckForProgramInput = hasDve ? streamDeckForProgramInputWithDve[nameOfInput] : streamDeckForProgramInputWithoutDve[nameOfInput]
        const streamDeckForProgramInputAll = [...flatten(Object.values(streamDeckForProgramInputWithoutDve)), ...flatten(Object.values(streamDeckForProgramInputWithDve))]

        this.switchButtonLightOff(difference(buttonsForProgramInputAll, buttonsForProgramInput))
        this.switchButtonLightOn(buttonsForProgramInput)

        this.switchStreamDeckOff(difference(streamDeckForProgramInputAll, streamDeckForProgramInput))
        this.switchStreamDeckOn(streamDeckForProgramInput)

        this.updateDveButtons()

        if (state.video.mixEffects[me].fadeToBlack.isFullyBlack) {
          this.switchButtonLightFlashing(this.getButtonsByAction('FadeToBlack'))
        } else {
          this.switchButtonLightOff(this.getButtonsByAction('FadeToBlack'))
        }
      }
    }

    if (this.controllerMidi) {
      this.controllerMidi.updateControllersViaState(this.config.controllers)
      this.controllerMidi.updateButtonsViaState(this.config.buttons)
    }

    if (this.controllerStreamDeck) {
      this.controllerStreamDeck.updateButtonsViaState(this.config.streamDeck.buttons, isInitial)
    }
  }

  async exitHandler(options, exitCode) {
    console.log(`exitHandler with exitCode: ${exitCode || 'NONE'}`)

    // SetTimeout(error => {
    // 	// Force close server after timeout (this is if the cleanUp takes too long)
    // 	console.log('gentle took too long exiting hard');
    // 	process.exit(1);
    // }, 10 * 1000); // 10 seconds

    if (options.cleanup) {
      console.log('ControlThemAll: Doing the cleanup.')

      if (this.controllerMidi && this.controllerMidi.isConnected()) {
        this.switchButtonLightOff(flatten(this.config.buttons.map((element) => [element.note])))
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
        this.updateControllerState(this.config.controllers.map((element) => merge(element, { state: 'cc', value: 0 })))
        this.controllerMidi.updateControllersViaState(this.config.controllers)
      }

      if (this.controllerWebServer) {
        console.log('before web server disconnect')
        console.log(await this.controllerWebServer.disconnect())
        console.log('after web server disconnect')
      }

      if (this.controllerMidi) {
        console.log('before midi disconnect')
        console.log(await this.controllerMidi.disconnect())
        console.log('after midi disconnect')
      }

      if (this.controllerStreamDeck) {
        console.log('before stream deck disconnect')
        console.log(await this.controllerStreamDeck.disconnect())
        console.log('after stream deck disconnect')
      }

      if (this.controllerAtem) {
        console.log('before atem disconnect')
        console.log(await this.controllerAtem.disconnect())
        console.log('after atem disconnect')
      }
      // Await this.controllerHotkeys.disconnect()

      console.log('ControlThemAll closed, cleaned, and shutting down!')
    }

    // if (options.exit) {
    //   console.log('ControlThemAll closed all connections successfully… shuting down…')
    //   process.exit()
    // }
  }
}

export default ControlThemAll
