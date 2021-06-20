import express from 'express'
import { EventEmitter } from 'inf-ee'
import debug from 'debug'
import detectPort from 'detect-port'

export class ControllerWebServer extends EventEmitter {
  constructor(options = {}) {
    super()
    console.log(`Constructing WebServer Controller`)

    this.componentName = 'WebServer Controller'

    this.config = options.config || undefined

    this.sessionId = -1

    this.app = undefined
    this.server = undefined

    this._port = undefined
    this._address = undefined
    this._hostname = undefined
    this._protocol = 'http'

    return this
  }

  async connect(options = {}) {
    this.app = express()
    this._port = options.port || 3333
    this._address = options.address || '127.0.0.1'
    this._hostname = options.hostname || 'localhost'
    this._protocol = options.protocol || 'http'

    this.app.get('/', (req, res) => {
      res.send('Hello World!')
    })

    this.app.get('/server/stop', (req, res) => {
      this.stopServer()
      res.send('Shutting down the WebServer')
    })

    // Test if a port is available and can be bound as the new port for the web interface
    this.app.get('/server/testport', async (req, res) => {
      const portRequested = parseInt(req.query.port)
      const portAvailable = await this.testPort(portRequested)
      return res.json({
        portRequested: portRequested,
        portAvailable: portAvailable,
        isAvailable: portAvailable === portRequested
      })
    })

    // API Route to Restart the Webserver on a new Port
    // Makes it possible to change the port from the frontend
    this.app.get('/server/newport', async (req, res) => {
      const portRequested = parseInt(req.query.port)
      const portAvailable = await this.testPort(portRequested)
      if (portRequested !== portAvailable) {
        return res.json({
          success: false,
          msg: 'Requested port not available. Not restarting! Choose a different port.'
        })
      }
      this._port = portRequested
      res.json({
        success: true,
        msg: 'server restarted on new port'
      })

      const serverOld = this.server
      setTimeout(async () => {
        this.log(`Stopping the old server on ${serverOld.address()}`)
        await this.stopServer(serverOld)
        this.log(`Old Server Completely Stopped`)
      }, 10 * 1000) // 10 seconds
      await this.startServer()
      this.emit('connect')
    })

    await this.startServer()
  }

  async disconnect() {
    await this.stopServer()
    this.emit('disconnect')
  }

  async startServer() {
    return new Promise(async (resolve) => {
      const port = await this.testPort(this._port, this._address)
      if (port !== this._port) {
        this.log('error', `The configured port ${this._port} is not available on ${this._address} and you should set a different one in the config file.`)
        return
      }
      this.server = this.app.listen(this._port, this._address)
      this.server.on('listening', () => {
        this.log('info', this.server.address())
        this.log('info', `WebServer Listening`, `${this._protocol}://${this._address}:${this._port}`, `${this._protocol}://${this._hostname}:${this._port}`)
        this.emit('webServerStarted')
        resolve()
      })
      this.server.on('error', (msg) => {
        this.log('error', 'WebServer Startup Error', msg)
      })
    })
  }

  stopServer(server) {
    server = server || this.server
    return new Promise((resolve) => {
      if (server) {
        server.close(() => {
          this.log('info', `WebServer Shutdown`)
          this.emit('webServerStopped')
          return resolve()
        })
      } else {
        this.log(`No WebServer to Shutdown`)
        return resolve()
      }
    })
  }

  async testPort(port, host) {
    port = parseInt(port) || 80
    return await detectPort(port, host)
  }

  log(level, ...args) {
    this.emit('log', { component: this.componentName, level: level.toLowerCase(), message: args })
    debug(`sio:webserver:${level.toLowerCase()}`, args)
  }
}

export default ControllerWebServer
