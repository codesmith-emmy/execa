import {foobarObject} from './input.js';

export const noopGenerator = objectMode => ({
	async * transform(lines) {
		yield * lines;
	},
	objectMode,
});

export const serializeGenerator = {
	async * transform(objects) {
		for await (const object of objects) {
			yield JSON.stringify(object);
		}
	},
	objectMode: true,
};

export const getOutputsGenerator = (inputs, objectMode) => ({
	async * transform(lines) {
	// eslint-disable-next-line no-unused-vars
		for await (const line of lines) {
			yield * inputs;
		}
	},
	objectMode,
});

export const getOutputGenerator = (input, objectMode) => ({
	async * transform(lines) {
	// eslint-disable-next-line no-unused-vars
		for await (const line of lines) {
			yield input;
		}
	},
	objectMode,
});

export const outputObjectGenerator = getOutputGenerator(foobarObject, true);
