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
  }

  setup() {
    const exitHandler = async (options, exitCode) => {
      console.log(`exitHandler with exitCode:${exitCode || 'NONE'}`)

      if (options.cleanup) {
        console.log('Server closing: Doing the cleanup.')
        buttonLightOff(_.flatten(config.buttons.map((el) => [el.note])))
        updateButtonsViaState()
        updatecontrollerState(config.controllers.map((el) => merge(el, { state: 'cc', value: 0 })))
        updateControllersViaState()

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
    // process.on('exit', exitHandler.bind(null, { exit: true }))
    // catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { cleanup: true }))
    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
    process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))
    // catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { exit: true }))
    process.on('unhandledRejection', async (reason) => {
      console.log(`UNHANDLED:`, reason)
    })


    this.midi = new MIDI(this)
    this.atem = new ATEM(this)

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

      changeAudioGain: (options, value) => { // expected value == between 0 and 127
        const { note, audioIndex, channels, defaultValue, range } = options
        value = value || defaultValue || 0
        const faderGain = map(value, 0, 127, range.min, range.max)

        for (const channel of asArray(channels)) {
          myAtem.setFairlightAudioMixerSourceProps(audioIndex, channel, { faderGain })
        }
        updatecontrollerState(controllersByName(options.name), { value }, 'name')
        updateControllersViaState()
      }
    }

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
        myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        resetControllersToDefault(controllersByAction('ChangeDveScale'))
        updateControllersViaState()
        console.log(`options.buttonLightOff:`, options.buttonsLightOff)
        if (options.buttonsLightOn) buttonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) buttonLightOff(options.buttonsLightOff)
        updateButtonsViaState()
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
        myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        resetControllersToDefault(controllersByAction('ChangeDvePosition'))
        updateControllersViaState()
        if (options.buttonsLightOn) buttonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) buttonLightOff(options.buttonsLightOff)
        updateButtonsViaState()
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
        myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        resetControllersToDefault(controllersByAction('ChangeDveMask'))
        updateControllersViaState()
        if (options.buttonsLightOn) buttonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) buttonLightOff(options.buttonsLightOff)
        updateButtonsViaState()
      },

      ResetAudioGain: (options, value) => actionChains.changeAudioGain(options),

      // ResetDveAll: () => {
      //   config.dve.stateCurrent = {
      //     ...config.dve.stateDefault,
      //   }
      //   config.dve.stateMain = { ...config.dve.stateCurrent }
      //   myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
      //   resetControllersToDefault(controllersByAction('ChangeDveMask'))
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
        if (options.buttonsLightOn) buttonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) buttonLightOff(options.buttonsLightOff)
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
        const { defaultValue } = options
        value = value || defaultValue || 0
        console.log(`value:`, value)
        config.dve.stateCurrent = {
          ...config.dve.stateDefault,
          ...config.dve.stateMain,
          sizeX: value * 10,
          sizeY: value * 10,
        }
        myAtem.setUpstreamKeyerDVESettings(config.dve.stateCurrent)
        updatecontrollerState(controllersByAction('ChangeDveScale'), { value })
        updateControllersViaState()
        if (options.buttonsLightOn) buttonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) buttonLightOff(options.buttonsLightOff)
        updateButtonsViaState()
      },
      ChangeDvePosition: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
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
        updatecontrollerState(controllersByAction('ChangeDvePosition'), { value })
        updateControllersViaState()
        if (options.buttonsLightOn) buttonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) buttonLightOff(options.buttonsLightOff)
        updateButtonsViaState()
      },
      ChangeDveMask: (options, value) => {
        const { defaultValue } = options
        value = value || defaultValue || 0
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
        updatecontrollerState(controllersByAction('ChangeDveMask'), { value })
        updateControllersViaState()
        if (options.buttonsLightOn) buttonLightOn(options.buttonsLightOn)
        if (options.buttonsLightOff) buttonLightOff(options.buttonsLightOff)
        updateButtonsViaState()
      },

      ChangeAudioGain: (options, value) => actionChains.changeAudioGain(options, value),
    }

    // Set up a new outputMidi.

    inputMidi.on('noteoff', (params) => {
      console.log(`noteoff with params:`, params)
      const { note, velocity: value, channel } = params
      const buttonActionConfig = _.find(config.buttons, { note})
      console.log(`buttonAction:`, buttonActionConfig)
      const buttonAction = buttonActions[buttonActionConfig.action]
      if (buttonAction) buttonAction(buttonActionConfig, value)
    })

    inputMidi.on('cc', (params) => {
      console.log(`cc with params:`, params)
      const { controller: note, value, channel } = params
      const controlActionConfig = _.find(config.controllers, { note })
      const controlAction = controlActions[controlActionConfig.action]
      if (controlAction) controlAction(controlActionConfig, value)
    })

    // Generic Midi Functions
    function buttonLightOn(btns) {
      btns = asArray(btns)
      console.log(`buttonLightOn:`, btns)
      btns = btns.map((btn) => { return { note: btn }})
      updateButtonState(btns, { state: 'noteon', value: 127 }, 'note')
    }

    function buttonLightOff(btns) {
      btns = asArray(btns)
      console.log(`buttonLightOn:`, btns)
      btns = btns.map((btn) => { return { note: btn }})
      updateButtonState(btns, { state: 'noteoff', value: 0 }, 'note')
    }

    function buttonsByAction(action) {
      return _.map(_.filter(config.buttons, (el) => el.action === action), (el) => el.note)
    }

    function controllersByAction(action) {
      return _.filter(config.controllers, (el) => el.action === action)
    }

    function controllersByName(name) {
      return _.filter(config.controllers, (el) => el.name === name)
    }

    function updateButtonsViaState() {
      console.log(`updateButtonsViaState`)
      config.buttons.forEach((btn) => {
        // console.log(`btn:`, btn)
        // console.log(`this:`, {
        //   note: btn.note,
        //   velocity: btn.value || btn.defaultValue || 0,
        //   channel: btn.channel || config.midi.outputChannel,
        // })
        outputMidi.send(btn.state || 'noteoff', {
          note: btn.note,
          velocity: btn.value || btn.defaultValue || 0,
          channel: btn.channel || config.midi.outputChannel,
        })
      })
    }

    function updateButtonState(buttonStates, overwrite = {}, via = 'action') {
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

    function updateDveButtons() {
      const buttonsForDveSelection = config.feedback.buttonsForActiveUpstreamKeyerFillSource
      const nameOfInput = Object.keys(config.inputMapping).find(key => config.inputMapping[key] === config.dve.fillSource)
      const buttonActiveDveFillSource = buttonsForDveSelection[nameOfInput]
      buttonLightOff(_.difference(_.flatten(Object.values(buttonsForDveSelection)), buttonActiveDveFillSource))
      buttonLightOn(buttonActiveDveFillSource)
    }

    function updateControllersViaState() {
      console.log(`updateControllersViaState`)
      const { controllers } = config
      controllers.forEach((controller) => {
        const { state, note, value, channel, defaultValue } = controller
        outputMidi.send(state || 'cc', {
          controller: note,
          value: value || defaultValue || 0,
          channel: channel || config.midi.outputChannel,
        })
      })
    }

    function updatecontrollerState(controllerStates, overwrite = {}, via = 'action') {
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

    function resetControllersToDefault(controllerStates) {
      console.log(`resetControllersToDefault:`, controllerStates)
      controllerStates = asArray(controllerStates)
      const { controllers } = config
      controllerStates = controllerStates.map((controllerState) => merge(controllerState, { state: 'cc', value: controllerState.defaultValue || 0 }))
      controllers.map((controller) => {
        let updatedControllerState = _.find(controllerStates, (el) => el.action === controller.action)
        if (updatedControllerState) controller.value = updatedControllerState.value
        return controller
      })
    }

    function runButtonStateUpdate(state, pathToChange = null) {
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
              const controlAction = controlActions[controller.action]
              console.log(`controlAction:`, controller.action)
              if (controlAction) controlActions[controller.action](controller)
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
