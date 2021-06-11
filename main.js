import { ATEM } from './ATEM.js'
import { MIDI } from './MIDI.js'
import { config } from './config.js'

import { Enums } from 'atem-connection'
import merge from 'deepmerge'
import _ from 'lodash'

const asArray = (x) => Array.isArray(x) ? x : [x]
const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;

class MIDI2ATEM {
  constructor() {
    console.log(`Constructing MIDI2ATEM`)
    this.status = {
      midi: {
        connected: false,
      },
      atem: {
        connected: false,
      },
    }

    this.setup()

    this.midi = new MIDI(this)
    this.atem = new ATEM(this)
    this.init()
  }

  setup() {
    const exitHandler = async (options, exitCode) => {
      console.log(`exitHandler with exitCode:${exitCode || 'NONE'}`)
      if (options.cleanup) {
        console.log('Server closing: Doing the cleanup.')
        this.midi.inputMidi.close()
        // this.midi.outputMidi.close()
        await this.atem.myAtem.disconnect()

        console.log('Server closed, cleaned, and shutting down!')
      } else if (options.exit) {
        console.log('Server closed all connectiosn successfully… shuting down…')
        process.exit()
      }
    }

    // do something when app is closing
    process.on('exit', exitHandler.bind(null, { cleanup: true }))
    // catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { exit: true }))
    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
    process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))
    // catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { exit: true }))
    process.on('unhandledRejection', async (reason) => {
      console.log(`UNHANDLED:`, reason)
    })
  }

  init() {
    const myAtem = this.atem.myAtem
    const inputMidi = this.midi.inputMidi
    const outputMidi = this.midi.outputMidi

    myAtem.on('connected', () => {
      setInitialState(myAtem.state)
      // myAtem.setTransitionStyle({ nextSelection: 3, nextStyle: 2, selection: 2, style: 2})
      // myAtem.autoTransition()
      // console.log(getTransitionDuration())

      // setInterval(() => {
      //   if (level > 60535) level = 0
      //   else level = level + 1000
      //   console.log(`level:`, level)
      //   // myAtem.setFairlightAudioMixerInputProps(1302, {
      //   //   activeInputLevel: level
      //   // })
      // }, 2000)
    })

    // const diff = require("deep-object-diff").diff
    // let lastState = {}

    myAtem.on('stateChanged', (state, pathToChange) => {
      // console.log(`pathToChange:`, pathToChange)
      // console.log(`state:`, state)
      // console.log(`state:`, state.fairlight.inputs[1301].sources)
      // console.log(JSON.stringify(diff(state, lastState), 0, 2))
      // lastState = merge({}, state)
      runButtonStateUpdate(state, pathToChange)
    })


    function setInitialState(atemState) {
      // console.log(`atemState:`, atemState)
      runButtonStateUpdate(atemState, 'initial')
    }

    // **********************************************************
    // MIDI Controller Stuff
    // **********************************************************

    function getProgramInput(me = 0) {
      return myAtem.state.video.mixEffects[me].programInput
    }

    function getPreviewInput(me = 0) {
      return myAtem.state.video.mixEffects[me].previewInput
    }

    function isUpstreamKeyerActive(me = 0, usk = 0) {
      return myAtem.state.video.mixEffects[me].upstreamKeyers[usk].onAir
    }

    function getUpstreamKeyerFillSource(me = 0, usk = 0) {
      return myAtem.state.video.mixEffects[me].upstreamKeyers[usk].fillSource
    }

    function getUpstreamKeyerType(me = 0, usk = 0) {
      return myAtem.state.video.mixEffects[me].upstreamKeyers[usk].mixEffectKeyType
    }

    function getTransitionDuration(me = 0) {
      return myAtem.state.video.mixEffects[me].transitionSettings.mix.rate
    }

    const actionChains = {
      camWithDve: (mainCamId) => {
        if (getUpstreamKeyerType() !== Enums.MixEffectKeyType.DVE) {
          myAtem.setUpstreamKeyerType({ flyEnabled: true, mixEffectKeyType: Enums.MixEffectKeyType.DVE })
        }
        myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)

        if (config.transition.type === 'cut' || config.transition.dipWhenProgramAndDveChange === false) {
          myAtem.changePreviewInput(mainCamId)
          if (isUpstreamKeyerActive()) {
            myAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
          } else {
            myAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
          }
          myAtem.setUpstreamKeyerFillSource(config.dve.fillSource)
          if (config.transition.type === 'auto') { myAtem.autoTransition() } else { myAtem.cut() }
        } else if (getUpstreamKeyerFillSource() !== config.dve.fillSource && isUpstreamKeyerActive()) {
          myAtem.changePreviewInput(config.inputMapping.black)
          myAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
          if (config.transition.type === 'auto') { myAtem.autoTransition() } else { myAtem.cut() }
          setTimeout(() => {
            myAtem.setUpstreamKeyerFillSource(config.dve.fillSource)
            myAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
            myAtem.changePreviewInput(mainCamId)
            if (config.transition.type === 'auto') { myAtem.autoTransition() } else { myAtem.cut() }
          }, getTransitionDuration() * config.msPerFrame)
        } else {
          myAtem.changePreviewInput(mainCamId)
          if (isUpstreamKeyerActive()) {
            myAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
            myAtem.autoTransition()
          } else {
            myAtem.setUpstreamKeyerFillSource(config.dve.fillSource)
            myAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
            setTimeout(() => {
              myAtem.autoTransition()
            }, config.msPerFrame * 2)
          }
        }

      },
      camSolo: (camId) => {
        myAtem.changePreviewInput(camId)
        if (isUpstreamKeyerActive()) {
          myAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Key1, Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
        } else {
          myAtem.setTransitionStyle({ nextSelection: [ Enums.TransitionSelection.Background ], nextStyle: config.transition.style })
        }
        if (config.transition.type === 'auto') { myAtem.autoTransition() } else { myAtem.cut() }
      },

      camInDve: (camId) => {
        console.log(`setting dveFillSource:`, camId)
        console.log(`setting dveFillSource:`, config.dve.fillSource)
        console.log(`current dveFillSource:`, getUpstreamKeyerFillSource())
        if (config.dve.fillSource === camId && camId === getUpstreamKeyerFillSource() || config.dve.fillSource === camId && camId === getProgramInput()) {
          actionChains.switchProgramAndDveSource()
        } else if (config.dve.fillSource === camId) {
          config.dve.fillSource = camId
          actionChains.camWithDve(getProgramInput())
        } else {
          config.dve.fillSource = camId
        }
        updateDveButtons()
        updateButtonsViaState()
      },

      switchProgramAndDveSource: () => {
        const mainCamId = getProgramInput()
        const dveCamId = config.dve.fillSource
        console.log(`\n\n\n\nswitchProgramAndDveSource: ${mainCamId} : ${dveCamId}`)
        config.dve.fillSource = mainCamId
        actionChains.camWithDve(dveCamId)
      },

      changeAudioGain: (controllerActionName, audioIndex, channels, value) => {
        channels = asArray(channels)
        let levelMin = -10000
        let levelMax = 1000
        const gainValue = map(value, 0, 127, levelMin, levelMax)

        for (const channel of channels) {
          myAtem.setFairlightAudioMixerSourceProps(audioIndex, channel, {
            faderGain: gainValue
          })
        }
        updatecontrollerState({ [controllersByAction(controllerActionName)[0]]: { value }})
        updateControllersViaState()
      }
    }

    const buttonActions = {
      ResetDveScale: (options, value) => {
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
          ...config.dve.stateCurrent,
          sizeX: config.dve.stateMain.sizeX,
          sizeY: config.dve.stateMain.sizeY,
        }
        myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        const controllersForAction = controllersByAction('ChangeDveScale')
        resetControllersToDefault(controllersForAction)
        updateControllersViaState()
        buttonLightOff(buttonsByAction('PhoneDve'))
        buttonLightOff(buttonsByAction('MonitorDve'))
        updateButtonsViaState()
      },
      ResetDvePosition: (options, value) => {
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
        myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        const controllersForAction = controllersByAction('ChangeDvePosition')
        resetControllersToDefault(controllersForAction)
        updateControllersViaState()
        buttonLightOff(buttonsByAction('PhoneDve'))
        buttonLightOff(buttonsByAction('MonitorDve'))
        updateButtonsViaState()
      },
      ResetDveMask: (options, value) => {
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
        myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        const controllersForAction = controllersByAction('ChangeDveMask')
        resetControllersToDefault(controllersForAction)
        updateControllersViaState()
        buttonLightOff(buttonsByAction('PhoneDve'))
        buttonLightOff(buttonsByAction('MonitorDve'))
        updateButtonsViaState()
      },

      ResetAudioGainMain: (options, value) => {
        const audioIndex = 1301
        const channel = ['-65280'] //  stereo split channels: ['-255', '-256'] | joined channel: ['-65280']
        const controllerValue = map(0, -10000, 1000, 0, 127)
        actionChains.changeAudioGain('ChangeAudioGainMain', audioIndex, channel, controllerValue)
      },
      ResetAudioGainDisplay: (options, value) => {
        const audioIndex = 2
        const channel = ['-65280']
        const controllerValue = map(0, -10000, 1000, 0, 127)
        actionChains.changeAudioGain('ChangeAudioGainDisplay', audioIndex, channel, controllerValue)
      },
      ResetAudioGainPhone: (options, value) => {
        const audioIndex = 4
        const channel = ['-65280']
        const controllerValue = map(0, -10000, 1000, 0, 127)
        actionChains.changeAudioGain('ChangeAudioGainPhone', audioIndex, channel, controllerValue)
      },

      // ResetDveAll: () => {
      //   config.dve.stateCurrent = {
      //     ...config.dve.stateDefault,
      //   }
      //   config.dve.stateMain = { ...config.dve.stateCurrent }
      //   myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
      //   const controllersForAction = controllersByAction('ChangeDveMask')
      //   resetControllersToDefault(controllersForAction)
      //   updateControllersViaState()
      // },

      ChangeDveStyle: (options, value) => {
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
          ...config.dve.styles[options.style],
        }
        config.dve.stateMain = { ...config.dve.stateCurrent }
        myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        if (options.programInput) actionChains.camInDve(config.inputMapping[options.programInput])
        if (options.fillSource) actionChains.camWithDve(config.inputMapping[options.fillSource])
        buttonLightOn(options.buttonLightOn)
        buttonLightOff(options.buttonLightOff)
        updateButtonsViaState()
        updateControllersViaState()
      },

      FadeToBlack: (options, value) => myAtem.fadeToBlack(),

      AutoCutSwitch: (options, value) => {
        config.transition.type = config.transition.type === 'cut' ? 'auto' : 'cut'
        if (config.transition.type === 'auto') buttonLightOn(buttonsByAction('AutoCutSwitch'))
        else buttonLightOff(buttonsByAction('AutoCutSwitch'))
        updateButtonsViaState()
      },

      ChangeProgramSource: (options, value) => {
        if (options.withUpstreamKeyer) {
          actionChains.camWithDve(config.inputMapping[options.programInput])
        } else {
          actionChains.camSolo(config.inputMapping[options.programInput])
        }
      },

      ChangeUpstreamKeyerFillSource: (options, value) => {
        actionChains.camInDve(config.inputMapping[options.fillSource])
      },

      ChangeProgramAndDveFillSource: (options, value) => {
        actionChains.camInDve(config.inputMapping[options.fillSource])
        actionChains.camWithDve(config.inputMapping[options.programInput])
      },

      SwitchProgramAndUpstreamKeyerFillSource: (options, value) => {
        actionChains.switchProgramAndDveSource()
      }
    }

    const controlActions = {
      ChangeDveScale: (options, value) => {
        console.log(`value:`, value)
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
          ...config.dve.stateMain,
          sizeX: value * 10,
          sizeY: value * 10,
        }
        myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        buttonLightOff(buttonsByAction('PhoneDve'))
        buttonLightOff(buttonsByAction('MonitorDve'))
        updateButtonsViaState()
      },
      ChangeDvePosition: (options, value) => {
        const me = 0
        const usk = 0
        // const pos = Math.floor(map(value, 0, 127, 0, Object.keys(positions).length))
        const pos = Math.floor(value % config.dve.positions.length)
        console.log(`pos:`, pos)
        console.log(`positions[pos]:`, config.dve.positions[pos])
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
          ...config.dve.stateCurrent,
          ...config.dve.positions[pos]
        }
        config.dve.stateMain = { ...config.dve.stateCurrent }
        myAtem.setUpstreamKeyerDVESettings({ rate: 10 })
        myAtem.setUpstreamKeyerFlyKeyKeyframe(me, usk, Enums.FlyKeyKeyFrame.A, {
          ...config.dve.stateMain,
          keyFrameId: Enums.FlyKeyKeyFrame.A,
          rate: 100,
        })
        myAtem.runUpstreamKeyerFlyKeyTo(me, usk, Enums.FlyKeyKeyFrame.A)
        // myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        buttonLightOff(buttonsByAction('PhoneDve'))
        buttonLightOff(buttonsByAction('MonitorDve'))
        updateButtonsViaState()
      },
      ChangeDveMask: (options, value) => {
        console.log(`value:`, value)
        let valueWithDirection = map(value, 0, 128, 0, 10000)
        console.log(`valueWithDirection:`, valueWithDirection)
        valueWithDirection = valueWithDirection % 5000
        console.log(`valueWithDirection:`, valueWithDirection)
        valueWithDirection = (value < 64) ? valueWithDirection - (10000/2) : valueWithDirection
        console.log(`valueWithDirection:`, valueWithDirection)
        config.dve.stateCurrent = {
          positionX: Math.round(config.dve.stateMain.positionX - (valueWithDirection) / 2),
          maskLeft: Math.round(9000 + valueWithDirection),
          maskRight: Math.round(9000 - valueWithDirection),
        }
        console.log(`dveStateLocal:`, config.dve.stateCurrent)
        myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        buttonLightOff(buttonsByAction('PhoneDve'))
        buttonLightOff(buttonsByAction('MonitorDve'))
        updateButtonsViaState()
      },

      ChangeAudioGainMain: (options, value) => {
        const audioIndex = 1301
        const channel = ['-65280'] //  stereo split channels: ['-255', '-256'] | joined channel: ['-65280']
        actionChains.changeAudioGain('ChangeAudioGainMain', audioIndex, channel, value)
      },
      ChangeAudioGainDisplay: (options, value) => {
        const audioIndex = 2
        const channel = ['-65280']
        actionChains.changeAudioGain('ChangeAudioGainDisplay', audioIndex, channel, value)
      },
      ChangeAudioGainPhone: (options, value) => {
        const audioIndex = 4
        const channel = ['-65280']
        actionChains.changeAudioGain('ChangeAudioGainPhone', audioIndex, channel, value)
      },
    }

    // Set up a new outputMidi.

    inputMidi.on('noteoff', (params) => {
      console.log(`params:`, params)
      const { note, velocity: value, channel } = params
      const buttonActionConfig = _.find(config.buttons, { note})
      console.log(`buttonAction:`, buttonActionConfig)
      const buttonAction = buttonActions[buttonActionConfig.action]
      if (buttonAction) buttonAction(buttonActionConfig, value)
    })

    inputMidi.on('cc', (params) => {
      console.log(`params:`, params)
      const { controller: note, value, channel } = params
      const controlActionConfig = _.find(config.controllers, { note })
      console.log(`controlAction:`, controlActionConfig)
      const controlAction = controlActions[controlActionConfig.action]
      if (controlAction) controlAction(controlActionConfig, value)
      updatecontrollerState({ [note]: { value }})
    })

    // Generic Midi Functions
    function buttonLightOn(btns) {
      btns = asArray(btns)
      console.log(`buttonLightOn:`, btns)
      for (const btn of btns) {
        const state = {}
        state[btn] = { state: 'noteon', velocity: 127 }
        updateButtonState(state)
      }
    }

    function buttonLightOff(btns) {
      btns = asArray(btns)
      console.log(`buttonLightOff:`, btns)
      for (const btn of btns) {
        const state = {}
        state[btn] = { state: 'noteoff', velocity: 0 }
        updateButtonState(state)
      }
    }

    function buttonsByAction(action) {
      return _.map(_.filter(config.buttons, (el) => el.action === action), (el) => el.note)
    }

    function controllersByAction(action) {
      return _.map(_.filter(config.controllers, (el) => el.action === action), (el) => el.note)
    }

    function updateButtonsViaState() {
      for (const btn of Object.keys(config.buttonState)) {
        const btnState = config.buttonState[btn]
        outputMidi.send(btnState.state, {
          note: btn,
          velocity: btnState.velocity,
          channel: config.midi.outputChannel,
        })
      }
    }

    function updateButtonState(buttonStates) {
      config.buttonState = merge(config.buttonState, buttonStates)
      // console.log(`updateButtonState:`, config.buttonState)
    }

    function updateDveButtons() {
      const buttonsForDveSelection = config.feedback.buttonsForActiveUpstreamKeyerFillSource
      const nameOfInput = Object.keys(config.inputMapping).find(key => config.inputMapping[key] === config.dve.fillSource)
      const buttonActiveDveFillSource = buttonsForDveSelection[nameOfInput]
      buttonLightOff(_.difference(_.flatten(Object.values(buttonsForDveSelection)), buttonActiveDveFillSource))
      buttonLightOn(buttonActiveDveFillSource)
    }

    function updateControllersViaState() {
      for (const cont of Object.keys(config.controllerState)) {
        const contState = config.controllerState[cont]
        outputMidi.send(contState.state, {
          controller: cont,
          value: contState.value,
          channel: config.midi.outputChannel,
        })
      }
    }

    function updatecontrollerState(controllerStates) {
      config.controllerState = merge(config.controllerState, controllerStates)
    }

    function resetControllersToDefault(contrls) {
      const state = {}
      for (const controller of contrls) {
        console.log(`config.controllerState:`, config.controllerState)
        config.controllerState[controller] = config.controllerStateDefault[controller]
      }
    }

    function runButtonStateUpdate(state, pathToChange = null) {
      const me = 0
      const usk = 0
      pathToChange = asArray(pathToChange)
      console.log(`pathToChange:`, pathToChange)
      for (const path of pathToChange) {
        const isInitial = (path === 'initial')
        if (isInitial) {
          actionChains.changeAudioGain('ChangeAudioGainMain', 1301, ['-65280'], 115)
          actionChains.changeAudioGain('ChangeAudioGainDisplay', 2, ['-65280'], 105)
          actionChains.changeAudioGain('ChangeAudioGainPhone', 4, ['-65280'], 105)
        }
        if (isInitial || path.includes('video.mixEffects')) {
          const programInput = state.video.mixEffects[me].programInput
          const hasDve = state.video.mixEffects[me].upstreamKeyers[usk].onAir
          const buttonsForProgramInputWithoutDve = config.feedback.buttonsForProgramInputWithoutDve
          const buttonsForProgramInputWithDve = config.feedback.buttonsForProgramInputWithDve
          const nameOfInput = Object.keys(config.inputMapping).find(key => config.inputMapping[key] === programInput)
          const buttonsForProgramInput = (hasDve) ? buttonsForProgramInputWithDve[nameOfInput] : buttonsForProgramInputWithoutDve[nameOfInput]
          const buttonsForProgramInputAll = [..._.flatten(Object.values(buttonsForProgramInputWithoutDve)), ..._.flatten(Object.values(buttonsForProgramInputWithDve))]
          buttonLightOff(_.difference(buttonsForProgramInputAll, buttonsForProgramInput))
          buttonLightOn(buttonsForProgramInput)

          updateDveButtons()

          if (config.transition.type === 'auto') buttonLightOn(buttonsByAction('AutoCutSwitch'))
          else buttonLightOff(buttonsByAction('AutoCutSwitch'))

          if (state.video.mixEffects[me].fadeToBlack.isFullyBlack) {
            buttonLightOn(buttonsByAction('FadeToBlack'))
          } else {
            buttonLightOff(buttonsByAction('FadeToBlack'))
          }
        }
      }

      updateControllersViaState()
      updateButtonsViaState()
    }
  }

  getStatus() {
    return this.status
  }

  connect(device) {
    this.status[device].connected = true
    console.log(`connect:`, device)
  }

  disconnect(device) {
    this.status[device].connected = false
    console.log(`disconnect:`, device)
  }

}

async function main() {
  const m2a = new MIDI2ATEM()
}

main()
