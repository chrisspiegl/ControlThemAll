import { EventEmitter } from 'inf-ee'
import is from '@sindresorhus/is'

const config = {
  triggers: {
    MidiController: [
      {
        name: 'noteOff',
        note: 0,
        actions: [
          {
            handler: 'SystemController',
            name: 'Delay',
            duration: 1000,
          },
          {
            handler: 'AtemController',
            name: 'FadeToBlack',
          },
        ],
      },
      {
        name: 'noteOn',
        note: 0,
        actions: [
          {
            handler: 'AtemController',
            name: 'ChangeProgramSource',
            programInput: 1,
          },
        ],
      },
    ],
    AtemController: [
      {
        name: 'FadeToBlack',
        actions: [
          {
            handler: 'MidiController',
            name: 'noteOn',
            note: 1,
          },
        ],
      },
      {
        name: 'ChangeProgramSource',
        actions: [
          {
            handler: 'MidiController',
            name: 'noteOn',
            note: 2,
          },
        ],
      },
    ],
  },
}

export class BaseController extends EventEmitter {
  constructor(options = {}) {
    super()
    this.handler = options.handler || 'BaseController'
  }

  /**
   * Formatting the feedback and then calling the custom `feedbackToAction` per controller which maps the config.
   */
  feedback(name, params) {
    params = {
      handler: this.handler,
      name,
      params,
    }
    this.log('info', 'feedback', params)

    const configHandler = config.triggers[params.handler]
    if (!configHandler) return

    this.feedbackToAction(params, configHandler)
  }

  /**
   * Handle an individual action.
   * Check if the action exists, if its parameters are good, and then run the action and return the result.
   */
  async actionHandler(params) {
    this.log('info', 'actionHandler', params)
    if (!this.actions) return this.log('warn', 'actionHandler', `actions not defined for ${this.handler} controller`)
    const action = this.actions.find((el) => el.name === params.name)
    if (!action) return this.log('warn', 'actionHandler', `${params.name} not found`)
    if (!action.action) return this.log('warn', 'actionHandler', `${params.name} has no implementation`)
    if (!this.checkActionParams(action, params)) return this.log('error', 'actionHandler', `${params.name} has wrong params configured wrongly`)
    await action.action(params)
    return result
  }

  /**
   * Check if the parameters in the config are present and of correct type.
   */
  checkActionParams(action, params) {
    if (!action.params) return true
    let result = true
    Object.entries(action.params).map(([key, value]) => {
      if (value.required && !params[key]) {
        result = false
        return this.log('error', 'actionHandler', `missing param ${key} for action ${action.name}`)
      }
      if (value.type && !is[value.type](params[key])) {
        result = false
        return this.log('error', 'actionHandler', `param ${key} has wrong type, should be ${value.type}`)
      }
      return
    })
    return result
  }

  log(level, caller, ...args) {
    const data = {
      date: new Date(),
      handler: this.handler,
      level: level.toLowerCase(),
      caller,
    }
    if (args.length > 0) data.message = args.shift()
    if (args.length > 0) data.data = args.length === 1 ? args.shift() : args
    this.emit('log', data)
  }
}
