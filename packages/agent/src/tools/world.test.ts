/**
 * World tools (docs/EMBODIED.md §4–§9): the static specs the MCP server
 * lists match the tools sessions register; read-only vs acting; permission
 * specifiers and risks; argument problems answered in the session language.
 */
import { describe, expect, it } from "vitest";
import { command, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { DELEGATION_TASKS, taskLabel, WORLD_READ_ONLY_TOOLS, WORLD_TOOL_NAMES, WORLD_TOOL_SPECS } from "./world.js";

describe("world tool specs", () => {
  it("name every world tool once, with an object schema and a description", () => {
    expect(WORLD_TOOL_SPECS.map((s) => s.name)).toEqual([...WORLD_TOOL_NAMES]);
    for (const s of WORLD_TOOL_SPECS) {
      expect(s.inputSchema.type, s.name).toBe("object");
      expect(s.description.length, s.name).toBeGreaterThan(20);
    }
    expect(WORLD_READ_ONLY_TOOLS.every((n) => (WORLD_TOOL_NAMES as readonly string[]).includes(n))).toBe(true);
    expect(WORLD_TOOL_SPECS.find((s) => s.name === "delegate_task")!.scope).toBe("workup");
    for (const task of DELEGATION_TASKS) expect(taskLabel("zh-CN", task)).not.toBe(task);
  });

  it("are the definitions an embodied session registers (same schemas); specifiers and risks for permission rules", async () => {
    const t = await makeEmbodiedSession();
    for (const spec of WORLD_TOOL_SPECS) {
      const tool = t.session.tool(spec.name);
      if (spec.name === "get_camera_frame") {
        expect(tool).toBeUndefined();
        continue;
      }
      expect(tool!.inputSchema, spec.name).toEqual(spec.inputSchema);
      expect(tool!.scope, spec.name).toBe(spec.scope ?? "history-only");
    }
    const s = t.session;
    const ctx = { caseDef: s.caseDef, facility: s.facility, catalogs: s.catalogs, locale: "en", agent: "learner", state: () => s.state } as never;
    expect(t.session.tool("interact_object")!.specifier!({ target: "eq:ct", operation: "lock" }, ctx)).toBe("lock eq:ct");
    expect(t.session.tool("navigate_to")!.specifier!({ goal: { kind: "interact", id: "patient:resus-1" } }, ctx)).toBe("patient:resus-1");
    expect(t.session.tool("delegate_task")!.specifier!({ task: "give_intervention", target: "aspirin" }, ctx)).toBe("give_intervention aspirin");
    const skill = t.session.tool("execute_skill")!;
    expect(skill.risk({ skill_id: "locate_patient" }, ctx)).toBe("none");
    // A skill is as risky as what its steps do (review S8): administer_treatment is the drug it gives.
    for (const drug of ["aspirin", "tenecteplase"]) {
      const intervene = t.session.tool("intervene")!;
      expect(skill.risk({ skill_id: "administer_treatment", params: { intervention: drug } }, ctx), drug).toBe(intervene.risk({ intervention_id: drug }, ctx));
      expect(skill.alwaysAsk!({ skill_id: "administer_treatment", params: { intervention: drug } }, ctx), drug).toBe(intervene.alwaysAsk?.({ intervention_id: drug }, ctx) ?? false);
    }
    // Parameters that do not resolve: the run refuses them, nothing to approve.
    expect(skill.risk({ skill_id: "administer_treatment" }, ctx)).toBe("none");
    const highRisk = { schema: "clinicalcraft/skill@1", id: "lysis", name: "Lysis", description: "x", safety: "high-risk", steps: [{ id: "give", tool: "intervene", args: { intervention_id: "tenecteplase" } }] };
    expect(skill.risk({ skill: highRisk }, ctx)).toBe("high");
    expect(skill.alwaysAsk!({ skill: highRisk }, ctx)).toBe(true);
    await t.session.close();
  });

  it("find_objects {room}: only what is in that room — \"here\" is the room the actor is in", async () => {
    const t = await makeEmbodiedSession();
    const s = t.session;
    const ctx = { caseDef: s.caseDef, facility: s.facility, catalogs: s.catalogs, locale: "en", agent: "learner", state: () => s.state } as never;
    const find = async (args: Record<string, unknown>) => ((await s.tool("find_objects")!.run(args, ctx)).data as { entities: { id: string; room: string | null }[] }).entities;
    const go = await s.run({ type: "world_action", request: { actionId: "wa-resus", actorId: "actor:clinician", operation: "navigate", goal: { kind: "room", id: "ed-resus" } } });
    expect(go.some((e) => e.msg.type === "world_action_result" && e.msg.result.status === "completed")).toBe(true);
    const all = await find({ limit: 50 });
    expect(new Set(all.map((e) => e.room)).size).toBeGreaterThan(1);
    const here = await find({ room: "here", limit: 50 });
    expect(here.length).toBeGreaterThan(0);
    expect(here.every((e) => e.room === "ed-resus")).toBe(true);
    expect((await find({ room: "ed-resus", limit: 50 })).map((e) => e.id)).toEqual(here.map((e) => e.id));
    await s.close();
  });

  it("answer bad targets and goals with a localised failure (nothing happens)", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { locale: "zh-CN" } });
    const version = t.session.world()!.version;
    const unknown = await command(t, "go", "the moon");
    expect(unknown.ok).toBe(false);
    expect(unknown.text).toMatch(/[一-鿿]/);
    const badGoal = await command(t, "use", 'eq:resus1-ecg move_to goal={"kind":"teleport"}');
    expect(badGoal.ok).toBe(false);
    expect(t.session.world()!.version).toBe(version);
    await t.session.close();
  });
});
