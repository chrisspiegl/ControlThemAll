import { BaseController } from './BaseController.js'

export class SystemController extends BaseController {
  constructor() {
    super({ handler: 'SystemController' })

    this.actions = [
      {
        name: 'Delay',
        params: {
          duration: {
            required: true,
            type: 'integer',
          },
        },
        action: this.actionDelay.bind(this),
      },
    ]
  }

  actionDelay(params) {
    return new Promise((resolve) => {
      this.log('info', 'actionDelay')
      setTimeout(() => {
        return resolve('delay finished')
      }, params.duration)
    })
  }
}
