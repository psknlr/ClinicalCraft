import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCatalog, parseFacility, type VoxelPart } from "@clinicalcraft/core";
import { labelColor, packShelves, placementParts, surfaceTop, surfaceUnder } from "./equipment.js";
import { partBox } from "./geometry.js";

type Part = { m: string; p: [number, number, number]; s: [number, number, number]; name?: string };
const t = (parts: Part[]) => ({ parts }) as never;

describe("surfaceTop (patient on a bed / seat)", () => {
  it("uses the mattress, not the pillow lying on it (hospital bed)", () => {
    const bed = t([
      { m: "plastic", p: [0, 0.24, 0], s: [0.84, 0.12, 1.9] },
      { m: "mattress", p: [0, 0.56, 0], s: [0.88, 0.12, 1.92] },
      { m: "white", p: [0, 0.67, -0.77], s: [0.6, 0.1, 0.3] },
      { m: "plastic", p: [0, 0.625, -1.05], s: [0.96, 0.65, 0.1] },
    ]);
    expect(surfaceTop(bed)).toBeCloseTo(0.62);
  });
  it("counts segmented pads together (operating table)", () => {
    const table = t([
      { m: "steel", p: [0, 0.75, 0], s: [0.65, 0.06, 1.6] },
      { m: "navy", p: [0, 0.83, -0.6], s: [0.5, 0.06, 0.73] },
      { m: "navy", p: [0, 0.83, 0.2], s: [0.5, 0.06, 0.56] },
      { m: "navy", p: [0, 0.83, 0.75], s: [0.5, 0.06, 0.4] },
    ]);
    expect(surfaceTop(table)).toBeCloseTo(0.86);
  });
  it("prefers a part named mattress/seat and falls back to 0.9", () => {
    expect(surfaceTop(t([{ m: "x", p: [0, 0.45, 0], s: [0.4, 0.1, 0.4], name: "seat" }, { m: "x", p: [0, 0.9, 0], s: [1, 0.1, 1] }]))).toBeCloseTo(0.5);
    expect(surfaceTop(undefined)).toBe(0.9);
    expect(surfaceTop(t([{ m: "x", p: [0, 1, 0], s: [0.1, 2, 0.1] }]))).toBe(0.9);
  });
});

describe("surfaceUnder (a patient lying on a scanner's table, EMBODIED §8)", () => {
  // a CT: the table under the patient (0.8 m), the gantry's flat top (1.25 m) at the other end
  const ct = t([
    { m: "white", p: [0, 0.4, 0.4], s: [0.6, 0.8, 2.6] },
    { m: "white", p: [0, 1.2, -1.4], s: [2, 0.1, 0.95] },
  ]);
  it("is the top of what is under the point, not the gantry's", () => {
    expect(surfaceTop(ct)).toBeCloseTo(1.25);
    expect(surfaceUnder(ct, 0, 0, 0)).toBeCloseTo(0.8);
    // turned by 90°: the table now lies along x; a point on it, in world axes
    expect(surfaceUnder(ct, 90, 0.4, 0)).toBeCloseTo(0.8);
    expect(surfaceUnder(ct, 90, -1.4, 0)).toBeCloseTo(1.25);
  });
  it("a named mattress wins; nothing under the point: surfaceTop", () => {
    expect(surfaceUnder(t([{ m: "x", p: [0, 0.55, 0], s: [0.8, 0.1, 1.9], name: "mattress" }]), 0, 3, 3)).toBeCloseTo(0.6);
    expect(surfaceUnder(ct, 0, 5, 5)).toBeCloseTo(surfaceTop(ct));
  });
});

describe("station label colours", () => {
  it("follows V4 station colours by kind / capability family", () => {
    expect(labelColor("board", [])).toBe("#716541");
    expect(labelColor("workstation", ["lab-hematology"])).toBe("#f2c978");
    expect(labelColor("workstation", ["histopathology"])).toBe("#c7a1e5");
    expect(labelColor("workstation", ["ct"])).toBe("#79c9e6");
  });
});

describe("static screen atlas packing", () => {
  it("packs rectangles without overlap inside the atlas width", () => {
    const sizes = [
      { w: 64, h: 40 },
      { w: 32, h: 8 },
      { w: 64, h: 213 },
      ...Array.from({ length: 20 }, (_, i) => ({ w: 64, h: 16 + i * 3 })),
    ];
    const { rects, width, height } = packShelves(sizes, 256);
    expect(width).toBe(256);
    const boxes = sizes.map((s, i) => ({ x0: rects[i].x, y0: rects[i].y, x1: rects[i].x + s.w, y1: rects[i].y + s.h }));
    for (const b of boxes) {
      expect(b.x1).toBeLessThanOrEqual(256);
      expect(b.y1).toBeLessThanOrEqual(height);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1).toBe(false);
      }
  });
});

describe("placement extraParts / hideParts", () => {
  const part = (m: string, p: [number, number, number], s: [number, number, number], name?: string): VoxelPart => ({ m, p, s, anim: "none", ...(name ? { name } : {}) });
  const type = { parts: [part("wood", [0, 0.88, 0], [3, 0.16, 1.4]), part("coal", [0, 1.53, 0], [1.45, 1.02, 0.14]), part("screen", [0, 1.54, 0.082], [1.29, 0.85, 0.025], "screen")] };

  it("renders the type's parts minus hidden indices, then the extra parts", () => {
    expect(placementParts(type, {})).toBe(type.parts);
    const tube = part("white", [-0.97, 1.17, 0.15], [0.11, 0.4, 0.11]);
    expect(placementParts(type, { extraParts: [tube] })).toEqual([...type.parts, tube]);
    const moved = [part("coal", [0.6, 1.53, 0], [1.45, 1.02, 0.14]), part("screen", [0.6, 1.54, 0.082], [1.29, 0.85, 0.025], "screen")];
    expect(placementParts(type, { hideParts: [1, 2], extraParts: moved })).toEqual([type.parts[0], ...moved]);
    expect(placementParts(type, { hideParts: [0, 1, 2, 7] })).toEqual([]);
  });

  it("rotates extra parts with the placement (origin = footprint centre)", () => {
    // V4 microscope base: local (−0.82, 1.03, 0.08), 0.5 × 0.12 × 0.55
    const base = part("white", [-0.82, 1.03, 0.08], [0.5, 0.12, 0.55]);
    const centre = (rot: number) => {
      const b = partBox({ x: 8, z: -7, rot }, base);
      return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2, b.maxX - b.minX, b.maxZ - b.minZ];
    };
    const expectClose = (got: number[], want: number[]) => want.forEach((w, i) => expect(got[i]).toBeCloseTo(w, 6));
    expectClose(centre(0), [7.18, 1.03, -6.92, 0.5, 0.55]);
    expectClose(centre(90), [8.08, 1.03, -6.18, 0.55, 0.5]); // local +X → world −Z, local +Z → world +X
    expectClose(centre(180), [8.82, 1.03, -7.08, 0.5, 0.55]);
    expectClose(centre(270), [7.92, 1.03, -7.82, 0.55, 0.5]);
  });

  describe("clinic-v4 V4 station details", () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const content = path.resolve(here, "../../../content");
    const readJson = (rel: string): unknown => JSON.parse(fs.readFileSync(path.join(content, rel), "utf8"));
    const fr = parseFacility(readJson("facilities/clinic-v4.json"));
    const cr = parseCatalog(readJson("catalogs/core-furniture.json"));
    if (!fr.ok || !cr.ok) throw new Error("clinic-v4 / core-furniture invalid");
    const workstation = cr.value.equipment.find((e) => e.id === "workstation")!;
    const placement = (id: string) => fr.value.placements.find((p) => p.id === id)!;
    const round = (parts: VoxelPart[]) => parts.map((q) => ({ ...q, p: q.p.map((v) => +v.toFixed(3)), s: q.s.map((v) => +v.toFixed(3)) }));

    it("lab: four white test tubes with red caps (V4 custom_cn.js: x = −0.97 + i × 0.17)", () => {
      const lab = placement("ws-lab");
      expect(lab.hideParts).toBeUndefined();
      const want: VoxelPart[] = [];
      for (let i = 0; i < 4; i++) {
        want.push(part("white", [-0.97 + i * 0.17, 1.17, 0.15], [0.11, 0.4, 0.11]), part("red", [-0.97 + i * 0.17, 1.38, 0.15], [0.12, 0.05, 0.12]));
      }
      expect(round(lab.extraParts ?? [])).toEqual(round(want));
    });

    it("pathology: the monitor assembly moves 0.6 m right (V4 Q(L, .6)) and a microscope stands on the left", () => {
      const pathology = placement("ws-pathology");
      const hidden = (pathology.hideParts ?? []).map((i) => workstation.parts[i]);
      // only the monitor assembly is hidden — the desk top and legs (below the desk surface) stay
      expect(hidden.length).toBeGreaterThan(0);
      expect(workstation.parts.filter((q) => !hidden.includes(q)).every((q) => q.p[1] + q.s[1] / 2 <= 0.97)).toBe(true);
      expect(hidden.some((q) => q.name === "screen")).toBe(true);
      // every hidden part comes back shifted by +0.6 m along X (same material, size and name)
      const extras = pathology.extraParts ?? [];
      const shifted = hidden.map((q) => ({ ...q, p: [q.p[0] + 0.6, q.p[1], q.p[2]] as [number, number, number] }));
      expect(round(extras.slice(0, shifted.length))).toEqual(round(shifted));
      expect(round(extras.slice(shifted.length))).toEqual(
        round([
          part("white", [-0.82, 1.03, 0.08], [0.5, 0.12, 0.55]),
          part("coal", [-0.8, 1.38, 0], [0.17, 0.65, 0.14]),
          part("white", [-0.65, 1.7, 0.15], [0.22, 0.17, 0.42]),
          part("coal", [-0.55, 1.6, 0.35], [0.15, 0.3, 0.15]),
        ]),
      );
      const rendered = placementParts(workstation, pathology);
      expect(rendered.filter((q) => q.name === "screen")).toHaveLength(1);
      expect(rendered.find((q) => q.name === "screen")!.p[0]).toBeCloseTo(0.6);
    });
  });
});
