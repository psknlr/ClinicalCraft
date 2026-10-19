/**
 * Bench sessions: a fresh, isolated embodied session per run — built with
 * `createSession` from explicit settings (no user or project settings,
 * hooks, memory or agents leak into a benchmark; NPCs are the deterministic
 * offline responders; only the agent under test may get a model), a
 * deterministic id generator and logical clock, the bench-only
 * `submit_answer` tool for answer tasks, the scenario's approval policy, and
 * the scenario setup applied through the world's scenario controls and
 * world actions before the case starts.
 */
import { builtinAgent, mergeSettings, PERMISSION_RULE_IDS, type AgentProfile, type ClinicalSession, type LLMProvider, type ProviderConfig, type RiskLevel, type ToolDefinition, type ApprovalMode } from "@clinicalcraft/agent";
import { createSession } from "@clinicalcraft/agent";
import { catalogsFor, chooseFacility, type LoadedContent } from "@clinicalcraft/agent/node";
import { createRng, seedFrom, t, type CaseDefinition } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type Pose, type WorldRuntime } from "@clinicalcraft/world";
import { bm } from "./i18n.js";
import { isAnswerTask, SUBMIT_ANSWER_TOOL, type ApprovalPolicy, type BenchScenario } from "./schema.js";

/** Logical epoch of bench sessions (the session clock and trace timestamps are deterministic: one tick = 1 ms). */
export const BENCH_EPOCH = Date.UTC(2026, 0, 1);

/** Deterministic id generator ("b1", "b2"…). */
export function benchIds(prefix = "b"): () => string {
  let n = 0;
  return () => `${prefix}${++n}`;
}

/** Deterministic logical clock (ms): every call advances it by 1 ms. */
export function benchClock(start = BENCH_EPOCH): () => number {
  let now = start;
  return () => ++now;
}

/** The seed of one run: the scenario's base seed combined with the run seed. */
export function runSeed(scenario: Pick<BenchScenario, "id" | "seed">, seed: number): number {
  return seedFrom(scenario.id, scenario.seed, seed);
}

/* ------------------------------------------------------------------ */
/* Answers                                                             */
/* ------------------------------------------------------------------ */

export interface SubmittedAnswer {
  /** What the agent passed. */
  raw: string;
  /** The entity it resolves to (null: none). */
  resolved: string | null;
}

/** The answers submitted in one run (the last one counts). */
export class AnswerStore {
  readonly submissions: SubmittedAnswer[] = [];
  submit(answer: SubmittedAnswer): void {
    this.submissions.push(answer);
  }
  last(): SubmittedAnswer | null {
    return this.submissions.at(-1) ?? null;
  }
}

/** Resolve an answer the way the world resolves ids (prefixed ids, unique unprefixed aliases, `patient`). */
export function resolveAnswer(world: WorldRuntime | null, raw: string): string | null {
  const text = raw.trim();
  if (!world || !text) return null;
  if (world.actor(text)) return text;
  return world.resolveId(text) ?? (world.actor(`staff:${text}`) ? `staff:${text}` : null);
}

/**
 * `submit_answer` (bench sessions only): records the agent's answer to a
 * perception / spatial task. Read-only — it changes nothing in the encounter
 * — and it never says whether the answer is right.
 */
export function submitAnswerTool(store: AnswerStore, world: () => WorldRuntime | null): ToolDefinition<{ entity_id?: string }> {
  return {
    name: SUBMIT_ANSWER_TOOL,
    description:
      'Benchmark task answer: submit the entity id you identified (e.g. "eq:resus1-ecg", "room:rad-ct", "staff:ed-nurse"). Read-only — it changes nothing in the encounter and does not say whether the answer is correct. Submit once.',
    inputSchema: { type: "object", properties: { entity_id: { type: "string", minLength: 1, maxLength: 120, description: "The entity id." } }, required: ["entity_id"], additionalProperties: false },
    readOnly: true,
    sideEffect: "none",
    scope: "history-only",
    risk: () => "none" as RiskLevel,
    summarize: (args) => `${SUBMIT_ANSWER_TOOL} ${String(args.entity_id ?? "")}`,
    async run(args, ctx) {
      const raw = String(args.entity_id ?? "");
      const w = world();
      const resolved = resolveAnswer(w, raw);
      store.submit({ raw, resolved });
      if (!resolved || !w) return { ok: false, output: bm(ctx.locale, "answer.unknown", { id: raw }) };
      const e = w.entity(resolved);
      const name = e ? t(e.name, ctx.locale) : resolved;
      return { ok: true, output: bm(ctx.locale, "answer.recorded", { id: resolved, name }), data: { answer: resolved } };
    },
  };
}

/** The clinician profile of a bench session: the built-in clinician, its tools narrowed to `allowedTools`, plus `submit_answer` for answer tasks. */
export function benchClinicianProfile(scenario: Pick<BenchScenario, "allowedTools" | "answer">): AgentProfile {
  const base = builtinAgent("clinician");
  if (!base) throw new Error("built-in clinician profile missing");
  const allowed = scenario.allowedTools ? new Set(scenario.allowedTools) : null;
  const tools = base.tools.filter((tool) => !allowed || allowed.has(tool));
  if (isAnswerTask(scenario) && (!allowed || allowed.has(SUBMIT_ANSWER_TOOL))) tools.push(SUBMIT_ANSWER_TOOL);
  return { ...base, tools, source: "project" };
}

/* ------------------------------------------------------------------ */
/* Approvals                                                           */
/* ------------------------------------------------------------------ */

/**
 * How a headless benchmark answers one approval request — the CLI's
 * unattended rules (`exec` / PROTOCOL §11, without `--approve-high-risk`):
 * `bypass` approves; `auto` approves low/moderate-risk requests and declines
 * always-ask, ask-rule and high-risk ones; every other mode declines.
 */
export function headlessApproval(mode: ApprovalMode, request: { risk: RiskLevel; ruleId: string }): { approve: boolean; reason?: "headless" | "highRisk" } {
  if (mode === "bypass") return { approve: true };
  if (mode !== "auto") return { approve: false, reason: "headless" };
  const needsPerson = request.risk === "high" || request.ruleId === PERMISSION_RULE_IDS.alwaysAsk || request.ruleId === PERMISSION_RULE_IDS.ask;
  return needsPerson ? { approve: false, reason: "highRisk" } : { approve: true };
}

/** Answer every approval request of a session by policy (deferred, so every listener sees the request first). */
export function attachApprover(session: ClinicalSession, policy: ApprovalPolicy): () => void {
  return session.subscribe((e) => {
    if (e.msg.type !== "approval_request") return;
    const { requestId, risk, ruleId } = e.msg;
    queueMicrotask(() => {
      const L = session.settings.locale;
      if (policy === "approve") return void session.submit({ type: "approval_response", requestId, decision: "approved" });
      if (policy === "deny") return void session.submit({ type: "approval_response", requestId, decision: "denied", reason: bm(L, "approval.declined") });
      const d = headlessApproval(session.settings.approvalMode, { risk, ruleId });
      session.submit(
        d.approve
          ? { type: "approval_response", requestId, decision: "approved" }
          : { type: "approval_response", requestId, decision: "denied", reason: bm(L, d.reason === "highRisk" ? "approval.headlessHighRisk" : "approval.headless") },
      );
    });
  });
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

/** How the agent under test is wired into the session. */
export interface AgentWiring {
  /** `settings.agents.clinician` (provider/model of the agent under test; NPCs stay offline). */
  clinician?: { provider: string; model?: string; maxToolRounds?: number };
  /** Extra provider overrides (`settings.providers`). */
  providers?: Record<string, unknown>;
  resolveProvider?: (providerId: string, model: string | null) => ProviderConfig;
  providerFactory?: (agent: AgentProfile, config: ProviderConfig) => LLMProvider;
  retry?: false;
}

/** What a session needs from a scenario (the demonstration builds one without a full scenario). */
export type BenchSessionScenario = Pick<BenchScenario, "caseId" | "facilityId" | "locale" | "setup" | "allowedTools" | "answer">;

export interface BenchSessionOptions {
  scenario: BenchSessionScenario;
  content: Pick<LoadedContent, "cases" | "facilities" | "catalogs">;
  answers: AnswerStore;
  wiring?: AgentWiring;
  /** Session language (default: the scenario's). */
  locale?: string;
  /** Approval mode override (default: the scenario's, else `default`). */
  approvalMode?: ApprovalMode;
  now?: () => number;
  newId?: () => string;
}

/** Thrown when a scenario cannot be set up (an unknown entity, a setup action that failed). */
export class ScenarioSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioSetupError";
  }
}

/** The case definition of a scenario. */
export function scenarioCase(scenario: Pick<BenchScenario, "caseId">, content: Pick<LoadedContent, "cases">): CaseDefinition {
  const entry = content.cases.get(scenario.caseId);
  if (!entry) throw new ScenarioSetupError(`unknown case "${scenario.caseId}"`);
  return entry.def;
}

/** Build the (not yet set up) embodied session of a run. */
export async function createBenchSession(o: BenchSessionOptions): Promise<ClinicalSession> {
  const s = o.scenario;
  const caseDef = scenarioCase(s, o.content);
  if (s.facilityId && !o.content.facilities.has(s.facilityId)) throw new ScenarioSetupError(`unknown facility "${s.facilityId}"`);
  const facility = chooseFacility(o.content, caseDef, s.facilityId, null);
  if (!facility) throw new ScenarioSetupError("no facility");
  const w = o.wiring ?? {};
  const settings = mergeSettings([
    {
      source: "flag",
      settings: {
        provider: "offline",
        locale: o.locale ?? s.locale,
        embodiment: "embodied",
        approvalMode: o.approvalMode ?? s.setup.approvalMode ?? "default",
        practiceScope: s.setup.practiceScope ?? "full",
        permissions: { allow: s.setup.permissions?.allow ?? [], ask: s.setup.permissions?.ask ?? [], deny: s.setup.permissions?.deny ?? [] },
        transcripts: { enabled: false },
        autoCompact: { enabled: false, thresholdTokens: 120_000 },
        ...(w.clinician ? { agents: { clinician: w.clinician } } : {}),
        ...(w.providers ? { providers: w.providers } : {}),
      },
    },
  ]);
  const pose = s.setup.actor?.pose;
  const spawn: Pose | undefined = pose ? { x: pose.x, y: 0, z: pose.z, yaw: ((pose.yaw ?? 0) * Math.PI) / 180, pitch: 0, level: pose.level ?? "L0" } : undefined;
  let session: ClinicalSession | null = null;
  const tools = isAnswerTask(s) ? [submitAnswerTool(o.answers, () => session?.world() ?? null)] : [];
  session = await createSession({
    caseDef,
    facility,
    catalogs: catalogsFor(o.content, facility),
    settings,
    agents: [benchClinicianProfile(s)],
    tools,
    newId: o.newId ?? benchIds(),
    now: o.now ?? benchClock(),
    ...(w.retry === false ? { retry: false as const } : {}),
    ...(w.resolveProvider ? { resolveProvider: w.resolveProvider } : {}),
    ...(w.providerFactory ? { providerFactory: w.providerFactory } : {}),
    embodied: spawn ? { spawn } : {},
  });
  return session;
}

/**
 * Apply the scenario setup, in order: scripted world actions (staff, the
 * clinician's walk) → obstacles → doors → devices out of service → the
 * clinician's place and facing → start the case → prior engine actions.
 * Nothing is timed before the start (the clock only moves once the case has
 * started). Returns the number of trace spans the setup recorded.
 */
export async function applySetup(session: ClinicalSession, scenario: BenchScenario, seed: number): Promise<{ setupSpans: number }> {
  const world = session.world();
  if (!world) throw new ScenarioSetupError("not an embodied session");
  const setup = scenario.setup;
  const fail = (what: string, message: string) => {
    throw new ScenarioSetupError(`${scenario.id}: setup ${what}: ${message}`);
  };
  let n = 0;
  for (const a of setup.actions ?? []) {
    const targetId = a.target ? (world.resolveId(a.target) ?? a.target) : undefined;
    const r = await world.execute({ actionId: `setup-${++n}`, actorId: a.actor, operation: a.operation, ...(targetId ? { targetId } : {}), ...(a.goal ? { goal: a.goal } : {}), ...(a.parameters ? { parameters: a.parameters } : {}) });
    if (r.status !== "completed") fail(`action ${n} (${a.actor} ${a.operation})`, `${r.errorCode ?? r.status}: ${r.message}`);
  }
  try {
    for (const o of setup.obstacles ?? []) world.setObstacle({ id: o.id, level: o.level ?? "L0", rect: o.rect, label: o.label ?? { "zh-CN": "障碍物", en: "Obstacle" } }, true);
    for (const d of setup.doors ?? []) world.setDoor(d.id, { ...(d.open !== undefined ? { open: d.open } : {}), ...(d.locked !== undefined ? { locked: d.locked } : {}) });
    for (const id of setup.unavailable ?? []) world.setAvailability(id, false);
  } catch (err) {
    fail("world control", (err as Error).message);
  }
  if (setup.actor?.at) {
    const r = await world.execute({ actionId: `setup-${++n}`, actorId: PRIMARY_ACTOR, operation: "navigate", goal: setup.actor.at });
    if (r.status !== "completed") fail("actor.at", `${r.errorCode ?? r.status}: ${r.message}`);
  }
  const yaw = setup.actor?.yaw;
  if (yaw !== undefined) {
    const pose = world.actor(PRIMARY_ACTOR)!.pose;
    const radians = yaw === "random" ? createRng(runSeed(scenario, seed))() * 2 * Math.PI : (yaw * Math.PI) / 180;
    world.updatePose(PRIMARY_ACTOR, { ...pose, yaw: radians });
  }
  await session.run({ type: "clinical_action", action: { type: "start" } });
  for (const action of setup.clinical ?? []) {
    const r = session.dispatch({ ...action, by: "system" } as typeof action);
    if (r.rejected) fail(`clinical ${action.type}`, `${r.rejected.code}: ${r.rejected.message}`);
  }
  return { setupSpans: session.trace().spans.length };
}
