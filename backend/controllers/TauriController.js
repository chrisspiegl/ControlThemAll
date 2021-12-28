import { BaseController } from './BaseController.js'
import readline from 'readline'
import is from '@sindresorhus/is'

export class TauriController extends BaseController {
  constructor(options = {}) {
    super({ handler: 'TauriController' })
    this._inTauri = options.inTauri || false
    this.actions = [
      {
        name: 'log',
        description: 'send log messsage to frontend',
        action: this.actionLog.bind(this),
      },
      {
        name: 'sendCommand',
        description: 'send command to frontend',
        action: this.actionSendCommand.bind(this),
      },
    ]
    return this
  }

  async connect(options = {}) {
    this.log('debug', 'connect')
    this.log('info', 'connect', `Running ${this.inTauri() ? 'Tauri' : 'Standalone'}`)
  }

  async disconnect(options = {}) {
    this.log('debug', 'disconnect')
  }

  async start() {
    this.log('debug', 'start')
    if (!this.inTauri()) {
      return this.log('info', 'start', 'not running in tauri, and not starting to readline')
    }
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    })
    this.rl.on('line', this.receiveLine.bind(this))
    return this.log('info', 'start', 'listening for tauri messages on stdin')
  }

  async stop() {
    this.log('debug', 'stop')
    this.rl.close()
    this.log('info', 'stop', 'stopped listening for tauri messages on stdin')
  }

  async actionLog(params) {
    this.send(params)
  }
  async actionSendCommand(params) {
    this.send(params.data)
  }

  receiveLine(line) {
    let lineJson = { _lineOriginal: line }
    if (!line.startsWith('toBackend:')) return
    line = line.slice('toBackend:'.length)
    try {
      lineJson = {
        ...lineJson,
        ...JSON.parse(line),
      }
      if (lineJson.actions) {
        lineJson.actions = is.array(lineJson.actions) ? lineJson.actions : [lineJson.actions]
        this.log('info', 'feedback', { handler: this.handler }, { actions: lineJson.actions })
        this.feedbackToAction({ handler: this.handler }, { actions: lineJson.actions })
      }
    } catch (error) {
      // ignored because we are just trying to parse the JSON if it fails that's ok
    }
    this.log('debug', 'onLine', 'received message on stdin', lineJson)
  }

  feedbackToAction(params, config) {
    this.emit('actions', config.actions)
  }

  sendLine(data) {
    if (this.inTauri()) {
      console.log(`toFrontend:${JSON.stringify(data)}`)
      this.log('debug', 'send', 'wrote message to stdout', data)
    } else {
      this.log('debug', 'send', 'message not sent because not running in tauri', data)
    }
  }

  send(data) {
    return this.sendLine(data)
  }

  inTauri() {
    return this._inTauri
  }
}
