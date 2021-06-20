import merge from 'deepmerge'

export class ControllerConfig {
  constructor() {
    return this
  }

  async getConfig() {
    const configDefault = await import('./config.default.js')
    const configUser = await import('./config.user.js')

    // console.log(`configDefault:`, configDefault)
    // console.log(`configUser:`, configUser)

    const config = merge(configDefault.default, configUser.default)

    config.dve.stateMain = { ...config.dve.stateDefault }
    config.dve.stateCurrent = { ...config.dve.stateDefault }

    return config
  }
}

export default ControllerConfig
