/**
 * Learning record export (V4 "导出学习记录", generalised): case identity,
 * provenance, deterministic assessment with its safety outcome beside the
 * score (docs/PROTOCOL.md §3.2: passed or not, the critical safety failures
 * and the dose errors — the order as written, the dose read, the preset),
 * examiner narrative (when one was produced), workup plan, notes, the
 * clinical action log and the visible conversation. Derived from the session
 * state and the store's event log — never from a second history.
 */
import { administeredDose, safetySummary } from "@clinicalcraft/agent";
import { assess, t, type CaseDefinition } from "@clinicalcraft/core";
import type { Game } from "./context.js";
import type { RuntimeChoice } from "./llm.js";
import { sourceMaterialUnlocked } from "./source-access.js";

export const LEARNING_RECORD_FORMAT = "clinicalcraft-learning-record@1";

export function buildLearningRecord(game: Game, locale: string, choice: RuntimeChoice): Record<string, unknown> {
  const c: CaseDefinition = game.caseDef;
  const session = game.session.session;
  const store = game.session.store;
  const state = session.state;
  const snapshot = session.snapshot();
  const report = store.assessment?.report ?? assess(c, state);
  const sourceUnlocked = sourceMaterialUnlocked(c, state);
  return {
    format: LEARNING_RECORD_FORMAT,
    exportedAt: new Date().toISOString(),
    locale,
    case: {
      id: c.id,
      version: c.version,
      title: t(c.title, locale),
      provenance: c.provenance.kind,
      citation: sourceUnlocked ? c.provenance.citation ?? null : null,
      doi: sourceUnlocked ? c.provenance.doi ?? null : null,
    },
    facility: game.facility.id,
    sessionId: session.id,
    provider: { mode: choice.mode, provider: store.config?.provider ?? choice.provider, model: store.config?.model ?? choice.model },
    notice: t(c.debrief.notice, locale) || "Formative teaching-script measure; not a validated competency score.",
    progress: {
      phase: state.phase,
      clockMinutes: state.clock,
      finished: state.finished,
      objectivesDone: state.objectivesDone,
      hints: state.hints,
    },
    history: state.asked.map((id) => ({ id, question: t(c.history.find((h) => h.id === id)?.question, locale) })),
    exam: state.examined.map((id) => ({ id, maneuver: t(c.exam.find((x) => x.id === id)?.maneuver, locale) })),
    evidence: state.orders.map((o) => ({ key: o.key, investigation: t(c.investigations.find((i) => i.id === o.investigationId)?.name, locale), phase: o.phase, read: state.seen.includes(o.key) })),
    decisions: state.attempts.map((a) => ({ decisionId: a.decisionId, optionIds: a.optionIds, correct: a.correct, at: a.at })),
    // what was given; an order written in words keeps, apart, its text and the dose read from it (`ordered`) and the
    // dose given (`administered`: the preset)
    interventions: state.interventions.map((r) => (r.ordered ? { ...r, administered: administeredDose(c, r.interventionId, locale) } : r)),
    // orders not given because their dose differed from the dose prepared
    doseErrors: state.doseErrors ?? [],
    notes: state.notes,
    plan: store.plan ?? null,
    // the safety outcome beside the score, in words: never "passed" for a run with a critical failure
    outcome: { score: report.score, safety: safetySummary(c, report, locale) },
    assessment: report,
    examiner: store.assessment ? { narrative: store.assessment.narrative, judged: store.assessment.judged } : null,
    conversation: store.chat.filter((m) => !m.streaming).map((m) => ({ role: m.role, agent: m.agent, speaker: m.speaker, text: m.text, grounded: m.grounded })),
    actions: snapshot.actions,
  };
}
