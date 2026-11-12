/**
 * Alarm responses (schema `schema/alarm.ts`): pure — open an episode for a newly recognised critical alarm, record a
 * blocked way to the patient (the same reason twice changes nothing), the responder's arrival, the alarm clearing.
 */
import type { AlarmEpisode, AlarmResponseOp } from "../schema/alarm.js";
import type { SessionState } from "../schema/session.js";

/** The open episode of a vital (not cleared), if any. */
export function openAlarm(s: SessionState, vital: string): AlarmEpisode | undefined {
  return (s.alarms ?? []).find((e) => e.vital === vital && e.stage !== "cleared");
}

export type AlarmResult = { ok: true; alarms: AlarmEpisode[]; changed: boolean; id: string } | { ok: false; code: "invalid" | "requirements-unmet"; message: string };

/** Apply one alarm-response step (pure). */
export function applyAlarm(s: SessionState, op: AlarmResponseOp): AlarmResult {
  const alarms = structuredClone(s.alarms ?? []);
  const at = s.clock;
  const seq = s.seq + 1;
  const open = alarms.find((e) => e.vital === op.vital && e.stage !== "cleared");
  if (op.op === "detect") {
    if (open) return { ok: true, alarms, changed: false, id: open.id };
    const id = `alarm-${alarms.length + 1}`;
    alarms.push({ id, vital: op.vital, value: op.value, by: op.by, stage: "detected", history: [{ stage: "detected", at, seq }] });
    return { ok: true, alarms, changed: true, id };
  }
  if (!open) return { ok: false, code: "requirements-unmet", message: `no open ${op.vital} alarm` };
  switch (op.op) {
    case "blocked":
      if (open.stage === "arrived") return { ok: false, code: "invalid", message: `${open.by} is already at the patient` };
      if (open.stage === "blocked" && open.reason === op.reason) return { ok: true, alarms, changed: false, id: open.id };
      open.stage = "blocked";
      open.reason = op.reason;
      open.history.push({ stage: "blocked", at, seq, reason: op.reason });
      return { ok: true, alarms, changed: true, id: open.id };
    case "arrived":
      if (open.stage === "arrived") return { ok: true, alarms, changed: false, id: open.id };
      open.stage = "arrived";
      delete open.reason;
      open.history.push({ stage: "arrived", at, seq });
      return { ok: true, alarms, changed: true, id: open.id };
    case "cleared":
      open.stage = "cleared";
      delete open.reason;
      open.history.push({ stage: "cleared", at, seq });
      return { ok: true, alarms, changed: true, id: open.id };
  }
}
