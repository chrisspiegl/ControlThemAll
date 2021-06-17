import midi from 'easymidi'
import debug from 'debug'
import { throttle } from 'throttle-debounce'
import { EventEmitter } from 'inf-ee'

import { config } from './config.js'

const CONNECTION_TIMEOUT = 5000 // ms
const CONNECTION_RETRY_INTERVAL = 1000 // ms
const THROTTLE_BUTTON_UPDATE = 250 // ms
const THROTTLE_CONTROLLER_UPDATE = 250 // ms

export const ConnectionState = {
  Closed: 0x00,
  Connected: 0x01,
}

export class MIDI extends EventEmitter {
  constructor(options = {}) {
    super()
    console.log(`Constructing MIDI Controller`)

    this.componentName = 'MIDI Controller'

    this.sessionId = -1

    this._reconnectTimer = undefined
    this._lastReceivedAt = undefined

    this._inputDeviceName = undefined
    this._outputDeviceName = undefined
    this._outputChannel = undefined

    this._input = undefined
    this._output = undefined

    return this
  }

  startTimers() {
    if (!this._reconnectTimer) {
      this._reconnectTimer = setInterval(async () => {
        if (this._lastReceivedAt + CONNECTION_TIMEOUT > Date.now()) {
          // console.log(`MIDI Connection Check: No need to check since we just heard form stuff`)
          // We heard from the midi controller recently
          return
        }

        if (!this.isConnected()) {
          this.log('info', `MIDI Connection Check Failed: sending for connection restart`)
          try {
            await this.restartConnection()
          } catch (e) {
            this.log('info', `MIDI Reconnect failed: ${e}`)
          }
        } else {
          // this.log('info', `MIDI Connection Check: still connected`)
        }
      }, CONNECTION_RETRY_INTERVAL)
    }
    // NOTE: not sure if I need this? Maybe for future reliability?
    // https://github.com/nrkno/tv-automation-atem-connection/blob/74ddb0e2f9d609d16bd673db075bdc143f691eae/src/lib/atemSocketChild.ts#L349
    // Check for retransmits every 10 milliseconds
    // if (!this._retransmitTimer) {
    //   this._retransmitTimer = setInterval(() => this._checkForRetransmit(), 10)
    // }
  }

  async connect(options = {}) {
    this._inputDeviceName = options.inputDeviceName || 'X-TOUCH MINI'
    this._outputDeviceName = options.outputDeviceName || 'X-TOUCH MINI'
    this._outputChannel = options.outputChannel || 10
    this.startTimers()
    await this.restartConnection()
  }

  async disconnect() {
    // Stop timers, as they just cause pointless work now.
    if (this._reconnectTimer) {
      clearInterval(this._reconnectTimer)
      this._reconnectTimer = undefined
    }

    if (this._input) this._input.close()
    if (this._output) this._output.close()

    this._connectionState = ConnectionState.Closed
    this.emit('disconnect', { sessionId: this.sessionId })
  }

  async restartConnection() {
    // This includes a 'disconnect'
    if (this._connectionState === ConnectionState.Connected) {
      if (this._input) {
        this._input.close()
        this._input = undefined
      }
      if (this._output) {
        this._output.close()
        this._output = undefined
      }
      this._connectionState = ConnectionState.Closed
      this.emit('disconnect', { sessionId: this.sessionId })
    }

    this.log('warn', `Trying to Reconnect`)

    // Try doing reconnect
    const midiInputsByName = midi.getInputs()
    const midiOutputsByName = midi.getOutputs()

    if (!midiInputsByName.includes(this._inputDeviceName)) {
      this.log('info', `Reconnect failed: input device '${this._inputDeviceName}' not found`)
      return
    }

    if (!midiOutputsByName.includes(this._outputDeviceName)) {
      this.log('info', `Reconnect failed: output device '${this._outputDeviceName}' not found`)
      return
    }

    this.connectOutput()
    this.connectInput()

    this._connectionState = ConnectionState.Connected
    this.sessionId = this.sessionId + 1
    this.emit('connect', { isReconnect: (this.sessionId > 0), sessionId: this.sessionId })
  }

  connectOutput() {
    this._output = new midi.Output(this._outputDeviceName)
    this.log('info', `Connected Output: ${this._outputDeviceName}`)
  }

  connectInput() {
    this._input = new midi.Input(this._inputDeviceName)
    this.log('info', `Connected Input: ${this._inputDeviceName}`)

    this._input.on('message', (msg) => {
      this._lastReceivedAt = Date.now()
      this.log('info', `${this._inputDeviceName}:`, msg);
    })

    this._input.on('noteoff', (params) => this.emit('noteoff', params))
    this._input.on('noteoff', (params) => this.emit('noteOff', params))
    this._input.on('noteon', (params) => this.emit('noteon', params))
    this._input.on('noteon', (params) => this.emit('noteOn', params))
    this._input.on('poly aftertouch', (params) => this.emit('poly aftertouch', params))
    this._input.on('poly aftertouch', (params) => this.emit('polyAftertouch', params))
    this._input.on('cc', (params) => this.emit('cc', params))
    this._input.on('cc', (params) => this.emit('controllerChange', params))
    this._input.on('program', (params) => this.emit('program', params))
    this._input.on('channel aftertouch', (params) => this.emit('channel aftertouch', params))
    this._input.on('channel aftertouch', (params) => this.emit('channelAftertouch', params))
    this._input.on('pitch', (params) => this.emit('pitch', params))
    this._input.on('position', (params) => this.emit('position', params))
    this._input.on('select', (params) => this.emit('select', params))
    this._input.on('clock', (params) => this.emit('clock', params))
    this._input.on('start', (params) => this.emit('start', params))
    this._input.on('continue', (params) => this.emit('continue', params))
    this._input.on('stop', (params) => this.emit('stop', params))
    this._input.on('reset', (params) => this.emit('reset', params))
  }

  isConnected() {
    const midiInputsByName = midi.getInputs()
    const midiOutputsByName = midi.getOutputs()
    let connectionCheckFailed = false

    if (typeof this._input === 'undefined') {
      // this.log('info', 'Connection Check Failed: no connection established')
      return false
    }
    if (!connectionCheckFailed && typeof this._output === 'undefined') {
      // this.log('info', 'Connection Check Failed: no connection established')
      return false
    }

    if (!connectionCheckFailed && !midiInputsByName.includes(this._inputDeviceName)) {
      // this.log('info', `Connection Check Failed: input device '${this._inputDeviceName}' not found`)
      return false
    }
    if (!connectionCheckFailed && !midiOutputsByName.includes(this._outputDeviceName)) {
      // this.log('info', `Connection Check Failed: output device '${this._outputDeviceName}' not found`)
      return false
    }

    return true
  }

  send(msgType, options) {
    const optionsDefault = {
      note: undefined,
      velocity: undefined,
      value: undefined,
      channel: this._outputChannel,
    }
    options = { ...optionsDefault, ...options }
    if (this.isConnected()) this._output.send(msgType || 'noteoff', options)
    else {
      this.log('info', `NOT CONNECTED & COMMAND NOT SENT`)
    }
  }

  sendNoteOff(options) {
    this.send('noteoff', options)
  }

  sendNoteOn(options) {
    this.send('noteon', options)
  }

  sendController(options) {
    this.send('cc', options)
  }

  sendControllerChange(options) {
    this.send('cc', options)
  }

  updateButtonsViaStateInstant(buttonStates) {
    this.log('debug', 'updateButtonsViaStateInstant')
    buttonStates.forEach((btn) => {
      this.send(btn.state || 'noteoff', {
        note: btn.note,
        velocity: btn.value || btn.defaultValue || 0,
        channel: btn.channel || config.midi.outputChannel,
      })
    })
  }

  updateButtonsViaState(buttonStates, instant = false) {
    this.log('debug', 'updateButtonsViaState')
    if (instant) this.updateButtonsViaStateInstant(buttonStates)
    else {
      if (!this.updateButtonsViaStateThrottled) {
        this.updateButtonsViaStateThrottled = throttle(THROTTLE_BUTTON_UPDATE, false, (buttonStates) => {
          this.log('debug', 'updateButtonsViaStateThrottled')
          return this.updateButtonsViaStateInstant(buttonStates)
        })
      }
      this.updateButtonsViaStateThrottled(buttonStates)
    }
  }

  updateControllersViaStateInstant(controllerStates) {
    this.log('debug', 'updateControllersViaStateInstant')
    controllerStates.forEach((controller) => {
      const { state, note, value, channel, defaultValue } = controller
      this.sendControllerChange({
        controller: note,
        value: value || defaultValue || 0,
        channel: channel || config.midi.outputChannel,
      })
    })
  }

  updateControllersViaState(controllerStates, instant = false) {
    this.log('debug', 'updateControllersViaState')
    if (instant) this.updateControllersViaStateInstant(controllerStates)
    else {
      if (!this.updateControllersViaStateThrottled) {
        this.updateControllersViaStateThrottled = throttle(THROTTLE_CONTROLLER_UPDATE, false, (controllerStates) => {
          this.log('debug', 'updateControllersViaStateThrottled')
          return this.updateControllersViaStateInstant(controllerStates)
        })
      }
      this.updateControllersViaStateThrottled(controllerStates)
    }
  }

  log(level, ...args) {
    if (this.onLog) this.onLog(this.componentName, level.toLowerCase(), args)
    else debug(`sio:midi:${level.toLowerCase()}`, args)
  }
}

export default MIDI
