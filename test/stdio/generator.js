import {Buffer} from 'node:buffer';
import {readFile, writeFile, rm} from 'node:fs/promises';
import {getDefaultHighWaterMark, PassThrough} from 'node:stream';
import {setTimeout} from 'node:timers/promises';
import test from 'ava';
import getStream, {getStreamAsArray} from 'get-stream';
import tempfile from 'tempfile';
import {execa, execaSync} from '../../index.js';
import {setFixtureDir} from '../helpers/fixtures-dir.js';
import {getStdio} from '../helpers/stdio.js';
import {foobarString, foobarUint8Array, foobarBuffer, foobarObject, foobarObjectString} from '../helpers/input.js';
import {serializeGenerator, noopGenerator, getOutputsGenerator, getOutputGenerator, outputObjectGenerator} from '../helpers/generator.js';

setFixtureDir();

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const foobarUppercase = foobarString.toUpperCase();
const foobarHex = foobarBuffer.toString('hex');

const uppercaseGenerator = async function * (lines) {
	for await (const line of lines) {
		yield line.toUpperCase();
	}
};

const uppercaseBufferGenerator = async function * (lines) {
	for await (const line of lines) {
		yield textDecoder.decode(line).toUpperCase();
	}
};

const getInputObjectMode = objectMode => objectMode
	? {input: [foobarObject], generator: serializeGenerator, output: foobarObjectString}
	: {input: foobarUint8Array, generator: uppercaseGenerator, output: foobarUppercase};

const getOutputObjectMode = objectMode => objectMode
	? {generator: outputObjectGenerator, output: [foobarObject], getStreamMethod: getStreamAsArray}
	: {generator: uppercaseGenerator, output: foobarUppercase, getStreamMethod: getStream};

const testGeneratorInput = async (t, index, objectMode) => {
	const {input, generator, output} = getInputObjectMode(objectMode);
	const {stdout} = await execa('stdin-fd.js', [`${index}`], getStdio(index, [input, generator]));
	t.is(stdout, output);
};

test('Can use generators with result.stdin', testGeneratorInput, 0, false);
test('Can use generators with result.stdio[*] as input', testGeneratorInput, 3, false);
test('Can use generators with result.stdin, objectMode', testGeneratorInput, 0, true);
test('Can use generators with result.stdio[*] as input, objectMode', testGeneratorInput, 3, true);

const testGeneratorInputPipe = async (t, useShortcutProperty, objectMode, input) => {
	const {generator, output} = getInputObjectMode(objectMode);
	const childProcess = execa('stdin-fd.js', ['0'], getStdio(0, generator));
	const stream = useShortcutProperty ? childProcess.stdin : childProcess.stdio[0];
	stream.end(...input);
	const {stdout} = await childProcess;
	t.is(stdout, output);
};

test('Can use generators with childProcess.stdio[0] and default encoding', testGeneratorInputPipe, false, false, [foobarString, 'utf8']);
test('Can use generators with childProcess.stdin and default encoding', testGeneratorInputPipe, true, false, [foobarString, 'utf8']);
test('Can use generators with childProcess.stdio[0] and encoding "buffer"', testGeneratorInputPipe, false, false, [foobarBuffer, 'buffer']);
test('Can use generators with childProcess.stdin and encoding "buffer"', testGeneratorInputPipe, true, false, [foobarBuffer, 'buffer']);
test('Can use generators with childProcess.stdio[0] and encoding "hex"', testGeneratorInputPipe, false, false, [foobarHex, 'hex']);
test('Can use generators with childProcess.stdin and encoding "hex"', testGeneratorInputPipe, true, false, [foobarHex, 'hex']);
test('Can use generators with childProcess.stdio[0], objectMode', testGeneratorInputPipe, false, true, [foobarObject]);
test('Can use generators with childProcess.stdin, objectMode', testGeneratorInputPipe, true, true, [foobarObject]);

const testGeneratorStdioInputPipe = async (t, objectMode) => {
	const {input, generator, output} = getInputObjectMode(objectMode);
	const childProcess = execa('stdin-fd.js', ['3'], getStdio(3, [new Uint8Array(), generator]));
	childProcess.stdio[3].write(Array.isArray(input) ? input[0] : input);
	const {stdout} = await childProcess;
	t.is(stdout, output);
};

test('Can use generators with childProcess.stdio[*] as input', testGeneratorStdioInputPipe, false);
test('Can use generators with childProcess.stdio[*] as input, objectMode', testGeneratorStdioInputPipe, true);

const testGeneratorReturn = async (t, index, generators, fixtureName) => {
	await t.throwsAsync(
		execa(fixtureName, [`${index}`], getStdio(index, generators)),
		{message: /a string or an Uint8Array/},
	);
};

const inputObjectGenerators = [foobarUint8Array, getOutputGenerator(foobarObject, false), serializeGenerator];
const lastInputObjectGenerators = [foobarUint8Array, getOutputGenerator(foobarObject, true)];
const invalidOutputObjectGenerator = getOutputGenerator(foobarObject, false);

test('Generators with result.stdin cannot return an object if not in objectMode', testGeneratorReturn, 0, inputObjectGenerators, 'stdin-fd.js');
test('Generators with result.stdio[*] as input cannot return an object if not in objectMode', testGeneratorReturn, 3, inputObjectGenerators, 'stdin-fd.js');
test('The last generator with result.stdin cannot return an object even in objectMode', testGeneratorReturn, 0, lastInputObjectGenerators, 'stdin-fd.js');
test('The last generator with result.stdio[*] as input cannot return an object even in objectMode', testGeneratorReturn, 3, lastInputObjectGenerators, 'stdin-fd.js');
test('Generators with result.stdout cannot return an object if not in objectMode', testGeneratorReturn, 1, invalidOutputObjectGenerator, 'noop-fd.js');
test('Generators with result.stderr cannot return an object if not in objectMode', testGeneratorReturn, 2, invalidOutputObjectGenerator, 'noop-fd.js');
test('Generators with result.stdio[*] as output cannot return an object if not in objectMode', testGeneratorReturn, 3, invalidOutputObjectGenerator, 'noop-fd.js');

// eslint-disable-next-line max-params
const testGeneratorOutput = async (t, index, reject, useShortcutProperty, objectMode) => {
	const {generator, output} = getOutputObjectMode(objectMode);
	const fixtureName = reject ? 'noop-fd.js' : 'noop-fail.js';
	const {stdout, stderr, stdio} = await execa(fixtureName, [`${index}`, foobarString], {...getStdio(index, generator), reject});
	const result = useShortcutProperty ? [stdout, stderr][index - 1] : stdio[index];
	t.deepEqual(result, output);
};

test('Can use generators with result.stdio[1]', testGeneratorOutput, 1, true, false, false);
test('Can use generators with result.stdout', testGeneratorOutput, 1, true, true, false);
test('Can use generators with result.stdio[2]', testGeneratorOutput, 2, true, false, false);
test('Can use generators with result.stderr', testGeneratorOutput, 2, true, true, false);
test('Can use generators with result.stdio[*] as output', testGeneratorOutput, 3, true, false, false);
test('Can use generators with error.stdio[1]', testGeneratorOutput, 1, false, false, false);
test('Can use generators with error.stdout', testGeneratorOutput, 1, false, true, false);
test('Can use generators with error.stdio[2]', testGeneratorOutput, 2, false, false, false);
test('Can use generators with error.stderr', testGeneratorOutput, 2, false, true, false);
test('Can use generators with error.stdio[*] as output', testGeneratorOutput, 3, false, false, false);
test('Can use generators with result.stdio[1], objectMode', testGeneratorOutput, 1, true, false, true);
test('Can use generators with result.stdout, objectMode', testGeneratorOutput, 1, true, true, true);
test('Can use generators with result.stdio[2], objectMode', testGeneratorOutput, 2, true, false, true);
test('Can use generators with result.stderr, objectMode', testGeneratorOutput, 2, true, true, true);
test('Can use generators with result.stdio[*] as output, objectMode', testGeneratorOutput, 3, true, false, true);
test('Can use generators with error.stdio[1], objectMode', testGeneratorOutput, 1, false, false, true);
test('Can use generators with error.stdout, objectMode', testGeneratorOutput, 1, false, true, true);
test('Can use generators with error.stdio[2], objectMode', testGeneratorOutput, 2, false, false, true);
test('Can use generators with error.stderr, objectMode', testGeneratorOutput, 2, false, true, true);
test('Can use generators with error.stdio[*] as output, objectMode', testGeneratorOutput, 3, false, false, true);

const testGeneratorOutputPipe = async (t, index, useShortcutProperty, objectMode) => {
	const {generator, output, getStreamMethod} = getOutputObjectMode(objectMode);
	const childProcess = execa('noop-fd.js', [`${index}`, foobarString], {...getStdio(index, generator), buffer: false});
	const stream = useShortcutProperty ? [childProcess.stdout, childProcess.stderr][index - 1] : childProcess.stdio[index];
	const [result] = await Promise.all([getStreamMethod(stream), childProcess]);
	t.deepEqual(result, output);
};

test('Can use generators with childProcess.stdio[1]', testGeneratorOutputPipe, 1, false, false);
test('Can use generators with childProcess.stdout', testGeneratorOutputPipe, 1, true, false);
test('Can use generators with childProcess.stdio[2]', testGeneratorOutputPipe, 2, false, false);
test('Can use generators with childProcess.stderr', testGeneratorOutputPipe, 2, true, false);
test('Can use generators with childProcess.stdio[*] as output', testGeneratorOutputPipe, 3, false, false);
test('Can use generators with childProcess.stdio[1], objectMode', testGeneratorOutputPipe, 1, false, true);
test('Can use generators with childProcess.stdout, objectMode', testGeneratorOutputPipe, 1, true, true);
test('Can use generators with childProcess.stdio[2], objectMode', testGeneratorOutputPipe, 2, false, true);
test('Can use generators with childProcess.stderr, objectMode', testGeneratorOutputPipe, 2, true, true);
test('Can use generators with childProcess.stdio[*] as output, objectMode', testGeneratorOutputPipe, 3, false, true);

const getAllStdioOption = (stdioOption, encoding, objectMode) => {
	if (stdioOption) {
		return 'pipe';
	}

	if (objectMode) {
		return outputObjectGenerator;
	}

	return encoding === 'buffer' ? uppercaseBufferGenerator : uppercaseGenerator;
};

const getStdoutStderrOutput = (output, stdioOption, encoding, objectMode) => {
	if (objectMode && !stdioOption) {
		return [foobarObject];
	}

	const stdioOutput = stdioOption ? output : output.toUpperCase();
	return encoding === 'buffer' ? textEncoder.encode(stdioOutput) : stdioOutput;
};

const getAllOutput = (stdoutOutput, stderrOutput, encoding, objectMode) => {
	if (objectMode) {
		return [stdoutOutput, stderrOutput].flat();
	}

	return encoding === 'buffer'
		? new Uint8Array([...stdoutOutput, ...stderrOutput])
		: `${stdoutOutput}${stderrOutput}`;
};

// eslint-disable-next-line max-params
const testGeneratorAll = async (t, reject, encoding, objectMode, stdoutOption, stderrOption) => {
	const fixtureName = reject ? 'all.js' : 'all-fail.js';
	const {stdout, stderr, all} = await execa(fixtureName, {
		all: true,
		reject,
		stdout: getAllStdioOption(stdoutOption, encoding, objectMode),
		stderr: getAllStdioOption(stderrOption, encoding, objectMode),
		encoding,
		stripFinalNewline: false,
	});

	const stdoutOutput = getStdoutStderrOutput('stdout\n', stdoutOption, encoding, objectMode);
	t.deepEqual(stdout, stdoutOutput);
	const stderrOutput = getStdoutStderrOutput('stderr\n', stderrOption, encoding, objectMode);
	t.deepEqual(stderr, stderrOutput);
	const allOutput = getAllOutput(stdoutOutput, stderrOutput, encoding, objectMode);
	t.deepEqual(all, allOutput);
};

test('Can use generators with result.all = transform + transform', testGeneratorAll, true, 'utf8', false, false, false);
test('Can use generators with error.all = transform + transform', testGeneratorAll, false, 'utf8', false, false, false);
test('Can use generators with result.all = transform + transform, encoding "buffer"', testGeneratorAll, true, 'buffer', false, false, false);
test('Can use generators with error.all = transform + transform, encoding "buffer"', testGeneratorAll, false, 'buffer', false, false, false);
test('Can use generators with result.all = transform + pipe', testGeneratorAll, true, 'utf8', false, false, true);
test('Can use generators with error.all = transform + pipe', testGeneratorAll, false, 'utf8', false, false, true);
test('Can use generators with result.all = transform + pipe, encoding "buffer"', testGeneratorAll, true, 'buffer', false, false, true);
test('Can use generators with error.all = transform + pipe, encoding "buffer"', testGeneratorAll, false, 'buffer', false, false, true);
test('Can use generators with result.all = pipe + transform', testGeneratorAll, true, 'utf8', false, true, false);
test('Can use generators with error.all = pipe + transform', testGeneratorAll, false, 'utf8', false, true, false);
test('Can use generators with result.all = pipe + transform, encoding "buffer"', testGeneratorAll, true, 'buffer', false, true, false);
test('Can use generators with error.all = pipe + transform, encoding "buffer"', testGeneratorAll, false, 'buffer', false, true, false);
test('Can use generators with result.all = transform + transform, objectMode', testGeneratorAll, true, 'utf8', true, false, false);
test('Can use generators with error.all = transform + transform, objectMode', testGeneratorAll, false, 'utf8', true, false, false);
test('Can use generators with result.all = transform + transform, objectMode, encoding "buffer"', testGeneratorAll, true, 'buffer', true, false, false);
test('Can use generators with error.all = transform + transform, objectMode, encoding "buffer"', testGeneratorAll, false, 'buffer', true, false, false);
test('Can use generators with result.all = transform + pipe, objectMode', testGeneratorAll, true, 'utf8', true, false, true);
test('Can use generators with error.all = transform + pipe, objectMode', testGeneratorAll, false, 'utf8', true, false, true);
test('Can use generators with result.all = transform + pipe, objectMode, encoding "buffer"', testGeneratorAll, true, 'buffer', true, false, true);
test('Can use generators with error.all = transform + pipe, objectMode, encoding "buffer"', testGeneratorAll, false, 'buffer', true, false, true);
test('Can use generators with result.all = pipe + transform, objectMode', testGeneratorAll, true, 'utf8', true, true, false);
test('Can use generators with error.all = pipe + transform, objectMode', testGeneratorAll, false, 'utf8', true, true, false);
test('Can use generators with result.all = pipe + transform, objectMode, encoding "buffer"', testGeneratorAll, true, 'buffer', true, true, false);
test('Can use generators with error.all = pipe + transform, objectMode, encoding "buffer"', testGeneratorAll, false, 'buffer', true, true, false);

test('Can use generators with input option', async t => {
	const {stdout} = await execa('stdin-fd.js', ['0'], {stdin: uppercaseGenerator, input: foobarUint8Array});
	t.is(stdout, foobarUppercase);
});

const syncGenerator = function * () {};

const testInvalidGenerator = (t, index, stdioOption) => {
	t.throws(() => {
		execa('empty.js', getStdio(index, stdioOption));
	}, {message: /asynchronous generator/});
};

test('Cannot use sync generators with stdin', testInvalidGenerator, 0, syncGenerator);
test('Cannot use sync generators with stdout', testInvalidGenerator, 1, syncGenerator);
test('Cannot use sync generators with stderr', testInvalidGenerator, 2, syncGenerator);
test('Cannot use sync generators with stdio[*]', testInvalidGenerator, 3, syncGenerator);
test('Cannot use sync generators with stdin, with options', testInvalidGenerator, 0, {transform: syncGenerator});
test('Cannot use sync generators with stdout, with options', testInvalidGenerator, 1, {transform: syncGenerator});
test('Cannot use sync generators with stderr, with options', testInvalidGenerator, 2, {transform: syncGenerator});
test('Cannot use sync generators with stdio[*], with options', testInvalidGenerator, 3, {transform: syncGenerator});
test('Cannot use invalid "transform" with stdin', testInvalidGenerator, 0, {transform: true});
test('Cannot use invalid "transform" with stdout', testInvalidGenerator, 1, {transform: true});
test('Cannot use invalid "transform" with stderr', testInvalidGenerator, 2, {transform: true});
test('Cannot use invalid "transform" with stdio[*]', testInvalidGenerator, 3, {transform: true});

const testInvalidBinary = (t, index, optionName) => {
	t.throws(() => {
		execa('empty.js', getStdio(index, {transform: uppercaseGenerator, [optionName]: 'true'}));
	}, {message: /a boolean/});
};

test('Cannot use invalid "binary" with stdin', testInvalidBinary, 0, 'binary');
test('Cannot use invalid "binary" with stdout', testInvalidBinary, 1, 'binary');
test('Cannot use invalid "binary" with stderr', testInvalidBinary, 2, 'binary');
test('Cannot use invalid "binary" with stdio[*]', testInvalidBinary, 3, 'binary');
test('Cannot use invalid "objectMode" with stdin', testInvalidBinary, 0, 'objectMode');
test('Cannot use invalid "objectMode" with stdout', testInvalidBinary, 1, 'objectMode');
test('Cannot use invalid "objectMode" with stderr', testInvalidBinary, 2, 'objectMode');
test('Cannot use invalid "objectMode" with stdio[*]', testInvalidBinary, 3, 'objectMode');

const testSyncMethods = (t, index) => {
	t.throws(() => {
		execaSync('empty.js', getStdio(index, uppercaseGenerator));
	}, {message: /cannot be a generator/});
};

test('Cannot use generators with sync methods and stdin', testSyncMethods, 0);
test('Cannot use generators with sync methods and stdout', testSyncMethods, 1);
test('Cannot use generators with sync methods and stderr', testSyncMethods, 2);
test('Cannot use generators with sync methods and stdio[*]', testSyncMethods, 3);

const repeatHighWaterMark = 10;

const writerGenerator = async function * (lines) {
	// eslint-disable-next-line no-unused-vars
	for await (const line of lines) {
		for (let index = 0; index < getDefaultHighWaterMark() * repeatHighWaterMark; index += 1) {
			yield '\n';
		}
	}
};

const passThroughGenerator = async function * (chunks) {
	yield * chunks;
};

const getLengthGenerator = async function * (chunks) {
	for await (const chunk of chunks) {
		yield `${chunk.length}`;
	}
};

const testHighWaterMark = async (t, passThrough, binary, objectMode) => {
	const {stdout} = await execa('noop.js', {
		stdout: [
			...(objectMode ? [outputObjectGenerator] : []),
			writerGenerator,
			...(passThrough ? [{transform: passThroughGenerator, binary}] : []),
			{transform: getLengthGenerator, binary: true},
		],
	});
	t.is(stdout, `${getDefaultHighWaterMark()}`.repeat(repeatHighWaterMark));
};

test('Stream respects highWaterMark, no passThrough', testHighWaterMark, false, false, false);
test('Stream respects highWaterMark, line-wise passThrough', testHighWaterMark, true, false, false);
test('Stream respects highWaterMark, binary passThrough', testHighWaterMark, true, true, false);
test('Stream respects highWaterMark, objectMode as input but not output', testHighWaterMark, false, false, true);

const getTypeofGenerator = objectMode => ({
	async * transform(lines) {
		for await (const line of lines) {
			yield Object.prototype.toString.call(line);
		}
	},
	objectMode,
});

// eslint-disable-next-line max-params
const testGeneratorFirstEncoding = async (t, input, encoding, output, objectMode) => {
	const childProcess = execa('stdin.js', {stdin: getTypeofGenerator(objectMode), encoding});
	childProcess.stdin.end(input);
	const {stdout} = await childProcess;
	const result = Buffer.from(stdout, encoding).toString();
	t.is(result, output);
};

test('First generator argument is string with default encoding, with string writes', testGeneratorFirstEncoding, foobarString, 'utf8', '[object String]', false);
test('First generator argument is string with default encoding, with Buffer writes', testGeneratorFirstEncoding, foobarBuffer, 'utf8', '[object String]', false);
test('First generator argument is string with default encoding, with Uint8Array writes', testGeneratorFirstEncoding, foobarUint8Array, 'utf8', '[object String]', false);
test('First generator argument is Uint8Array with encoding "buffer", with string writes', testGeneratorFirstEncoding, foobarString, 'buffer', '[object Uint8Array]', false);
test('First generator argument is Uint8Array with encoding "buffer", with Buffer writes', testGeneratorFirstEncoding, foobarBuffer, 'buffer', '[object Uint8Array]', false);
test('First generator argument is Uint8Array with encoding "buffer", with Uint8Array writes', testGeneratorFirstEncoding, foobarUint8Array, 'buffer', '[object Uint8Array]', false);
test('First generator argument is Uint8Array with encoding "hex", with string writes', testGeneratorFirstEncoding, foobarString, 'hex', '[object String]', false);
test('First generator argument is Uint8Array with encoding "hex", with Buffer writes', testGeneratorFirstEncoding, foobarBuffer, 'hex', '[object String]', false);
test('First generator argument is Uint8Array with encoding "hex", with Uint8Array writes', testGeneratorFirstEncoding, foobarUint8Array, 'hex', '[object String]', false);
test('First generator argument can be string with objectMode', testGeneratorFirstEncoding, foobarString, 'utf8', '[object String]', true);
test('First generator argument can be objects with objectMode', testGeneratorFirstEncoding, foobarObject, 'utf8', '[object Object]', true);

const testEncodingIgnored = async (t, encoding) => {
	const input = Buffer.from(foobarString).toString(encoding);
	const childProcess = execa('stdin.js', {stdin: noopGenerator(true)});
	childProcess.stdin.end(input, encoding);
	const {stdout} = await childProcess;
	t.is(stdout, input);
};

test('Write call encoding "utf8" is ignored with objectMode', testEncodingIgnored, 'utf8');
test('Write call encoding "utf16le" is ignored with objectMode', testEncodingIgnored, 'utf16le');
test('Write call encoding "hex" is ignored with objectMode', testEncodingIgnored, 'hex');
test('Write call encoding "base64" is ignored with objectMode', testEncodingIgnored, 'base64');

// eslint-disable-next-line max-params
const testGeneratorNextEncoding = async (t, input, encoding, firstObjectMode, secondObjectMode, expectedType) => {
	const {stdout} = await execa('noop.js', ['other'], {
		stdout: [
			getOutputGenerator(input, firstObjectMode),
			getTypeofGenerator(secondObjectMode),
		],
		encoding,
	});
	const typeofChunk = Array.isArray(stdout) ? stdout[0] : stdout;
	const output = Buffer.from(typeofChunk, encoding === 'buffer' ? undefined : encoding).toString();
	t.is(output, `[object ${expectedType}]`);
};

test('Next generator argument is string with default encoding, with string writes', testGeneratorNextEncoding, foobarString, 'utf8', false, false, 'String');
test('Next generator argument is string with default encoding, with string writes, objectMode first', testGeneratorNextEncoding, foobarString, 'utf8', true, false, 'String');
test('Next generator argument is string with default encoding, with string writes, objectMode both', testGeneratorNextEncoding, foobarString, 'utf8', true, true, 'String');
test('Next generator argument is string with default encoding, with Buffer writes', testGeneratorNextEncoding, foobarBuffer, 'utf8', false, false, 'String');
test('Next generator argument is string with default encoding, with Buffer writes, objectMode first', testGeneratorNextEncoding, foobarBuffer, 'utf8', true, false, 'String');
test('Next generator argument is string with default encoding, with Buffer writes, objectMode both', testGeneratorNextEncoding, foobarBuffer, 'utf8', true, true, 'String');
test('Next generator argument is string with default encoding, with Uint8Array writes', testGeneratorNextEncoding, foobarUint8Array, 'utf8', false, false, 'String');
test('Next generator argument is string with default encoding, with Uint8Array writes, objectMode first', testGeneratorNextEncoding, foobarUint8Array, 'utf8', true, false, 'String');
test('Next generator argument is string with default encoding, with Uint8Array writes, objectMode both', testGeneratorNextEncoding, foobarUint8Array, 'utf8', true, true, 'String');
test('Next generator argument is Uint8Array with encoding "buffer", with string writes', testGeneratorNextEncoding, foobarString, 'buffer', false, false, 'Uint8Array');
test('Next generator argument is Uint8Array with encoding "buffer", with string writes, objectMode first', testGeneratorNextEncoding, foobarString, 'buffer', true, false, 'Uint8Array');
test('Next generator argument is Uint8Array with encoding "buffer", with string writes, objectMode both', testGeneratorNextEncoding, foobarString, 'buffer', true, true, 'Uint8Array');
test('Next generator argument is Uint8Array with encoding "buffer", with Buffer writes', testGeneratorNextEncoding, foobarBuffer, 'buffer', false, false, 'Uint8Array');
test('Next generator argument is Uint8Array with encoding "buffer", with Buffer writes, objectMode first', testGeneratorNextEncoding, foobarBuffer, 'buffer', true, false, 'Uint8Array');
test('Next generator argument is Uint8Array with encoding "buffer", with Buffer writes, objectMode both', testGeneratorNextEncoding, foobarBuffer, 'buffer', true, true, 'Uint8Array');
test('Next generator argument is Uint8Array with encoding "buffer", with Uint8Array writes', testGeneratorNextEncoding, foobarUint8Array, 'buffer', false, false, 'Uint8Array');
test('Next generator argument is Uint8Array with encoding "buffer", with Uint8Array writes, objectMode first', testGeneratorNextEncoding, foobarUint8Array, 'buffer', true, false, 'Uint8Array');
test('Next generator argument is Uint8Array with encoding "buffer", with Uint8Array writes, objectMode both', testGeneratorNextEncoding, foobarUint8Array, 'buffer', true, true, 'Uint8Array');
test('Next generator argument is Uint8Array with encoding "hex", with string writes', testGeneratorNextEncoding, foobarString, 'hex', false, false, 'String');
test('Next generator argument is Uint8Array with encoding "hex", with Buffer writes', testGeneratorNextEncoding, foobarBuffer, 'hex', false, false, 'String');
test('Next generator argument is Uint8Array with encoding "hex", with Uint8Array writes', testGeneratorNextEncoding, foobarUint8Array, 'hex', false, false, 'String');
test('Next generator argument is object with default encoding, with object writes, objectMode first', testGeneratorNextEncoding, foobarObject, 'utf8', true, false, 'Object');
test('Next generator argument is object with default encoding, with object writes, objectMode both', testGeneratorNextEncoding, foobarObject, 'utf8', true, true, 'Object');

const testFirstOutputGeneratorArgument = async (t, index) => {
	const {stdio} = await execa('noop-fd.js', [`${index}`], getStdio(index, getTypeofGenerator(true)));
	t.deepEqual(stdio[index], ['[object String]']);
};

test('The first generator with result.stdout does not receive an object argument even in objectMode', testFirstOutputGeneratorArgument, 1);
test('The first generator with result.stderr does not receive an object argument even in objectMode', testFirstOutputGeneratorArgument, 2);
test('The first generator with result.stdio[*] does not receive an object argument even in objectMode', testFirstOutputGeneratorArgument, 3);

// eslint-disable-next-line max-params
const testGeneratorReturnType = async (t, input, encoding, reject, objectMode) => {
	const fixtureName = reject ? 'noop-fd.js' : 'noop-fail.js';
	const {stdout} = await execa(fixtureName, ['1', 'other'], {
		stdout: getOutputGenerator(input, objectMode),
		encoding,
		reject,
	});
	const typeofChunk = Array.isArray(stdout) ? stdout[0] : stdout;
	const output = Buffer.from(typeofChunk, encoding === 'buffer' ? undefined : encoding).toString();
	t.is(output, foobarString);
};

test('Generator can return string with default encoding', testGeneratorReturnType, foobarString, 'utf8', true, false);
test('Generator can return Uint8Array with default encoding', testGeneratorReturnType, foobarUint8Array, 'utf8', true, false);
test('Generator can return string with encoding "buffer"', testGeneratorReturnType, foobarString, 'buffer', true, false);
test('Generator can return Uint8Array with encoding "buffer"', testGeneratorReturnType, foobarUint8Array, 'buffer', true, false);
test('Generator can return string with encoding "hex"', testGeneratorReturnType, foobarString, 'hex', true, false);
test('Generator can return Uint8Array with encoding "hex"', testGeneratorReturnType, foobarUint8Array, 'hex', true, false);
test('Generator can return string with default encoding, failure', testGeneratorReturnType, foobarString, 'utf8', false, false);
test('Generator can return Uint8Array with default encoding, failure', testGeneratorReturnType, foobarUint8Array, 'utf8', false, false);
test('Generator can return string with encoding "buffer", failure', testGeneratorReturnType, foobarString, 'buffer', false, false);
test('Generator can return Uint8Array with encoding "buffer", failure', testGeneratorReturnType, foobarUint8Array, 'buffer', false, false);
test('Generator can return string with encoding "hex", failure', testGeneratorReturnType, foobarString, 'hex', false, false);
test('Generator can return Uint8Array with encoding "hex", failure', testGeneratorReturnType, foobarUint8Array, 'hex', false, false);
test('Generator can return string with default encoding, objectMode', testGeneratorReturnType, foobarString, 'utf8', true, true);
test('Generator can return Uint8Array with default encoding, objectMode', testGeneratorReturnType, foobarUint8Array, 'utf8', true, true);
test('Generator can return string with encoding "buffer", objectMode', testGeneratorReturnType, foobarString, 'buffer', true, true);
test('Generator can return Uint8Array with encoding "buffer", objectMode', testGeneratorReturnType, foobarUint8Array, 'buffer', true, true);
test('Generator can return string with encoding "hex", objectMode', testGeneratorReturnType, foobarString, 'hex', true, true);
test('Generator can return Uint8Array with encoding "hex", objectMode', testGeneratorReturnType, foobarUint8Array, 'hex', true, true);
test('Generator can return string with default encoding, objectMode, failure', testGeneratorReturnType, foobarString, 'utf8', false, true);
test('Generator can return Uint8Array with default encoding, objectMode, failure', testGeneratorReturnType, foobarUint8Array, 'utf8', false, true);
test('Generator can return string with encoding "buffer", objectMode, failure', testGeneratorReturnType, foobarString, 'buffer', false, true);
test('Generator can return Uint8Array with encoding "buffer", objectMode, failure', testGeneratorReturnType, foobarUint8Array, 'buffer', false, true);
test('Generator can return string with encoding "hex", objectMode, failure', testGeneratorReturnType, foobarString, 'hex', false, true);
test('Generator can return Uint8Array with encoding "hex", objectMode, failure', testGeneratorReturnType, foobarUint8Array, 'hex', false, true);

const multibyteChar = '\u{1F984}';
const multibyteString = `${multibyteChar}${multibyteChar}`;
const multibyteUint8Array = textEncoder.encode(multibyteString);
const breakingLength = multibyteUint8Array.length * 0.75;
const brokenSymbol = '\uFFFD';

const testMultibyte = async (t, objectMode) => {
	const childProcess = execa('stdin.js', {stdin: noopGenerator(objectMode)});
	childProcess.stdin.write(multibyteUint8Array.slice(0, breakingLength));
	await setTimeout(0);
	childProcess.stdin.end(multibyteUint8Array.slice(breakingLength));
	const {stdout} = await childProcess;
	t.is(stdout, multibyteString);
};

test('Generator handles multibyte characters with Uint8Array', testMultibyte, false);
test('Generator handles multibyte characters with Uint8Array, objectMode', testMultibyte, true);

const testMultibytePartial = async (t, objectMode) => {
	const {stdout} = await execa('stdin.js', {stdin: [multibyteUint8Array.slice(0, breakingLength), noopGenerator(objectMode)]});
	t.is(stdout, `${multibyteChar}${brokenSymbol}`);
};

test('Generator handles partial multibyte characters with Uint8Array', testMultibytePartial, false);
test('Generator handles partial multibyte characters with Uint8Array, objectMode', testMultibytePartial, true);

// eslint-disable-next-line require-yield
const noYieldGenerator = async function * (lines) {
	// eslint-disable-next-line no-empty, no-unused-vars
	for await (const line of lines) {}
};

const testNoYield = async (t, objectMode, output) => {
	const {stdout} = await execa('noop.js', {stdout: {transform: noYieldGenerator, objectMode}});
	t.deepEqual(stdout, output);
};

test('Generator can filter by not calling yield', testNoYield, false, '');
test('Generator can filter by not calling yield, objectMode', testNoYield, true, []);

const prefix = '> ';
const suffix = ' <';

const multipleYieldGenerator = async function * (lines) {
	for await (const line of lines) {
		yield prefix;
		await setTimeout(0);
		yield line;
		await setTimeout(0);
		yield suffix;
	}
};

test('Generator can yield multiple times at different moments', async t => {
	const {stdout} = await execa('noop-fd.js', ['1', foobarString], {stdout: multipleYieldGenerator});
	t.is(stdout, `${prefix}${foobarString}${suffix}`);
});

const testInputFile = async (t, getOptions, reversed) => {
	const filePath = tempfile();
	await writeFile(filePath, foobarString);
	const {stdin, ...options} = getOptions(filePath);
	const reversedStdin = reversed ? stdin.reverse() : stdin;
	const {stdout} = await execa('stdin-fd.js', ['0'], {...options, stdin: reversedStdin});
	t.is(stdout, foobarUppercase);
	await rm(filePath);
};

test('Can use generators with a file as input', testInputFile, filePath => ({stdin: [{file: filePath}, uppercaseGenerator]}), false);
test('Can use generators with a file as input, reversed', testInputFile, filePath => ({stdin: [{file: filePath}, uppercaseGenerator]}), true);
test('Can use generators with inputFile option', testInputFile, filePath => ({inputFile: filePath, stdin: uppercaseGenerator}), false);

const testOutputFile = async (t, reversed) => {
	const filePath = tempfile();
	const stdoutOption = [uppercaseGenerator, {file: filePath}];
	const reversedStdoutOption = reversed ? stdoutOption.reverse() : stdoutOption;
	const {stdout} = await execa('noop-fd.js', ['1'], {stdout: reversedStdoutOption});
	t.is(stdout, foobarUppercase);
	t.is(await readFile(filePath, 'utf8'), foobarUppercase);
	await rm(filePath);
};

test('Can use generators with a file as output', testOutputFile, false);
test('Can use generators with a file as output, reversed', testOutputFile, true);

test('Can use generators to a Writable stream', async t => {
	const passThrough = new PassThrough();
	const [{stdout}, streamOutput] = await Promise.all([
		execa('noop-fd.js', ['1', foobarString], {stdout: [uppercaseGenerator, passThrough]}),
		getStream(passThrough),
	]);
	t.is(stdout, foobarUppercase);
	t.is(streamOutput, foobarUppercase);
});

test('Can use generators from a Readable stream', async t => {
	const passThrough = new PassThrough();
	const childProcess = execa('stdin-fd.js', ['0'], {stdin: [passThrough, uppercaseGenerator]});
	passThrough.end(foobarString);
	const {stdout} = await childProcess;
	t.is(stdout, foobarUppercase);
});

test('Can use generators with "inherit"', async t => {
	const {stdout} = await execa('nested-inherit.js');
	t.is(stdout, foobarUppercase);
});

const casedSuffix = 'k';

const appendGenerator = async function * (lines) {
	for await (const line of lines) {
		yield `${line}${casedSuffix}`;
	}
};

const testAppendInput = async (t, reversed) => {
	const stdin = [foobarUint8Array, uppercaseGenerator, appendGenerator];
	const reversedStdin = reversed ? stdin.reverse() : stdin;
	const {stdout} = await execa('stdin-fd.js', ['0'], {stdin: reversedStdin});
	const reversedSuffix = reversed ? casedSuffix.toUpperCase() : casedSuffix;
	t.is(stdout, `${foobarUppercase}${reversedSuffix}`);
};

test('Can use multiple generators as input', testAppendInput, false);
test('Can use multiple generators as input, reversed', testAppendInput, true);

const testAppendOutput = async (t, reversed) => {
	const stdoutOption = [uppercaseGenerator, appendGenerator];
	const reversedStdoutOption = reversed ? stdoutOption.reverse() : stdoutOption;
	const {stdout} = await execa('noop-fd.js', ['1', foobarString], {stdout: reversedStdoutOption});
	const reversedSuffix = reversed ? casedSuffix.toUpperCase() : casedSuffix;
	t.is(stdout, `${foobarUppercase}${reversedSuffix}`);
};

test('Can use multiple generators as output', testAppendOutput, false);
test('Can use multiple generators as output, reversed', testAppendOutput, true);

test('Can use multiple identical generators', async t => {
	const {stdout} = await execa('noop-fd.js', ['1', foobarString], {stdout: [appendGenerator, appendGenerator]});
	t.is(stdout, `${foobarString}${casedSuffix}${casedSuffix}`);
});

const maxBuffer = 10;

test('Generators take "maxBuffer" into account', async t => {
	const bigString = '.'.repeat(maxBuffer);
	const {stdout} = await execa('noop.js', {maxBuffer, stdout: getOutputGenerator(bigString, false)});
	t.is(stdout, bigString);

	await t.throwsAsync(execa('noop.js', {maxBuffer, stdout: getOutputGenerator(`${bigString}.`, false)}));
});

test('Generators take "maxBuffer" into account, objectMode', async t => {
	const bigArray = Array.from({length: maxBuffer});
	const {stdout} = await execa('noop.js', {maxBuffer, stdout: getOutputsGenerator(bigArray, true)});
	t.is(stdout.length, maxBuffer);

	await t.throwsAsync(execa('noop.js', {maxBuffer, stdout: getOutputsGenerator([...bigArray, ''], true)}));
});

const timeoutGenerator = async function * (timeout, lines) {
	for await (const line of lines) {
		await setTimeout(timeout);
		yield line;
	}
};

test('Generators are awaited on success', async t => {
	const {stdout} = await execa('noop-fd.js', ['1', foobarString], {maxBuffer, stdout: timeoutGenerator.bind(undefined, 1e3)});
	t.is(stdout, foobarString);
});

// eslint-disable-next-line require-yield
const throwingGenerator = async function * (lines) {
	// eslint-disable-next-line no-unreachable-loop
	for await (const line of lines) {
		throw new Error(`Generator error ${line}`);
	}
};

test('Generators errors make process fail', async t => {
	await t.throwsAsync(
		execa('noop-fd.js', ['1', foobarString], {stdout: throwingGenerator}),
		{message: /Generator error foobar/},
	);
});

// eslint-disable-next-line require-yield
const errorHandlerGenerator = async function * (state, lines) {
	try {
		// eslint-disable-next-line no-unused-vars
		for await (const line of lines) {
			await setTimeout(1e8);
		}
	} catch (error) {
		state.error = error;
	}
};

test.serial('Process streams failures make generators throw', async t => {
	const state = {};
	const childProcess = execa('noop-fail.js', ['1'], {stdout: errorHandlerGenerator.bind(undefined, state)});
	const error = new Error('test');
	childProcess.stdout.emit('error', error);
	const thrownError = await t.throwsAsync(childProcess);
	t.is(error, thrownError);
	await setTimeout(0);
	t.is(state.error.code, 'ABORT_ERR');
});
