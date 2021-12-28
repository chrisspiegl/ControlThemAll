import { BaseController } from '../BaseController.js'

export class AtemController extends BaseController {
  constructor() {
    super({ handler: 'AtemController' })

    this.actions = [
      {
        name: 'FadeToBlack',
        // params: {
        //   note: {
        //     required: true,
        //     type: 'integer',
        //   },
        // },
        action: this.actionFadeToBlack.bind(this),
      },
    ]
  }

  feedbackToAction(params, config) {
    const configRelevant = config.find((el) => el.name === params.name && el.note === params.params.note)
    if (!configRelevant) return this.log('info', 'feedbackToAction', `no config for feedback trigger ${params.name} : ${params.params.note}`)
    this.emit('actions', configRelevant.actions)
  }

  actionFadeToBlack(params) {
    return new Promise((resolve) => {
      this.log('info', 'actionFadeToBlack')
      setTimeout(() => {
        return resolve('FadeToBlack finished')
      }, 1000)
    })
  }
}
