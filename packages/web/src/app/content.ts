/**
 * Built-in content, bundled at build time (eager `import.meta.glob` of
 * packages/content): cases, facilities and equipment catalogs, validated
 * with the core parsers. Cases are parsed lazily (the library only needs the
 * card fields) and cached.
 */
import {
  parseCase,
  parseCatalog,
  parseFacility,
  type CaseDefinition,
  type EquipmentCatalog,
  type FacilityDefinition,
  type LocalizedText,
} from "@clinicalcraft/core";

const caseFiles = import.meta.glob("../../../content/cases/*/case.json", { eager: true, import: "default" }) as Record<string, unknown>;
const facilityFiles = import.meta.glob("../../../content/facilities/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const catalogFiles = import.meta.glob("../../../content/catalogs/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

/** What the case library shows (read from the raw JSON without a full parse). */
export interface CaseCard {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  specialty: string[];
  difficulty: number;
  setting: string;
  facility: string | null;
  locales: string[];
  estimatedMinutes: number | null;
  provenance: string;
  tags: string[];
  physiology: boolean;
  objectives: number;
  label: LocalizedText | null;
}

export interface ContentIndex {
  cards: CaseCard[];
  facilities: Map<string, FacilityDefinition>;
  catalogs: Map<string, EquipmentCatalog>;
  issues: string[];
  getCase(id: string): CaseDefinition | null;
  caseIssues(id: string): string[];
  catalogsFor(facility: FacilityDefinition): EquipmentCatalog[];
  /** Facilities that can host a case (clinic-v4 only for outpatient cases; a facility needs a slot accepting the setting). */
  facilitiesFor(card: CaseCard): FacilityDefinition[];
  defaultFacility(card: CaseCard): FacilityDefinition | null;
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function card(raw: unknown): CaseCard | null {
  const r = obj(raw);
  if (typeof r.id !== "string") return null;
  const ext = obj(obj(r.extensions).v4);
  return {
    id: r.id,
    title: (r.title as LocalizedText) ?? r.id,
    summary: (r.summary as LocalizedText) ?? "",
    specialty: Array.isArray(r.specialty) ? (r.specialty as string[]) : [],
    difficulty: typeof r.difficulty === "number" ? r.difficulty : 1,
    setting: typeof r.setting === "string" ? r.setting : "outpatient",
    facility: typeof r.facility === "string" ? r.facility : null,
    locales: Array.isArray(r.locales) ? (r.locales as string[]) : [],
    estimatedMinutes: typeof r.estimatedMinutes === "number" ? r.estimatedMinutes : null,
    provenance: typeof obj(r.provenance).kind === "string" ? (obj(r.provenance).kind as string) : "synthetic",
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    physiology: r.physiology != null,
    objectives: Array.isArray(r.objectives) ? r.objectives.length : 0,
    label: (ext.caseLabel as LocalizedText) ?? null,
  };
}

function fmt(file: string, issues: { path: string; message: string }[]): string[] {
  return issues.slice(0, 6).map((i) => `${file.replace(/^.*content\//, "")}: ${i.path || "(root)"} — ${i.message}`);
}

let cached: ContentIndex | null = null;

export function loadContent(): ContentIndex {
  if (cached) return cached;
  const issues: string[] = [];
  const raws = new Map<string, unknown>();
  const cards: CaseCard[] = [];
  for (const [file, json] of Object.entries(caseFiles)) {
    const c = card(json);
    if (!c) {
      issues.push(`${file}: missing id`);
      continue;
    }
    raws.set(c.id, json);
    cards.push(c);
  }
  // Published cases first (V4 CASE 01), then by difficulty and id.
  cards.sort((a, b) => Number(b.provenance === "published-case") - Number(a.provenance === "published-case") || a.difficulty - b.difficulty || a.id.localeCompare(b.id));

  const catalogs = new Map<string, EquipmentCatalog>();
  const catalogEntries = Object.entries(catalogFiles).sort(([a], [b]) => (a.endsWith("/materials.json") ? -1 : b.endsWith("/materials.json") ? 1 : a.localeCompare(b)));
  for (const [file, json] of catalogEntries) {
    const r = parseCatalog(json);
    if (r.ok) catalogs.set(r.value.id, r.value);
    else issues.push(...fmt(file, r.issues));
  }
  const facilities = new Map<string, FacilityDefinition>();
  for (const [file, json] of Object.entries(facilityFiles)) {
    const r = parseFacility(json);
    if (r.ok) facilities.set(r.value.id, r.value);
    else issues.push(...fmt(file, r.issues));
  }

  const parsedCases = new Map<string, CaseDefinition | null>();
  const caseIssueMap = new Map<string, string[]>();
  const getCase = (id: string): CaseDefinition | null => {
    if (parsedCases.has(id)) return parsedCases.get(id) ?? null;
    const raw = raws.get(id);
    if (raw === undefined) return null;
    const r = parseCase(raw);
    if (r.ok) {
      parsedCases.set(id, r.value);
      return r.value;
    }
    caseIssueMap.set(id, fmt(`cases/${id}/case.json`, r.issues));
    parsedCases.set(id, null);
    return null;
  };

  const catalogsFor = (facility: FacilityDefinition): EquipmentCatalog[] => {
    const listed = (facility.catalogs ?? []).map((id) => catalogs.get(id)).filter((c): c is EquipmentCatalog => !!c);
    return listed.length ? listed : [...catalogs.values()];
  };

  const facilitiesFor = (c: CaseCard): FacilityDefinition[] =>
    [...facilities.values()].filter((f) => {
      if (f.id === "clinic-v4" && c.setting !== "outpatient") return false;
      return f.patientSlots.some((s) => s.accepts.includes(c.setting as never)) || f.id === c.facility;
    });

  const defaultFacility = (c: CaseCard): FacilityDefinition | null => {
    const options = facilitiesFor(c);
    return (c.facility ? options.find((f) => f.id === c.facility) : undefined) ?? options.find((f) => f.id === "general-hospital") ?? options[0] ?? null;
  };

  cached = { cards, facilities, catalogs, issues, getCase, caseIssues: (id) => caseIssueMap.get(id) ?? [], catalogsFor, facilitiesFor, defaultFacility };
  return cached;
}
