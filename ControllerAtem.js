import debug from 'debug';
import {Atem} from 'atem-connection';
import {EventEmitter} from 'inf-ee';

const log = debug('sio:atem');

const ATEM_DEFAULT_ADDRESS = '192.168.10.240';

export class ControllerAtem extends EventEmitter {
	constructor(options = {}) {
		super();
		console.log('Constructing ATEM Controller');

		this.componentName = 'ATEM Controller';

		this.sessionId = -1;

		this._address = options.address || ATEM_DEFAULT_ADDRESS;
		this._atem = undefined;
	}

	connect(options = {}) {
		this._address = options.address || ATEM_DEFAULT_ADDRESS;

		this._atem = new Atem();

		// This._atem.on('debug', (msg) => this.log('debug', msg))
		this._atem.on('info', message => this.log('info', message));
		this._atem.on('error', message => this.log('error', message));

		this._atem.on('disconnected', () => {
			this.log('info', 'Disconnected');
			this.emit('disconnect', {sessionId: this.sessionId});
		});

		this._atem.on('connected', () => {
			this.log('info', 'Connected');
			this.sessionId += 1;
			this.emit('connected', {isReconnect: (this.sessionId > 0), sessionId: this.sessionId});
		});

		this._atem.on('stateChanged', (state, pathToChange) => this.emit('stateChanged', {state, pathToChange}));
		this._atem.on('receivedCommand', command => this.emit('receivedCommand', {command}));

		this._atem.connect(this._address).catch(error => {
			this.log('error', error);
		});
	}

	disconnect() {
		if (this._atem) {
			this._atem.disconnect();
		}
	}

	getState() {
		return this._atem.state;
	}

	getProgramInput(me = 0) {
		return this._atem.state.video.mixEffects[me].programInput;
	}

	getPreviewInput(me = 0) {
		return this._atem.state.video.mixEffects[me].previewInput;
	}

	isUpstreamKeyerActive(me = 0, usk = 0) {
		return this._atem.state.video.mixEffects[me].upstreamKeyers[usk].onAir;
	}

	getUpstreamKeyerFillSource(me = 0, usk = 0) {
		return this._atem.state.video.mixEffects[me].upstreamKeyers[usk].fillSource;
	}

	getUpstreamKeyerType(me = 0, usk = 0) {
		return this._atem.state.video.mixEffects[me].upstreamKeyers[usk].mixEffectKeyType;
	}

	getTransitionDuration(me = 0) {
		return this._atem.state.video.mixEffects[me].transitionSettings.mix.rate;
	}

	setUpstreamKeyerType(...args) {
		return this._atem.setUpstreamKeyerType(...args);
	}

	setUpstreamKeyerDVESettings(...args) {
		return this._atem.setUpstreamKeyerDVESettings(...args);
	}

	changePreviewInput(...args) {
		return this._atem.changePreviewInput(...args);
	}

	setTransitionStyle(...args) {
		return this._atem.setTransitionStyle(...args);
	}

	setUpstreamKeyerFillSource(...args) {
		return this._atem.setUpstreamKeyerFillSource(...args);
	}

	autoTransition(...args) {
		return this._atem.autoTransition(...args);
	}

	cut(...args) {
		return this._atem.cut(...args);
	}

	setFairlightAudioMixerSourceProps(...args) {
		return this._atem.setFairlightAudioMixerSourceProps(...args);
	}

	fadeToBlack(...args) {
		return this._atem.fadeToBlack(...args);
	}

	setUpstreamKeyerFlyKeyKeyframe(...args) {
		return this._atem.setUpstreamKeyerFlyKeyKeyframe(...args);
	}

	runUpstreamKeyerFlyKeyTo(...args) {
		return this._atem.runUpstreamKeyerFlyKeyTo(...args);
	}

	log(level, ...args) {
		this.emit('log', {component: this.componentName, level: level.toLowerCase(), message: args});
		log(`${level.toLowerCase()}: ${args}`);
	}
}

export default ControllerAtem;
