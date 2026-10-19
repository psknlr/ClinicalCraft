/**
 * Embodied slash commands (`/look`, `/where`, `/find`, `/go`, `/inspect`,
 * `/use`, `/map`, `/skill`, `/delegate`): their world tools through the
 * learner's tool path; usage errors; clinical sessions answer that they need
 * embodied mode.
 */
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { command, makeEmbodiedSession } from "./__fixtures__/embodied.js";
import { EMBODIED_COMMAND_NAMES, keyValues } from "./commands-world.js";

describe("keyValues", () => {
  it("parses numbers, booleans, JSON and goal targets", () => {
    expect(keyValues(["investigation=ecg-12lead", "n=2", "x=1.5", "ok=true", 'goal={"kind":"room","id":"ed"}', "noise", "=bad"])).toEqual({
      investigation: "ecg-12lead",
      n: 2,
      x: 1.5,
      ok: true,
      goal: { kind: "room", id: "ed" },
    });
    expect(keyValues(["goal=patient:resus-1"])).toEqual({ goal: { kind: "interact", id: "patient:resus-1" } });
  });
});

describe("embodied slash commands", () => {
  it("are registered (and listed by /help) only in embodied sessions", async () => {
    const t = await makeEmbodiedSession();
    const names = t.session.commands().map((c) => c.name);
    for (const name of EMBODIED_COMMAND_NAMES) expect(names, name).toContain(name);
    expect((await command(t, "help")).text).toMatch(/\/look/);
    await t.session.close();

    const c = await makeEmbodiedSession({ clinical: true });
    expect(c.session.commands().map((x) => x.name)).not.toContain("look");
    const refused = await c.session.run({ type: "slash_command", name: "look", args: "" });
    const out = refused.flatMap((e) => (e.msg.type === "command_output" ? [e.msg] : []))[0];
    expect(out?.text ?? refused.flatMap((e) => (e.msg.type === "error" ? [e.msg.message] : [])).join()).toMatch(/embodied/i);
    await c.session.close();
  });

  it("walk, look, inspect and operate as the learner; usage errors say how to call them", async () => {
    const t = await makeEmbodiedSession({ settingsPatch: { approvalMode: "bypass" } });
    expect((await command(t, "where")).text).toMatch(/You are in/);
    expect((await command(t, "go", "patient")).text).toMatch(/Arrived/);
    expect(t.session.placeLabel()).toBe("Resuscitation Room");
    expect((await command(t, "inspect", "eq:resus1-ecg")).text).toMatch(/prepare/);
    expect((await command(t, "find", "monitor")).text).toMatch(/eq:resus1-monitor/);
    expect((await command(t, "map")).text).toMatch(/room:ed-resus/);
    expect((await command(t, "use", "eq:resus1-ecg prepare")).ok).toBe(true);
    expect(t.session.world()!.inspect(PRIMARY_ACTOR, "eq:resus1-ecg")!.state).toBe("prepared");
    for (const [name, args] of [
      ["find", ""],
      ["go", ""],
      ["inspect", ""],
      ["use", "eq:resus1-ecg"],
      ["delegate", "nurse"],
    ] as const) {
      const r = await t.session.run({ type: "slash_command", name, args });
      const out = r.flatMap((e) => (e.msg.type === "command_output" ? [e.msg] : []))[0]!;
      expect(out.text, name).toMatch(new RegExp(`/${name}`));
      expect(out.data, name).toMatchObject({ error: "usage" });
    }
    await t.session.close();
  });
});
