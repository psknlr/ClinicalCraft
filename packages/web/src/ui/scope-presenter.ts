/**
 * The operation presented step by step — the single presentation queue (docs/PROCEDURE.md §3, "Every accepted step is
 * one `procedure.step` event with a stable identity"). The session may commit several steps between two frames (an
 * accelerated demonstration clips a duct three times in one turn); the screen still shows each one on its own, in the
 * order of the record, by replaying its recorded detail (`detail`, `actor`, `at`) through the pure engine from the
 * field it shows now. When the queue drains, the screen is the session's field. A first look (a reload, a window
 * opened late) shows the field as it is, without replaying the operation. Pure: no DOM, no three.js.
 */
import { operate, type DomainEvent, type ProcedureDefinition, type ProcedureState } from "@clinicalcraft/core";

export type StepEvent = Extract<DomainEvent, { type: "procedure.step" }>;

/** One frame of the queue: the step and the field just after it. */
export interface PresentedStep {
  event: StepEvent;
  state: ProcedureState;
}

export class ScopePresenter {
  private shown: ProcedureState | null = null;
  /** Step events already shown (or skipped by a first look). */
  private seen = 0;
  private readonly queue: PresentedStep[] = [];
  private latest: ProcedureState | null = null;

  constructor(private readonly def: ProcedureDefinition) {}

  /** Take in the session's record: the step events so far (oldest first) and its field now. */
  sync(events: readonly StepEvent[], field: ProcedureState): void {
    this.latest = field;
    if (!this.shown || events.length < this.seen + this.queue.length) {
      // a first look, or a record that went back (a new session): the field as it is
      this.shown = field;
      this.seen = events.length;
      this.queue.length = 0;
      return;
    }
    let base = this.queue.at(-1)?.state ?? this.shown;
    for (const event of events.slice(this.seen + this.queue.length)) {
      const replayed = event.detail ? operate(this.def, base, event.detail, event.at ?? 0, event.actor) : null;
      // a step that cannot be replayed (an older record without its detail): its frame is the session's field
      base = replayed && !replayed.rejected ? replayed.state : field;
      this.queue.push({ event, state: base });
    }
  }

  /** Show the next step of the queue (null: nothing waiting). */
  next(): PresentedStep | null {
    const step = this.queue.shift();
    if (!step) return null;
    this.seen++;
    // the last frame is the session's own field (whatever the replay computed)
    this.shown = this.queue.length === 0 && this.latest ? this.latest : step.state;
    return { event: step.event, state: this.shown };
  }

  /** Steps waiting to be shown. */
  pending(): number {
    return this.queue.length;
  }

  /** The field the screen shows now. */
  current(): ProcedureState | null {
    return this.shown;
  }
}
