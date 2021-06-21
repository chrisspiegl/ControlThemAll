import debug from 'debug'
import { Atem } from 'atem-connection'
import { EventEmitter } from 'inf-ee'

const log = debug(`sio:atem`)

const ATEM_DEFAULT_ADDRESS = '192.168.10.240'

export class ControllerAtem extends EventEmitter {
  constructor(options = {}) {
    super()
    console.log(`Constructing ATEM Controller`)

    this.componentName = 'ATEM Controller'

    this.sessionId = -1

    this._address = options.address || ATEM_DEFAULT_ADDRESS
    this._atem = undefined

    return this
  }

  connect(options = {}) {
    this._address = options.address || ATEM_DEFAULT_ADDRESS

    this._atem = new Atem()

    this._atem.on('debug', (msg) => this.log('debug', msg))
    this._atem.on('info', (msg) => this.log('info', msg))
    this._atem.on('error', (msg) => this.log('error', msg))

    this._atem.on('disconnected', () => {
      this.log('info', 'Disconnected')
      this.emit('disconnect', { sessionId: this.sessionId })
    })

    this._atem.on('connected', () => {
      this.log('info', `Connected`)
      this.sessionId = this.sessionId + 1
      this.emit('connected', { isReconnect: (this.sessionId > 0), sessionId: this.sessionId })
    })

    this._atem.on('stateChanged', (state, pathToChange) => this.emit('stateChanged', { state, pathToChange }))
    this._atem.on('receivedCommand', (command) => this.emit('receivedCommand', { command }))

    this._atem.connect(this._address).catch((e) => {
      this.log('error', e)
    })
  }

  disconnect() {
    if (this._atem) this._atem.disconnect()
  }

  getState() {
    return this._atem.state
  }

  getProgramInput(me = 0) {
    return this._atem.state.video.mixEffects[me].programInput
  }

  getPreviewInput(me = 0) {
    return this._atem.state.video.mixEffects[me].previewInput
  }

  isUpstreamKeyerActive(me = 0, usk = 0) {
    return this._atem.state.video.mixEffects[me].upstreamKeyers[usk].onAir
  }

  getUpstreamKeyerFillSource(me = 0, usk = 0) {
    return this._atem.state.video.mixEffects[me].upstreamKeyers[usk].fillSource
  }

  getUpstreamKeyerType(me = 0, usk = 0) {
    return this._atem.state.video.mixEffects[me].upstreamKeyers[usk].mixEffectKeyType
  }

  getTransitionDuration(me = 0) {
    return this._atem.state.video.mixEffects[me].transitionSettings.mix.rate
  }

  setUpstreamKeyerType(...args) {
    return this._atem.setUpstreamKeyerType.apply(this._atem, args)
  }

  setUpstreamKeyerDVESettings(...args) {
    return this._atem.setUpstreamKeyerDVESettings.apply(this._atem, args)
  }

  changePreviewInput(...args) {
    return this._atem.changePreviewInput.apply(this._atem, args)
  }

  setTransitionStyle(...args) {
    return this._atem.setTransitionStyle.apply(this._atem, args)
  }

  setUpstreamKeyerFillSource(...args) {
    return this._atem.setUpstreamKeyerFillSource.apply(this._atem, args)
  }

  autoTransition(...args) {
    return this._atem.autoTransition.apply(this._atem, args)
  }

  cut(...args) {
    return this._atem.cut.apply(this._atem, args)
  }

  setFairlightAudioMixerSourceProps(...args) {
    return this._atem.setFairlightAudioMixerSourceProps.apply(this._atem, args)
  }

  fadeToBlack(...args) {
    return this._atem.fadeToBlack.apply(this._atem, args)
  }

  setUpstreamKeyerFlyKeyKeyframe(...args) {
    return this._atem.setUpstreamKeyerFlyKeyKeyframe.apply(this._atem, args)
  }

  runUpstreamKeyerFlyKeyTo(...args) {
    return this._atem.runUpstreamKeyerFlyKeyTo.apply(this._atem, args)
  }

  log(level, ...args) {
    this.emit('log', { component: this.componentName, level: level.toLowerCase(), message: args })
    log(`${level.toLowerCase()}: ${args}`)
  }
}

export default ControllerAtem
