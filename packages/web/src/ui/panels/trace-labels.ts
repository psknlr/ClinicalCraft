/**
 * Labels of the live trace (docs/EMBODIED.md §10) in the learner's language.
 * Span names are runtime identifiers — an operation (`navigate`, `attach`,
 * `record`), an observation (`inspect`), a clinical tool (`intervene`),
 * event types (`entity.state,actor.moved`), a step (`order_test ecg-12lead`,
 * `delegate:attach_monitor`, `skill:perform_ecg`), a verification (an action
 * type, `monitor attached`, `ordered <item>`) — named by the agent session
 * (`packages/agent/src/session/trace.ts` and the world's recorder). They are
 * localised here, at render time, from the web i18n table (`trace.name.*`,
 * `trace.code.*`); case items by their names, skills by their own, staff by
 * name. An unknown name is shown as it is.
 */
import { BUILTIN_SKILLS } from "@clinicalcraft/agent";
import type { CaseDefinition } from "@clinicalcraft/core";
import { operationName, OPERATION_NAMES, type TraceSpan } from "@clinicalcraft/world";
import { trTask } from "../../app/embodied-link.js";
import { ct, getLocale, joinList, tr, trMaybe } from "../../i18n/index.js";

export interface TraceLabelContext {
  caseDef: CaseDefinition | null;
  /** Display name of a world entity or actor (`staff:ed-nurse` → "Lin Xiao"), null when unknown. */
  name?: (id: string) => string | null;
}

/** One identifier (operation, tool, event type, action type), localised; unknown ones as they are. */
export function nameLabel(name: string): string {
  const own = trMaybe(`trace.name.${name}`, "");
  if (own) return own;
  return OPERATION_NAMES[name] ? operationName(name, getLocale()) : name;
}

/** A case item by its name (investigation, intervention, exam manoeuvre, history question, decision), else its id. */
export function itemLabel(c: CaseDefinition | null, id: string): string {
  if (!c) return id;
  const inv = c.investigations.find((x) => x.id === id);
  if (inv) return ct(inv.name);
  const iv = c.interventions.find((x) => x.id === id);
  if (iv) return ct(iv.name);
  const f = c.exam.find((x) => x.id === id);
  if (f) return ct(f.maneuver);
  const q = c.history.find((x) => x.id === id);
  if (q) return ct(q.question);
  const d = c.decisions.find((x) => x.id === id);
  if (d) return ct(d.prompt);
  return id;
}

function skillLabel(id: string): string {
  const skill = BUILTIN_SKILLS.find((s) => s.id === id);
  return skill?.name ? ct(skill.name) : id;
}

/** "tool item" (an autopilot step): the tool's label · the item's name. */
function stepLabel(name: string, ctx: TraceLabelContext): string {
  const delegate = /^delegate:(.+)$/.exec(name);
  if (delegate) return tr("trace.plan.delegate", { task: trTask(delegate[1]!) });
  const skill = /^skill:(.+)$/.exec(name);
  if (skill) return tr("trace.plan.skill", { name: skillLabel(skill[1]!) });
  const space = name.indexOf(" ");
  if (space < 0) return nameLabel(name);
  return tr("trace.plan.item", { action: nameLabel(name.slice(0, space)), item: itemLabel(ctx.caseDef, name.slice(space + 1).trim()) });
}

/** A verification: an action type, a skill, or a delegation's check (`monitor attached`, `ordered <id>`, …). */
function verificationLabel(name: string, ctx: TraceLabelContext): string {
  if (name === "monitor attached") return tr("trace.verify.monitorAttached");
  const m = /^(ordered|intervened|at bedside) (.+)$/.exec(name);
  if (m) {
    const key = m[1] === "ordered" ? "trace.verify.ordered" : m[1] === "intervened" ? "trace.verify.intervened" : "trace.verify.atBedside";
    const id = m[2]!.trim();
    const item = m[1] === "at bedside" ? (ctx.name?.(id) ?? id) : itemLabel(ctx.caseDef, id);
    return tr(key, { item });
  }
  if (name.startsWith("skill:")) return tr("trace.plan.skill", { name: skillLabel(name.slice("skill:".length)) });
  return nameLabel(name);
}

/** The label of a span name of a kind (see the module docs). */
export function traceLabel(kind: TraceSpan["kind"], name: string, ctx: TraceLabelContext): string {
  switch (kind) {
    case "plan":
      return stepLabel(name, ctx);
    case "verification":
      return verificationLabel(name, ctx);
    case "state_change":
      return joinList(
        name
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
          .map(nameLabel),
      );
    default:
      return nameLabel(name);
  }
}

/** Who did a step: the clinician (the learner's body or the clinician agent), staff by name. */
export function traceActorLabel(actorId: string, ctx: TraceLabelContext): string {
  if (actorId === "actor:clinician") return tr("trace.actor.clinician");
  return ctx.name?.(actorId) ?? actorId.replace(/^(actor|staff):/, "");
}

/** A world / spatial error code in words (the code itself stays available as a tooltip). */
export function traceCodeLabel(code: string): string {
  return trMaybe(`trace.code.${code}`, code);
}
