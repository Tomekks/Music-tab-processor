import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Manifest } from "./manifest.ts";
import { readRecords } from "./records.ts";
import { canStart, reconcile, startAudioStage, startRunStage, type Dirs } from "./runner.ts";
import { resolveRunDir } from "./runs.ts";

export interface ChainState {
  currentStage: string;
  execId: string;
  runId: string | null;
}

export function chainPath(dataDir: string): string {
  return join(dataDir, "chain.json");
}

export function readChain(dataDir: string): ChainState | null {
  const path = chainPath(dataDir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ChainState;
  } catch {
    return null;
  }
}

export function clearChain(dataDir: string): void {
  rmSync(chainPath(dataDir), { force: true });
}

function writeChain(dataDir: string, state: ChainState): void {
  writeFileSync(chainPath(dataDir), JSON.stringify(state), "utf8");
}

export function startChain(
  manifest: Manifest,
  audioPath: string,
  dirs: Dirs
): { busy: true } | { busy: false; execId: string } {
  const started = startAudioStage(manifest, manifest.stages[0].id, audioPath, dirs);
  if (started.busy) return started;
  writeChain(dirs.dataDir, { currentStage: manifest.stages[0].id, execId: started.execId, runId: null });
  return { busy: false, execId: started.execId };
}

export function advanceChain(manifest: Manifest, dirs: Dirs): void {
  const chain = readChain(dirs.dataDir);
  if (chain === null) return;
  const finished = readRecords(dirs.dataDir).find((r) => r.type === "finished" && r.execId === chain.execId);
  if (finished === undefined) return;
  if (finished.outcome !== "done") {
    clearChain(dirs.dataDir);
    return;
  }
  const runId = chain.runId ?? finished.runId ?? null;
  if (runId === null) {
    clearChain(dirs.dataDir);
    return;
  }
  const index = manifest.stages.findIndex((s) => s.id === chain.currentStage);
  if (index === -1 || index === manifest.stages.length - 1) {
    clearChain(dirs.dataDir);
    return;
  }
  const next = manifest.stages[index + 1];
  if (resolveRunDir(dirs.runsDir, runId) === null) {
    clearChain(dirs.dataDir);
    return;
  }
  // The previous step is done by construction here, so a closed gate means
  // something else is live: someone started a step by hand in the gap. The
  // chain yields to manual control and ends; retrying would run that same
  // step a second time once the hand-started one finishes.
  if (!canStart(manifest, next.id, runId, dirs, readRecords(dirs.dataDir)).ok) {
    clearChain(dirs.dataDir);
    return;
  }
  const started = startRunStage(manifest, next.id, runId, dirs);
  if (started.busy) return;
  writeChain(dirs.dataDir, { currentStage: next.id, execId: started.execId, runId });
}

let chainTimer: NodeJS.Timeout | null = null;

export function ensureChainTicker(manifest: Manifest, dirs: Dirs): { stop: () => void } {
  if (chainTimer === null) {
    chainTimer = setInterval(() => {
      reconcile(manifest, dirs);
      advanceChain(manifest, dirs);
      if (readChain(dirs.dataDir) === null) {
        const t = chainTimer;
        chainTimer = null;
        if (t !== null) clearInterval(t);
      }
    }, 1000);
    chainTimer.unref();
  }
  const timer = chainTimer;
  return {
    stop: () => {
      if (timer !== null) {
        clearInterval(timer);
        if (chainTimer === timer) chainTimer = null;
      }
    }
  };
}
