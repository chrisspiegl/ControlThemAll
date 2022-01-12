import midi from 'easymidi'
import debug from 'debug'
import { throttle } from 'throttle-debounce'
import { EventEmitter } from 'inf-ee'

const log = debug('sio:midi')

const CONNECTION_TIMEOUT = 5000 // Ms
const CONNECTION_RETRY_INTERVAL = 4000 // Ms
const THROTTLE_BUTTON_UPDATE = 250 // Ms
const THROTTLE_CONTROLLER_UPDATE = 250 // Ms

export const ConnectionState = {
  Closed: 0x00,
  Connected: 0x01,
}

export class ControllerMidi extends EventEmitter {
  constructor(options = {}) {
    super()
    console.log('Constructing MIDI Controller')

    this.componentName = 'MIDI Controller'

    this.config = options.config || undefined

    this.sessionId = -1

    this._reconnectTimer = undefined
    this._lastReceivedAt = undefined

    this._inputDeviceName = undefined
    this._outputDeviceName = undefined
    this._outputChannel = undefined

    this._input = undefined
    this._output = undefined
  }

  startTimers() {
    if (!this._reconnectTimer) {
      this._reconnectTimer = setInterval(async () => {
        if (this._lastReceivedAt + CONNECTION_TIMEOUT > Date.now()) {
          // Console.log(`MIDI Connection Check: No need to check since we just heard form stuff`)
          // We heard from the midi controller recently
          return
        }

        if (!this.isConnected()) {
          this.log('info', 'MIDI Connection Check Failed: sending for connection restart')
          try {
            await this.restartConnection()
          } catch (error) {
            this.log('info', `MIDI Reconnect failed: ${error}`)
          }
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

    if (this._input) {
      this._input.close()
    }

    if (this._output) {
      this._output.close()
    }

    this._connectionState = ConnectionState.Closed
    this.emit('disconnect', { sessionId: this.sessionId })
    return { sessionId: this.sessionId }
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

    this.log('warn', 'Trying to Reconnect')

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
    this.sessionId += 1
    this.emit('connect', { isReconnect: this.sessionId > 0, sessionId: this.sessionId })
  }

  connectOutput() {
    this._output = new midi.Output(this._outputDeviceName)
    this.log('info', `Connected Output: ${this._outputDeviceName}`)
  }

  connectInput() {
    this._input = new midi.Input(this._inputDeviceName)
    this.log('info', `Connected Input: ${this._inputDeviceName}`)

    this._input.on('message', (message) => {
      this._lastReceivedAt = Date.now()
      this.log('info', `${this._inputDeviceName}:`, message)
    })

    this._input.on('noteoff', (parameters) => this.emit('noteoff', parameters))
    this._input.on('noteoff', (parameters) => this.emit('noteOff', parameters))
    this._input.on('noteon', (parameters) => this.emit('noteon', parameters))
    this._input.on('noteon', (parameters) => this.emit('noteOn', parameters))
    this._input.on('poly aftertouch', (parameters) => this.emit('poly aftertouch', parameters))
    this._input.on('poly aftertouch', (parameters) => this.emit('polyAftertouch', parameters))
    this._input.on('cc', (parameters) => this.emit('cc', parameters))
    this._input.on('cc', (parameters) => this.emit('controllerChange', parameters))
    this._input.on('program', (parameters) => this.emit('program', parameters))
    this._input.on('channel aftertouch', (parameters) => this.emit('channel aftertouch', parameters))
    this._input.on('channel aftertouch', (parameters) => this.emit('channelAftertouch', parameters))
    this._input.on('pitch', (parameters) => this.emit('pitch', parameters))
    this._input.on('position', (parameters) => this.emit('position', parameters))
    this._input.on('select', (parameters) => this.emit('select', parameters))
    this._input.on('clock', (parameters) => this.emit('clock', parameters))
    this._input.on('start', (parameters) => this.emit('start', parameters))
    this._input.on('continue', (parameters) => this.emit('continue', parameters))
    this._input.on('stop', (parameters) => this.emit('stop', parameters))
    this._input.on('reset', (parameters) => this.emit('reset', parameters))
  }

  isConnected() {
    const midiInputsByName = midi.getInputs()
    const midiOutputsByName = midi.getOutputs()
    const connectionCheckFailed = false

    if (typeof this._input === 'undefined') {
      // This.log('info', 'Connection Check Failed: no connection established')
      return false
    }

    if (!connectionCheckFailed && typeof this._output === 'undefined') {
      // This.log('info', 'Connection Check Failed: no connection established')
      return false
    }

    if (!connectionCheckFailed && !midiInputsByName.includes(this._inputDeviceName)) {
      // This.log('info', `Connection Check Failed: input device '${this._inputDeviceName}' not found`)
      return false
    }

    if (!connectionCheckFailed && !midiOutputsByName.includes(this._outputDeviceName)) {
      // This.log('info', `Connection Check Failed: output device '${this._outputDeviceName}' not found`)
      return false
    }

    return true
  }

  send(messageType, options) {
    const optionsDefault = {
      note: undefined,
      velocity: undefined,
      value: undefined,
      channel: this._outputChannel,
    }
    options = { ...optionsDefault, ...options }
    if (this.isConnected()) {
      this._output.send(messageType || 'noteoff', options)
    } else {
      this.log('info', 'NOT CONNECTED & COMMAND NOT SENT')
    }
  }

  sendControllerChange(options) {
    this.send('cc', options)
  }

  updateButtonsViaStateInstant(buttonStates) {
    for (const btn of buttonStates) {
      let state = (btn.state || 'noteoff').toLowerCase()
      if (['flashingon', 'flashingoff'].includes(state)) {
        btn.state = state === 'flashingon' ? 'flashingoff' : 'flashingon'
        state = state === 'flashingon' ? 'noteoff' : 'noteon'
      }

      this.send(state, {
        note: btn.note,
        velocity: btn.value || btn.defaultValue || 0,
        channel: btn.channel || this.config?.midi?.outputChannel || 10,
      })
    }
  }

  updateButtonsViaState(buttonStates, instant = false) {
    // This.log('debug', 'updateButtonsViaState')
    if (instant) {
      // This.log('debug', 'updateButtonsViaStateInstant')
      this.updateButtonsViaStateInstant(buttonStates)
    } else {
      if (!this.updateButtonsViaStateThrottled) {
        this.updateButtonsViaStateThrottled = throttle(THROTTLE_BUTTON_UPDATE, false, (buttonStates) =>
          // This.log('debug', 'updateButtonsViaStateThrottled')
          this.updateButtonsViaStateInstant(buttonStates),
        )
      }

      this.updateButtonsViaStateThrottled(buttonStates)
    }
  }

  updateControllersViaStateInstant(controllerStates) {
    for (const controller of controllerStates) {
      const { note, value, channel } = controller
      this.sendControllerChange({
        controller: note,
        value,
        channel: channel || this.config?.midi?.outputChannel || 10,
      })
    }
  }

  updateControllersViaState(controllerStates, instant = false) {
    // This.log('debug', 'updateControllersViaState')
    if (instant) {
      // This.log('debug', 'updateControllersViaStateInstant')
      this.updateControllersViaStateInstant(controllerStates)
    } else {
      if (!this.updateControllersViaStateThrottled) {
        this.updateControllersViaStateThrottled = throttle(THROTTLE_CONTROLLER_UPDATE, false, (controllerStates) =>
          // This.log('debug', 'updateControllersViaStateThrottled')
          this.updateControllersViaStateInstant(controllerStates),
        )
      }

      this.updateControllersViaStateThrottled(controllerStates)
    }
  }

  log(level, ...args) {
    this.emit('log', { component: this.componentName, level: level.toLowerCase(), message: args })
    log(`${level.toLowerCase()}: ${args}`)
  }
}

export default ControllerMidi
