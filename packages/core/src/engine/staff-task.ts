/**
 * Standing tasks of the staff (schema `schema/staff-task.ts`; docs/TEAM.md §5.1): pure — which tasks are due, and one
 * step of a task's record (taken up, blocked with its reason, done). A task is taken up only once its `when` holds; a
 * repeated step changes nothing.
 */
import type { CaseDefinition } from "../schema/case.js";
import type { EquipmentCatalog, FacilityDefinition } from "../schema/facility.js";
import type { SessionState } from "../schema/session.js";
import type { StaffTask, StaffTaskOp, StaffTaskRecord, StaffTaskStatus } from "../schema/staff-task.js";
import { evaluate } from "./conditions.js";
import type { Issue } from "./types.js";

/** The case's standing task of `id`, or undefined. */
export function staffTaskDef(c: CaseDefinition, id: string): StaffTask | undefined {
  return (c.staffTasks ?? []).find((t) => t.id === id);
}

/** What became of a task so far (undefined: not taken up). */
export function staffTaskRecord(s: SessionState, id: string): StaffTaskRecord | undefined {
  return (s.staffTasks ?? []).find((r) => r.task === id);
}

/** The tasks that are due and not done: taken up already, or their `when` holds now. In the case's order. */
export function dueStaffTasks(c: CaseDefinition, s: SessionState): StaffTask[] {
  return (c.staffTasks ?? []).filter((t) => {
    const r = staffTaskRecord(s, t.id);
    return r ? r.status !== "done" : !t.when || evaluate(c, s, t.when);
  });
}

export type StaffTaskResult = { ok: true; tasks: StaffTaskRecord[]; changed: boolean } | { ok: false; code: "unknown-id" | "invalid" | "requirements-unmet"; message: string };

/** Apply one step of a standing task (pure). */
export function applyStaffTask(c: CaseDefinition, s: SessionState, op: StaffTaskOp): StaffTaskResult {
  const def = staffTaskDef(c, op.task);
  if (!def) return { ok: false, code: "unknown-id", message: `no staff task "${op.task}" in this case` };
  const tasks = structuredClone(s.staffTasks ?? []);
  const at = s.clock;
  const seq = s.seq + 1;
  let r = tasks.find((x) => x.task === def.id);
  if (!r) {
    if (def.when && !evaluate(c, s, def.when)) return { ok: false, code: "requirements-unmet", message: `"${def.id}" is not due yet` };
    if (op.op === "blocked") return { ok: false, code: "requirements-unmet", message: `"${def.id}" has not been taken up` };
    r = { task: def.id, by: op.by, status: "started", history: [{ status: "started", at, seq }] };
    tasks.push(r);
    if (op.op === "start") return { ok: true, tasks, changed: true };
  }
  if (r.status === "done") return op.op === "done" ? { ok: true, tasks, changed: false } : { ok: false, code: "invalid", message: `"${def.id}" is done` };
  const to = (status: StaffTaskStatus, reason?: string) => {
    r!.status = status;
    r!.by = op.by;
    if (reason) r!.reason = reason;
    else delete r!.reason;
    r!.history.push({ status, at, seq, ...(reason ? { reason } : {}) });
  };
  switch (op.op) {
    case "start":
      // taken up again after a block; already under way: nothing new
      if (r.status === "started") return { ok: true, tasks, changed: false };
      to("started");
      return { ok: true, tasks, changed: true };
    case "blocked":
      if (r.status === "blocked" && r.reason === op.reason) return { ok: true, tasks, changed: false };
      to("blocked", op.reason);
      return { ok: true, tasks, changed: true };
    case "done":
      to("done");
      return { ok: true, tasks, changed: true };
  }
}

/** `{ staffTask: id, status? }`: the task's status now is that one (default: done). */
export function evaluateStaffTask(s: SessionState, id: string, status: StaffTaskStatus = "done"): boolean {
  return staffTaskRecord(s, id)?.status === status;
}

/**
 * The standing tasks in a facility (`cases validate` with the case's facility): each names a member of its staff (an id
 * or a role); a `fetch` step needs a cart (portable) that provides the capability; an `operate` step needs a device
 * providing the capability that offers the operation — one with no clinical effect that does not reserve the device
 * (what the session refuses a colleague's task).
 */
export function staffTaskFacilityIssues(c: CaseDefinition, f: FacilityDefinition, catalogs: readonly EquipmentCatalog[]): Issue[] {
  const issues: Issue[] = [];
  const types = new Map(catalogs.flatMap((cat) => cat.equipment.map((e) => [e.id, e] as const)));
  const placed = f.placements.map((p) => ({ p, type: types.get(p.type) })).filter((x) => !!x.type);
  const caps = (x: (typeof placed)[number]) => [...(x.type!.capabilities ?? []), ...(x.p.capabilities ?? [])];
  const at = (i: number, ...rest: (string | number)[]) => ["staffTasks", i, ...rest].join(".");
  (c.staffTasks ?? []).forEach((task, i) => {
    if (!f.staff.some((s) => s.id === task.staff || s.role === task.staff)) issues.push({ path: at(i, "staff"), message: `facility "${f.id}" has no staff "${task.staff}" (an id or a role)`, severity: "error" });
    task.steps.forEach((step, j) => {
      if ("fetch" in step) {
        if (!placed.some((x) => x.type!.portable === "cart" && caps(x).includes(step.fetch))) issues.push({ path: at(i, "steps", j, "fetch"), message: `facility "${f.id}" has no cart that provides "${step.fetch}" to bring to the patient`, severity: "error" });
        return;
      }
      const providers = placed.filter((x) => caps(x).includes(step.operate));
      if (!providers.length) {
        issues.push({ path: at(i, "steps", j, "operate"), message: `facility "${f.id}" has no device that provides "${step.operate}"`, severity: "error" });
        return;
      }
      const ops = providers.flatMap((x) => (x.type!.behavior ? Object.entries(x.type!.behavior.operations).filter(([id]) => id === step.operation).map(([, op]) => op) : []));
      if (!ops.length) issues.push({ path: at(i, "steps", j, "operation"), message: `no device that provides "${step.operate}" offers the operation "${step.operation}"`, severity: "error" });
      else if (ops.every((op) => op.clinical || op.reserve)) issues.push({ path: at(i, "steps", j, "operation"), message: `"${step.operation}" ${ops[0]!.clinical ? "has a clinical effect (the clinician's act)" : "reserves the device"}: a colleague's standing task cannot do it`, severity: "error" });
    });
  });
  return issues;
}
