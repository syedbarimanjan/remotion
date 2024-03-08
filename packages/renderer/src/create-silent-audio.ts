import {callFf} from './call-ffmpeg';
import type {LogLevel} from './log-level';
import type {CancelSignal} from './make-cancel-signal';
import {DEFAULT_SAMPLE_RATE} from './sample-rate';

export const createSilentAudio = async ({
	numberOfSeconds,
	outName,
	indent,
	logLevel,
	binariesDirectory,
	cancelSignal,
}: {
	numberOfSeconds: number;
	outName: string;
	indent: boolean;
	logLevel: LogLevel;
	binariesDirectory: string | null;
	cancelSignal: CancelSignal | undefined;
}) => {
	await callFf({
		bin: 'ffmpeg',
		args: [
			'-f',
			'lavfi',
			'-i',
			`anullsrc=r=${DEFAULT_SAMPLE_RATE}`,
			'-c:a',
			'pcm_s16le',
			'-t',
			String(numberOfSeconds),
			'-ar',
			String(DEFAULT_SAMPLE_RATE),
			outName,
		],
		indent,
		logLevel,
		binariesDirectory,
		cancelSignal,
	});
};
