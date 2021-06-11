import { Atem } from 'atem-connection'
import { config } from './config.js'

export class ATEM {
  constructor(master) {
    this.master = master
    console.log(`Constructing ATEM Controller`)
    this.myAtem = new Atem()

    // this.myAtem.on('debug', console.log)
    this.myAtem.on('info', console.log)
    this.myAtem.on('error', console.error)

    this.myAtem.on('disconnected', () => {
      console.log('ATEM Connection lost')
      this.master.disconnect('atem')
    })

    this.myAtem.on('connected', () => {
      console.log(`ATEM Connected`)
      this.master.connect('atem')
    })

    this.myAtem.connect(config.atem.address).catch((e) => {
      console.error(e)
      this.master.disconnect('atem')
    })
  }
}

export default ATEM
