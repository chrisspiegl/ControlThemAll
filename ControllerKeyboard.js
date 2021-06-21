import debug from 'debug'
import { EventEmitter } from 'inf-ee'
import { clipboard, keyboard, Key } from "@nut-tree/nut-js"
import { asArray } from './utils.js'

const log = debug(`sio:keyboard`)

export class ControllerKeyboard extends EventEmitter {
  constructor(options = {}) {
    super()
    console.log(`Constructing Keyboard Controller`)

    this.componentName = 'Keyboard Controller'

    return this
  }

  async connect(options = {}) {
    // keyboard.nativeAdapter.keyboard.setKeyboardDelay(0)
    // keyboard.config.autoDelayMs = 0
    this.emit('connected')
  }

  disconnect() {
    this.emit('disconnect')
  }

  fire(keys) {
    keys = asArray(keys).map((key) => this.mapKey(key))
    for (const key of keys) {
      if (!key.keyCode || !Number.isInteger(key.keyCode, 10)) {
        this.log('error', `Keyboard Combination Contains undefined or not a number: ${key.keyName} = ${key.keyCode}`)
        return
      }
    }
    console.log(keys)
    this.log('info', 'Sending Keyboard Shortcut:', keys.map((key) => key.keyName).join(' + '))
    return keyboard.type.apply(keyboard, keys.map((key) => key.keyCode))
  }

  pressKey(keys) {
    keys = asArray(keys).map((key) => this.mapKey(key))
    for (const key of keys) {
      if (!key.keyCode || !Number.isInteger(key.keyCode, 10)) {
        this.log('error', `Keyboard Combination Contains undefined or not a number: ${key.keyName} = ${key.keyCode}`)
        return
      }
    }
    this.log('info', `Pressing Keyboard Shortcut:`, keys.map((key) => key.keyName).join(' + '))
    return keyboard.pressKey.apply(keyboard, keys.map((key) => key.keyCode))

  }

  releaseKey(keys) {
    keys = asArray(keys).map((key) => this.mapKey(key))
    for (const key of keys) {
      if (!key.keyCode || !Number.isInteger(key.keyCode, 10)) {
        this.log('error', `Keyboard Combination Contains undefined or not a number: ${key.keyName} = ${key.keyCode}`)
        return
      }
    }
    this.log('info', `Releaseing Keyboard Shortcut:`, keys.map((key) => key.keyName).join(' + '))
    return keyboard.releaseKey.apply(keyboard, keys.map((key) => key.keyCode))
  }

  typeViaKeyboard(text) {
    this.log('info', `Typing via Keyboard: ${text}`)
    return keyboard.type(text)
  }

  typeViaClipboard(text) {
    clipboard.copy(text)
    this.log('info', `Type via Clipboard: ${text}`)
    return this.fire([Key.LeftSuper, Key.V])
  }

  type(text) {
    return this.typeViaClipboard(text)
  }

  mapKey(key) {
    key = (key.length === 1) ? key.toUpperCase() : key
    return {
      key,
      keyName: Number.isInteger(key) ? Key[`${key}`] : key ,
      keyCode: Number.isInteger(key) ? key : Key[key]
    }
  }

  log(level, ...args) {
    this.emit('log', { component: this.componentName, level: level.toLowerCase(), message: args })
    log(`${level}: ${args.join(' ')}`)
  }
}

export default ControllerKeyboard
