/**
 * Built-in content, bundled at build time (eager `import.meta.glob` of
 * packages/content): cases, facilities and equipment catalogs, validated
 * with the core parsers. Cases are parsed lazily (the library only needs the
 * card fields) and cached.
 */
import {
  caseCapabilityGaps,
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
  /** "Fictional teaching case — not medical advice" (shown before play; null when the case has none). */
  disclaimer: LocalizedText | null;
  /** "server": from `clinicalcraft serve`'s contentDirs (`/api/content/*`), not bundled; no reference solution. */
  source?: "bundled" | "server";
}

/** Content `clinicalcraft serve` offers (`/api/content/*` payloads), to add to the bundle. */
export interface ServerContent {
  cases: unknown[];
  facilities: unknown[];
  catalogs: unknown[];
}

export interface ContentIndex {
  cards: CaseCard[];
  facilities: Map<string, FacilityDefinition>;
  catalogs: Map<string, EquipmentCatalog>;
  issues: string[];
  getCase(id: string): CaseDefinition | null;
  caseIssues(id: string): string[];
  catalogsFor(facility: FacilityDefinition): EquipmentCatalog[];
  /**
   * Facilities that can host a case: a slot accepting its setting (clinic-v4 only for outpatient cases)
   * and every objective and decision completable with the facility's equipment (`caseCapabilityGaps`).
   */
  facilitiesFor(card: CaseCard): FacilityDefinition[];
  defaultFacility(card: CaseCard): FacilityDefinition | null;
  /**
   * Add server content (validated with the core parsers; bundled ids are
   * never replaced). Returns the number of cases, facilities and catalogs added.
   */
  addServerContent(payload: ServerContent): number;
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
    disclaimer: typeof r.disclaimer === "string" || (r.disclaimer && typeof r.disclaimer === "object") ? (r.disclaimer as LocalizedText) : null,
  };
}

function fmt(file: string, issues: { path: string; message: string }[]): string[] {
  return issues.slice(0, 6).map((i) => `${file.replace(/^.*content\//, "")}: ${i.path || "(root)"} — ${i.message}`);
}

let cached: ContentIndex | null = null;

/**
 * Library order, shared with the CLI picker, `cases list` and MCP
 * `list_cases` (`libraryOrder` in @clinicalcraft/agent): published cases
 * first (V4 CASE 01), then by difficulty, then by id (code-unit order).
 */
function compareCards(a: CaseCard, b: CaseCard): number {
  return Number(b.provenance === "published-case") - Number(a.provenance === "published-case") || a.difficulty - b.difficulty || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

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
    cards.push({ ...c, source: "bundled" });
  }
  cards.sort(compareCards);

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

  // A facility hosts a case only if the case can be completed there: no objective or decision needs
  // equipment (capabilities) the facility lacks (core `caseCapabilityGaps`).
  const completable = new Map<string, boolean>();
  const canComplete = (c: CaseCard, f: FacilityDefinition): boolean => {
    const key = `${c.id}\u0000${f.id}`;
    let ok = completable.get(key);
    if (ok === undefined) {
      const def = getCase(c.id);
      ok = !def || !caseCapabilityGaps(def, f, catalogsFor(f)).some((g) => g.blocking);
      completable.set(key, ok);
    }
    return ok;
  };

  const facilitiesFor = (c: CaseCard): FacilityDefinition[] =>
    [...facilities.values()].filter((f) => {
      if (f.id === "clinic-v4" && c.setting !== "outpatient") return false;
      if (!(f.patientSlots.some((s) => s.accepts.includes(c.setting as never)) || f.id === c.facility)) return false;
      return f.id === c.facility || canComplete(c, f);
    });

  const defaultFacility = (c: CaseCard): FacilityDefinition | null => {
    const options = facilitiesFor(c);
    return (c.facility ? options.find((f) => f.id === c.facility) : undefined) ?? options.find((f) => f.id === "general-hospital") ?? options[0] ?? null;
  };

  const addServerContent = (payload: ServerContent): number => {
    let added = 0;
    for (const json of payload.catalogs) {
      const r = parseCatalog(json);
      if (r.ok && !catalogs.has(r.value.id)) {
        catalogs.set(r.value.id, r.value);
        added++;
      } else if (!r.ok) issues.push(...fmt("server catalog", r.issues));
    }
    for (const json of payload.facilities) {
      const r = parseFacility(json);
      if (r.ok && !facilities.has(r.value.id)) {
        facilities.set(r.value.id, r.value);
        added++;
      } else if (!r.ok) issues.push(...fmt("server facility", r.issues));
    }
    for (const json of payload.cases) {
      const c = card(json);
      if (!c || raws.has(c.id)) continue;
      const r = parseCase(json);
      if (!r.ok) {
        issues.push(...fmt(`server case ${c.id}`, r.issues));
        continue;
      }
      raws.set(c.id, json);
      parsedCases.set(c.id, r.value);
      cards.push({ ...c, source: "server" });
      added++;
    }
    // Server cases take their place in the library order (not appended at the end).
    cards.sort(compareCards);
    completable.clear();
    return added;
  };

  cached = { cards, facilities, catalogs, issues, getCase, caseIssues: (id) => caseIssueMap.get(id) ?? [], catalogsFor, facilitiesFor, defaultFacility, addServerContent };
  return cached;
}

/** `GET` a JSON document (null on any failure). */
export type JsonGetter = (url: string) => Promise<unknown>;

/**
 * Fetch what `clinicalcraft serve` offers beyond the bundle — cases,
 * facilities and catalogs from its contentDirs (`GET /api/content/index`,
 * then each new item) — and add it to `index`. Returns the number added.
 */
export async function loadServerContent(index: ContentIndex, get: JsonGetter): Promise<number> {
  const listing = (await get("/api/content/index")) as { cases?: { id?: unknown }[]; facilities?: { id?: unknown }[]; catalogs?: { id?: unknown }[] } | null;
  if (!listing || typeof listing !== "object") return 0;
  const ids = (list: { id?: unknown }[] | undefined) => (Array.isArray(list) ? list.map((x) => x?.id).filter((id): id is string => typeof id === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) : []);
  const known = new Set(index.cards.map((c) => c.id));
  const fetchAll = async (kind: string, wanted: string[]) => (await Promise.all(wanted.map((id) => get(`/api/content/${kind}/${encodeURIComponent(id)}`)))).filter((x) => x !== null && typeof x === "object");
  const catalogs = await fetchAll("catalogs", ids(listing.catalogs).filter((id) => !index.catalogs.has(id)));
  const facilities = await fetchAll("facilities", ids(listing.facilities).filter((id) => !index.facilities.has(id)));
  const cases = await fetchAll("cases", ids(listing.cases).filter((id) => !known.has(id)));
  return index.addServerContent({ cases, facilities, catalogs });
}
