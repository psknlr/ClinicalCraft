/**
 * Test-only helpers (excluded from the build): load the built-in facilities
 * (compiled when they place room templates), room templates and catalogs
 * from packages/content, a synthetic two-level facility, and a canonical
 * digest of a collider set (parity pins).
 */
import { readdirSync, readFileSync } from "node:fs";
import { compileFacility, parseCatalog, parseFacility, parseRoomTemplate, type EquipmentCatalog, type FacilityDefinition, type FacilityInput, type RoomTemplate } from "@clinicalcraft/core";

const CONTENT = new URL("../../../content/", import.meta.url);
const readJson = (rel: string): unknown => JSON.parse(readFileSync(new URL(rel, CONTENT), "utf8"));

/** Every built-in catalog (materials first, as the front-ends load them). */
export function loadCatalogs(): EquipmentCatalog[] {
  return ["materials", "core-clinical", "core-diagnostics", "core-furniture"].map((id) => {
    const r = parseCatalog(readJson(`catalogs/${id}.json`));
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.issues)}`);
    return r.value;
  });
}

/** Every built-in room template (packages/content/templates). */
export function loadTemplates(): RoomTemplate[] {
  return readdirSync(new URL("templates/", CONTENT))
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => {
      const r = parseRoomTemplate(readJson(`templates/${file}`));
      if (!r.ok) throw new Error(`${file}: ${JSON.stringify(r.issues)}`);
      return r.value;
    });
}

/** A built-in facility, parsed — and compiled when it places room templates (as every front-end loads it). */
export function loadFacility(id: "clinic-v4" | "general-hospital" | "teaching-hospital"): FacilityDefinition {
  const r = parseFacility(readJson(`facilities/${id}.json`));
  if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.issues)}`);
  if (!r.value.instances.length) return r.value;
  const compiled = compileFacility(r.value, loadTemplates());
  if (!compiled.ok) throw new Error(`${id}: ${JSON.stringify(compiled.issues)}`);
  return compiled.facility;
}

/** Parse an inline facility (fixtures). */
export function facilityFrom(input: FacilityInput): FacilityDefinition {
  const r = parseFacility(input);
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.value;
}

/** Canonical key of a box (rounded to 1e-6), plus "|door" for door leaves. */
export function boxKey(b: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }, door = false): string {
  return [b.minX, b.maxX, b.minY, b.maxY, b.minZ, b.maxZ].map((v) => (Math.round(v * 1e6) / 1e6).toFixed(6)).join(",") + (door ? "|door" : "");
}

/** FNV-1a (32-bit) over the sorted box keys: an order-independent fingerprint of a collider set. */
export function colliderDigest(boxes: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number; door?: boolean; kind?: string }[]): string {
  const text = boxes
    .map((b) => boxKey(b, b.door ?? b.kind === "door"))
    .sort()
    .join("\n");
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
