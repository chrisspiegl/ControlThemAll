import { Enums } from 'atem-connection'

export const config = {
  midi: {
    deviceName: 'X-TOUCH MINI',
    outputChannel: 10,
  },

  atem: {
    address: '192.168.10.240',
  },

  msPerFrame: 33.33333333,  // 30fps = 33.33333333 | 24fps = 41.66666667

  inputMapping: {
    black: 0,
    cam1: 1,
    cam2: 2,
    cam3: 3,
    cam4: 4,
    cam5: 5,
    cam6: 6,
    cam7: 7,
    cam8: 8,
  },

  transition: {
    style: undefined, // undefined = take what is set in atem / choose from Enums.TransitionStyle.MIX if want to force
    type: 'cut', // can be: auto | cut
    dipWhenProgramAndDveChange: false, // dip to black when DVE Fill Source and Program Change (can not do this with a fade becuase only one M/E in ATEM Mini)
  },

  dve: {
    fillSource: 1,
    stateDefault: {
      sizeX: 500,
      sizeY: 500,
      positionX: 12000,
      positionY: -4000,

      maskEnabled: true,
      maskTop: 0,
      maskBottom: 0,
      maskRight: 9000,
      maskLeft: 9000,

      rotation: 0,

      borderOuterWidth: 5,
      borderInnerWidth: 10,
      borderOuterSoftness: 0,
      borderInnerSoftness: 0,
      borderBevelSoftness: 0,
      borderBevelPosition: 0,

      borderOpacity: 255,
      borderHue: 146,
      borderSaturation: 619,
      borderLuma: 494,

      lightSourceDirection: 0,
      lightSourceAltitude: 0,
    },

    styles: {
      monitor: {
        sizeX: 360,
        sizeY: 360,
        positionX: 9700,
        positionY: -5100,

        maskEnabled: true,
        maskTop: 0,
        maskBottom: 0,
        maskRight: 0,
        maskLeft: 0,
      },
      phone: {
        sizeX: 1070,
        sizeY: 1070,
        positionX: 11800,
        positionY: 0,

        maskEnabled: true,
        maskTop: 0,
        maskBottom: 0,
        maskRight: 0,
        maskLeft: 12050,
      },
    },

    positions: [
      {
        sizeX: 500,
        sizeY: 500,
        positionX: 12000,
        positionY: -4000,
        maskEnabled: true,
        maskTop: 0,
        maskBottom: 0,
        maskRight: 9000,
        maskLeft: 9000,
      },
      {
        sizeX: 900,
        sizeY: 900,
        positionX: 0,
        positionY: 0,
        maskEnabled: true,
        maskTop: 0,
        maskBottom: 0,
        maskRight: 0,
        maskLeft: 0,
      },
      {
        sizeX: 500,
        sizeY: 500,
        positionX: -12000,
        positionY: -4000,
        maskEnabled: true,
        maskTop: 0,
        maskBottom: 0,
        maskRight: 9000,
        maskLeft: 9000,
      },
      {
        sizeX: 500,
        sizeY: 500,
        positionX: -12000,
        positionY: 4000,
        maskEnabled: true,
        maskTop: 0,
        maskBottom: 0,
        maskRight: 9000,
        maskLeft: 9000,
      },
      {
        sizeX: 500,
        sizeY: 500,
        positionX: 12000,
        positionY: 4000,
        maskEnabled: true,
        maskTop: 0,
        maskBottom: 0,
        maskRight: 9000,
        maskLeft: 9000,
      },
    ],
  },

  controllers: [
    // LAYER A: DIAL CHANGES
    { note: 0, action: 'ChangeDveScale', defaultValue: 50, buttonsLightOff: [ 12, 13 ] },
    { note: 1, action: 'ChangeDvePosition', defaultValue: 65, buttonsLightOff: [ 12, 13 ] },
    { note: 2, action: 'ChangeDveMask', defaultValue: 64, buttonsLightOff: [ 12, 13 ] },
    { note: 3, action: '' },
    { note: 4, action: '' },
    { note: 5, action: 'ChangeAudioGain', name: 'ChangeAudioGainMain', audioIndex: 1301, channels: ['-65280'], defaultValue: 115,  range: { min: -10000, max: 1000 } }, //  stereo split channels: ['-255', '-256'] | joined channel: ['-65280']
    { note: 6, action: 'ChangeAudioGain', name: 'ChangeAudioGainDisplay', audioIndex: 2, channels: ['-65280'], defaultValue: 105,  range: { min: -10000, max: 1000 } },
    { note: 7, action: 'ChangeAudioGain', name: 'ChangeAudioGainPhone', audioIndex: 4, channels: ['-65280'], defaultValue: 105,  range: { min: -10000, max: 1000 } },
    // LAYER B: DIAL CHANGES
    { note: 24, action: 'ChangeDveScale', defaultValue: 50, buttonsLightOff: [ 12, 13 ] },
    { note: 25, action: 'ChangeDvePosition', defaultValue: 65, buttonsLightOff: [ 12, 13 ] },
    { note: 26, action: 'ChangeDveMask', defaultValue: 64, buttonsLightOff: [ 12, 13 ] },
    { note: 27, action: '' },
    { note: 28, action: '' },
    { note: 29, action: 'ChangeAudioGain', name: 'ChangeAudioGainMain', audioIndex: 1301, channels: ['-65280'], defaultValue: 115,  range: { min: -10000, max: 1000 } }, //  stereo split channels: ['-255', '-256'] | joined channel: ['-65280']
    { note: 30, action: 'ChangeAudioGain', name: 'ChangeAudioGainDisplay', audioIndex: 2, channels: ['-65280'], defaultValue: 105,  range: { min: -10000, max: 1000 } },
    { note: 31, action: 'ChangeAudioGain', name: 'ChangeAudioGainPhone', audioIndex: 4, channels: ['-65280'], defaultValue: 105,  range: { min: -10000, max: 1000 } },
    // LAYER A: FAIDER CHANGE
    { note: 126, action: '' },
    // LAYER B: FAIDER CHANGE
    { note: 127, action: '' },
  ],

  buttons: [
    // LAYER A
      // DIAL BUTTONS
      { note: 0, action: 'ResetDveScale', buttonsLightOff: [ 12, 13 ] },
      { note: 1, action: 'ResetDvePosition', buttonsLightOff: [ 12, 13 ] },
      { note: 2, action: 'ResetDveMask', buttonsLightOff: [ 12, 13 ] },
      { note: 3, action: '' },
      { note: 4, action: '' },
      { note: 5, action: 'ResetAudioGain', name: 'ChangeAudioGainMain', audioIndex: 1301, channels: ['-65280'], defaultValue: 115,  range: { min: -10000, max: 1000 } }, //  stereo split channels: ['-255', '-256'] | joined channel: ['-65280']
      { note: 6, action: 'ResetAudioGain', name: 'ChangeAudioGainDisplay', audioIndex: 2, channels: ['-65280'], defaultValue: 105,  range: { min: -10000, max: 1000 } },
      { note: 7, action: 'ResetAudioGain', name: 'ChangeAudioGainPhone', audioIndex: 4, channels: ['-65280'], defaultValue: 105,  range: { min: -10000, max: 1000 } },
      // BUTTONS UPPER ROW
      { note: 8, action: 'ChangeProgramSource', programInput: 'cam1', withUpstreamKeyer: true },
      { note: 9, action: 'ChangeProgramSource', programInput: 'cam2' },
      { note: 10, action: 'ChangeProgramSource', programInput: 'cam3' },
      { note: 11, action: 'ChangeProgramSource', programInput: 'cam4' },
      { note: 12, action: 'ChangeDveStyle', style: 'phone', programInput: 'cam4', fillSource: 'cam1', buttonsLightOn: [ 12, 36 ], buttonsLightOff: [ 13, 37 ] },
      { note: 13, action: 'ChangeDveStyle', style: 'monitor', programInput: 'cam1', fillSource: 'cam2', buttonsLightOn: [ 13, 37 ], buttonsLightOff: [ 12, 36 ] },
      { note: 14, action: 'AutoCutSwitch' },
      { note: 15, action: 'FadeToBlack' },
      // BUTTONS BOTTOM ROW
      { note: 16, action: 'ChangeProgramSource', programInput: 'cam1' },
      { note: 17, action: 'ChangeProgramSource', programInput: 'cam2', withUpstreamKeyer: true },
      { note: 18, action: 'ChangeProgramSource', programInput: 'cam3', withUpstreamKeyer: true },
      { note: 19, action: 'ChangeProgramSource', programInput: 'cam4', withUpstreamKeyer: true },
      { note: 20, action: 'ChangeUpstreamKeyerFillSource', fillSource: 'cam1', when: 'auto' },
      { note: 21, action: 'ChangeUpstreamKeyerFillSource', fillSource: 'cam2', when: 'auto' },
      { note: 22, action: 'ChangeUpstreamKeyerFillSource', fillSource: 'cam3', when: 'auto' },
      { note: 23, action: 'ChangeUpstreamKeyerFillSource', fillSource: 'cam4', when: 'auto' },
    // LAYER B
      // DIAL BUTTONS
      { note: 24, action: 'ResetDveScale', buttonsLightOff: [ 12, 13 ] },
      { note: 25, action: 'ResetDvePosition', buttonsLightOff: [ 12, 13 ] },
      { note: 26, action: 'ResetDveMask', buttonsLightOff: [ 12, 13 ] },
      { note: 27, action: '' },
      { note: 28, action: '' },
      { note: 29, action: 'ResetAudioGain', name: 'ChangeAudioGainMain', audioIndex: 1301, channels: ['-65280'], defaultValue: 115,  range: { min: -10000, max: 1000 } }, //  stereo split channels: ['-255', '-256'] | joined channel: ['-65280']
      { note: 30, action: 'ResetAudioGain', name: 'ChangeAudioGainDisplay', audioIndex: 2, channels: ['-65280'], defaultValue: 105,  range: { min: -10000, max: 1000 } },
      { note: 31, action: 'ResetAudioGain', name: 'ChangeAudioGainPhone', audioIndex: 4, channels: ['-65280'], defaultValue: 105,  range: { min: -10000, max: 1000 } },
      // BUTTONS TOP ROW
      { note: 32, action: 'ChangeProgramSource', programInput: 'cam1', withUpstreamKeyer: true },
      { note: 33, action: 'ChangeProgramSource', programInput: 'cam3', withUpstreamKeyer: true },
      { note: 34, action: 'ChangeProgramSource', programInput: 'cam4', withUpstreamKeyer: true },
      { note: 35, action: 'ChangeProgramSource', programInput: 'cam2', withUpstreamKeyer: true },
      { note: 36, action: 'ChangeDveStyle', style: 'phone', programInput: 'cam4', fillSource: 'cam1', buttonsLightOn: [ 12, 36 ], buttonsLightOff: [ 13, 37 ] },
      { note: 37, action: 'ChangeDveStyle', style: 'monitor', programInput: 'cam1', fillSource: 'cam2', buttonsLightOn: [ 13, 37 ], buttonsLightOff: [ 12, 36 ] },
      { note: 38, action: 'SwitchProgramAndUpstreamKeyerFillSource' },
      { note: 39, action: 'FadeToBlack' },
      // BUTTONS BOTTOM ROW
      { note: 40, action: 'ChangeProgramSource', programInput: 'cam1' },
      { note: 41, action: 'ChangeProgramSource', programInput: 'cam3' },
      { note: 42, action: 'ChangeProgramSource', programInput: 'cam4' },
      { note: 43, action: 'ChangeProgramSource', programInput: 'cam2' },
      { note: 44, action: 'ChangeUpstreamKeyerFillSource', fillSource: 'cam1', when: 'auto' },
      { note: 45, action: 'ChangeUpstreamKeyerFillSource', fillSource: 'cam3', when: 'auto' },
      { note: 46, action: 'ChangeUpstreamKeyerFillSource', fillSource: 'cam4', when: 'auto' },
      { note: 47, action: 'ChangeUpstreamKeyerFillSource', fillSource: 'cam2', when: 'auto' },
  ],

  feedback: {
    buttonsForProgramInputWithoutDve: {
      cam1: [ 16, 40 ],
      cam2: [  9, 43 ],
      cam3: [ 10, 41 ],
      cam4: [ 11, 42 ],
    },
    buttonsForProgramInputWithDve: {
      cam1: [  8, 32 ],
      cam2: [ 17, 35 ],
      cam3: [ 18, 33 ],
      cam4: [ 19, 34 ],
    },
    buttonsForActiveUpstreamKeyerFillSource: {
      cam1: [ 20, 44 ],
      cam2: [ 21, 47 ],
      cam3: [ 22, 45 ],
      cam4: [ 23, 46 ],
    }
  },
}

export default config
