/**
 * How the ward reacts to engine domain events: UI notifications plus lines
 * spoken by the nurse/monitor (critical-result call-through, alarms, scenario
 * announcements). Results are never quoted — the learner must read them.
 */
import { t, type CaseDefinition, type DomainEvent } from "@clinicalcraft/core";
import { investigationName, objectiveTitle, phaseLabel, vitalLabel, vitalWithUnit } from "../tools/format.js";
import { rt } from "./i18n.js";

export interface EventReaction {
  notification?: { level: "info" | "warning" | "critical"; title: string; body: string };
  /** A line spoken by staff (agent "nurse"; `monitor` lines use the monitor as speaker). */
  staffLine?: { agent: "nurse"; speaker: "nurse" | "monitor"; text: string };
}

/** Reactions to one domain event (empty for most events). */
export function reactToDomainEvent(c: CaseDefinition, event: DomainEvent, locale: string): EventReaction[] {
  const L = locale;
  switch (event.type) {
    case "result.ready": {
      if (!event.critical) return [];
      const name = investigationName(c, event.investigationId, L);
      return [
        { notification: { level: "critical", title: rt(L, "notify.criticalResult.title"), body: rt(L, "notify.criticalResult.body", { name, phase: phaseLabel(c, event.phase, L) }) } },
        { staffLine: { agent: "nurse", speaker: "nurse", text: rt(L, "nurse.criticalResult", { name }) } },
      ];
    }
    case "vitals.alarm": {
      const vital = vitalLabel(event.vital, L);
      const value = vitalWithUnit(event.vital, event.value);
      const level = rt(L, event.level === "critical" ? "level.critical" : "level.warning");
      return [
        { notification: { level: event.level, title: rt(L, "notify.alarm.title"), body: rt(L, "notify.alarm.body", { vital, value, level }) } },
        { staffLine: { agent: "nurse", speaker: "nurse", text: rt(L, "nurse.alarm", { vital, value }) } },
      ];
    }
    case "scenario.event": {
      const def = c.physiology?.events.find((e) => e.id === event.eventId);
      if (!def?.message) return [];
      const text = t(def.message, L);
      return [
        { notification: { level: event.severity, title: rt(L, "notify.scenario.title"), body: text } },
        { staffLine: { agent: "nurse", speaker: "monitor", text } },
      ];
    }
    case "objective.completed":
      return [{ notification: { level: "info", title: rt(L, "notify.objective.title"), body: objectiveTitle(c, event.objectiveId, L) } }];
    case "case.completed":
      return [{ notification: { level: "info", title: rt(L, "notify.caseCompleted.title"), body: rt(L, "notify.caseCompleted.body") } }];
    case "case.finished":
      return [{ notification: { level: event.timedOut ? "warning" : "info", title: rt(L, "notify.finished.title"), body: rt(L, event.timedOut ? "notify.timedOut.body" : "notify.finished.body") } }];
    case "session.started":
    case "history.asked":
    case "exam.performed":
    case "order.placed":
    case "order.duplicate":
    case "result.read":
    case "phase.changed":
    case "decision.answered":
    case "intervention.applied":
    case "hint.used":
    case "time.advanced":
    case "flag.changed":
    case "note.added":
    case "action.rejected":
      return [];
    default: {
      const never: never = event;
      return never;
    }
  }
}
