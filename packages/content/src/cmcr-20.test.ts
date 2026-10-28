/** Content contract for the 20 source-grounded historical cases. */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { availableDecisions, caseCapabilityGaps, createSession, parseCase, parseCatalog, parseFacility, reduce, verifyCase } from "@clinicalcraft/core";

const ids = ["1551890", "33716", "859819", "1653413", "1551894", "138796", "1423446", "1423442", "1423434", "70044", "1653406", "1653403", "1653404", "1551887", "51617", "70005", "138898", "1074569", "1551893", "1653409"].map((id) => `cmcr-${id}`).sort();
const hospital = parseFacility(JSON.parse(readFileSync(new URL("../facilities/general-hospital.json", import.meta.url), "utf8")));
if (!hospital.ok) throw new Error(JSON.stringify(hospital.issues));
const catalogs = readdirSync(new URL("../catalogs/", import.meta.url)).filter((f) => f.endsWith(".json")).map((f) => {
  const parsed = parseCatalog(JSON.parse(readFileSync(new URL(`../catalogs/${f}`, import.meta.url), "utf8")));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.value;
});

describe("CMCR published-case collection", () => {
  it("contains exactly the 20 selected, distinct source reports", () => {
    expect(readdirSync(new URL("../cases/", import.meta.url)).filter((id) => id.startsWith("cmcr-")).sort()).toEqual(ids);
  });

  it("never references media withdrawn because they identify a patient", () => {
    const { withdrawn } = JSON.parse(readFileSync(new URL("../../../scripts/cmcr-withdrawn-assets.json", import.meta.url), "utf8")) as {
      withdrawn: { case: string; file: string; sha256: string }[];
    };
    expect(withdrawn.length).toBeGreaterThan(0);
    for (const w of withdrawn) {
      const c = JSON.parse(readFileSync(new URL(`../cases/${w.case}/case.json`, import.meta.url), "utf8")) as { assets: { path: string; sha256?: string }[] };
      expect(c.assets.filter((a) => a.path.endsWith(`/${w.file}`) || a.sha256 === w.sha256), `${w.case}/${w.file}`).toEqual([]);
    }
  });

  for (const id of ids) it(`${id}: grounded, staged and completable without original media`, () => {
    const parsed = parseCase(JSON.parse(readFileSync(new URL(`../cases/${id}/case.json`, import.meta.url), "utf8")));
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
    const c = parsed.value;
    expect(c.provenance.kind).toBe("published-case");
    expect(c.provenance.doi).toBeTruthy();
    expect(c.tags).toContain("cmcr-20");
    expect(c.debrief.references.join(" ")).toContain(`https://rs.yiigle.com/cmaid/${id.slice(5)}`);
    expect(c.locales).toEqual(["zh-CN", "en"]);
    // Historical reports do not establish a continuous physiological response model.
    expect(c.clock.mode).toBe("static");
    expect(c.physiology).toBeUndefined();
    expect(c.phases.length).toBeGreaterThanOrEqual(2);
    expect(c.history.some((h) => h.disclosure === "unknown")).toBe(true);
    expect(c.unknowns.length).toBeGreaterThan(0);
    expect(c.history.filter((h) => h.disclosure !== "unknown").every((h) => !!h.source)).toBe(true);
    expect(c.exam.every((e) => !!e.source)).toBe(true);
    expect(c.investigations.every((i) => Object.values(i.results).every((r) => !r.available || !!r.source))).toBe(true);
    // Decision questions are not an answer key at presentation.
    expect(c.decisions.length).toBeGreaterThanOrEqual(2);
    expect(availableDecisions(c, createSession(c)).every((d) => !d.unlocked)).toBe(true);
    const started = reduce(c, createSession(c), { type: "start" }).state;
    const followup = c.phases.find((p) => p.id === "followup")!;
    expect(followup.learnerSwitchable).toBe(false);
    expect(reduce(c, started, { type: "set-phase", phase: "followup" }).rejected?.code).toBe("phase-locked");
    expect(reduce(c, started, { type: "read", investigationId: "followup", phase: "followup" }).rejected?.code).toBe("not-ordered");
    expect(c.investigations.every((i) => i.requires.length > 0)).toBe(true);
    expect(c.facility).toBe("general-hospital");
    expect(caseCapabilityGaps(c, hospital.value, catalogs)).toEqual([]);
    expect(Array.isArray(c.extensions.testUtterances)).toBe(true);
    expect((c.extensions.testUtterances as unknown[]).length).toBeGreaterThan(0);
    for (const a of c.assets) {
      expect(a.localOnly).toBe(true);
      expect(a.path).toMatch(new RegExp(`^/local-assets/cases/${id}/`));
      expect(a.credit).toBeTruthy();
      expect(a.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
    const verification = verifyCase(c);
    expect(verification.ok, JSON.stringify(verification.issues)).toBe(true);
  });
});
