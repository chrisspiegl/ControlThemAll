import _ from 'lodash'
import got from 'got'
import merge from 'deepmerge'
import { Enums } from 'atem-connection'
import { EventEmitter } from 'inf-ee'

import { ControllerWebServer } from './ControllerWebServer.js'
import { ControllerAtem } from './ControllerAtem.js'
import { ControllerMidi } from './ControllerMidi.js'
import { ControllerConfig } from './ControllerConfig.js'
import { ControllerKeyboard } from './ControllerKeyboard.js'
// import { ControllerHotkeys } from './ControllerHotkeys.js'

import { asArray, map, getEnumByValue } from './utils.js'

const MIDI_RESEND_INTERVAL = 1000 // ms

export class ControlThemAll {
  constructor() {
    console.log(`Constructing ControlThemAll Backend`)
    this._resendMidiTimer = undefined

    this.controllerMidi = undefined
    this.controllerAtem = undefined
    this.controllerWebServer = undefined
    this.controllerConfig = undefined
    this.controllerKeyboard = undefined
    this.controllerHotkeys = undefined

    this.setup()
  }

  async setup() {
    console.log(`Setting up ControlThemAll Backend`)
    // do something when app is closing
    // process.on('exit', this.exitHandler.bind(this, { exit: true }))
    // catches ctrl+c event
    process.on('SIGINT', this.exitHandler.bind(this, { cleanup: true }))
    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', this.exitHandler.bind(this, { exit: true }))
    process.on('SIGUSR2', this.exitHandler.bind(this, { exit: true, cleanup: true }))
    // catches uncaught exceptions
    process.on('uncaughtException', this.exitHandler.bind(this, { exit: true }))
    process.on('unhandledRejection', async (reason) => console.log(`UNHANDLED:`, reason))


    this.controllerConfig = new ControllerConfig()
    this.config = await this.controllerConfig.getConfig()

    this.controllerWebServer = new ControllerWebServer({
      port: this.config.webServer.port,
      address: this.config.webServer.address,
      hostname: this.config.webServer.hostname,
      protocol: this.config.webServer.protocol,
    })

    this.controllerWebServer.on('connect', () => console.log(`webserver connect`))
    this.controllerWebServer.on('disconnect', () => console.log(`webserver disconnect`))
    this.controllerWebServer.on('log', (msg) => console.log(msg))

    if (this.config.webServer.enabled) {
      this.controllerWebServer.connect()
    }

    this.controllerMidi = new ControllerMidi({
      config: await this.controllerConfig.getConfig()
    })

    this.controllerMidi.on('noteOn', this.midiOnNoteOn.bind(this))
    this.controllerMidi.on('noteOff', this.midiOnNoteOff.bind(this))
    this.controllerMidi.on('controllerChange', this.midiOnControllerChange.bind(this))
    this.controllerMidi.on('connect', this.midiOnConnect.bind(this))
    this.controllerMidi.on('disconnect', this.midiOnDisconnect.bind(this))
    this.controllerMidi.on('log', (msg) => console.log(msg))

    if (this.config.midi.enabled) {
      this.controllerMidi.connect({
        inputDeviceName: this.config.midi.inputDeviceName || this.config.midi.deviceName,
        outputDeviceName: this.config.midi.outputDeviceName || this.config.midi.deviceName,
        outputChannel: this.config.midi.outputChannel,
      })
    }

    this.controllerAtem = new ControllerAtem()

    this.controllerAtem.on('connected', this.atemOnConnected.bind(this))
    this.controllerAtem.on('disconnect', this.atemOnDisconnect.bind(this))
    this.controllerAtem.on('stateChanged', this.atemOnStateChanged.bind(this))
    this.controllerAtem.on('log', (msg) => console.log(msg))

    if (this.config.atem.enabled) {
      this.controllerAtem.connect({
        address: this.config.atem.address,
      })
    }

    // this.controllerHotkeys = new ControllerHotkeys()
    // if (this.config.hotkeys.enabled) {
    //   this.controllerHotkeys.connect({})
    // }

    this.controllerKeyboard = new ControllerKeyboard()
  }

  midiOnConnect(params) {
    console.log(`onConnect:`, params)
    if (params.isReconnect) {
      console.log(`Reconnecting MIDI Controller`)
    }
    this.midiStartTimers()
  }

  midiOnDisconnect(params) {
    console.log(`onDisconnect:`, params)
    this.midiStopTimers()
  }

  midiOnNoteOn(msg) {
    console.log(`NOTE ON:`, msg)
    const { note, velocity: value, channel } = msg
    const buttonConfig = _.find(this.config.buttons, { note })
    console.log(`buttonConfig:`, buttonConfig)
    if (_.isEmpty(buttonConfig)) return
    const actionConfig = buttonConfig.noteOn
    console.log(`buttonConfig:`, actionConfig)
    if (_.isEmpty(actionConfig)) return
    const buttonActionFunction = this.getButtonAction(actionConfig.action)
    if (buttonActionFunction) buttonActionFunction(actionConfig, value)
  }

  midiOnNoteOff(msg) {
    console.log(`NOTE OFF:`, msg)
    const { note, velocity: value, channel } = msg
    const buttonConfig = _.find(this.config.buttons, { note })
    console.log(`buttonConfig:`, buttonConfig)
    if (_.isEmpty(buttonConfig)) return
    const actionConfig = buttonConfig.noteOff || buttonConfig
    if (_.isEmpty(actionConfig)) return
    const buttonActionFunction = this.getButtonAction(actionConfig.action)
    if (buttonActionFunction) buttonActionFunction(actionConfig, value)
  }

  midiOnControllerChange(msg) {
    console.log(`CONTROLLER CHANGE:`, msg)
    const { controller: note, value, channel } = msg
    const controllerConfig = _.find(this.config.controllers, { note })
    console.log(`controllerConfig:`, controllerConfig)
    const controlAction = this.getControllerAction(controllerConfig.action)
    if (controlAction) controlAction(controllerConfig, value)
  }

  midiStartTimers() {
    if (!this._resendMidiTimer) {
      this._resendMidiTimer = setInterval(() => {
        // Make sure that the buttons are updated in regular intervals.
        // This is necessary becuase layers on the Behringer X-Touch Mini do not update in the background when they are not active.
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
    }
  }

  atemOnConnected(params) {
    console.log(`atem : connected`, params)
    this.runStateUpate(this.controllerAtem.getState(), 'initial')
  }

  atemOnDisconnect(params) {
    console.log(`atem : disconnect`, params)
  }

  atemOnStateChanged({ state, pathToChange }) {
    this.runStateUpate(state, pathToChange)
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
            this.controllerAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Background ], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
          } else {
            this.controllerAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
          }
          this.controllerAtem.setUpstreamKeyerFillSource(this.config.dve.fillSource)
          if (this.config.transition.type === 'auto') { this.controllerAtem.autoTransition() } else { this.controllerAtem.cut() }
        } else if (this.controllerAtem.getUpstreamKeyerFillSource() !== this.config.dve.fillSource && this.controllerAtem.isUpstreamKeyerActive()) {
          this.controllerAtem.changePreviewInput(this.config.inputMapping.black)
          this.controllerAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
          if (this.config.transition.type === 'auto') { this.controllerAtem.autoTransition() } else { this.controllerAtem.cut() }
          setTimeout(() => {
            this.controllerAtem.setUpstreamKeyerFillSource(this.config.dve.fillSource)
            this.controllerAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
            this.controllerAtem.changePreviewInput(mainCamId)
            if (this.config.transition.type === 'auto') { this.controllerAtem.autoTransition() } else { this.controllerAtem.cut() }
          }, this.controllerAtem.getTransitionDuration() * this.config.msPerFrame)
        } else {
          this.controllerAtem.changePreviewInput(mainCamId)
          if (this.controllerAtem.isUpstreamKeyerActive()) {
            this.controllerAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Background ], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
            this.controllerAtem.autoTransition()
          } else {
            this.controllerAtem.setUpstreamKeyerFillSource(this.config.dve.fillSource)
            this.controllerAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
            setTimeout(() => {
              this.controllerAtem.autoTransition()
            }, this.config.msPerFrame * 2)
          }
        }
      },

      camSolo: (camId) => {
        this.controllerAtem.changePreviewInput(camId)
        if (this.controllerAtem.isUpstreamKeyerActive()) {
          this.controllerAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
        } else {
          this.controllerAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Background ], nextStyle: Enums.TransitionStyle[this.config.transition.style] })
        }
        if (this.config.transition.type === 'auto') { this.controllerAtem.autoTransition() } else { this.controllerAtem.cut() }
      },

      camInDve: (camId, when = 'auto') => {
        // console.log(`setting dveFillSource:`, camId)
        // console.log(`setting dveFillSource:`, this.config.dve.fillSource)
        // console.log(`current dveFillSource:`, this.controllerAtem.getUpstreamKeyerFillSource())
        // console.log(`when:`, when)
        if (when === 'auto' && this.config.dve.fillSource === camId && camId === this.controllerAtem.getUpstreamKeyerFillSource() || this.config.dve.fillSource === camId && camId === this.controllerAtem.getProgramInput()) {
          this.getActionChain('switchProgramAndDveSource')()
        } else if (when === 'instant') {
          this.config.dve.fillSource = camId
          this.getActionChain('camWithDve')(this.controllerAtem.getProgramInput())
        } else if ((['auto'].includes(when)) && this.config.dve.fillSource === camId) {
          this.getActionChain('camWithDve')(this.controllerAtem.getProgramInput())
        } else {
          this.config.dve.fillSource = camId
        }
        this.updateDveButtons()
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
      },

      switchProgramAndDveSource: () => {
        const mainCamId = this.controllerAtem.getProgramInput()
        const dveCamId = this.config.dve.fillSource
        this.config.dve.fillSource = mainCamId
        this.getActionChain('camWithDve')(dveCamId)
      },

      changeAudioSourceGain: (options, value) => { // expected value == between 0 and 127
        const { note, audioIndex, channels, defaultValue, range } = options
        if (value !== 0 && !value || value === -1) value = defaultValue

        const faderRange = { min: -10000, max: 1000, ...range }
        const faderGain = Math.round(map(value, 0, 127, faderRange.min, faderRange.max) / 100) * 100

        for (const channel of asArray(channels)) {
          this.controllerAtem.setFairlightAudioMixerSourceProps(audioIndex, channel, { faderGain })
        }
        this.updatecontrollerState(this.getControllersByName(options.name), { value }, 'name')
        this.controllerMidi.updateControllersViaState(this.config.controllers)
      },

      toggleAudioSourceMixOption: (options, value) => {
        const { note, audioIndex, channels, defaultValue, toggle, range } = options

        function FairlightAudioMixOptions(el) {
          el = `${el}`.toLowerCase()
          if (['audiofollowvideo', 'audiofollowsvideo', 'afv'].includes(el)) el = Enums.FairlightAudioMixOption.AudioFollowVideo
          else if(['active', 'on'].includes(el)) el = Enums.FairlightAudioMixOption.On
          else el = Enums.FairlightAudioMixOption.Off
          return el
        }

        const defaultValueBasedOnEnum = FairlightAudioMixOptions(defaultValue)
        const toggleBasedOnEnum = toggle.map((el) => FairlightAudioMixOptions(el))

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
          const currentIndex = toggleBasedOnEnum.indexOf(mixOptionCurrent);
          const nextIndex = (currentIndex + 1) % toggleBasedOnEnum.length;
          const mixOption = toggleBasedOnEnum[nextIndex]
          this.controllerAtem.setFairlightAudioMixerSourceProps(audioIndex, channel, { mixOption })
        }
      }
    }
    return actionChains[name]
  }

  getButtonAction(name) {
    const buttonActions = {
      RunMacro: async (options, value) => {
        // console.log(`options:`, options)
        const { name } = options
        const macroConfig = _.find(this.config.macros, { name })
        const { actions } = macroConfig
        for (const actionConfig of actions) {
          if (_.isEmpty(actionConfig) || _.isEmpty(actionConfig.action)) return
          const buttonActionFunction = this.getButtonAction(actionConfig.action)
          // console.log(`before ${actionConfig.action}`)
          if (buttonActionFunction) await buttonActionFunction(actionConfig, value)
          // console.log(`after ${actionConfig.action}`)
        }
      },

      Delay: (options, value) => {
        return new Promise(resolve => setTimeout(resolve, options.duration))
      },

      KeyboardFire: async (options, value) => {
        return await this.controllerKeyboard.fire(options.combination)
      },

      KeyboardPress: async (options, value) => {
        return await this.controllerKeyboard.pressKey(options.combination)
      },

      KeyboardRelease: async (options, value) => {
        return await this.controllerKeyboard.releaseKey(options.combination)
      },

      KeyboardType: async (options, value) => {
        return await this.controllerKeyboard.type(options.text)
      },

      KeyboardTypeViaClipboard: async (options, value) => {
        return await this.controllerKeyboard.typeViaClipboard(options.text)
      },

      KeyboardTypeViaKeyboard: async (options, value) => {
        return await this.controllerKeyboard.typeViaKeyboard(options.text)
      },

      SendHttpRequest: async (options, value) => {
        console.log(`options:`, options)
        let { url, type, body, headers } = options
        if (!url) {
          console.log('url must be present')
          return
        }
        type = (!_.isEmpty(type)) ? type.toLowerCase() : 'get'
        type = ['get', 'post', 'path', 'delete', 'put', 'head'].includes(type) ? type : 'get'
        body = (type !== 'get' && !_.isEmpty(body)) ? body : undefined
        headers = (!_.isEmpty(headers)) ? headers : { 'Content-Type': 'application/json' }
        try {
          const response = await got[type](options.url, { body, headers })
          console.log('HTTP Request Response: ', response.body)
        } catch (error) {
          console.log(`HTTP Request Error:`, error)
        }
      },

      ResetDveScale: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
        this.config.dve.stateCurrent = {
          ...this.config.dve.stateDefault,
          ...this.config.dve.stateCurrent,
          sizeX: this.config.dve.stateMain.sizeX,
          sizeY: this.config.dve.stateMain.sizeY,
        }
        this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        this.resetControllersToDefault(this.getControllersByAction('ChangeDveScale'))
        this.controllerMidi.updateControllersViaState(this.config.controllers)
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
      },
      ResetDvePosition: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
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
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
      },
      ResetDveMask: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
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
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
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

      ResetAudioSourceGain: (options, value) => this.getActionChain('changeAudioSourceGain')(options),
      ToggleAudioSourceMixOption: (options, value) => this.getActionChain('toggleAudioSourceMixOption')(options, value),

      ChangeDveStyle: (options, value) => {
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
          } else {
            if (this.controllerAtem.isUpstreamKeyerActive() && this.config.inputMapping[options.fillSource] === this.controllerAtem.getUpstreamKeyerFillSource() && this.config.inputMapping[options.programInput] === this.controllerAtem.getProgramInput()) {
              this.getActionChain('switchProgramAndDveSource')()
            } else {
              this.getActionChain('camWithDve')(this.config.inputMapping[options.programInput], this.config.inputMapping[options.fillSource])
            }
          }
        }
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
        this.controllerMidi.updateControllersViaState(this.config.controllers)
      },

      FadeToBlack: (options, value) => this.controllerAtem.fadeToBlack(),

      AutoCutSwitch: (options, value) => {
        this.config.transition.type = this.config.transition.type === 'cut' ? 'auto' : 'cut'
        if (this.config.transition.type === 'auto') this.switchButtonLightOn(this.getButtonsByAction('AutoCutSwitch'))
        else this.switchButtonLightOff(this.getButtonsByAction('AutoCutSwitch'))
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
      },

      ChangeProgramSource: (options, value) => {
        if (options.withUpstreamKeyer) {
          this.getActionChain('camWithDve')(this.config.inputMapping[options.programInput])
        } else {
          this.getActionChain('camSolo')(this.config.inputMapping[options.programInput])
        }
      },

      ChangeUpstreamKeyerFillSource: (options, value) => {
        this.getActionChain('camInDve')(this.config.inputMapping[options.fillSource], options.when)
      },

      ChangeProgramAndDveFillSource: (options, value) => {
        this.getActionChain('camInDve')(this.config.inputMapping[options.fillSource])
        this.getActionChain('camWithDve')(this.config.inputMapping[options.programInput])
      },

      SwitchProgramAndUpstreamKeyerFillSource: (options, value) => {
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
        this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        this.updatecontrollerState(this.getControllersByAction('ChangeDveScale'), { value })
        this.controllerMidi.updateControllersViaState(this.config.controllers)
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
      },
      ChangeDvePosition: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
        const me = 0
        const usk = 0
        // const pos = Math.floor(map(value, 0, 127, 0, Object.keys(positions).length))
        const pos = Math.floor(value % this.config.dve.positions.length)
        this.config.dve.stateCurrent = {
          ...this.config.dve.stateDefault,
          ...this.config.dve.stateCurrent,
          ...this.config.dve.positions[pos]
        }
        this.config.dve.stateMain = { ...this.config.dve.stateCurrent }
        this.controllerAtem.setUpstreamKeyerDVESettings({ rate: this.config.dve.stateMain.rate || 10 })
        this.controllerAtem.setUpstreamKeyerFlyKeyKeyframe(me, usk, Enums.FlyKeyKeyFrame.A, {
          ...this.config.dve.stateMain,
          keyFrameId: Enums.FlyKeyKeyFrame.A,
        })
        this.controllerAtem.runUpstreamKeyerFlyKeyTo(me, usk, Enums.FlyKeyKeyFrame.A)
        // this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        this.updatecontrollerState(this.getControllersByAction('ChangeDvePosition'), { value })
        this.controllerMidi.updateControllersViaState(this.config.controllers)
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
      },
      ChangeDveMask: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
        // console.log(`value:`, value)
        let valueWithDirection = map(value, 0, 128, 0, 10000)
        // console.log(`valueWithDirection:`, valueWithDirection)
        valueWithDirection = valueWithDirection % 5000
        // console.log(`valueWithDirection:`, valueWithDirection)
        valueWithDirection = (value < 64) ? valueWithDirection - (10000/2) : valueWithDirection
        // console.log(`valueWithDirection:`, valueWithDirection)
        this.config.dve.stateCurrent = {
          positionX: Math.round(this.config.dve.stateMain.positionX - (valueWithDirection) / 2),
          maskLeft: Math.round(9000 + valueWithDirection),
          maskRight: Math.round(9000 - valueWithDirection),
        }
        // console.log(`dveStateLocal:`, this.config.dve.stateCurrent)
        this.controllerAtem.setUpstreamKeyerDVESettings(this.config.dve.stateCurrent)
        this.updatecontrollerState(this.getControllersByAction('ChangeDveMask'), { value })
        this.controllerMidi.updateControllersViaState(this.config.controllers)
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
      },

      ChangeAudioSourceGain: (options, value) => this.getActionChain('changeAudioSourceGain')(options, value),
    }
    return controllerActions[name]
  }

  switchButtonLightOn(btns) {
    btns = asArray(btns)
    // console.log(`switchButtonLightOn:`, btns)
    btns = btns.map((btn) => { return { note: btn }})
    this.updateButtonState(btns, { state: 'noteon', value: 127 }, 'note')
  }

  switchButtonLightOff(btns) {
    btns = asArray(btns)
    // console.log(`switchButtonLightOff:`, btns)
    btns = btns.map((btn) => { return { note: btn }})
    this.updateButtonState(btns, { state: 'noteoff', value: 0 }, 'note')
  }

  getButtonsByAction(action) {
    return _.map(_.filter(this.config.buttons, (el) => el.action === action || el.noteOn?.action == action || el.noteOff?.action == action), (el) => el.note)
  }

  getButtonsByNoteOffAction(action) {
    return _.map(_.filter(this.config.buttons, (el) => el.noteOff?.action == action), (el) => el.note)
  }

  getButtonsByNoteOnAction(action) {
    return _.map(_.filter(this.config.buttons, (el) => el.noteOn?.action == action), (el) => el.note)
  }

  getControllersByAction(action) {
    return _.filter(this.config.controllers, (el) => el.action === action)
  }

  getControllersByName(name) {
    return _.filter(this.config.controllers, (el) => el.name === name)
  }

  updateButtonState(buttonStates, overwrite = {}, via = 'action') {
    buttonStates = asArray(buttonStates)
    buttonStates = buttonStates.map((buttonState) => {
      return { state: 'noteoff', value: buttonState.defaultValue || 0, ...buttonState, ...overwrite}
    })
    this.config.buttons = this.config.buttons.map((button) => {
      let updatedButtonState = _.find(buttonStates, (el) => el[via] === button[via])
      if (updatedButtonState) {
        button.value = updatedButtonState.value
        button.state = updatedButtonState.state
      }
      return button
    })
  }

  updateDveButtons() {
    const buttonsForDveSelection = this.config.feedback.buttonsForActiveUpstreamKeyerFillSource
    const nameOfInput = Object.keys(this.config.inputMapping).find(key => this.config.inputMapping[key] === this.config.dve.fillSource)
    const buttonActiveDveFillSource = buttonsForDveSelection[nameOfInput]
    this.switchButtonLightOff(_.difference(_.flatten(Object.values(buttonsForDveSelection)), buttonActiveDveFillSource))
    this.switchButtonLightOn(buttonActiveDveFillSource)
  }

  updatecontrollerState(controllerStates, overwrite = {}, via = 'action') {
    controllerStates = asArray(controllerStates)
    controllerStates = controllerStates.map((controllerState) => {
      return { state: 'cc', value: controllerState.defaultValue || 0, ...controllerState, ...overwrite}
    })
    this.config.controllers = this.config.controllers.map((controller) => {
      let updatedControllerState = _.find(controllerStates, (el) => el[via] === controller[via])
      if (updatedControllerState) {
        controller.value = updatedControllerState.value
      }
      return controller
    })
  }

  resetControllersToDefault(controllerStates) {
    // console.log(`resetControllersToDefault:`, controllerStates)
    controllerStates = asArray(controllerStates)
    const { controllers } = config
    controllerStates = controllerStates.map((controllerState) => merge(controllerState, { state: 'cc', value: controllerState.defaultValue || 0 }))
    controllers.map((controller) => {
      let updatedControllerState = _.find(controllerStates, (el) => el.action === controller.action)
      if (updatedControllerState) controller.value = updatedControllerState.value
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
        if (noteStates.noteOn) this.switchButtonLightOn(noteStates.noteOn)
        if (noteStates.noteOff) this.switchButtonLightOff(noteStates.noteOff)
      } else console.log(`No feedback configured for audio index ${audioIndex} and channel ${audioChannel}.`)
    } else console.log(`No feedback configured for audio index ${audioIndex}.`)
  }

  runStateUpate(state, pathToChange = null) {
    const me = 0
    const usk = 0
    pathToChange = asArray(pathToChange)
    if (pathToChange.length !== 1 || !pathToChange.includes('info.lastTime')) console.log(`pathToChange:`, pathToChange)
    for (const path of pathToChange) {
      const isInitial = (path === 'initial')
      if (isInitial) {
        // find all ChangeAudioSourceGain controllers and set them to their default
        for (const controller of this.config.controllers) {
          if (controller.defaultValue) {
            const controlAction = this.getControllerAction(controller.action)
            if (controlAction) controlAction(controller)
          }
        }
        // Transition Type is not transmitted from ATEM State so it is just a state on the midi controller itself
        if (this.config.transition.type === 'auto') this.switchButtonLightOn(this.getButtonsByAction('AutoCutSwitch'))
        else this.switchButtonLightOff(this.getButtonsByAction('AutoCutSwitch'))

        // Initial Audio Channel Mix Option Feedback (On, Off, AudioFollowVideo)
        for (const audioIndex in this.config.feedback.forFairlightInputAudioMixOption) {
          for (const audioChannel in this.config.feedback.forFairlightInputAudioMixOption[audioIndex]) {
            this.feedbackFairlightAudioMixOptions(audioIndex, audioChannel)
          }
        }
      }

      // Updating Audio Mix Option Feedback
      // On / Off / AudioFollowVideo
      if (isInitial || path.includes('fairlight.inputs')) {
        const [, audioIndex, audioChannel] = (/fairlight\.inputs\.([0-9]*)\.sources\.(-[0-9]*)\.properties/g).exec(path)
        this.feedbackFairlightAudioMixOptions(audioIndex, audioChannel)
      }

      // Updating Active Camera in Program & DVE Feedback
      if (isInitial || path.includes('video.mixEffects')) {
        const programInput = state.video.mixEffects[me].programInput
        const hasDve = state.video.mixEffects[me].upstreamKeyers[usk].onAir
        const buttonsForProgramInputWithoutDve = this.config.feedback.buttonsForProgramInputWithoutDve
        const buttonsForProgramInputWithDve = this.config.feedback.buttonsForProgramInputWithDve
        const nameOfInput = Object.keys(this.config.inputMapping).find(key => this.config.inputMapping[key] === programInput)
        const buttonsForProgramInput = (hasDve) ? buttonsForProgramInputWithDve[nameOfInput] : buttonsForProgramInputWithoutDve[nameOfInput]
        const buttonsForProgramInputAll = [..._.flatten(Object.values(buttonsForProgramInputWithoutDve)), ..._.flatten(Object.values(buttonsForProgramInputWithDve))]
        this.switchButtonLightOff(_.difference(buttonsForProgramInputAll, buttonsForProgramInput))
        this.switchButtonLightOn(buttonsForProgramInput)

        this.updateDveButtons()

        if (state.video.mixEffects[me].fadeToBlack.isFullyBlack) {
          this.switchButtonLightOn(this.getButtonsByAction('FadeToBlack'))
        } else {
          this.switchButtonLightOff(this.getButtonsByAction('FadeToBlack'))
        }
      }
    }

    this.controllerMidi.updateControllersViaState(this.config.controllers)
    this.controllerMidi.updateButtonsViaState(this.config.buttons)
  }

  async exitHandler(options, exitCode) {
    console.log(`exitHandler with exitCode: ${exitCode || 'NONE'}`)

    setTimeout((err) => {
      // Force close server after timeout (this is if the cleanUp takes too long)
      console.log('gentle took too long exiting hard')
      process.exit(1)
    }, 10 * 1000) // 10 seconds

    if (options.cleanup) {
      console.log('Server closing: Doing the cleanup.')

      if (this.controllerMidi.isConnected()) {
        this.switchButtonLightOff(_.flatten(this.config.buttons.map((el) => [el.note])))
        this.controllerMidi.updateButtonsViaState(this.config.buttons)
        this.updatecontrollerState(this.config.controllers.map((el) => merge(el, { state: 'cc', value: 0 })))
        this.controllerMidi.updateControllersViaState(this.config.controllers)
      }

      await this.controllerWebServer.disconnect()
      await this.controllerMidi.disconnect()
      await this.controllerAtem.disconnect()
      // await this.controllerHotkeys.disconnect()

      console.log('ControlThemAll closed, cleaned, and shutting down!')
    }
    if (options.exit) {
      console.log('ControlThemAll closed all connectiosn successfully… shuting down…')
      process.exit()
    }
  }
}

new ControlThemAll()

export default ControlThemAll
