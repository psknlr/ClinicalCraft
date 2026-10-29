/** Source-grounding and playable teaching contracts for the additional 105 reports. */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assess, availableDecisions, caseCapabilityGaps, checkContentStandard, createSession, evaluate, parseCase, parseCatalog, parseFacility, reduce, verifyCase } from "@clinicalcraft/core";

const source = JSON.parse(readFileSync(new URL("../../../scripts/cmcr-105-sources.json", import.meta.url), "utf8")) as {
  cases: { id: string; articleId: string; url: string; verifiedDoi?: string }[];
};
const expected = source.cases.map((s) => s.id).sort();
const mediaReview = JSON.parse(readFileSync(new URL("../../../scripts/cmcr-105-media-review.json", import.meta.url), "utf8")) as {
  files: { case: string; file: string; status: string; sha256: string }[];
};
const hospital = parseFacility(JSON.parse(readFileSync(new URL("../facilities/general-hospital.json", import.meta.url), "utf8")));
if (!hospital.ok) throw new Error(JSON.stringify(hospital.issues));
const catalogs = readdirSync(new URL("../catalogs/", import.meta.url)).filter((file) => file.endsWith(".json")).map((file) => {
  const p = parseCatalog(JSON.parse(readFileSync(new URL(`../catalogs/${file}`, import.meta.url), "utf8")));
  if (!p.ok) throw new Error(JSON.stringify(p.issues));
  return p.value;
});
function raw(id: string) {
  return JSON.parse(readFileSync(new URL(`../cases/${id}/case.json`, import.meta.url), "utf8"));
}

describe("CMCR additional 105 source reports", () => {
  it("adds 105 distinct reports without relabelling the original 20", () => {
    expect(new Set(expected).size).toBe(105);
    const actual = readdirSync(new URL("../cases/", import.meta.url)).filter((id) => id.startsWith("cmcr-") && raw(id).tags.includes("cmcr-105")).sort();
    expect(actual).toEqual(expected);
    for (const id of actual) expect(raw(id).tags).not.toContain("cmcr-20");
  });

  it("uses unique bilingual pseudonyms distinct from the original 20", () => {
    const names = expected.map((id) => raw(id).patient.displayName);
    const original20 = readdirSync(new URL("../cases/", import.meta.url))
      .filter((id) => id.startsWith("cmcr-"))
      .map(raw)
      .filter((c) => c.tags.includes("cmcr-20"))
      .map((c) => c.patient.displayName);
    for (const locale of ["zh-CN", "en"] as const) {
      const marker = locale === "zh-CN" ? /（化名）$/ : /\(pseudonym\)$/;
      const usedBefore = new Set(original20.map((name) => name[locale]));
      expect(new Set(names.map((name) => name[locale])).size).toBe(105);
      for (const name of names) {
        expect(name[locale]).toMatch(marker);
        expect(usedBefore.has(name[locale])).toBe(false);
      }
    }
  });

  it("asserts only the 104 manifest-verified DOIs and retains the unresolved exception", () => {
    expect(source.cases.filter((entry) => entry.verifiedDoi)).toHaveLength(104);
    expect(source.cases.filter((entry) => !entry.verifiedDoi).map((entry) => entry.id)).toEqual(["cmcr-1068618"]);
    for (const entry of source.cases) {
      const c = raw(entry.id);
      expect(c.provenance.doi, entry.id).toBe(entry.verifiedDoi);
      if (!entry.verifiedDoi) {
        expect(c.provenance).not.toHaveProperty("doi");
        expect(c.extensions.sourceDoi).toBeUndefined();
        expect(c.extensions.doiVerifiedAt).toBeUndefined();
        expect(c.extensions.sourceDoiPendingVerification).toBeTruthy();
        expect(c.debrief.references).toContain(entry.url);
      }
    }
  });

  for (const entry of source.cases) it(`${entry.id}: grounded, evidence-gated, bilingual and completable in its facility`, () => {
    const parsed = parseCase(raw(entry.id));
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
    const c = parsed.value;
    expect(checkContentStandard(c)).toEqual([]);
    expect(c.provenance.kind).toBe("published-case");
    expect(c.provenance.review?.status).not.toBe("clinician-reviewed");
    expect(c.debrief.references.join(" ")).toContain(entry.url);
    expect(c.provenance.doi).toBe(entry.verifiedDoi);
    expect(c.locales).toEqual(["zh-CN", "en"]);
    expect(c.clock.mode).toBe("static");
    expect(c.physiology).toBeUndefined();
    expect(c.history.some((h) => h.disclosure === "unknown")).toBe(true);
    expect(c.unknowns.length).toBeGreaterThan(0);
    expect(c.history.filter((h) => h.disclosure !== "unknown").every((h) => !!h.source)).toBe(true);
    expect(c.exam.every((e) => !!e.source)).toBe(true);
    for (const inv of c.investigations) {
      expect(inv.performedAt, inv.id).toBe("records");
      expect(inv.requires.every((r) => r === "records"), inv.id).toBe(true);
      expect(inv.risk, inv.id).toBe("none");
      expect(Object.values(inv.results).every((r) => !r.available || !!r.source), inv.id).toBe(true);
    }
    expect(c.decisions.length).toBeGreaterThanOrEqual(3);
    expect(availableDecisions(c, createSession(c)).every((d) => !d.unlocked)).toBe(true);
    expect(c.decisions.every((d) => d.options.length >= 3)).toBe(true);
    expect(c.rubric.some((r) => r.domain === "safety")).toBe(true);
    expect(JSON.stringify(c.rubric)).toContain("decidedFirstTry");
    expect(c.rubric.some((r) => r.domain === "communication" && !r.met && !!r.judgeGuidance)).toBe(true);
    expect(c.learningOutcomes.length).toBeGreaterThanOrEqual(4);
    expect(c.learningOutcomes.length).toBeLessThanOrEqual(6);
    expect(caseCapabilityGaps(c, hospital.value, catalogs)).toEqual([]);
    const ageYears = c.patient.ageUnit === "months" ? c.patient.age / 12 : c.patient.ageUnit === "days" ? c.patient.age / 365.25 : c.patient.age;
    if (ageYears < 2) {
      expect(c.patient.appearance?.stature).toBe("infant");
      expect(c.patient.nonVerbalWhen).toBeDefined();
      for (const phase of c.phases) {
        const state = { ...createSession(c), started: true, phase: phase.id };
        expect(evaluate(c, state, c.patient.nonVerbalWhen!), phase.id).toBe(true);
      }
      expect(c.patient.persona.companion?.answersHistory).toBe(true);
    }
    for (const a of c.assets) {
      expect(a.localOnly).toBe(true);
      expect(a.path).toMatch(new RegExp(`^/local-assets/cases/${c.id}/`));
      expect(a.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(a.credit).toBeTruthy();
      expect(mediaReview.files.some((m) => m.case === c.id && m.status === "approved" && a.path.endsWith(`/${m.file}`) && m.sha256 === a.sha256), a.id).toBe(true);
    }
    const verified = verifyCase(c);
    expect(verified.ok, JSON.stringify(verified.issues)).toBe(true);
    expect(assess(c, reduce(c, createSession(c), { type: "start" }).state).score.earned).toBe(0);
    // Correcting an unsafe first answer permits completion without erasing the mistake.
    const replay = (wrongFirst: boolean) => {
      let state = createSession(c);
      for (const action of c.solution) {
        if (wrongFirst && action.type === "answer") {
          const decision = c.decisions.find((d) => d.id === action.decisionId)!;
          const wrong = decision.options.find((o) => !o.correct)!;
          const step = reduce(c, state, { ...action, optionIds: [wrong.id] });
          expect(step.rejected, decision.id).toBeUndefined();
          state = step.state;
        }
        const step = reduce(c, state, action);
        expect(step.rejected, JSON.stringify(action)).toBeUndefined();
        state = step.state;
      }
      expect(state.finished).toBe(true);
      return assess(c, state).score.percent;
    };
    expect(replay(true)).toBeLessThan(replay(false));
    const guide = readFileSync(new URL(`../cases/${entry.id}/README.md`, import.meta.url), "utf8");
    for (const heading of ["Learning outcomes", "Clinical summary", "Reference", "Source and adaptation", "Fidelity limits", "Validation", "中文摘要"]) expect(guide).toContain(heading);
  });
});
