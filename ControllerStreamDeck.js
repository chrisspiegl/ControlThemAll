import {listStreamDecks, openStreamDeck} from '@elgato-stream-deck/node';
import debug from 'debug';
import {throttle} from 'throttle-debounce';
import {EventEmitter} from 'inf-ee';

import RenderButton from './RenderButton.js';

const log = debug('sio:sdeck');

const THROTTLE_BUTTON_UPDATE = 250; // Ms
const THROTTLE_CONTROLLER_UPDATE = 250; // Ms

export const ConnectionState = {
	Closed: 0x00,
	Connected: 0x01,
};

const {render} = new RenderButton();

export class ControllerStreamDeck extends EventEmitter {
	constructor(options = {}) {
		super();
		console.log('Constructing Stream Deck Controller');

		this.componentName = 'Stream Deck Controller';

		this.config = options.config || undefined;

		this._model = undefined;
		this._path = undefined;
		this._serialNumber = undefined;

		this.sessionId = -1;

		this._streamDeck = undefined;
	}

	async connect(options = {}) {
		this._model = options.model;
		this._serialNumber = options.serialNumber;

		const streamDecks = listStreamDecks();

		if (!streamDecks || streamDecks.length === 0) {
			this.log('warn', 'No Stream Deck connected!');
		}

		if (streamDecks[0].model !== this._model
      || streamDecks[0].serialNumber !== this._serialNumber) {
			this.log('warn', 'The streamdeck is not configured correctly!');
			this.log('warn', 'copy this into your config.user.yaml file:');
			console.log(`streamDeck:
  enabled: true
  model: '${streamDecks[0].model}'
  serialNumber: '${streamDecks[0].serialNumber}'`);
			return;
		}

		this._path = streamDecks[0].path;
		this._streamDeck = await openStreamDeck(this._path);
		// This._streamDeck = await openStreamDeck()

		this.log('info', `Serial: ${await this._streamDeck.getSerialNumber()}`);
		this.log('info', `Firmware: ${await this._streamDeck.getFirmwareVersion()}`);

		this._streamDeck.on('error', message => this.log('error', message));
		this._streamDeck.on('down', keyIndex =>
		// This._streamDeck.fillKeyColor(keyIndex, 255, 0, 0)
			this.emit('buttonDown', keyIndex),
		);
		this._streamDeck.on('up', keyIndex => this.emit('buttonUp', keyIndex));

		// Clear all keys
		await this._streamDeck.clearPanel();

		await this.updateButtonsViaStateInstant(this.config.streamDeck.buttons);

		this.sessionId += 1;
		this.emit('connect', {
			isReconnect: this.sessionId > 0,
			sessionId: this.sessionId,
		});
	}

	async disconnect() {
		console.log('streamdeck disconnecting?!');
		await this._streamDeck.resetToLogo();
		this._streamDeck.removeAllListeners();
		await this._streamDeck.close();
		delete this._streamDeck;
		this.emit('disconnect', {sessionId: this.sessionId});
	}

	async send(options) {
		const {keyIndex, label} = options;
		console.log('sending message to streamdeck', options);
		try {
			await this._streamDeck.fillKeyBuffer(
				keyIndex,
				await render({
					...options,
					streamDeck: this._streamDeck,
				}),
				{
					format: 'rgb',
				},
			);
		} catch (error) {
			console.log(`error while setting image on streamdeck button ${keyIndex} with label ${label}`, error);
		}
	}

	// SendButtonOff(options) {
	// 	this.send('noteoff', options);
	// }

	// sendButtonOn(options) {
	// 	this.send('noteon', options);
	// }

	updateButtonsViaStateInstant(buttonStates) {
		return Promise.all(buttonStates.map(async btn => {
			let state = (btn.state || 'buttonoff').toLowerCase();
			if (['flashingon', 'flashingoff'].includes(state)) {
				btn.state = state === 'flashingon' ? 'flashingoff' : 'flashingon';
				state = state === 'flashingon' ? 'buttonon' : 'buttonoff';
			}

			await this.send({
				keyIndex: btn.button,
				label: btn.label,
				backgroundColor: state === 'buttonon' ? '#FF0000' : '#000000',
			});
		}));
	}

	updateButtonsViaState(buttonStates, instant = false) {
		// This.log('debug', 'updateButtonsViaState')
		if (instant) {
			// This.log('debug', 'updateButtonsViaStateInstant')
			this.updateButtonsViaStateInstant(buttonStates);
		} else {
			if (!this.updateButtonsViaStateThrottled) {
				this.updateButtonsViaStateThrottled = throttle(THROTTLE_BUTTON_UPDATE, false, buttonStates =>
				// This.log('debug', 'updateButtonsViaStateThrottled')
					this.updateButtonsViaStateInstant(buttonStates),
				);
			}

			this.updateButtonsViaStateThrottled(buttonStates);
		}
	}

	log(level, ...args) {
		this.emit('log', {
			component: this.componentName,
			level: level.toLowerCase(),
			message: args,
		});
		log(`${level.toLowerCase()}: ${args}`);
	}
}

export default ControllerStreamDeck;
