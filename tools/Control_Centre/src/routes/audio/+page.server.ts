import { fail } from '@sveltejs/kit';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Actions, PageServerLoad } from './$types';
import { DATA_DIR, MANIFEST_PATH, PYTHON, RUNS_DIR } from '$lib/server/config';
import { loadManifest } from '$lib/server/manifest';
import { browseForAudio, readPickedForClient, readPicked, savePicked } from '$lib/server/pick';
import { anyStageLive, logPath, reconcile, stageStatus, startStage } from '$lib/server/runner';
import { findRunDir } from '$lib/server/runs';

const STAGE_ID = 's01_ingest';

function readLogTail(dataDir: string, lines = 200): string {
	const path = logPath(dataDir, STAGE_ID);
	if (!existsSync(path)) return '';
	return readFileSync(path, 'utf8').split('\n').slice(-lines).join('\n');
}

interface RunSummary {
	title: string;
	artist: string | null;
	durationSec: number;
	sampleRate: number;
	channels: number;
}

function readRun(runsDir: string, startedAt: string | null): RunSummary | null {
	if (!startedAt) return null;
	const runId = findRunDir(runsDir, startedAt);
	if (!runId) return null;
	let metadata: Record<string, unknown>;
	try {
		metadata = JSON.parse(readFileSync(join(runsDir, runId, 'metadata.json'), 'utf8'));
	} catch {
		return null;
	}
	if (
		typeof metadata.title !== 'string' ||
		typeof metadata.durationSec !== 'number' ||
		typeof metadata.sampleRate !== 'number' ||
		typeof metadata.channels !== 'number' ||
		(metadata.artist !== null && typeof metadata.artist !== 'string')
	) {
		return null;
	}
	return {
		title: metadata.title,
		artist: metadata.artist,
		durationSec: metadata.durationSec,
		sampleRate: metadata.sampleRate,
		channels: metadata.channels
	};
}

export const load: PageServerLoad = async ({ depends }) => {
	depends('app:run');
	const manifest = loadManifest(MANIFEST_PATH, { python: PYTHON });
	const dirs = { dataDir: DATA_DIR, runsDir: RUNS_DIR };
	reconcile(manifest, dirs);
	const step = stageStatus(manifest, STAGE_ID, dirs);
	return {
		picked: readPickedForClient(DATA_DIR),
		step,
		run: readRun(RUNS_DIR, step.startedAt),
		logTail: readLogTail(DATA_DIR)
	};
};

export const actions: Actions = {
	browse: async () => {
		const result = await browseForAudio();
		if (result.cancelled) return { cancelled: true };
		if (result.failed) return fail(500, { browseFailed: result.message });
		try {
			const picked = savePicked(DATA_DIR, result.path);
			return { picked };
		} catch (err) {
			return fail(400, { invalid: (err as Error).message });
		}
	},
	start: async () => {
		// The form sends nothing; the pick lives server-side in data/picked.json.
		const picked = readPicked(DATA_DIR);
		if (!picked) return fail(400, { noPick: true });
		const manifest = loadManifest(MANIFEST_PATH, { python: PYTHON });
		const dirs = { dataDir: DATA_DIR, runsDir: RUNS_DIR };
		if (anyStageLive(manifest, dirs)) return fail(409, { busy: true });
		const started = startStage(manifest, STAGE_ID, picked.path, dirs);
		if (started.busy) return fail(409, { busy: true });
		return { started: true, execId: started.execId };
	}
};
