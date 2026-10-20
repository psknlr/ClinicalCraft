/**
 * Event queue (EQ) of a session: stamps `seq`, persists durable events to the
 * transcript BEFORE delivering them (persist-then-deliver), fans out to
 * listeners and async iterators.
 *
 * Events emitted before the first `events()` iterator attaches (e.g.
 * `session_configured` during `createSession`) are kept in a bounded startup
 * backlog and replayed to the first iterator, so a front-end that creates a
 * session and then starts iterating misses nothing.
 *
 * Re-entrancy: a listener may cause another emit while an event is being
 * delivered (an auto-approver answering `approval_request` inside its
 * callback settles the request synchronously). Nested events are stamped and
 * persisted at once but delivered only after the current event has reached
 * every listener and iterator, so every consumer sees events in `seq` order.
 */
import type { AgentEvent, EventMsg } from "../protocol.js";
import type { TranscriptRecorder } from "../transcript.js";

/**
 * Whether an event is written to the transcript. Exhaustive: adding an event
 * type to the protocol without classifying it is a compile error.
 * Transient: high-volume streaming/UI-only events and snapshots that resume
 * rebuilds from actions.
 */
export function isDurableEvent(msg: EventMsg): boolean {
  switch (msg.type) {
    case "agent_message_delta":
    case "agent_reasoning":
    case "turn_phase":
    case "state_snapshot":
    // physical-world changes: high volume, and a resume restores the world from `world` snapshot items
    case "world_event":
      return false;
    case "session_configured":
    case "turn_started":
    case "agent_message":
    case "tool_call_begin":
    case "tool_call_end":
    case "approval_request":
    case "approval_resolved":
    case "dynamic_tool_call":
    case "clinical_event":
    case "plan_updated":
    case "token_usage":
    case "turn_complete":
    case "turn_aborted":
    case "assessment":
    case "notification":
    case "command_output":
    case "config_changed":
    case "compacted":
    case "api_retry":
    case "warning":
    case "error":
    case "shutdown_complete":
    case "world_action_result":
      return true;
    default: {
      const never: never = msg;
      return never;
    }
  }
}

/** Maximum events kept for the first `events()` iterator. */
export const STARTUP_BACKLOG_LIMIT = 1000;

interface IteratorState {
  queue: AgentEvent[];
  wake: (() => void) | null;
  done: boolean;
}

export class EventHub {
  private seq = 0;
  private readonly listeners = new Set<(event: AgentEvent) => void>();
  private readonly iterators = new Set<IteratorState>();
  private backlog: AgentEvent[] | null = [];
  private closed = false;
  /** Stamped events waiting for delivery (FIFO; see re-entrancy above). */
  private readonly outbox: AgentEvent[] = [];
  private delivering = false;

  constructor(private readonly recorder: TranscriptRecorder | null) {}

  /** Last sequence number used. */
  get lastSeq(): number {
    return this.seq;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  /** Stamp, persist (durable) and deliver an event (in `seq` order, even when called from a listener). */
  emit(id: string, msg: EventMsg): AgentEvent {
    const event: AgentEvent = { id, seq: ++this.seq, msg };
    if (this.recorder && isDurableEvent(msg)) this.recorder.record("event", event);
    this.outbox.push(event);
    if (this.delivering) return event; // a listener emitted: delivered after the current event
    this.delivering = true;
    try {
      for (let next = this.outbox.shift(); next; next = this.outbox.shift()) this.deliver(next);
    } finally {
      this.delivering = false;
    }
    if (this.closed) this.endIterators();
    return event;
  }

  private deliver(event: AgentEvent): void {
    if (this.backlog) {
      this.backlog.push(event);
      if (this.backlog.length > STARTUP_BACKLOG_LIMIT) this.backlog.shift();
    }
    for (const listener of [...this.listeners]) {
      try {
        listener(event);
      } catch {
        /* a failing listener never breaks the session */
      }
    }
    for (const it of this.iterators) {
      it.queue.push(event);
      it.wake?.();
    }
  }

  subscribe(listener: (event: AgentEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Async iterator over events; ends after `close()` once drained. */
  events(): AsyncIterable<AgentEvent> {
    const state: IteratorState = { queue: [], wake: null, done: false };
    if (this.backlog) {
      state.queue.push(...this.backlog);
      this.backlog = null;
    }
    if (this.closed) state.done = true;
    else this.iterators.add(state);
    const iterators = this.iterators;
    return {
      [Symbol.asyncIterator](): AsyncIterator<AgentEvent> {
        return {
          async next(): Promise<IteratorResult<AgentEvent>> {
            for (;;) {
              const event = state.queue.shift();
              if (event) return { value: event, done: false };
              if (state.done) return { value: undefined, done: true };
              await new Promise<void>((resolve) => (state.wake = resolve));
              state.wake = null;
            }
          },
          async return(): Promise<IteratorResult<AgentEvent>> {
            state.done = true;
            state.queue.length = 0;
            iterators.delete(state);
            return { value: undefined, done: true };
          },
        };
      },
    };
  }

  /** End every iterator (after delivering what is queued — also when called from a listener). */
  close(): void {
    this.closed = true;
    if (this.delivering) return; // the running delivery loop ends the iterators once the outbox is drained
    this.endIterators();
  }

  private endIterators(): void {
    this.backlog = null;
    for (const it of this.iterators) {
      it.done = true;
      it.wake?.();
    }
    this.iterators.clear();
  }
}
