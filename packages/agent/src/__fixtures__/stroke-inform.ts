/**
 * The built-in stroke case's information handoff (docs/TEAM.md §4.7; audit 2026-11-12 P1-9), brought to the moment the
 * ED nurse tells the learner what the triage nurse heard from his wife: the team scenario `anticoagulants-from-triage`
 * chosen at the start (here, or by a front-end's own start), the team paused, the case's reference path played until
 * the need arises (the CT head read — an in-world study acquired at its device by the system, as the e2e QA does; a
 * result read once it is ready), the history it routes through the team never asked, the learner's body at the patient,
 * then the team stepped until the report is said to the learner — in learner mode, as a text front-end plays it. Used
 * only by `*.test.ts` files (isomorphic).
 */
import { evaluate, type CaseDefinition } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import type { ClinicalSession } from "../session/session.js";
import type { TeamMessage } from "../session/team/types.js";

/** The built-in case with an emergency care team (the doctor and the ED nurse). */
export const STROKE = "acute-ischemic-stroke";
/** Its team scenario where the triage nurse holds his anticoagulant history. */
export const STROKE_INFORM = "anticoagulants-from-triage";

/** Play the stroke case until the ED nurse tells the learner the information (a report carrying `about.info`); returns it. */
export async function untilToldInfo(session: ClinicalSession, c: CaseDefinition): Promise<TeamMessage> {
  const scenario = c.team?.scenarios.find((s) => s.id === STROKE_INFORM);
  if (!scenario) throw new Error(`${c.id}: no team scenario ${STROKE_INFORM}`);
  // (a front-end's own start may have chosen it already: MCP's start_case {team})
  if (!session.state.started) await session.run({ type: "clinical_action", action: { type: "start", team: scenario.id } });
  if (session.state.teamScenario !== scenario.id) throw new Error(`${c.id}: the encounter is not in the team scenario ${scenario.id}`);
  await session.run({ type: "team", action: "pause" });
  const informs = scenario.inform ?? [];
  const routed = new Set(informs.map((n) => n.history));
  const due = () => informs.every((n) => !n.when || evaluate(c, session.state, n.when));
  for (let i = 1; i < c.solution.length && !due(); i++) {
    const a = c.solution[i]!;
    if (a.type === "finish") break;
    if (a.type === "ask" && routed.has(a.itemId)) continue;
    let r = session.dispatch(a);
    if (r.rejected && a.type === "read" && /acquired/u.test(r.rejected.message)) {
      session.dispatch({ type: "acquire", investigationId: a.investigationId, phase: a.phase ?? session.state.phase, collector: "radiographer", by: "system" });
      r = session.dispatch(a);
    }
    const later = r.rejected ? /not ready until minute ([\d.]+)/u.exec(r.rejected.message) : null;
    if (later) {
      session.dispatch({ type: "advance-time", minutes: Math.ceil(Number(later[1]) - session.state.clock + 0.5) });
      r = session.dispatch(a);
    }
    if (r.rejected) throw new Error(`${c.id}: the reference path was refused at ${a.type}: ${r.rejected.message}`);
  }
  if (!due()) throw new Error(`${c.id}: the information need never arose`);
  const patient = session.world()?.find(PRIMARY_ACTOR, { kind: "patient", limit: 1 })[0]?.id;
  if (!patient) throw new Error(`${c.id}: no patient in the world`);
  await session.run({ type: "world_action", request: { actionId: "to-the-bed", actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: patient } } });
  for (let k = 0; k < 40; k++) {
    const told = session.team()?.state.messages.find((m) => m.to === PRIMARY_ACTOR && m.kind === "report" && !!m.about.info);
    if (told) return told;
    await session.run({ type: "team", action: "step" });
  }
  throw new Error(`${c.id}: nothing was told to the learner`);
}
