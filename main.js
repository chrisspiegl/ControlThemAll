import { ATEM } from './ATEM.js'
import { MIDI } from './MIDI.js'
import { config } from './config.js'

import { asArray, map } from './utils.js'

import { Enums } from 'atem-connection'
import { EventEmitter } from 'inf-ee'
import merge from 'deepmerge'
import _ from 'lodash'

const MIDI_RESEND_INTERVAL = 1000 // ms

class MIDI2ATEM extends EventEmitter {
  constructor() {
    super()
    console.log(`Constructing MIDI2ATEM`)

    this._resendMidiTimer = undefined

    this.midi = undefined
    this.atem = undefined

    this.setup()
  }

  async exitHandler(options, exitCode) {
    console.log(`exitHandler with exitCode:${exitCode || 'NONE'}`)
    console.log(`exitCode:`, exitCode)

    if (options.cleanup) {
      console.log('Server closing: Doing the cleanup.')
      this.switchButtonLightOff(_.flatten(config.buttons.map((el) => [el.note])))
      this.midi.updateButtonsViaState(config.buttons)
      this.updatecontrollerState(config.controllers.map((el) => merge(el, { state: 'cc', value: 0 })))
      this.midi.updateControllersViaState(config.controllers)

      await this.midi.disconnect()
      await this.atem.disconnect()

      console.log('Server closed, cleaned, and shutting down!')
    } else if (options.exit) {
      console.log('Server closed all connectiosn successfully… shuting down…')
      process.exit()
    }
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
    const buttonConfig = _.find(config.buttons, { note })
    console.log(`buttonConfig:`, buttonConfig)
    const actionConfig = buttonConfig.noteOn
    if (_.isEmpty(actionConfig) || _.isEmpty(actionConfig.action)) return
    const buttonActionFunction = this.getButtonAction(actionConfig.action)
    if (buttonActionFunction) buttonActionFunction(actionConfig, value)
  }

  midiOnNoteOff(msg) {
    console.log(`NOTE OFF:`, msg)
    const { note, velocity: value, channel } = msg
    const buttonConfig = _.find(config.buttons, { note })
    console.log(`buttonConfig:`, buttonConfig)
    const actionConfig = (buttonConfig.noteOff) ? buttonConfig.noteOff : buttonConfig
    if (_.isEmpty(actionConfig) || _.isEmpty(actionConfig.action)) return
    const buttonActionFunction = this.getButtonAction(actionConfig.action)
    if (buttonActionFunction) buttonActionFunction(actionConfig, value)
  }

  midiOnControllerChange(msg) {
    console.log(`CONTROLLER CHANGE:`, msg)
    const { controller: note, value, channel } = msg
    const controllerConfig = _.find(config.controllers, { note })
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
        this.midi.updateButtonsViaState(config.buttons)
        this.midi.updateControllersViaState(config.controllers)
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
    this.runStateUpate(this.atem.getState(), 'initial')
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
        config.dve.fillSource = dveCamId || config.dve.fillSource
        if (this.atem.getUpstreamKeyerType() !== Enums.MixEffectKeyType.DVE) {
          this.atem.setUpstreamKeyerType({ flyEnabled: true, mixEffectKeyType: Enums.MixEffectKeyType.DVE })
        }
        this.atem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)

        if (config.transition.type === 'cut' || config.transition.dipWhenProgramAndDveChange === false) {
          this.atem.changePreviewInput(mainCamId)
          if (this.atem.isUpstreamKeyerActive()) {
            this.atem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
          } else {
            this.atem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
          }
          this.atem.setUpstreamKeyerFillSource(config.dve.fillSource)
          if (config.transition.type === 'auto') { this.atem.autoTransition() } else { this.atem.cut() }
        } else if (this.atem.getUpstreamKeyerFillSource() !== config.dve.fillSource && this.atem.isUpstreamKeyerActive()) {
          this.atem.changePreviewInput(config.inputMapping.black)
          this.atem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
          if (config.transition.type === 'auto') { this.atem.autoTransition() } else { this.atem.cut() }
          setTimeout(() => {
            this.atem.setUpstreamKeyerFillSource(config.dve.fillSource)
            this.atem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
            this.atem.changePreviewInput(mainCamId)
            if (config.transition.type === 'auto') { this.atem.autoTransition() } else { this.atem.cut() }
          }, this.atem.getTransitionDuration() * config.msPerFrame)
        } else {
          this.atem.changePreviewInput(mainCamId)
          if (this.atem.isUpstreamKeyerActive()) {
            this.atem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
            this.atem.autoTransition()
          } else {
            this.atem.setUpstreamKeyerFillSource(config.dve.fillSource)
            this.atem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
            setTimeout(() => {
              this.atem.autoTransition()
            }, config.msPerFrame * 2)
          }
        }
      },

      camSolo: (camId) => {
        this.atem.changePreviewInput(camId)
        if (this.atem.isUpstreamKeyerActive()) {
          this.atem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
        } else {
          this.atem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
        }
        if (config.transition.type === 'auto') { this.atem.autoTransition() } else { this.atem.cut() }
      },

      camInDve: (camId, when = 'auto') => {
        // console.log(`setting dveFillSource:`, camId)
        // console.log(`setting dveFillSource:`, config.dve.fillSource)
        // console.log(`current dveFillSource:`, this.atem.getUpstreamKeyerFillSource())
        // console.log(`when:`, when)
        if (when === 'auto' && config.dve.fillSource === camId && camId === this.atem.getUpstreamKeyerFillSource() || config.dve.fillSource === camId && camId === this.atem.getProgramInput()) {
          this.getActionChain('switchProgramAndDveSource')()
        } else if (when === 'instant') {
          config.dve.fillSource = camId
          this.getActionChain('camWithDve')(this.atem.getProgramInput())
        } else if ((['auto'].includes(when)) && config.dve.fillSource === camId) {
          this.getActionChain('camWithDve')(this.atem.getProgramInput())
        } else {
          config.dve.fillSource = camId
        }
        this.updateDveButtons()
        this.midi.updateButtonsViaState(config.buttons)
      },

      switchProgramAndDveSource: () => {
        const mainCamId = this.atem.getProgramInput()
        const dveCamId = config.dve.fillSource
        config.dve.fillSource = mainCamId
        this.getActionChain('camWithDve')(dveCamId)
      },

      changeAudioGain: (options, value) => { // expected value == between 0 and 127
        const { note, audioIndex, channels, defaultValue, range } = options
        if (value !== 0 && !value || value === -1) value = defaultValue

        const faderRange = { min: -10000, max: 1000, ...range }
        const faderGain = Math.round(map(value, 0, 127, faderRange.min, faderRange.max) / 100) * 100

        for (const channel of asArray(channels)) {
          this.atem.setFairlightAudioMixerSourceProps(audioIndex, channel, { faderGain })
        }
        this.updatecontrollerState(this.getControllersByName(options.name), { value }, 'name')
        this.midi.updateControllersViaState(config.controllers)
      },
    }
    return actionChains[name]
  }

  getButtonAction(name) {
    const buttonActions = {
      ResetDveScale: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
          ...config.dve.stateCurrent,
          sizeX: config.dve.stateMain.sizeX,
          sizeY: config.dve.stateMain.sizeY,
        }
        this.atem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        this.resetControllersToDefault(this.getControllersByAction('ChangeDveScale'))
        this.midi.updateControllersViaState(config.controllers)
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.midi.updateButtonsViaState(config.buttons)
      },
      ResetDvePosition: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
          ...config.dve.stateCurrent,
          sizeX: config.dve.stateDefault.sizeX,
          sizeY: config.dve.stateDefault.sizeY,
          positionX: config.dve.stateDefault.positionX,
          positionY: config.dve.stateDefault.positionY,
          maskTop: config.dve.stateDefault.maskTop,
          maskBottom: config.dve.stateDefault.maskBottom,
          maskRight: config.dve.stateDefault.maskRight,
          maskLeft: config.dve.stateDefault.maskLeft,
        }
        config.dve.stateMain = { ...config.dve.stateCurrent }
        this.atem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        this.resetControllersToDefault(this.getControllersByAction('ChangeDvePosition'))
        this.midi.updateControllersViaState(config.controllers)
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.midi.updateButtonsViaState(config.buttons)
      },
      ResetDveMask: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
          ...config.dve.stateMain,
          sizeX: config.dve.stateMain.sizeX,
          sizeY: config.dve.stateMain.sizeY,
          positionX: config.dve.stateMain.positionX,
          positionY: config.dve.stateMain.positionY,
          maskTop: config.dve.stateMain.maskTop,
          maskBottom: config.dve.stateMain.maskBottom,
          maskRight: config.dve.stateMain.maskRight,
          maskLeft: config.dve.stateMain.maskLeft,
        }
        config.dve.stateMain = { ...config.dve.stateCurrent }
        this.atem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        this.resetControllersToDefault(this.getControllersByAction('ChangeDveMask'))
        this.midi.updateControllersViaState(config.controllers)
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.midi.updateButtonsViaState(config.buttons)
      },

      ResetDveAll: () => {
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
        }
        config.dve.stateMain = { ...config.dve.stateCurrent }
        this.atem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        this.resetControllersToDefault(this.getControllersByAction('ChangeDveScale'))
        this.resetControllersToDefault(this.getControllersByAction('ChangeDvePosition'))
        this.resetControllersToDefault(this.getControllersByAction('ChangeDveMask'))
        this.midi.updateControllersViaState(config.controllers)
      },

      ResetAudioGain: (options, value) => this.getActionChain('changeAudioGain')(options),

      ChangeDveStyle: (options, value) => {
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
          ...config.dve.styles[options.style],
        }
        config.dve.stateMain = { ...config.dve.stateCurrent }
        this.atem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        if (options.programInput || options.fillSource) {
          if (options.programInput && !options.fillSource) {
            this.getButtonAction('ChangeProgramSource')({ programInput: options.programInput })
          } else if (options.fillSource && !options.programInput) {
            this.getActionChain('camInDve')(config.inputMapping[options.fillSource], 'instant')
          } else {
            if (this.atem.isUpstreamKeyerActive() && config.inputMapping[options.fillSource] === this.atem.getUpstreamKeyerFillSource() && config.inputMapping[options.programInput] === this.atem.getProgramInput()) {
              this.getActionChain('switchProgramAndDveSource')()
            } else {
              this.getActionChain('camWithDve')(config.inputMapping[options.programInput], config.inputMapping[options.fillSource])
            }
          }
        }
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.midi.updateButtonsViaState(config.buttons)
        this.midi.updateControllersViaState(config.controllers)
      },

      FadeToBlack: (options, value) => this.atem.fadeToBlack(),

      AutoCutSwitch: (options, value) => {
        config.transition.type = config.transition.type === 'cut' ? 'auto' : 'cut'
        if (config.transition.type === 'auto') this.switchButtonLightOn(this.getButtonsByAction('AutoCutSwitch'))
        else this.switchButtonLightOff(this.getButtonsByAction('AutoCutSwitch'))
        this.midi.updateButtonsViaState(config.buttons)
      },

      ChangeProgramSource: (options, value) => {
        if (options.withUpstreamKeyer) {
          this.getActionChain('camWithDve')(config.inputMapping[options.programInput])
        } else {
          this.getActionChain('camSolo')(config.inputMapping[options.programInput])
        }
      },

      ChangeUpstreamKeyerFillSource: (options, value) => {
        this.getActionChain('camInDve')(config.inputMapping[options.fillSource], options.when)
      },

      ChangeProgramAndDveFillSource: (options, value) => {
        this.getActionChain('camInDve')(config.inputMapping[options.fillSource])
        this.getActionChain('camWithDve')(config.inputMapping[options.programInput])
      },

      SwitchProgramAndUpstreamKeyerFillSource: (options, value) => {
        this.getActionChain('switchProgramAndDveSource')()
      }
    }
    return buttonActions[name]
  }

  getControllerAction(name) {
    const controllerActions = {
      ChangeDveScale: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
          ...config.dve.stateMain,
          sizeX: value * 10,
          sizeY: value * 10,
        }
        this.atem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        this.updatecontrollerState(this.getControllersByAction('ChangeDveScale'), { value })
        this.midi.updateControllersViaState(config.controllers)
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.midi.updateButtonsViaState(config.buttons)
      },
      ChangeDvePosition: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
        const me = 0
        const usk = 0
        // const pos = Math.floor(map(value, 0, 127, 0, Object.keys(positions).length))
        const pos = Math.floor(value % config.dve.positions.length)
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
          ...config.dve.stateCurrent,
          ...config.dve.positions[pos]
        }
        config.dve.stateMain = { ...config.dve.stateCurrent }
        this.atem.setUpstreamKeyerDVESettings({ rate: 10 })
        this.atem.setUpstreamKeyerFlyKeyKeyframe(me, usk, Enums.FlyKeyKeyFrame.A, {
          ...config.dve.stateMain,
          keyFrameId: Enums.FlyKeyKeyFrame.A,
          rate: 100,
        })
        this.atem.runUpstreamKeyerFlyKeyTo(me, usk, Enums.FlyKeyKeyFrame.A)
        // this.atem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        this.updatecontrollerState(this.getControllersByAction('ChangeDvePosition'), { value })
        this.midi.updateControllersViaState(config.controllers)
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.midi.updateButtonsViaState(config.buttons)
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
        config.dve.stateCurrent = {
          positionX: Math.round(config.dve.stateMain.positionX - (valueWithDirection) / 2),
          maskLeft: Math.round(9000 + valueWithDirection),
          maskRight: Math.round(9000 - valueWithDirection),
        }
        // console.log(`dveStateLocal:`, config.dve.stateCurrent)
        this.atem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        this.updatecontrollerState(this.getControllersByAction('ChangeDveMask'), { value })
        this.midi.updateControllersViaState(config.controllers)
        if (options.buttonsLightOn) this.switchButtonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) this.switchButtonLightOff(options.buttonsLightOff)
        this.midi.updateButtonsViaState(config.buttons)
      },

      ChangeAudioGain: (options, value) => this.getActionChain('changeAudioGain')(options, value),
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
    return _.map(_.filter(config.buttons, (el) => el.action === action), (el) => el.note)
  }

  getControllersByAction(action) {
    return _.filter(config.controllers, (el) => el.action === action)
  }

  getControllersByName(name) {
    return _.filter(config.controllers, (el) => el.name === name)
  }

  updateButtonState(buttonStates, overwrite = {}, via = 'action') {
    buttonStates = asArray(buttonStates)
    buttonStates = buttonStates.map((buttonState) => {
      return { state: 'noteoff', value: buttonState.defaultValue || 0, ...buttonState, ...overwrite}
    })
    config.buttons = config.buttons.map((button) => {
      let updatedButtonState = _.find(buttonStates, (el) => el[via] === button[via])
      if (updatedButtonState) {
        button.value = updatedButtonState.value
        button.state = updatedButtonState.state
      }
      return button
    })
  }

  updateDveButtons() {
    const buttonsForDveSelection = config.feedback.buttonsForActiveUpstreamKeyerFillSource
    const nameOfInput = Object.keys(config.inputMapping).find(key => config.inputMapping[key] === config.dve.fillSource)
    const buttonActiveDveFillSource = buttonsForDveSelection[nameOfInput]
    this.switchButtonLightOff(_.difference(_.flatten(Object.values(buttonsForDveSelection)), buttonActiveDveFillSource))
    this.switchButtonLightOn(buttonActiveDveFillSource)
  }

  updatecontrollerState(controllerStates, overwrite = {}, via = 'action') {
    controllerStates = asArray(controllerStates)
    controllerStates = controllerStates.map((controllerState) => {
      return { state: 'cc', value: controllerState.defaultValue || 0, ...controllerState, ...overwrite}
    })
    config.controllers = config.controllers.map((controller) => {
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

  runStateUpate(state, pathToChange = null) {
    const me = 0
    const usk = 0
    pathToChange = asArray(pathToChange)
    if (pathToChange.length !== 1 || !pathToChange.includes('info.lastTime')) console.log(`pathToChange:`, pathToChange)
    for (const path of pathToChange) {
      const isInitial = (path === 'initial')
      if (isInitial) {
        // find all ChangeAudioGain controllers and set them to their default
        for (const controller of config.controllers) {
          if (controller.defaultValue) {
            const controlAction = this.getControllerAction(controller.action)
            if (controlAction) controlAction(controller)
          }
        }
      }
      if (isInitial || path.includes('video.mixEffects')) {
        const programInput = state.video.mixEffects[me].programInput
        const hasDve = state.video.mixEffects[me].upstreamKeyers[usk].onAir
        const buttonsForProgramInputWithoutDve = config.feedback.buttonsForProgramInputWithoutDve
        const buttonsForProgramInputWithDve = config.feedback.buttonsForProgramInputWithDve
        const nameOfInput = Object.keys(config.inputMapping).find(key => config.inputMapping[key] === programInput)
        const buttonsForProgramInput = (hasDve) ? buttonsForProgramInputWithDve[nameOfInput] : buttonsForProgramInputWithoutDve[nameOfInput]
        const buttonsForProgramInputAll = [..._.flatten(Object.values(buttonsForProgramInputWithoutDve)), ..._.flatten(Object.values(buttonsForProgramInputWithDve))]
        this.switchButtonLightOff(_.difference(buttonsForProgramInputAll, buttonsForProgramInput))
        this.switchButtonLightOn(buttonsForProgramInput)

        this.updateDveButtons()

        if (config.transition.type === 'auto') this.switchButtonLightOn(this.getButtonsByAction('AutoCutSwitch'))
        else this.switchButtonLightOff(this.getButtonsByAction('AutoCutSwitch'))

        if (state.video.mixEffects[me].fadeToBlack.isFullyBlack) {
          this.switchButtonLightOn(this.getButtonsByAction('FadeToBlack'))
        } else {
          this.switchButtonLightOff(this.getButtonsByAction('FadeToBlack'))
        }
      }
    }

    this.midi.updateControllersViaState(config.controllers)
    this.midi.updateButtonsViaState(config.buttons)
  }

  setup() {
    // do something when app is closing
    // process.on('exit', this.exitHandler.bind(this, { exit: true }))
    // catches ctrl+c event
    process.on('SIGINT', this.exitHandler.bind(this, { cleanup: true }))
    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', this.exitHandler.bind(this, { exit: true }))
    process.on('SIGUSR2', this.exitHandler.bind(this, { exit: true }))
    // catches uncaught exceptions
    process.on('uncaughtException', this.exitHandler.bind(this, { exit: true }))
    process.on('unhandledRejection', async (reason) => console.log(`UNHANDLED:`, reason))

    this.midi = new MIDI()

    this.midi.on('noteOn', this.midiOnNoteOn.bind(this))
    this.midi.on('noteOff', this.midiOnNoteOff.bind(this))
    this.midi.on('controllerChange', this.midiOnControllerChange.bind(this))
    this.midi.on('connect', this.midiOnConnect.bind(this))
    this.midi.on('disconnect', this.midiOnDisconnect.bind(this))

    this.midi.connect({
      inputDeviceName: config.midi.inputDeviceName || config.midi.deviceName,
      outputDeviceName: config.midi.outputDeviceName || config.midi.deviceName,
      outputChannel: config.midi.outputChannel,
    })

    this.atem = new ATEM()

    this.atem.on('connected', this.atemOnConnected.bind(this))
    this.atem.on('disconnect', this.atemOnDisconnect.bind(this))
    this.atem.on('stateChanged', this.atemOnStateChanged.bind(this))

    this.atem.connect({
      address: config.atem.address,
    })
  }
}

async function main() {
  const m2a = new MIDI2ATEM()
}

main()
