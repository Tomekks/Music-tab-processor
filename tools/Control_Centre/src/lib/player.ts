import type { TabStep } from "./tab.ts";
import { fretToMidi, midiToFrequency, relativeTimes, stepAt } from "./playback.ts";

export const LEAD_SEC = 0.05,
  ATTACK_SEC = 0.005,
  DECAY_SEC = 0.35,
  PEAK_GAIN = 0.2,
  FADE_SEC = 0.015;

export class Player {
  playing = false;
  muted = false;

  private steps: TabStep[];
  private tuning: number[];
  private createContext?: () => AudioContext;
  private rel: number[];
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sessionGain: GainNode | null = null;
  private anchorCtx = 0;
  private scheduled = false;

  constructor(opts: { steps: TabStep[]; tuning: number[]; createContext?: () => AudioContext }) {
    this.steps = opts.steps;
    this.tuning = opts.tuning;
    this.createContext = opts.createContext;
    this.rel = relativeTimes(opts.steps);
  }

  play(): void {
    if (!this.ctx) {
      const ctx = this.createContext ? this.createContext() : new AudioContext();
      this.ctx = ctx;
      const master = ctx.createGain();
      master.connect(ctx.destination);
      this.masterGain = master;
      master.gain.setTargetAtTime(this.muted ? 0 : 1, ctx.currentTime, 0.01);
    }
    const ctx = this.ctx as AudioContext;
    if (ctx.state === "suspended") ctx.resume().catch(console.error);
    if (!this.scheduled) {
      this.anchorCtx = ctx.currentTime + LEAD_SEC;
      const session = ctx.createGain();
      session.connect(this.masterGain as GainNode);
      this.sessionGain = session;
      for (let i = 0; i < this.steps.length; i++) {
        const at = this.anchorCtx + this.rel[i];
        for (const n of this.steps[i].notes) {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.value = midiToFrequency(fretToMidi(this.tuning, n.string, n.fret));
          noteGain.gain.setValueAtTime(0, at);
          noteGain.gain.linearRampToValueAtTime(PEAK_GAIN, at + ATTACK_SEC);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, at + ATTACK_SEC + DECAY_SEC);
          osc.connect(noteGain);
          noteGain.connect(session);
          osc.start(at);
          osc.stop(at + ATTACK_SEC + DECAY_SEC + 0.05);
        }
      }
      this.scheduled = true;
    }
    this.playing = true;
  }

  pause(): void {
    if (this.ctx) this.ctx.suspend().catch(console.error);
    this.playing = false;
  }

  reset(): void {
    const ctx = this.ctx;
    const session = this.sessionGain;
    if (ctx && session) {
      const now = ctx.currentTime;
      if (ctx.state === "running") {
        session.gain.cancelScheduledValues(now);
        session.gain.setValueAtTime(1, now);
        session.gain.linearRampToValueAtTime(0, now + FADE_SEC);
      } else {
        session.gain.cancelScheduledValues(now);
        session.gain.setValueAtTime(0, now);
      }
    }
    this.sessionGain = null;
    this.scheduled = false;
    this.playing = false;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.01);
    }
  }

  currentStep(): number {
    if (!this.ctx || !this.scheduled) return 0;
    const latency = this.ctx.outputLatency ?? this.ctx.baseLatency ?? 0;
    return stepAt(this.rel, Math.max(0, this.ctx.currentTime - latency - this.anchorCtx));
  }

  finished(): boolean {
    if (!this.ctx || !this.scheduled) return false;
    const latency = this.ctx.outputLatency ?? this.ctx.baseLatency ?? 0;
    const songTime = Math.max(0, this.ctx.currentTime - latency - this.anchorCtx);
    return songTime >= this.rel[this.rel.length - 1] + ATTACK_SEC + DECAY_SEC;
  }

  dispose(): void {
    this.reset();
    if (this.ctx) {
      const ctx = this.ctx;
      this.ctx = null;
      this.masterGain = null;
      ctx.close().catch(console.error);
    }
  }
}
