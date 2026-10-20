/**
 * Web content: the bundled case index with lazily loaded full cases (C1,
 * docs/EMBODIED.md §11) and content from `clinicalcraft serve` (C5).
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CASE_INDEX_ENTRY_KEYS, caseIndexEntry, libraryOrder, type CaseIndexEntry } from "@clinicalcraft/agent";
import { caseCapabilityGaps, type CaseDefinition, type FacilityDefinition } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { bundledSources, createContentIndex, loadContent, loadServerContent, type CaseStatus, type ContentSources } from "./content.js";

const casesDir = fileURLToPath(new URL("../../../content/cases/", import.meta.url));
const folders = readdirSync(casesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const rawCase = (id: string) => JSON.parse(readFileSync(`${casesDir}${id}/case.json`, "utf8")) as Record<string, unknown>;

/** A deferred promise (to hold loads in flight). */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Test sources: `n` copies of a built-in case with new ids, each with a controllable loader. */
function sources(n: number, base = "stemi-inferior-rv") {
  const raw = rawCase(base);
  const docs = Array.from({ length: n }, (_, i) => ({ ...raw, id: `copy-${i}`, title: { en: `Copy ${i}`, "zh-CN": `副本 ${i}` } }));
  const calls = new Map<string, number>();
  const gates = new Map<string, ReturnType<typeof deferred<unknown>>>();
  const loaders = new Map(
    docs.map((doc) => [
      doc.id,
      async () => {
        calls.set(doc.id, (calls.get(doc.id) ?? 0) + 1);
        const gate = gates.get(doc.id);
        if (gate) await gate.promise;
        return structuredClone(doc);
      },
    ]),
  );
  const bundled = bundledSources();
  const src: ContentSources = { entries: docs.map((d) => caseIndexEntry(d, "test")!), loaders, facilities: bundled.facilities, catalogs: bundled.catalogs };
  return { src, docs, calls, gates };
}

describe("bundled case index (C1)", () => {
  it("lists every bundled case from the index, in library order, without loading any case", () => {
    const index = createContentIndex(bundledSources());
    expect(index.cards.map((c) => c.id).sort()).toEqual([...folders].sort());
    expect(index.cards.map((c) => c.id)).toEqual(libraryOrder(index.cards).map((c) => c.id));
    for (const card of index.cards) {
      expect(Object.keys(card).sort()).toEqual([...CASE_INDEX_ENTRY_KEYS, "source"].sort());
      expect(card.source).toBe("bundled");
      expect(index.caseStatus(card.id)).toBe("idle");
      expect(index.peekCase(card.id)).toBeNull();
    }
    expect(index.issues).toEqual([]);
  });

  it("loads a full case on demand from its chunk, validates it and caches it", async () => {
    const index = createContentIndex(bundledSources());
    const seen: [string, CaseStatus][] = [];
    index.onCaseStatus((id, status) => seen.push([id, status]));
    const loading = index.loadCase("smzl-lung-adeno");
    expect(index.caseStatus("smzl-lung-adeno")).toBe("loading");
    const loaded = await loading;
    if (!loaded.ok) throw new Error(loaded.issues.join("\n"));
    expect(loaded.def.id).toBe("smzl-lung-adeno");
    expect(loaded.def.solution.length).toBeGreaterThan(0); // the bundle keeps the reference solution
    expect(index.caseStatus("smzl-lung-adeno")).toBe("ready");
    expect(index.peekCase("smzl-lung-adeno")).toBe(loaded.def);
    expect(await index.loadCase("smzl-lung-adeno")).toEqual(loaded);
    expect(seen).toEqual([
      ["smzl-lung-adeno", "loading"],
      ["smzl-lung-adeno", "ready"],
    ]);
    expect(await index.loadCase("no-such-case")).toEqual({ ok: false, reason: "unknown", issues: [] });
  });

  it("offers the same facilities as the full-case capability check (caseCapabilityGaps)", async () => {
    const index = createContentIndex(bundledSources());
    for (const card of index.cards) {
      const loaded = await index.loadCase(card.id);
      if (!loaded.ok) throw new Error(card.id);
      const def: CaseDefinition = loaded.def;
      // The pre-index rule, on the full case.
      const expected = [...index.facilities.values()].filter((f: FacilityDefinition) => {
        if (f.id === "clinic-v4" && def.setting !== "outpatient") return false;
        if (!(f.patientSlots.some((s) => s.accepts.includes(def.setting)) || f.id === def.facility)) return false;
        return f.id === def.facility || !caseCapabilityGaps(def, f, index.catalogsFor(f)).some((g) => g.blocking);
      });
      expect(index.facilitiesFor(card).map((f) => f.id), card.id).toEqual(expected.map((f) => f.id));
    }
  });
});

describe("facilities built from room templates (A4)", () => {
  it("compiles the two-level teaching hospital and offers it as an alternative, never as a case's own facility", () => {
    const index = createContentIndex(bundledSources());
    expect(index.issues).toEqual([]);
    const th = index.facilities.get("teaching-hospital");
    // template instances expanded into the flat format: `${instance}.${local}` ids on both levels
    expect(th?.instances).toEqual([]);
    expect(th?.rooms.find((r) => r.id === "icu-1")?.level).toBe("L1");
    expect(th?.placements.some((p) => p.id.startsWith("icu-1."))).toBe(true);
    const offered = index.cards.filter((c) => index.facilitiesFor(c).some((f) => f.id === "teaching-hospital")).map((c) => c.id);
    expect(offered.length).toBeGreaterThanOrEqual(9);
    for (const card of index.cards) {
      expect(card.facility).not.toBe("teaching-hospital");
      expect(index.defaultFacility(card)?.id, card.id).not.toBe("teaching-hospital");
    }
  });
});

describe("lazy loading: concurrency, cache, failures (C1)", () => {
  it("loads at most `concurrency` cases at once and each case once while it is in flight", async () => {
    const { src, calls, gates } = sources(6);
    for (let i = 0; i < 6; i++) gates.set(`copy-${i}`, deferred());
    const index = createContentIndex(src, { concurrency: 2 });
    const all = [0, 1, 2, 3, 4, 5, 0, 1].map((i) => index.loadCase(`copy-${i}`));
    await new Promise((r) => setTimeout(r, 5));
    expect([...calls.keys()]).toEqual(["copy-0", "copy-1"]); // the others wait
    expect(index.caseStatus("copy-5")).toBe("loading");
    for (let i = 0; i < 6; i++) gates.get(`copy-${i}`)!.resolve(null);
    const results = await Promise.all(all);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(results[6]).toBe(results[0]);
    expect([...calls.values()]).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("keeps at most `cacheSize` cases; an evicted case loads again", async () => {
    const { src, calls } = sources(3);
    const index = createContentIndex(src, { cacheSize: 2 });
    for (const id of ["copy-0", "copy-1", "copy-2"]) expect((await index.loadCase(id)).ok).toBe(true);
    expect(index.peekCase("copy-0")).toBeNull();
    expect(index.caseStatus("copy-0")).toBe("idle");
    expect(index.peekCase("copy-2")?.id).toBe("copy-2");
    await index.loadCase("copy-0");
    expect(calls.get("copy-0")).toBe(2);
  });

  it("a failed load can be retried; an invalid case is reported and not loaded again", async () => {
    const { src, docs } = sources(2);
    let fail = true;
    const loaders = new Map(src.loaders);
    loaders.set("copy-0", async () => {
      if (fail) throw new Error("chunk not reachable");
      return structuredClone(docs[0]);
    });
    let invalidCalls = 0;
    loaders.set("copy-1", async () => {
      invalidCalls++;
      return { ...docs[1], phases: "not a list" };
    });
    const index = createContentIndex({ ...src, loaders });
    expect(await index.loadCase("copy-0")).toEqual({ ok: false, reason: "failed", issues: ["chunk not reachable"] });
    expect(index.caseStatus("copy-0")).toBe("failed");
    expect(index.caseIssues("copy-0")).toEqual(["chunk not reachable"]);
    fail = false;
    expect((await index.loadCase("copy-0")).ok).toBe(true);
    expect(index.caseStatus("copy-0")).toBe("ready");
    const bad = await index.loadCase("copy-1");
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.reason).toBe("invalid");
    expect(index.caseStatus("copy-1")).toBe("invalid");
    expect(index.caseIssues("copy-1").join("\n")).toContain("phases");
    await index.loadCase("copy-1");
    expect(invalidCalls).toBe(1);
  });

  it("a document whose id differs from its index entry is refused", async () => {
    const { src, docs } = sources(1);
    const index = createContentIndex({ ...src, loaders: new Map([["copy-0", async () => ({ ...docs[0], id: "someone-else" })]]) });
    const r = await index.loadCase("copy-0");
    expect(r.ok === false && r.reason).toBe("invalid");
  });
});

describe("server content (C5)", () => {
  const stemi = rawCase("stemi-inferior-rv");
  const { solution: _solution, ...publicCase } = stemi as Record<string, unknown> & { solution?: unknown };

  it("takes cases from the paginated index without fetching them; a case is fetched when it is loaded", async () => {
    const index = createContentIndex(bundledSources());
    const serverCase = { ...publicCase, id: "review-demo-case", title: { "zh-CN": "服务器病例", en: "Server case" } };
    const entries: unknown[] = [caseIndexEntry(serverCase, "abc")!, { ...caseIndexEntry(stemi, "x")!, title: "Hijacked" }, { id: "../evil" }];
    for (let i = 0; i < 230; i++) entries.push(caseIndexEntry({ ...publicCase, id: `bulk-${i}` }, "h"));
    const asked: string[] = [];
    const get = async (url: string) => {
      asked.push(url);
      if (url === "/api/content/index") return { cases: [], facilities: [{ id: "general-hospital" }], catalogs: [] };
      const page = /^\/api\/content\/cases\?offset=(\d+)&limit=200$/.exec(url);
      if (page) {
        const offset = Number(page[1]);
        return { total: entries.length, offset, limit: 200, items: entries.slice(offset, offset + 200), issues: [] };
      }
      if (url === "/api/content/cases/review-demo-case") return serverCase;
      return null;
    };
    const added = await loadServerContent(index, get);
    expect(added).toBe(231);
    expect(asked.filter((u) => u.startsWith("/api/content/cases?"))).toEqual(["/api/content/cases?offset=0&limit=200", "/api/content/cases?offset=200&limit=200"]);
    expect(asked.some((u) => u.startsWith("/api/content/cases/"))).toBe(false); // no full case yet
    const card = index.cards.find((c) => c.id === "review-demo-case")!;
    expect(card).toMatchObject({ source: "server", title: { "zh-CN": "服务器病例", en: "Server case" }, contentHash: "abc" });
    expect(index.cards.find((c) => c.id === "stemi-inferior-rv")).toMatchObject({ source: "bundled" });
    expect(index.cards.map((c) => c.id)).toEqual(libraryOrder(index.cards).map((c) => c.id));
    expect(index.facilitiesFor(card).map((f) => f.id)).toContain("general-hospital");
    const loaded = await index.loadCase("review-demo-case");
    expect(loaded.ok && loaded.def.title).toEqual({ "zh-CN": "服务器病例", en: "Server case" });
    expect(asked.filter((u) => u === "/api/content/cases/review-demo-case")).toHaveLength(1);
    const missing = await index.loadCase("bulk-3");
    expect(missing).toEqual({ ok: false, reason: "failed", issues: ['the server did not send case "bulk-3"'] });
  });

  it("an older server (no paginated index): adds new cases, facilities and catalogs in full; never replaces bundled ones", async () => {
    const index = loadContent();
    const serverCase = { ...publicCase, id: "review-demo-case", title: { "zh-CN": "服务器病例", en: "Server case" } };
    const facility = { ...index.facilities.get("general-hospital")!, id: "review-clinic" };
    const hijack = { ...publicCase, title: { "zh-CN": "篡改", en: "Hijacked" } };
    const served: Record<string, unknown> = {
      "/api/content/index": { cases: [{ id: "review-demo-case" }, { id: "stemi-inferior-rv" }, { id: "../evil" }], facilities: [{ id: "review-clinic" }, { id: "general-hospital" }], catalogs: [] },
      "/api/content/cases/review-demo-case": serverCase,
      "/api/content/cases/stemi-inferior-rv": hijack,
      "/api/content/facilities/review-clinic": facility,
    };
    const asked: string[] = [];
    const added = await loadServerContent(index, async (url) => {
      asked.push(url);
      return served[url] ?? null;
    });
    expect(added).toBe(2);
    expect(asked).not.toContain("/api/content/cases/stemi-inferior-rv"); // bundled: not even fetched
    expect(asked.some((u) => u.includes("evil"))).toBe(false);
    const card = index.cards.find((c) => c.id === "review-demo-case");
    expect(card).toMatchObject({ source: "server" });
    expect(index.peekCase("review-demo-case")?.title).toEqual({ "zh-CN": "服务器病例", en: "Server case" });
    const stemiCase = await index.loadCase("stemi-inferior-rv");
    expect(stemiCase.ok && stemiCase.def.title).toEqual(stemi.title);
    expect(index.facilities.has("review-clinic")).toBe(true);
    expect(index.facilitiesFor(card!).map((f) => f.id)).toContain("general-hospital");
    // Not served (offline / standalone): nothing changes.
    expect(await loadServerContent(index, async () => null)).toBe(0);
  });

  it("server cases join the library in library order, not at the end (review round 3)", () => {
    const index = createContentIndex(bundledSources());
    index.addServerContent({ cases: [{ ...publicCase, id: "aaa-server-case", difficulty: 1, provenance: { ...(stemi.provenance as object), kind: "synthetic" } }], facilities: [], catalogs: [] });
    const ids = index.cards.map((c) => c.id);
    expect(ids).toEqual(libraryOrder(index.cards as CaseIndexEntry[]).map((c) => c.id));
    expect(ids.at(-1)).not.toBe("aaa-server-case");
    expect(index.cards.find((c) => c.id === "aaa-server-case")?.source).toBe("server");
  });
});
