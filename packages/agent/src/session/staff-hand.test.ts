/**
 * "Pass me the scalpel" (docs/EMBODIED.md §8.4): the colleague picks the handheld item up where it lies, comes to
 * the learner and hands it over with their own body (`hand_over`) — the item ends in the learner's hands; the
 * learner's hands full, or a thing the world has no handheld item called, is said in their voice or left as talk.
 */
import { describe, expect, it } from "vitest";
import { parseCatalog, type EquipmentCatalog } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { builtinContent, makeEmbodiedSession } from "../__fixtures__/embodied.js";
import { msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { catalogsFor, chooseFacility } from "../node/bootstrap.js";

const part = [{ m: "white", p: [0, 0.05, 0], s: [0.2, 0.1, 0.1] }];

function instrumentCatalog(): EquipmentCatalog {
  const item = (id: string, en: string, zh: string) => ({ id, name: { "zh-CN": zh, en }, category: "surgery", description: { "zh-CN": zh, en }, footprint: { w: 0.2, d: 0.1, h: 0.1 }, solid: false, parts: part, interaction: { kind: "device" }, portable: "handheld" });
  const r = parseCatalog({
    schema: "clinicalcraft/equipment-catalog@1",
    id: "hand-request-test",
    name: { "zh-CN": "测试", en: "Test" },
    equipment: [item("scalpel", "Scalpel", "手术刀"), item("gauze", "Gauze swab", "纱布"), item("forceps", "Tissue forceps", "组织镊")],
  });
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.value;
}

async function theatreSession(locale = "en"): Promise<TestSession> {
  const content = await builtinContent();
  const base = chooseFacility(content, content.cases.get("stemi-inferior-rv")!.def, undefined, null)!;
  const facility = structuredClone(base);
  facility.placements.push(
    { id: "scalpel-1", type: "scalpel", x: 35, z: -13, y: 0, rot: 0, room: "ed-resus" },
    { id: "gauze-1", type: "gauze", x: 35.6, z: -13, y: 0, rot: 0, room: "ed-resus" },
    { id: "forceps-1", type: "forceps", x: 36.2, z: -13, y: 0, rot: 0, room: "ed-resus" },
  );
  return makeEmbodiedSession({ facility, catalogs: [...catalogsFor(content, base), instrumentCatalog()], settingsPatch: { locale } });
}

const say = (t: TestSession, text: string) => t.session.run({ type: "user_message", text, to: "nurse", staff: "ed-nurse" });
const lines = (events: Awaited<ReturnType<TestSession["session"]["run"]>>) => msgsOf(events, "agent_message").map((m) => ({ staffId: m.staffId, text: m.text }));

async function act(t: TestSession, operation: string, targetId: string): Promise<void> {
  const events = await t.session.run({ type: "world_action", request: { actionId: `wa-${operation}-${targetId}`, actorId: PRIMARY_ACTOR, operation, targetId } });
  expect(msgsOf(events, "world_action_result")[0]?.result.status).toBe("completed");
}

describe("a colleague passes the learner what they call for", () => {
  it("'Pass me the scalpel': the nurse picks it up, comes over and hands it over — it ends in the learner's hands", async () => {
    const t = await theatreSession();
    const w = t.session.world()!;
    const said = lines(await say(t, "Pass me the scalpel"));
    expect(said[0]).toMatchObject({ staffId: "ed-nurse", text: "Scalpel — coming." });
    expect(said.at(-1)).toMatchObject({ staffId: "ed-nurse", text: "Here you are: Scalpel." });
    expect(w.actor(PRIMARY_ACTOR)!.holding).toContain("eq:scalpel-1");
    expect(w.actor("staff:ed-nurse")!.holding).not.toContain("eq:scalpel-1");
    // asked again: the learner already has it
    expect(lines(await say(t, "Scalpel, please"))[0]?.text).toBe("You've already got the Scalpel.");
    await t.session.close();
  });

  it("the learner's hands full: the nurse says so and keeps her hands to herself", async () => {
    const t = await theatreSession();
    const w = t.session.world()!;
    for (const id of ["eq:gauze-1", "eq:forceps-1"]) {
      await act(t, "approach", id);
      await act(t, "pick_up", id);
    }
    const said = lines(await say(t, "Could you hand me the scalpel?"));
    expect(said).toHaveLength(1);
    expect(said[0]!.text).toMatch(/Your hands are full/);
    expect(w.actor(PRIMARY_ACTOR)!.holding).not.toContain("eq:scalpel-1");
    await t.session.close();
  });

  it("in Chinese, a bare instrument name as at the table: 纱布 — passed", async () => {
    const t = await theatreSession("zh-CN");
    const said = lines(await say(t, "纱布，谢谢"));
    expect(said[0]?.text).toBe("纱布，马上。");
    expect(said.at(-1)?.text).toBe("给您，纱布。");
    expect(t.session.world()!.actor(PRIMARY_ACTOR)!.holding).toContain("eq:gauze-1");
    await t.session.close();
  });

  it("a thing the world has no handheld item called is talk (nothing passed, no acknowledgement)", async () => {
    const t = await theatreSession();
    const said = lines(await say(t, "Pass me the unicorn horn"));
    expect(said.every((l) => !/coming|Here you are/.test(l.text))).toBe(true);
    expect(t.session.world()!.actor(PRIMARY_ACTOR)!.holding).toEqual([]);
    await t.session.close();
  });
});
