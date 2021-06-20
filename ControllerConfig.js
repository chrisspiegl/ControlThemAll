import merge from 'deepmerge'
import YAML from 'yaml'
import fs from 'fs'

export class ControllerConfig {
  constructor() {
    this.config = undefined
    return this
  }

  async getConfig() {
    if (this.config) {
      console.log(`Config already loaded and just returning!`)
      return this.config
    }

    console.log(`Loading the configuration from the YAML files`)

    const configDefault = YAML.parse(fs.readFileSync('./config.default.yaml', 'utf8'))
    const configUser = YAML.parse(fs.readFileSync('./config.user.yaml', 'utf8'))

    this.config = merge(configDefault, configUser)

    // console.log(`config:`, config)

    this.config.dve.stateMain = { ...this.config.dve.stateDefault }
    this.config.dve.stateCurrent = { ...this.config.dve.stateDefault }

    return this.config
  }
}

export default ControllerConfig
