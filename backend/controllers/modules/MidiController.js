import { BaseController } from './BaseController.js'

export class MidiController extends BaseController {
  constructor() {
    super({ handler: 'MidiController' })

    this.actions = [
      {
        name: 'noteOn',
        params: {
          note: {
            required: true,
            type: 'integer',
          },
        },
      },
    ]
  }

  feedbackToAction(params, config) {
    const configRelevant = config.find((el) => el.name === params.name && el.note === params.params.note)
    if (!configRelevant) return this.log('info', 'feedbackToAction', `no config for feedback trigger ${params.name} : ${params.params.note}`)
    this.emit('actions', configRelevant.actions)
  }
}
