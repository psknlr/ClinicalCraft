/**
 * Web content (docs/EMBODIED.md §11). The case library is an index bundled
 * at build time (`virtual:clinicalcraft/case-index`: the Vite plugin in
 * src/build indexes packages/content with the shared `caseIndexEntry`
 * builder) — exactly what the library cards, filters and facility choice
 * need. Each full case is its own lazy chunk (non-eager `import.meta.glob`),
 * loaded on demand (`loadCase`): validated with `parseCase`, cached (LRU),
 * with bounded concurrency and a per-case status for the UI (a failed chunk
 * cannot be retried in place — browsers remember a failed `import()` for the
 * page's lifetime — so the UI offers a reload for it). Cases offered
 * by `clinicalcraft serve` join the index from its paginated listing
 * (`GET /api/content/cases`) and load from `/api/content/cases/:id`; an
 * older server without the listing has its cases fetched in full.
 * Facilities and equipment catalogs stay bundled (small; the world needs
 * them at once).
 */
import { canCompleteWith, caseIndexEntry, compareLibraryOrder, createLimiter, libraryOrder, mapLimit, normalizeIndexEntry, type CaseIndexEntry } from "@clinicalcraft/agent";
import { facilityCapabilities, parseCase, parseCatalog, parseFacility, type CaseDefinition, type EquipmentCatalog, type FacilityDefinition } from "@clinicalcraft/core";
import { CASE_FOLDERS, CASE_INDEX, CASE_INDEX_ISSUES } from "virtual:clinicalcraft/case-index";

const caseModules = import.meta.glob("../../../content/cases/*/case.json", { import: "default" }) as Record<string, () => Promise<unknown>>;
const facilityFiles = import.meta.glob("../../../content/facilities/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const catalogFiles = import.meta.glob("../../../content/catalogs/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

/** What the case library shows: the case's index entry, and where the full case comes from. */
export interface CaseCard extends CaseIndexEntry {
  /** "server": from `clinicalcraft serve`'s contentDirs (`/api/content/*`), not bundled; no reference solution. */
  source: "bundled" | "server";
}

/** Where a full case stands: not requested, on its way, loaded (in the cache), invalid, or failed to load (retry possible). */
export type CaseStatus = "idle" | "loading" | "ready" | "invalid" | "failed";

/** The result of `loadCase`. */
export type CaseLoad = { ok: true; def: CaseDefinition } | { ok: false; reason: "unknown" | "invalid" | "failed"; issues: string[] };

/** Content `clinicalcraft serve` offers as full documents (`/api/content/*` payloads), to add to the bundle. */
export interface ServerContent {
  cases: unknown[];
  facilities: unknown[];
  catalogs: unknown[];
}

/** What a content index is built from (the bundle, or test data). */
export interface ContentSources {
  /** Index entries of the bundled cases. */
  entries: readonly CaseIndexEntry[];
  /** Loader of each bundled case's raw JSON, by id. */
  loaders: ReadonlyMap<string, () => Promise<unknown>>;
  /** Facility JSON documents by file name. */
  facilities: Readonly<Record<string, unknown>>;
  /** Equipment catalog JSON documents by file name. */
  catalogs: Readonly<Record<string, unknown>>;
  /** Problems found while indexing. */
  issues?: readonly string[];
}

export interface ContentOptions {
  /** Full cases loading at once (default 4). */
  concurrency?: number;
  /** Full cases kept in memory (default 24; the case being played is held by the game anyway). */
  cacheSize?: number;
}

export interface ContentIndex {
  /** The library, in library order. */
  cards: CaseCard[];
  facilities: Map<string, FacilityDefinition>;
  catalogs: Map<string, EquipmentCatalog>;
  issues: string[];
  /** The full case when it is loaded (and valid), else null — never starts a load. */
  peekCase(id: string): CaseDefinition | null;
  /** Load, validate and cache a full case (one request per case at a time; failures may be retried). */
  loadCase(id: string): Promise<CaseLoad>;
  caseStatus(id: string): CaseStatus;
  /** Validation issues of an invalid case, or the error of a failed load. */
  caseIssues(id: string): string[];
  /** Called whenever a case's status changes. Returns an unsubscribe function. */
  onCaseStatus(listener: (id: string, status: CaseStatus) => void): () => void;
  catalogsFor(facility: FacilityDefinition): EquipmentCatalog[];
  /**
   * Facilities that can host a case: a slot accepting its setting (clinic-v4 only for outpatient cases)
   * and every objective and decision completable with the facility's equipment (the index entry's
   * `capabilityNeeds`, the same verdict as core's `caseCapabilityGaps` on the full case).
   */
  facilitiesFor(card: CaseCard): FacilityDefinition[];
  defaultFacility(card: CaseCard): FacilityDefinition | null;
  /**
   * Add index entries from a server listing (validated with `normalizeIndexEntry`; bundled and known
   * ids are never replaced); `fetchCase` loads one in full when it is needed. Returns the number added.
   */
  addServerEntries(entries: readonly unknown[], fetchCase: (id: string) => Promise<unknown>): number;
  /**
   * Add full server documents (validated with the core parsers; bundled ids are never replaced).
   * Returns the number of cases, facilities and catalogs added.
   */
  addServerContent(payload: ServerContent): number;
}

function fmt(file: string, issues: { path: string; message: string }[]): string[] {
  return issues.slice(0, 6).map((i) => `${file.replace(/^.*content\//, "")}: ${i.path || "(root)"} — ${i.message}`);
}

/** 16 hex digits of two FNV-1a hashes: a version stamp for server documents that come without an index entry. */
function hashText(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000193) ^ (b >>> 15);
  }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** A content index over the given sources (the app uses `loadContent()`; tests build their own). */
export function createContentIndex(sources: ContentSources, options: ContentOptions = {}): ContentIndex {
  const issues: string[] = [...(sources.issues ?? [])];
  const cards: CaseCard[] = libraryOrder(sources.entries.map((e) => ({ ...e, source: "bundled" as const })));
  const known = new Set(cards.map((c) => c.id));
  const loaders = new Map(sources.loaders);
  const cacheSize = Math.max(1, options.cacheSize ?? 24);
  const limit = createLimiter(options.concurrency ?? 4);

  const catalogs = new Map<string, EquipmentCatalog>();
  const catalogEntries = Object.entries(sources.catalogs).sort(([a], [b]) => (a.endsWith("/materials.json") ? -1 : b.endsWith("/materials.json") ? 1 : a.localeCompare(b)));
  for (const [file, json] of catalogEntries) {
    const r = parseCatalog(json);
    if (r.ok) catalogs.set(r.value.id, r.value);
    else issues.push(...fmt(file, r.issues));
  }
  const facilities = new Map<string, FacilityDefinition>();
  for (const [file, json] of Object.entries(sources.facilities)) {
    const r = parseFacility(json);
    if (r.ok) facilities.set(r.value.id, r.value);
    else issues.push(...fmt(file, r.issues));
  }

  /* ---- full cases ---------------------------------------------------- */

  const cache = new Map<string, CaseDefinition>(); // LRU: least recently used first
  const invalid = new Map<string, string[]>();
  const failed = new Map<string, string[]>();
  const running = new Map<string, Promise<CaseLoad>>();
  const listeners = new Set<(id: string, status: CaseStatus) => void>();

  const caseStatus = (id: string): CaseStatus =>
    cache.has(id) ? "ready" : invalid.has(id) ? "invalid" : running.has(id) ? "loading" : failed.has(id) ? "failed" : "idle";
  const notify = (id: string) => {
    const status = caseStatus(id);
    for (const fn of listeners) {
      try {
        fn(id, status);
      } catch (err) {
        console.error(err);
      }
    }
  };
  const remember = (id: string, def: CaseDefinition) => {
    cache.delete(id);
    cache.set(id, def);
    while (cache.size > cacheSize) cache.delete(cache.keys().next().value!);
  };

  const loadCase = (id: string): Promise<CaseLoad> => {
    const hit = cache.get(id);
    if (hit) {
      remember(id, hit);
      return Promise.resolve({ ok: true, def: hit });
    }
    const bad = invalid.get(id);
    if (bad) return Promise.resolve({ ok: false, reason: "invalid", issues: bad });
    const pending = running.get(id);
    if (pending) return pending;
    const load = loaders.get(id);
    if (!load) return Promise.resolve({ ok: false, reason: "unknown", issues: [] });
    failed.delete(id);
    const task = limit(async (): Promise<CaseLoad> => {
      const raw = await load();
      if (!raw || typeof raw !== "object") throw new Error("empty case document");
      const r = parseCase(raw);
      if (!r.ok || r.value.id !== id) {
        const found = r.ok ? [`cases/${id}/case.json: id — the document is case "${r.value.id}"`] : fmt(`cases/${id}/case.json`, r.issues);
        invalid.set(id, found);
        return { ok: false, reason: "invalid", issues: found };
      }
      remember(id, r.value);
      return { ok: true, def: r.value };
    })
      .catch((err: unknown): CaseLoad => {
        const message = [errorText(err)];
        failed.set(id, message);
        return { ok: false, reason: "failed", issues: message };
      })
      .finally(() => {
        running.delete(id);
        notify(id);
      });
    running.set(id, task);
    notify(id);
    return task;
  };

  /* ---- facility choice ------------------------------------------------ */

  const catalogsFor = (facility: FacilityDefinition): EquipmentCatalog[] => {
    const listed = (facility.catalogs ?? []).map((id) => catalogs.get(id)).filter((c): c is EquipmentCatalog => !!c);
    return listed.length ? listed : [...catalogs.values()];
  };
  const capabilities = new Map<string, ReadonlySet<string>>();
  const capabilitiesOf = (f: FacilityDefinition): ReadonlySet<string> => {
    let caps = capabilities.get(f.id);
    if (!caps) {
      caps = facilityCapabilities(f, catalogsFor(f));
      capabilities.set(f.id, caps);
    }
    return caps;
  };
  const facilitiesFor = (c: CaseCard): FacilityDefinition[] =>
    [...facilities.values()].filter((f) => {
      if (f.id === "clinic-v4" && c.setting !== "outpatient") return false;
      if (!(f.patientSlots.some((s) => s.accepts.includes(c.setting as never)) || f.id === c.facility)) return false;
      return f.id === c.facility || canCompleteWith(c, capabilitiesOf(f));
    });
  const defaultFacility = (c: CaseCard): FacilityDefinition | null => {
    const options = facilitiesFor(c);
    return (c.facility ? options.find((f) => f.id === c.facility) : undefined) ?? options.find((f) => f.id === "general-hospital") ?? options[0] ?? null;
  };

  /* ---- server content ------------------------------------------------- */

  const addCard = (card: CaseCard) => {
    cards.push(card);
    known.add(card.id);
  };

  const addServerEntries = (entries: readonly unknown[], fetchCase: (id: string) => Promise<unknown>): number => {
    let added = 0;
    for (const raw of entries) {
      const entry = normalizeIndexEntry(raw);
      if (!entry || known.has(entry.id)) continue;
      addCard({ ...entry, source: "server" });
      loaders.set(entry.id, () => fetchCase(entry.id));
      added++;
    }
    // Server cases take their place in the library order (not appended at the end).
    if (added) cards.sort(compareLibraryOrder);
    return added;
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
      const entry = caseIndexEntry(json, hashText(JSON.stringify(json)));
      if (!entry || known.has(entry.id)) continue;
      const r = parseCase(json);
      if (!r.ok) {
        issues.push(...fmt(`server case ${entry.id}`, r.issues));
        continue;
      }
      addCard({ ...entry, source: "server" });
      loaders.set(entry.id, async () => json);
      remember(entry.id, r.value);
      added++;
    }
    cards.sort(compareLibraryOrder);
    capabilities.clear();
    return added;
  };

  return {
    cards,
    facilities,
    catalogs,
    issues,
    peekCase: (id) => cache.get(id) ?? null,
    loadCase,
    caseStatus,
    caseIssues: (id) => invalid.get(id) ?? failed.get(id) ?? [],
    onCaseStatus: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    catalogsFor,
    facilitiesFor,
    defaultFacility,
    addServerEntries,
    addServerContent,
  };
}

/** The bundled cases' loaders by id (index folder → glob chunk). */
function bundledLoaders(): Map<string, () => Promise<unknown>> {
  const byFolder = new Map(Object.entries(caseModules).map(([file, load]) => [file.split("/").at(-2)!, load]));
  const loaders = new Map<string, () => Promise<unknown>>();
  for (const [id, folder] of Object.entries(CASE_FOLDERS)) {
    const load = byFolder.get(folder);
    if (load) loaders.set(id, load);
  }
  return loaders;
}

/** What the bundle holds: the case index, the lazy case chunks, facilities and catalogs. */
export function bundledSources(): ContentSources {
  return { entries: CASE_INDEX, loaders: bundledLoaders(), facilities: facilityFiles, catalogs: catalogFiles, issues: CASE_INDEX_ISSUES };
}

let bundled: ContentIndex | null = null;

/** The app's content index: the bundled library (one instance per page). */
export function loadContent(): ContentIndex {
  bundled ??= createContentIndex(bundledSources());
  return bundled;
}

/** `GET` a JSON document (null on any failure). */
export type JsonGetter = (url: string) => Promise<unknown>;

/**
 * Fetch a full case from `clinicalcraft serve` (`GET /api/content/cases/:id`;
 * the browser revalidates its cached copy with the ETag). Throws with the
 * server's message (unknown or invalid case) or the HTTP status.
 */
export async function fetchServerCase(id: string, timeoutMs = 20_000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/content/cases/${encodeURIComponent(id)}`, { signal: ctrl.signal, headers: { accept: "application/json" } });
    const json = (res.headers.get("content-type") ?? "").includes("json") ? ((await res.json().catch(() => null)) as { error?: { message?: unknown } } | null) : null;
    if (res.ok && json && typeof json === "object") return json;
    throw new Error(typeof json?.error?.message === "string" ? json.error.message : `HTTP ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}

const LEGACY_ID = /^[a-z0-9][a-z0-9-]{0,79}$/;
/** Server listing pages fetched at most (× 200 entries). */
const MAX_LISTING_PAGES = 50;

/** Every entry of the server's paginated case index, or null when it has none (an older server). */
async function serverIndexEntries(get: JsonGetter): Promise<unknown[] | null> {
  const entries: unknown[] = [];
  for (let page = 0; page < MAX_LISTING_PAGES; page++) {
    const body = (await get(`/api/content/cases?offset=${entries.length}&limit=200`)) as { items?: unknown; total?: unknown } | null;
    if (!body || typeof body !== "object" || !Array.isArray(body.items) || typeof body.total !== "number") return page === 0 ? null : entries;
    entries.push(...body.items);
    if (body.items.length === 0 || entries.length >= body.total) break;
  }
  return entries;
}

/**
 * Add what `clinicalcraft serve` offers beyond the bundle — facilities and
 * catalogs from `GET /api/content/index`, cases from its paginated index
 * (`GET /api/content/cases`, loaded in full only when needed: `fetchCase`,
 * default `GET /api/content/cases/:id` through `get`). An older server
 * without the listing has its new cases fetched in full (4 at a time).
 * Returns the number of cases, facilities and catalogs added.
 */
export async function loadServerContent(index: ContentIndex, get: JsonGetter, fetchCase?: (id: string) => Promise<unknown>): Promise<number> {
  const listing = (await get("/api/content/index")) as { cases?: { id?: unknown }[]; facilities?: { id?: unknown }[]; catalogs?: { id?: unknown }[] } | null;
  if (!listing || typeof listing !== "object") return 0;
  const ids = (list: { id?: unknown }[] | undefined) => (Array.isArray(list) ? list.map((x) => x?.id).filter((id): id is string => typeof id === "string" && LEGACY_ID.test(id)) : []);
  const fetchAll = async (kind: string, wanted: string[]) => (await mapLimit(wanted, 4, (id) => get(`/api/content/${kind}/${encodeURIComponent(id)}`))).filter((x) => x !== null && typeof x === "object");
  const catalogs = await fetchAll("catalogs", ids(listing.catalogs).filter((id) => !index.catalogs.has(id)));
  const facilities = await fetchAll("facilities", ids(listing.facilities).filter((id) => !index.facilities.has(id)));
  let added = index.addServerContent({ cases: [], facilities, catalogs });
  const entries = await serverIndexEntries(get);
  if (entries) {
    const full =
      fetchCase ??
      (async (id: string) => {
        const doc = await get(`/api/content/cases/${encodeURIComponent(id)}`);
        if (!doc || typeof doc !== "object") throw new Error(`the server did not send case "${id}"`);
        return doc;
      });
    return added + index.addServerEntries(entries, full);
  }
  const known = new Set(index.cards.map((c) => c.id));
  const cases = await fetchAll("cases", ids(listing.cases).filter((id) => !known.has(id)));
  added += index.addServerContent({ cases, facilities: [], catalogs: [] });
  return added;
}
