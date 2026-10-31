/**
 * The built-in equipment models (assets/models, built by scripts/blender/build.py; docs/BLENDER.md):
 * every built-in type has one; every catalog `model` reference points at a shipped file whose
 * SHA-256 it pins, the file passes the inspector against the type's footprint
 * (`checkModelReference`: no errors) and is cleared for redistribution; no model file is left
 * without a reference.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkModelReference, parseGlb, type EquipmentCatalog } from "@clinicalcraft/core";

const root = new URL("../", import.meta.url);
const catalogs = readdirSync(new URL("catalogs/", root))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(new URL(`catalogs/${f}`, root), "utf8")) as EquipmentCatalog);
const modelled = catalogs.flatMap((c) => c.equipment.filter((e) => e.model).map((e) => ({ catalog: c.id, type: e })));

describe("built-in equipment models", () => {
  it("cover every built-in equipment type (scripts/blender/build.py builds one for each)", () => {
    const missing = catalogs.flatMap((c) => c.equipment.filter((e) => !e.model).map((e) => `${c.id}/${e.id}`));
    expect(missing).toEqual([]);
    expect(modelled.length).toBeGreaterThan(0);
  });

  it.each(modelled.map((m) => [m.type.id, m] as const))("%s: the pinned file passes the inspector and is cleared", (_, { type }) => {
    const model = type.model!;
    const bytes = new Uint8Array(readFileSync(new URL(`assets/${model.uri}`, root)));
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    expect(model.sha256).toBe(sha256);
    expect(model.use).toBe("cleared");
    expect(model.source?.name).toBeTruthy();
    const errors = checkModelReference(parseGlb(bytes), model, type.footprint, { sha256 }).filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });

  it("leaves no model file without a reference", () => {
    const files = readdirSync(new URL("assets/models/", root)).filter((f) => f.endsWith(".glb"));
    const referenced = new Set(modelled.map((m) => m.type.model!.uri));
    expect(files.filter((f) => !referenced.has(`models/${f}`))).toEqual([]);
  });
});
