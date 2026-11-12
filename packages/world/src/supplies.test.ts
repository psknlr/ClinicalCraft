/**
 * THE capability rule follows the device (the follow-up audit: a tower switched off still gave a picture and gas).
 * A behaviour state may declare what it `supplies`: a laparoscopy tower `off` supplies nothing, powered on its camera,
 * light source and insufflator; a stand-alone insufflator only the gas. A placement may start in a prepared state
 * (`Placement.state`: a theatre set up before the list). Out of service, nothing — whatever the state.
 */
import { parseCatalog, type EquipmentCatalog } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "./contracts.js";
import { catalogs, makeWorld } from "./__fixtures__/world.js";
import { loadFacility } from "./__fixtures__/content.js";

const part = [{ m: "white", p: [0, 0.5, 0], s: [0.5, 1, 0.5] }];
const power = (supplies: string[]) => ({
  initial: "off",
  states: { off: { supplies: [] }, on: { supplies } },
  operations: {
    power_on: { name: { "zh-CN": "开机", en: "Power on" }, from: ["off"], to: "on", durationSeconds: 30 },
    power_off: { name: { "zh-CN": "关机", en: "Power off" }, from: ["on"], to: "off", durationSeconds: 5 },
  },
});

function towerCatalog(): EquipmentCatalog {
  const r = parseCatalog({
    schema: "clinicalcraft/equipment-catalog@1",
    id: "supply-test",
    name: { "zh-CN": "测试", en: "Test" },
    equipment: [
      { id: "test-tower", name: { "zh-CN": "腹腔镜塔", en: "Laparoscopy tower" }, category: "surgery", description: { "zh-CN": "腹腔镜塔", en: "A tower" }, capabilities: ["endoscopic-camera", "light-source", "insufflator"], footprint: { w: 0.6, d: 0.6, h: 1.8 }, solid: true, parts: part, interaction: { kind: "device" }, portable: "cart", behavior: power(["endoscopic-camera", "light-source", "insufflator"]) },
      { id: "test-insufflator", name: { "zh-CN": "气腹机", en: "Insufflator" }, category: "surgery", description: { "zh-CN": "气腹机", en: "An insufflator" }, capabilities: ["insufflator"], footprint: { w: 0.4, d: 0.4, h: 0.4 }, solid: true, parts: part, interaction: { kind: "device" }, behavior: power(["insufflator"]) },
    ],
  });
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.value;
}

function world() {
  const facility = structuredClone(loadFacility("general-hospital"));
  facility.placements.push(
    { id: "tower-off", type: "test-tower", x: 35, z: -13.6, y: 0, rot: 0, room: "ed-resus" },
    { id: "tower-ready", type: "test-tower", x: 36, z: -13.6, y: 0, rot: 0, room: "ed-resus", state: "on" },
    { id: "gas-only", type: "test-insufflator", x: 37, z: -13.6, y: 0, rot: 0, room: "ed-resus" },
  );
  return makeWorld("stemi-inferior-rv", { facility, catalogs: [...catalogs(), towerCatalog()] });
}

describe("what a device supplies follows its state", () => {
  it("switched off: nothing; a prepared placement starts on; powering on restores only what that device supplies; out of service: nothing", async () => {
    const w = world();
    const rt = w.runtime;
    const all = ["endoscopic-camera", "light-source", "insufflator"];
    expect(rt.provides("eq:tower-off")).toEqual([]);
    expect(rt.provides("eq:tower-ready")).toEqual(all);
    expect(rt.inspect(PRIMARY_ACTOR, "eq:tower-ready")?.state).toBe("on");
    // the stand-alone insufflator switched on: the gas, never a picture
    const at = (id: string) => w.act({ actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id } });
    expect((await at("eq:gas-only")).status).toBe("completed");
    const on = await w.act({ actorId: PRIMARY_ACTOR, operation: "power_on", targetId: "eq:gas-only" });
    expect(on.status, on.message).toBe("completed");
    expect(rt.provides("eq:gas-only")).toEqual(["insufflator"]);
    // the tower switched on: all three; switched off again: none
    expect((await at("eq:tower-off")).status).toBe("completed");
    expect((await w.act({ actorId: PRIMARY_ACTOR, operation: "power_on", targetId: "eq:tower-off" })).status).toBe("completed");
    expect(rt.provides("eq:tower-off")).toEqual(all);
    expect((await w.act({ actorId: PRIMARY_ACTOR, operation: "power_off", targetId: "eq:tower-off" })).status).toBe("completed");
    expect(rt.provides("eq:tower-off")).toEqual([]);
    // out of service: nothing, whatever its state
    rt.setAvailability("eq:tower-ready", false);
    expect(rt.provides("eq:tower-ready")).toEqual([]);
    // the same rule everywhere: a bedside provider is one that supplies the capability now
    expect(rt.bedsideProviders("endoscopic-camera").filter((id) => id.startsWith("eq:tower"))).toEqual([]);
    // a reload keeps each device's state (stored or the placement's own)
    const snap = rt.snapshot();
    const again = makeWorld("stemi-inferior-rv", { facility: w.facility, catalogs: [...catalogs(), towerCatalog()], extra: { snapshot: snap } });
    expect([again.runtime.provides("eq:tower-off"), again.runtime.provides("eq:gas-only"), again.runtime.provides("eq:tower-ready")]).toEqual([[], ["insufflator"], []]);
  });
});
