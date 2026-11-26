/**
 * Standing tasks of the staff (docs/TEAM.md §5.1): a task falls due when its condition holds, is taken up, blocked
 * with a reason and done — each step once — and conditions, validation and a reference solution can use it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import { checkCaseIntegrity, dueStaffTasks, evaluate, parseCase, reduce, replay, staffTaskRecord, verifyCase } from "./index.js";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const L = (en: string, zh: string) => ({ en, "zh-CN": zh });

function caseJson(edit?: (json: Json) => void): Json {
  const json: Json = JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8"));
  json.staffTasks = [
    { id: "ready-room", name: L("Prepare the treatment room", "准备治疗室"), staff: "nurse", steps: [{ fetch: "oxygen" }], say: L("The room is ready.", "治疗室准备好了。") },
    { id: "bring-cart", name: L("Bring the cart", "把治疗车推来"), staff: "assistant", when: { asked: "allergies" }, steps: [{ fetch: "crash-cart" }, { operate: "suction", operation: "switch_on" }] },
  ];
  edit?.(json);
  return json;
}

function load(json: unknown): CaseDefinition {
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

const CASE = load(caseJson());
const task = (op: "start" | "blocked" | "done", id: string, extra: Record<string, unknown> = {}): ClinicalAction => ({ type: "staff-task", task: { op, task: id, by: "nurse-1", ...extra } as never, by: "system" });
const started = (c: CaseDefinition = CASE): SessionState => reduce(c, replay(c, []).state, { type: "start" }).state;
const statusOf = (s: SessionState, id: string) => staffTaskRecord(s, id)?.status;

describe("a standing task falls due", () => {
  it("at the start when it has no condition, else once its condition holds", () => {
    let s = started();
    expect(dueStaffTasks(CASE, s).map((t) => t.id)).toEqual(["ready-room"]);
    s = reduce(CASE, s, { type: "ask", itemId: "allergies" }).state;
    expect(dueStaffTasks(CASE, s).map((t) => t.id)).toEqual(["ready-room", "bring-cart"]);
  });

  it("a task not yet due cannot be taken up or done", () => {
    const s = started();
    for (const op of ["start", "done"] as const) expect(reduce(CASE, s, task(op, "bring-cart")).rejected?.code).toBe("requirements-unmet");
    expect(reduce(CASE, s, task("start", "nope")).rejected?.code).toBe("unknown-id");
  });

  it("a task that was taken up stays due until it is done, whatever becomes of its condition", () => {
    const c = load(caseJson((j) => (j.staffTasks[1].when = { not: { asked: "meds" } })));
    let s = reduce(c, started(c), task("start", "bring-cart")).state;
    s = reduce(c, s, { type: "ask", itemId: "meds" }).state;
    expect(dueStaffTasks(c, s).map((t) => t.id)).toContain("bring-cart");
    s = reduce(c, s, task("done", "bring-cart")).state;
    expect(dueStaffTasks(c, s).map((t) => t.id)).not.toContain("bring-cart");
  });
});

describe("the record of a standing task", () => {
  it("taken up, blocked with its reason, taken up again, done — each step once", () => {
    let s = started();
    const step = (a: ClinicalAction) => {
      const r = reduce(CASE, s, a);
      expect(r.rejected).toBeUndefined();
      const changed = r.state !== s;
      s = r.state;
      return { changed, events: r.events };
    };
    expect(step(task("start", "ready-room")).changed).toBe(true);
    expect(step(task("start", "ready-room")).changed).toBe(false);
    expect(statusOf(s, "ready-room")).toBe("started");
    const blocked = step(task("blocked", "ready-room", { reason: "the door is locked" }));
    expect(blocked.events).toContainEqual({ type: "staff-task.recorded", op: "blocked", task: "ready-room", by: "nurse-1", reason: "the door is locked" });
    expect(step(task("blocked", "ready-room", { reason: "the door is locked" })).changed).toBe(false);
    expect(step(task("blocked", "ready-room", { reason: "no cart" })).changed).toBe(true);
    expect(staffTaskRecord(s, "ready-room")).toMatchObject({ status: "blocked", reason: "no cart" });
    expect(step(task("start", "ready-room")).changed).toBe(true);
    expect(staffTaskRecord(s, "ready-room")!.reason).toBeUndefined();
    expect(step(task("done", "ready-room")).changed).toBe(true);
    expect(step(task("done", "ready-room")).changed).toBe(false);
    expect(staffTaskRecord(s, "ready-room")!.history.map((h) => h.status)).toEqual(["started", "blocked", "blocked", "started", "done"]);
  });

  it("a done task is not blocked or taken up again; a block needs the task taken up", () => {
    let s = started();
    expect(reduce(CASE, s, task("blocked", "ready-room", { reason: "x" })).rejected?.code).toBe("requirements-unmet");
    s = reduce(CASE, s, task("done", "ready-room")).state;
    expect(statusOf(s, "ready-room")).toBe("done");
    expect(reduce(CASE, s, task("start", "ready-room")).rejected?.code).toBe("invalid");
    expect(reduce(CASE, s, task("blocked", "ready-room", { reason: "x" })).rejected?.code).toBe("invalid");
  });
});

describe("conditions, validation and the reference solution", () => {
  it("`staffTask` holds when the task is done — or in the status it names", () => {
    let s = started();
    expect(evaluate(CASE, s, { staffTask: "ready-room" })).toBe(false);
    s = reduce(CASE, s, task("start", "ready-room")).state;
    expect(evaluate(CASE, s, { staffTask: "ready-room" })).toBe(false);
    expect(evaluate(CASE, s, { staffTask: "ready-room", status: "started" })).toBe(true);
    s = reduce(CASE, s, task("done", "ready-room")).state;
    expect(evaluate(CASE, s, { staffTask: "ready-room" })).toBe(true);
    expect(evaluate(CASE, s, { staffTask: "ready-room", status: "started" })).toBe(false);
  });

  it("an unknown task in a condition or a solution step, a duplicate and a task that waits for itself are errors", () => {
    const bad = load(
      caseJson((j) => {
        j.staffTasks.push({ id: "ready-room", name: L("Again", "再来"), staff: "nurse", say: L("x", "x") });
        j.staffTasks.push({ id: "loop", name: L("Loop", "循环"), staff: "nurse", when: { staffTask: "loop" }, say: L("x", "x") });
        j.staffTasks.push({ id: "empty", name: L("Nothing", "无"), staff: "nurse" });
        j.objectives[0].completeWhen = { all: [j.objectives[0].completeWhen, { staffTask: "missing" }] };
        j.solution.splice(1, 0, { type: "staff-task", task: { op: "done", task: "ghost", by: "nurse" } });
      }),
    );
    const messages = checkCaseIntegrity(bad).map((i) => `${i.severity}: ${i.message}`);
    expect(messages).toContain('error: duplicate staff task id "ready-room"');
    expect(messages).toContain('error: staff task "loop" waits for itself');
    expect(messages).toContain('error: unknown staff task "missing"');
    expect(messages).toContain('error: unknown staff task "ghost"');
    expect(messages.some((m) => m.startsWith("warning:") && m.includes('"empty" has no step and nothing to say'))).toBe(true);
    expect(checkCaseIntegrity(CASE).filter((i) => i.path.startsWith("staffTasks"))).toEqual([]);
  });

  it("a reference solution that depends on a colleague's task lists it, and verifies", () => {
    const json = caseJson((j) => {
      const last = j.objectives.at(-1);
      last.completeWhen = { all: [last.completeWhen, { staffTask: "bring-cart" }] };
    });
    // without the colleague's step the last objective is never met
    const done = (c: CaseDefinition) => Object.keys(verifyCase(c).finalState.objectivesDone).length;
    expect(verifyCase(load(json)).ok).toBe(false);
    expect(done(load(json))).toBeLessThan(json.objectives.length);
    const finish = json.solution.findIndex((a: Json) => a.type === "finish");
    json.solution.splice(finish < 0 ? json.solution.length : finish, 0, { type: "ask", itemId: "allergies" }, { type: "staff-task", task: { op: "done", task: "bring-cart", by: "assistant" } });
    const c = load(json);
    expect(checkCaseIntegrity(c).filter((i) => i.severity === "error")).toEqual([]);
    const v = verifyCase(c);
    expect(v.issues.filter((i) => i.severity === "error")).toEqual([]);
    expect(v.ok).toBe(true);
    expect(done(c)).toBe(c.objectives.length);
  });
});
