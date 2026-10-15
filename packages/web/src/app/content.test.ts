/** Content from `clinicalcraft serve`'s contentDirs joins the bundled library (C5). */
import { libraryOrder } from "@clinicalcraft/agent";
import { describe, expect, it } from "vitest";
import { loadContent, loadServerContent } from "./content.js";

describe("server content (C5)", () => {
  it("adds cases, facilities and catalogs the bundle does not have; never replaces bundled ones", async () => {
    const index = loadContent();
    const bundled = index.getCase("stemi-inferior-rv");
    if (!bundled) return;
    const { solution: _solution, ...publicCase } = bundled;
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
    expect(index.getCase("review-demo-case")?.title).toEqual({ "zh-CN": "服务器病例", en: "Server case" });
    expect(index.getCase("stemi-inferior-rv")?.title).toEqual(bundled.title);
    expect(index.facilities.has("review-clinic")).toBe(true);
    expect(index.facilitiesFor(card!).map((f) => f.id)).toContain("general-hospital");
    // Not served (offline / standalone): nothing changes.
    expect(await loadServerContent(index, async () => null)).toBe(0);
  });

  it("server cases join the library in library order, not at the end (review round 3)", () => {
    const index = loadContent();
    const bundled = index.getCase("stemi-inferior-rv");
    if (!bundled) return;
    const { solution: _solution, ...publicCase } = bundled;
    index.addServerContent({ cases: [{ ...publicCase, id: "aaa-server-case", difficulty: 1, provenance: { ...publicCase.provenance, kind: "synthetic" } }], facilities: [], catalogs: [] });
    const ids = index.cards.map((c) => c.id);
    const expected = libraryOrder(ids.map((id) => index.getCase(id)!)).map((c) => c.id);
    expect(ids).toEqual(expected);
    expect(ids.at(-1)).not.toBe("aaa-server-case");
  });
});
