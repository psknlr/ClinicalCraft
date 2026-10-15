/**
 * Content API payloads (`/api/content/*`): a spoiler-free library index with
 * every locale of each localised field, full cases with the reference
 * `solution` removed, facilities and equipment catalogs.
 */
import type { CaseDefinition, EquipmentCatalog, FacilityDefinition } from "@clinicalcraft/core";
import type { LoadedContent } from "@clinicalcraft/agent/node";

/** One case in the library index (localised fields keep all locales). */
export interface CaseSummary {
  id: string;
  version: string;
  title: CaseDefinition["title"];
  summary: CaseDefinition["summary"];
  specialty: string[];
  difficulty: number;
  setting: CaseDefinition["setting"];
  facility: string | null;
  estimatedMinutes: number | null;
  provenance: { kind: CaseDefinition["provenance"]["kind"] };
  tags: string[];
  locales: string[];
}

export interface FacilitySummary {
  id: string;
  name: FacilityDefinition["name"];
  description: FacilityDefinition["description"];
  catalogs: string[];
}

export interface CatalogSummary {
  id: string;
  name: EquipmentCatalog["name"];
  equipment: number;
  materials: number;
}

export interface ContentIndex {
  cases: CaseSummary[];
  facilities: FacilitySummary[];
  catalogs: CatalogSummary[];
}

/** Library entry for a case (no patient data, answers or solution). */
export function caseSummary(c: CaseDefinition): CaseSummary {
  return {
    id: c.id,
    version: c.version,
    title: c.title,
    summary: c.summary,
    specialty: [...c.specialty],
    difficulty: c.difficulty,
    setting: c.setting,
    facility: c.facility ?? null,
    estimatedMinutes: c.estimatedMinutes ?? null,
    provenance: { kind: c.provenance.kind },
    tags: [...c.tags],
    locales: [...c.locales],
  };
}

/** The content index served at `GET /api/content/index` (sorted by id). */
export function contentIndex(content: Pick<LoadedContent, "cases" | "facilities" | "catalogs">): ContentIndex {
  const byId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id);
  return {
    cases: [...content.cases.values()].map((e) => caseSummary(e.def)).sort(byId),
    facilities: [...content.facilities.values()]
      .map(({ def }) => ({ id: def.id, name: def.name, description: def.description, catalogs: [...def.catalogs] }))
      .sort(byId),
    catalogs: [...content.catalogs.values()]
      .map(({ def }) => ({ id: def.id, name: def.name, equipment: def.equipment.length, materials: def.materials.length }))
      .sort(byId),
  };
}

/** A case as served to clients: everything except the reference walkthrough. */
export function publicCase(c: CaseDefinition): Omit<CaseDefinition, "solution"> {
  const { solution: _solution, ...rest } = c;
  return rest;
}
