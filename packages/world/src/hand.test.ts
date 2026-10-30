/**
 * Items between people and devices that depend on devices (EMBODIED §5, §8.1): `hand_over {to}` passes a carried
 * item to someone within arm's reach with a free hand; worn items do not fill the hands; a `nearbyState`
 * precondition makes one device depend on the state of another nearby (an electrosurgical unit fires only with
 * the smoke evacuator running), refusing with a hint to the device that needs operating; a carried item keeps its own
 * lifecycle state (in hand and loaded), operated only by whoever carries it.
 */
import { describe, expect, it } from "vitest";
import { checkCatalogs, parseCatalog, type EquipmentCatalog } from "@clinicalcraft/core";
import { behaviorOf, evaluatePredicate, type PredicateEnv } from "./behaviors.js";
import { PRIMARY_ACTOR } from "./contracts.js";
import { loadFacility } from "./__fixtures__/content.js";
import { catalogs, makeWorld, type TestWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;
const NURSE = "staff:ed-nurse";
const part = [{ m: "white", p: [0, 0.05, 0], s: [0.2, 0.1, 0.1] }];

function theatreCatalog(): EquipmentCatalog {
  const r = parseCatalog({
    schema: "clinicalcraft/equipment-catalog@1",
    id: "hand-test",
    name: { "zh-CN": "测试", en: "Test" },
    equipment: [
      { id: "scalpel", name: { "zh-CN": "手术刀", en: "Scalpel" }, category: "surgery", description: { "zh-CN": "手术刀", en: "A scalpel" }, footprint: { w: 0.2, d: 0.1, h: 0.1 }, solid: false, parts: part, interaction: { kind: "device" }, portable: "handheld", behavior: { initial: "sterile", states: { sterile: {}, used: {} }, operations: { incise: { name: { "zh-CN": "切开", en: "Incise" }, from: ["held"], to: "used" } } } },
      {
        id: "needle-holder",
        name: { "zh-CN": "持针器", en: "Needle holder" },
        category: "surgery",
        description: { "zh-CN": "持针器", en: "A needle holder" },
        footprint: { w: 0.2, d: 0.1, h: 0.1 },
        solid: false,
        parts: part,
        interaction: { kind: "device" },
        portable: "handheld",
        behavior: {
          initial: "sterile",
          states: { sterile: {}, loaded: { name: { "zh-CN": "已夹针", en: "loaded" } }, used: {} },
          operations: {
            load: { name: { "zh-CN": "夹针", en: "Load a needle" }, from: ["sterile"], to: "loaded", requires: [{ state: "held" }] },
            suture: { name: { "zh-CN": "缝合", en: "Suture" }, from: ["loaded"], to: "used", requires: [{ state: "held" }] },
          },
        },
      },
      {
        id: "wand",
        name: { "zh-CN": "检测棒", en: "RF wand" },
        category: "surgery",
        description: { "zh-CN": "检测棒", en: "An RF wand" },
        footprint: { w: 0.2, d: 0.1, h: 0.1 },
        solid: false,
        parts: part,
        interaction: { kind: "device" },
        portable: "handheld",
        behavior: { initial: "ready", states: { ready: {}, clear: {} }, operations: { scan: { name: { "zh-CN": "扫描", en: "Scan" }, from: ["held"], to: "clear" } } },
      },
      {
        id: "count-board",
        name: { "zh-CN": "清点板", en: "Count board" },
        category: "surgery",
        description: { "zh-CN": "清点板", en: "A count board" },
        footprint: { w: 0.4, d: 0.4, h: 0.8 },
        solid: false,
        parts: part,
        interaction: { kind: "device" },
        behavior: { initial: "open", states: { open: {}, reconciled: {} }, operations: { final_count: { name: { "zh-CN": "最终清点", en: "Final count" }, from: ["open"], to: "reconciled", requires: [{ nearbyState: { type: "wand", state: "clear" } }] } } },
      },
      { id: "gown", name: { "zh-CN": "无菌手术衣", en: "Sterile gown" }, category: "surgery", description: { "zh-CN": "无菌手术衣", en: "A sterile gown" }, footprint: { w: 0.3, d: 0.2, h: 0.1 }, solid: false, parts: part, interaction: { kind: "device" }, portable: "handheld" },
      {
        id: "evacuator",
        name: { "zh-CN": "烟雾排除器", en: "Smoke evacuator" },
        category: "surgery",
        description: { "zh-CN": "烟雾排除器", en: "A smoke evacuator" },
        footprint: { w: 0.4, d: 0.4, h: 0.8 },
        solid: false,
        parts: part,
        interaction: { kind: "device" },
        behavior: { initial: "off", states: { off: { name: { "zh-CN": "关闭", en: "off" } }, on: { name: { "zh-CN": "运行中", en: "running" } } }, operations: { switch_on: { name: { "zh-CN": "开启", en: "Switch on" }, from: ["off"], to: "on" } } },
      },
      {
        id: "esu",
        name: { "zh-CN": "高频电刀", en: "Electrosurgical unit" },
        category: "surgery",
        description: { "zh-CN": "高频电刀", en: "An electrosurgical unit" },
        footprint: { w: 0.4, d: 0.4, h: 0.8 },
        solid: false,
        parts: part,
        interaction: { kind: "device" },
        behavior: {
          initial: "ready",
          states: { ready: {} },
          operations: { fire: { name: { "zh-CN": "激发", en: "Activate" }, from: ["ready"], requires: [{ nearbyState: { type: "evacuator", state: "on" } }] } },
        },
      },
    ],
  });
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.value;
}

function theatreWorld(): TestWorld {
  const facility = structuredClone(loadFacility("general-hospital"));
  facility.placements.push(
    { id: "scalpel-1", type: "scalpel", x: 35, z: -13, y: 0, rot: 0, room: "ed-resus" },
    { id: "scalpel-2", type: "scalpel", x: 35.6, z: -13, y: 0, rot: 0, room: "ed-resus" },
    { id: "scalpel-3", type: "scalpel", x: 36.2, z: -13, y: 0, rot: 0, room: "ed-resus" },
    { id: "gown-1", type: "gown", x: 36.8, z: -13, y: 0, rot: 0, room: "ed-resus" },
    { id: "esu-1", type: "esu", x: 37.5, z: -16, y: 0, rot: 0, room: "ed-resus" },
    { id: "evac-1", type: "evacuator", x: 38.5, z: -16, y: 0, rot: 0, room: "ed-resus" },
    { id: "nh-1", type: "needle-holder", x: 35, z: -12.4, y: 0, rot: 0, room: "ed-resus" },
    { id: "wand-1", type: "wand", x: 35.6, z: -12.4, y: 0, rot: 0, room: "ed-resus" },
    { id: "board-1", type: "count-board", x: 37.5, z: -13, y: 0, rot: 0, room: "ed-resus" },
  );
  return makeWorld("stemi-inferior-rv", { facility, catalogs: [...catalogs(), theatreCatalog()] });
}

async function take(w: TestWorld, id: string, actorId = A) {
  expect((await w.act({ actorId, operation: "approach", targetId: id })).status).toBe("completed");
  const r = await w.act({ actorId, operation: "pick_up", targetId: id });
  expect(r.status, r.message).toBe("completed");
}

async function stepTo(w: TestWorld, actorId: string, toId: string) {
  const r = await w.act({ actorId, operation: "navigate", goal: { kind: "entity", id: toId, range: 1 } });
  expect(r.status, r.message).toBe("completed");
}

describe("hand_over", () => {
  it("is offered by every handheld item", () => {
    const w = theatreWorld();
    expect(behaviorOf(w.runtime.entity("eq:scalpel-1")!).operations.map((o) => o.id)).toEqual(["incise", "pick_up", "put_down", "equip", "hand_over"]);
    expect(behaviorOf(w.runtime.entity("eq:nh-1")!).operations.map((o) => o.id)).toEqual(["load", "suture", "pick_up", "put_down", "equip", "hand_over"]);
  });

  it("passes a carried item to someone within arm's reach; they can pass it back", async () => {
    const w = theatreWorld();
    await take(w, "eq:scalpel-1");
    // too far: refused with the way to the recipient
    const far = await w.act({ actorId: A, operation: "hand_over", targetId: "eq:scalpel-1", parameters: { to: NURSE } });
    expect(far).toMatchObject({ status: "failed", errorCode: "NOT_IN_RANGE", hint: { goal: { kind: "entity", id: NURSE } } });
    await stepTo(w, A, NURSE);
    const r = await w.act({ actorId: A, operation: "hand_over", targetId: "eq:scalpel-1", parameters: { to: NURSE } });
    expect(r.status, r.message).toBe("completed");
    expect(r.message).toMatch(/Handed "Scalpel"/);
    expect(r.events.map((e) => e.type)).toEqual(["item.held", "item.held", "action.completed"]);
    expect(w.runtime.actor(A)!.holding).toEqual([]);
    expect(w.runtime.actor(NURSE)!.holding).toEqual(["eq:scalpel-1"]);
    expect(w.runtime.snapshot().entities["eq:scalpel-1"]).toMatchObject({ heldBy: NURSE });
    expect(w.runtime.inspect(A, "eq:scalpel-1")!.state).toBe("held");
    // the new holder uses it (an operation offered "held") and hands it back
    expect((await w.act({ actorId: NURSE, operation: "incise", targetId: "eq:scalpel-1" })).status).toBe("completed");
    const back = await w.act({ actorId: NURSE, operation: "hand_over", targetId: "eq:scalpel-1", parameters: { to: "clinician" } });
    expect(back.status, back.message).toBe("completed");
    expect(w.runtime.actor(A)!.holding).toEqual(["eq:scalpel-1"]);
    // its state outlives the hands it went through: "used" once it is put down
    expect((await w.act({ actorId: A, operation: "put_down", targetId: "eq:scalpel-1" })).status).toBe("completed");
    expect(w.runtime.inspect(A, "eq:scalpel-1")!.state).toBe("used");
  });

  it("refuses what cannot be handed: not held, worn, to nobody, to oneself, to full hands", async () => {
    const w = theatreWorld();
    expect(await w.act({ actorId: A, operation: "hand_over", targetId: "eq:scalpel-1", parameters: { to: NURSE } })).toMatchObject({ errorCode: "NOT_HOLDING" });
    await take(w, "eq:scalpel-1");
    expect(await w.act({ actorId: A, operation: "hand_over", targetId: "eq:scalpel-1" })).toMatchObject({ errorCode: "INVALID_REQUEST" });
    expect(await w.act({ actorId: A, operation: "hand_over", targetId: "eq:scalpel-1", parameters: { to: "nobody-here" } })).toMatchObject({ errorCode: "INVALID_REQUEST" });
    expect(await w.act({ actorId: A, operation: "hand_over", targetId: "eq:scalpel-1", parameters: { to: w.patientId } })).toMatchObject({ errorCode: "INVALID_REQUEST" });
    expect(await w.act({ actorId: A, operation: "hand_over", targetId: "eq:scalpel-1", parameters: { to: A } })).toMatchObject({ errorCode: "INVALID_REQUEST" });
    await take(w, "eq:gown-1");
    expect((await w.act({ actorId: A, operation: "equip", targetId: "eq:gown-1" })).status).toBe("completed");
    await stepTo(w, A, NURSE);
    expect(await w.act({ actorId: A, operation: "hand_over", targetId: "eq:gown-1", parameters: { to: NURSE } })).toMatchObject({ errorCode: "PRECONDITION_FAILED" });
    // the nurse's hands full: two scalpels already
    for (const id of ["eq:scalpel-2", "eq:scalpel-3"]) {
      await take(w, id, NURSE);
    }
    await stepTo(w, A, NURSE);
    const full = await w.act({ actorId: A, operation: "hand_over", targetId: "eq:scalpel-1", parameters: { to: NURSE } });
    expect(full).toMatchObject({ status: "failed", errorCode: "HANDS_FULL" });
    expect(full.message).toMatch(/hands are full/);
  });

  it("worn items do not fill the hands: two in hand besides what is worn", async () => {
    const w = theatreWorld();
    await take(w, "eq:gown-1");
    expect((await w.act({ actorId: A, operation: "equip", targetId: "eq:gown-1" })).status).toBe("completed");
    await take(w, "eq:scalpel-1");
    await take(w, "eq:scalpel-2");
    expect(w.runtime.actor(A)!.holding).toEqual(["eq:gown-1", "eq:scalpel-1", "eq:scalpel-2"]);
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:scalpel-3" })).status).toBe("completed");
    expect(await w.act({ actorId: A, operation: "pick_up", targetId: "eq:scalpel-3" })).toMatchObject({ errorCode: "HANDS_FULL" });
  });
});

describe("a carried item keeps its own lifecycle", () => {
  it("operations read both: in hand (a `state: held` precondition) and sterile → loaded → used, which outlives the hands", async () => {
    const w = theatreWorld();
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:nh-1" })).status).toBe("completed");
    // lying on the table: sterile, but not in hand
    expect(await w.act({ actorId: A, operation: "load", targetId: "eq:nh-1" })).toMatchObject({ errorCode: "PRECONDITION_FAILED" });
    await take(w, "eq:nh-1");
    // "suture" needs a loaded needle: refused with the instrument's own state, not "held"
    const early = await w.act({ actorId: A, operation: "suture", targetId: "eq:nh-1" });
    expect(early).toMatchObject({ errorCode: "PRECONDITION_FAILED" });
    expect(early.message).toMatch(/sterile/);
    expect(w.runtime.inspect(A, "eq:nh-1")!.availableActions).toContain("load");
    expect((await w.act({ actorId: A, operation: "load", targetId: "eq:nh-1" })).status).toBe("completed");
    expect(w.runtime.inspect(A, "eq:nh-1")!.state).toBe("held");
    expect((await w.act({ actorId: A, operation: "suture", targetId: "eq:nh-1" })).status).toBe("completed");
    expect((await w.act({ actorId: A, operation: "put_down", targetId: "eq:nh-1" })).status).toBe("completed");
    expect(w.runtime.inspect(A, "eq:nh-1")!.state).toBe("used");
  });

  it("only its holder operates a carried item", async () => {
    const w = theatreWorld();
    await take(w, "eq:scalpel-1", NURSE);
    await stepTo(w, A, NURSE);
    const r = await w.act({ actorId: A, operation: "incise", targetId: "eq:scalpel-1" });
    expect(r).toMatchObject({ status: "failed", errorCode: "DEVICE_BUSY" });
    expect(r.message).toMatch(/Nurse|Lin/);
  });

  it("a nearbyState precondition reads a carried item's own state (the count board and the RF wand in a nurse's hand)", async () => {
    const w = theatreWorld();
    await take(w, "eq:wand-1", NURSE);
    expect((await w.act({ actorId: NURSE, operation: "approach", targetId: "eq:board-1" })).status).toBe("completed");
    expect(await w.act({ actorId: NURSE, operation: "final_count", targetId: "eq:board-1" })).toMatchObject({ errorCode: "PRECONDITION_FAILED" });
    expect((await w.act({ actorId: NURSE, operation: "scan", targetId: "eq:wand-1" })).status).toBe("completed");
    expect(w.runtime.nearby("eq:board-1", "wand")).toEqual([{ id: "eq:wand-1", state: "held", states: ["held", "clear"] }]);
    const r = await w.act({ actorId: NURSE, operation: "final_count", targetId: "eq:board-1" });
    expect(r.status, r.message).toBe("completed");
  });

  it("`state` predicates match any of the states an environment lists", () => {
    const env: PredicateEnv = { state: "held", states: ["held", "loaded"], role: "nurse", handsClean: true, holding: () => false, actorWithin: () => true, patientWithin: () => true, deviceAtBedside: () => true };
    expect(evaluatePredicate({ state: "loaded" }, env)).toBe(true);
    expect(evaluatePredicate({ all: [{ state: "held" }, { state: "loaded" }] }, env)).toBe(true);
    expect(evaluatePredicate({ state: "used" }, env)).toBe(false);
    expect(evaluatePredicate({ state: "loaded" }, { ...env, states: undefined })).toBe(false);
  });
});

describe("nearbyState: devices that depend on devices", () => {
  it("refuses until the nearby device is in the state, hinting the way to it; the runtime reads the same", async () => {
    const w = theatreWorld();
    expect(w.runtime.nearby("eq:esu-1", "evacuator")).toEqual([{ id: "eq:evac-1", state: "off", states: ["off"] }]);
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:esu-1" })).status).toBe("completed");
    const fire = await w.act({ actorId: A, operation: "fire", targetId: "eq:esu-1" });
    expect(fire).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED", hint: { goal: { kind: "interact", id: "eq:evac-1" } } });
    expect(fire.message).toMatch(/Smoke evacuator.*running.*off/);
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:evac-1" })).status).toBe("completed");
    expect((await w.act({ actorId: A, operation: "switch_on", targetId: "eq:evac-1" })).status).toBe("completed");
    expect(w.runtime.nearby("eq:esu-1", "evacuator")).toEqual([{ id: "eq:evac-1", state: "on", states: ["on"] }]);
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:esu-1" })).status).toBe("completed");
    expect((await w.act({ actorId: A, operation: "fire", targetId: "eq:esu-1" })).status).toBe("completed");
  });

  it("counts only in-service devices within range", async () => {
    const w = theatreWorld();
    w.runtime.setAvailability("eq:evac-1", false);
    expect(w.runtime.nearby("eq:esu-1", "evacuator")).toEqual([]);
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:esu-1" })).status).toBe("completed");
    const fire = await w.act({ actorId: A, operation: "fire", targetId: "eq:esu-1" });
    expect(fire).toMatchObject({ status: "failed", errorCode: "PRECONDITION_FAILED" });
    expect(fire.message).toMatch(/there is none nearby/);
    expect(w.runtime.nearby("eq:esu-1", "evacuator", 0.1)).toEqual([]);
  });

  it("is false without a nearby() in the environment, and validated against the catalogs", () => {
    const env: PredicateEnv = { state: null, role: "nurse", handsClean: true, holding: () => false, actorWithin: () => true, patientWithin: () => true, deviceAtBedside: () => true };
    expect(evaluatePredicate({ nearbyState: { type: "evacuator", state: "on" } }, env)).toBe(false);
    expect(evaluatePredicate({ nearbyState: { type: "evacuator", state: ["on", "off"] } }, { ...env, nearby: (type, states) => type === "evacuator" && states.includes("on") })).toBe(true);
    expect(checkCatalogs([...catalogs(), theatreCatalog()]).filter((i) => i.path.includes("hand-test"))).toEqual([]);
    const bad = structuredClone(theatreCatalog());
    bad.equipment.find((e) => e.id === "esu")!.behavior!.operations.fire!.requires = [{ nearbyState: { type: "evacuatr", state: "on" } }, { nearbyState: { type: "evacuator", state: "running" } }];
    expect(checkCatalogs([...catalogs(), bad]).filter((i) => i.path.includes("hand-test")).map((i) => [i.severity, i.message])).toEqual([
      ["warning", '"nearbyState" names equipment type "evacuatr", which no loaded catalog defines'],
      ["warning", '"nearbyState" refers to state "running", which "evacuator" does not have'],
    ]);
  });
});
