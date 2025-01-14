import process from 'node:process';
import {once} from 'node:events';
import {constants} from 'node:os';
import {setTimeout} from 'node:timers/promises';
import test from 'ava';
import {pEvent} from 'p-event';
import isRunning from 'is-running';
import {execa, execaSync} from '../index.js';
import {setFixtureDir} from './helpers/fixtures-dir.js';

setFixtureDir();

const TIMEOUT_REGEXP = /timed out after/;

const spawnNoKillable = async (forceKillAfterDelay, options) => {
	const subprocess = execa('no-killable.js', {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
		forceKillAfterDelay,
		...options,
	});
	await pEvent(subprocess, 'message');
	return {subprocess};
};

test('kill("SIGKILL") should terminate cleanly', async t => {
	const {subprocess} = await spawnNoKillable();

	subprocess.kill('SIGKILL');

	const {isTerminated, signal} = await t.throwsAsync(subprocess);
	t.true(isTerminated);
	t.is(signal, 'SIGKILL');
});

// `SIGTERM` cannot be caught on Windows, and it always aborts the process (like `SIGKILL` on Unix).
// Therefore, this feature and those tests do not make sense on Windows.
if (process.platform !== 'win32') {
	const testNoForceKill = async (t, forceKillAfterDelay, killArgument, options) => {
		const {subprocess} = await spawnNoKillable(forceKillAfterDelay, options);

		subprocess.kill(killArgument);

		await setTimeout(6e3);
		t.true(isRunning(subprocess.pid));
		subprocess.kill('SIGKILL');

		const {isTerminated, signal} = await t.throwsAsync(subprocess);
		t.true(isTerminated);
		t.is(signal, 'SIGKILL');
	};

	test('`forceKillAfterDelay: false` should not kill after a timeout', testNoForceKill, false);
	test('`forceKillAfterDelay` should not kill after a timeout with other signals', testNoForceKill, true, 'SIGINT');
	test('`forceKillAfterDelay` should not kill after a timeout with wrong killSignal string', testNoForceKill, true, 'SIGTERM', {killSignal: 'SIGINT'});
	test('`forceKillAfterDelay` should not kill after a timeout with wrong killSignal number', testNoForceKill, true, constants.signals.SIGTERM, {killSignal: constants.signals.SIGINT});

	const testForceKill = async (t, forceKillAfterDelay, killArgument, options) => {
		const {subprocess} = await spawnNoKillable(forceKillAfterDelay, options);

		subprocess.kill(killArgument);

		const {isTerminated, signal} = await t.throwsAsync(subprocess);
		t.true(isTerminated);
		t.is(signal, 'SIGKILL');
	};

	test('`forceKillAfterDelay: number` should kill after a timeout', testForceKill, 50);
	test('`forceKillAfterDelay: true` should kill after a timeout', testForceKill, true);
	test('`forceKillAfterDelay: undefined` should kill after a timeout', testForceKill, undefined);
	test('`forceKillAfterDelay` should kill after a timeout with SIGTERM', testForceKill, 50, 'SIGTERM');
	test('`forceKillAfterDelay` should kill after a timeout with the killSignal string', testForceKill, 50, 'SIGINT', {killSignal: 'SIGINT'});
	test('`forceKillAfterDelay` should kill after a timeout with the killSignal number', testForceKill, 50, constants.signals.SIGINT, {killSignal: constants.signals.SIGINT});

	const testInvalidForceKill = async (t, forceKillAfterDelay) => {
		t.throws(() => {
			execa('empty.js', {forceKillAfterDelay});
		}, {instanceOf: TypeError, message: /non-negative integer/});
	};

	test('`forceKillAfterDelay` should not be NaN', testInvalidForceKill, Number.NaN);
	test('`forceKillAfterDelay` should not be negative', testInvalidForceKill, -1);

	test('`forceKillAfterDelay` works with the "signal" option', async t => {
		const abortController = new AbortController();
		const subprocess = execa('forever.js', {killSignal: 'SIGWINCH', forceKillAfterDelay: 1, signal: abortController.signal});
		await once(subprocess, 'spawn');
		abortController.abort();
		const {isTerminated, signal, isCanceled} = await t.throwsAsync(subprocess);
		t.true(isTerminated);
		t.is(signal, 'SIGKILL');
		t.true(isCanceled);
	});

	test('`forceKillAfterDelay` works with the "timeout" option', async t => {
		const subprocess = execa('forever.js', {killSignal: 'SIGWINCH', forceKillAfterDelay: 1, timeout: 1});
		const {isTerminated, signal, timedOut} = await t.throwsAsync(subprocess);
		t.true(isTerminated);
		t.is(signal, 'SIGKILL');
		t.true(timedOut);
	});

	test('`forceKillAfterDelay` works with the "maxBuffer" option', async t => {
		const subprocess = execa('noop-forever.js', ['.'], {killSignal: 'SIGWINCH', forceKillAfterDelay: 1, maxBuffer: 1});
		const {isTerminated, signal} = await t.throwsAsync(subprocess);
		t.true(isTerminated);
		t.is(signal, 'SIGKILL');
	});

	test('`forceKillAfterDelay` works with "error" events on childProcess', async t => {
		const subprocess = execa('forever.js', {killSignal: 'SIGWINCH', forceKillAfterDelay: 1});
		await once(subprocess, 'spawn');
		subprocess.emit('error', new Error('test'));
		const {isTerminated, signal} = await t.throwsAsync(subprocess);
		t.true(isTerminated);
		t.is(signal, 'SIGKILL');
	});

	test('`forceKillAfterDelay` works with "error" events on childProcess.stdout', async t => {
		const subprocess = execa('forever.js', {killSignal: 'SIGWINCH', forceKillAfterDelay: 1});
		await once(subprocess, 'spawn');
		subprocess.stdout.destroy(new Error('test'));
		const {isTerminated, signal} = await t.throwsAsync(subprocess);
		t.true(isTerminated);
		t.is(signal, 'SIGKILL');
	});
}

test('execa() returns a promise with kill()', async t => {
	const subprocess = execa('noop.js', ['foo']);
	t.is(typeof subprocess.kill, 'function');
	await subprocess;
});

test('timeout kills the process if it times out', async t => {
	const {isTerminated, signal, timedOut} = await t.throwsAsync(execa('forever.js', {timeout: 1}), {message: TIMEOUT_REGEXP});
	t.true(isTerminated);
	t.is(signal, 'SIGTERM');
	t.true(timedOut);
});

test('timeout kills the process if it times out, in sync mode', async t => {
	const {isTerminated, signal, timedOut} = await t.throws(() => {
		execaSync('forever.js', {timeout: 1, message: TIMEOUT_REGEXP});
	});
	t.true(isTerminated);
	t.is(signal, 'SIGTERM');
	t.true(timedOut);
});

test('timeout does not kill the process if it does not time out', async t => {
	const {timedOut} = await execa('delay.js', ['500'], {timeout: 1e8});
	t.false(timedOut);
});

test('timeout uses killSignal', async t => {
	const {isTerminated, signal, timedOut} = await t.throwsAsync(execa('forever.js', {timeout: 1, killSignal: 'SIGINT'}));
	t.true(isTerminated);
	t.is(signal, 'SIGINT');
	t.true(timedOut);
});

const INVALID_TIMEOUT_REGEXP = /`timeout` option to be a non-negative integer/;

const testTimeoutValidation = (t, timeout, execaMethod) => {
	t.throws(() => {
		execaMethod('empty.js', {timeout});
	}, {message: INVALID_TIMEOUT_REGEXP});
};

test('timeout must not be negative', testTimeoutValidation, -1, execa);
test('timeout must be an integer', testTimeoutValidation, false, execa);
test('timeout must not be negative - sync', testTimeoutValidation, -1, execaSync);
test('timeout must be an integer - sync', testTimeoutValidation, false, execaSync);

test('timedOut is false if timeout is undefined', async t => {
	const {timedOut} = await execa('noop.js');
	t.false(timedOut);
});

test('timedOut is false if timeout is 0', async t => {
	const {timedOut} = await execa('noop.js', {timeout: 0});
	t.false(timedOut);
});

test('timedOut is false if timeout is undefined and exit code is 0 in sync mode', t => {
	const {timedOut} = execaSync('noop.js');
	t.false(timedOut);
});

// When child process exits before parent process
const spawnAndExit = async (t, cleanup, detached) => {
	await t.notThrowsAsync(execa('nested.js', [JSON.stringify({cleanup, detached}), 'noop.js']));
};

test('spawnAndExit', spawnAndExit, false, false);
test('spawnAndExit cleanup', spawnAndExit, true, false);
test('spawnAndExit detached', spawnAndExit, false, true);
test('spawnAndExit cleanup detached', spawnAndExit, true, true);

// When parent process exits before child process
const spawnAndKill = async (t, [signal, cleanup, detached, isKilled]) => {
	const subprocess = execa('sub-process.js', [cleanup, detached], {stdio: ['ignore', 'ignore', 'ignore', 'ipc']});

	const pid = await pEvent(subprocess, 'message');
	t.true(Number.isInteger(pid));
	t.true(isRunning(pid));

	process.kill(subprocess.pid, signal);

	await t.throwsAsync(subprocess);
	t.false(isRunning(subprocess.pid));

	if (isKilled) {
		await Promise.race([
			setTimeout(1e4, undefined, {ref: false}),
			pollForProcessExit(pid),
		]);
		t.is(isRunning(pid), false);
	} else {
		t.is(isRunning(pid), true);
		process.kill(pid, 'SIGKILL');
	}
};

const pollForProcessExit = async pid => {
	while (isRunning(pid)) {
		// eslint-disable-next-line no-await-in-loop
		await setTimeout(100);
	}
};

// Without `options.cleanup`:
//   - on Windows subprocesses are killed if `options.detached: false`, but not
//     if `options.detached: true`
//   - on Linux subprocesses are never killed regardless of `options.detached`
// With `options.cleanup`, subprocesses are always killed
//   - `options.cleanup` with SIGKILL is a noop, since it cannot be handled
const exitIfWindows = process.platform === 'win32';
test('spawnAndKill SIGTERM', spawnAndKill, ['SIGTERM', false, false, exitIfWindows]);
test('spawnAndKill SIGKILL', spawnAndKill, ['SIGKILL', false, false, exitIfWindows]);
test('spawnAndKill cleanup SIGTERM', spawnAndKill, ['SIGTERM', true, false, true]);
test('spawnAndKill cleanup SIGKILL', spawnAndKill, ['SIGKILL', true, false, exitIfWindows]);
test('spawnAndKill detached SIGTERM', spawnAndKill, ['SIGTERM', false, true, false]);
test('spawnAndKill detached SIGKILL', spawnAndKill, ['SIGKILL', false, true, false]);
test('spawnAndKill cleanup detached SIGTERM', spawnAndKill, ['SIGTERM', true, true, false]);
test('spawnAndKill cleanup detached SIGKILL', spawnAndKill, ['SIGKILL', true, true, false]);

// See #128
test('removes exit handler on exit', async t => {
	// @todo this relies on `signal-exit` internals
	const exitListeners = globalThis[Symbol.for('signal-exit emitter')].listeners.exit;

	const subprocess = execa('noop.js');
	const listener = exitListeners.at(-1);

	await subprocess;
	t.false(exitListeners.includes(listener));
});

test('result.isCanceled is false when abort isn\'t called (success)', async t => {
	const {isCanceled} = await execa('noop.js');
	t.false(isCanceled);
});

test('result.isCanceled is false when abort isn\'t called (failure)', async t => {
	const {isCanceled} = await t.throwsAsync(execa('fail.js'));
	t.false(isCanceled);
});

test('result.isCanceled is false when abort isn\'t called in sync mode (success)', t => {
	const {isCanceled} = execaSync('noop.js');
	t.false(isCanceled);
});

test('result.isCanceled is false when abort isn\'t called in sync mode (failure)', t => {
	const {isCanceled} = t.throws(() => {
		execaSync('fail.js');
	});
	t.false(isCanceled);
});

test('calling abort is considered a signal termination', async t => {
	const abortController = new AbortController();
	const subprocess = execa('forever.js', {signal: abortController.signal});
	await once(subprocess, 'spawn');
	abortController.abort();
	const {isTerminated, signal} = await t.throwsAsync(subprocess);
	t.true(isTerminated);
	t.is(signal, 'SIGTERM');
});

test('error.isCanceled is true when abort is used', async t => {
	const abortController = new AbortController();
	const subprocess = execa('noop.js', {signal: abortController.signal});
	abortController.abort();
	const {isCanceled} = await t.throwsAsync(subprocess);
	t.true(isCanceled);
});

test('error.isCanceled is false when kill method is used', async t => {
	const abortController = new AbortController();
	const subprocess = execa('noop.js', {signal: abortController.signal});
	subprocess.kill();
	const {isCanceled} = await t.throwsAsync(subprocess);
	t.false(isCanceled);
});

test('calling abort throws an error with message "Command was canceled"', async t => {
	const abortController = new AbortController();
	const subprocess = execa('noop.js', {signal: abortController.signal});
	abortController.abort();
	await t.throwsAsync(subprocess, {message: /Command was canceled/});
});

test('calling abort twice should show the same behaviour as calling it once', async t => {
	const abortController = new AbortController();
	const subprocess = execa('noop.js', {signal: abortController.signal});
	abortController.abort();
	abortController.abort();
	const {isCanceled} = await t.throwsAsync(subprocess);
	t.true(isCanceled);
});

test('calling abort on a successfully completed process does not make result.isCanceled true', async t => {
	const abortController = new AbortController();
	const subprocess = execa('noop.js', {signal: abortController.signal});
	const result = await subprocess;
	abortController.abort();
	t.false(result.isCanceled);
});

test('child process errors are handled', async t => {
	const subprocess = execa('forever.js');
	subprocess.emit('error', new Error('test'));
	await t.throwsAsync(subprocess, {message: 'Command failed: forever.js\ntest'});
});

test('child process errors use killSignal', async t => {
	const subprocess = execa('forever.js', {killSignal: 'SIGINT'});
	await once(subprocess, 'spawn');
	subprocess.emit('error', new Error('test'));
	const {isTerminated, signal} = await t.throwsAsync(subprocess, {message: /test/});
	t.true(isTerminated);
	t.is(signal, 'SIGINT');
});
