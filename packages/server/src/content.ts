/**
 * Content API payloads (`/api/content/*`): the paginated, filterable case
 * index (`GET /api/content/cases`, entries from the shared builder
 * `caseIndexEntry`), the legacy library index (`GET /api/content/index`,
 * every locale of each localised field), full cases with the reference
 * `solution` removed, facilities and equipment catalogs.
 */
import type { CaseDefinition, EquipmentCatalog, FacilityDefinition } from "@clinicalcraft/core";
import type { CaseIndexEntry } from "@clinicalcraft/agent";
import type { CaseIndexIssue, LoadedContent } from "@clinicalcraft/agent/node";

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

/** The legacy summary of an index entry (same fields and order as `caseSummary`). */
export function caseSummaryOf(e: CaseIndexEntry): CaseSummary {
  return {
    id: e.id,
    version: e.version,
    title: e.title,
    summary: e.summary,
    specialty: [...e.specialty],
    difficulty: e.difficulty,
    setting: e.setting as CaseSummary["setting"],
    facility: e.facility,
    estimatedMinutes: e.estimatedMinutes,
    provenance: { kind: e.provenance as CaseSummary["provenance"]["kind"] },
    tags: [...e.tags],
    locales: [...e.locales],
  };
}

const byId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id);

function facilityAndCatalogSummaries(content: Pick<LoadedContent, "facilities" | "catalogs">): Pick<ContentIndex, "facilities" | "catalogs"> {
  return {
    facilities: [...content.facilities.values()]
      .map(({ def }) => ({ id: def.id, name: def.name, description: def.description, catalogs: [...def.catalogs] }))
      .sort(byId),
    catalogs: [...content.catalogs.values()]
      .map(({ def }) => ({ id: def.id, name: def.name, equipment: def.equipment.length, materials: def.materials.length }))
      .sort(byId),
  };
}

/** The content index served at `GET /api/content/index` (sorted by id). */
export function contentIndex(content: Pick<LoadedContent, "cases" | "facilities" | "catalogs">): ContentIndex {
  return { cases: [...content.cases.values()].map((e) => caseSummary(e.def)).sort(byId), ...facilityAndCatalogSummaries(content) };
}

/** `GET /api/content/index` built from the case index (cases are not validated for it). */
export function legacyContentIndex(entries: readonly CaseIndexEntry[], content: Pick<LoadedContent, "facilities" | "catalogs">): ContentIndex {
  return { cases: entries.map(caseSummaryOf).sort(byId), ...facilityAndCatalogSummaries(content) };
}

/** A case as served to clients: everything except the reference walkthrough. */
export function publicCase(c: CaseDefinition): Omit<CaseDefinition, "solution"> {
  const { solution: _solution, ...rest } = c;
  return rest;
}

/* ------------------------------------------------------------------ */
/* Case listing: GET /api/content/cases                                */
/* ------------------------------------------------------------------ */

/** Largest page `GET /api/content/cases` returns (`limit` above it is clamped). */
export const MAX_LISTING_LIMIT = 200;
/** Page size when `limit` is not given. */
export const DEFAULT_LISTING_LIMIT = 50;
/** Longest accepted `q`. */
export const MAX_QUERY_LENGTH = 200;

/** A parsed `GET /api/content/cases` query. */
export interface ListingQuery {
  offset: number;
  limit: number;
  /** Lower-cased words; every one must occur in the title, summary, specialties, tags or setting (any locale). */
  q: string[];
  /** Any of these specialty ids. */
  specialty: string[];
  /** Any of these care settings. */
  setting: string[];
  /** Only cases offered in this language ("zh-CN" or "en"). */
  locale: "zh-CN" | "en" | null;
}

function list(value: string | null): string[] {
  return value === null
    ? []
    : value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

/** Parse the listing query string; the message names the offending parameter. */
export function parseListingQuery(params: URLSearchParams): { ok: true; query: ListingQuery } | { ok: false; message: string } {
  const int = (name: string, fallback: number, min: number): number | string => {
    const raw = params.get(name);
    if (raw === null || raw === "") return fallback;
    if (!/^\d{1,9}$/.test(raw)) return `${name} must be a whole number`;
    const n = Number(raw);
    return n < min ? `${name} must be at least ${min}` : n;
  };
  const offset = int("offset", 0, 0);
  if (typeof offset === "string") return { ok: false, message: offset };
  const limit = int("limit", DEFAULT_LISTING_LIMIT, 1);
  if (typeof limit === "string") return { ok: false, message: limit };
  const q = params.get("q") ?? "";
  if (q.length > MAX_QUERY_LENGTH) return { ok: false, message: `q is longer than ${MAX_QUERY_LENGTH} characters` };
  const rawLocale = params.get("locale");
  let locale: ListingQuery["locale"] = null;
  if (rawLocale) {
    const tag = rawLocale.trim().toLowerCase();
    if (tag.startsWith("zh")) locale = "zh-CN";
    else if (tag.startsWith("en")) locale = "en";
    else return { ok: false, message: "locale must be zh-CN or en" };
  }
  return {
    ok: true,
    query: {
      offset,
      limit: Math.min(limit, MAX_LISTING_LIMIT),
      q: q.toLowerCase().split(/\s+/).filter(Boolean),
      specialty: list(params.get("specialty")),
      setting: list(params.get("setting")),
      locale,
    },
  };
}

/** A stable key for a parsed query (response cache). */
export function listingKey(query: ListingQuery): string {
  return JSON.stringify([query.offset, query.limit, query.q, [...query.specialty].sort(), [...query.setting].sort(), query.locale]);
}

const texts = (v: CaseIndexEntry["title"] | null): string[] => (v === null ? [] : typeof v === "string" ? [v] : Object.values(v));

/** Does an entry pass the query's filters (not its paging)? Ids are not searched: they name the diagnosis. */
export function matchesListing(e: CaseIndexEntry, query: ListingQuery): boolean {
  if (query.specialty.length > 0 && !e.specialty.some((s) => query.specialty.includes(s))) return false;
  if (query.setting.length > 0 && !query.setting.includes(e.setting)) return false;
  if (query.locale && !e.locales.some((l) => l === query.locale || l.toLowerCase().startsWith(query.locale!.slice(0, 2)))) return false;
  if (query.q.length === 0) return true;
  const hay = [...texts(e.title), ...texts(e.summary), ...e.specialty, ...e.tags, e.setting].join(" ").toLowerCase();
  return query.q.every((w) => hay.includes(w));
}

/** An index problem as the listing reports it: no absolute paths, the content directory by number (0 = first). */
export interface ListingIssue {
  code: CaseIndexIssue["code"];
  severity: CaseIndexIssue["severity"];
  id: string | null;
  dir: number;
  file: string;
  usedDir?: number;
  usedFile?: string;
}

/** Most issues a listing carries (`issueCount` has the total). */
export const MAX_LISTING_ISSUES = 100;

/** `GET /api/content/cases` response. */
export interface CaseListing {
  total: number;
  offset: number;
  limit: number;
  items: CaseIndexEntry[];
  issues: ListingIssue[];
  issueCount: number;
}

/** One page of the (library-ordered) index after filtering. */
export function caseListing(entries: readonly CaseIndexEntry[], query: ListingQuery, issues: readonly ListingIssue[] = []): CaseListing {
  const matching = entries.filter((e) => matchesListing(e, query));
  return {
    total: matching.length,
    offset: query.offset,
    limit: query.limit,
    items: matching.slice(query.offset, query.offset + query.limit),
    issues: issues.slice(0, MAX_LISTING_ISSUES),
    issueCount: issues.length,
  };
}
