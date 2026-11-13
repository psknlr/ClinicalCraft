/**
 * One operative playback for every view of the laparoscope (the engineering recommendations, P0-4): the scope dock and
 * the full surgery window render the same frame from this controller and never work out "the latest state" on their
 * own. It owns the queue of what happened in the operation — each accepted step (replayed from its recorded detail
 * through the pure engine, so a fast demonstration's clips are shown one by one) and each refused step (a frame of its
 * own, with its reason and the field unchanged: never dropped because the next step arrived) — in the record's order,
 * the frame on screen and how long it stays. Switching views keeps the frame: the surgery window opened on step 38
 * goes on from step 38. A first look (a reload) shows the field as it is without replaying the operation.
 * The equipment is not a frame: what the tower supplies now (`ProcedureState.supply`) applies to whatever frame is on
 * screen — a camera, light source or insufflator that fails darkens (or deflates) the picture at the next render,
 * also while an older step is still playing or when nothing is queued, and a working backup brings it back the same
 * way. An abdomen the equipment let down stays down on every frame shown afterwards — the older steps still waiting
 * play in order with their own captions, deflated — until the record holds a new accepted insufflation: a tower
 * restored with steps still queued never shows a pneumoperitoneum the session does not have.
 * No DOM, no three.js: timers are injected.
 */
import { operate, type DomainEvent, type ProcedureDefinition, type ProcedureSignal, type ProcedureState, type ProcedureSupply } from "@clinicalcraft/core";

export type StepEvent = Extract<DomainEvent, { type: "procedure.step" }>;
export type RejectedEvent = Extract<DomainEvent, { type: "action.rejected" }>;
/** The operative events of the record, in the order the session emitted them. */
export type OperativeEvent = StepEvent | RejectedEvent;

/** One frame of the operation: an accepted step or a refused one, with the field before and after it. */
export interface PlaybackItem {
  kind: "step" | "rejected";
  /** Stable: the step's `op-<n>`, or `rejected-<n>` (the n-th refusal of the record). */
  id: string;
  /** Its place in the record's operative events (1-based). */
  sequence: number;
  /** A colleague who did it (staff id); null: the operator. */
  actor: string | null;
  operation: string;
  /** What it acted on: a structure, a region, a handle, a port. */
  target: string | null;
  accepted: boolean;
  rejectionReason?: string;
  /** Simulated minute. */
  at: number;
  /** The field's step count after it (a refusal leaves it as it was). */
  revision: number;
  signals: ProcedureSignal[];
  before: ProcedureState;
  after: ProcedureState;
}

/** How long a frame stays on screen (ms); a step with a signal, or a refusal, stays longer. */
export const STEP_MS = 650;
export const SIGNAL_MS = 1800;

export interface PlaybackTimers {
  now(): number;
  schedule(fn: () => void, ms: number): unknown;
  cancel(handle: unknown): void;
}

const browserTimers: PlaybackTimers = {
  now: () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
  schedule: (fn, ms) => setTimeout(fn, ms),
  cancel: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

/** Whether two supplies give the same picture and gas (absent: supplied). */
function sameSupply(a: ProcedureSupply | undefined, b: ProcedureSupply | undefined): boolean {
  return (a?.image ?? true) === (b?.image ?? true) && (a?.gas ?? true) === (b?.gas ?? true);
}

/** The abdomen let down (the frame's field otherwise as it was). */
const deflated = (s: ProcedureState): ProcedureState => (s.insufflated || s.pressure ? { ...s, insufflated: false, pressure: 0 } : s);

/** A frame under the equipment as it is now: the supply of `live`; without gas, the abdomen as `live` has it. */
export function underSupply(frame: ProcedureState, live: ProcedureState): ProcedureState {
  if (sameSupply(frame.supply, live.supply)) return frame;
  const { supply: _old, ...rest } = frame;
  return { ...rest, ...(live.supply ? { supply: live.supply } : {}), ...(live.supply?.gas === false ? { insufflated: live.insufflated, pressure: live.pressure } : {}) };
}

function targetOf(op: Record<string, unknown> | undefined): string | null {
  if (!op) return null;
  for (const k of ["handle", "structure", "region", "port", "strategy", "modality", "view", "plan"]) if (typeof op[k] === "string") return op[k] as string;
  return null;
}

export class OperativePlayback {
  private def: ProcedureDefinition | null = null;
  private key = "";
  private shown: ProcedureState | null = null;
  private item: PlaybackItem | null = null;
  /** Operative events taken in (shown, queued or skipped by a first look). */
  private seen = 0;
  private rejections = 0;
  private readonly queue: PlaybackItem[] = [];
  private latest: ProcedureState | null = null;
  /** The frame on screen under the current supply (kept while neither changes: views compare by identity). */
  private lit: { frame: ProcedureState; live: ProcedureState; item: PlaybackItem | null; state: ProcedureState } | null = null;
  /**
   * The operative events (by sequence) that happened before the equipment let the abdomen down — shown deflated
   * whenever they play (0: none). A later accepted insufflation (a higher sequence) is shown as it was.
   */
  private deflatedThrough = 0;
  /** The next replay starts from a deflated abdomen (the equipment let it down after the last step taken in). */
  private deflateBase = false;
  private timer: unknown = null;
  private until = 0;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly timers: PlaybackTimers = browserTimers) {}

  /** The session and operation the views follow: a different one starts afresh (a first look). */
  attach(key: string, def: ProcedureDefinition | null): void {
    if (key === this.key && def === this.def) return;
    this.stop();
    this.key = key;
    this.def = def;
    this.shown = null;
    this.item = null;
    this.seen = 0;
    this.rejections = 0;
    this.queue.length = 0;
    this.latest = null;
    this.lit = null;
    this.until = 0;
  }

  /** Take in the record: its operative events so far (oldest first) and the field now; plays what is new. */
  sync(events: readonly OperativeEvent[], field: ProcedureState): void {
    const def = this.def;
    if (!def) return;
    const supplyChanged = !!this.latest && !sameSupply(this.latest.supply, field.supply);
    const before = this.latest;
    this.latest = field;
    if (!this.shown || events.length < this.seen) {
      // a first look, or a record that went back: the field as it is, the last thing that happened as its caption
      this.shown = field;
      this.seen = events.length;
      this.rejections = events.filter((e) => e.type === "action.rejected").length;
      this.queue.length = 0;
      this.deflatedThrough = 0;
      this.deflateBase = false;
      const last = events.at(-1);
      this.item = last ? this.itemOf(last, events.length, field, field) : null;
      this.emit();
      return;
    }
    let base = this.queue.at(-1)?.after ?? this.shown;
    // the equipment let the abdomen down since the last step taken in: what follows is replayed from there
    if (this.deflateBase) {
      base = deflated(base);
      this.deflateBase = false;
    }
    // the abdomen came down now, and not by an operative step taken in now (a desufflation replays by itself): the
    // equipment did it — everything taken in so far is from before
    const byStep = events.slice(this.seen).some((e) => e.type === "procedure.step" && e.op === "desufflate");
    const letDown = !!before?.insufflated && !field.insufflated && !byStep;
    for (let i = this.seen; i < events.length; i++) {
      const e = events[i]!;
      let after = base;
      if (e.type === "procedure.step") {
        // an accepted step was accepted under the supply of its time: the replay does not re-ask the equipment; its
        // actor (a colleague; none: the operator, the stand-in surgeon too) and its ref are the record's
        const { supply: _supply, ...unsupplied } = base;
        const replayed = e.detail ? operate(def, unsupplied, e.detail, e.at ?? 0, e.actor, e.ref) : null;
        // a step that cannot be replayed (a record without its detail): its frame is the session's field
        after = replayed && !replayed.rejected ? replayed.state : field;
      } else this.rejections++;
      this.queue.push(this.itemOf(e, i + 1, base, after));
      base = after;
    }
    this.seen = events.length;
    if (letDown) {
      this.deflatedThrough = events.length;
      this.deflateBase = true;
      this.lit = null;
    }
    if (this.queue.length) {
      this.play();
      if (letDown) this.emit();
    }
    else if (this.shown !== field && !this.timer) {
      // nothing to play: the field changed without a step (a tower failing, a backup connected, the abdomen
      // deflating) — the frame on screen is the session's own field, now
      const was = this.shown;
      this.shown = field;
      if (supplyChanged || was.insufflated !== field.insufflated || was.pressure !== field.pressure) this.emit();
    }
  }

  private itemOf(e: OperativeEvent, sequence: number, before: ProcedureState, after: ProcedureState): PlaybackItem {
    if (e.type === "procedure.step")
      return { kind: "step", id: e.id ?? `op-${e.step ?? sequence}`, sequence, actor: e.actor ?? null, operation: e.op, target: targetOf(e.detail as Record<string, unknown> | undefined), accepted: true, at: e.at ?? 0, revision: after.counters.steps, signals: [...e.signals], before, after };
    return { kind: "rejected", id: `rejected-${this.rejections}`, sequence, actor: e.actor ?? null, operation: e.detail?.op ?? "?", target: targetOf(e.detail as Record<string, unknown> | undefined), accepted: false, rejectionReason: e.message, at: e.at ?? 0, revision: before.counters.steps, signals: [], before, after: before };
  }

  /** Show the next frame now (null: nothing waiting) — the timers call it; tests may too. */
  next(): PlaybackItem | null {
    const item = this.queue.shift() ?? null;
    if (!item) return null;
    // the last frame is the session's own field (whatever the replay computed)
    this.shown = this.queue.length === 0 && this.latest && item.kind === "step" ? this.latest : item.after;
    this.item = item;
    this.emit();
    return item;
  }

  /** Play the queue, each frame for its time — also when the next one arrives only after a frame was drawn. */
  private play(): void {
    if (this.timer) return;
    const tick = () => {
      this.timer = null;
      const item = this.next();
      if (!item) return;
      const dwell = item.kind === "rejected" || item.signals.length ? SIGNAL_MS : STEP_MS;
      this.until = this.timers.now() + dwell;
      if (this.queue.length) this.timer = this.timers.schedule(tick, dwell);
    };
    const wait = this.until - this.timers.now();
    if (wait > 0) this.timer = this.timers.schedule(tick, wait);
    else tick();
  }

  private stop(): void {
    if (this.timer) this.timers.cancel(this.timer);
    this.timer = null;
  }

  /** The frame on screen: the field shown, and the step or refusal that led to it (null: none yet). */
  frame(): { state: ProcedureState | null; item: PlaybackItem | null } {
    const shown = this.shown;
    const live = this.latest;
    if (!shown || !live) return { state: shown, item: this.item };
    if (this.lit?.frame !== shown || this.lit.live !== live || this.lit.item !== this.item) {
      const lit = underSupply(shown, live);
      // a frame from before the equipment let the abdomen down is shown down (its step and caption as they were)
      const stale = this.deflatedThrough > 0 && (this.item?.sequence ?? 0) <= this.deflatedThrough;
      this.lit = { frame: shown, live, item: this.item, state: stale ? deflated(lit) : lit };
    }
    return { state: this.lit.state, item: this.item };
  }

  /** Frames waiting to be shown. */
  pending(): number {
    return this.queue.length;
  }

  /** Called on every frame change. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }
}
