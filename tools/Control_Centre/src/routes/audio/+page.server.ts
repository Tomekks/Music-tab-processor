import { fail } from '@sveltejs/kit';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Actions, PageServerLoad } from './$types';
import { DATA_DIR, MANIFEST_PATH, PIPELINE_ROOT, PYTHON, RUNS_DIR } from '$lib/server/config';
import { loadManifest } from '$lib/server/manifest';
import { browseForAudio, readPickedForClient, readPicked, savePicked } from '$lib/server/pick';
import { readRecords } from '$lib/server/records';
import {
	anyStageLive,
	canStart,
	logPath,
	reconcile,
	runStepStatus,
	slotRunId,
	stageStatus,
	startAudioStage,
	startRunStage,
	stopStage as stopStageRun
} from '$lib/server/runner';
import { deleteStageOutputs } from '$lib/server/stop';
import { openInFinder, resolveRevealDir } from '$lib/server/reveal';
import { listRuns, resolveRunDir } from '$lib/server/runs';

const STAGE_ID = 's01_ingest';

function readLogTail(dataDir: string, stageId: string, lines = 200): string {
	const path = logPath(dataDir, stageId);
	if (!existsSync(path)) return '';
	return readFileSync(path, 'utf8').split('\n').slice(-lines).join('\n');
}

interface RunSummary {
	id: string;
	title: string;
	artist: string | null;
	durationSec: number;
	sampleRate: number;
	channels: number;
}

function readNewestRun(runsDir: string): RunSummary | null {
	const newest = listRuns(runsDir)[0];
	if (!newest) return null;
	let metadata: Record<string, unknown>;
	try {
		metadata = JSON.parse(readFileSync(join(runsDir, newest.id, 'metadata.json'), 'utf8'));
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
		id: newest.id,
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
	const dirs = { dataDir: DATA_DIR, runsDir: RUNS_DIR, pipelineRoot: PIPELINE_ROOT };
	reconcile(manifest, dirs);
	const records = readRecords(DATA_DIR);
	const run = readNewestRun(RUNS_DIR);
	const step1 = stageStatus(manifest, STAGE_ID, dirs);
	// While any stage is live the "waiting" reason is suppressed: the
	// disabled Start button already says why.
	const live = anyStageLive(manifest, dirs);
	const steps = manifest.stages.map((stage) => {
		if (!run) {
			return {
				id: stage.id,
				label: stage.label,
				status: 'notStarted' as const,
				outcome: null,
				startedAt: null as string | null,
				canStart: false,
				reason: 'No runs yet',
				canStop: false,
				stopPreview: [] as string[],
				canReveal: false,
				log: ''
			};
		}
		const canReveal = resolveRevealDir(manifest, stage.id, run.id, RUNS_DIR) !== null;
		if (stage.id === STAGE_ID) {
			return {
				id: stage.id,
				label: stage.label,
				status: step1.status,
				outcome: step1.outcome,
				startedAt: step1.startedAt,
				canStart: step1.status !== 'running',
				reason: '',
				canStop: false,
				stopPreview: [] as string[],
				canReveal,
				log: readLogTail(DATA_DIR, stage.id)
			};
		}
		const perRun = runStepStatus(manifest, stage.id, run.id, dirs, records);
		const gate = canStart(manifest, stage.id, run.id, dirs, records);
		const canStop = perRun.status === 'running';
		const stopPreview =
			canStop && perRun.startedAt !== null
				? deleteStageOutputs(stage, join(RUNS_DIR, run.id), Date.parse(perRun.startedAt)).deleted
				: [];
		return {
			id: stage.id,
			label: stage.label,
			status: perRun.status,
			outcome: perRun.outcome,
			startedAt: perRun.startedAt,
			canStart: gate.ok,
			reason: gate.ok || live ? '' : gate.reason,
			canStop,
			stopPreview,
			canReveal,
			log: slotRunId(dirs, stage.id, records) === run.id ? readLogTail(DATA_DIR, stage.id) : ''
		};
	});
	return {
		picked: readPickedForClient(DATA_DIR),
		run,
		steps
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
		const dirs = { dataDir: DATA_DIR, runsDir: RUNS_DIR, pipelineRoot: PIPELINE_ROOT };
		if (anyStageLive(manifest, dirs)) return fail(409, { busy: true });
		const started = startAudioStage(manifest, STAGE_ID, picked.path, dirs);
		if (started.busy) return fail(409, { busy: true });
		return { started: true, execId: started.execId };
	},
	startStage: async ({ request }) => {
		// The client sends stage + run IDs only; the server builds every path.
		const form = await request.formData();
		const stageId = form.get('stage');
		const runId = form.get('runId');
		const manifest = loadManifest(MANIFEST_PATH, { python: PYTHON });
		const dirs = { dataDir: DATA_DIR, runsDir: RUNS_DIR, pipelineRoot: PIPELINE_ROOT };
		const stage = manifest.stages.find((s) => s.id === stageId);
		if (typeof stageId !== 'string' || !stage || stage.argsFrom !== 'runDir') {
			return fail(400, { error: 'badStage' });
		}
		if (typeof runId !== 'string' || resolveRunDir(RUNS_DIR, runId) === null) {
			return fail(400, { error: 'badRun' });
		}
		const gate = canStart(manifest, stage.id, runId, dirs, readRecords(DATA_DIR));
		if (!gate.ok) return fail(409, { error: 'notAllowed', reason: gate.reason });
		const started = startRunStage(manifest, stage.id, runId, dirs);
		if (started.busy) return fail(409, { error: 'notAllowed', reason: 'Another stage is running' });
		return { started: true, execId: started.execId };
	},
	stopStage: async ({ request }) => {
		// The client sends stage + run IDs only; the server builds every path.
		const form = await request.formData();
		const stageId = form.get('stage');
		const runId = form.get('runId');
		const manifest = loadManifest(MANIFEST_PATH, { python: PYTHON });
		const dirs = { dataDir: DATA_DIR, runsDir: RUNS_DIR, pipelineRoot: PIPELINE_ROOT };
		const stage = manifest.stages.find((s) => s.id === stageId);
		if (typeof stageId !== 'string' || !stage || stage.argsFrom !== 'runDir') {
			return fail(400, { error: 'badStage' });
		}
		if (typeof runId !== 'string' || resolveRunDir(RUNS_DIR, runId) === null) {
			return fail(400, { error: 'badRun' });
		}
		const result = await stopStageRun(manifest, stage.id, runId, dirs);
		if (!result.ok) {
			if (result.reason === 'nothingToStop') return fail(409, { error: 'nothingToStop' });
			return fail(500, { error: 'stopFailed', reason: 'process did not exit' });
		}
		return { stopped: true, deleted: result.deleted };
	},
	reveal: async ({ request }) => {
		// The client sends stage + run IDs only; the server builds the path.
		const form = await request.formData();
		const stageId = form.get('stage');
		const runId = form.get('runId');
		const manifest = loadManifest(MANIFEST_PATH, { python: PYTHON });
		const stage = manifest.stages.find((s) => s.id === stageId);
		if (typeof stageId !== 'string' || !stage) return fail(400, { error: 'badStage' });
		if (typeof runId !== 'string' || resolveRunDir(RUNS_DIR, runId) === null) {
			return fail(400, { error: 'badRun' });
		}
		const dir = resolveRevealDir(manifest, stage.id, runId, RUNS_DIR);
		if (dir === null) return fail(400, { error: 'nothingToShow' });
		try {
			await openInFinder(dir);
			return { revealed: true };
		} catch (err) {
			return fail(500, { error: 'revealFailed', reason: (err as Error).message });
		}
	}
};
