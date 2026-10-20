/**
 * Colleagues by name (no DOM). A conversation opened for a session agent
 * (`@nurse`, the last interlocutor) is with a real staff member of the
 * facility: in embodied mode the one the world would send to this patient
 * (the agent's own `pickStaff` — of that role, nearest the patient — the
 * same nurse a delegation sends), in clinical mode the facility's staff of
 * that role nearest the patient's bed. The learner's `/delegate` line reads
 * as a sentence.
 */
import { pickStaff } from "@clinicalcraft/agent";
import { t, type FacilityDefinition } from "@clinicalcraft/core";
import type { WorldRuntime } from "@clinicalcraft/world";
import { getLocale, tr, trMaybe } from "../i18n/index.js";
import { nameLabel } from "../ui/panels/trace-labels.js";
import { trTask } from "./embodied-link.js";
import { learnerText, refusalLead } from "./spatial.js";

/** Facility staff roles a session agent stands for (`@pathologist` is answered by the lab too). */
export const AGENT_STAFF_ROLES: Readonly<Record<string, readonly string[]>> = {
  nurse: ["nurse"],
  radiologist: ["radiologist"],
  pathologist: ["pathologist", "lab-tech"],
  attending: ["attending"],
};

export interface StaffRef {
  /** Facility staff id (`ed-nurse`; the world actor is `staff:<id>`). */
  staffId: string;
  role: string;
  name: string;
}

export interface StaffContext {
  facility: Pick<FacilityDefinition, "staff" | "patientSlots">;
  slotId: string | null;
  /** The encounter's world model (embodied), else null. */
  world: WorldRuntime | null;
}

/** A staff member by facility id, named as the world (or the facility) names them; null when unknown. */
export function staffById(staffId: string, ctx: StaffContext): StaffRef | null {
  const st = (ctx.facility.staff ?? []).find((s) => s.id === staffId);
  const actor = ctx.world?.actor(`staff:${staffId}`) ?? null;
  const entity = ctx.world?.entity(`staff:${staffId}`) ?? null;
  if (!st && !actor) return null;
  const name = entity ? t(entity.name, getLocale()) : st ? t(st.name, getLocale()) : staffId;
  return { staffId, role: actor?.role ?? st?.role ?? "", name };
}

/** The staff member a session agent stands for (see the module docs), or null when none is on duty. */
export function staffForAgent(agent: string, ctx: StaffContext): StaffRef | null {
  const roles = AGENT_STAFF_ROLES[agent];
  if (!roles) return null;
  const world = ctx.world;
  if (world) {
    const patient = ctx.slotId && world.entity(`patient:${ctx.slotId}`) ? `patient:${ctx.slotId}` : null;
    for (const role of roles) {
      const actor = pickStaff(world, role, patient);
      if (actor) return staffById(actor.slice("staff:".length), ctx);
    }
    return null;
  }
  const slot = ctx.facility.patientSlots.find((s) => s.id === ctx.slotId);
  for (const role of roles) {
    const list = (ctx.facility.staff ?? []).filter((s) => s.role === role);
    if (!list.length) continue;
    const dist = (s: (typeof list)[number]) => (slot ? Math.hypot(s.x - slot.x, s.z - slot.z) : 0);
    const best = [...list].sort((a, b) => dist(a) - dist(b) || (a.id < b.id ? -1 : 1))[0]!;
    return { staffId: best.id, role: best.role, name: t(best.name, getLocale()) };
  }
  return null;
}

/**
 * The learner's `/delegate <staff:id | role> <task>` line as a sentence ("Lin Xiao, please: Attach the
 * monitor" / "林晓，请：连接监护仪"); null for any other line.
 */
export function delegateLine(text: string, nameOf: (staffId: string) => string | null): string | null {
  const m = /^[/／]delegate\s+(\S+)\s+(\S+)/.exec(text.trim());
  if (!m) return null;
  const who = m[1]!;
  const name = who.startsWith("staff:") ? (nameOf(who.slice("staff:".length)) ?? who.slice("staff:".length)) : trMaybe(`role.${who}`, who);
  return tr("conv.delegated", { name, task: trTask(m[2]!) });
}

interface DelegationData {
  staffId: string | null;
  role: string;
  task: string;
  status: string;
  steps: { operation: string; target?: string; status: string; message?: string }[];
  elapsedSeconds?: number;
}

function delegationData(data: unknown): DelegationData | null {
  const pick = (v: unknown): DelegationData | null => {
    const d = v && typeof v === "object" ? (v as { delegation?: unknown }).delegation : undefined;
    if (!d || typeof d !== "object") return null;
    const r = d as Record<string, unknown>;
    if (typeof r.task !== "string" || typeof r.status !== "string" || !Array.isArray(r.steps)) return null;
    const steps = r.steps.filter((x): x is DelegationData["steps"][number] => !!x && typeof x === "object" && typeof (x as { operation?: unknown }).operation === "string" && typeof (x as { status?: unknown }).status === "string");
    return { staffId: typeof r.staffId === "string" ? r.staffId : null, role: typeof r.role === "string" ? r.role : "", task: r.task, status: r.status, steps, elapsedSeconds: typeof r.elapsedSeconds === "number" ? r.elapsedSeconds : 0 };
  };
  return pick(data) ?? pick(data && typeof data === "object" ? (data as { data?: unknown }).data : undefined);
}

/**
 * A delegation's outcome (`/delegate` output data, `{ delegation }`) as the learner reads it: who did which
 * task and how it went, then each step — its operation and target by name, why it failed in words. The
 * session's own text names operations and entities by id (it is also a model's tool output). Null when the
 * data is no delegation.
 */
export function delegationSummary(data: unknown, nameOf: (id: string) => string | null): { head: string; steps: string[] } | null {
  const d = delegationData(data);
  if (!d) return null;
  const who = d.staffId ? (nameOf(d.staffId) ?? d.staffId.replace(/^staff:/, "")) : trMaybe(`role.${d.role}`, d.role);
  const status = (st: string) => trMaybe(`conv.delegateStatus.${st}`, st);
  const n = d.steps.length;
  const head = tr("conv.delegateResult", { name: who, task: trTask(d.task), status: status(d.status), steps: tr(n === 1 ? "conv.delegateStep1" : "conv.delegateSteps", { n }), seconds: Math.round(d.elapsedSeconds ?? 0) });
  const steps = d.steps.map((s, i) =>
    tr("conv.delegateStepLine", {
      n: i + 1,
      op: nameLabel(s.operation),
      target: s.target ? ` · ${nameOf(s.target) ?? s.target.replace(/^[a-z]+:/, "")}` : "",
      status: status(s.status),
      why: s.status === "completed" || !s.message ? "" : ` — ${learnerText(refusalLead(s.message))}`,
    }),
  );
  return { head, steps };
}
