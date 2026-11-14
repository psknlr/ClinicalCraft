/**
 * A case as the content API serves it leaves its reference solution out (`publicCase`, `learnerCase`), and a place in
 * the care team joins the team along that path (docs/TEAM.md §1): the served case alone offers the operating surgeon's
 * place only — its start refuses another —, so the API serves beside it the part of the solution a place needs
 * (`GET /api/content/cases/:id/place-path`, core `placePath`) and its index entry lists the places the full case offers.
 * With that path put in, the served case offers the full case's places and a start in a place joins exactly as the full
 * case's does; nothing more of the solution is ever sent.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSession, parseCase, placePath, reduce, seatsOf, TEAM_PLACES, withPlacePath, type ClinicalAction } from "@clinicalcraft/core";
import { mergeSettings, type CaseIndexEntry } from "@clinicalcraft/agent";
import { placesCase } from "../../core/src/engine/__fixtures__/team-places.js";
import { lapCholeTeamCase } from "../../core/src/engine/procedure/__fixtures__/lap-chole-team.js";
import { CaseStore } from "./case-store.js";
import { learnerCase, publicCase } from "./content.js";
import { startServer, type RunningServer } from "./server.js";

const MINI = JSON.parse(readFileSync(new URL("../../core/src/engine/__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8")) as Record<string, unknown>;

describe("places in the care team of a served case", () => {
  it("the full case offers places in the team; the served forms only the operating surgeon's, and their start refuses another", () => {
    const full = placesCase(MINI);
    expect(seatsOf(full)).toEqual(["surgeon", "first-assistant", "scrub-nurse"]);
    for (const form of [publicCase(full), learnerCase(full)]) {
      // parsed as a front-end parses what it fetched
      const parsed = parseCase(JSON.parse(JSON.stringify(form)));
      if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
      const served = parsed.value;
      expect(served.solution).toEqual([]);
      for (const lineup of [undefined, "three-surgeons"]) {
        expect(seatsOf(served, { lineup })).toEqual(["surgeon"]);
        for (const seat of TEAM_PLACES) {
          const r = reduce(served, createSession(served), { type: "start", seat, ...(lineup ? { lineup } : {}) });
          expect(r.rejected, `${seat} ${lineup}`).toEqual({
            code: "invalid",
            message: "this case was loaded without its reference solution, which a place in the team joins along: only the operating surgeon's place is offered",
          });
        }
        expect(reduce(served, createSession(served), { type: "start", seat: "surgeon", ...(lineup ? { lineup } : {}) }).rejected).toBeUndefined();
      }
    }
  });
});

describe("GET /api/content/cases/:id/place-path (a content directory with team cases)", () => {
  const root = mkdtempSync(join(tmpdir(), "cc-content-places-"));
  const dir = join(root, "content");
  const env = { CLINICALCRAFT_HOME: join(root, "home"), HOME: join(root, "home") };
  const write = (folder: string, value: unknown) => {
    const file = join(dir, "cases", folder, "case.json");
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, JSON.stringify(value, null, 2));
  };
  const team = placesCase(MINI, undefined, { id: "team-mini" });
  const lap = lapCholeTeamCase();
  let server: RunningServer;
  beforeAll(async () => {
    write("team-mini", team);
    write("lap-team", lap);
    write("no-team", { ...structuredClone(MINI), id: "no-team" });
    server = await startServer({ port: 0, host: "127.0.0.1", settings: mergeSettings([{ source: "flag", settings: { locale: "en" } }]), staticDir: null, assetDirs: [], env, log: () => undefined, contentDirs: [dir], contentRevalidateMs: 0 });
  });
  afterAll(async () => {
    await server.close();
    rmSync(root, { recursive: true, force: true });
  });
  const get = (path: string, headers: Record<string, string> = {}) => fetch(new URL(path, server.url), { headers });

  it("lists the places each case offers in its index entry, with each line-up's (the full case's, as core's seatsOf)", async () => {
    const items = ((await (await get("api/content/cases?limit=200&q=mini")).json()) as { items: CaseIndexEntry[] }).items;
    const entry = (id: string) => (items.find((e) => e.id === id) ?? ({} as CaseIndexEntry));
    expect(entry("team-mini")).toMatchObject({ seats: ["first-assistant", "scrub-nurse"], lineups: [{ id: "three-surgeons", seats: ["first-assistant", "second-assistant", "scrub-nurse"] }] });
    expect(entry("no-team")).toMatchObject({ seats: [], lineups: [] });
    const all = ((await (await get("api/content/cases?limit=200")).json()) as { items: CaseIndexEntry[] }).items;
    expect(all.find((e) => e.id === lap.id)).toMatchObject({ seats: ["first-assistant", "scrub-nurse"] });
  });

  it("serves the place path beside the case — its start, the join's actions, the operative steps — and nothing else of the solution", async () => {
    for (const c of [team, lap]) {
      const res = await get(`api/content/cases/${c.id}/place-path`);
      expect(res.status, c.id).toBe(200);
      const body = (await res.json()) as { id: string; path: ClinicalAction[] };
      expect(body).toEqual({ id: c.id, path: JSON.parse(JSON.stringify(placePath(c))) });
      expect(body.path.some((a) => a.type === "finish" || a.type === "answer"), c.id).toBe(false);
      // the case itself still comes without its solution
      const served = (await (await get(`api/content/cases/${c.id}?spoilers=1`)).json()) as Record<string, unknown>;
      expect(served.solution, c.id).toBeUndefined();
    }
    expect(((await (await get("api/content/cases/no-team/place-path")).json()) as { path: unknown[] }).path).toEqual([]);
    const missing = await get("api/content/cases/nope/place-path");
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBe("no-store");
    expect((await fetch(new URL("api/content/cases/team-mini/place-path", server.url), { method: "POST" })).status).toBe(405);
  });

  it("with the path put in, the served case offers the full case's places and a start in a place joins as the full case's does", async () => {
    for (const c of [team, lap]) {
      const parsed = parseCase(await (await get(`api/content/cases/${c.id}?spoilers=1`)).json());
      if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
      const { path } = (await (await get(`api/content/cases/${c.id}/place-path`)).json()) as { path: ClinicalAction[] };
      const playable = withPlacePath(parsed.value, path);
      for (const lineup of [undefined, ...(c.team?.lineups ?? []).map((l) => l.id)]) {
        expect(seatsOf(playable, { lineup }), `${c.id} ${lineup}`).toEqual(seatsOf(c, { lineup }));
        for (const seat of seatsOf(c, { lineup }).filter((s) => s !== "surgeon")) {
          const start = { type: "start" as const, seat, ...(lineup ? { lineup } : {}) };
          const want = reduce(c, createSession(c), start);
          const got = reduce(playable, createSession(playable), start);
          expect(got.rejected, `${c.id} ${seat}`).toBeUndefined();
          expect(got.state, `${c.id} ${seat}`).toEqual(want.state);
        }
      }
    }
  });

  it("answers If-None-Match with 304, each form with its own ETag", async () => {
    const first = await get(`api/content/cases/${lap.id}/place-path`);
    const etag = first.headers.get("etag")!;
    expect(etag).toMatch(/^"[A-Za-z0-9_-]{43}"$/);
    expect(etag).not.toBe((await get(`api/content/cases/${lap.id}`)).headers.get("etag"));
    const again = await get(`api/content/cases/${lap.id}/place-path`, { "if-none-match": etag });
    expect(again.status).toBe(304);
    expect(await again.text()).toBe("");
  });
});

describe("CaseStore: the place path is built when first asked for", () => {
  it("serves the learner form without it, builds it on request, and keeps its ETag", async () => {
    const root = mkdtempSync(join(tmpdir(), "cc-store-places-"));
    try {
      const file = join(root, "cases", "team-mini", "case.json");
      mkdirSync(join(file, ".."), { recursive: true });
      const c = placesCase(MINI, undefined, { id: "team-mini" });
      writeFileSync(file, JSON.stringify(c));
      const store = new CaseStore({ dirs: [root], revalidateMs: 0 });
      const learner = await store.load("team-mini");
      if (learner.status !== "ok") throw new Error("expected a valid case");
      // the learner form alone is kept: no place path built for a case nobody joins
      expect(store.stats.cachedBytes).toBe(learner.body.length);
      expect(await store.currentEtag("team-mini", "places")).toBeNull();
      const places = await store.load("team-mini", "places");
      if (places.status !== "ok") throw new Error("expected the place path");
      expect(JSON.parse(places.body)).toEqual({ id: "team-mini", path: JSON.parse(JSON.stringify(placePath(c))) });
      expect(await store.currentEtag("team-mini", "places")).toBe(places.etag);
      // the other forms are served as before
      expect(await store.load("team-mini")).toEqual(learner);
      expect(await store.load("nope", "places")).toEqual({ status: "not-found" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
