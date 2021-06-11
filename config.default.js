import { Enums } from 'atem-connection'

export const config = {
  midi: {
    deviceName: 'X-TOUCH MINI',
    outputChannel: 10,
  },

  atem: {
    address: '192.168.10.240',
  },

  transition: {
    style: undefined, // undefined = take what is set in atem / choose from Enums.TransitionStyle.MIX if want to force
    type: Enums.TransitionStyle.cut, // can be: auto | cut
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
    { note: 0, action: 'ChangeDveScale' },
    { note: 1, action: 'ChangeDvePosition' },
    { note: 2, action: 'ChangeDveMask' },
    { note: 3, action: '' },
    { note: 4, action: '' },
    { note: 5, action: 'ChangeAudioGainMain' },
    { note: 6, action: 'ChangeAudioGainDisplay' },
    { note: 7, action: 'ChangeAudioGainPhone' },
    // LAYER B: DIAL CHANGES
    { note: 24, action: 'ChangeDveScale' },
    { note: 25, action: 'ChangeDvePosition' },
    { note: 26, action: 'ChangeDveMask' },
    { note: 27, action: '' },
    { note: 28, action: '' },
    { note: 29, action: 'ChangeAudioGainMain' },
    { note: 30, action: 'ChangeAudioGainDisplay' },
    { note: 31, action: 'ChangeAudioGainPhone' },
    // LAYER A: FAIDER CHANGE
    { note: 126, action: '' },
    // LAYER B: FAIDER CHANGE
    { note: 127, action: '' },
  ],

  buttons: [
    // LAYER A
      // DIAL BUTTONS
      { note: 0, action: 'ResetDveScale' },
      { note: 1, action: 'ResetDvePosition' },
      { note: 2, action: 'ResetDveMask' },
      { note: 3, action: '' },
      { note: 4, action: '' },
      { note: 5, action: 'ResetAudioGainMain' },
      { note: 6, action: 'ResetAudioGainDisplay' },
      { note: 7, action: 'ResetAudioGainPhone' },
      // BUTTONS UPPER ROW
      { note: 8, action: 'ChangeProgramSource', programInput: 'cam1', withUpstreamKeyer: true },
      { note: 9, action: 'ChangeProgramSource', programInput: 'cam2' },
      { note: 10, action: 'ChangeProgramSource', programInput: 'cam3' },
      { note: 11, action: 'ChangeProgramSource', programInput: 'cam4' },
      { note: 12, action: 'ChangeDveStyle', style: 'phone', programInput: 'cam4', fillSource: 'cam1', buttonLightOn: [ 12, 36 ], buttonLightOff: [ 13, 37 ] },
      { note: 13, action: 'ChangeDveStyle', style: 'monitor', programInput: 'cam1', fillSource: 'cam2', buttonLightOn: [ 13, 37 ], buttonLightOff: [ 12, 36 ] },
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
      { note: 24, action: 'ResetDveScale' },
      { note: 25, action: 'ResetDvePosition' },
      { note: 26, action: 'ResetDveMask' },
      { note: 27, action: '' },
      { note: 28, action: '' },
      { note: 29, action: 'ResetAudioGainMain' },
      { note: 30, action: 'ResetAudioGainDisplay' },
      { note: 31, action: 'ResetAudioGainPhone' },
      // BUTTONS TOP ROW
      { note: 32, action: 'ChangeProgramSource', programInput: 'cam1', withUpstreamKeyer: true },
      { note: 33, action: 'ChangeProgramSource', programInput: 'cam3', withUpstreamKeyer: true },
      { note: 34, action: 'ChangeProgramSource', programInput: 'cam4', withUpstreamKeyer: true },
      { note: 35, action: 'ChangeProgramSource', programInput: 'cam2', withUpstreamKeyer: true },
      { note: 36, action: 'ChangeDveStyle', style: 'phone', programInput: 'cam4', fillSource: 'cam1', buttonLightOn: [ 12, 36 ], buttonLightOff: [ 13, 37 ] },
      { note: 37, action: 'ChangeDveStyle', style: 'monitor', programInput: 'cam1', fillSource: 'cam2', buttonLightOn: [ 13, 37 ], buttonLightOff: [ 12, 36 ] },
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

  controllerStateDefault: {
    // defaults set in the runButtonState Initialization run
    // A = DIAL CHANGES
    0: { state: 'cc', value: 50 },
    1: { state: 'cc', value: 65 },
    2: { state: 'cc', value: 64 },
    3: { state: 'cc', value: 0 },
    4: { state: 'cc', value: 0 },
    5: { state: 'cc', value: 0 },
    6: { state: 'cc', value: 0 },
    7: { state: 'cc', value: 0 },
    // B = DIAL CHANGES
    24: { state: 'cc', value: 50 },
    25: { state: 'cc', value: 65 },
    26: { state: 'cc', value: 64 },
    27: { state: 'cc', value: 0 },
    28: { state: 'cc', value: 0 },
    29: { state: 'cc', value: 0 },
    30: { state: 'cc', value: 0 },
    31: { state: 'cc', value: 0 },
    // A = FAIDER CHANGE
    126: { state: 'cc', value: 0 },
    // B = FAIDER CHANGE
    127: { state: 'cc', value: 0 },
  },
  
  buttonStateDefault: {
    // A
      // BUTTONS UPPER ROW
      8: { state: 'noteoff', velocity: 0 },
      9: { state: 'noteoff', velocity: 0 },
      10: { state: 'noteoff', velocity: 0 },
      11: { state: 'noteoff', velocity: 0 },
      12: { state: 'noteoff', velocity: 0 },
      13: { state: 'noteoff', velocity: 0 },
      14: { state: 'noteoff', velocity: 0 },
      15: { state: 'noteoff', velocity: 0 },
      // BUTTONS BOTTOM ROW
      16: { state: 'noteoff', velocity: 0 },
      17: { state: 'noteoff', velocity: 0 },
      18: { state: 'noteoff', velocity: 0 },
      19: { state: 'noteoff', velocity: 0 },
      20: { state: 'noteoff', velocity: 0 },
      21: { state: 'noteoff', velocity: 0 },
      22: { state: 'noteoff', velocity: 0 },
      23: { state: 'noteoff', velocity: 0 },
    // B
      // BUTTONS UPPER ROW
      32: { state: 'noteoff', velocity: 0 },
      33: { state: 'noteoff', velocity: 0 },
      34: { state: 'noteoff', velocity: 0 },
      35: { state: 'noteoff', velocity: 0 },
      36: { state: 'noteoff', velocity: 0 },
      37: { state: 'noteoff', velocity: 0 },
      38: { state: 'noteoff', velocity: 0 },
      39: { state: 'noteoff', velocity: 0 },
      // BUTTONS BOTTOM ROW
      40: { state: 'noteoff', velocity: 0 },
      41: { state: 'noteoff', velocity: 0 },
      42: { state: 'noteoff', velocity: 0 },
      43: { state: 'noteoff', velocity: 0 },
      44: { state: 'noteoff', velocity: 0 },
      45: { state: 'noteoff', velocity: 0 },
      46: { state: 'noteoff', velocity: 0 },
      47: { state: 'noteoff', velocity: 0 },
  },

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
