/**
 * Anaesthesia responsibility (schema `schema/anaesthesia.ts`): continuous — an anaesthetised patient always has a
 * responsible anaesthetist with them. Pure: the responsibility now, whether a staff member may leave, and the steps
 * of a hand-over (request → the relief at the patient → the structured hand-over accepted → transferred).
 */
import type { AnaesthesiaOp, AnaesthesiaResponsibility } from "../schema/anaesthesia.js";
import type { CaseDefinition } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";
import { evaluate } from "./conditions.js";

/** Is the patient under anaesthesia now (the case's `patient.nonVerbalWhen`: from induction until emergence)? */
export function anaesthetised(c: CaseDefinition, s: SessionState): boolean {
  const when = c.patient.nonVerbalWhen;
  return !!when && evaluate(c, s, when);
}

/** The responsible anaesthetist now: the last hand-over's, else the case team's member with the `anaesthesia` duty. */
export function responsibleAnaesthetist(c: CaseDefinition, s: SessionState): string | null {
  return s.anaesthesia?.responsible ?? c.team?.members.find((m) => m.duties.includes("anaesthesia"))?.staff ?? null;
}

/**
 * May this staff member (a staff id) leave the patient now? Not while they are the responsible anaesthetist of an
 * anaesthetised patient — whoever asks, by whatever path (a walk, a fetch, a delegated task, the team's own move).
 */
export function canLeaveAnaesthetisedPatient(c: CaseDefinition, s: SessionState, staff: string): boolean {
  return !(anaesthetised(c, s) && responsibleAnaesthetist(c, s) === staff);
}

export type AnaesthesiaResult = { ok: true; record: AnaesthesiaResponsibility } | { ok: false; code: "invalid" | "requirements-unmet"; message: string };

/** Apply one anaesthesia step (pure): the new responsibility, or why not. */
export function applyAnaesthesia(c: CaseDefinition, s: SessionState, op: AnaesthesiaOp): AnaesthesiaResult {
  const responsible = responsibleAnaesthetist(c, s);
  if (!responsible) return { ok: false, code: "invalid", message: "this case has no anaesthetist responsible for the patient" };
  const r: AnaesthesiaResponsibility = s.anaesthesia ? structuredClone(s.anaesthesia) : { responsible, handoverStatus: "none", handovers: [] };
  switch (op.op) {
    case "request-relief":
      if (op.from !== r.responsible) return { ok: false, code: "invalid", message: `${op.from} is not the responsible anaesthetist (${r.responsible} is)` };
      if (op.to === r.responsible) return { ok: false, code: "invalid", message: "relief by the responsible anaesthetist themself" };
      r.relief = op.to;
      r.handoverStatus = "requested";
      return { ok: true, record: r };
    case "relief-arrived":
      if (r.relief !== op.by || r.handoverStatus !== "requested") return { ok: false, code: "requirements-unmet", message: `${op.by} was not asked to take over` };
      r.handoverStatus = "relief-arrived";
      return { ok: true, record: r };
    case "handover": {
      if (op.from !== r.responsible) return { ok: false, code: "invalid", message: `${op.from} is not the responsible anaesthetist (${r.responsible} is)` };
      if (r.relief !== op.to || r.handoverStatus !== "relief-arrived") return { ok: false, code: "requirements-unmet", message: `${op.to} is not at the patient to take over: a hand-over is made in person` };
      r.handovers.push({ from: op.from, to: op.to, at: s.clock, seq: s.seq + 1, airway: [...op.airway], ventilation: { ...op.ventilation }, haemodynamics: { ...op.haemodynamics }, drugs: op.drugs.map((d) => ({ ...d })), unresolved: [...op.unresolved], accepted: true });
      r.responsible = op.to;
      delete r.relief;
      r.handoverStatus = "transferred";
      return { ok: true, record: r };
    }
  }
}
