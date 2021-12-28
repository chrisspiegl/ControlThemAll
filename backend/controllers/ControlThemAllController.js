import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import queue from 'fastq'

import { BaseController } from './BaseController.js'

const args = yargs(hideBin(process.argv)).parse()

console.log('\n\n\nStarting Backend with args', args)

import { TauriController } from './TauriController.js'
import { WebserverController } from './WebserverController.js'

export class ControlThemAllController extends BaseController {
  constructor() {
    super({ handler: 'ControlThemAll' })
    this.controllers = []
    this.on('log', this.logMessage.bind(this))
    this.log('info', 'constructor')
    this.setup()
    return this
  }

  async setup() {
    this.log('info', 'setup')
    this.setupQueue()
    this.setupControllers()
  }

  setupQueue() {
    this.log('info', 'setupQueue')
    this.q = queue.promise(this.queueWorker.bind(this), 1)
  }

  async setupControllers() {
    this.log('info', 'setupControllers')

    this.tauriController = new TauriController({
      inTauri: args.t || args.tauri
    })
    this.controllers.push(this.tauriController)
    this.bindEvents(this.tauriController)
    await this.tauriController.connect()
    await this.tauriController.start()

    this.webserverController = new WebserverController()
    this.controllers.push(this.webserverController)
    this.bindEvents(this.webserverController)
    await this.webserverController.connect()
    if (!this.tauriController.inTauri()) {
      await this.webserverController.actionStart()
    }


    // TODO: this is just for testing purposes to instantly trigger something
    // this.controllers.forEach((el) => {
    //   if (el.handler === 'MidiController') {
    //     el.feedback('noteOff', {
    //       note: 0,
    //     })
    //   }
    // })
  }

  bindEvents(controller) {
    controller.on('actions', this.pushActionsToQueue.bind(this))
    // TODO: send log messages to frontend for display in text field
    controller.on('log', this.logMessage.bind(this))
    return controller
  }

  /**
   * This function is called continuously with the next queue element.
   * It waits for completion of the action.
   */
  async queueWorker(data) {
    this.log('info', 'queueQorker', 'working', data)
    const controller = this.controllers.find((el) => el.handler === data.handler)
    if (!controller) return this.log('info', 'actionHandler', `no controller with handler = ${data.handler}`)
    await controller.actionHandler(data)
    this.log('info', 'queueWorker', 'after action is finished')
  }

  /**
   * Push the actions into the queue if they are Object or Array.
   */
  async pushActionsToQueue(data) {
    if (data instanceof Array) data.forEach((el) => this.q.push(el))
    else if (data instanceof Object) this.q.push(data)
    else this.log('info', 'actionHandler', 'parameter is not object or array')
  }

  logMessage(data) {
    console.log(data)
  }
}
