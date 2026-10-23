/**
 * Emit JSON Schemas for editors from the zod contracts in
 * `@clinicalcraft/core` (`packages/core/src/schema/*`), the agent settings
 * schema (`packages/agent/src/settings/schema.ts`), the benchmark
 * scenario schema (`packages/bench/src/schema.ts`) and the grounding-set
 * schema (`packages/bench/src/grounding/schema.ts`).
 *
 *   npx tsx scripts/gen-json-schemas.ts          # write packages/content/schemas/*.schema.json (case, facility, room-template, equipment-catalog, settings, skill, bench-scenario, grounding-set)
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
  RoomTemplateSchema,
  VitalsSchema,
  VoxelPartSchema,
  WorldPredicateSchema,
} from "../packages/core/src/schema/index.js";
import { SettingsLayerSchema, SettingsSchema } from "../packages/agent/src/settings/schema.js";
import { SkillJsonSchema, SkillPredicateSchema, SkillSchema } from "../packages/agent/src/skills/schema.js";
import { BenchJsonSchema, BenchScenarioSchema, NavGoalSchema } from "../packages/bench/src/schema.js";
import { GroundingSetSchema } from "../packages/bench/src/grounding/schema.js";
// The bench and skill schemas import the core contracts by package name: reference the same instances so they become `$ref`s.
import * as benchCore from "@clinicalcraft/core";

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
    description: "A voxel clinical environment: bounds, terrain, buildings, rooms, equipment placements, patient slots, staff, build zone, levels, connectors and access zones.",
    schema: FacilitySchema,
    definitions: { ...common, Rect: RectSchema, Opening: OpeningSchema, Material: MaterialSchema },
  },
  {
    file: "equipment-catalog.schema.json",
    name: "EquipmentCatalog",
    title: "ClinicalCraft equipment catalog (clinicalcraft/equipment-catalog@1)",
    description: "Materials (procedural pixel textures) and equipment types (voxel parts, footprint, capabilities, interaction, embodiment: portable, reach, interaction points, behaviour, model).",
    schema: EquipmentCatalogSchema,
    definitions: { ...common, Material: MaterialSchema, VoxelPart: VoxelPartSchema, EquipmentType: EquipmentTypeSchema, WorldPredicate: WorldPredicateSchema },
  },
  {
    file: "room-template.schema.json",
    name: "RoomTemplate",
    title: "ClinicalCraft room template (clinicalcraft/room-template@1)",
    description: "A reusable room placed by facility `instances` and compiled into the flat facility format: size, kind, partitions, sign, lights, equipment, patient slots, staff and interaction zones in template-local coordinates.",
    schema: RoomTemplateSchema,
    definitions: { ...common, Rect: RectSchema, Opening: OpeningSchema, VoxelPart: VoxelPartSchema },
  },
  {
    file: "settings.schema.json",
    name: "Settings",
    title: "ClinicalCraft settings (~/.clinicalcraft/settings.json, .clinicalcraft/settings[.local].json)",
    description: "Layered runtime settings: provider/model per agent, approval mode, practice scope, permission rules, hooks, profiles, server and transcripts.",
    schema: SettingsSchema,
    definitions: { SettingsLayer: SettingsLayerSchema },
  },
  {
    file: "skill.schema.json",
    name: "Skill",
    title: "ClinicalCraft skill (clinicalcraft/skill@1)",
    description:
      "An embodied-mode skill (.clinicalcraft/skills/*.json): typed parameters, safety class, preconditions, steps (tool calls with ${param} / ${steps.<id>.data.<path>} templates, when, retry, onError), postconditions and recovery strategies. Data, never code.",
    schema: SkillSchema,
    // The skill schema imports the core contracts by package name (like the bench schema): the same instances, so
    // generation gives the same `$ref`s whether `@clinicalcraft/core` resolves to its sources or to dist.
    definitions: { Id: benchCore.IdSchema, LocalizedText: benchCore.LocalizedTextSchema, SkillPredicate: SkillPredicateSchema, JsonValue: SkillJsonSchema },
  },
  {
    file: "bench-scenario.schema.json",
    name: "BenchScenario",
    title: "ClinicalCraft embodied benchmark scenario (clinicalcraft/bench-scenario@1)",
    description:
      "One scenario of the embodied agent benchmark (packages/content/bench/<suite>/*.json): case and facility, setup (the clinician's pose, dynamic obstacles, devices out of service, doors, staff actions, approval mode and answering policy, permission rules, practice scope), the task, success predicates evaluated on the final authoritative state, limits, the reference solver's steps and the scripted model plan.",
    schema: BenchScenarioSchema,
    definitions: {
      Id: benchCore.IdSchema,
      LocalizedText: benchCore.LocalizedTextSchema,
      Condition: benchCore.ConditionSchema,
      ClinicalAction: benchCore.ClinicalActionSchema,
      NavGoal: NavGoalSchema,
      JsonValue: BenchJsonSchema,
    },
  },
  {
    file: "grounding-set.schema.json",
    name: "GroundingSet",
    title: "ClinicalCraft grounding set (clinicalcraft/grounding-set@1)",
    description:
      "One file of the grounding benchmark (packages/content/grounding/<suite>/<split>/*.json, docs/GROUNDING.md): held-out free-text items for the patient's fact selection (history), the clinical tools' argument resolution (exam, orders, interventions), the patient router (routing) and the voice grounding check (verifier).",
    schema: GroundingSetSchema,
    definitions: { Id: benchCore.IdSchema },
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
