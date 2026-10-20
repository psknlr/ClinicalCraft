/**
 * The reference demonstration (proposal §20; `clinicalcraft bench demo`):
 * the embodied STEMI ED encounter — or any built-in case — worked headless
 * by the embodied reference clinician (the offline autopilot of embodied
 * mode) in its own facility, approvals answered by a supervising clinician
 * who approves (so every approval appears in the record), then assessed.
 *
 * Output: the episode trace (`trace.jsonl`: the session's spans plus an
 * `assessment` span) and `demo.md`, an auditable narrative where every step
 * links Observation → Plan → Navigation → Object interaction → Clinical
 * action → State change → Verification (→ the final Assessment), with world
 * and target versions, action ids and clinical event ids. The demonstration
 * passes only if the authoritative state confirms every step after the run:
 * the engine records the act (the ECG order and its read, the asked
 * history, the examination, the answers…), and the monitor attachment is
 * latched — the engine's `monitorAttached` and the world's monitor state
 * `attached`.
 */
import { narrateAction, traceJsonl, type ClinicalSession } from "@clinicalcraft/agent";
import type { LoadedContent } from "@clinicalcraft/agent/node";
import { assignPatientSlot, conditionRefs, evaluate, historyCredited, monitorAttached, t, type AssessmentReport, type ClinicalAction, type DomainEvent } from "@clinicalcraft/core";
import { DefaultSpatialPolicy, PRIMARY_ACTOR, type ClinicalIntent, type EpisodeTrace, type SpatialRequirement, type TraceSpan } from "@clinicalcraft/world";
import { Auditor, type AuditResult } from "./audit.js";
import { commitLabel, type BenchEnvironment } from "./environment.js";
import { bm } from "./i18n.js";
import { RunRecorder, type RecordedApproval } from "./recorder.js";
import { AnswerStore, attachApprover, BENCH_EPOCH, createBenchSession } from "./session.js";

export interface DemoOptions {
  caseId: string;
  locale: string;
  content: Pick<LoadedContent, "cases" | "facilities" | "catalogs">;
  facilityId?: string;
  environment: BenchEnvironment;
  /** Autopilot turn budget (default 60). */
  maxTurns?: number;
  /** Date stamp (default: now). */
  date?: Date;
}

export interface DemoStep {
  n: number;
  /** The plan span. */
  plan: TraceSpan;
  action: ClinicalAction | null;
  title: string;
  observations: TraceSpan[];
  navigations: TraceSpan[];
  interactions: TraceSpan[];
  clinical: TraceSpan[];
  changes: TraceSpan[];
  verification: TraceSpan | null;
  approvals: RecordedApproval[];
  /** Engine events of the step (`ev-<seq>`, type). */
  events: { ev: string; type: string }[];
  confirmed: boolean;
  /** What the authoritative state shows. */
  confirmation: string;
}

export interface DemoResult {
  /** Every step confirmed, the case finished, no spatial violation and no unauthorised act accepted. */
  ok: boolean;
  unconfirmed: number;
  steps: DemoStep[];
  /** The independent spatial / authorisation / safety audits of the run. */
  audit: AuditResult;
  /** The case reached its end. */
  finished: boolean;
  trace: EpisodeTrace;
  jsonl: string;
  markdown: string;
  report: AssessmentReport | null;
}

function describeRequirement(r: SpatialRequirement): string {
  switch (r.kind) {
    case "anywhere":
      return "anywhere";
    case "near-patient":
      return `near-patient ≤ ${r.range} m${r.lineOfSight ? " + line of sight" : ""}`;
    case "at-patient":
      return `at-patient ≤ ${r.range} m${r.why ? ` (${r.why})` : ""}`;
    case "at-provider":
      return `at-provider [${r.capabilities.join(", ")}]${r.fixedOnly ? " (fixed)" : ""}`;
    case "bedside-provider":
      return r.capabilities.length
        ? `bedside-provider [${r.capabilities.join(", ")}]${r.delivered?.length ? ` + delivered [${r.delivered.join(", ")}]` : ""}`
        : `delivered to the bedside [${(r.delivered ?? []).join(", ")}]`;
    case "monitor-screen":
      return `the patient's attached monitor ≤ ${r.range} m`;
    case "clinical":
      return `clinical: ${r.need}${r.interventionId ? ` (${r.interventionId} first)` : ""}`;
    case "any-of":
      return r.options.map(describeRequirement).join(" | ");
    case "all-of":
      return r.options.map((o) => (o.kind === "any-of" ? `(${describeRequirement(o)})` : describeRequirement(o))).join(" + ");
  }
}

/** Does an engine event record this action? */
function eventMatches(action: ClinicalAction, e: DomainEvent): boolean {
  switch (action.type) {
    case "ask":
      return e.type === "history.asked";
    case "examine":
      return e.type === "exam.performed" && e.findingId === action.findingId;
    case "order":
      return (e.type === "order.placed" || e.type === "order.duplicate") && e.investigationId === action.investigationId;
    case "read":
      return e.type === "result.read" && e.investigationId === action.investigationId;
    case "intervene":
      return e.type === "intervention.applied" && e.interventionId === action.interventionId;
    case "answer":
      return e.type === "decision.answered" && e.decisionId === action.decisionId;
    case "set-phase":
      return e.type === "phase.changed" && e.to === action.phase;
    case "advance-time":
      return e.type === "time.advanced";
    case "finish":
      return e.type === "case.finished";
    default:
      return false;
  }
}

/**
 * The authoritative check of one step after the run: the engine state holds
 * the act (and, for monitoring, the monitor attachment is latched in the
 * engine and the world); `matched`: an engine event of the run records it
 * (phase changes and waits leave no other trace in the state).
 */
export function confirmAction(session: ClinicalSession, action: ClinicalAction | null, matched: boolean): { ok: boolean; what: string } {
  if (!action) return { ok: false, what: "no postcondition recorded" };
  const c = session.caseDef;
  const s = session.state;
  switch (action.type) {
    case "ask":
      return { ok: historyCredited(c, s, action.itemId), what: `asked ${action.itemId}` };
    case "examine":
      return { ok: s.examined.includes(action.findingId), what: `examined ${action.findingId}` };
    case "order":
      return { ok: evaluate(c, s, { ordered: action.investigationId }), what: `${action.investigationId} ordered` };
    case "read":
      return { ok: evaluate(c, s, { read: action.investigationId, ...(action.phase ? { phase: action.phase } : {}) }), what: `${action.investigationId} read` };
    case "intervene": {
      const given = evaluate(c, s, { intervened: action.interventionId });
      // An intervention that attaches the bedside monitor (named by the case's `physiology.monitor.attachedWhen`).
      const attaches = c.physiology?.monitor ? conditionRefs(c.physiology.monitor.attachedWhen).some((r) => r.kind === "intervention" && r.id === action.interventionId) : false;
      if (attaches) {
        const slot = session.facility ? assignPatientSlot(session.facility, c) : null;
        const monitor = slot?.monitor ? `eq:${slot.monitor}` : null;
        const latched = monitorAttached(c, s) && (!monitor || session.world()?.inspect(PRIMARY_ACTOR, monitor)?.state === "attached");
        return { ok: given && latched, what: `${action.interventionId} given; monitor attachment latched (engine + ${monitor ?? "monitor"}) = ${latched}` };
      }
      return { ok: given, what: `${action.interventionId} given` };
    }
    case "answer":
      return { ok: Object.prototype.hasOwnProperty.call(s.decisions, action.decisionId), what: `decision ${action.decisionId} answered` };
    case "set-phase":
      return { ok: matched, what: `phase changed to ${action.phase}` };
    case "advance-time":
      return { ok: matched, what: `time advanced ${action.minutes} min` };
    case "finish":
      return { ok: s.finished, what: "case finished" };
    default:
      return { ok: matched, what: action.type };
  }
}

/** The one-line verdict of a demonstration (localised). */
export function demoVerdict(r: Pick<DemoResult, "ok" | "unconfirmed" | "audit" | "finished">, locale: string): string {
  if (r.ok) return bm(locale, "demo.verdict.ok");
  return bm(locale, "demo.verdict.fail", {
    n: r.unconfirmed,
    finished: bm(locale, r.finished ? "report.yes" : "report.no"),
    violations: r.audit.spatial.violations.length,
    unauthorised: r.audit.authorisation.unauthorised.length,
  });
}

/** Run the demonstration (see the module docs). */
export async function runDemo(o: DemoOptions): Promise<DemoResult> {
  const answers = new AnswerStore();
  // The session's logical clock, readable without advancing it (approvals are placed in their plan span by time).
  let tick = BENCH_EPOCH;
  const now = () => ++tick;
  const session = await createBenchSession({ scenario: { caseId: o.caseId, ...(o.facilityId ? { facilityId: o.facilityId } : {}), locale: o.locale as "en", setup: { approvalMode: "default" } }, content: o.content, answers, locale: o.locale, now });
  try {
    const unapprove = attachApprover(session, "approve");
    const recorder = new RunRecorder(session);
    const auditor = new Auditor(session);
    const approvalAt = new Map<string, number>();
    const unwatch = session.subscribe((e) => {
      if (e.msg.type === "approval_request") approvalAt.set(e.msg.requestId, tick);
    });
    const detach = recorder.attach();
    const unaudit = auditor.attach();
    await session.run({ type: "autopilot", maxTurns: o.maxTurns ?? 60 });
    const assessed = await session.run({ type: "assess" });
    const report = assessed.flatMap((e) => (e.msg.type === "assessment" ? [e.msg.report] : []))[0] ?? null;
    detach();
    unaudit();
    unwatch();
    unapprove();
    const base = session.trace();
    const audit = auditor.finish(base);
    const steps = buildSteps(session, base, recorder, approvalAt, o.locale);
    const unconfirmed = steps.filter((s) => !s.confirmed).length;
    const ok = steps.length > 0 && unconfirmed === 0 && session.state.finished && audit.spatial.violations.length === 0 && audit.authorisation.unauthorised.length === 0;
    const last = base.spans.at(-1);
    const assessment: TraceSpan = {
      id: "bench-assessment",
      parentId: null,
      kind: "assessment",
      name: "assess",
      actorId: null,
      startedAt: last?.endedAt ?? 0,
      endedAt: last?.endedAt ?? 0,
      clockStart: session.state.clock,
      clockEnd: session.state.clock,
      worldVersion: session.world()?.version ?? 0,
      ok,
      refs: {},
      data: {
        steps: steps.length,
        confirmed: steps.length - unconfirmed,
        finished: session.state.finished,
        spatialAudit: { audited: audit.spatial.audited, violations: audit.spatial.violations.length },
        authorisationAudit: { audited: audit.authorisation.audited, unauthorised: audit.authorisation.unauthorised.length },
        approvals: recorder.approvals.length,
        ...(report ? { score: report.score, objectives: { done: report.objectives.filter((x) => x.done).length, total: report.objectives.length }, contraindicated: report.safety.contraindicated.length } : {}),
      },
    };
    const trace: EpisodeTrace = { ...base, spans: [...base.spans, assessment] };
    const markdown = demoMarkdown({ session, steps, trace, report, ok, unconfirmed, audit, locale: o.locale, environment: o.environment, date: o.date ?? new Date(), recorder });
    return { ok, unconfirmed, steps, audit, finished: session.state.finished, trace, jsonl: traceJsonl(trace), markdown, report };
  } finally {
    await session.close();
  }
}

function buildSteps(session: ClinicalSession, trace: EpisodeTrace, recorder: RunRecorder, approvalAt: ReadonlyMap<string, number>, locale: string): DemoStep[] {
  const spans = trace.spans;
  const order = new Map(spans.map((s, i) => [s.id, i]));
  const children = new Map<string, TraceSpan[]>();
  for (const s of spans) if (s.parentId) children.set(s.parentId, [...(children.get(s.parentId) ?? []), s]);
  const descendants = (id: string): TraceSpan[] => (children.get(id) ?? []).flatMap((c) => [c, ...descendants(c.id)]);
  const chronological = (a: TraceSpan, b: TraceSpan) => a.startedAt - b.startedAt || order.get(a.id)! - order.get(b.id)!;
  const plans = spans.filter((s) => s.kind === "plan" && s.parentId === null).sort(chronological);
  let cursor = 0;
  const c = session.caseDef;
  return plans.map((plan, i) => {
    const inside = descendants(plan.id).sort(chronological);
    const verification = inside.find((s) => s.kind === "verification" && s.parentId === plan.id) ?? null;
    const action = ((verification?.data as { postcondition?: ClinicalAction } | undefined)?.postcondition ?? null) as ClinicalAction | null;
    const clinical = inside.filter((s) => s.kind === "clinical_action");
    // Engine events of the step: those the spans name, else the next recorded event that records the act.
    const named = new Set(clinical.flatMap((s) => s.refs.clinicalEventIds ?? []));
    let events = recorder.clinicalEvents.filter((e) => named.has(e.ev) && e.event.type !== "action.rejected");
    let matched = action ? events.some((e) => eventMatches(action, e.event)) : false;
    if (action && !matched) {
      const at = recorder.clinicalEvents.findIndex((e, k) => k >= cursor && eventMatches(action, e.event));
      if (at >= 0) {
        events = [...events, recorder.clinicalEvents[at]!];
        matched = true;
      }
    }
    const lastIndex = Math.max(-1, ...events.map((e) => recorder.clinicalEvents.indexOf(e)));
    if (lastIndex >= cursor) cursor = lastIndex + 1;
    // The approvals requested while the step ran (by the logical clock).
    const approvals = recorder.approvals.filter((a) => {
      const at = approvalAt.get(a.requestId);
      return at !== undefined && at >= plan.startedAt && at <= plan.endedAt;
    });
    const verdict = confirmAction(session, action, matched);
    const ok = plan.ok && (verification?.ok ?? false) && verdict.ok;
    const title = (action ? narrateAction(c, action, locale) : null) ?? plan.name;
    return {
      n: i + 1,
      plan,
      action,
      title: title.length > 160 ? `${title.slice(0, 157)}…` : title,
      observations: inside.filter((s) => s.kind === "observation"),
      navigations: inside.filter((s) => s.kind === "navigation"),
      interactions: inside.filter((s) => s.kind === "interaction"),
      clinical,
      changes: inside.filter((s) => s.kind === "state_change"),
      verification,
      approvals,
      events: events.map((e) => ({ ev: e.ev, type: e.event.type })),
      confirmed: ok,
      confirmation: verdict.what,
    };
  });
}

interface MarkdownInput {
  session: ClinicalSession;
  steps: DemoStep[];
  trace: EpisodeTrace;
  report: AssessmentReport | null;
  ok: boolean;
  unconfirmed: number;
  audit: AuditResult;
  locale: string;
  environment: BenchEnvironment;
  date: Date;
  recorder: RunRecorder;
}

function demoMarkdown(m: MarkdownInput): string {
  const L = m.locale;
  const c = m.session.caseDef;
  const world = m.session.world();
  const policy = new DefaultSpatialPolicy();
  const slot = m.session.facility ? assignPatientSlot(m.session.facility, c) : null;
  const name = (id: string | undefined | null) => {
    if (!id) return "—";
    const e = world?.entity(id);
    return e ? `${t(e.name, L)} (\`${id}\`)` : `\`${id}\``;
  };
  const yes = bm(L, "report.yes");
  const out: string[] = [];
  out.push(`# ${bm(L, "demo.title", { title: t(c.title, L) })}`, "");
  out.push(`> ${bm(L, "demo.disclaimer")}`, "");
  out.push(bm(L, "demo.meta", { caseId: c.id, facilityId: m.session.facility?.id ?? "—", locale: L, commit: commitLabel(m.environment, bm(L, "report.dirty")), date: m.date.toISOString() }), "");
  out.push(bm(L, "demo.intro"), "");
  out.push(`## ${bm(L, "demo.summary")}`, "");
  out.push(`- ${demoVerdict({ ok: m.ok, unconfirmed: m.unconfirmed, audit: m.audit, finished: m.session.state.finished }, L)}`);
  const actionSpans = m.trace.spans.filter((s) => (s.kind === "navigation" || s.kind === "interaction") && s.refs.actionId);
  out.push(`- ${bm(L, "demo.stats", { steps: m.steps.length, spans: m.trace.spans.length, actions: actionSpans.length, version: world?.version ?? 0, minutes: Math.round(m.session.state.clock * 100) / 100 })}`);
  out.push(`- ${bm(L, "demo.refused", { n: actionSpans.filter((s) => !s.ok).length })}`);
  const approved = m.recorder.approvals.filter((a) => a.decision === "approved" || a.decision === "approved_for_session").length;
  out.push(`- ${bm(L, "demo.approvals", { n: m.recorder.approvals.length, approved })}`);
  out.push(`- ${bm(L, "demo.audit", { spatial: m.audit.spatial.audited, violations: m.audit.spatial.violations.length, gated: m.audit.authorisation.audited, unauthorised: m.audit.authorisation.unauthorised.length })}`);
  out.push("");
  out.push(`## ${bm(L, "demo.steps")}`, "");
  for (const step of m.steps) {
    out.push(`### ${bm(L, "demo.step", { n: step.n, name: step.title.replace(/\n/g, " ") })} ${step.confirmed ? "✓" : "✗"}`, "");
    const obs = step.observations.map((s) => bm(L, "demo.observed", { what: s.name === "observe" ? "observe_world" : `${s.name} ${(s.refs.entities ?? []).map((e) => `\`${e}\``).join(", ")}`, span: `\`${s.id}\``, version: s.worldVersion }));
    out.push(`- **${bm(L, "demo.observation")}** — ${obs.join("; ") || bm(L, "demo.none")}`);
    const data = step.plan.data as { tool?: string; args?: unknown; intent?: ClinicalIntent } | undefined;
    const requirement = data?.intent ? policy.requirementFor(data.intent, { caseDef: c, slotId: slot?.id ?? null, locale: L }) : null;
    out.push(`- **${bm(L, "demo.plan")}** — \`${step.plan.name}\`${requirement ? ` · ${bm(L, "demo.requirement", { kind: describeRequirement(requirement) })}` : ""} (\`${step.plan.id}\`)`);
    const fail = (s: TraceSpan) => (s.ok ? "" : ` ✗ ${s.refs.errorCode ?? ""}`);
    const navs = step.navigations.map((s) => {
      const r = s.refs.actionId ? m.recorder.worldResults.get(s.refs.actionId) : undefined;
      const nav = (s.data as { navigation?: { length?: number; travelSeconds?: number } } | undefined)?.navigation;
      const goal = r?.navigation?.goal;
      const target = (s.data as { targetId?: string } | undefined)?.targetId ?? (goal && "id" in goal ? goal.id : undefined);
      return bm(L, "demo.navigated", { op: s.name, target: name(target), length: (nav?.length ?? 0).toFixed(1), seconds: (nav?.travelSeconds ?? 0).toFixed(1), action: s.refs.actionId ?? "—", version: s.worldVersion, fail: fail(s) });
    });
    out.push(`- **${bm(L, "demo.navigation")}** — ${navs.join("; ") || bm(L, "demo.none")}`);
    const ints = step.interactions.map((s) => {
      const r = s.refs.actionId ? m.recorder.worldResults.get(s.refs.actionId) : undefined;
      const target = (s.data as { targetId?: string } | undefined)?.targetId;
      return bm(L, "demo.interacted", { op: s.name, target: name(target), status: r?.status ?? (s.ok ? "completed" : "failed"), action: s.refs.actionId ?? "—", version: s.worldVersion, targetVersion: r?.targetVersion ?? "—", fail: fail(s) });
    });
    out.push(`- **${bm(L, "demo.interaction")}** — ${ints.join("; ") || bm(L, "demo.none")}`);
    const approvals = step.approvals.map((a) => bm(L, "demo.approvalLine", { tool: a.tool, risk: a.risk, decision: a.decision ?? "—" }));
    out.push(`- **${bm(L, "demo.approval")}** — ${approvals.join("; ") || bm(L, "demo.none")}`);
    const clinical = step.clinical.map((s) => bm(L, "demo.clinicalLine", { tool: s.name, status: s.ok ? "ok" : "refused", events: (s.refs.clinicalEventIds ?? []).map((e) => `\`${e}\``).join(", ") || "—" }));
    if (!clinical.length && data?.tool) clinical.push(bm(L, "demo.clinicalLine", { tool: data.tool, status: step.events.length ? "ok" : "—", events: step.events.map((e) => `\`${e.ev}\``).join(", ") || "—" }));
    out.push(`- **${bm(L, "demo.clinical")}** — ${clinical.join("; ")}`);
    const worldChanges = [...new Set(step.changes.filter((s) => (s.data as { source?: string } | undefined)?.source !== "engine").flatMap((s) => s.name.split(",")))];
    const engineNames = [...new Set(step.events.map((e) => e.type))];
    const changes = [
      ...(worldChanges.length ? [bm(L, "demo.change.world", { names: worldChanges.join(", ") })] : []),
      ...(engineNames.length ? [bm(L, "demo.change.engine", { names: engineNames.join(", "), events: step.events.map((e) => `\`${e.ev}\``).join(", ") })] : []),
    ];
    out.push(`- **${bm(L, "demo.stateChange")}** — ${changes.join("; ") || bm(L, "demo.none")}`);
    out.push(
      `- **${bm(L, "demo.verification")}** — ${bm(L, "demo.verify.span", { status: step.verification?.ok ? "ok" : "failed" })}; ${bm(L, "demo.verify.state", { what: step.confirmation, status: step.confirmed ? bm(L, "demo.confirmed") : bm(L, "demo.notConfirmed") })}`,
    );
    out.push("");
  }
  out.push(`## ${bm(L, "demo.finalAssessment")}`, "");
  if (m.report) {
    const r = m.report;
    out.push(`- ${bm(L, "demo.score", { earned: r.score.earned, possible: r.score.possible, percent: r.score.percent })}`);
    out.push(`- ${bm(L, "demo.objectives", { done: r.objectives.filter((x) => x.done).length, total: r.objectives.length })}`);
    out.push(`- ${bm(L, "demo.decisions", { first: r.decisions.filter((d) => d.firstTryCorrect).length, total: r.decisions.length })}`);
    out.push(`- ${bm(L, "demo.safety", { n: r.safety.contraindicated.length })}`);
    out.push(`- ${bm(L, "demo.minutes", { minutes: Math.round(r.minutes * 100) / 100 })}`);
    out.push(`- ${bm(L, "demo.assessment")}: \`bench-assessment\` (${m.ok ? yes : bm(L, "report.no")})`);
  }
  out.push("");
  out.push(`## ${bm(L, "demo.reproduce")}`, "");
  out.push("```bash", `npm run -s cc -- bench demo --case ${c.id} --lang ${L} --out <dir>`, "```", "");
  return out.filter((line, i, all) => !(line === "" && all[i - 1] === "")).join("\n");
}
