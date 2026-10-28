/**
 * The case library shared by every front-end that lists cases.
 *
 * Order (CLI `cases list`/`cases index` and picker, MCP `list_cases` and
 * `clinicalcraft://cases`, the server's case listing, the web library):
 * published cases first, then by difficulty, then by id (code-unit order).
 * Independent of the UI language and of load order, so numbers and listings
 * are stable. Front-ends that must not show ids (MCP) still sort by them and
 * print opaque handles.
 *
 * Index (docs/EMBODIED.md §11): `caseIndexEntry` builds the metadata a
 * library needs — cards, filters and facility choice — from a case file's raw
 * JSON, without validating the whole case (that happens when the case is
 * loaded). The web bundle (build-time index), `clinicalcraft serve`
 * (`GET /api/content/cases`) and `clinicalcraft cases index` use this one
 * builder. Isomorphic and dependency-free at runtime (type imports only), so
 * the web's Vite plugin can bundle it into its config.
 */
import type { CaseDefinition, LocalizedText } from "@clinicalcraft/core";

/* ------------------------------------------------------------------ */
/* Library order                                                       */
/* ------------------------------------------------------------------ */

/** What the library order reads: a full case or an index entry (`provenance` = its kind). */
export interface LibraryOrderKey {
  id: string;
  difficulty: number;
  provenance: string | { kind: string };
}

const provenanceKind = (c: LibraryOrderKey): string => (typeof c.provenance === "string" ? c.provenance : c.provenance.kind);

/** Comparator for `libraryOrder` (published first, difficulty, id). */
export function compareLibraryOrder(a: LibraryOrderKey, b: LibraryOrderKey): number {
  const published = (c: LibraryOrderKey) => Number(provenanceKind(c) === "published-case");
  return published(b) - published(a) || a.difficulty - b.difficulty || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** The cases (or index entries) in library order (a new array). */
export function libraryOrder<T extends LibraryOrderKey>(cases: Iterable<T>): T[] {
  return [...cases].sort(compareLibraryOrder);
}

/* ------------------------------------------------------------------ */
/* Index entries                                                       */
/* ------------------------------------------------------------------ */

/**
 * What a facility must provide for one objective or decision to be
 * completable, reduced from its condition: `string[]` = one case item's
 * `requires` (every capability), `all` / `any` as in the Condition DSL.
 * Conditions that need no capability are left out; `{any: []}` stays (it can
 * never hold, as in core).
 */
export type CapabilityNeed = string[] | { all: CapabilityNeed[] } | { any: CapabilityNeed[] };

/** Review statuses of `provenance.review.status` (core `CaseSchema`). */
export const REVIEW_STATUSES = ["unreviewed", "editorial", "clinician-reviewed"] as const;

/**
 * A case's clinical review as the library shows it (`provenance.review`): its status and date, stated honestly
 * wherever the case is offered (docs/GLOSSARY.md §4). Reviewers, guidance and notes stay in the full case.
 */
export interface CaseReviewSummary {
  status: (typeof REVIEW_STATUSES)[number];
  /** Date of the last review (YYYY-MM-DD), or null when the case gives none. */
  reviewedAt: string | null;
}

/**
 * One case in the library index: exactly what the library cards, filters and
 * facility choice need. No patient data, answers, results or solution.
 */
export interface CaseIndexEntry {
  /** Case id (ids name the diagnosis: front-ends that hide them show opaque handles). */
  id: string;
  /** Case file version (semver); "" when missing. */
  version: string;
  title: LocalizedText;
  summary: LocalizedText;
  specialty: string[];
  difficulty: number;
  setting: string;
  /** The case's own facility, or null. */
  facility: string | null;
  locales: string[];
  estimatedMinutes: number | null;
  /** `provenance.kind`: "published-case" | "synthetic" | "adapted". */
  provenance: string;
  tags: string[];
  /** The case models live physiology (a `physiology` block). */
  physiology: boolean;
  /** Number of objectives (chapters). */
  objectives: number;
  /** The V4 label's prefix per locale ("CASE 01") — never the rest, which names the diagnosis; null without a V4 label. */
  labelPrefix: LocalizedText | null;
  /** The case's teaching disclaimer (shown before play), or null. */
  disclaimer: LocalizedText | null;
  /**
   * How many learning outcomes the case states (`learningOutcomes`) — a count only: specific by design, the
   * outcomes usually name the diagnosis, and the index stays spoiler-free (docs/GLOSSARY.md §4).
   */
  learningOutcomeCount: number;
  /** The case's recorded clinical review (`provenance.review`), or null when it records none. */
  review: CaseReviewSummary | null;
  /** Hash of the case file's bytes (16 hex digits of its SHA-256): changes whenever the file does. */
  contentHash: string;
  /**
   * One need per objective / decision that requires equipment: a facility
   * can host the case only when none of them is blocked there
   * (`canCompleteWith`, the same verdict as core's `caseCapabilityGaps`).
   */
  capabilityNeeds: CapabilityNeed[];
}

/** The keys of a `CaseIndexEntry`, in a stable order. */
export const CASE_INDEX_ENTRY_KEYS: readonly (keyof CaseIndexEntry)[] = [
  "id",
  "version",
  "title",
  "summary",
  "specialty",
  "difficulty",
  "setting",
  "facility",
  "locales",
  "estimatedMinutes",
  "provenance",
  "tags",
  "physiology",
  "objectives",
  "labelPrefix",
  "disclaimer",
  "learningOutcomeCount",
  "review",
  "contentHash",
  "capabilityNeeds",
];

/** Ids a front-end may put in a URL or a file path (the case id schema, minus nothing it allows). */
export const SAFE_CASE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

type Raw = Record<string, unknown>;

function obj(v: unknown): Raw {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {};
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** A string, or a record of locale → string (other values dropped); null when neither. */
function localized(v: unknown): LocalizedText | null {
  if (typeof v === "string") return v;
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(v as Raw)) if (typeof x === "string") out[k] = x;
  return Object.keys(out).length ? out : null;
}

/** The part of a V4 label before its first "·" (per locale). */
function labelPrefix(label: LocalizedText | null): LocalizedText | null {
  if (label === null) return null;
  const cut = (s: string) => s.split("·")[0]!.trim();
  if (typeof label === "string") return cut(label) || null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(label)) if (cut(v)) out[k] = cut(v);
  return Object.keys(out).length ? out : null;
}

/** `provenance.review` reduced to what the library shows (status and date); null without a known status. */
function reviewOf(v: unknown): CaseReviewSummary | null {
  const r = obj(v);
  const status = REVIEW_STATUSES.find((x) => x === r.status);
  if (!status) return null;
  const reviewedAt = typeof r.reviewedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.reviewedAt) ? r.reviewedAt : null;
  return { status, reviewedAt };
}

/* ---- capability needs ---------------------------------------------- */

type ItemKind = "exam" | "investigation" | "intervention";
const TRUE = Symbol("true");
type Reduced = CapabilityNeed | typeof TRUE;

function itemRequirements(raw: Raw): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (kind: ItemKind, list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      const o = obj(item);
      if (typeof o.id === "string") out.set(`${kind}:${o.id}`, [...new Set(strings(o.requires))]);
    }
  };
  add("exam", raw.exam);
  add("investigation", raw.investigations);
  add("intervention", raw.interventions);
  return out;
}

function dedupe(list: CapabilityNeed[]): CapabilityNeed[] {
  const seen = new Set<string>();
  return list.filter((n) => {
    const key = JSON.stringify(n);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Reduce a condition to the capabilities it needs: an item reference becomes
 * that item's `requires`; anything that can hold without equipment (history,
 * decisions, flags, `not`, an item that needs nothing or is unknown) is TRUE.
 * Mirrors core's `satisfiableWithout`/`positiveItems` (facility.ts).
 */
function reduceCondition(cond: unknown, items: Map<string, string[]>, depth = 0): Reduced {
  const c = obj(cond);
  if (depth > 64) return TRUE;
  const item = (key: string): Reduced => {
    const req = items.get(key);
    return req && req.length > 0 ? [...req].sort() : TRUE;
  };
  if (Array.isArray(c.all)) {
    const kids = c.all.map((x) => reduceCondition(x, items, depth + 1)).filter((x): x is CapabilityNeed => x !== TRUE);
    // Items of an `all` (nested ones included) merge into one: every one of them must be available.
    const caps = new Set<string>();
    const rest: CapabilityNeed[] = [];
    const take = (k: CapabilityNeed): void => {
      if (Array.isArray(k)) for (const cap of k) caps.add(cap);
      else if ("all" in k) k.all.forEach(take);
      else rest.push(k);
    };
    kids.forEach(take);
    const merged = dedupe([...(caps.size ? [[...caps].sort()] : []), ...rest]);
    if (merged.length === 0) return TRUE;
    return merged.length === 1 ? merged[0]! : { all: merged };
  }
  if (Array.isArray(c.any)) {
    const kids = c.any.map((x) => reduceCondition(x, items, depth + 1));
    if (kids.includes(TRUE)) return TRUE;
    const flat = dedupe((kids as CapabilityNeed[]).flatMap((k) => (!Array.isArray(k) && "any" in k ? k.any : [k])));
    return flat.length === 1 ? flat[0]! : { any: flat };
  }
  if (typeof c.examined === "string") return item(`exam:${c.examined}`);
  if (typeof c.ordered === "string") return item(`investigation:${c.ordered}`);
  if (typeof c.read === "string") return item(`investigation:${c.read}`);
  if (typeof c.resultReady === "string") return item(`investigation:${c.resultReady}`);
  if (typeof c.intervened === "string") return item(`intervention:${c.intervened}`);
  return TRUE;
}

function hasEmptyAny(need: CapabilityNeed): boolean {
  if (Array.isArray(need)) return false;
  if ("any" in need && need.any.length === 0) return true;
  return ("all" in need ? need.all : need.any).some(hasEmptyAny);
}

/** The `requires` of every item a condition refers to positively (outside `not`), as core's `positiveItems`. */
function positiveRequirements(cond: unknown, items: Map<string, string[]>, out: Map<string, string[]>, depth = 0): Map<string, string[]> {
  const c = obj(cond);
  if (depth > 64) return out;
  const add = (key: string) => {
    const req = items.get(key);
    if (req && req.length > 0) out.set(key, [...req].sort());
  };
  if (Array.isArray(c.all)) for (const x of c.all) positiveRequirements(x, items, out, depth + 1);
  else if (Array.isArray(c.any)) for (const x of c.any) positiveRequirements(x, items, out, depth + 1);
  else if (typeof c.examined === "string") add(`exam:${c.examined}`);
  else if (typeof c.ordered === "string") add(`investigation:${c.ordered}`);
  else if (typeof c.read === "string") add(`investigation:${c.read}`);
  else if (typeof c.resultReady === "string") add(`investigation:${c.resultReady}`);
  else if (typeof c.intervened === "string") add(`intervention:${c.intervened}`);
  return out;
}

/**
 * The need of one objective or decision. Core calls it blocked when it
 * cannot hold and *any* item it refers to lacks a capability. Without an
 * empty `any` a condition only fails through such an item, so the reduced
 * condition says it all; with one (it never holds), the items of branches
 * that were pruned as satisfiable still count: they are kept as an `any`
 * that always holds (`[]` needs nothing) but reports their missing
 * capabilities.
 */
function needOf(cond: unknown, items: Map<string, string[]>): CapabilityNeed | null {
  if (cond === undefined) return null;
  const reduced = reduceCondition(cond, items);
  if (reduced === TRUE) return null;
  if (!hasEmptyAny(reduced)) return reduced;
  const touched = dedupe([...positiveRequirements(cond, items, new Map()).values()]);
  return touched.length === 0 ? null : { all: [reduced, { any: [[], ...touched] }] };
}

function capabilityNeeds(raw: Raw): CapabilityNeed[] {
  const items = itemRequirements(raw);
  if (![...items.values()].some((r) => r.length > 0)) return [];
  const conditions = [
    ...(Array.isArray(raw.objectives) ? raw.objectives.map((o) => obj(o).completeWhen) : []),
    ...(Array.isArray(raw.decisions) ? raw.decisions.map((d) => obj(d).requires) : []),
  ];
  return dedupe(conditions.map((cond) => needOf(cond, items)).filter((x): x is CapabilityNeed => x !== null));
}

function satisfied(need: CapabilityNeed, caps: ReadonlySet<string>): boolean {
  if (Array.isArray(need)) return need.every((c) => caps.has(c));
  if ("all" in need) return need.all.every((n) => satisfied(n, caps));
  return need.any.some((n) => satisfied(n, caps));
}

function missesSome(need: CapabilityNeed, caps: ReadonlySet<string>): boolean {
  if (Array.isArray(need)) return need.some((c) => !caps.has(c));
  return ("all" in need ? need.all : need.any).some((n) => missesSome(n, caps));
}

/**
 * Can the case be completed with these facility capabilities (core
 * `facilityCapabilities`, the learner's personal kit included)? False when
 * an objective or a decision is blocked: it cannot hold, and an item it
 * refers to needs a capability the facility lacks — exactly when core's
 * `caseCapabilityGaps` reports a blocking gap.
 */
export function canCompleteWith(entry: Pick<CaseIndexEntry, "capabilityNeeds">, caps: ReadonlySet<string>): boolean {
  return !entry.capabilityNeeds.some((need) => !satisfied(need, caps) && missesSome(need, caps));
}

/**
 * The index entry of a case from its raw JSON (`case.json` as parsed, not
 * validated) and the hash of its file. Missing or malformed fields get the
 * web library's defaults; null without a usable `id`.
 */
export function caseIndexEntry(rawCase: unknown, contentHash: string): CaseIndexEntry | null {
  const raw = obj(rawCase);
  if (typeof raw.id !== "string" || !SAFE_CASE_ID.test(raw.id)) return null;
  const v4 = obj(obj(raw.extensions).v4);
  return {
    id: raw.id,
    version: typeof raw.version === "string" ? raw.version : "",
    title: localized(raw.title) ?? raw.id,
    summary: localized(raw.summary) ?? "",
    specialty: strings(raw.specialty),
    difficulty: typeof raw.difficulty === "number" && Number.isFinite(raw.difficulty) ? raw.difficulty : 1,
    setting: typeof raw.setting === "string" ? raw.setting : "outpatient",
    facility: typeof raw.facility === "string" ? raw.facility : null,
    locales: strings(raw.locales),
    estimatedMinutes: typeof raw.estimatedMinutes === "number" && Number.isFinite(raw.estimatedMinutes) ? raw.estimatedMinutes : null,
    provenance: typeof obj(raw.provenance).kind === "string" ? (obj(raw.provenance).kind as string) : "synthetic",
    tags: strings(raw.tags),
    physiology: raw.physiology != null,
    objectives: Array.isArray(raw.objectives) ? raw.objectives.length : 0,
    labelPrefix: labelPrefix(localized(v4.caseLabel)),
    disclaimer: localized(raw.disclaimer),
    learningOutcomeCount: Array.isArray(raw.learningOutcomes) ? raw.learningOutcomes.filter((x) => localized(x) !== null).length : 0,
    review: reviewOf(obj(raw.provenance).review),
    contentHash,
    capabilityNeeds: capabilityNeeds(raw),
  };
}

/** A full case's index entry (its own JSON stands in for the file). */
export function caseIndexEntryOf(c: CaseDefinition, contentHash: string): CaseIndexEntry {
  return caseIndexEntry(c, contentHash)!;
}

/* ---- untrusted entries (e.g. from a server) -------------------------- */

const MAX_TEXT = 4000;
const clipText = (s: string) => (s.length > MAX_TEXT ? s.slice(0, MAX_TEXT) : s);

function safeLocalized(v: unknown): LocalizedText | null {
  const l = localized(v);
  if (l === null) return null;
  if (typeof l === "string") return clipText(l);
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(l)) if (/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(k)) out[k] = clipText(x);
  return Object.keys(out).length ? out : null;
}

const safeStrings = (v: unknown, max = 64) =>
  strings(v)
    .filter((s) => s.length > 0 && s.length <= 120)
    .slice(0, max);

const MAX_NEED_DEPTH = 12;

/** One need from untrusted JSON: leaves keep their strings, `all`/`any` their valid children; null when malformed or deeper than 12. */
function safeNeed(v: unknown, depth: number): CapabilityNeed | null {
  if (depth > MAX_NEED_DEPTH) return null;
  if (Array.isArray(v)) return safeStrings(v);
  const o = obj(v);
  for (const key of ["all", "any"] as const) {
    if (!Array.isArray(o[key])) continue;
    const kids: CapabilityNeed[] = [];
    for (const x of (o[key] as unknown[]).slice(0, 64)) {
      if (!Array.isArray(x) && !obj(x).all && !obj(x).any) continue; // not a need: ignored
      const kid = safeNeed(x, depth + 1);
      if (kid === null) return null; // too deep: the whole need is dropped
      kids.push(kid);
    }
    return key === "all" ? { all: kids } : { any: kids };
  }
  return null;
}

/**
 * Validate an index entry received from elsewhere (a server listing): a safe
 * id is required; every other field is type-checked and clamped, unknown
 * keys dropped. Returns null when the entry is unusable.
 */
export function normalizeIndexEntry(value: unknown): CaseIndexEntry | null {
  const v = obj(value);
  if (typeof v.id !== "string" || !SAFE_CASE_ID.test(v.id)) return null;
  const num = (x: unknown, lo: number, hi: number, fallback: number) => (typeof x === "number" && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : fallback);
  const short = (x: unknown, fallback: string) => (typeof x === "string" && x.length <= 120 ? x : fallback);
  return {
    id: v.id,
    version: short(v.version, ""),
    title: safeLocalized(v.title) ?? v.id,
    summary: safeLocalized(v.summary) ?? "",
    specialty: safeStrings(v.specialty),
    difficulty: num(v.difficulty, 1, 5, 1),
    setting: short(v.setting, "outpatient"),
    facility: typeof v.facility === "string" && SAFE_CASE_ID.test(v.facility) ? v.facility : null,
    locales: safeStrings(v.locales, 16),
    estimatedMinutes: typeof v.estimatedMinutes === "number" && Number.isFinite(v.estimatedMinutes) ? Math.min(10_000, Math.max(0, v.estimatedMinutes)) : null,
    provenance: short(v.provenance, "synthetic"),
    tags: safeStrings(v.tags),
    physiology: v.physiology === true,
    objectives: Math.round(num(v.objectives, 0, 1000, 0)),
    labelPrefix: safeLocalized(v.labelPrefix),
    disclaimer: safeLocalized(v.disclaimer),
    learningOutcomeCount: Math.round(num(v.learningOutcomeCount, 0, 100, 0)),
    review: reviewOf(v.review),
    contentHash: typeof v.contentHash === "string" && /^[A-Za-z0-9:_-]{1,128}$/.test(v.contentHash) ? v.contentHash : "",
    capabilityNeeds: Array.isArray(v.capabilityNeeds)
      ? v.capabilityNeeds
          .slice(0, 256)
          .map((n) => safeNeed(n, 0))
          .filter((n): n is CapabilityNeed => n !== null)
      : [],
  };
}
