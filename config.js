import merge from 'deepmerge'

import configDefault from './config.default.js'
import configUser from './config.user.js'

export const config = merge(configDefault, configUser)

config.dve.stateMain = { ...config.dve.stateDefault }
config.dve.stateCurrent = { ...config.dve.stateDefault }

export default config
