/**
 * The session's episode trace (docs/EMBODIED.md §10) over the world's
 * `TraceRecorder`: every world action and observation the runtime records
 * (`TraceSink`), plus the session's own spans — `plan` (an autopilot step, a
 * skill, a delegated task), `clinical_action` / `state_change` (a clinical
 * tool's engine commit) and `verification` (a postcondition checked against
 * authoritative state).
 *
 * Linking: a flow that runs several actions for one purpose (an autopilot
 * step, a skill, a delegation) opens a span and runs `within(spanId, fn)`;
 * root spans recorded meanwhile — the world's navigation / interaction /
 * observation spans included — become its children, so the trace reads
 * plan → observation → navigation → interaction → clinical_action →
 * state_change → verification. Scopes nest; they are meant for sequential
 * flows (one at a time per session).
 */
import { TraceRecorder, type ActorId, type EpisodeTrace, type TraceRecorderOptions, type TraceSink, type TraceSpan, type TraceSpanKind } from "@clinicalcraft/world";

/** Default bound of a session trace (oldest spans dropped beyond it). */
export const MAX_TRACE_SPANS = 20_000;

/** A span being recorded (see `TraceRecorder.start`). */
export interface OpenSpan {
  readonly id: string;
  end(result: { ok: boolean; worldVersion?: number; refs?: TraceSpan["refs"]; data?: Record<string, unknown> }): TraceSpan;
}

export class SessionTrace implements TraceSink {
  private readonly recorder: TraceRecorder;
  private readonly scopes: string[] = [];

  constructor(options: TraceRecorderOptions) {
    this.recorder = new TraceRecorder({ maxSpans: MAX_TRACE_SPANS, ...options });
  }

  /** `TraceSink`: a root span recorded inside a scope becomes the scope's child. */
  add(span: Omit<TraceSpan, "id">): TraceSpan {
    const parentId = span.parentId ?? this.current();
    return this.recorder.add(parentId === span.parentId ? span : { ...span, parentId });
  }

  /** The innermost open scope, or null. */
  current(): string | null {
    return this.scopes.at(-1) ?? null;
  }

  /** Open a span (child of `parentId`, else of the current scope). */
  start(kind: TraceSpanKind, name: string, opts: { parentId?: string | null; actorId?: ActorId | null; worldVersion?: number; refs?: TraceSpan["refs"]; data?: Record<string, unknown> } = {}): OpenSpan {
    return this.recorder.start(kind, name, { ...opts, parentId: opts.parentId !== undefined ? opts.parentId : this.current() });
  }

  /** Run `fn` with `spanId` as the parent of every root span recorded meanwhile. */
  async within<T>(spanId: string, fn: () => Promise<T>): Promise<T> {
    this.scopes.push(spanId);
    try {
      return await fn();
    } finally {
      const i = this.scopes.lastIndexOf(spanId);
      if (i >= 0) this.scopes.splice(i, 1);
    }
  }

  /** Spans recorded so far (in recording order). */
  spans(): TraceSpan[] {
    return this.recorder.spans();
  }

  /** The episode trace. */
  trace(): EpisodeTrace {
    return this.recorder.trace();
  }
}

/** JSON Lines of an episode trace: a header `{format, episodeId, caseId, facilityId, embodiment}`, then one span per line. */
export function traceJsonl(trace: EpisodeTrace): string {
  const { spans, ...header } = trace;
  return [JSON.stringify(header), ...spans.map((s) => JSON.stringify(s))].join("\n") + "\n";
}

/** An empty episode (clinical mode: no world, no spans). */
export function emptyTrace(episodeId: string, caseId: string, facilityId: string | null): EpisodeTrace {
  return { format: "clinicalcraft-trace@1", episodeId, caseId, facilityId: facilityId ?? "", embodiment: "clinical", spans: [] };
}
