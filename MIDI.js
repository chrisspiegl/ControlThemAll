import midi from 'easymidi'
import { config } from './config.js'

const CONNECTION_TIMEOUT = 5000 // ms
const CONNECTION_RETRY_INTERVAL = 1000 // ms

export const ConnectionState = {
  Closed: 0x00,
  Connected: 0x01,
}

export class MIDI {
  constructor(options) {
    console.log(`Constructing MIDI Controller`)

    this.sessionId = -1
    this.onDisconnect = options.onDisconnect || undefined
    this.onConnect = options.onConnect || undefined

    this.onMessage = options.onMessage || undefined
    this.onNoteOff = options.onNoteOff || undefined
    this.onNoteOn = options.onNoteOn || undefined
    this.onPolyAftertouch = options.onPolyAftertouch || undefined
    this.onControllerChange = options.onControllerChange || options.onCc || undefined
    this.onProgram = options.onProgram || undefined
    this.onChannelAftertouch = options.onChannelAftertouch || undefined
    this.onPitch = options.onPitch || undefined
    this.onPosition = options.onPosition || undefined
    this.onSelect = options.onSelect || undefined
    this.onClock = options.onClock || undefined
    this.onStart = options.onStart || undefined
    this.onContinue = options.onContinue || undefined
    this.onStop = options.onStop || undefined
    this.onReset = options.onReset || undefined

    // input.on('noteoff', msg => console.log('noteoff', msg.note, msg.velocity, msg.channel))
    // input.on('noteon', msg => console.log('noteon', msg.note, msg.velocity, msg.channel))
    // input.on('poly aftertouch', msg => console.log('poly aftertouch', msg.note, msg.pressure, msg.channel))
    // input.on('cc', msg => console.log('cc', msg.controller, msg.value, msg.channel))
    // input.on('program', msg => console.log('program', msg.number, msg.channel))
    // input.on('channel aftertouch', msg => console.log('channel aftertouch', msg.pressure, msg.channel))
    // input.on('pitch', msg => console.log('pitch', msg.value, msg.channel))
    // input.on('position', msg => console.log('position', msg.value))
    // input.on('select', msg => console.log('select', msg.song))
    // input.on('clock', () => console.log('clock'))
    // input.on('start', () => console.log('start'))
    // input.on('continue', () => console.log('continue'))
    // input.on('stop', () => console.log('stop'))
    // input.on('reset', () => console.log('reset'))

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
          console.log(`MIDI Connection Check Failed: sending for connection restart`)
          try {
            await this.restartConnection()
          } catch (e) {
            console.log(`MIDI Reconnect failed: ${e}`)
          }
        } else {
          // console.log(`MIDI Connection Check: still connected`)
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

  async connect(options) {
    this._inputDeviceName = options.inputDeviceName || 'X-TOUCH MINI'
    this._outputDeviceName = options.outputDeviceName || 'X-TOUCH MINI'
    this._outputChannel = options.outputChannel || 10
    this.startTimers()
    this.restartConnection()
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
    if (this.onDisconnect) await this.onDisconnect({ sessionId: this.sessionId })
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
      if (this.onDisconnect) await this.onDisconnect({ sessionId: this.sessionId })
    }

    console.log('MIDI Trying to Reconnect')

    // Try doing reconnect
    const midiInputsByName = midi.getInputs()
    const midiOutputsByName = midi.getOutputs()

    if (!midiInputsByName.includes(this._inputDeviceName)) {
      console.log(`MIDI Reconnect failed: midi input device '${this._inputDeviceName}' not found`)
      return
    }

    if (!midiOutputsByName.includes(this._outputDeviceName)) {
      console.log(`MIDI Reconnect failed: midi output device '${this._outputDeviceName}' not found`)
      return
    }

    this.connectOutput()
    this.connectInput()

    this._connectionState = ConnectionState.Connected
    this.sessionId = this.sessionId + 1
    if (this.onConnect) this.onConnect({
      isReconnect: (this.sessionId > 0),
      sessionId: this.sessionId,
    })
  }

  connectOutput() {
    this._output = new midi.Output(this._outputDeviceName)
    console.log(`MIDI Connected Output: ${this._outputDeviceName}`)
  }

  connectInput() {
    this._input = new midi.Input(this._inputDeviceName)
    console.log(`MIDI Connected Input: ${this._inputDeviceName}`)

    this._input.on('message', (msg) => {
      this._lastReceivedAt = Date.now()
      console.log(`${this._inputDeviceName}:`, msg);
    })

    if (this.onNoteOff) this._input.on('noteoff', this.onNoteOff)
    if (this.onNoteOn) this._input.on('noteon', this.onNoteOn)
    if (this.onPolyAftertouch) this._input.on('poly aftertouch', this.onPolyAftertouch)
    if (this.onControllerChange) this._input.on('cc', this.onControllerChange)
    if (this.onProgram) this._input.on('program', this.onProgram)
    if (this.onChannelAftertouch) this._input.on('channel aftertouch', this.onChannelAftertouch)
    if (this.onPitch) this._input.on('pitch', this.onPitch)
    if (this.onPosition) this._input.on('position', this.onPosition)
    if (this.onSelect) this._input.on('select', this.onSelect)
    if (this.onClock) this._input.on('clock', this.onClock)
    if (this.onStart) this._input.on('start', this.onStart)
    if (this.onContinue) this._input.on('continue', this.onContinue)
    if (this.onStop) this._input.on('stop', this.onStop)
    if (this.onReset) this._input.on('reset', this.onReset)
  }

  isConnected() {
    const midiInputsByName = midi.getInputs()
    const midiOutputsByName = midi.getOutputs()
    let connectionCheckFailed = false

    if (typeof this._input === 'undefined') {
      // console.log('MIDI Connection Check Failed: no connection established')
      return false
    }
    if (!connectionCheckFailed && typeof this._output === 'undefined') {
      // console.log('MIDI Connection Check Failed: no connection established')
      return false
    }

    if (!connectionCheckFailed && !midiInputsByName.includes(this._inputDeviceName)) {
      // console.log(`MIDI Connection Check Failed: midi input device '${this._inputDeviceName}' not found`)
      return false
    }
    if (!connectionCheckFailed && !midiOutputsByName.includes(this._outputDeviceName)) {
      // console.log(`MIDI Connection Check Failed: midi output device '${this._outputDeviceName}' not found`)
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
      console.log(`COMMAND NOT SENT BECAUSE MIDI CONTROLLER NOT CONNECTED`)
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
}

export default MIDI
