// For some reason a default import of `process` causes
// `process.stdin`, `process.stderr`, and `process.stdout`
// to get treated as `any` by `@typescript-eslint/no-unsafe-assignment`.
import * as process from 'node:process';
import {Readable, Writable} from 'node:stream';
import {createWriteStream} from 'node:fs';
import {expectType, expectError, expectAssignable, expectNotAssignable} from 'tsd';
import {
	$,
	execa,
	execaSync,
	execaCommand,
	execaCommandSync,
	execaNode,
	type Options,
	type ExecaReturnValue,
	type ExecaChildProcess,
	type ExecaError,
	type SyncOptions,
	type ExecaSyncReturnValue,
	type ExecaSyncError,
} from './index.js';

type AnySyncChunk = string | Uint8Array | undefined;
type AnyChunk = AnySyncChunk | unknown[];
expectType<Readable | null>({} as ExecaChildProcess['stdout']);
expectType<Readable | null>({} as ExecaChildProcess['stderr']);
expectType<Readable | undefined>({} as ExecaChildProcess['all']);
expectType<AnyChunk>({} as ExecaReturnValue['stdout']);
expectType<AnyChunk>({} as ExecaReturnValue['stderr']);
expectType<AnyChunk>({} as ExecaReturnValue['all']);
expectType<[undefined, AnyChunk, AnyChunk]>({} as ExecaReturnValue['stdio']);
expectType<AnySyncChunk>({} as ExecaSyncReturnValue['stdout']);
expectType<AnySyncChunk>({} as ExecaSyncReturnValue['stderr']);
expectType<[undefined, AnySyncChunk, AnySyncChunk]>({} as ExecaSyncReturnValue['stdio']);

const objectGenerator = async function * (lines: Iterable<unknown>) {
	for await (const line of lines) {
		yield JSON.parse(line as string) as object;
	}
};

const unknownArrayGenerator = async function * (lines: Iterable<unknown>) {
	for await (const line of lines) {
		yield line;
	}
};

const booleanGenerator = async function * (lines: Iterable<boolean>) {
	for await (const line of lines) {
		yield line;
	}
};

const arrayGenerator = async function * (lines: string[]) {
	for await (const line of lines) {
		yield line;
	}
};

const invalidReturnGenerator = async function * (lines: Iterable<string>) {
	for await (const line of lines) {
		yield line;
	}

	return false;
};

const syncGenerator = function * (lines: Iterable<string>) {
	for (const line of lines) {
		yield line;
	}

	return false;
};

try {
	const execaPromise = execa('unicorns', {all: true});

	const execaBufferPromise = execa('unicorns', {encoding: 'buffer', all: true});
	const writeStream = createWriteStream('output.txt');

	expectAssignable<Function | undefined>(execaPromise.pipeStdout);
	expectAssignable<ExecaChildProcess>(execaPromise.pipeStdout!('file.txt'));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeStdout!('file.txt'));
	expectAssignable<ExecaChildProcess>(execaPromise.pipeStdout!(writeStream));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeStdout!(writeStream));
	expectAssignable<ExecaChildProcess>(execaPromise.pipeStdout!(execaPromise));
	expectAssignable<ExecaChildProcess>(execaPromise.pipeStdout!(execaBufferPromise));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeStdout!(execaPromise));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeStdout!(execaBufferPromise));

	expectAssignable<Function | undefined>(execaPromise.pipeStderr);
	expectAssignable<ExecaChildProcess>(execaPromise.pipeStderr!('file.txt'));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeStderr!('file.txt'));
	expectAssignable<ExecaChildProcess>(execaPromise.pipeStderr!(writeStream));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeStderr!(writeStream));
	expectAssignable<ExecaChildProcess>(execaPromise.pipeStderr!(execaPromise));
	expectAssignable<ExecaChildProcess>(execaPromise.pipeStderr!(execaBufferPromise));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeStderr!(execaPromise));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeStderr!(execaBufferPromise));

	expectAssignable<Function | undefined>(execaPromise.pipeAll);
	expectAssignable<ExecaChildProcess>(execaPromise.pipeAll!('file.txt'));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeAll!('file.txt'));
	expectAssignable<ExecaChildProcess>(execaPromise.pipeAll!(writeStream));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeAll!(writeStream));
	expectAssignable<ExecaChildProcess>(execaPromise.pipeAll!(execaPromise));
	expectAssignable<ExecaChildProcess>(execaPromise.pipeAll!(execaBufferPromise));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeAll!(execaPromise));
	expectAssignable<ExecaChildProcess>(execaBufferPromise.pipeAll!(execaBufferPromise));

	expectType<Readable>(execaPromise.all);
	const noAllPromise = execa('unicorns');
	expectType<undefined>(noAllPromise.all);
	const noAllResult = await noAllPromise;
	expectType<undefined>(noAllResult.all);

	const unicornsResult = await execaPromise;
	expectType<string>(unicornsResult.command);
	expectType<string>(unicornsResult.escapedCommand);
	expectType<number | undefined>(unicornsResult.exitCode);
	expectType<boolean>(unicornsResult.failed);
	expectType<boolean>(unicornsResult.timedOut);
	expectType<boolean>(unicornsResult.isCanceled);
	expectType<boolean>(unicornsResult.isTerminated);
	expectType<string | undefined>(unicornsResult.signal);
	expectType<string | undefined>(unicornsResult.signalDescription);
	expectType<string>(unicornsResult.cwd);

	expectType<undefined>(unicornsResult.stdio[0]);
	expectType<string>(unicornsResult.stdout);
	expectType<string>(unicornsResult.stdio[1]);
	expectType<string>(unicornsResult.stderr);
	expectType<string>(unicornsResult.stdio[2]);
	expectType<string>(unicornsResult.all);
	expectType<string | undefined>(unicornsResult.stdio[3 as number]);

	expectType<Readable>(execaBufferPromise.stdout);
	expectType<Readable>(execaBufferPromise.stderr);
	expectType<Readable>(execaBufferPromise.all);
	const bufferResult = await execaBufferPromise;
	expectType<Uint8Array>(bufferResult.stdout);
	expectType<Uint8Array>(bufferResult.stdio[1]);
	expectType<Uint8Array>(bufferResult.stderr);
	expectType<Uint8Array>(bufferResult.stdio[2]);
	expectType<Uint8Array>(bufferResult.all);

	const noBufferPromise = execa('unicorns', {buffer: false, all: true});
	expectType<Readable>(noBufferPromise.stdout);
	expectType<Readable>(noBufferPromise.stderr);
	expectType<Readable>(noBufferPromise.all);
	const noBufferResult = await noBufferPromise;
	expectType<undefined>(noBufferResult.stdout);
	expectType<undefined>(noBufferResult.stdio[1]);
	expectType<undefined>(noBufferResult.stderr);
	expectType<undefined>(noBufferResult.stdio[2]);
	expectType<undefined>(noBufferResult.all);

	const multipleStdoutPromise = execa('unicorns', {stdout: ['inherit', 'pipe'] as ['inherit', 'pipe'], all: true});
	expectType<Readable>(multipleStdoutPromise.stdout);
	expectType<Readable>(multipleStdoutPromise.stderr);
	expectType<Readable>(multipleStdoutPromise.all);
	const multipleStdoutResult = await multipleStdoutPromise;
	expectType<string>(multipleStdoutResult.stdout);
	expectType<string>(multipleStdoutResult.stdio[1]);
	expectType<string>(multipleStdoutResult.stderr);
	expectType<string>(multipleStdoutResult.stdio[2]);
	expectType<string>(multipleStdoutResult.all);

	const ignoreBothPromise = execa('unicorns', {stdout: 'ignore', stderr: 'ignore', all: true});
	expectType<null>(ignoreBothPromise.stdout);
	expectType<null>(ignoreBothPromise.stderr);
	expectType<undefined>(ignoreBothPromise.all);
	const ignoreBothResult = await ignoreBothPromise;
	expectType<undefined>(ignoreBothResult.stdout);
	expectType<undefined>(ignoreBothResult.stdio[1]);
	expectType<undefined>(ignoreBothResult.stderr);
	expectType<undefined>(ignoreBothResult.stdio[2]);
	expectType<undefined>(ignoreBothResult.all);

	const ignoreAllPromise = execa('unicorns', {stdio: 'ignore', all: true});
	expectType<null>(ignoreAllPromise.stdout);
	expectType<null>(ignoreAllPromise.stderr);
	expectType<undefined>(ignoreAllPromise.all);
	const ignoreAllResult = await ignoreAllPromise;
	expectType<undefined>(ignoreAllResult.stdout);
	expectType<undefined>(ignoreAllResult.stdio[1]);
	expectType<undefined>(ignoreAllResult.stderr);
	expectType<undefined>(ignoreAllResult.stdio[2]);
	expectType<undefined>(ignoreAllResult.all);

	const ignoreStdioArrayPromise = execa('unicorns', {stdio: ['pipe', 'ignore', 'pipe'], all: true});
	expectType<null>(ignoreStdioArrayPromise.stdout);
	expectType<Readable>(ignoreStdioArrayPromise.stderr);
	expectType<Readable>(ignoreStdioArrayPromise.all);
	const ignoreStdioArrayResult = await ignoreStdioArrayPromise;
	expectType<undefined>(ignoreStdioArrayResult.stdout);
	expectType<undefined>(ignoreStdioArrayResult.stdio[1]);
	expectType<string>(ignoreStdioArrayResult.stderr);
	expectType<string>(ignoreStdioArrayResult.stdio[2]);
	expectType<string>(ignoreStdioArrayResult.all);

	const ignoreStdoutPromise = execa('unicorns', {stdout: 'ignore', all: true});
	expectType<null>(ignoreStdoutPromise.stdout);
	expectType<Readable>(ignoreStdoutPromise.stderr);
	expectType<Readable>(ignoreStdoutPromise.all);
	const ignoreStdoutResult = await ignoreStdoutPromise;
	expectType<undefined>(ignoreStdoutResult.stdout);
	expectType<string>(ignoreStdoutResult.stderr);
	expectType<string>(ignoreStdoutResult.all);

	const ignoreArrayStdoutResult = await execa('unicorns', {stdout: ['ignore'] as ['ignore'], all: true});
	expectType<undefined>(ignoreArrayStdoutResult.stdout);
	expectType<string>(ignoreArrayStdoutResult.stderr);
	expectType<string>(ignoreArrayStdoutResult.all);

	const ignoreStderrPromise = execa('unicorns', {stderr: 'ignore', all: true});
	expectType<Readable>(ignoreStderrPromise.stdout);
	expectType<null>(ignoreStderrPromise.stderr);
	expectType<Readable>(ignoreStderrPromise.all);
	const ignoreStderrResult = await ignoreStderrPromise;
	expectType<string>(ignoreStderrResult.stdout);
	expectType<undefined>(ignoreStderrResult.stderr);
	expectType<string>(ignoreStderrResult.all);

	const ignoreArrayStderrResult = await execa('unicorns', {stderr: ['ignore'] as ['ignore'], all: true});
	expectType<string>(ignoreArrayStderrResult.stdout);
	expectType<undefined>(ignoreArrayStderrResult.stderr);
	expectType<string>(ignoreArrayStderrResult.all);

	const inheritStdoutResult = await execa('unicorns', {stdout: 'inherit', all: true});
	expectType<undefined>(inheritStdoutResult.stdout);
	expectType<string>(inheritStdoutResult.stderr);
	expectType<string>(inheritStdoutResult.all);

	const inheritArrayStdoutResult = await execa('unicorns', {stdout: ['inherit'] as ['inherit'], all: true});
	expectType<undefined>(inheritArrayStdoutResult.stdout);
	expectType<string>(inheritArrayStdoutResult.stderr);
	expectType<string>(inheritArrayStdoutResult.all);

	const inheritStderrResult = await execa('unicorns', {stderr: 'inherit', all: true});
	expectType<string>(inheritStderrResult.stdout);
	expectType<undefined>(inheritStderrResult.stderr);
	expectType<string>(inheritStderrResult.all);

	const inheritArrayStderrResult = await execa('unicorns', {stderr: ['inherit'] as ['inherit'], all: true});
	expectType<string>(inheritArrayStderrResult.stdout);
	expectType<undefined>(inheritArrayStderrResult.stderr);
	expectType<string>(inheritArrayStderrResult.all);

	const ipcStdoutResult = await execa('unicorns', {stdout: 'ipc', all: true});
	expectType<undefined>(ipcStdoutResult.stdout);
	expectType<string>(ipcStdoutResult.stderr);
	expectType<string>(ipcStdoutResult.all);

	const ipcArrayStdoutResult = await execa('unicorns', {stdout: ['ipc'] as ['ipc'], all: true});
	expectType<undefined>(ipcArrayStdoutResult.stdout);
	expectType<string>(ipcArrayStdoutResult.stderr);
	expectType<string>(ipcArrayStdoutResult.all);

	const ipcStderrResult = await execa('unicorns', {stderr: 'ipc', all: true});
	expectType<string>(ipcStderrResult.stdout);
	expectType<undefined>(ipcStderrResult.stderr);
	expectType<string>(ipcStderrResult.all);

	const ipcArrayStderrResult = await execa('unicorns', {stderr: ['ipc'] as ['ipc'], all: true});
	expectType<string>(ipcArrayStderrResult.stdout);
	expectType<undefined>(ipcArrayStderrResult.stderr);
	expectType<string>(ipcArrayStderrResult.all);

	const numberStdoutResult = await execa('unicorns', {stdout: 1, all: true});
	expectType<undefined>(numberStdoutResult.stdout);
	expectType<string>(numberStdoutResult.stderr);
	expectType<string>(numberStdoutResult.all);

	const numberArrayStdoutResult = await execa('unicorns', {stdout: [1] as [1], all: true});
	expectType<undefined>(numberArrayStdoutResult.stdout);
	expectType<string>(numberArrayStdoutResult.stderr);
	expectType<string>(numberArrayStdoutResult.all);

	const numberStderrResult = await execa('unicorns', {stderr: 1, all: true});
	expectType<string>(numberStderrResult.stdout);
	expectType<undefined>(numberStderrResult.stderr);
	expectType<string>(numberStderrResult.all);

	const numberArrayStderrResult = await execa('unicorns', {stderr: [1] as [1], all: true});
	expectType<string>(numberArrayStderrResult.stdout);
	expectType<undefined>(numberArrayStderrResult.stderr);
	expectType<string>(numberArrayStderrResult.all);

	const streamStdoutResult = await execa('unicorns', {stdout: process.stdout, all: true});
	expectType<undefined>(streamStdoutResult.stdout);
	expectType<string>(streamStdoutResult.stderr);
	expectType<string>(streamStdoutResult.all);

	const streamArrayStdoutResult = await execa('unicorns', {stdout: [process.stdout] as [typeof process.stdout], all: true});
	expectType<undefined>(streamArrayStdoutResult.stdout);
	expectType<string>(streamArrayStdoutResult.stderr);
	expectType<string>(streamArrayStdoutResult.all);

	const streamStderrResult = await execa('unicorns', {stderr: process.stdout, all: true});
	expectType<string>(streamStderrResult.stdout);
	expectType<undefined>(streamStderrResult.stderr);
	expectType<string>(streamStderrResult.all);

	const streamArrayStderrResult = await execa('unicorns', {stderr: [process.stdout] as [typeof process.stdout], all: true});
	expectType<string>(streamArrayStderrResult.stdout);
	expectType<undefined>(streamArrayStderrResult.stderr);
	expectType<string>(streamArrayStderrResult.all);

	const fd3Result = await execa('unicorns', {stdio: ['pipe', 'pipe', 'pipe', 'pipe']});
	expectType<string>(fd3Result.stdio[3]);

	const inputFd3Result = await execa('unicorns', {stdio: ['pipe', 'pipe', 'pipe', ['pipe', new Readable()]]});
	expectType<undefined>(inputFd3Result.stdio[3]);

	const outputFd3Result = await execa('unicorns', {stdio: ['pipe', 'pipe', 'pipe', ['pipe', new Writable()]]});
	expectType<string>(outputFd3Result.stdio[3]);

	const bufferFd3Result = await execa('unicorns', {stdio: ['pipe', 'pipe', 'pipe', 'pipe'], encoding: 'buffer'});
	expectType<Uint8Array>(bufferFd3Result.stdio[3]);

	const noBufferFd3Result = await execa('unicorns', {stdio: ['pipe', 'pipe', 'pipe', 'pipe'], buffer: false});
	expectType<undefined>(noBufferFd3Result.stdio[3]);

	const ignoreFd3Result = await execa('unicorns', {stdio: ['pipe', 'pipe', 'pipe', 'ignore']});
	expectType<undefined>(ignoreFd3Result.stdio[3]);

	const objectTransformStdoutResult = await execa('unicorns', {stdout: {transform: objectGenerator, objectMode: true}});
	expectType<unknown[]>(objectTransformStdoutResult.stdout);
	expectType<[undefined, unknown[], string]>(objectTransformStdoutResult.stdio);

	const objectTransformStderrResult = await execa('unicorns', {stderr: {transform: objectGenerator, objectMode: true}});
	expectType<unknown[]>(objectTransformStderrResult.stderr);
	expectType<[undefined, string, unknown[]]>(objectTransformStderrResult.stdio);

	const objectTransformStdioResult = await execa('unicorns', {stdio: ['pipe', 'pipe', {transform: objectGenerator, objectMode: true}]});
	expectType<unknown[]>(objectTransformStdioResult.stderr);
	expectType<[undefined, string, unknown[]]>(objectTransformStdioResult.stdio);

	const singleObjectTransformStdoutResult = await execa('unicorns', {stdout: [{transform: objectGenerator, objectMode: true}]});
	expectType<unknown[]>(singleObjectTransformStdoutResult.stdout);
	expectType<[undefined, unknown[], string]>(singleObjectTransformStdoutResult.stdio);

	const manyObjectTransformStdoutResult = await execa('unicorns', {stdout: [{transform: objectGenerator, objectMode: true}, {transform: objectGenerator, objectMode: true}]});
	expectType<unknown[]>(manyObjectTransformStdoutResult.stdout);
	expectType<[undefined, unknown[], string]>(manyObjectTransformStdoutResult.stdio);

	const falseObjectTransformStdoutResult = await execa('unicorns', {stdout: {transform: objectGenerator, objectMode: false}});
	expectType<string>(falseObjectTransformStdoutResult.stdout);
	expectType<[undefined, string, string]>(falseObjectTransformStdoutResult.stdio);

	const falseObjectTransformStderrResult = await execa('unicorns', {stderr: {transform: objectGenerator, objectMode: false}});
	expectType<string>(falseObjectTransformStderrResult.stderr);
	expectType<[undefined, string, string]>(falseObjectTransformStderrResult.stdio);

	const falseObjectTransformStdioResult = await execa('unicorns', {stdio: ['pipe', 'pipe', {transform: objectGenerator, objectMode: false}]});
	expectType<string>(falseObjectTransformStdioResult.stderr);
	expectType<[undefined, string, string]>(falseObjectTransformStdioResult.stdio);

	const undefinedObjectTransformStdoutResult = await execa('unicorns', {stdout: {transform: objectGenerator}});
	expectType<string>(undefinedObjectTransformStdoutResult.stdout);
	expectType<[undefined, string, string]>(undefinedObjectTransformStdoutResult.stdio);

	const noObjectTransformStdoutResult = await execa('unicorns', {stdout: objectGenerator});
	expectType<string>(noObjectTransformStdoutResult.stdout);
	expectType<[undefined, string, string]>(noObjectTransformStdoutResult.stdio);

	const trueTrueObjectTransformResult = await execa('unicorns', {stdout: {transform: objectGenerator, objectMode: true}, stderr: {transform: objectGenerator, objectMode: true}, all: true});
	expectType<unknown[]>(trueTrueObjectTransformResult.stdout);
	expectType<unknown[]>(trueTrueObjectTransformResult.stderr);
	expectType<unknown[]>(trueTrueObjectTransformResult.all);
	expectType<[undefined, unknown[], unknown[]]>(trueTrueObjectTransformResult.stdio);

	const trueFalseObjectTransformResult = await execa('unicorns', {stdout: {transform: objectGenerator, objectMode: true}, stderr: {transform: objectGenerator, objectMode: false}, all: true});
	expectType<unknown[]>(trueFalseObjectTransformResult.stdout);
	expectType<string>(trueFalseObjectTransformResult.stderr);
	expectType<unknown[]>(trueFalseObjectTransformResult.all);
	expectType<[undefined, unknown[], string]>(trueFalseObjectTransformResult.stdio);

	const falseTrueObjectTransformResult = await execa('unicorns', {stdout: {transform: objectGenerator, objectMode: false}, stderr: {transform: objectGenerator, objectMode: true}, all: true});
	expectType<string>(falseTrueObjectTransformResult.stdout);
	expectType<unknown[]>(falseTrueObjectTransformResult.stderr);
	expectType<unknown[]>(falseTrueObjectTransformResult.all);
	expectType<[undefined, string, unknown[]]>(falseTrueObjectTransformResult.stdio);

	const falseFalseObjectTransformResult = await execa('unicorns', {stdout: {transform: objectGenerator, objectMode: false}, stderr: {transform: objectGenerator, objectMode: false}, all: true});
	expectType<string>(falseFalseObjectTransformResult.stdout);
	expectType<string>(falseFalseObjectTransformResult.stderr);
	expectType<string>(falseFalseObjectTransformResult.all);
	expectType<[undefined, string, string]>(falseFalseObjectTransformResult.stdio);
} catch (error: unknown) {
	const execaError = error as ExecaError;

	expectType<string>(execaError.message);
	expectType<number | undefined>(execaError.exitCode);
	expectType<boolean>(execaError.failed);
	expectType<boolean>(execaError.timedOut);
	expectType<boolean>(execaError.isCanceled);
	expectType<boolean>(execaError.isTerminated);
	expectType<string | undefined>(execaError.signal);
	expectType<string | undefined>(execaError.signalDescription);
	expectType<string>(execaError.cwd);
	expectType<string>(execaError.shortMessage);
	expectType<string | undefined>(execaError.originalMessage);

	expectType<undefined>(execaError.stdio[0]);

	const noAllError = error as ExecaError<{}>;
	expectType<undefined>(noAllError.all);

	const execaStringError = error as ExecaError<{all: true}>;
	expectType<string>(execaStringError.stdout);
	expectType<string>(execaStringError.stdio[1]);
	expectType<string>(execaStringError.stderr);
	expectType<string>(execaStringError.stdio[2]);
	expectType<string>(execaStringError.all);

	const execaBufferError = error as ExecaError<{encoding: 'buffer'; all: true}>;
	expectType<Uint8Array>(execaBufferError.stdout);
	expectType<Uint8Array>(execaBufferError.stdio[1]);
	expectType<Uint8Array>(execaBufferError.stderr);
	expectType<Uint8Array>(execaBufferError.stdio[2]);
	expectType<Uint8Array>(execaBufferError.all);

	const noBufferError = error as ExecaError<{buffer: false; all: true}>;
	expectType<undefined>(noBufferError.stdout);
	expectType<undefined>(noBufferError.stdio[1]);
	expectType<undefined>(noBufferError.stderr);
	expectType<undefined>(noBufferError.stdio[2]);
	expectType<undefined>(noBufferError.all);

	const ignoreStdoutError = error as ExecaError<{stdout: 'ignore'; all: true}>;
	expectType<undefined>(ignoreStdoutError.stdout);
	expectType<undefined>(ignoreStdoutError.stdio[1]);
	expectType<string>(ignoreStdoutError.stderr);
	expectType<string>(ignoreStdoutError.stdio[2]);
	expectType<string>(ignoreStdoutError.all);

	const ignoreStderrError = error as ExecaError<{stderr: 'ignore'; all: true}>;
	expectType<string>(ignoreStderrError.stdout);
	expectType<undefined>(ignoreStderrError.stderr);
	expectType<string>(ignoreStderrError.all);

	const inheritStdoutError = error as ExecaError<{stdout: 'inherit'; all: true}>;
	expectType<undefined>(inheritStdoutError.stdout);
	expectType<string>(inheritStdoutError.stderr);
	expectType<string>(inheritStdoutError.all);

	const inheritStderrError = error as ExecaError<{stderr: 'inherit'; all: true}>;
	expectType<string>(inheritStderrError.stdout);
	expectType<undefined>(inheritStderrError.stderr);
	expectType<string>(inheritStderrError.all);

	const ipcStdoutError = error as ExecaError<{stdout: 'ipc'; all: true}>;
	expectType<undefined>(ipcStdoutError.stdout);
	expectType<string>(ipcStdoutError.stderr);
	expectType<string>(ipcStdoutError.all);

	const ipcStderrError = error as ExecaError<{stderr: 'ipc'; all: true}>;
	expectType<string>(ipcStderrError.stdout);
	expectType<undefined>(ipcStderrError.stderr);
	expectType<string>(ipcStderrError.all);

	const numberStdoutError = error as ExecaError<{stdout: 1; all: true}>;
	expectType<undefined>(numberStdoutError.stdout);
	expectType<string>(numberStdoutError.stderr);
	expectType<string>(numberStdoutError.all);

	const numberStderrError = error as ExecaError<{stderr: 1; all: true}>;
	expectType<string>(numberStderrError.stdout);
	expectType<undefined>(numberStderrError.stderr);
	expectType<string>(numberStderrError.all);

	const streamStdoutError = error as ExecaError<{stdout: typeof process.stdout; all: true}>;
	expectType<undefined>(streamStdoutError.stdout);
	expectType<string>(streamStdoutError.stderr);
	expectType<string>(streamStdoutError.all);

	const streamStderrError = error as ExecaError<{stderr: typeof process.stdout; all: true}>;
	expectType<string>(streamStderrError.stdout);
	expectType<undefined>(streamStderrError.stderr);
	expectType<string>(streamStderrError.all);

	const objectTransformStdoutError = error as ExecaError<{stdout: {transform: typeof objectGenerator; objectMode: true}}>;
	expectType<unknown[]>(objectTransformStdoutError.stdout);
	expectType<[undefined, unknown[], string]>(objectTransformStdoutError.stdio);

	const objectTransformStderrError = error as ExecaError<{stderr: {transform: typeof objectGenerator; objectMode: true}}>;
	expectType<unknown[]>(objectTransformStderrError.stderr);
	expectType<[undefined, string, unknown[]]>(objectTransformStderrError.stdio);

	const objectTransformStdioError = error as ExecaError<{stdio: ['pipe', 'pipe', {transform: typeof objectGenerator; objectMode: true}]}>;
	expectType<unknown[]>(objectTransformStdioError.stderr);
	expectType<[undefined, string, unknown[]]>(objectTransformStdioError.stdio);

	const falseObjectTransformStdoutError = error as ExecaError<{stdout: {transform: typeof objectGenerator; objectMode: false}}>;
	expectType<string>(falseObjectTransformStdoutError.stdout);
	expectType<[undefined, string, string]>(falseObjectTransformStdoutError.stdio);

	const falseObjectTransformStderrError = error as ExecaError<{stderr: {transform: typeof objectGenerator; objectMode: false}}>;
	expectType<string>(falseObjectTransformStderrError.stderr);
	expectType<[undefined, string, string]>(falseObjectTransformStderrError.stdio);

	const falseObjectTransformStdioError = error as ExecaError<{stdio: ['pipe', 'pipe', {transform: typeof objectGenerator; objectMode: false}]}>;
	expectType<string>(falseObjectTransformStdioError.stderr);
	expectType<[undefined, string, string]>(falseObjectTransformStdioError.stdio);
}

const rejectsResult = await execa('unicorns');
expectError(rejectsResult.stack);
expectError(rejectsResult.message);
expectError(rejectsResult.shortMessage);
expectError(rejectsResult.originalMessage);

const noRejectsResult = await execa('unicorns', {reject: false});
expectType<string | undefined>(noRejectsResult.stack);
expectType<string | undefined>(noRejectsResult.message);
expectType<string | undefined>(noRejectsResult.shortMessage);
expectType<string | undefined>(noRejectsResult.originalMessage);

try {
	const unicornsResult = execaSync('unicorns');

	expectAssignable<ExecaSyncReturnValue>(unicornsResult);
	expectType<string>(unicornsResult.command);
	expectType<string>(unicornsResult.escapedCommand);
	expectType<number | undefined>(unicornsResult.exitCode);
	expectError(unicornsResult.pipeStdout);
	expectError(unicornsResult.pipeStderr);
	expectError(unicornsResult.pipeAll);
	expectType<boolean>(unicornsResult.failed);
	expectType<boolean>(unicornsResult.timedOut);
	expectType<boolean>(unicornsResult.isCanceled);
	expectType<boolean>(unicornsResult.isTerminated);
	expectType<string | undefined>(unicornsResult.signal);
	expectType<string | undefined>(unicornsResult.signalDescription);
	expectType<string>(unicornsResult.cwd);

	expectType<undefined>(unicornsResult.stdio[0]);
	expectType<string>(unicornsResult.stdout);
	expectType<string>(unicornsResult.stdio[1]);
	expectType<string>(unicornsResult.stderr);
	expectType<string>(unicornsResult.stdio[2]);
	expectError(unicornsResult.all.toString());

	const bufferResult = execaSync('unicorns', {encoding: 'buffer'});
	expectType<Uint8Array>(bufferResult.stdout);
	expectType<Uint8Array>(bufferResult.stdio[1]);
	expectType<Uint8Array>(bufferResult.stderr);
	expectType<Uint8Array>(bufferResult.stdio[2]);
	expectError(bufferResult.all.toString());

	const ignoreStdoutResult = execaSync('unicorns', {stdout: 'ignore'});
	expectType<undefined>(ignoreStdoutResult.stdout);
	expectType<undefined>(ignoreStdoutResult.stdio[1]);
	expectType<string>(ignoreStdoutResult.stderr);
	expectType<string>(ignoreStdoutResult.stdio[2]);
	expectError(ignoreStdoutResult.all.toString());

	const ignoreStderrResult = execaSync('unicorns', {stderr: 'ignore'});
	expectType<string>(ignoreStderrResult.stdout);
	expectType<undefined>(ignoreStderrResult.stderr);
	expectError(ignoreStderrResult.all.toString());

	const inheritStdoutResult = execaSync('unicorns', {stdout: 'inherit'});
	expectType<undefined>(inheritStdoutResult.stdout);
	expectType<string>(inheritStdoutResult.stderr);
	expectError(inheritStdoutResult.all.toString());

	const inheritStderrResult = execaSync('unicorns', {stderr: 'inherit'});
	expectType<string>(inheritStderrResult.stdout);
	expectType<undefined>(inheritStderrResult.stderr);
	expectError(inheritStderrResult.all.toString());

	const ipcStdoutResult = execaSync('unicorns', {stdout: 'ipc'});
	expectType<undefined>(ipcStdoutResult.stdout);
	expectType<string>(ipcStdoutResult.stderr);
	expectError(ipcStdoutResult.all.toString());

	const ipcStderrResult = execaSync('unicorns', {stderr: 'ipc'});
	expectType<string>(ipcStderrResult.stdout);
	expectType<undefined>(ipcStderrResult.stderr);
	expectError(ipcStderrResult.all.toString());

	const numberStdoutResult = execaSync('unicorns', {stdout: 1});
	expectType<undefined>(numberStdoutResult.stdout);
	expectType<string>(numberStdoutResult.stderr);
	expectError(numberStdoutResult.all.toString());

	const numberStderrResult = execaSync('unicorns', {stderr: 1});
	expectType<string>(numberStderrResult.stdout);
	expectType<undefined>(numberStderrResult.stderr);
	expectError(numberStderrResult.all.toString());
} catch (error: unknown) {
	const execaError = error as ExecaSyncError;

	expectType<ExecaSyncError>(execaError);
	expectType<string>(execaError.message);
	expectType<number | undefined>(execaError.exitCode);
	expectType<boolean>(execaError.failed);
	expectType<boolean>(execaError.timedOut);
	expectType<boolean>(execaError.isCanceled);
	expectType<boolean>(execaError.isTerminated);
	expectType<string | undefined>(execaError.signal);
	expectType<string | undefined>(execaError.signalDescription);
	expectType<string>(execaError.cwd);
	expectType<string>(execaError.shortMessage);
	expectType<string | undefined>(execaError.originalMessage);

	expectType<undefined>(execaError.stdio[0]);

	const execaStringError = error as ExecaSyncError<{}>;
	expectType<string>(execaStringError.stdout);
	expectType<string>(execaStringError.stdio[1]);
	expectType<string>(execaStringError.stderr);
	expectType<string>(execaStringError.stdio[2]);
	expectError(execaStringError.all.toString());

	const execaBufferError = error as ExecaSyncError<{encoding: 'buffer'}>;
	expectType<Uint8Array>(execaBufferError.stdout);
	expectType<Uint8Array>(execaBufferError.stdio[1]);
	expectType<Uint8Array>(execaBufferError.stderr);
	expectType<Uint8Array>(execaBufferError.stdio[2]);
	expectError(execaBufferError.all.toString());

	const ignoreStdoutError = error as ExecaSyncError<{stdout: 'ignore'}>;
	expectType<undefined>(ignoreStdoutError.stdout);
	expectType<undefined>(ignoreStdoutError.stdio[1]);
	expectType<string>(ignoreStdoutError.stderr);
	expectType<string>(ignoreStdoutError.stdio[2]);
	expectError(ignoreStdoutError.all.toString());

	const ignoreStderrError = error as ExecaSyncError<{stderr: 'ignore'}>;
	expectType<string>(ignoreStderrError.stdout);
	expectType<undefined>(ignoreStderrError.stderr);
	expectError(ignoreStderrError.all.toString());

	const inheritStdoutError = error as ExecaSyncError<{stdout: 'inherit'}>;
	expectType<undefined>(inheritStdoutError.stdout);
	expectType<string>(inheritStdoutError.stderr);
	expectError(inheritStdoutError.all.toString());

	const inheritStderrError = error as ExecaSyncError<{stderr: 'inherit'}>;
	expectType<string>(inheritStderrError.stdout);
	expectType<undefined>(inheritStderrError.stderr);
	expectError(inheritStderrError.all.toString());

	const ipcStdoutError = error as ExecaSyncError<{stdout: 'ipc'}>;
	expectType<undefined>(ipcStdoutError.stdout);
	expectType<string>(ipcStdoutError.stderr);
	expectError(ipcStdoutError.all.toString());

	const ipcStderrError = error as ExecaSyncError<{stderr: 'ipc'}>;
	expectType<string>(ipcStderrError.stdout);
	expectType<undefined>(ipcStderrError.stderr);
	expectError(ipcStderrError.all.toString());

	const numberStdoutError = error as ExecaSyncError<{stdout: 1}>;
	expectType<undefined>(numberStdoutError.stdout);
	expectType<string>(numberStdoutError.stderr);
	expectError(numberStdoutError.all.toString());

	const numberStderrError = error as ExecaSyncError<{stderr: 1}>;
	expectType<string>(numberStderrError.stdout);
	expectType<undefined>(numberStderrError.stderr);
	expectError(numberStderrError.all.toString());
}

const rejectsSyncResult = execaSync('unicorns');
expectError(rejectsSyncResult.stack);
expectError(rejectsSyncResult.message);
expectError(rejectsSyncResult.shortMessage);
expectError(rejectsSyncResult.originalMessage);

const noRejectsSyncResult = execaSync('unicorns', {reject: false});
expectType<string | undefined>(noRejectsSyncResult.stack);
expectType<string | undefined>(noRejectsSyncResult.message);
expectType<string | undefined>(noRejectsSyncResult.shortMessage);
expectType<string | undefined>(noRejectsSyncResult.originalMessage);

const emptyStringGenerator = function * () {
	yield '';
};

const binaryGenerator = function * () {
	yield new Uint8Array(0);
};

const asyncStringGenerator = async function * () {
	yield '';
};

const fileUrl = new URL('file:///test');

expectAssignable<Options>({cleanup: false});
expectNotAssignable<SyncOptions>({cleanup: false});
expectAssignable<SyncOptions>({preferLocal: false});

/* eslint-disable @typescript-eslint/no-floating-promises */
execa('unicorns', {cleanup: false});
expectError(execaSync('unicorns', {cleanup: false}));
execa('unicorns', {preferLocal: false});
execaSync('unicorns', {preferLocal: false});
execa('unicorns', {localDir: '.'});
execaSync('unicorns', {localDir: '.'});
execa('unicorns', {localDir: fileUrl});
execaSync('unicorns', {localDir: fileUrl});
expectError(execa('unicorns', {encoding: 'unknownEncoding'}));
expectError(execaSync('unicorns', {encoding: 'unknownEncoding'}));
execa('unicorns', {execPath: '/path'});
execaSync('unicorns', {execPath: '/path'});
execa('unicorns', {execPath: fileUrl});
execaSync('unicorns', {execPath: fileUrl});
execa('unicorns', {buffer: false});
expectError(execaSync('unicorns', {buffer: false}));
execa('unicorns', {input: ''});
execaSync('unicorns', {input: ''});
execa('unicorns', {input: new Uint8Array()});
execaSync('unicorns', {input: new Uint8Array()});
execa('unicorns', {input: process.stdin});
execaSync('unicorns', {input: process.stdin});
execa('unicorns', {inputFile: ''});
execaSync('unicorns', {inputFile: ''});
execa('unicorns', {inputFile: fileUrl});
execaSync('unicorns', {inputFile: fileUrl});
execa('unicorns', {stdin: 'pipe'});
execaSync('unicorns', {stdin: 'pipe'});
execa('unicorns', {stdin: ['pipe']});
execaSync('unicorns', {stdin: ['pipe']});
execa('unicorns', {stdin: 'overlapped'});
execaSync('unicorns', {stdin: 'overlapped'});
execa('unicorns', {stdin: ['overlapped']});
execaSync('unicorns', {stdin: ['overlapped']});
execa('unicorns', {stdin: 'ipc'});
execaSync('unicorns', {stdin: 'ipc'});
execa('unicorns', {stdin: ['ipc']});
execaSync('unicorns', {stdin: ['ipc']});
execa('unicorns', {stdin: 'ignore'});
execaSync('unicorns', {stdin: 'ignore'});
execa('unicorns', {stdin: ['ignore']});
execaSync('unicorns', {stdin: ['ignore']});
execa('unicorns', {stdin: 'inherit'});
execaSync('unicorns', {stdin: 'inherit'});
execa('unicorns', {stdin: ['inherit']});
execaSync('unicorns', {stdin: ['inherit']});
execa('unicorns', {stdin: process.stdin});
execaSync('unicorns', {stdin: process.stdin});
execa('unicorns', {stdin: [process.stdin]});
execaSync('unicorns', {stdin: [process.stdin]});
execa('unicorns', {stdin: new Readable()});
execaSync('unicorns', {stdin: new Readable()});
execa('unicorns', {stdin: [new Readable()]});
execaSync('unicorns', {stdin: [new Readable()]});
expectError(execa('unicorns', {stdin: new Writable()}));
expectError(execaSync('unicorns', {stdin: new Writable()}));
expectError(execaSync('unicorns', {stdin: [new Writable()]}));
execa('unicorns', {stdin: new ReadableStream()});
expectError(execaSync('unicorns', {stdin: new ReadableStream()}));
execa('unicorns', {stdin: [new ReadableStream()]});
expectError(execaSync('unicorns', {stdin: [new ReadableStream()]}));
expectError(execa('unicorns', {stdin: new WritableStream()}));
expectError(execaSync('unicorns', {stdin: new WritableStream()}));
expectError(execaSync('unicorns', {stdin: [new WritableStream()]}));
execa('unicorns', {stdin: new Uint8Array()});
execaSync('unicorns', {stdin: new Uint8Array()});
execa('unicorns', {stdin: [['foo', 'bar']]});
expectError(execaSync('unicorns', {stdin: [['foo', 'bar']]}));
execa('unicorns', {stdin: [[new Uint8Array(), new Uint8Array()]]});
expectError(execaSync('unicorns', {stdin: [[new Uint8Array(), new Uint8Array()]]}));
execa('unicorns', {stdin: [[{}, {}]]});
expectError(execaSync('unicorns', {stdin: [[{}, {}]]}));
execa('unicorns', {stdin: emptyStringGenerator()});
expectError(execaSync('unicorns', {stdin: emptyStringGenerator()}));
execa('unicorns', {stdin: [emptyStringGenerator()]});
expectError(execaSync('unicorns', {stdin: [emptyStringGenerator()]}));
execa('unicorns', {stdin: binaryGenerator()});
expectError(execaSync('unicorns', {stdin: binaryGenerator()}));
execa('unicorns', {stdin: [binaryGenerator()]});
expectError(execaSync('unicorns', {stdin: [binaryGenerator()]}));
execa('unicorns', {stdin: asyncStringGenerator()});
expectError(execaSync('unicorns', {stdin: asyncStringGenerator()}));
execa('unicorns', {stdin: [asyncStringGenerator()]});
expectError(execaSync('unicorns', {stdin: [asyncStringGenerator()]}));
execa('unicorns', {stdin: fileUrl});
execaSync('unicorns', {stdin: fileUrl});
execa('unicorns', {stdin: [fileUrl]});
execaSync('unicorns', {stdin: [fileUrl]});
execa('unicorns', {stdin: {file: './test'}});
execaSync('unicorns', {stdin: {file: './test'}});
execa('unicorns', {stdin: [{file: './test'}]});
execaSync('unicorns', {stdin: [{file: './test'}]});
execa('unicorns', {stdin: 1});
execaSync('unicorns', {stdin: 1});
execa('unicorns', {stdin: [1]});
execaSync('unicorns', {stdin: [1]});
execa('unicorns', {stdin: unknownArrayGenerator});
expectError(execaSync('unicorns', {stdin: unknownArrayGenerator}));
execa('unicorns', {stdin: [unknownArrayGenerator]});
expectError(execaSync('unicorns', {stdin: [unknownArrayGenerator]}));
expectError(execa('unicorns', {stdin: booleanGenerator}));
expectError(execa('unicorns', {stdin: arrayGenerator}));
expectError(execa('unicorns', {stdin: invalidReturnGenerator}));
expectError(execa('unicorns', {stdin: syncGenerator}));
execa('unicorns', {stdin: {transform: unknownArrayGenerator}});
expectError(execaSync('unicorns', {stdin: {transform: unknownArrayGenerator}}));
execa('unicorns', {stdin: [{transform: unknownArrayGenerator}]});
expectError(execaSync('unicorns', {stdin: [{transform: unknownArrayGenerator}]}));
expectError(execa('unicorns', {stdin: {transform: booleanGenerator}}));
expectError(execa('unicorns', {stdin: {transform: arrayGenerator}}));
expectError(execa('unicorns', {stdin: {transform: invalidReturnGenerator}}));
expectError(execa('unicorns', {stdin: {transform: syncGenerator}}));
expectError(execa('unicorns', {stdin: {}}));
expectError(execa('unicorns', {stdin: {binary: true}}));
expectError(execa('unicorns', {stdin: {objectMode: true}}));
execa('unicorns', {stdin: {transform: unknownArrayGenerator, binary: true}});
expectError(execa('unicorns', {stdin: {transform: unknownArrayGenerator, binary: 'true'}}));
execa('unicorns', {stdin: {transform: unknownArrayGenerator, objectMode: true}});
expectError(execa('unicorns', {stdin: {transform: unknownArrayGenerator, objectMode: 'true'}}));
execa('unicorns', {stdin: undefined});
execaSync('unicorns', {stdin: undefined});
execa('unicorns', {stdin: [undefined]});
execaSync('unicorns', {stdin: [undefined]});
execa('unicorns', {stdin: ['pipe', 'inherit']});
execaSync('unicorns', {stdin: ['pipe', 'inherit']});
execa('unicorns', {stdout: 'pipe'});
execaSync('unicorns', {stdout: 'pipe'});
execa('unicorns', {stdout: ['pipe']});
execaSync('unicorns', {stdout: ['pipe']});
execa('unicorns', {stdout: 'overlapped'});
execaSync('unicorns', {stdout: 'overlapped'});
execa('unicorns', {stdout: ['overlapped']});
execaSync('unicorns', {stdout: ['overlapped']});
execa('unicorns', {stdout: 'ipc'});
execaSync('unicorns', {stdout: 'ipc'});
execa('unicorns', {stdout: ['ipc']});
execaSync('unicorns', {stdout: ['ipc']});
execa('unicorns', {stdout: 'ignore'});
execaSync('unicorns', {stdout: 'ignore'});
execa('unicorns', {stdout: ['ignore']});
execaSync('unicorns', {stdout: ['ignore']});
execa('unicorns', {stdout: 'inherit'});
execaSync('unicorns', {stdout: 'inherit'});
execa('unicorns', {stdout: ['inherit']});
execaSync('unicorns', {stdout: ['inherit']});
execa('unicorns', {stdout: process.stdout});
execaSync('unicorns', {stdout: process.stdout});
execa('unicorns', {stdout: [process.stdout]});
execaSync('unicorns', {stdout: [process.stdout]});
execa('unicorns', {stdout: new Writable()});
execaSync('unicorns', {stdout: new Writable()});
execa('unicorns', {stdout: [new Writable()]});
execaSync('unicorns', {stdout: [new Writable()]});
expectError(execa('unicorns', {stdout: new Readable()}));
expectError(execaSync('unicorns', {stdout: new Readable()}));
expectError(execa('unicorn', {stdout: [new Readable()]}));
expectError(execaSync('unicorn', {stdout: [new Readable()]}));
execa('unicorns', {stdout: new WritableStream()});
expectError(execaSync('unicorns', {stdout: new WritableStream()}));
execa('unicorns', {stdout: [new WritableStream()]});
expectError(execaSync('unicorns', {stdout: [new WritableStream()]}));
expectError(execa('unicorns', {stdout: new ReadableStream()}));
expectError(execaSync('unicorns', {stdout: new ReadableStream()}));
expectError(execa('unicorn', {stdout: [new ReadableStream()]}));
expectError(execaSync('unicorn', {stdout: [new ReadableStream()]}));
execa('unicorns', {stdout: fileUrl});
execaSync('unicorns', {stdout: fileUrl});
execa('unicorns', {stdout: [fileUrl]});
execaSync('unicorns', {stdout: [fileUrl]});
execa('unicorns', {stdout: {file: './test'}});
execaSync('unicorns', {stdout: {file: './test'}});
execa('unicorns', {stdout: [{file: './test'}]});
execaSync('unicorns', {stdout: [{file: './test'}]});
execa('unicorns', {stdout: 1});
execaSync('unicorns', {stdout: 1});
execa('unicorns', {stdout: [1]});
execaSync('unicorns', {stdout: [1]});
execa('unicorns', {stdout: unknownArrayGenerator});
expectError(execaSync('unicorns', {stdout: unknownArrayGenerator}));
execa('unicorns', {stdout: [unknownArrayGenerator]});
expectError(execaSync('unicorns', {stdout: [unknownArrayGenerator]}));
expectError(execa('unicorns', {stdout: booleanGenerator}));
expectError(execa('unicorns', {stdout: arrayGenerator}));
expectError(execa('unicorns', {stdout: invalidReturnGenerator}));
expectError(execa('unicorns', {stdout: syncGenerator}));
execa('unicorns', {stdout: {transform: unknownArrayGenerator}});
expectError(execaSync('unicorns', {stdout: {transform: unknownArrayGenerator}}));
execa('unicorns', {stdout: [{transform: unknownArrayGenerator}]});
expectError(execaSync('unicorns', {stdout: [{transform: unknownArrayGenerator}]}));
expectError(execa('unicorns', {stdout: {transform: booleanGenerator}}));
expectError(execa('unicorns', {stdout: {transform: arrayGenerator}}));
expectError(execa('unicorns', {stdout: {transform: invalidReturnGenerator}}));
expectError(execa('unicorns', {stdout: {transform: syncGenerator}}));
expectError(execa('unicorns', {stdout: {}}));
expectError(execa('unicorns', {stdout: {binary: true}}));
expectError(execa('unicorns', {stdout: {objectMode: true}}));
execa('unicorns', {stdout: {transform: unknownArrayGenerator, binary: true}});
expectError(execa('unicorns', {stdout: {transform: unknownArrayGenerator, binary: 'true'}}));
execa('unicorns', {stdout: {transform: unknownArrayGenerator, objectMode: true}});
expectError(execa('unicorns', {stdout: {transform: unknownArrayGenerator, objectMode: 'true'}}));
execa('unicorns', {stdout: undefined});
execaSync('unicorns', {stdout: undefined});
execa('unicorns', {stdout: [undefined]});
execaSync('unicorns', {stdout: [undefined]});
execa('unicorns', {stdout: ['pipe', 'inherit']});
execaSync('unicorns', {stdout: ['pipe', 'inherit']});
execa('unicorns', {stderr: 'pipe'});
execaSync('unicorns', {stderr: 'pipe'});
execa('unicorns', {stderr: ['pipe']});
execaSync('unicorns', {stderr: ['pipe']});
execa('unicorns', {stderr: 'overlapped'});
execaSync('unicorns', {stderr: 'overlapped'});
execa('unicorns', {stderr: ['overlapped']});
execaSync('unicorns', {stderr: ['overlapped']});
execa('unicorns', {stderr: 'ipc'});
execaSync('unicorns', {stderr: 'ipc'});
execa('unicorns', {stderr: ['ipc']});
execaSync('unicorns', {stderr: ['ipc']});
execa('unicorns', {stderr: 'ignore'});
execaSync('unicorns', {stderr: 'ignore'});
execa('unicorns', {stderr: ['ignore']});
execaSync('unicorns', {stderr: ['ignore']});
execa('unicorns', {stderr: 'inherit'});
execaSync('unicorns', {stderr: 'inherit'});
execa('unicorns', {stderr: ['inherit']});
execaSync('unicorns', {stderr: ['inherit']});
execa('unicorns', {stderr: process.stderr});
execaSync('unicorns', {stderr: process.stderr});
execa('unicorns', {stderr: [process.stderr]});
execaSync('unicorns', {stderr: [process.stderr]});
execa('unicorns', {stderr: new Writable()});
execaSync('unicorns', {stderr: new Writable()});
execa('unicorns', {stderr: [new Writable()]});
execaSync('unicorns', {stderr: [new Writable()]});
expectError(execa('unicorns', {stderr: new Readable()}));
expectError(execaSync('unicorns', {stderr: new Readable()}));
expectError(execa('unicorns', {stderr: [new Readable()]}));
expectError(execaSync('unicorns', {stderr: [new Readable()]}));
execa('unicorns', {stderr: new WritableStream()});
expectError(execaSync('unicorns', {stderr: new WritableStream()}));
execa('unicorns', {stderr: [new WritableStream()]});
expectError(execaSync('unicorns', {stderr: [new WritableStream()]}));
expectError(execa('unicorns', {stderr: new ReadableStream()}));
expectError(execaSync('unicorns', {stderr: new ReadableStream()}));
expectError(execa('unicorns', {stderr: [new ReadableStream()]}));
expectError(execaSync('unicorns', {stderr: [new ReadableStream()]}));
execa('unicorns', {stderr: fileUrl});
execaSync('unicorns', {stderr: fileUrl});
execa('unicorns', {stderr: [fileUrl]});
execaSync('unicorns', {stderr: [fileUrl]});
execa('unicorns', {stderr: {file: './test'}});
execaSync('unicorns', {stderr: {file: './test'}});
execa('unicorns', {stderr: [{file: './test'}]});
execaSync('unicorns', {stderr: [{file: './test'}]});
execa('unicorns', {stderr: 1});
execaSync('unicorns', {stderr: 1});
execa('unicorns', {stderr: [1]});
execaSync('unicorns', {stderr: [1]});
execa('unicorns', {stderr: unknownArrayGenerator});
expectError(execaSync('unicorns', {stderr: unknownArrayGenerator}));
execa('unicorns', {stderr: [unknownArrayGenerator]});
expectError(execaSync('unicorns', {stderr: [unknownArrayGenerator]}));
expectError(execa('unicorns', {stderr: booleanGenerator}));
expectError(execa('unicorns', {stderr: arrayGenerator}));
expectError(execa('unicorns', {stderr: invalidReturnGenerator}));
expectError(execa('unicorns', {stderr: syncGenerator}));
execa('unicorns', {stderr: {transform: unknownArrayGenerator}});
expectError(execaSync('unicorns', {stderr: {transform: unknownArrayGenerator}}));
execa('unicorns', {stderr: [{transform: unknownArrayGenerator}]});
expectError(execaSync('unicorns', {stderr: [{transform: unknownArrayGenerator}]}));
expectError(execa('unicorns', {stderr: {transform: booleanGenerator}}));
expectError(execa('unicorns', {stderr: {transform: arrayGenerator}}));
expectError(execa('unicorns', {stderr: {transform: invalidReturnGenerator}}));
expectError(execa('unicorns', {stderr: {transform: syncGenerator}}));
expectError(execa('unicorns', {stderr: {}}));
expectError(execa('unicorns', {stderr: {binary: true}}));
expectError(execa('unicorns', {stderr: {objectMode: true}}));
execa('unicorns', {stderr: {transform: unknownArrayGenerator, binary: true}});
expectError(execa('unicorns', {stderr: {transform: unknownArrayGenerator, binary: 'true'}}));
execa('unicorns', {stderr: {transform: unknownArrayGenerator, objectMode: true}});
expectError(execa('unicorns', {stderr: {transform: unknownArrayGenerator, objectMode: 'true'}}));
execa('unicorns', {stderr: undefined});
execaSync('unicorns', {stderr: undefined});
execa('unicorns', {stderr: [undefined]});
execaSync('unicorns', {stderr: [undefined]});
execa('unicorns', {stderr: ['pipe', 'inherit']});
execaSync('unicorns', {stderr: ['pipe', 'inherit']});
execa('unicorns', {all: true});
expectError(execaSync('unicorns', {all: true}));
execa('unicorns', {reject: false});
execaSync('unicorns', {reject: false});
execa('unicorns', {stripFinalNewline: false});
execaSync('unicorns', {stripFinalNewline: false});
execa('unicorns', {extendEnv: false});
execaSync('unicorns', {extendEnv: false});
execa('unicorns', {cwd: '.'});
execaSync('unicorns', {cwd: '.'});
execa('unicorns', {cwd: fileUrl});
execaSync('unicorns', {cwd: fileUrl});
// eslint-disable-next-line @typescript-eslint/naming-convention
execa('unicorns', {env: {PATH: ''}});
// eslint-disable-next-line @typescript-eslint/naming-convention
execaSync('unicorns', {env: {PATH: ''}});
execa('unicorns', {argv0: ''});
execaSync('unicorns', {argv0: ''});
execa('unicorns', {stdio: 'pipe'});
execaSync('unicorns', {stdio: 'pipe'});
execa('unicorns', {stdio: 'overlapped'});
execaSync('unicorns', {stdio: 'overlapped'});
execa('unicorns', {stdio: 'ignore'});
execaSync('unicorns', {stdio: 'ignore'});
execa('unicorns', {stdio: 'inherit'});
execaSync('unicorns', {stdio: 'inherit'});
expectError(execa('unicorns', {stdio: 'ipc'}));
expectError(execaSync('unicorns', {stdio: 'ipc'}));
expectError(execa('unicorns', {stdio: 1}));
expectError(execaSync('unicorns', {stdio: 1}));
expectError(execa('unicorns', {stdio: unknownArrayGenerator}));
expectError(execaSync('unicorns', {stdio: unknownArrayGenerator}));
expectError(execa('unicorns', {stdio: {transform: unknownArrayGenerator}}));
expectError(execaSync('unicorns', {stdio: {transform: unknownArrayGenerator}}));
expectError(execa('unicorns', {stdio: fileUrl}));
expectError(execaSync('unicorns', {stdio: fileUrl}));
expectError(execa('unicorns', {stdio: {file: './test'}}));
expectError(execaSync('unicorns', {stdio: {file: './test'}}));
expectError(execa('unicorns', {stdio: new Writable()}));
expectError(execaSync('unicorns', {stdio: new Writable()}));
expectError(execa('unicorns', {stdio: new Readable()}));
expectError(execaSync('unicorns', {stdio: new Readable()}));
expectError(execa('unicorns', {stdio: new WritableStream()}));
expectError(execaSync('unicorns', {stdio: new WritableStream()}));
expectError(execa('unicorns', {stdio: new ReadableStream()}));
expectError(execaSync('unicorns', {stdio: new ReadableStream()}));
expectError(execa('unicorns', {stdio: emptyStringGenerator()}));
expectError(execaSync('unicorns', {stdio: emptyStringGenerator()}));
expectError(execa('unicorns', {stdio: asyncStringGenerator()}));
expectError(execaSync('unicorns', {stdio: asyncStringGenerator()}));
expectError(execa('unicorns', {stdio: ['pipe', 'pipe']}));
expectError(execaSync('unicorns', {stdio: ['pipe', 'pipe']}));
execa('unicorns', {stdio: [new Readable(), 'pipe', 'pipe']});
execaSync('unicorns', {stdio: [new Readable(), 'pipe', 'pipe']});
execa('unicorns', {stdio: [[new Readable()], ['pipe'], ['pipe']]});
execaSync('unicorns', {stdio: [[new Readable()], ['pipe'], ['pipe']]});
execa('unicorns', {stdio: ['pipe', new Writable(), 'pipe']});
execaSync('unicorns', {stdio: ['pipe', new Writable(), 'pipe']});
execa('unicorns', {stdio: [['pipe'], [new Writable()], ['pipe']]});
execaSync('unicorns', {stdio: [['pipe'], [new Writable()], ['pipe']]});
execa('unicorns', {stdio: ['pipe', 'pipe', new Writable()]});
execaSync('unicorns', {stdio: ['pipe', 'pipe', new Writable()]});
execa('unicorns', {stdio: [['pipe'], ['pipe'], [new Writable()]]});
execaSync('unicorns', {stdio: [['pipe'], ['pipe'], [new Writable()]]});
expectError(execa('unicorns', {stdio: [new Writable(), 'pipe', 'pipe']}));
expectError(execaSync('unicorns', {stdio: [new Writable(), 'pipe', 'pipe']}));
expectError(execaSync('unicorns', {stdio: [[new Writable()], ['pipe'], ['pipe']]}));
expectError(execa('unicorns', {stdio: ['pipe', new Readable(), 'pipe']}));
expectError(execaSync('unicorns', {stdio: ['pipe', new Readable(), 'pipe']}));
expectError(execa('unicorns', {stdio: [['pipe'], [new Readable()], ['pipe']]}));
expectError(execaSync('unicorns', {stdio: [['pipe'], [new Readable()], ['pipe']]}));
expectError(execa('unicorns', {stdio: ['pipe', 'pipe', new Readable()]}));
expectError(execaSync('unicorns', {stdio: ['pipe', 'pipe', new Readable()]}));
expectError(execa('unicorns', {stdio: [['pipe'], ['pipe'], [new Readable()]]}));
expectError(execaSync('unicorns', {stdio: [['pipe'], ['pipe'], [new Readable()]]}));
execa('unicorns', {
	stdio: [
		'pipe',
		'overlapped',
		'ipc',
		'ignore',
		'inherit',
		process.stdin,
		1,
		unknownArrayGenerator,
		{transform: unknownArrayGenerator},
		{transform: unknownArrayGenerator, binary: true},
		{transform: unknownArrayGenerator, objectMode: true},
		undefined,
		fileUrl,
		{file: './test'},
		new Writable(),
		new Readable(),
		new WritableStream(),
		new ReadableStream(),
		new Uint8Array(),
		emptyStringGenerator(),
		asyncStringGenerator(),
	],
});
execaSync('unicorns', {
	stdio: [
		'pipe',
		'overlapped',
		'ipc',
		'ignore',
		'inherit',
		process.stdin,
		1,
		undefined,
		fileUrl,
		{file: './test'},
		new Writable(),
		new Readable(),
		new Uint8Array(),
	],
});
expectError(execaSync('unicorns', {stdio: [unknownArrayGenerator]}));
expectError(execaSync('unicorns', {stdio: [{transform: unknownArrayGenerator}]}));
expectError(execaSync('unicorns', {stdio: [new WritableStream()]}));
expectError(execaSync('unicorns', {stdio: [new ReadableStream()]}));
expectError(execaSync('unicorns', {stdio: [emptyStringGenerator()]}));
expectError(execaSync('unicorns', {stdio: [asyncStringGenerator()]}));
execa('unicorns', {
	stdio: [
		['pipe'],
		['pipe', 'inherit'],
		['overlapped'],
		['ipc'],
		['ignore'],
		['inherit'],
		[process.stdin],
		[1],
		[unknownArrayGenerator],
		[{transform: unknownArrayGenerator}],
		[{transform: unknownArrayGenerator, binary: true}],
		[{transform: unknownArrayGenerator, objectMode: true}],
		[undefined],
		[fileUrl],
		[{file: './test'}],
		[new Writable()],
		[new Readable()],
		[new WritableStream()],
		[new ReadableStream()],
		[new Uint8Array()],
		[['foo', 'bar']],
		[[new Uint8Array(), new Uint8Array()]],
		[[{}, {}]],
		[emptyStringGenerator()],
		[asyncStringGenerator()],
	],
});
execaSync('unicorns', {
	stdio: [
		['pipe'],
		['pipe', 'inherit'],
		['overlapped'],
		['ipc'],
		['ignore'],
		['inherit'],
		[process.stdin],
		[1],
		[undefined],
		[fileUrl],
		[{file: './test'}],
		[new Writable()],
		[new Readable()],
		[new Uint8Array()],
	],
});
expectError(execaSync('unicorns', {stdio: [[unknownArrayGenerator]]}));
expectError(execaSync('unicorns', {stdio: [[{transform: unknownArrayGenerator}]]}));
expectError(execaSync('unicorns', {stdio: [[new WritableStream()]]}));
expectError(execaSync('unicorns', {stdio: [[new ReadableStream()]]}));
expectError(execaSync('unicorns', {stdio: [[['foo', 'bar']]]}));
expectError(execaSync('unicorns', {stdio: [[[new Uint8Array(), new Uint8Array()]]]}));
expectError(execaSync('unicorns', {stdio: [[[{}, {}]]]}));
expectError(execaSync('unicorns', {stdio: [[emptyStringGenerator()]]}));
expectError(execaSync('unicorns', {stdio: [[asyncStringGenerator()]]}));
execa('unicorns', {serialization: 'advanced'});
expectError(execaSync('unicorns', {serialization: 'advanced'}));
execa('unicorns', {detached: true});
expectError(execaSync('unicorns', {detached: true}));
execa('unicorns', {uid: 0});
execaSync('unicorns', {uid: 0});
execa('unicorns', {gid: 0});
execaSync('unicorns', {gid: 0});
execa('unicorns', {shell: true});
execaSync('unicorns', {shell: true});
execa('unicorns', {shell: '/bin/sh'});
execaSync('unicorns', {shell: '/bin/sh'});
execa('unicorns', {shell: fileUrl});
execaSync('unicorns', {shell: fileUrl});
execa('unicorns', {timeout: 1000});
execaSync('unicorns', {timeout: 1000});
execa('unicorns', {maxBuffer: 1000});
execaSync('unicorns', {maxBuffer: 1000});
execa('unicorns', {killSignal: 'SIGTERM'});
execaSync('unicorns', {killSignal: 'SIGTERM'});
execa('unicorns', {killSignal: 9});
execaSync('unicorns', {killSignal: 9});
execa('unicorns', {forceKillAfterDelay: false});
execaSync('unicorns', {forceKillAfterDelay: false});
execa('unicorns', {forceKillAfterDelay: 42});
execaSync('unicorns', {forceKillAfterDelay: 42});
execa('unicorns', {forceKillAfterDelay: undefined});
execaSync('unicorns', {forceKillAfterDelay: undefined});
expectError(execa('unicorns', {forceKillAfterDelay: 'true'}));
expectError(execaSync('unicorns', {forceKillAfterDelay: 'true'}));
execa('unicorns', {signal: new AbortController().signal});
expectError(execaSync('unicorns', {signal: new AbortController().signal}));
execa('unicorns', {windowsVerbatimArguments: true});
execaSync('unicorns', {windowsVerbatimArguments: true});
execa('unicorns', {windowsHide: false});
execaSync('unicorns', {windowsHide: false});
execa('unicorns', {verbose: false});
execaSync('unicorns', {verbose: false});
/* eslint-enable @typescript-eslint/no-floating-promises */
execa('unicorns').kill();
execa('unicorns').kill('SIGKILL');
execa('unicorns').kill(undefined);
expectError(execa('unicorns').kill('SIGKILL', {}));

expectError(execa(['unicorns', 'arg']));
expectType<ExecaChildProcess>(execa('unicorns'));
expectType<ExecaChildProcess>(execa(fileUrl));
expectType<ExecaReturnValue>(await execa('unicorns'));
expectAssignable<{stdout: string}>(await execa('unicorns'));
expectAssignable<{stdout: Uint8Array}>(await execa('unicorns', {encoding: 'buffer'}));
expectAssignable<{stdout: string}>(await execa('unicorns', ['foo']));
expectAssignable<{stdout: Uint8Array}>(await execa('unicorns', ['foo'], {encoding: 'buffer'}));

expectError(execaSync(['unicorns', 'arg']));
expectAssignable<ExecaSyncReturnValue>(execaSync('unicorns'));
expectAssignable<ExecaSyncReturnValue>(execaSync(fileUrl));
expectAssignable<{stdout: string}>(execaSync('unicorns'));
expectAssignable<{stdout: Uint8Array}>(execaSync('unicorns', {encoding: 'buffer'}));
expectAssignable<{stdout: string}>(execaSync('unicorns', ['foo']));
expectAssignable<{stdout: Uint8Array}>(execaSync('unicorns', ['foo'], {encoding: 'buffer'}));

expectType<ExecaChildProcess>(execaCommand('unicorns'));
expectType<ExecaReturnValue>(await execaCommand('unicorns'));
expectAssignable<{stdout: string}>(await execaCommand('unicorns'));
expectAssignable<{stdout: Uint8Array}>(await execaCommand('unicorns', {encoding: 'buffer'}));
expectAssignable<{stdout: string}>(await execaCommand('unicorns foo'));
expectAssignable<{stdout: Uint8Array}>(await execaCommand('unicorns foo', {encoding: 'buffer'}));

expectAssignable<ExecaSyncReturnValue>(execaCommandSync('unicorns'));
expectAssignable<{stdout: string}>(execaCommandSync('unicorns'));
expectAssignable<{stdout: Uint8Array}>(execaCommandSync('unicorns', {encoding: 'buffer'}));
expectAssignable<{stdout: string}>(execaCommandSync('unicorns foo'));
expectAssignable<{stdout: Uint8Array}>(execaCommandSync('unicorns foo', {encoding: 'buffer'}));

expectError(execaNode(['unicorns', 'arg']));
expectType<ExecaChildProcess>(execaNode('unicorns'));
expectType<ExecaReturnValue>(await execaNode('unicorns'));
expectType<ExecaReturnValue>(await execaNode(fileUrl));
expectAssignable<{stdout: string}>(await execaNode('unicorns'));
expectAssignable<{stdout: Uint8Array}>(await execaNode('unicorns', {encoding: 'buffer'}));
expectAssignable<{stdout: string}>(await execaNode('unicorns', ['foo']));
expectAssignable<{stdout: Uint8Array}>(await execaNode('unicorns', ['foo'], {encoding: 'buffer'}));

expectAssignable<ExecaChildProcess>(execaNode('unicorns', {nodePath: './node'}));
expectAssignable<ExecaChildProcess>(execaNode('unicorns', {nodePath: fileUrl}));

expectAssignable<{stdout: string}>(await execaNode('unicorns', {nodeOptions: ['--async-stack-traces']}));
expectAssignable<{stdout: Uint8Array}>(await execaNode('unicorns', {nodeOptions: ['--async-stack-traces'], encoding: 'buffer'}));
expectAssignable<{stdout: string}>(await execaNode('unicorns', ['foo'], {nodeOptions: ['--async-stack-traces']}));
expectAssignable<{stdout: Uint8Array}>(await execaNode('unicorns', ['foo'], {nodeOptions: ['--async-stack-traces'], encoding: 'buffer'}));

expectAssignable<ExecaChildProcess>($`unicorns`);
expectAssignable<ExecaReturnValue>(await $`unicorns`);
expectAssignable<ExecaSyncReturnValue>($.sync`unicorns`);
expectAssignable<ExecaSyncReturnValue>($.s`unicorns`);

expectAssignable<ExecaChildProcess>($({})`unicorns`);
expectAssignable<{stdout: string}>(await $({})`unicorns`);
expectAssignable<{stdout: string}>($({}).sync`unicorns`);

expectAssignable<ExecaChildProcess>($({})`unicorns foo`);
expectAssignable<{stdout: string}>(await $({})`unicorns foo`);
expectAssignable<{stdout: string}>($({}).sync`unicorns foo`);

expectAssignable<ExecaChildProcess>($({encoding: 'buffer'})`unicorns`);
expectAssignable<{stdout: Uint8Array}>(await $({encoding: 'buffer'})`unicorns`);
expectAssignable<{stdout: Uint8Array}>($({encoding: 'buffer'}).sync`unicorns`);

expectAssignable<ExecaChildProcess>($({encoding: 'buffer'})`unicorns foo`);
expectAssignable<{stdout: Uint8Array}>(await $({encoding: 'buffer'})`unicorns foo`);
expectAssignable<{stdout: Uint8Array}>($({encoding: 'buffer'}).sync`unicorns foo`);

expectAssignable<ExecaChildProcess>($({encoding: 'buffer'})({})`unicorns`);
expectAssignable<{stdout: Uint8Array}>(await $({encoding: 'buffer'})({})`unicorns`);
expectAssignable<{stdout: Uint8Array}>($({encoding: 'buffer'})({}).sync`unicorns`);

expectAssignable<ExecaChildProcess>($({encoding: 'buffer'})({})`unicorns foo`);
expectAssignable<{stdout: Uint8Array}>(await $({encoding: 'buffer'})({})`unicorns foo`);
expectAssignable<{stdout: Uint8Array}>($({encoding: 'buffer'})({}).sync`unicorns foo`);

expectAssignable<ExecaChildProcess>($({})({encoding: 'buffer'})`unicorns`);
expectAssignable<{stdout: Uint8Array}>(await $({})({encoding: 'buffer'})`unicorns`);
expectAssignable<{stdout: Uint8Array}>($({})({encoding: 'buffer'}).sync`unicorns`);

expectAssignable<ExecaChildProcess>($({})({encoding: 'buffer'})`unicorns foo`);
expectAssignable<{stdout: Uint8Array}>(await $({})({encoding: 'buffer'})`unicorns foo`);
expectAssignable<{stdout: Uint8Array}>($({})({encoding: 'buffer'}).sync`unicorns foo`);

expectAssignable<ExecaReturnValue>(await $`unicorns ${'foo'}`);
expectAssignable<ExecaSyncReturnValue>($.sync`unicorns ${'foo'}`);
expectAssignable<ExecaReturnValue>(await $`unicorns ${1}`);
expectAssignable<ExecaSyncReturnValue>($.sync`unicorns ${1}`);
expectAssignable<ExecaReturnValue>(await $`unicorns ${['foo', 'bar']}`);
expectAssignable<ExecaSyncReturnValue>($.sync`unicorns ${['foo', 'bar']}`);
expectAssignable<ExecaReturnValue>(await $`unicorns ${[1, 2]}`);
expectAssignable<ExecaSyncReturnValue>($.sync`unicorns ${[1, 2]}`);
expectAssignable<ExecaReturnValue>(await $`unicorns ${await $`echo foo`}`);
expectError<ExecaReturnValue>(await $`unicorns ${$`echo foo`}`);
expectAssignable<ExecaSyncReturnValue>($.sync`unicorns ${$.sync`echo foo`}`);
expectAssignable<ExecaReturnValue>(await $`unicorns ${[await $`echo foo`, 'bar']}`);
expectError<ExecaReturnValue>(await $`unicorns ${[$`echo foo`, 'bar']}`);
expectAssignable<ExecaSyncReturnValue>($.sync`unicorns ${[$.sync`echo foo`, 'bar']}`);
expectAssignable<ExecaReturnValue>(await $`unicorns ${true.toString()}`);
expectAssignable<ExecaSyncReturnValue>($.sync`unicorns ${false.toString()}`);
expectError<ExecaReturnValue>(await $`unicorns ${true}`);
expectError<ExecaSyncReturnValue>($.sync`unicorns ${false}`);
