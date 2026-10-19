import { describe, expect, it } from "vitest";
import { buildCollisionModel } from "./collision.js";
import { PRIMARY_ACTOR, type Pose, type WorldActionResult, type WorldEvent } from "./contracts.js";
import { buildRegistry } from "./registry.js";
import { WorldStateStore, canonical, spawnPose } from "./state.js";
import { loadFacility } from "./__fixtures__/content.js";
import { catalogs, counters, loadCase } from "./__fixtures__/world.js";

const f = loadFacility("general-hospital");
const registry = buildRegistry(f, catalogs(), { caseDef: loadCase("stemi-inferior-rv"), slotId: "resus-1", locale: "en" }, buildCollisionModel(f, catalogs(), {}));
const store = (extra: Partial<ConstructorParameters<typeof WorldStateStore>[0]> = {}) => new WorldStateStore({ facility: f, registry, newId: counters().newId, ...extra });

describe("WorldStateStore: actors", () => {
  it("spawns the primary actor at the facility spawn and every staff member at their post", () => {
    const s = store();
    const me = s.actor(PRIMARY_ACTOR)!;
    expect(me).toMatchObject({ role: "clinician", controller: "agent", pose: spawnPose(f), task: null, holding: [], seen: [], handsCleanUntil: null });
    expect(s.actors().map((a) => a.id)).toEqual([PRIMARY_ACTOR, ...f.staff.map((st) => `staff:${st.id}`)].sort());
    const nurse = s.actor("staff:ed-nurse")!;
    expect(nurse).toMatchObject({ role: "nurse", controller: "npc", room: "ed-station", pose: { x: 21, z: -9.4, level: "L0" } });
  });

  it("a spawn option replaces the facility spawn", () => {
    const at: Pose = { x: 30, y: 0, z: -15, yaw: 1, pitch: 0, level: "L0" };
    expect(store({ spawn: at }).actor(PRIMARY_ACTOR)).toMatchObject({ pose: at, room: "ed-resus" });
  });
});

describe("WorldStateStore: versions (EMBODIED R4)", () => {
  it("a committed pose bumps the global version and the actor's own version only", () => {
    const s = store();
    expect(s.version).toBe(0);
    expect(s.entityVersion(PRIMARY_ACTOR)).toBe(0);
    s.setActorPose(PRIMARY_ACTOR, { x: 0, y: 0, z: 20, yaw: 0, pitch: 0, level: "L0" });
    expect(s.version).toBe(1);
    expect(s.entityVersion(PRIMARY_ACTOR)).toBe(1);
    expect(s.entityVersion("eq:resus1-ecg")).toBe(0);
  });

  it("a sensor update bumps only the actor's version — never the global one, never another entity", () => {
    const s = store();
    s.patchEntity("eq:resus1-ecg", { state: "prepared" });
    const before = { global: s.version, device: s.entityVersion("eq:resus1-ecg") };
    const r = s.sensorPose(PRIMARY_ACTOR, { x: 31, y: 0, z: -15, yaw: 0, pitch: 0, level: "L0" });
    expect(r).toEqual({ roomChanged: true, room: "ed-resus" });
    expect(s.version).toBe(before.global);
    expect(s.entityVersion("eq:resus1-ecg")).toBe(before.device);
    expect(s.entityVersion(PRIMARY_ACTOR)).toBe(1);
    expect(s.actor(PRIMARY_ACTOR)!.room).toBe("ed-resus");
  });

  it("entity patches bump that entity; undefined members are removed; memory, tasks and events bump nothing", () => {
    const s = store();
    s.patchEntity("eq:resus1-ecg", { state: "prepared", reservedBy: PRIMARY_ACTOR });
    s.patchEntity("eq:resus1-ecg", { reservedBy: undefined });
    expect(s.entity("eq:resus1-ecg")).toEqual({ version: 2, state: "prepared" });
    expect(s.version).toBe(2);
    expect(s.remember(PRIMARY_ACTOR, ["eq:b", "eq:a", "eq:a", PRIMARY_ACTOR])).toEqual(["eq:a", "eq:b"]);
    expect(s.remember(PRIMARY_ACTOR, ["eq:a"])).toEqual([]);
    expect(s.actor(PRIMARY_ACTOR)!.seen).toEqual(["eq:a", "eq:b"]);
    s.setTask(PRIMARY_ACTOR, { id: "x", kind: "navigate", label: "go", startedAt: 1 });
    s.emit({ type: "hygiene", actorId: PRIMARY_ACTOR, until: 30 });
    expect(s.version).toBe(2);
    expect(s.entityVersion(PRIMARY_ACTOR)).toBe(0);
  });
});

describe("WorldStateStore: WorldDynamics", () => {
  it("doors, obstacles, displaced and removed entities, actor poses", () => {
    const s = store();
    expect(s.doorState("door:x")).toBeNull();
    s.patchEntity("door:x", { door: { open: false, locked: true } });
    expect(s.doorState("door:x")).toEqual({ open: false, locked: true });
    const wet = { id: "wet", level: "L0", rect: { x: 0, z: 0, w: 2, d: 1 }, label: { "zh-CN": "湿滑", en: "Wet" } };
    expect(s.setObstacle(wet, true)).toBe(true);
    expect(s.obstacles()).toEqual([wet]);
    expect(s.setObstacle(wet, false)).toBe(true);
    expect(s.setObstacle(wet, false)).toBe(false);
    s.patchEntity("eq:resus1-ecg", { position: { x: 1, y: 0, z: 2, level: "L0" } });
    s.patchEntity("eq:b-item", { heldBy: PRIMARY_ACTOR });
    s.patchEntity("eq:a-cart", { position: { x: 5, y: 0, z: 5, level: "L0" } });
    expect(s.displaced().map((d) => d.id)).toEqual(["eq:a-cart", "eq:resus1-ecg"]);
    expect(s.removed()).toEqual(["eq:b-item"]);
    expect(s.actorPose("staff:lab-tech")).toMatchObject({ x: 9.5, z: -10 });
    expect(s.actorPose("nobody")).toBeNull();
  });
});

describe("WorldStateStore: events and idempotency window", () => {
  it("events get ids from newId, listeners see the version after the change, the log is bounded", () => {
    const s = store({ maxEvents: 3 });
    const seen: [WorldEvent["type"], number][] = [];
    const off = s.subscribe((e, v) => seen.push([e.type, v]));
    s.setHands(PRIMARY_ACTOR, 30);
    const e = s.emit({ type: "hygiene", actorId: PRIMARY_ACTOR, until: 30 });
    expect(e.id).toMatch(/^id-\d+$/);
    expect(seen).toEqual([["hygiene", 1]]);
    off();
    for (let i = 0; i < 5; i++) s.emit({ type: "hygiene", actorId: PRIMARY_ACTOR, until: i });
    expect(seen).toHaveLength(1);
    expect(s.recentEvents(10)).toHaveLength(3);
    // a throwing listener never breaks the world
    s.subscribe(() => {
      throw new Error("boom");
    });
    expect(() => s.emit({ type: "hygiene", actorId: PRIMARY_ACTOR, until: 1 })).not.toThrow();
  });

  it("keeps the last results by action id", () => {
    const s = store({ maxResults: 2 });
    const r = (id: string): WorldActionResult => ({ actionId: id, status: "completed", message: "", worldVersion: 0, events: [] });
    s.recordResult(r("a"));
    s.recordResult(r("b"));
    s.recordResult(r("c"));
    expect(s.result("a")).toBeNull();
    expect(s.result("c")).toMatchObject({ actionId: "c" });
  });
});

describe("WorldStateStore: snapshots", () => {
  const busy = () => {
    const s = store();
    s.setActorPose(PRIMARY_ACTOR, { x: 31, y: 0, z: -15.4, yaw: 0.5, pitch: 0, level: "L0" });
    s.patchEntity("eq:resus1-ecg", { state: "prepared", reservedBy: PRIMARY_ACTOR, data: { z: 1, a: [2, 1] } });
    s.patchEntity("door:ed:s:0", { door: { open: true, locked: false } });
    s.setObstacle({ id: "wet", level: "L0", rect: { x: 1, z: 2, w: 3, d: 4 }, label: { "zh-CN": "湿", en: "Wet" } }, true);
    s.remember("staff:ed-nurse", ["eq:x"]);
    s.setHands(PRIMARY_ACTOR, 42);
    s.recordResult({ actionId: "a1", status: "completed", message: "ok", worldVersion: s.version, events: [] });
    return s;
  };

  it("are canonical JSON: sorted keys at every level, actors by id", () => {
    const snap = busy().snapshot();
    const keys = (o: object) => Object.keys(o);
    expect(keys(snap)).toEqual([...keys(snap)].sort());
    expect(keys(snap.entities)).toEqual([...keys(snap.entities)].sort());
    expect(keys(snap.entities["eq:resus1-ecg"])).toEqual(["data", "reservedBy", "state", "version"]);
    expect(keys(snap.entities["eq:resus1-ecg"].data!)).toEqual(["a", "z"]);
    expect(snap.actors.map((a) => a.id)).toEqual([...snap.actors.map((a) => a.id)].sort());
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
    expect(canonical({ b: 1, a: { d: undefined, c: [{ y: 1, x: 2 }] } })).toEqual({ a: { c: [{ x: 2, y: 1 }] }, b: 1 });
  });

  it("restore → snapshot is the identity; the same history gives the same bytes", () => {
    const snap = busy().snapshot();
    const restored = store({ snapshot: snap });
    expect(JSON.stringify(restored.snapshot())).toBe(JSON.stringify(snap));
    expect(restored.version).toBe(snap.version);
    expect(restored.result("a1")).toMatchObject({ actionId: "a1" });
    expect(restored.remembers("staff:ed-nurse", "eq:x")).toBe(true);
    expect(JSON.stringify(busy().snapshot())).toBe(JSON.stringify(snap));
  });

  it("refuses a snapshot of another facility or format", () => {
    const snap = busy().snapshot();
    expect(() => store({ snapshot: { ...snap, facilityId: "clinic-v4" } })).toThrow(/clinic-v4/);
    expect(() => store({ snapshot: { ...snap, format: "x" as never } })).toThrow(/format/);
  });
});
