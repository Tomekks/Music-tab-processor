import test from "node:test";
import assert from "node:assert/strict";
import { ATTACK_SEC, DECAY_SEC, LEAD_SEC, Player } from "./player.ts";
import { midiToFrequency } from "./playback.ts";
import type { TabStep } from "./tab.ts";

interface GainRecorder {
  calls: string[];
  value: number;
  setValueAtTime(v: number, t: number): void;
  linearRampToValueAtTime(v: number, t: number): void;
  exponentialRampToValueAtTime(v: number, t: number): void;
  setTargetAtTime(v: number, t: number, tc: number): void;
  cancelScheduledValues(t: number): void;
}

interface OscRecorder {
  type: string;
  frequency: { value: number };
  starts: number[];
  stops: number[];
  start(when: number): void;
  stop(when: number): void;
  connect(node: unknown): unknown;
}

interface FakeContext {
  currentTime: number;
  state: string;
  destination: object;
  resumeCalls: number;
  suspendCalls: number;
  closeCalls: number;
  gains: GainRecorder[];
  oscs: OscRecorder[];
  resume(): Promise<void>;
  suspend(): Promise<void>;
  close(): Promise<void>;
  createOscillator(): OscRecorder;
  createGain(): { gain: GainRecorder; connect(node: unknown): unknown };
}

function makeGain(): { gain: GainRecorder; connect(node: unknown): unknown } {
  const calls: string[] = [];
  const gain: GainRecorder = {
    calls,
    value: 1,
    setValueAtTime(v, t) {
      calls.push(`setValueAtTime(${v},${t})`);
    },
    linearRampToValueAtTime(v, t) {
      calls.push(`linearRamp(${v},${t})`);
    },
    exponentialRampToValueAtTime(v, t) {
      calls.push(`exponentialRamp(${v},${t})`);
    },
    setTargetAtTime(v, t, tc) {
      calls.push(`setTargetAtTime(${v},${t},${tc})`);
    },
    cancelScheduledValues(t) {
      calls.push(`cancel(${t})`);
    }
  };
  return {
    gain,
    connect(node: unknown) {
      return node;
    }
  };
}

function makeContext(): FakeContext {
  const ctx: FakeContext = {
    currentTime: 10,
    state: "running",
    destination: {},
    resumeCalls: 0,
    suspendCalls: 0,
    closeCalls: 0,
    gains: [],
    oscs: [],
    resume() {
      this.resumeCalls++;
      return Promise.resolve();
    },
    suspend() {
      this.suspendCalls++;
      return Promise.resolve();
    },
    close() {
      this.closeCalls++;
      return Promise.resolve();
    },
    createOscillator() {
      const osc: OscRecorder = {
        type: "",
        frequency: { value: 0 },
        starts: [],
        stops: [],
        start(when: number) {
          this.starts.push(when);
        },
        stop(when: number) {
          this.stops.push(when);
        },
        connect(node: unknown) {
          return node;
        }
      };
      this.oscs.push(osc);
      return osc;
    },
    createGain() {
      const node = makeGain();
      this.gains.push(node.gain);
      return node;
    }
  };
  return ctx;
}

const tuning = [40, 45];
const steps: TabStep[] = [
  {
    index: 0,
    startTimeSec: 1.0,
    notes: [
      { string: 1, fret: 3 },
      { string: 0, fret: 0 }
    ]
  },
  { index: 1, startTimeSec: 2.0, notes: [{ string: 0, fret: 5 }] }
];

function makePlayer(ctx: FakeContext): { player: Player; contexts: () => number } {
  let created = 0;
  const player = new Player({
    steps,
    tuning,
    createContext: () => {
      created++;
      return ctx as unknown as AudioContext;
    }
  });
  return { player, contexts: () => created };
}

test("play creates the context once and schedules one oscillator per note", () => {
  const ctx = makeContext();
  const { player, contexts } = makePlayer(ctx);
  player.play();
  assert.equal(contexts(), 1);
  assert.equal(ctx.oscs.length, 3);
  // Step 0 sounds immediately: currentTime + LEAD_SEC + relative time.
  assert.deepEqual(
    ctx.oscs.map((o) => o.starts),
    [[10 + LEAD_SEC], [10 + LEAD_SEC], [10 + LEAD_SEC + 1.0]]
  );
  assert.deepEqual(
    ctx.oscs.map((o) => o.frequency.value),
    [midiToFrequency(48), midiToFrequency(40), midiToFrequency(45)]
  );
  assert.ok(ctx.oscs.every((o) => o.type === "triangle"));
  assert.equal(player.playing, true);
  player.dispose();
});

test("pause suspends and a later play resumes without re-scheduling; the step is frozen", () => {
  const ctx = makeContext();
  const { player } = makePlayer(ctx);
  player.play();
  const before = player.currentStep();
  player.pause();
  assert.equal(ctx.suspendCalls, 1);
  assert.equal(player.playing, false);
  assert.equal(player.currentStep(), before);
  ctx.state = "suspended";
  player.play();
  assert.equal(ctx.resumeCalls, 1);
  assert.equal(ctx.oscs.length, 3);
  assert.equal(player.playing, true);
  player.dispose();
});

test("reset returns to step 0 and silences the session gain; next play schedules again", () => {
  const ctx = makeContext();
  const { player } = makePlayer(ctx);
  player.play();
  player.reset();
  // gains[0] is master, gains[1] is the session gain.
  assert.deepEqual(ctx.gains[1].calls, [
    `cancel(10)`,
    `setValueAtTime(1,10)`,
    `linearRamp(0,${10 + 0.015})`
  ]);
  assert.equal(player.currentStep(), 0);
  assert.equal(player.playing, false);
  player.play();
  assert.equal(ctx.oscs.length, 6);

  const ctx2 = makeContext();
  ctx2.state = "suspended";
  const { player: player2 } = makePlayer(ctx2);
  player2.play();
  player2.reset();
  assert.deepEqual(ctx2.gains[1].calls, [`cancel(10)`, `setValueAtTime(0,10)`]);
  player2.dispose();
  player.dispose();
});

test("finished is false before and true after the last note plus attack and decay", () => {
  const ctx = makeContext();
  const { player } = makePlayer(ctx);
  player.play();
  assert.equal(player.finished(), false);
  ctx.currentTime = 10 + LEAD_SEC + 1.0 + ATTACK_SEC + DECAY_SEC + 0.01;
  assert.equal(player.finished(), true);
  player.dispose();
});

test("setMuted targets the master gain, also before the first play; dispose closes once", () => {
  const ctx = makeContext();
  const { player } = makePlayer(ctx);
  player.setMuted(true);
  player.play();
  assert.ok(ctx.gains[0].calls.some((c) => c.startsWith("setTargetAtTime(0,")));
  player.setMuted(false);
  assert.ok(ctx.gains[0].calls.some((c) => c.startsWith("setTargetAtTime(1,")));
  player.dispose();
  assert.equal(ctx.closeCalls, 1);
  player.dispose();
  assert.equal(ctx.closeCalls, 1);
});
