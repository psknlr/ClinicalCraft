/**
 * Harness content loading: every facility, room template and catalog JSON in
 * packages/content (eager import.meta.glob), validated with the core zod
 * schemas; facilities placing templates are compiled. Missing or invalid
 * files fall back to the built-in test data.
 */
import type { EquipmentCatalog, FacilityDefinition, RoomTemplate } from "@clinicalcraft/core";
// Schemas and the template compiler only (not the core barrel): the harness keeps working while the engine is under construction.
import { EquipmentCatalogSchema, FacilitySchema, RoomTemplateSchema } from "../../../core/src/schema/facility.js";
import { compileFacility } from "../../../core/src/engine/templates.js";
import { TEST_CATALOG, TEST_FACILITY } from "./test-facility.js";

const facilityFiles = import.meta.glob("../../../content/facilities/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const catalogFiles = import.meta.glob("../../../content/catalogs/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const templateFiles = import.meta.glob("../../../content/templates/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

export interface LoadedContent {
  facilities: Map<string, FacilityDefinition>;
  catalogs: EquipmentCatalog[];
  issues: string[];
}

function fmtIssues(file: string, error: { issues: { path: (string | number)[]; message: string }[] }): string[] {
  return error.issues.slice(0, 8).map((i) => `${file}: ${i.path.join(".")} — ${i.message}`);
}

export function loadContent(): LoadedContent {
  const issues: string[] = [];
  const catalogs: EquipmentCatalog[] = [];
  const test = EquipmentCatalogSchema.safeParse(TEST_CATALOG);
  if (test.success) catalogs.push(test.data);
  else issues.push(...fmtIssues("test-catalog", test.error));
  // materials.json first (V4 texture stream order), then the rest alphabetically
  const entries = Object.entries(catalogFiles).sort(([a], [b]) => (a.endsWith("/materials.json") ? -1 : b.endsWith("/materials.json") ? 1 : a.localeCompare(b)));
  for (const [file, json] of entries) {
    const r = EquipmentCatalogSchema.safeParse(json);
    if (r.success) catalogs.push(r.data);
    else issues.push(...fmtIssues(file, r.error));
  }
  const templates: RoomTemplate[] = [];
  for (const [file, json] of Object.entries(templateFiles).sort(([a], [b]) => a.localeCompare(b))) {
    const r = RoomTemplateSchema.safeParse(json);
    if (r.success) templates.push(r.data);
    else issues.push(...fmtIssues(file, r.error));
  }
  const facilities = new Map<string, FacilityDefinition>();
  const tf = FacilitySchema.safeParse(TEST_FACILITY);
  if (tf.success) facilities.set(tf.data.id, tf.data);
  else issues.push(...fmtIssues("test-facility", tf.error));
  for (const [file, json] of Object.entries(facilityFiles)) {
    const r = FacilitySchema.safeParse(json);
    if (!r.success) {
      issues.push(...fmtIssues(file, r.error));
      continue;
    }
    // room-template instances are expanded into the flat format the world renders
    const compiled = compileFacility(r.data, templates);
    if (compiled.ok) facilities.set(compiled.facility.id, compiled.facility);
    else issues.push(...compiled.issues.filter((i) => i.severity === "error").map((i) => `${file}: ${i.path} — ${i.message}`));
  }
  return { facilities, catalogs, issues };
}
