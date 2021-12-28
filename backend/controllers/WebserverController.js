import { BaseController } from './BaseController.js'
import getPort from 'get-port'
import Koa from 'koa'
import cors from '@koa/cors'
import logger from 'koa-logger'
import koaBody from 'koa-body'
import gracefulShutdown from 'http-graceful-shutdown'

import { router } from './WebserverRouter.js'

// TODO: add socket.io connection to frontend to be able to send events through which then update the frontend

export class WebserverController extends BaseController {
  constructor(options = {}) {
    super({ handler: 'WebserverController' })
    this.app = undefined
    this.server = undefined

    this._port = undefined
    this._address = undefined
    this._hostname = undefined
    this._protocol = 'http'

    this.actions = [
      {
        name: 'start',
        action: this.actionStart.bind(this),
      },
      {
        name: 'stop',
        action: this.actionStop.bind(this),
      },
      {
        name: 'status',
        action: this.actionStatus.bind(this),
      },
      // {
      //   name: 'restart',
      //   action: this.actionRestart.bind(this),
      // },
      {
        name: 'checkPort',
        action: this.actionCheckPort.bind(this),
      },
    ]

    return this
  }

  /**
   * @param {*} options
   */
  async connect(options = {}) {
    this.log('debug', 'connect')
    this.app = new Koa()
    this.router = router
    this._port = options.port || 3333
    this._address = options.address || '127.0.0.1'
    this._hostname = options.hostname || 'localhost'
    this._protocol = options.protocol || 'http'

    this.app.use(logger())
    this.app.use(cors())
    this.app.use(
      koaBody({
        jsonLimit: '1kb',
      })
    )
    this.app.use(router.routes())
    this.app.use(router.allowedMethods())
    this.emit('connect')
  }

  async disconnect(options = {}) {
    await this.stop()
    this.emit('disconnect')
  }

  async actionStart(params) {
    this.log('debug', 'start')
    return new Promise(async (resolve, reject) => {
      params.port = params.port || this._port
      // NOTE: should the "response" work as a result to the event or as an event emitted? Not sure yet.
      const port = await this.getPort(params.port)
      if (port !== params.port) {
        this.log('error', 'start', `Port ${params.port} is already in use, chose random port ${port} instead.`)
      }
      this._port = port
      this.server = this.app.listen(port, () => {
        this.publicAddress = `${this._protocol}://${this._address}:${this._port}`
        this.publicHostname = `${this._protocol}://${this._hostname}:${this._port}`
        this.log('info', 'start', 'listening', {
          server: this.server.address(),
          publicAddress: this.publicAddress,
          publicHostname: this.publicHostname,
        })
        this.emit('started', {
          ...this.server.address(),
        })
        const response = {
          handler: this.handler,
          name: 'started',
          data: this.server.address(),
        }
        this.emit('actions', [{ handler: 'TauriController', name: 'sendCommand', data: response }])
        return resolve()
      })

      // this enables the graceful shutdown with advanced options
      this.shutdown = gracefulShutdown(this.server, {
        signals: 'SIGINT SIGTERM',
        timeout: 3000,
        development: false,
        forceExit: false,
        onShutdown: () => {
          return new Promise((resolve) => {
            this.log('info', 'cleanup', 'start')
            this.emit('cleanup')
            setTimeout(function () {
              // console.log('cleanup finished');
              resolve()
            }, 1000)
          })
        },
        finally: () => {
          this.log('info', 'gracefulShutdown', 'Finished')
          this.emit('shutdownGraceful', 'finished')
        },
      })
    })
  }

  async actionStop(params) {
    this.log('debug', 'stop', 'started')
    return new Promise(async (resolve) => {
      if (this.server && this.shutdown) {
        await this.shutdown()
        this.log('debug', 'stop', 'finished')
        this.emit('stopped')
        const response = {
          handler: this.handler,
          name: 'stopped',
        }
        this.emit('actions', [{ handler: 'TauriController', name: 'sendCommand', data: response }])
        return resolve()
      } else {
        this.log('info', 'stop', 'no server to stop')
      }
    })
  }

  actionStatus(params) {
    const data = (this.server && this.server.address()) ? this.server.address() : null
    const response = {
      handler: this.handler,
      name: data ? 'started' : 'stopped',
      data,
    }
    this.emit('actions', [{ handler: 'TauriController', name: 'sendCommand', data: response }])
  }

  async actionCheckPort(params) {
    const portAvailable = await this.getPort(params.port)
    const response = {
      handler: this.handler,
      name: 'portChecked',
      data: {
        portChecked: params.port,
        portAvailable,
        isAvailable: params.port === portAvailable,
      },
    }
    this.feedback('portChecked', response)
    this.emit('actions', [{ handler: 'TauriController', name:'sendCommand', data: response}])
  }

  /**
   * Requests a port from the system.
   * In case the port is available it is returned.
   * In case it is not available, a random available port is chosen and returned.
   * @param {Integer} port
   * @returns available port (can be requested port, but may also be random)
   */
  async getPort(port) {
    port = parseInt(port)
    return await getPort({ port })
  }
}
