/**
 * A look for each state (docs/FACILITIES.md): what is drawn of an equipment type in a state, and the checks of
 * what a catalog says about it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EquipmentManikinSchema, EquipmentTypeSchema, StateLookSchema, type EquipmentType } from "../schema/facility.js";
import { checkCatalogs, parseCatalog } from "./index.js";
import { drawnManikin, hasLooks, initialState, lookLayers, lookOf, sameFigure } from "./looks.js";

const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));

/** A training station: a table with a body on its side, a monitor, a model in layers — an operation in four states. */
const STATION = {
  id: "station",
  name: { "zh-CN": "训练台", en: "Training station" },
  category: "teaching",
  description: { "zh-CN": "胸腔镜训练台", en: "A thoracoscopy training station" },
  footprint: { w: 2.1, d: 1.1, h: 1.8 },
  parts: [
    { m: "steel", p: [0, 0.5, 0], s: [2, 1, 0.6] },
    { name: "screen", m: "screen", p: [-0.7, 1.5, -0.4], s: [0.5, 0.3, 0.04] },
  ],
  interaction: { kind: "device" },
  screen: "thoracoscopy",
  model: { uri: "models/station.glb", license: "CC0-1.0", use: "cleared", source: { name: "test" } },
  manikin: { posture: "lateral", sideUp: "left", cover: "blanket", breathing: "both", flex: 9, asleep: true, y: 0.93 },
  behavior: {
    initial: "ready",
    states: {
      ready: { name: { "zh-CN": "就绪", en: "Ready" }, look: { screen: "none" } },
      "lung-down": { name: { "zh-CN": "单肺通气", en: "Lung down" }, look: { screen: "none", manikin: { cover: "drapes", breathing: "one-lung" } } },
      explored: { name: { "zh-CN": "已探查", en: "Explored" }, look: { layers: ["camera-port", "scope"], manikin: { cover: "drapes", breathing: "one-lung" } } },
      closed: { name: { "zh-CN": "已缝合", en: "Closed" }, look: { layers: ["dressings"], screen: "none", manikin: { asleep: false } } },
      parked: { name: { "zh-CN": "停用", en: "Parked" } },
    },
    operations: {
      collapse: { name: { "zh-CN": "单肺通气", en: "Let the lung down" }, from: ["ready"], to: "lung-down" },
      explore: { name: { "zh-CN": "探查", en: "Explore" }, from: ["lung-down"], to: "explored" },
      close: { name: { "zh-CN": "缝合", en: "Close" }, from: ["explored"], to: "closed" },
      park: { name: { "zh-CN": "停用", en: "Park" }, from: ["closed"], to: "parked" },
      reset: { name: { "zh-CN": "复位", en: "Reset" }, from: "*", to: "ready" },
    },
  },
};

const type = (patch: Record<string, unknown> = {}): EquipmentType => EquipmentTypeSchema.parse({ ...structuredClone(STATION), ...patch });

describe("lookOf: what is drawn in a state", () => {
  it("a type without looks is drawn as it is, whatever state it is in", () => {
    const plain = type({ behavior: { initial: "off", states: { off: { name: { "zh-CN": "关", en: "Off" } }, on: { name: { "zh-CN": "开", en: "On" } } }, operations: {} } });
    expect(hasLooks(plain)).toBe(false);
    expect(lookLayers(plain)).toEqual([]);
    for (const state of ["off", "on", "no-such-state", null]) expect(lookOf(plain, state)).toEqual({ layers: [], screen: "thoracoscopy", manikin: drawnManikin(plain.manikin) });
    // nor does a type without a behaviour, or without a manikin
    const bare = type({ behavior: undefined, manikin: undefined, screen: "none" });
    expect(hasLooks(bare)).toBe(false);
    expect(lookOf(bare, null)).toEqual({ layers: [], screen: "none", manikin: null });
    expect(initialState(bare)).toBeNull();
  });

  it("a state's look names the layers shown, the screens' picture and what changes of the manikin; the rest is the type's", () => {
    const t = type();
    expect(hasLooks(t)).toBe(true);
    expect(lookLayers(t)).toEqual(["camera-port", "dressings", "scope"]);
    const ready = lookOf(t, "ready");
    expect(ready.layers).toEqual([]);
    expect(ready.screen).toBe("none");
    expect(ready.manikin).toMatchObject({ posture: "lateral", sideUp: "left", cover: "blanket", breathing: "both", flex: 9, asleep: true, y: 0.93 });
    const lungDown = lookOf(t, "lung-down");
    expect(lungDown.manikin).toMatchObject({ cover: "drapes", breathing: "one-lung", flex: 9, asleep: true });
    const explored = lookOf(t, "explored");
    expect(explored.layers).toEqual(["camera-port", "scope"]);
    expect(explored.screen).toBe("thoracoscopy"); // not said: the type's
    const closed = lookOf(t, "closed");
    expect(closed).toMatchObject({ layers: ["dressings"], screen: "none", manikin: { cover: "blanket", breathing: "both", asleep: false } });
    // a state without a look, a state the type does not have, no state at all: the type as it is, none of its layers
    for (const state of ["parked", "no-such-state", null]) expect(lookOf(t, state)).toEqual({ layers: [], screen: "thoracoscopy", manikin: drawnManikin(t.manikin) });
    // a look is read, never changed: asking twice gives equal answers, and the type's own data is left alone
    lookOf(t, "explored").layers.push("x");
    expect(lookOf(t, "explored").layers).toEqual(["camera-port", "scope"]);
    expect(t.manikin!.cover).toBe("blanket");
  });

  it("a manikin turned off its side in a state loses what only a body on its side has", () => {
    const t = type();
    t.behavior!.states.closed.look = { manikin: { posture: "lying", asleep: false } };
    const m = lookOf(t, "closed").manikin!;
    expect(m).toMatchObject({ posture: "lying", cover: "clothes", flex: 0, breathing: "both", asleep: false });
    expect(m).not.toHaveProperty("sideUp");
    t.manikin!.breathing = "one-lung";
    expect(lookOf(t, "closed").manikin!.breathing).toBe("both");
  });

  it("the earlier `draped` is the drapes; a state says how it is covered with `cover`", () => {
    const old = EquipmentManikinSchema.parse({ posture: "lateral", draped: true });
    expect(drawnManikin(old)).toMatchObject({ cover: "drapes" });
    expect(drawnManikin(old)).not.toHaveProperty("draped");
    expect(drawnManikin(EquipmentManikinSchema.parse({ posture: "lying" }))).toMatchObject({ cover: "clothes", breathing: "none" });
    expect(drawnManikin(undefined)).toBeNull();
    const t = type({ manikin: { posture: "lateral", draped: true } });
    t.behavior!.states.ready.look = { manikin: { cover: "blanket" } };
    expect(lookOf(t, "ready").manikin!.cover).toBe("blanket");
    expect(lookOf(t, "parked").manikin!.cover).toBe("drapes");
  });

  it("the state a placement starts in is its own, else its type's", () => {
    const t = type();
    expect(initialState(t)).toBe("ready");
    expect(initialState(t, {})).toBe("ready");
    expect(initialState(t, { state: "explored" })).toBe("explored");
  });

  it("sameFigure: only how the chest moves needs no new figure", () => {
    const t = type();
    const a = lookOf(t, "lung-down").manikin, b = lookOf(t, "explored").manikin, ready = lookOf(t, "ready").manikin, closed = lookOf(t, "closed").manikin;
    expect(sameFigure(a, b)).toBe(true);
    expect(sameFigure(a, { ...a!, breathing: "none" })).toBe(true);
    expect(sameFigure(ready, a)).toBe(false); // covered differently
    expect(sameFigure(ready, closed)).toBe(false); // awake
    expect(sameFigure(a, { ...a!, appearance: { skin: "#c08a64" } })).toBe(false);
    expect(sameFigure(a, { ...a!, flex: 0 })).toBe(false);
    expect(sameFigure(null, null)).toBe(true);
    expect(sameFigure(a, null)).toBe(false);
  });
});

describe("a state's look in a catalog", () => {
  it("is refused when it says more than a look can: an unknown field, a live screen, a layer id that is no node name", () => {
    expect(StateLookSchema.safeParse({ layers: ["scope"], screen: "none", manikin: { cover: "drapes" } }).success).toBe(true);
    for (const bad of [{ colour: "red" }, { screen: "vitals" }, { screen: "ecg" }, { layers: ["Scope"] }, { layers: ["scope.001"] }, { layers: ["layer:scope"] }, { manikin: { x: 1 } }, { manikin: { appearance: {} } }, { manikin: { breathing: "fast" } }])
      expect(StateLookSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
  });

  const withStation = (edit: (station: Record<string, any>) => void) => {
    const raw = structuredClone(fixture("mini.catalog.json")) as { equipment: Record<string, unknown>[] };
    const station = structuredClone(STATION) as Record<string, any>;
    edit(station);
    raw.equipment.push(station);
    const r = parseCatalog(raw);
    if (!r.ok) throw new Error(JSON.stringify(r.issues));
    const prefix = `catalog(${r.value.id}).equipment.${r.value.equipment.length - 1}.`;
    return checkCatalogs([r.value])
      .filter((i) => i.path.startsWith(prefix))
      .map((i) => [i.path.slice(prefix.length), i.severity, i.message]);
  };

  it("the station's own looks are in order", () => {
    expect(withStation(() => undefined)).toEqual([]);
  });

  it("reports layers without a model, a layer named twice, a picture with no screen to show it, a patient's own screen changed", () => {
    expect(withStation((s) => delete s.model)).toEqual([
      ["behavior.states.explored.look.layers", "warning", expect.stringMatching(/has no model/)],
      ["behavior.states.closed.look.layers", "warning", expect.stringMatching(/has no model/)],
    ]);
    expect(withStation((s) => (s.behavior.states.explored.look.layers = ["scope", "camera-port", "scope"]))).toEqual([["behavior.states.explored.look.layers", "warning", expect.stringMatching(/"scope" named more than once/)]]);
    expect(withStation((s) => (s.parts = s.parts.filter((p: { name?: string }) => p.name !== "screen"))).map((i) => i.slice(0, 2))).toEqual([
      ["screen", "warning"], // the type's own picture has nowhere to show either
      ["behavior.states.ready.look.screen", "warning"],
      ["behavior.states.lung-down.look.screen", "warning"],
      ["behavior.states.closed.look.screen", "warning"],
    ]);
    expect(withStation((s) => (s.screen = "vitals")).map((i) => i.slice(0, 2))).toEqual([
      ["behavior.states.ready.look.screen", "error"],
      ["behavior.states.lung-down.look.screen", "error"],
      ["behavior.states.closed.look.screen", "error"],
    ]);
  });

  it("reports a look that changes a manikin the type does not have, or gives one that is not on its side what only one on its side has", () => {
    expect(withStation((s) => delete s.manikin).map((i) => i.slice(0, 2))).toEqual([
      ["behavior.states.lung-down.look.manikin", "error"],
      ["behavior.states.explored.look.manikin", "error"],
      ["behavior.states.closed.look.manikin", "error"],
    ]);
    const lying = withStation((s) => {
      s.manikin = { posture: "lying", y: 0.93 };
      s.behavior.states.closed.look.manikin = { posture: "lateral", cover: "drapes" }; // turned onto its side in this state: fine
    });
    expect(lying).toEqual([
      ["behavior.states.lung-down.look.manikin", "error", expect.stringMatching(/cover, breathing "one-lung": only a manikin on its side/)],
      ["behavior.states.explored.look.manikin", "error", expect.stringMatching(/only a manikin on its side/)],
    ]);
    // turned onto its back in a state, it cannot stay flexed over the table's break
    expect(withStation((s) => (s.behavior.states.closed.look.manikin = { posture: "lying", flex: 5 })).map((i) => i.slice(0, 2))).toEqual([["behavior.states.closed.look.manikin", "error"]]);
  });
});
