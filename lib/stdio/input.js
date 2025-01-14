import {isReadableStream} from 'is-stream';
import {isUrl, isFilePathString} from './type.js';
import {isUint8Array} from './utils.js';

// Append the `stdin` option with the `input` and `inputFile` options
export const handleInputOptions = ({input, inputFile}) => [
	handleInputOption(input),
	handleInputFileOption(inputFile),
].filter(Boolean);

const handleInputOption = input => input === undefined ? undefined : {
	type: getInputType(input),
	value: input,
	optionName: 'input',
	index: 0,
};

const getInputType = input => {
	if (isReadableStream(input)) {
		return 'nodeStream';
	}

	if (typeof input === 'string') {
		return 'string';
	}

	if (isUint8Array(input)) {
		return 'uint8Array';
	}

	throw new Error('The `input` option must be a string, a Uint8Array or a Node.js Readable stream.');
};

const handleInputFileOption = inputFile => inputFile === undefined ? undefined : {
	...getInputFileType(inputFile),
	optionName: 'inputFile',
	index: 0,
};

const getInputFileType = inputFile => {
	if (isUrl(inputFile)) {
		return {type: 'fileUrl', value: inputFile};
	}

	if (isFilePathString(inputFile)) {
		return {type: 'filePath', value: {file: inputFile}};
	}

	throw new Error('The `inputFile` option must be a file path string or a file URL.');
};
