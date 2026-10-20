/**
 * Episode traces (EMBODIED §10): typed spans linked by parent ids —
 * observation → plan → navigation → interaction → clinical_action →
 * state_change → verification → assessment — with action ids, world
 * versions, clinical event ids and simulated/real time. The clock (`now`,
 * ms) and the simulated minute (`clock`) are injected, so a trace is
 * deterministic. `toJsonl()`: a header line (episode metadata) then one span
 * per line, in the order they were recorded.
 *
 * `recordActionSpans` writes the spans of one world action: a root span
 * (`navigation` for navigate / approach / look_at / move_to, else
 * `interaction`) and children — `clinical_action` when a clinical tool ran,
 * `state_change` when the action committed physical changes.
 */
import type { ActorId, EntityId, EpisodeTrace, TraceSink, TraceSpan, TraceSpanKind, WorldActionRequest, WorldActionResult, WorldEvent } from "./contracts.js";

export interface TraceRecorderOptions {
  episodeId: string;
  caseId: string;
  facilityId: string;
  embodiment?: EpisodeTrace["embodiment"];
  /** Injected wall clock (ms) and simulated minute. */
  now: () => number;
  clock?: () => number;
  newId: () => string;
  /** Keep at most this many spans (oldest dropped; default unbounded). */
  maxSpans?: number;
}

/** An open span: `end` it to record it (the refs and data given at the end are merged over those it was started with). */
export interface SpanHandle {
  readonly id: string;
  end(result: { ok: boolean; worldVersion?: number; refs?: TraceSpan["refs"]; data?: Record<string, unknown> }): TraceSpan;
}

/** Collects the spans of one episode (implements `TraceSink`). */
export class TraceRecorder implements TraceSink {
  private readonly list: TraceSpan[] = [];

  constructor(private readonly o: TraceRecorderOptions) {}

  /** Record a finished span (the id is assigned here). */
  add(span: Omit<TraceSpan, "id">): TraceSpan {
    const full: TraceSpan = { id: this.o.newId(), ...span };
    this.list.push(full);
    if (this.o.maxSpans !== undefined && this.list.length > this.o.maxSpans) this.list.splice(0, this.list.length - this.o.maxSpans);
    return full;
  }

  /** Open a span now; `end` records it with the end time. */
  start(kind: TraceSpanKind, name: string, opts: { parentId?: string | null; actorId?: ActorId | null; worldVersion?: number; refs?: TraceSpan["refs"]; data?: Record<string, unknown> } = {}): SpanHandle {
    const id = this.o.newId();
    const startedAt = this.o.now();
    const clockStart = this.o.clock?.() ?? 0;
    return {
      id,
      end: (r) => {
        const span: TraceSpan = {
          id,
          parentId: opts.parentId ?? null,
          kind,
          name,
          actorId: opts.actorId ?? null,
          startedAt,
          endedAt: this.o.now(),
          clockStart,
          clockEnd: this.o.clock?.() ?? 0,
          worldVersion: r.worldVersion ?? opts.worldVersion ?? 0,
          ok: r.ok,
          refs: { ...(opts.refs ?? {}), ...(r.refs ?? {}) },
        };
        // Data given at the end is merged over the data the span was started with (like refs).
        if (opts.data || r.data) span.data = { ...(opts.data ?? {}), ...(r.data ?? {}) };
        this.list.push(span);
        return span;
      },
    };
  }

  /** Spans recorded so far (in order). */
  spans(): TraceSpan[] {
    return [...this.list];
  }

  /** The episode trace. */
  trace(): EpisodeTrace {
    return { format: "clinicalcraft-trace@1", episodeId: this.o.episodeId, caseId: this.o.caseId, facilityId: this.o.facilityId, embodiment: this.o.embodiment ?? "embodied", spans: this.spans() };
  }

  /** JSON Lines: a header line `{format, episodeId, caseId, facilityId, embodiment}`, then one span per line. */
  toJsonl(): string {
    const { spans, ...header } = this.trace();
    return [JSON.stringify(header), ...spans.map((s) => JSON.stringify(s))].join("\n") + "\n";
  }
}

/** Operations recorded as `navigation` spans. */
export const NAVIGATION_OPERATIONS: readonly string[] = ["navigate", "approach", "look_at", "move_to"];

/** Event types that are physical state changes (a `state_change` span). */
const STATE_EVENTS: readonly WorldEvent["type"][] = ["actor.moved", "entity.state", "entity.moved", "item.held", "door.changed", "reservation.changed", "hygiene"];

/** Timing of one action (injected clocks). */
export interface ActionTiming {
  startedAt: number;
  endedAt: number;
  clockStart: number;
  clockEnd: number;
}

/** Write the spans of one world action to a sink (see module docs); returns them, root first. */
export function recordActionSpans(sink: TraceSink, request: WorldActionRequest, result: WorldActionResult, timing: ActionTiming, parentId: string | null = null): TraceSpan[] {
  const ok = result.status === "completed";
  const entities = [...new Set([request.targetId, ...result.events.flatMap((e) => ("entityId" in e ? [e.entityId] : []))].filter((x): x is EntityId => !!x))];
  const refs: TraceSpan["refs"] = { actionId: result.actionId };
  if (entities.length) refs.entities = entities;
  if (result.errorCode) refs.errorCode = result.errorCode;
  if (result.clinicalEventIds?.length) refs.clinicalEventIds = [...result.clinicalEventIds];
  const data: Record<string, unknown> = { status: result.status };
  if (request.targetId) data.targetId = request.targetId;
  if (result.navigation) data.navigation = { length: result.navigation.length, travelSeconds: result.navigation.travelSeconds, replans: result.navigation.replans, arrivalError: result.navigation.arrivalError, ok: result.navigation.ok, ...(result.navigation.code ? { code: result.navigation.code } : {}) };
  if (result.elapsedSeconds !== undefined) data.elapsedSeconds = result.elapsedSeconds;
  const root = sink.add({ parentId, kind: NAVIGATION_OPERATIONS.includes(request.operation) ? "navigation" : "interaction", name: request.operation, actorId: request.actorId, ...timing, worldVersion: result.worldVersion, ok, refs, data });
  const out = [root];
  if (result.clinical) {
    const r: TraceSpan["refs"] = { actionId: result.actionId };
    if (result.clinicalEventIds?.length) r.clinicalEventIds = [...result.clinicalEventIds];
    out.push(sink.add({ parentId: root.id, kind: "clinical_action", name: result.clinical.tool, actorId: request.actorId, ...timing, worldVersion: result.worldVersion, ok: result.clinical.ok, refs: r }));
  }
  const changes = result.events.filter((e) => STATE_EVENTS.includes(e.type));
  if (changes.length) {
    const changed = [...new Set(changes.flatMap((e) => ("entityId" in e ? [e.entityId] : "actorId" in e ? [e.actorId] : [])))];
    out.push(sink.add({ parentId: root.id, kind: "state_change", name: changes.map((e) => e.type).join(","), actorId: request.actorId, ...timing, worldVersion: result.worldVersion, ok: true, refs: { actionId: result.actionId, entities: changed } }));
  }
  return out;
}
