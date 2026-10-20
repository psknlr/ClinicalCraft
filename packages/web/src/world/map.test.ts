import { describe, expect, it } from "vitest";
import { buildRules, canPlace, cellKey, checkerMaterial, validBlocks, zoneCells } from "./buildzone.js";
import { drawMap, fitLabel, mapProjection, MIN_LABEL_PX, splitLabel, type MapData } from "./map.js";
import { regionAt, roomAt } from "./region.js";
import { groundMaterial, groundRange, V4_STREAM_OFFSETS, v4Stream } from "./terrain.js";

describe("map projection", () => {
  const b = { minX: -35.5, maxX: 35.5, minZ: -35.5, maxZ: 35.5 };
  it("fits bounds (+margin) uniformly and centred", () => {
    const p = mapProjection(b, 300, 300, 2.5);
    expect(p.scale).toBeCloseTo(300 / 76);
    expect(p.toCanvas(0, 0)).toEqual([150, 150]);
    const [x0, y0] = p.toCanvas(-38, -38);
    expect(x0).toBeCloseTo(0);
    expect(y0).toBeCloseTo(0);
  });
  it("north (−Z) is up and the inverse round-trips", () => {
    const p = mapProjection(b, 400, 300, 0);
    expect(p.toCanvas(0, -10)[1]).toBeLessThan(p.toCanvas(0, 10)[1]);
    const [x, z] = p.toWorld(...p.toCanvas(12.5, -7.25));
    expect(x).toBeCloseTo(12.5);
    expect(z).toBeCloseTo(-7.25);
    // non-square canvas: centred horizontally
    expect(p.toCanvas(0, 0)[0]).toBeCloseTo(200);
  });
});

describe("build zone (V4 Ll)", () => {
  const zone = { rect: { x: 23.5, z: 1.5, w: 15, d: 15 }, maxHeight: 7, maxBlocks: 600 };
  const rules = buildRules(zone);
  const far = { x: -100, y: 0, z: -100 };
  it("reproduces V4 extents: sand cells 16…30 × −6…8, buildable 17…29 × −5…7 × 0…6", () => {
    expect(zoneCells(zone.rect)).toEqual({ minX: 16, maxX: 30, minZ: -6, maxZ: 8 });
    expect(rules).toMatchObject({ minX: 17, maxX: 29, minZ: -5, maxZ: 7, maxY: 6, maxBlocks: 600, materials: ["wood", "stone", "glass", "lamp"] });
    expect(canPlace(rules, [17, 0, -5], far, false)).toBe(true);
    expect(canPlace(rules, [16, 0, 0], far, false)).toBe(false);
    expect(canPlace(rules, [20, 7, 0], far, false)).toBe(false);
    expect(canPlace(rules, [20, 0, 0], far, true)).toBe(false);
  });
  it("never places a block inside the player", () => {
    expect(canPlace(rules, [20, 0, 0], { x: 20.5, y: 0, z: 0.5 }, false)).toBe(false);
    expect(canPlace(rules, [20, 2, 0], { x: 20.5, y: 0, z: 0.5 }, false)).toBe(true);
  });
  it("checker parity matches V4 ((x + z) % 2 truthy → sand)", () => {
    expect(checkerMaterial(16, -6)).toBe("path");
    expect(checkerMaterial(17, -6)).toBe("sand");
    expect(checkerMaterial(-1, 0)).toBe("sand");
  });
  it("validates saved blocks", () => {
    const ok = validBlocks(rules, [
      { cell: [20, 0, 0], type: "wood" },
      { cell: [20, 0, 0], type: "stone" },
      { cell: [0, 0, 0], type: "wood" },
      { cell: [21, 0, 0], type: "diamond" },
      { cell: [21.5, 0, 0], type: "wood" },
    ]);
    expect(ok).toEqual([{ cell: [20, 0, 0], type: "wood" }]);
    expect(cellKey([1, 2, 3])).toBe("1,2,3");
  });
});

describe("terrain", () => {
  const paths = [
    { x: 0.5, z: 20, w: 5, d: 24, material: "path" },
    { x: 2, z: 17, w: 60, d: 4, material: "path" },
  ];
  const zone = { x: 23.5, z: 1.5, w: 15, d: 15 };
  it("V4 ground grid −39…39 and cell materials", () => {
    expect(groundRange({ minX: -35.5, maxX: 35.5, minZ: -35.5, maxZ: 35.5 })).toEqual({ x0: -39, x1: 39, z0: -39, z1: 39 });
    expect(groundMaterial(0, 10, "grass", paths, zone)).toBe("path"); // main path cells x −2…2, z 8…31
    expect(groundMaterial(2, 31, "grass", paths, zone)).toBe("path");
    expect(groundMaterial(3, 20, "grass", paths, zone)).toBe("grass");
    expect(groundMaterial(-28, 15, "grass", paths, zone)).toBe("path"); // cross path
    expect(groundMaterial(20, 0, "grass", paths, zone)).toBe("path"); // checker (even)
    expect(groundMaterial(21, 0, "grass", paths, zone)).toBe("sand");
    expect(groundMaterial(-20, -20, "grass", paths, zone)).toBe("grass");
  });
  it("V4 stream offsets: the horizon starts after 24 textures × 256 draws", () => {
    const rnd = v4Stream(7103, V4_STREAM_OFFSETS.horizon);
    let k = 7103;
    const ref = () => ((k = (k * 1664525 + 1013904223) >>> 0), k / 4294967296);
    for (let i = 0; i < 6144; i++) ref();
    expect(rnd()).toBe(ref());
    // other seeds are not shifted
    expect(v4Stream(42, 6144)()).not.toBe(v4Stream(7103, 6144)());
  });
});

describe("regions", () => {
  const f = {
    rooms: [
      { id: "corridor", name: { "zh-CN": "诊所走廊", en: "Corridor" }, rect: { x: 0, z: -3, w: 6, d: 22 } },
      { id: "conference", name: { "zh-CN": "会诊区", en: "Conference" }, rect: { x: 0, z: -11.5, w: 6, d: 5 } },
    ],
    buildings: [{ id: "clinic", name: "Clinic", rect: { x: 0, z: -3, w: 26, d: 22 } }],
    buildZone: { rect: { x: 23.5, z: 1.5, w: 15, d: 15 } },
    outdoorRegion: { "zh-CN": "疗愈花园", en: "Healing Garden" },
  } as never;
  it("smallest room wins, then building, build zone, outdoor", () => {
    expect(roomAt(f, 0, -12)?.id).toBe("conference");
    expect(regionAt(f, 0, -12, "zh-CN")).toEqual({ name: "会诊区", roomId: "conference" });
    expect(regionAt(f, 0, 0, "en")).toEqual({ name: "Corridor", roomId: "corridor" });
    expect(regionAt(f, -8, 3, "en")).toEqual({ name: "Clinic", roomId: null });
    expect(regionAt(f, 23, 2, "zh-CN").name).toBe("建造园地");
    expect(regionAt(f, 0, 25, "zh-CN").name).toBe("疗愈花园");
  });
});

describe("big-map label fitting", () => {
  // fake 2D context: every glyph is (font px) wide
  const fake = () => {
    const c = { font: "bold 12px sans-serif", measureText: (t: string) => ({ width: [...t].length * parseFloat(/(\d+(?:\.\d+)?)px/.exec(c.font)![1]) }) };
    return c as unknown as Pick<CanvasRenderingContext2D, "font" | "measureText">;
  };
  it("keeps the requested font when the label fits", () => {
    const f = fitLabel(fake(), "检验科", 60, "bold 12px sans-serif");
    expect(f).toMatchObject({ lines: ["检验科"], font: "bold 12px sans-serif" });
  });
  it("shrinks, then wraps, then drops instead of squeezing CJK text", () => {
    expect(fitLabel(fake(), "门诊诊室", 40, "bold 12px sans-serif")?.font).toBe("bold 10px sans-serif");
    const wrapped = fitLabel(fake(), "急诊抢救 · 复苏区", 40, "bold 12px sans-serif");
    expect(wrapped?.lines).toEqual(["急诊抢救", "复苏区"]);
    expect(fitLabel(fake(), "影像科控制与阅片区", 20, "bold 12px sans-serif")).toBeNull();
  });
  it("never goes below the minimum font size", () => {
    const f = fitLabel(fake(), "病例讨论室", 5 * MIN_LABEL_PX, "bold 13px sans-serif");
    expect(f?.font).toBe(`bold ${MIN_LABEL_PX}px sans-serif`);
  });
  it("splits at the separator nearest the middle, else halves CJK", () => {
    expect(splitLabel("门诊大厅 · 挂号咨询")).toEqual(["门诊大厅", "挂号咨询"]);
    expect(splitLabel("Radiology Control Room")).toEqual(["Radiology", "Control Room"]);
    expect(splitLabel("医生办公室")).toEqual(["医生办", "公室"]);
  });
});

describe("map floors (multi-level facilities)", () => {
  /** A 2D context that records the calls and property writes drawMap makes. */
  function recorder() {
    const calls: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get(_, k) {
        if (k === "measureText") return (t: string) => ({ width: t.length * 6 });
        return (...args: unknown[]) => calls.push(`${String(k)}(${args.length ? args.map((a) => (typeof a === "number" ? Math.round(a) : String(a))).join(",") : ""})`);
      },
      set(_, k, v) {
        calls.push(`${String(k)}=${String(v)}`);
        return true;
      },
    });
    return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
  }
  const data: MapData = {
    bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
    ground: "grass",
    paths: [],
    ponds: [],
    trees: [],
    buildZone: null,
    buildZoneLabel: "",
    buildings: [{ x: 0, z: 0, w: 16, d: 12, name: "H" }],
    rooms: [],
    walls: [],
    placements: [],
    slots: [],
    staff: [],
    northLabel: "N",
  };
  const opts = { big: true, waypoint: { x: 2, z: 2 }, player: { x: 0, z: 0, yaw: 0 } };
  it("a single-level map draws exactly as before (no symbols, badge or fading)", () => {
    const a = recorder();
    drawMap(a.ctx, 200, 200, data, opts);
    expect(a.calls.some((c) => c.startsWith("strokeRect"))).toBe(false);
    expect(a.calls.filter((c) => c.startsWith("globalAlpha="))).toEqual([]);
  });
  it("draws stairs and elevator symbols and the floor badge", () => {
    const b = recorder();
    const connectors: MapData["connectors"] = [
      { kind: "elevator", x: 5, z: 3, w: 2.4, d: 2.4, label: "Elevator" },
      { kind: "stairs", x: -5, z: 5, w: 2, d: 6.4, axis: "z", label: "Stairs" },
    ];
    drawMap(b.ctx, 200, 200, { ...data, connectors, levelLabel: "First floor" }, opts);
    expect(b.calls.filter((c) => c.startsWith("strokeRect"))).toHaveLength(2);
    expect(b.calls.some((c) => c.startsWith("fillText(First floor"))).toBe(true);
  });
  it("fades the avatar and the destination shown on another floor", () => {
    const c = recorder();
    drawMap(c.ctx, 200, 200, { ...data, levelLabel: "Ground floor" }, { ...opts, playerGhost: true, waypointGhost: true });
    expect(c.calls.filter((x) => x.startsWith("globalAlpha="))).toEqual(["globalAlpha=0.4", "globalAlpha=1", "globalAlpha=0.35"]);
  });
});
