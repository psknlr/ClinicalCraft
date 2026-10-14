/**
 * Emit JSON Schemas for content authors' editors from the zod contract in
 * `@clinicalcraft/core` (`packages/core/src/schema/*`).
 *
 *   npx tsx scripts/gen-json-schemas.ts          # write packages/content/schemas/*.schema.json
 *   npx tsx scripts/gen-json-schemas.ts --check  # exit 1 if the files on disk are stale
 *
 * Shared building blocks (LocalizedText, Id, Condition, …) become named
 * `definitions` referenced by `$ref`; everything else is inlined
 * (`$refStrategy: "none"`). The recursive Condition DSL is only ever emitted
 * as a `$ref`, so generation terminates and the recursion is preserved.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import type { ZodTypeAny } from "zod";
import { ignoreOverride, zodToJsonSchema } from "zod-to-json-schema";
import {
  AppearanceSchema,
  AssetRefSchema,
  CapabilitySchema,
  CaseSchema,
  ClinicalActionSchema,
  ConditionSchema,
  EquipmentCatalogSchema,
  EquipmentTypeSchema,
  FacilitySchema,
  HexColorSchema,
  IdSchema,
  LocalizedListSchema,
  LocalizedTextSchema,
  MaterialSchema,
  OpeningSchema,
  RectSchema,
  VitalsSchema,
  VoxelPartSchema,
} from "../packages/core/src/schema/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "packages/content/schemas");

interface Target {
  file: string;
  name: string;
  title: string;
  description: string;
  schema: ZodTypeAny;
  /** Named shared definitions (referenced by `$ref` wherever the same zod instance is used). */
  definitions: Record<string, ZodTypeAny>;
}

const common = {
  Id: IdSchema,
  LocalizedText: LocalizedTextSchema,
  Capability: CapabilitySchema,
  HexColor: HexColorSchema,
};

const targets: Target[] = [
  {
    file: "case.schema.json",
    name: "Case",
    title: "ClinicalCraft case (clinicalcraft/case@1)",
    description: "A virtual-patient case: patient, phases, history, exam, investigations, interventions, physiology, objectives, decisions, rubric and debrief.",
    schema: CaseSchema,
    definitions: {
      ...common,
      LocalizedList: LocalizedListSchema,
      Condition: ConditionSchema,
      ClinicalAction: ClinicalActionSchema,
      Vitals: VitalsSchema,
      AssetRef: AssetRefSchema,
      Appearance: AppearanceSchema,
    },
  },
  {
    file: "facility.schema.json",
    name: "Facility",
    title: "ClinicalCraft facility (clinicalcraft/facility@1)",
    description: "A voxel clinical environment: bounds, terrain, buildings, rooms, equipment placements, patient slots, staff and build zone.",
    schema: FacilitySchema,
    definitions: { ...common, Rect: RectSchema, Opening: OpeningSchema, Material: MaterialSchema },
  },
  {
    file: "equipment-catalog.schema.json",
    name: "EquipmentCatalog",
    title: "ClinicalCraft equipment catalog (clinicalcraft/equipment-catalog@1)",
    description: "Materials (procedural pixel textures) and equipment types (voxel parts, footprint, capabilities, interaction).",
    schema: EquipmentCatalogSchema,
    definitions: { ...common, Material: MaterialSchema, VoxelPart: VoxelPartSchema, EquipmentType: EquipmentTypeSchema },
  },
];

/** Generate one JSON Schema document. */
function generate(target: Target): Record<string, unknown> {
  const nameOf = new Map<unknown, string>(Object.entries(target.definitions).map(([name, schema]) => [schema._def, name]));
  const json = zodToJsonSchema(target.schema, {
    name: target.name,
    $refStrategy: "none",
    definitions: target.definitions,
    // Shared schemas are emitted once under `definitions`; every other use is a `$ref`.
    // `forceResolution` is true only while emitting the definition itself.
    override: (def, _refs, _seen, forceResolution) => {
      const name = nameOf.get(def);
      return name && !forceResolution ? { $ref: `#/definitions/${name}` } : ignoreOverride;
    },
  }) as Record<string, unknown>;
  const { $schema, ...rest } = json;
  return { $schema, title: target.title, description: target.description, ...rest };
}

function main(): void {
  const check = process.argv.includes("--check");
  mkdirSync(outDir, { recursive: true });
  let stale = 0;
  for (const target of targets) {
    const path = join(outDir, target.file);
    const text = `${JSON.stringify(generate(target), null, 2)}\n`;
    const label = relative(root, path);
    if (check) {
      let current = "";
      try {
        current = readFileSync(path, "utf8");
      } catch {
        // missing file counts as stale
      }
      if (current !== text) {
        stale++;
        console.error(`stale: ${label}`);
      }
      continue;
    }
    writeFileSync(path, text);
    console.log(`wrote ${label} (${(text.length / 1024).toFixed(1)} KiB)`);
  }
  if (stale > 0) {
    console.error(`${stale} schema file(s) out of date — run: npx tsx scripts/gen-json-schemas.ts`);
    process.exit(1);
  }
}

main();
