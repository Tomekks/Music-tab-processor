import { fail } from '@sveltejs/kit';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Actions, PageServerLoad } from './$types';
import { DATA_DIR, MANIFEST_PATH, PIPELINE_ROOT, PYTHON, RUNS_DIR } from '$lib/server/config';
import { loadManifest } from '$lib/server/manifest';
import { browseForAudio, clearPicked, readPickedForClient, readPicked, savePicked } from '$lib/server/pick';
import { readRecords } from '$lib/server/records';
import {
	anyStageLive,
	canStart,
	ingestStatusForRun,
	logPath,
	overwriteGate,
	reconcile,
	runStepStatus,
	slotRunId,
	startAudioStage,
	startRunStage,
	stopStage as stopStageRun
} from '$lib/server/runner';
import { previewStageOutputs } from '$lib/server/stop';
import { openInFinder, resolveRevealDir } from '$lib/server/reveal';
import { listRuns, pickRun, readRunSummary, resolveRunDir, type RunSummary } from '$lib/server/runs';
import { trashRun, trashWithFinder } from '$lib/server/trash';
import { buildTabPreview, type TabPreviewData } from '$lib/tab';

const STAGE_ID = 's01_ingest';
const TAB_STAGE_ID = 's04_tab';

function readLogTail(dataDir: string, stageId: string, lines = 200): string {
	const path = logPath(dataDir, stageId);
	if (!existsSync(path)) return '';
	return readFileSync(path, 'utf8').split('\n').slice(-lines).join('\n');
}

export const load: PageServerLoad = async ({ depends, url }) => {
	depends('app:run');
	const manifest = loadManifest(MANIFEST_PATH, { python: PYTHON });
	const dirs = { dataDir: DATA_DIR, runsDir: RUNS_DIR, pipelineRoot: PIPELINE_ROOT };
	reconcile(manifest, dirs);
	const records = readRecords(DATA_DIR);
	const picked = pickRun(RUNS_DIR, url.searchParams.get('run'));
	const run: RunSummary | null =
		picked.id === null
			? null
			: (readRunSummary(RUNS_DIR, picked.id) ?? {
					id: picked.id,
					title: picked.id,
					artist: null,
					durationSec: 0,
					sampleRate: 0,
					channels: 0
				});
	const runNotFound = picked.notFound;
	const runs = listRuns(RUNS_DIR).map((entry) => {
		const summary = readRunSummary(RUNS_DIR, entry.id);
		return {
			id: entry.id,
			label:
				summary === null
					? entry.id
					: `${summary.title}${summary.artist ? ` — ${summary.artist}` : ''} · ${entry.ingestedAt.slice(0, 16).replace('T', ' ')}`
		};
	});
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
				noRecord: false,
				outOfDate: false,
				overwritePreview: [] as string[],
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
			const step1 = ingestStatusForRun(manifest, dirs, run.id, records);
			return {
				id: stage.id,
				label: stage.label,
				status: step1.status,
				outcome: step1.outcome,
				startedAt: step1.startedAt,
				noRecord: false,
				outOfDate: false,
				overwritePreview: [] as string[],
				canStart: step1.status !== 'running',
				reason: '',
				canStop: false,
				stopPreview: [] as string[],
				canReveal,
				log: step1.status === 'running' || step1.status === 'failed' ? readLogTail(DATA_DIR, stage.id) : ''
			};
		}
		const perRun = runStepStatus(manifest, stage.id, run.id, dirs, records);
		const gate = canStart(manifest, stage.id, run.id, dirs, records);
		const canStop = perRun.status === 'running';
		const stopPreview =
			canStop && perRun.startedAt !== null
				? previewStageOutputs(stage, join(RUNS_DIR, run.id), Date.parse(perRun.startedAt)).deleted
				: [];
		const runDir = join(RUNS_DIR, run.id);
		const overwritePreview = perRun.noRecord
			? stage.produces.filter((f) => existsSync(join(runDir, f)))
			: [];
		return {
			id: stage.id,
			label: stage.label,
			status: perRun.status,
			outcome: perRun.outcome,
			startedAt: perRun.startedAt,
			noRecord: perRun.noRecord,
			outOfDate: perRun.outOfDate,
			overwritePreview,
			canStart: gate.ok,
			reason: gate.ok || live ? '' : gate.reason,
			canStop,
			stopPreview,
			canReveal,
			log: slotRunId(dirs, stage.id, records) === run.id ? readLogTail(DATA_DIR, stage.id) : ''
		};
	});
	const tabStep = steps.find((s) => s.id === TAB_STAGE_ID);
	let tabPreview: TabPreviewData | null = null;
	if (run && tabStep && tabStep.status === 'done' && !tabStep.outOfDate) {
		try {
			const raw = JSON.parse(readFileSync(join(RUNS_DIR, run.id, 'tab.json'), 'utf8'));
			tabPreview = buildTabPreview(raw);
		} catch (err) {
			console.error('tab preview read failed', err);
			tabPreview = null;
		}
	}
	const lastFinished = records
		.filter((r) => r.type === 'finished' && r.stage === STAGE_ID)
		.at(-1);
	return {
		picked: readPickedForClient(DATA_DIR),
		run,
		runNotFound,
		runs,
		steps,
		tabPreview,
		busy: live,
		lastIngest: lastFinished
			? {
					execId: lastFinished.execId,
					outcome: lastFinished.outcome,
					runId: lastFinished.runId ?? null
				}
			: null
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
	clear: async () => {
		clearPicked(DATA_DIR);
		return { cleared: true };
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
		const confirmed = form.get('confirmed') === '1';
		const overwrite = overwriteGate(manifest, stage.id, runId, dirs, readRecords(DATA_DIR), confirmed);
		if (!overwrite.ok) return fail(409, { error: 'needsConfirmation', reason: overwrite.reason });
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
	},
	deleteRun: async ({ request }) => {
		// The client sends a run ID only; trashRun resolves and validates it.
		const form = await request.formData();
		const runId = form.get('runId');
		if (typeof runId !== 'string') return fail(400, { error: 'badRun' });
		const manifest = loadManifest(MANIFEST_PATH, { python: PYTHON });
		const dirs = { dataDir: DATA_DIR, runsDir: RUNS_DIR, pipelineRoot: PIPELINE_ROOT };
		const result = await trashRun(RUNS_DIR, runId, () => anyStageLive(manifest, dirs), trashWithFinder);
		if (!result.ok) {
			if (result.reason === 'busy')
				return fail(409, { error: 'notAllowed', reason: 'Wait for the running step to finish, then delete.' });
			if (result.reason === 'trashFailed') return fail(500, { error: 'trashFailed', reason: result.message });
			return fail(400, { error: 'badRun' });
		}
		return { deleted: true };
	}
};
