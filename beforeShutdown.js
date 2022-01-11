// Inspired by: https://stackoverflow.com/a/64028857/975333

import process from 'node:process';

/**
 * @callback BeforeShutdownListener
 * @param {string} [signalOrEvent] The exit signal or event name received on the process.
 */

/**
 * System signals the app will listen to initiate shutdown.
 * @const {string[]}
 */
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'];

/**
 * Time in milliseconds to wait before forcing shutdown.
 * @const {number}
 */
const SHUTDOWN_TIMEOUT = 15_000;

/**
 * A queue of listener callbacks to execute before shutting
 * down the process.
 * @type {BeforeShutdownListener[]}
 */
const shutdownListeners = [];

/**
 * Listen for signals and execute given `fn` function once.
 * @param  {string[]} signals System signals to listen to.
 * @param  {function(string)} fn Function to execute on shutdown.
 */
const processOnce = (signals, fn) => {
	for (const sig of signals) {
		process.once(sig, fn);
	}
};

/**
 * Sets a forced shutdown mechanism that will exit the process after `timeout` milliseconds.
 * @param {number} timeout Time to wait before forcing shutdown (milliseconds)
 */
const forceExitAfter = timeout => () => {
	setTimeout(() => {
		// Force shutdown after timeout
		console.warn(`Could not close resources gracefully after ${timeout}ms: forcing shutdown`);
		return process.exit(1);
	}, timeout).unref();
};

/**
 * Main process shutdown handler. Will invoke every previously registered async shutdown listener
 * in the queue and exit with a code of `0`. Any `Promise` rejections from any listener will
 * be logged out as a warning, but won't prevent other callbacks from executing.
 * @param {string} signalOrEvent The exit signal or event name received on the process.
 */
async function shutdownHandler(signalOrEvent) {
	console.warn(`Shutting down: received [${signalOrEvent}] signal`);

	for (const listener of shutdownListeners) {
		try {
			await listener(signalOrEvent);
		} catch (error) {
			console.warn(`A shutdown handler failed before completing with: ${error.message || error}`);
		}
	}

	return process.exit(0);
}

/**
 * Registers a new shutdown listener to be invoked before exiting
 * the main process. Listener handlers are guaranteed to be called in the order
 * they were registered.
 * @param {BeforeShutdownListener} listener The shutdown listener to register.
 * @returns {BeforeShutdownListener} Echoes back the supplied `listener`.
 */
function beforeShutdown(listener) {
	shutdownListeners.push(listener);
	return listener;
}

// Register shutdown callback that kills the process after `SHUTDOWN_TIMEOUT` milliseconds
// This prevents custom shutdown handlers from hanging the process indefinitely
processOnce(SHUTDOWN_SIGNALS, forceExitAfter(SHUTDOWN_TIMEOUT));

// Register process shutdown callback
// Will listen to incoming signal events and execute all registered handlers in the stack
processOnce(SHUTDOWN_SIGNALS, shutdownHandler);

export default beforeShutdown;
