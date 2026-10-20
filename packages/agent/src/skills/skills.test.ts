/**
 * Skills (docs/EMBODIED.md R9, §9): the `clinicalcraft/skill@1` schema
 * (data, never code; template references checked), the built-in library,
 * the interpreter's mechanics (when, retry, recovery, final refusals,
 * postconditions against authoritative state) and built-in skills running
 * on a headless STEMI encounter through the learner's tool path.
 */
import { describe, expect, it } from "vitest";
import { createSession as createEngineState, monitorAttached } from "@clinicalcraft/core";
import type { WorldRuntime } from "@clinicalcraft/world";
import { answerAll, builtinContent, command, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { catalogsFor } from "../node/bootstrap.js";
import { loadMiniCase } from "../__fixtures__/mini-case.js";
import { BUILTIN_SKILL_IDS, BUILTIN_SKILLS } from "./builtin.js";
import { runSkill, skillResultText, substitute, type SkillRunner, type SkillToolCall } from "./interpreter.js";
import { parseSkill, SKILL_SCHEMA_ID, type SkillDefinition } from "./schema.js";

const skill = (over: Record<string, unknown> = {}) => ({
  schema: SKILL_SCHEMA_ID,
  id: "test-skill",
  name: { en: "Test", "zh-CN": "测试" },
  description: "A test skill",
  safety: "physical",
  steps: [{ id: "look", tool: "observe_world" }],
  ...over,
});

describe("skill schema (clinicalcraft/skill@1)", () => {
  it("ships the eleven built-in skills, all valid and bilingual", () => {
    expect([...BUILTIN_SKILL_IDS].sort()).toEqual(
      ["administer_treatment", "approach_patient", "attach_monitor", "fetch_equipment", "locate_patient", "obtain_result", "perform_bedside_exam", "perform_ecg", "reassess_patient", "review_imaging", "wash_hands"].sort(),
    );
    for (const s of BUILTIN_SKILLS) {
      expect(parseSkill(s).ok, s.id).toBe(true);
      for (const text of [s.name, s.description]) expect(Object.keys(text as Record<string, string>).sort(), s.id).toEqual(["en", "zh-CN"]);
    }
  });

  it("accepts templated steps and conditions that refer to declared parameters and earlier steps", () => {
    const ok = parseSkill(
      skill({
        params: { investigation: { type: "investigation" }, patient: { type: "entity", default: "$patient" }, cart: { type: "entity", default: "$capability:ecg-12lead" } },
        preconditions: [{ not: { clinical: { ordered: "${investigation}" } } }],
        steps: [
          { id: "find", tool: "find_objects", args: { capabilities: ["ecg-12lead"], limit: 1 } },
          { id: "go", tool: "approach_object", args: { target: "${steps.find.data.entities.0.id}" }, when: { not: { actorNear: "${patient}", range: 1.5 } }, retry: { attempts: 2, on: ["NOT_IN_RANGE"] } },
          { id: "order", tool: "order_test", args: { investigation_id: "${investigation}" }, onError: "continue" },
        ],
        postconditions: [{ clinical: { ordered: "${investigation}" } }, { entityState: "${steps.find.data.entities.0.id}", state: ["idle", "completed"] }],
        recovery: [{ on: ["SPATIAL_REQUIREMENT_UNMET"], strategy: "replan" }],
      }),
    );
    expect(ok.ok).toBe(true);
  });

  it("rejects what is not a valid skill: wrong schema, unknown references, later steps, duplicate ids, macros, code", () => {
    const issues = (value: unknown) => {
      const r = parseSkill(value);
      return r.ok ? [] : r.issues;
    };
    expect(issues(skill({ schema: "clinicalcraft/skill@2" })).join()).toMatch(/schema/);
    expect(issues(skill({ steps: [{ id: "a", tool: "examine", args: { finding_id: "${finding}" } }] })).join()).toMatch(/not a declared parameter/);
    expect(
      issues(
        skill({
          steps: [
            { id: "a", tool: "navigate_to", args: { target: "${steps.b.data.id}" } },
            { id: "b", tool: "find_objects" },
          ],
        }),
      ).join(),
    ).toMatch(/does not run before this point/);
    expect(issues(skill({ steps: [{ id: "a", tool: "observe_world" }, { id: "a", tool: "observe_world" }] })).join()).toMatch(/duplicate step id/);
    expect(issues(skill({ params: { x: { type: "entity", default: "$nurse" } } })).join()).toMatch(/unknown resolver macro/);
    // Data, never code: no script fields, no expressions as tool names, structured conditions only.
    expect(issues(skill({ script: "process.exit(1)" })).length).toBeGreaterThan(0);
    expect(issues(skill({ steps: [{ id: "a", tool: "eval(process.exit())" }] })).length).toBeGreaterThan(0);
    expect(issues(skill({ preconditions: [{ clinical: { javascript: "1 + 1" } }] })).length).toBeGreaterThan(0);
    expect(issues(skill({ safety: "dangerous" })).length).toBeGreaterThan(0);
  });
});

describe("substitute", () => {
  it("keeps the value of an exact placeholder, interpolates otherwise and drops unresolved members", () => {
    const scope = { params: { n: 3, id: "eq:cart" }, steps: { find: { ok: true, data: { entities: [{ id: "eq:ecg", distance: 2 }] }, output: "Found 1" } } };
    expect(substitute({ target: "${steps.find.data.entities.0.id}", count: "${n}", text: "go to ${id} (${n})", missing: "${steps.find.data.nothing}" }, scope)).toEqual({ target: "eq:ecg", count: 3, text: "go to eq:cart (3)" });
    expect(substitute("${steps.find.ok}", scope)).toBe(true);
  });
});

describe("interpreter mechanics (a scripted tool path)", () => {
  const mini = loadMiniCase();
  const world = { version: 0, actor: () => null, inspect: () => null, entity: () => null, find: () => [] } as unknown as WorldRuntime;
  const runner = (calls: ((tool: string, args: Record<string, unknown>) => SkillToolCall)[], log: string[] = []): SkillRunner => ({
    caseDef: mini,
    locale: "en",
    actorId: "actor:clinician",
    state: () => createEngineState(mini),
    world: () => world,
    patientId: () => "patient:bay-1",
    patientMonitorId: () => null,
    resolveEntity: (alias) => alias,
    atBedside: () => false,
    callTool: async (tool, args) => {
      log.push(`${tool} ${JSON.stringify(args)}`);
      const next = calls.shift();
      return next ? next(tool, args) : { ok: true, output: { ok: true, output: "ok" }, status: "ok" };
    },
  });
  const fail = (code: string, status = "error", extra: Record<string, unknown> = {}): SkillToolCall => ({ ok: false, output: { ok: false, output: `failed ${code}`, data: { code, ...extra } }, status });
  const def = (over: Record<string, unknown>): SkillDefinition => {
    const r = parseSkill(skill(over));
    if (!r.ok) throw new Error(r.issues.join("; "));
    return r.skill;
  };

  it("retries a step on the listed codes, then gives up (abort by default)", async () => {
    const log: string[] = [];
    const s = def({ steps: [{ id: "use", tool: "interact_object", args: { target: "eq:x", operation: "use" }, retry: { attempts: 2, on: ["BUSY"] } }] });
    const res = await runSkill(s, {}, runner([() => fail("BUSY"), () => fail("BUSY"), () => fail("BUSY")], log));
    expect(res.status).toBe("aborted");
    expect(res.steps[0]).toMatchObject({ status: "failed", code: "BUSY", attempts: 3 });
    expect(log).toHaveLength(3);
  });

  it("never retries or recovers a refusal of the approval gate or a hook (denied / blocked)", async () => {
    const log: string[] = [];
    const s = def({
      steps: [{ id: "give", tool: "intervene", args: { intervention_id: "lysis" }, retry: { attempts: 3, on: ["DENIED", "FAILED"] } }],
      recovery: [{ on: ["*"], strategy: "replan" }],
    });
    const res = await runSkill(s, {}, runner([() => fail("DENIED", "denied", { hint: { goal: { kind: "interact", id: "patient:bay-1" }, label: "go" } })], log));
    expect(res.status).toBe("aborted");
    expect(log).toHaveLength(1);
  });

  it("recovers by replanning: walks to the refusal's hint goal and retries the same call", async () => {
    const log: string[] = [];
    const goal = { kind: "interact", id: "patient:bay-1" };
    const s = def({ steps: [{ id: "exam", tool: "examine", args: { finding_id: "heart" } }], recovery: [{ on: ["SPATIAL_REQUIREMENT_UNMET"], strategy: "replan" }] });
    const res = await runSkill(s, {}, runner([() => fail("SPATIAL_REQUIREMENT_UNMET", "error", { hint: { goal, label: "Go" } })], log));
    expect(res.status).toBe("succeeded");
    expect(res.steps[0]!.recovery).toEqual(["replan@SPATIAL_REQUIREMENT_UNMET"]);
    expect(log).toEqual([`examine {"finding_id":"heart"}`, `navigate_to {"goal":${JSON.stringify(goal)}}`, `examine {"finding_id":"heart"}`]);
  });

  it("skips a step whose `when` does not hold, continues after onError: continue, and fails on an unmet postcondition", async () => {
    const s = def({
      params: { finding: { type: "finding" } },
      steps: [
        { id: "skip", tool: "examine", args: { finding_id: "${finding}" }, when: { clinical: { examined: "${finding}" } } },
        { id: "soft", tool: "consult", args: { role: "attending" }, onError: "continue" },
        { id: "exam", tool: "examine", args: { finding_id: "${finding}" } },
      ],
      postconditions: [{ clinical: { examined: "${finding}" } }],
    });
    const res = await runSkill(s, { finding: "heart" }, runner([() => fail("FAILED")]));
    expect(res.steps.map((x) => [x.id, x.status])).toEqual([
      ["skip", "skipped"],
      ["soft", "failed"],
      ["exam", "ok"],
    ]);
    // The scripted path committed nothing: the engine says "not examined".
    expect(res.status).toBe("failed");
    expect(res.postconditions).toEqual([{ predicate: { clinical: { examined: "heart" } }, ok: false }]);
    expect(skillResultText(res, "zh-CN")).toMatch(/[一-鿿]/);
  });

  it("refuses bad parameters and failed preconditions before running anything", async () => {
    const log: string[] = [];
    const s = def({ params: { test: { type: "investigation" } }, preconditions: [{ clinical: { ordered: "${test}" } }], steps: [{ id: "read", tool: "read_result", args: { investigation_id: "${test}" } }] });
    expect((await runSkill(s, { test: "no-such-test" }, runner([], log))).status).toBe("failed");
    expect((await runSkill(s, {}, runner([], log))).message).toMatch(/test/);
    // A query resolves as the clinical tools resolve it ("trop" → troponin), then the precondition fails.
    const res = await runSkill(s, { test: "trop" }, runner([], log));
    expect(res).toMatchObject({ status: "precondition_failed", params: { test: "troponin" } });
    expect(log).toEqual([]);
  });
});

describe("built-in skills on a headless STEMI encounter", () => {
  it("perform_ecg and attach_monitor succeed through the learner's tool path and verify against the engine and the world", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "bypass" } });
    answerAll(t);
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const ecg = await command(t, "skill", "perform_ecg");
    expect(ecg.ok).toBe(true);
    expect((ecg.data as { skill: { status: string; postconditions: { ok: boolean }[] } }).skill).toMatchObject({ status: "succeeded" });
    expect(t.session.state.orders.map((o) => o.investigationId)).toContain("ecg-12lead");

    const monitor = await command(t, "skill", "attach_monitor");
    expect(monitor.ok).toBe(true);
    expect(monitorAttached(t.session.caseDef, t.session.state)).toBe(true);

    // The skill is a plan span with its verification.
    const spans = t.session.trace().spans;
    const plan = spans.find((s) => s.kind === "plan" && s.name === "skill:perform_ecg")!;
    expect(plan).toMatchObject({ ok: true });
    expect(spans.some((s) => s.parentId === plan.id && s.kind === "verification" && s.ok)).toBe(true);
    expect(spans.some((s) => s.parentId === plan.id && s.kind === "interaction" && s.name === "record")).toBe(true);
    await t.session.close();
  });

  it("perform_ecg in the teaching hospital: the bay's cart stands too far from the bed to be used there — it is wheeled over first (C7)", async () => {
    const content = await builtinContent();
    const facility = content.facilities.get("teaching-hospital")!.def;
    const t = await makeEmbodiedSession({ facility, catalogs: catalogsFor(content, facility), settingsPatch: { approvalMode: "bypass" } });
    answerAll(t);
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const ecg = await command(t, "skill", "perform_ecg");
    expect(ecg.ok, ecg.text).toBe(true);
    expect((ecg.data as { skill: { status: string } }).skill.status).toBe("succeeded");
    expect(ecg.text).toMatch(/fetch-equipment|replan/);
    expect(t.session.state.orders.map((o) => o.investigationId)).toContain("ecg-12lead");
    await t.session.close();
  });

  it("lists skills with /skill; an unknown skill is reported", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { locale: "zh-CN" } });
    const list = await command(t, "skill");
    for (const id of BUILTIN_SKILL_IDS) expect(list.text).toContain(id);
    const unknown = await command(t, "skill", "juggle");
    expect(unknown.ok).toBe(false);
    expect(unknown.text).toContain("juggle");
    await t.session.close();
  });
});
