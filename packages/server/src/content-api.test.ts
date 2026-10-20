/**
 * Content API at scale (C1, docs/EMBODIED.md §11): the paginated, filterable
 * case index, strong ETags with If-None-Match → 304, mtime/size-based
 * re-indexing, deterministic duplicate ids and incremental validation.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CASE_INDEX_ENTRY_KEYS, libraryOrder, mergeSettings, type CaseIndexEntry, type ResolvedSettings } from "@clinicalcraft/agent";
import { builtinContentDir, loadContent } from "@clinicalcraft/agent/node";
import { CaseStore } from "./case-store.js";
import { matchesListing, parseListingQuery, type CaseListing } from "./content.js";
import { startServer, type RunningServer, type ServerOptions } from "./server.js";

const root = mkdtempSync(join(tmpdir(), "cc-content-api-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const content = await loadContent();
const ORDER = libraryOrder([...content.cases.values()].map((e) => e.def)).map((c) => c.id);
const SMZL = "smzl-lung-adeno";
const env = { CLINICALCRAFT_HOME: join(root, "home"), HOME: join(root, "home") };

function settings(): ResolvedSettings {
  return mergeSettings([{ source: "flag", settings: { locale: "en" } }]);
}

function serve(extra: Partial<ServerOptions> = {}): Promise<RunningServer> {
  return startServer({ port: 0, host: "127.0.0.1", settings: settings(), staticDir: null, assetDirs: [], env, log: () => undefined, ...extra });
}

const miniCase = (id: string, title = "Mini") => ({
  schema: "clinicalcraft/case@1",
  id,
  version: "1.0.0",
  title,
  summary: "Minimal synthetic case",
  specialty: ["general"],
  difficulty: 1,
  setting: "outpatient",
  locales: ["en"],
  provenance: { kind: "synthetic" },
  patient: {
    displayName: "Test Patient",
    age: 40,
    sex: "male",
    chiefComplaint: "cough",
    persona: { personality: "calm", speechStyle: "plain", openingLine: "Hello doctor.", fallbackUnknown: "I'm not sure." },
  },
  phases: [{ id: "visit", label: "Visit" }],
  objectives: [{ id: "talk", title: "Talk", hint: "Ask about the cough", completeWhen: { always: true } }],
  debrief: { title: "Done", conclusion: "Synthetic." },
});

function writeCase(dir: string, folder: string, value: unknown): string {
  const file = join(dir, "cases", folder, "case.json");
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2));
  return file;
}

const listing = async (server: RunningServer, query = "", headers: Record<string, string> = {}) => {
  const res = await fetch(new URL(`api/content/cases${query}`, server.url), { headers });
  return { res, body: res.status === 200 ? ((await res.json()) as CaseListing) : null };
};

describe("GET /api/content/cases (built-in content)", () => {
  let server: RunningServer;
  beforeAll(async () => {
    server = await serve({ content });
  });
  afterAll(() => server.close());

  it("lists index entries in the shared library order, with the total", async () => {
    const { res, body } = await listing(server);
    expect(res.status).toBe(200);
    expect(body!.total).toBe(ORDER.length);
    expect(body!.items.map((e) => e.id)).toEqual(ORDER.slice(0, 50));
    expect(body!.offset).toBe(0);
    expect(body!.limit).toBe(50);
    for (const e of body!.items) expect(Object.keys(e).sort()).toEqual([...CASE_INDEX_ENTRY_KEYS].sort());
    expect(JSON.stringify(body)).not.toContain("solution");
    expect(body!.issues).toEqual([]);
  });

  it("pages with offset/limit (limit clamped to 200) and refuses malformed parameters", async () => {
    const page = (await listing(server, "?offset=2&limit=3")).body!;
    expect(page.items.map((e) => e.id)).toEqual(ORDER.slice(2, 5));
    expect(page.total).toBe(ORDER.length);
    expect((await listing(server, `?offset=${ORDER.length}`)).body!.items).toEqual([]);
    expect((await listing(server, "?limit=5000")).body!.limit).toBe(200);
    for (const bad of ["?limit=0", "?offset=-1", "?limit=abc", "?offset=1.5", "?locale=fr", `?q=${"x".repeat(201)}`]) {
      const { res } = await listing(server, bad, { "accept-language": "zh-CN" });
      expect(res.status, bad).toBe(400);
      const err = (await res.json()) as { error: { code: string; message: string } };
      expect(err.error.code).toBe("bad_request");
      expect(err.error.message).toContain("查询参数无效");
    }
  });

  it("filters by q (titles, summaries, specialties, tags — never ids), specialty, setting and locale", async () => {
    const all = (await listing(server, "?limit=200")).body!.items;
    const ids = async (query: string) => (await listing(server, `?limit=200&${query}`)).body!.items.map((e) => e.id);
    expect(await ids("setting=outpatient")).toEqual(all.filter((e) => e.setting === "outpatient").map((e) => e.id));
    expect(await ids("specialty=cardiology,neurology")).toEqual(all.filter((e) => e.specialty.some((s) => s === "cardiology" || s === "neurology")).map((e) => e.id));
    const chest = await ids(`q=${encodeURIComponent("chest PAIN")}`);
    expect(chest.length).toBeGreaterThan(0);
    expect(await ids(`q=${encodeURIComponent("胸痛")}`)).toEqual(expect.arrayContaining(chest.filter((id) => id === "stemi-inferior-rv")));
    expect(await ids("q=smzl")).toEqual([]); // the id names the diagnosis: not searchable
    expect(await ids("locale=en")).toEqual(all.filter((e) => e.locales.includes("en")).map((e) => e.id));
    const parsed = parseListingQuery(new URLSearchParams("q=chest%20pain&setting=emergency"));
    if (!parsed.ok) throw new Error(parsed.message);
    expect(await ids("q=chest%20pain&setting=emergency")).toEqual(all.filter((e) => matchesListing(e, parsed.query)).map((e) => e.id));
  });

  it("answers If-None-Match with 304 for the listing, the legacy index, cases, facilities and catalogs", async () => {
    const catalog = [...content.catalogs.keys()][0]!;
    for (const path of ["api/content/cases?limit=3", "api/content/index", `api/content/cases/${SMZL}`, "api/content/facilities/general-hospital", `api/content/catalogs/${catalog}`]) {
      const first = await fetch(new URL(path, server.url));
      expect(first.status, path).toBe(200);
      const etag = first.headers.get("etag")!;
      expect(etag, path).toMatch(/^"[A-Za-z0-9_-]{43}"$/);
      expect(first.headers.get("cache-control")).toBe("private, no-cache");
      const again = await fetch(new URL(path, server.url), { headers: { "if-none-match": etag } });
      expect(again.status, path).toBe(304);
      expect(again.headers.get("etag")).toBe(etag);
      expect(await again.text()).toBe("");
      expect((await fetch(new URL(path, server.url), { headers: { "if-none-match": `"other", W/${etag}` } })).status).toBe(304);
      expect((await fetch(new URL(path, server.url), { headers: { "if-none-match": '"stale"' } })).status).toBe(200);
      const head = await fetch(new URL(path, server.url), { method: "HEAD" });
      expect(head.headers.get("etag")).toBe(etag);
      expect(await head.text()).toBe("");
    }
    // Errors are never cacheable.
    const missing = await fetch(new URL("api/content/cases/nope", server.url));
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBe("no-store");
  });
});

describe("content directories: re-indexing, duplicates, overrides and incremental validation", () => {
  const dir = join(root, "content");
  let server: RunningServer;
  const stemiFile = content.cases.get("stemi-inferior-rv")?.file;
  beforeAll(async () => {
    writeCase(dir, "mini-a", miniCase("mini-a", "Mini A"));
    writeCase(dir, "bad-one", { id: "bad-one", title: "Broken case", difficulty: 1, provenance: { kind: "synthetic" } });
    writeCase(dir, "zz-dup", miniCase("mini-a", "Duplicate"));
    if (stemiFile) writeCase(dir, "stemi-inferior-rv", { ...JSON.parse(readFileSync(stemiFile, "utf8")), title: { en: "Overridden chest pain", "zh-CN": "覆盖的胸痛" } });
    server = await serve({ contentDirs: [dir], contentRevalidateMs: 0 });
  });
  afterAll(() => server.close());

  it("indexes the built-in content and the content directory; later directories override, duplicates are reported", async () => {
    const body = (await listing(server, "?limit=200")).body!;
    const ids = body.items.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(["mini-a", "bad-one", ...ORDER]));
    expect(body.total).toBe(ORDER.length + 2);
    expect(body.items.find((e) => e.id === "mini-a")!.title).toBe("Mini A");
    const dup = body.issues.find((i) => i.code === "duplicate-id" && i.id === "mini-a");
    expect(dup).toEqual({ code: "duplicate-id", severity: "error", id: "mini-a", dir: 1, file: "cases/zz-dup/case.json", usedDir: 1, usedFile: "cases/mini-a/case.json" });
    if (stemiFile) {
      expect(body.items.find((e) => e.id === "stemi-inferior-rv")!.title).toEqual({ en: "Overridden chest pain", "zh-CN": "覆盖的胸痛" });
      expect(body.issues.find((i) => i.id === "stemi-inferior-rv")).toMatchObject({ code: "duplicate-id", severity: "warning", dir: 0, usedDir: 1 });
      const full = (await (await fetch(new URL("api/content/cases/stemi-inferior-rv", server.url))).json()) as { title: unknown; solution?: unknown };
      expect(full.title).toEqual({ en: "Overridden chest pain", "zh-CN": "覆盖的胸痛" });
      expect(full.solution).toBeUndefined();
    }
    expect(JSON.stringify(body.issues)).not.toContain(root); // no absolute paths
  });

  it("lists an invalid case but refuses to serve it (422 with the validation issues)", async () => {
    const res = await fetch(new URL("api/content/cases/bad-one", server.url), { headers: { "accept-language": "en" } });
    expect(res.status).toBe(422);
    const err = (await res.json()) as { error: { code: string; message: string; issues: { path: string; message: string }[] } };
    expect(err.error.code).toBe("invalid_case");
    expect(err.error.message).toContain('Case "bad-one" is invalid');
    expect(err.error.issues.length).toBeGreaterThan(0);
  });

  it("re-indexes a file whose size or mtime changed: new entry, new ETags, old ETags no longer match", async () => {
    const before = await fetch(new URL("api/content/cases?q=mini", server.url));
    const listEtag = before.headers.get("etag")!;
    const caseRes = await fetch(new URL("api/content/cases/mini-a", server.url));
    const caseEtag = caseRes.headers.get("etag")!;
    const oldHash = ((await before.json()) as CaseListing).items.find((e) => e.id === "mini-a")!.contentHash;
    writeCase(dir, "mini-a", miniCase("mini-a", "Mini A, second edition"));
    const after = await fetch(new URL("api/content/cases?q=mini", server.url), { headers: { "if-none-match": listEtag } });
    expect(after.status).toBe(200);
    const entry = ((await after.json()) as CaseListing).items.find((e) => e.id === "mini-a")!;
    expect(entry.title).toBe("Mini A, second edition");
    expect(entry.contentHash).not.toBe(oldHash);
    const full = await fetch(new URL("api/content/cases/mini-a", server.url), { headers: { "if-none-match": caseEtag } });
    expect(full.status).toBe(200);
    expect(((await full.json()) as { title: string }).title).toBe("Mini A, second edition");
    expect(full.headers.get("etag")).not.toBe(caseEtag);
  });
});

describe("CaseStore", () => {
  const dir = join(root, "store");
  writeCase(dir, "valid-one", miniCase("valid-one", "One"));
  writeCase(dir, "valid-two", miniCase("valid-two", "Two"));
  writeCase(dir, "invalid", { id: "invalid", title: "x" });

  it("validates a case on its first load and caches the verdict until the file changes", async () => {
    const store = new CaseStore({ dirs: [dir], revalidateMs: 0 });
    const [a, b] = await Promise.all([store.load("valid-one"), store.load("valid-one")]);
    expect(a).toEqual(b);
    expect(a.status).toBe("ok");
    expect(store.stats.validations).toBe(1);
    await store.load("valid-one");
    expect(store.stats.validations).toBe(1);
    expect((await store.load("invalid")).status).toBe("invalid");
    expect((await store.load("invalid")).status).toBe("invalid");
    expect(store.stats.validations).toBe(2);
    expect(await store.load("nope")).toEqual({ status: "not-found" });
    writeCase(dir, "valid-one", miniCase("valid-one", "One, edited"));
    const edited = await store.load("valid-one");
    expect(store.stats.validations).toBe(3);
    expect(edited.status === "ok" && JSON.parse(edited.body).title).toBe("One, edited");
  });

  it("keeps public bodies within a byte budget; an evicted case keeps its ETag and is rebuilt on demand", async () => {
    const store = new CaseStore({ dirs: [dir], revalidateMs: 0, maxCachedBytes: 1 });
    const one = await store.load("valid-one");
    const two = await store.load("valid-two");
    if (one.status !== "ok" || two.status !== "ok") throw new Error("expected valid cases");
    expect(store.stats.cachedBytes).toBe(two.body.length);
    expect(await store.currentEtag("valid-one")).toBe(one.etag);
    const again = await store.load("valid-one");
    expect(again).toEqual(one);
    expect(store.stats.validations).toBe(3);
  });

  it("re-stats the files at most every revalidateMs", async () => {
    let now = 0;
    const store = new CaseStore({ dirs: [dir], revalidateMs: 1000, now: () => now });
    const first = await store.index();
    writeCase(dir, "valid-two", miniCase("valid-two", "Two, much longer title"));
    expect(await store.index()).toBe(first);
    now = 1500;
    const later = await store.index();
    expect(later.generation).toBeGreaterThan(first.generation);
    expect(later.files.get("valid-two")?.entry.title).toBe("Two, much longer title");
    const entry: CaseIndexEntry | undefined = later.entries.find((e) => e.id === "valid-two");
    expect(entry?.contentHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("indexes the built-in directory with bounded concurrency like the CLI", async () => {
    const builtin = builtinContentDir();
    if (!builtin) return;
    const store = new CaseStore({ dirs: [builtin], concurrency: 2 });
    expect((await store.index()).entries.map((e) => e.id)).toEqual(ORDER);
  });
});
