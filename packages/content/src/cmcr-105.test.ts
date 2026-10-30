/**
 * Content contract for the 105 additional CMCR cases (tag `cmcr-105`): the collection is pinned to its source map;
 * every case meets the clinical content standard (docs/CASE_AUTHORING.md §9) at the depth of the original selection
 * (cmcr-20.test.ts), with assessment that cannot be gamed (doing nothing earns 0, a wrong first answer costs marks,
 * critical items are acts) and an honest statement of what has been checked against the source; and the collection
 * is not a template — no teaching text is shared by more than two cases.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assess,
  availableDecisions,
  caseCapabilityGaps,
  checkContentStandard,
  createSession,
  evaluate,
  parseCase,
  parseCatalog,
  parseFacility,
  reduce,
  verifyCase,
  WELL_FORMED_DOI,
  type CaseDefinition,
} from "@clinicalcraft/core";

/** The source map decides the collection: a DOI is either verified or pending, with the string as supplied and why. */
const source = JSON.parse(readFileSync(new URL("../../../scripts/cmcr-105-sources.json", import.meta.url), "utf8")) as {
  cases: { id: string; articleId: string; url: string; verifiedDoi?: string; doiPendingVerification?: string; doiPendingReason?: string; sourceTextSha256: string }[];
};
const expected = source.cases.map((s) => s.id).sort();
/** DOIs that could not be confirmed (doi.org and Crossref unreachable; each one's reason is in the source map). */
const PENDING_DOIS = ["cmcr-1068587", "cmcr-1068618", "cmcr-1322371", "cmcr-1551889"];
/** Every case folder of the library, and the collection tags a CMCR case carries exactly one of. */
const caseIds = readdirSync(new URL("../cases/", import.meta.url)).sort();
const COLLECTION_TAGS = ["cmcr-20", "cmcr-105"];
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
function load(id: string): CaseDefinition {
  const parsed = parseCase(raw(id));
  if (!parsed.ok) throw new Error(`${id}: ${JSON.stringify(parsed.issues)}`);
  return parsed.value;
}
const LOCALES = ["zh-CN", "en"] as const;
type Text = Partial<Record<(typeof LOCALES)[number], string>>;
/** Same text for the matcher and for the template check: case, spaces and punctuation do not count. */
const plain = (s: string): string => s.toLowerCase().replace(/[\s?？。.!！,，;；:：、"“”'‘’()（）]/g, "");
/** Authoring language that must never reach the patient's or the carer's mouth (STANDARD: no "the source" in persona voice). */
const META = /原报告|原病历|原文|源病例|原始资料|原病例资料|source (report|notes?|record|case)|the report (does not|doesn't|did not)|educational role/i;
/** The facilitator guide's parts (CASE_AUTHORING §9.6), matched as heading prefixes. */
const README_PARTS = ["Case card", "Learning outcomes", "Clinical summary", "Scenario timeline", "Decisions and assessment", "Reference path", "Clinical numbers check", "Facilitator notes", "Embodied mode", "Source and adaptation", "Matcher notes", "References", "Changelog", "Validation", "中文摘要"];

type Cond = Record<string, unknown>;
/** The leaf conditions of a condition tree (`all`, `any`, `not` expanded). */
function leaves(cond: unknown, out: Cond[] = []): Cond[] {
  if (!cond || typeof cond !== "object") return out;
  const o = cond as Cond;
  let nested = false;
  for (const k of ["all", "any"]) if (Array.isArray(o[k])) { nested = true; for (const x of o[k] as unknown[]) leaves(x, out); }
  if (o.not) { nested = true; leaves(o.not, out); }
  if (!nested) out.push(o);
  return out;
}
/** The decisions a condition waits for, following the objectives and phases it names. */
function decisionsAwaited(c: CaseDefinition, cond: unknown, seen = new Set<string>()): Set<string> {
  const out = new Set<string>();
  for (const leaf of leaves(cond)) {
    for (const k of ["decided", "decidedFirstTry", "decidedCorrectly"]) if (typeof leaf[k] === "string") out.add(leaf[k] as string);
    const objective = typeof leaf.objective === "string" ? c.objectives.find((o) => o.id === leaf.objective) : undefined;
    if (objective && !seen.has(`o:${objective.id}`)) { seen.add(`o:${objective.id}`); for (const d of decisionsAwaited(c, objective.completeWhen, seen)) out.add(d); }
    const phase = typeof leaf.phase === "string" && Object.keys(leaf).length === 1 ? c.phases.find((p) => p.id === leaf.phase) : undefined;
    if (phase && !seen.has(`p:${phase.id}`)) { seen.add(`p:${phase.id}`); for (const d of decisionsAwaited(c, phase.enterWhen, seen)) out.add(d); }
  }
  return out;
}
/** Every string of a value (recursively), for the persona voice check. */
function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) for (const v of x) strings(v, out);
  else if (x && typeof x === "object") for (const v of Object.values(x)) strings(v, out);
  return out;
}
const ageInYears = (c: CaseDefinition): number => {
  const p = c.patient as { age: number; ageUnit?: string };
  return p.ageUnit === "months" ? p.age / 12 : p.ageUnit === "days" ? p.age / 365.25 : p.ageUnit === "hours" ? p.age / 8766 : p.age;
};

describe("CMCR additional 105 source reports", () => {
  it("takes its 105 distinct reports from the source map: each one a case tagged for this collection, and no other case so tagged", () => {
    expect(new Set(expected).size).toBe(105);
    for (const entry of source.cases) {
      expect(entry.id).toBe(`cmcr-${entry.articleId}`);
      expect(entry.url, entry.id).toBe(`https://rs.yiigle.com/cmaid/${entry.articleId}`);
      expect(entry.sourceTextSha256, entry.id).toMatch(/^[a-f0-9]{64}$/);
      const c = raw(entry.id);
      expect(c.id).toBe(entry.id);
      expect(c.tags, entry.id).toContain("cmcr-105");
    }
    expect(caseIds.filter((id) => raw(id).tags.includes("cmcr-105"))).toEqual(expected);
  });

  it("puts every CMCR case in exactly one collection, so no case escapes both collection contracts", () => {
    // This file pins the 105 to the source map; cmcr-20.test.ts pins the original 20 to its own id list.
    const cmcr = caseIds.filter((id) => id.startsWith("cmcr-") || raw(id).tags.some((tag: string) => tag.startsWith("cmcr")));
    expect(cmcr.length).toBeGreaterThanOrEqual(125);
    for (const id of cmcr) expect(raw(id).tags.filter((tag: string) => COLLECTION_TAGS.includes(tag)), id).toHaveLength(1);
  });

  it("uses unique bilingual pseudonyms distinct from the original 20", () => {
    const names = expected.map((id) => raw(id).patient.displayName);
    const original20 = caseIds.filter((id) => id.startsWith("cmcr-")).map(raw).filter((c) => c.tags.includes("cmcr-20")).map((c) => c.patient.displayName);
    for (const locale of LOCALES) {
      const marker = locale === "zh-CN" ? /（化名）$/ : /\(pseudonym\)$/;
      const usedBefore = new Set(original20.map((name) => name[locale]));
      expect(new Set(names.map((name) => name[locale])).size).toBe(105);
      for (const name of names) {
        expect(name[locale]).toMatch(marker);
        expect(usedBefore.has(name[locale])).toBe(false);
      }
    }
  });

  it("asserts only the verified DOIs and keeps the unresolved ones pending, citing the publisher URL instead", () => {
    const verified = source.cases.filter((entry) => entry.verifiedDoi);
    const pending = source.cases.filter((entry) => !entry.verifiedDoi);
    expect(verified).toHaveLength(105 - PENDING_DOIS.length);
    expect(pending.map((entry) => entry.id).sort()).toEqual(PENDING_DOIS);
    for (const entry of verified) {
      // A bare DOI: one ending in punctuation is ambiguous (the pending cmcr-1068587 and cmcr-1068618).
      expect(entry.verifiedDoi, entry.id).toMatch(WELL_FORMED_DOI);
      expect(entry.verifiedDoi, entry.id).not.toMatch(/[.,;:]$/);
      expect(entry.doiPendingVerification, entry.id).toBeUndefined();
      const c = raw(entry.id);
      expect(c.provenance.doi, entry.id).toBe(entry.verifiedDoi);
      expect(c.provenance.citation, entry.id).toContain(entry.verifiedDoi);
      expect(c.extensions.sourceDoiPendingVerification, entry.id).toBeUndefined();
      if (c.extensions.sourceDoi !== undefined) expect(c.extensions.sourceDoi, entry.id).toBe(entry.verifiedDoi);
    }
    for (const entry of pending) {
      expect(entry.doiPendingVerification, entry.id).toBeTruthy();
      expect(entry.doiPendingReason, entry.id).toBeTruthy();
      const c = raw(entry.id);
      expect(c.provenance, entry.id).not.toHaveProperty("doi");
      expect(c.extensions.sourceDoiPendingVerification, entry.id).toBe(entry.doiPendingVerification);
      expect(c.extensions.sourceDoi, entry.id).toBeUndefined();
      expect(c.extensions.doiVerifiedAt, entry.id).toBeUndefined();
      expect(c.extensions.authorChecks?.doiWebVerified, entry.id).not.toBe(true);
      expect(c.extensions.sourceDoiVerification?.verified, entry.id).not.toBe(true);
      // Neither the citation nor a reference gives the unresolved string; the publisher URL stands in for it.
      const unresolved = entry.doiPendingVerification!.replace(/[.,;:]+$/, "");
      expect([c.provenance.citation, ...c.debrief.references].filter((text: string) => text.includes(unresolved)), entry.id).toEqual([]);
      expect(c.debrief.references, entry.id).toContain(entry.url);
    }
  });

  it("is not a template: no teaching text is shared by more than two cases, and no case asks mostly stock questions", () => {
    const owners = new Map<string, Set<string>>();
    const questions = new Map<string, Set<string>>();
    const note = (map: Map<string, Set<string>>, id: string, text: Text | string | undefined, min: number) => {
      for (const s of typeof text === "string" ? [text] : LOCALES.map((l) => text?.[l])) {
        if (!s || plain(s).length < min) continue;
        const key = plain(s);
        map.set(key, (map.get(key) ?? new Set()).add(id));
      }
    };
    for (const id of expected) {
      const c = load(id);
      for (const o of c.objectives) { note(owners, id, o.title as Text, 12); note(owners, id, o.hint as Text | undefined, 12); }
      for (const n of c.npcs) note(owners, id, n.knowledge as Text, 12);
      for (const r of c.rubric) { note(owners, id, r.text as Text, 16); note(owners, id, r.judgeGuidance as Text | undefined, 16); }
      for (const d of c.decisions) {
        note(owners, id, d.prompt as Text, 12);
        for (const o of d.options) note(owners, id, o.feedback as Text, 16);
      }
      for (const p of c.debrief.teachingPoints) note(owners, id, p as Text, 16);
      for (const k of c.debrief.keyReasoning ?? []) note(owners, id, k as Text, 16);
      for (const lo of c.learningOutcomes) note(owners, id, lo as Text, 16);
      for (const h of c.history) note(questions, id, h.question as Text, 4);
    }
    const shared = [...owners].filter(([, ids]) => ids.size > 2).map(([text, ids]) => `${[...ids].join(",")}: ${text.slice(0, 80)}`);
    expect(shared).toEqual([]);
    // Screening questions ("Any allergies?") recur naturally; a template's do not stop there (72 % of the template
    // versions' questions recurred in ten or more cases). A case may draw at most 40 % of its questions from stock.
    const stock = new Set([...questions].filter(([, ids]) => ids.size >= 10).map(([text]) => text));
    const stocky = expected.flatMap((id) => {
      const qs = load(id).history.map((h) => LOCALES.some((l) => stock.has(plain(h.question[l] ?? ""))));
      const share = qs.filter(Boolean).length / qs.length;
      return share > 0.4 ? [`${id}: ${Math.round(share * 100)} % stock questions`] : [];
    });
    expect(stocky).toEqual([]);
  });

  for (const entry of source.cases) it(`${entry.id}: grounded, evidence-gated, bilingual, deep enough to teach and completable in its facility`, () => {
    const c = load(entry.id);
    const at = (what: string) => `${entry.id} ${what}`;
    // Every content-standard lint (neutral option ids, no length cue, no authoring language, gates, matcher corpus…).
    expect(checkContentStandard(c)).toEqual([]);
    expect(c.version).toMatch(/^1\.(?:[1-9]\d*)\.\d+$/);
    expect(c.provenance.kind).toBe("published-case");
    expect(c.debrief.references.join(" ")).toContain(entry.url);
    expect(c.provenance.doi).toBe(entry.verifiedDoi);
    expect(c.locales).toEqual(["zh-CN", "en"]);
    // Historical reports do not establish a continuous physiological response model.
    expect(c.clock.mode).toBe("static");
    expect(c.physiology).toBeUndefined();
    expect(c.facility).toBe("general-hospital");

    // An honest review status: editorial, never a claimed clinician review, and whether the facts were re-checked
    // against the full source article.
    const review = c.provenance.review!;
    expect(review.status).toBe("editorial");
    expect(review.reviewers.length).toBeGreaterThan(0);
    expect(review.guidelines.length, at("review.guidelines")).toBeGreaterThanOrEqual(3);
    expect(review.notes?.en).toMatch(/not yet reviewed by a licensed clinician/);
    if (c.extensions.sourceTextChecked === true) {
      expect(c.extensions.sourceTextSha256, at("sourceTextSha256")).toBe(entry.sourceTextSha256);
    } else {
      expect(c.extensions.sourceTextChecked, at("extensions.sourceTextChecked")).toBe(false);
      expect(review.notes?.en).toMatch(/not yet been checked against the full source article/);
      expect(review.notes?.["zh-CN"]).toContain("尚未对照原文全文核对");
    }

    // The library card and the triage note are different texts.
    for (const locale of LOCALES) expect(c.summary[locale], locale).not.toBe(c.patient.triageNote?.[locale]);

    // Phases: staged evidence, and an outcome phase that opens only once every decision has been answered.
    expect(c.phases.length).toBeGreaterThanOrEqual(3);
    expect(c.phases.length).toBeLessThanOrEqual(5);
    const last = c.phases[c.phases.length - 1]!;
    expect(last.learnerSwitchable).toBe(false);
    const started = reduce(c, createSession(c), { type: "start" }).state;
    expect(reduce(c, started, { type: "set-phase", phase: last.id }).rejected?.code).toBe("phase-locked");
    expect([...decisionsAwaited(c, last.enterWhen)].sort(), at(`phase ${last.id} waits for every decision`)).toEqual(c.decisions.map((d) => d.id).sort());

    // History: grounded, in the patient's (or carer's) own voice, never authoring language.
    expect(c.history.length).toBeGreaterThanOrEqual(14);
    expect(c.history.length).toBeLessThanOrEqual(40);
    const required = c.history.filter((h) => h.required).length;
    expect(required).toBeGreaterThanOrEqual(4);
    expect(required).toBeLessThanOrEqual(10);
    expect(c.history.some((h) => h.disclosure === "unknown")).toBe(true);
    expect(c.history.filter((h) => h.disclosure !== "unknown").every((h) => !!h.source)).toBe(true);
    for (const h of c.history) for (const s of strings(h.answer)) expect(s, at(`history ${h.id}`)).not.toMatch(META);
    for (const s of strings(c.patient.persona)) expect(s, at("persona")).not.toMatch(META);
    for (const s of strings(c.patient.triageNote)) expect(s, at("triage note")).not.toMatch(META);
    expect(c.exam.every((e) => !!e.source)).toBe(true);
    expect(c.unknowns.length).toBeGreaterThanOrEqual(4);

    // Investigations: the decisive records and the tests a learner would order, results with their source.
    expect(c.investigations.length).toBeGreaterThanOrEqual(6);
    expect(c.investigations.length).toBeLessThanOrEqual(20);
    for (const inv of c.investigations) {
      expect(inv.requires.length, at(inv.id)).toBeGreaterThan(0);
      expect(Object.values(inv.results).every((r) => !r.available || !!r.source), at(inv.id)).toBe(true);
      // A record review reads the chart: no device, no sampling, no procedure risk — and says so (`performedAt`).
      if (inv.requires.includes("records") || inv.performedAt === "records") {
        expect(inv.requires, at(inv.id)).toEqual(["records"]);
        expect(inv.performedAt, at(inv.id)).toBe("records");
        expect(inv.risk, at(inv.id)).toBe("none");
      }
    }
    // Interventions: the report's management, today's steps and the tempting wrong ones — no simulated physiology.
    expect(c.interventions.length).toBeGreaterThanOrEqual(7);
    expect(c.interventions.length).toBeLessThanOrEqual(20);
    for (const iv of c.interventions) {
      expect(iv.effects, at(iv.id)).toEqual([]);
      for (const locale of LOCALES) expect(iv.response?.[locale], at(`${iv.id} response`)).toBeTruthy();
    }

    // Decisions test reasoning: four or five, three to five options each with feedback of its own, none open at the start.
    expect(c.decisions.length).toBeGreaterThanOrEqual(4);
    expect(c.decisions.length).toBeLessThanOrEqual(5);
    for (const d of c.decisions) {
      expect(d.options.length, d.id).toBeGreaterThanOrEqual(3);
      expect(d.options.length, d.id).toBeLessThanOrEqual(5);
      const feedback = d.options.map((o) => JSON.stringify(o.feedback));
      expect(new Set(feedback).size, `${d.id}: identical feedback on two options`).toBe(feedback.length);
    }
    expect(availableDecisions(c, createSession(c)).every((d) => !d.unlocked)).toBe(true);

    // The rubric: a safety item, first-try decision scoring, an examiner-judged communication item, and one to three
    // critical items that are acts (never a decision alone, never hindsight), none worded as an option.
    expect(c.rubric.length).toBeGreaterThanOrEqual(10);
    expect(c.rubric.length).toBeLessThanOrEqual(15);
    expect(c.rubric.some((r) => r.domain === "safety")).toBe(true);
    expect(JSON.stringify(c.rubric)).toContain("decidedFirstTry");
    expect(c.rubric.some((r) => r.domain === "communication" && !r.met && !!r.judgeGuidance)).toBe(true);
    const critical = c.rubric.filter((r) => r.critical);
    expect(critical.length).toBeGreaterThanOrEqual(1);
    expect(critical.length).toBeLessThanOrEqual(3);
    for (const r of critical) {
      const acts = leaves(r.met).filter((l) => ["intervened", "attempted", "ordered", "examined", "asked", "flag"].some((k) => k in l));
      expect(acts.length, at(`critical ${r.id} is an act`)).toBeGreaterThan(0);
    }
    const optionTexts = new Set(c.decisions.flatMap((d) => d.options.flatMap((o) => LOCALES.map((l) => plain(o.text[l] ?? "")))));
    for (const r of c.rubric) for (const l of LOCALES) expect(optionTexts.has(plain(r.text[l] ?? "")), at(`rubric ${r.id} repeats an option`)).toBe(false);

    // Teaching: outcomes, objectives, staff, a debrief that names its guidance.
    expect(c.learningOutcomes.length).toBeGreaterThanOrEqual(5);
    expect(c.learningOutcomes.length).toBeLessThanOrEqual(6);
    expect(c.objectives.length).toBeGreaterThanOrEqual(5);
    expect(c.objectives.length).toBeLessThanOrEqual(6);
    const attending = c.npcs.find((n) => n.role === "attending");
    expect(attending, at("attending")).toBeDefined();
    expect(attending!.revealsDiagnosis).toBe(false);
    expect(c.npcs.length).toBeGreaterThanOrEqual(2);
    const tps = c.debrief.teachingPoints;
    expect(tps.length).toBeGreaterThanOrEqual(4);
    expect(tps.length).toBeLessThanOrEqual(6);
    expect(tps.filter((p) => /(19|20)\d{2}/.test(strings(p).join(" "))).length, at("dated teaching points")).toBeGreaterThanOrEqual(2);
    const reasoning = c.debrief.keyReasoning ?? [];
    expect(reasoning.length).toBeGreaterThanOrEqual(4);
    expect(reasoning.length).toBeLessThanOrEqual(6);
    expect((c.debrief.conclusion.en ?? "").length, at("conclusion (en)")).toBeGreaterThanOrEqual(400);
    expect((c.debrief.conclusion["zh-CN"] ?? "").length, at("conclusion (zh-CN)")).toBeGreaterThanOrEqual(120);
    expect(c.debrief.references.length).toBeGreaterThanOrEqual(4);

    // The matcher corpus: genuine paraphrases and look-alike negatives, none a canonical question, one for every
    // required history item.
    const utterances = c.extensions.testUtterances as { text: string; locale: string; expect: string[] }[];
    expect(utterances.length).toBeGreaterThanOrEqual(35);
    expect(utterances.filter((u) => u.expect.length === 0).length, at("negative utterances")).toBeGreaterThanOrEqual(2);
    const canonical = new Set(c.history.flatMap((h) => LOCALES.map((l) => h.question[l])).filter((q): q is string => !!q).map(plain));
    expect(utterances.filter((u) => canonical.has(plain(u.text))).map((u) => u.text)).toEqual([]);
    for (const h of c.history.filter((item) => item.required)) expect(utterances.some((u) => u.expect.includes(h.id)), `no paraphrase for ${h.id}`).toBe(true);

    // Completable in the general hospital, by an infant's carer where the patient cannot speak.
    expect(caseCapabilityGaps(c, hospital.value, catalogs)).toEqual([]);
    if (ageInYears(c) < 2) {
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

    // Scoring: the reference path earns everything; doing nothing earns nothing; a wrong first answer costs marks.
    const verified = verifyCase(c);
    expect(verified.ok, JSON.stringify(verified.issues)).toBe(true);
    expect(verified.assessment?.score.percent).toBe(100);
    expect(verified.assessment?.criticalMissed ?? []).toEqual([]);
    expect(assess(c, started).score.earned).toBe(0);
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
    // No objective can become impossible (the case would never finish): a learner who skips any act of the reference
    // path and does it late — then everything else again — can still finish.
    const acts = c.solution.flatMap((a, k) => (a.type === "intervene" || a.type === "order" ? [k] : []));
    for (const k of acts) {
      let state = createSession(c);
      const tryStep = (action: (typeof c.solution)[number]) => {
        const step = reduce(c, state, action);
        if (!step.rejected) state = step.state;
      };
      c.solution.forEach((action, i) => i !== k && action.type !== "finish" && tryStep(action));
      tryStep(c.solution[k]!);
      for (const action of c.solution) if (action.type !== "finish") tryStep(action);
      expect(reduce(c, state, { type: "finish" }).rejected?.code, at(`skipping solution step ${k} (${JSON.stringify(c.solution[k])}) and doing it late`)).toBeUndefined();
    }

    // The facilitator guide (CASE_AUTHORING §9.6) with what is still to verify.
    const guide = readFileSync(new URL(`../cases/${entry.id}/README.md`, import.meta.url), "utf8");
    const headings = [...guide.matchAll(/^## (.+)$/gm)].map((m) => m[1]!.trim());
    for (const part of README_PARTS) expect(headings.some((h) => h.startsWith(part)), at(`README part "${part}"`)).toBe(true);
    expect(guide).toMatch(/To verify|待核实/);
  });
});
