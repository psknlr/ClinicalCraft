/** Content contract for the 20 source-grounded historical cases. */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assess, availableDecisions, caseCapabilityGaps, createSession, parseCase, parseCatalog, parseFacility, reduce, verifyCase } from "@clinicalcraft/core";
import { stepsThatTrapALateLearner } from "./__fixtures__/completable.js";

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
    const collection = readdirSync(new URL("../cases/", import.meta.url)).filter((id) => {
      if (!id.startsWith("cmcr-")) return false;
      const c = JSON.parse(readFileSync(new URL(`../cases/${id}/case.json`, import.meta.url), "utf8")) as { tags: string[] };
      return c.tags.includes("cmcr-20");
    });
    expect(collection.sort()).toEqual(ids);
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
    // No objective can become impossible: a learner who does any order or intervention late can still finish.
    expect(stepsThatTrapALateLearner(c)).toEqual([]);
  });
});

/** Same text for the matcher: case, spaces and sentence punctuation do not count. */
const plain = (s: string): string => s.toLowerCase().replace(/[\s?？。.!！,，]/g, "");
const DOI = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;

function load(id: string) {
  const parsed = parseCase(JSON.parse(readFileSync(new URL(`../cases/${id}/case.json`, import.meta.url), "utf8")));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.value;
}

describe("CMCR teaching depth and governance (docs/CASE_AUTHORING.md §9)", () => {
  for (const id of ids) it(`${id}: decisions, rubric, debrief, references, matcher corpus and README`, () => {
    const c = load(id);
    expect(c.version).toMatch(/^1\.1\.\d+$/); // the 1.1 revision; patch releases keep the standard
    // Decisions test reasoning: at least three, each with at least three options and feedback of its own.
    expect(c.decisions.length).toBeGreaterThanOrEqual(3);
    for (const d of c.decisions) {
      expect(d.options.length, d.id).toBeGreaterThanOrEqual(3);
      const feedback = d.options.map((o) => JSON.stringify(o.feedback));
      expect(new Set(feedback).size, `${d.id}: identical feedback on two options`).toBe(feedback.length);
    }
    // The rubric: a safety item, first-try decision scoring and one examiner-judged communication item.
    expect(c.rubric.length).toBeGreaterThanOrEqual(8);
    expect(c.rubric.some((r) => r.domain === "safety")).toBe(true);
    expect(JSON.stringify(c.rubric)).toContain("decidedFirstTry");
    expect(c.rubric.some((r) => r.domain === "communication" && !r.met && !!r.judgeGuidance)).toBe(true);
    expect(c.debrief.teachingPoints.length).toBeGreaterThanOrEqual(3);
    expect(c.learningOutcomes.length).toBeGreaterThanOrEqual(4);
    // An honest review status: editorial, never a claimed clinician review.
    expect(c.provenance.review?.status).toBe("editorial");
    expect(c.provenance.review?.notes?.en).toMatch(/not yet reviewed by a licensed clinician/);
    // The library card and the triage note are different texts.
    for (const locale of ["zh-CN", "en"] as const) expect(c.summary[locale], locale).not.toBe(c.patient.triageNote?.[locale]);
    // References: well-formed DOIs (a hyphen, never an en dash).
    expect(c.provenance.doi).toMatch(DOI);
    for (const ref of c.debrief.references) {
      for (const m of ref.matchAll(/\b10\.\d{4,9}\/\S+/g)) expect(m[0].replace(/[.,;]+$/, ""), ref).toMatch(DOI);
    }
    // The matcher corpus: genuine paraphrases, none a canonical question, one for every required history item.
    const utterances = c.extensions.testUtterances as { text: string; locale: string; expect: string[] }[];
    expect(utterances.length).toBeGreaterThanOrEqual(30);
    const questions = new Set(c.history.flatMap((h) => [h.question["zh-CN"], h.question.en]).filter((q): q is string => !!q).map(plain));
    expect(utterances.filter((u) => questions.has(plain(u.text))).map((u) => u.text)).toEqual([]);
    for (const h of c.history.filter((item) => item.required)) {
      expect(utterances.some((u) => u.expect.includes(h.id)), `no paraphrase for ${h.id}`).toBe(true);
    }
    // A record review reads the chart: no device, no sampling, no procedure risk — and says so (`performedAt`).
    for (const i of c.investigations.filter((inv) => inv.requires.includes("records") || inv.performedAt === "records")) {
      expect(i.requires, i.id).toEqual(["records"]);
      expect(i.performedAt, i.id).toBe("records");
      expect(i.risk, i.id).toBe("none");
    }
    // Doing nothing earns nothing: harm-avoidance items count only once the harm was possible (`scoredWhen`).
    const idle = assess(c, reduce(c, createSession(c), { type: "start" }).state);
    expect(idle.score.earned, "a learner who does nothing").toBe(0);
    // The facilitator guide.
    const readme = readFileSync(new URL(`../cases/${id}/README.md`, import.meta.url), "utf8");
    for (const heading of ["Learning outcomes", "Source and adaptation", "References", "Changelog", "中文摘要"]) {
      expect(readme, heading).toMatch(new RegExp(`^## ${heading}`, "m"));
    }
  });

  it("gives every patient a distinct pseudonym in both languages", () => {
    // The case contracts above already validate the full definitions. This
    // cross-case metadata check only needs each display name, read once.
    const displayNames = ids.map((id) => {
      const c = JSON.parse(readFileSync(new URL(`../cases/${id}/case.json`, import.meta.url), "utf8")) as {
        patient: { displayName: Record<"zh-CN" | "en", string> };
      };
      return c.patient.displayName;
    });
    for (const locale of ["zh-CN", "en"] as const) {
      const names = displayNames.map((name) => name[locale]);
      expect(new Set(names).size, locale).toBe(names.length);
    }
  });
});
