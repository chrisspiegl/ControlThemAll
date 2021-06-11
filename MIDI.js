import midi from 'easymidi'
import { config } from './config.js'

export class MIDI {
  constructor(master) {
    this.master = master
    console.log(`Constructing MIDI Controller`)
    this.setup()
  }

  setup() {
    const midiInputs = midi.getInputs()
    console.log(`midiInputsByName:`, midiInputs)
    const midiOutputs = midi.getOutputs()
    console.log(`midiOutputsByName:`, midiOutputs)

    if (midiInputs.length <= 0) {
      console.log('No midi input device found')
      this.master.disconnect('midi')
    }

    if (midiOutputs.length <= 0) {
      console.log('No midi output device found')
      this.master.disconnect('midi')
    }

    if (!midiInputs.includes(config.midi.deviceName)) {
      console.log('Configured midi input device not found')
      this.master.disconnect('midi')
    }

    if (!midiOutputs.includes(config.midi.deviceName)) {
      console.log('Configured midi output device not found')
      this.master.disconnect('midi')
    }

    this.outputMidi = new midi.Output(config.midi.deviceName)
    this.inputMidi = new midi.Input(config.midi.deviceName)

    this.master.connect('midi')
  }
}

export default MIDI
