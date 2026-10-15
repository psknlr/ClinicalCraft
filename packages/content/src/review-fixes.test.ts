/**
 * Regression tests for the clinical-content review of the built-in cases:
 * dose texts that gave away values the learner must elicit, monitor/exam
 * mismatches, guideline citations, offline-matcher gaps, phase-incoherent
 * patient answers and rubric/phase logic. Each `describe` names the case and
 * the defect it pins; the fixes live in `packages/content/cases/<id>/case.json`.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assess,
  createSession,
  matchExam,
  orderWarnings,
  parseCase,
  replay,
  t,
  vitalsAt,
  type CaseDefinition,
  type ClinicalAction,
  type SessionState,
} from "@clinicalcraft/core";
import { resolveFinding, resolveIntervention, selectFacts } from "@clinicalcraft/agent";

function load(id: string): CaseDefinition {
  const parsed = parseCase(JSON.parse(readFileSync(new URL(`../cases/${id}/case.json`, import.meta.url), "utf8")) as unknown);
  if (!parsed.ok) throw new Error(`${id}: ${JSON.stringify(parsed.issues.slice(0, 3))}`);
  return parsed.value;
}

const LOCALES = ["zh-CN", "en"] as const;
const appy = load("acute-appendicitis");
const ana = load("anaphylaxis-garden");
const asthma = load("pediatric-asthma");
const dka = load("dka-adult");
const sepsis = load("septic-shock-cap");
const smzl = load("smzl-lung-adeno");
const stemi = load("stemi-inferior-rv");
const stroke = load("acute-ischemic-stroke");

const intervention = (c: CaseDefinition, id: string) => c.interventions.find((i) => i.id === id)!;
/** A started session in `phase` (selectFacts only reads the phase and what was asked). */
const inPhase = (c: CaseDefinition, phase: string): SessionState => ({ ...createSession(c), started: true, phase });
const selected = (c: CaseDefinition, phase: string, text: string, locale: string) => selectFacts(c, inPhase(c, phase), text, locale);
const resolvedIntervention = (c: CaseDefinition, query: string, locale: string) => resolveIntervention(c, { query }, locale);
const resolvedFinding = (c: CaseDefinition, query: string, locale: string, phase?: string) => resolveFinding(c, { query }, locale, phase);
const score = (c: CaseDefinition, s: SessionState, id: string) => assess(c, s).rubric.find((r) => r.id === id)!.met;

describe("dose text never names a value the learner must elicit (CASE_AUTHORING §6)", () => {
  it("dka-adult: the FRIII dose is the 0.1 U/kg/h formula; 55 kg and the pump rate appear only once given", () => {
    const friii = intervention(dka, "friii");
    for (const L of LOCALES) {
      const dose = t(friii.dose!, L);
      expect(dose).toMatch(/0\.1 U\/kg\/h/);
      expect(dose, L).not.toMatch(/55|5\.5|mL\/h/);
      expect(t(friii.response, L), L).toMatch(/5\.5 mL\/h/);
    }
  });

  it("dka-adult: no dose text carries her weight or a rate derived from it (urine target)", () => {
    for (const iv of dka.interventions) {
      for (const L of LOCALES) {
        const dose = iv.dose ? t(iv.dose, L) : "";
        expect(dose, `${iv.id} ${L}`).not.toMatch(/55 ?kg|5\.5 U\/h|28 mL\/h/);
      }
    }
  });

  it("acute-appendicitis: morphine is dosed by formula; 68 kg / ≈7 mg are only in the response", () => {
    const morphine = intervention(appy, "morphine");
    for (const L of LOCALES) {
      expect(t(morphine.dose!, L)).toMatch(/0\.1 mg\/kg/);
      expect(t(morphine.dose!, L), L).not.toMatch(/68|7 mg/);
      expect(t(morphine.response, L), L).toMatch(/68 kg/);
    }
  });
});

describe("stemi-inferior-rv: both locales give the same sublingual nitrate dose", () => {
  it("zh-CN and en say 0.4–0.5 mg, like the nitrate decision option", () => {
    const dose = intervention(stemi, "nitroglycerin").dose!;
    for (const L of LOCALES) expect(t(dose, L), L).toMatch(/0\.4–0\.5 mg/);
  });
});

describe("anaphylaxis-garden: the monitor GCS matches the collapsed neuro exam", () => {
  it("untreated, GCS reads 10 (E3 V2 M5) from peri-arrest (minute 10) until near-arrest (minute 16, GCS 9)", () => {
    const { state } = replay(ana, [{ type: "start" }, { type: "advance-time", minutes: 10 }]);
    expect(state.phase).toBe("collapsed");
    for (const minute of [10, 12, 15]) expect(vitalsAt(ana, state, minute).vitals.gcs, `minute ${minute}`).toBe(10);
    const later = replay(ana, [{ type: "start" }, { type: "advance-time", minutes: 16 }]).state;
    expect(vitalsAt(ana, later).vitals.gcs).toBe(9);
    const exam = ana.exam.find((e) => e.id === "ex-neuro-collapsed")!;
    expect(t(exam.finding, "en")).toMatch(/loud voice or pain.*cannot answer questions.*localises to pain/);
  });
});

describe("smzl-lung-adeno: current guideline citation", () => {
  it("cites the EASL 2025 HBV guideline, not the superseded 2017 one", () => {
    const refs = smzl.debrief.references.join("\n");
    expect(refs).toContain("EASL Clinical Practice Guidelines on the management of hepatitis B virus infection. J Hepatol, 2025, 83(2): 502-583.");
    expect(refs).not.toMatch(/EASL 2017|J Hepatol, 2017/);
  });
});

describe("smzl-lung-adeno: decision rubric items need the first attempt to be right", () => {
  const solution = smzl.solution as ClinicalAction[];
  const withWrongFirst = (decisionId: string): ClinicalAction[] => {
    const i = solution.findIndex((a) => a.type === "answer" && a.decisionId === decisionId);
    const wrong = smzl.decisions.find((d) => d.id === decisionId)!.options.find((o) => !o.correct)!.id;
    return [...solution.slice(0, i), { type: "answer", decisionId, optionIds: [wrong] }, ...solution.slice(i)];
  };

  it("the reference path still scores 100%", () => {
    const { state } = replay(smzl, solution);
    expect(assess(smzl, state).score.percent).toBe(100);
  });

  it.each([
    ["diagnosis", "rb-dx-combination"],
    ["safety", "rb-safety-hbv"],
    ["genetics", "rb-dx-genetics"],
    ["response", "rb-mgmt-phase-review"],
  ])("a wrong first answer to %s leaves %s unmet", (decisionId, rubricId) => {
    const { state } = replay(smzl, withWrongFirst(decisionId));
    expect(state.decisions[decisionId]).toBeDefined();
    expect(score(smzl, state, rubricId)).toBe(false);
    expect(assess(smzl, state).score.percent).toBeLessThan(100);
  });
});

describe("stemi-inferior-rv: the cath lab must be activated before the transfer counts", () => {
  const solution = stemi.solution as ClinicalAction[];
  const isActivation = (a: ClinicalAction) => a.type === "intervene" && a.interventionId === "activate-cath-lab";
  const isTransfer = (a: ClinicalAction) => a.type === "intervene" && a.interventionId === "transfer-cath-lab";

  it("the reference path meets r-door-to-lab", () => {
    const { state } = replay(stemi, solution);
    expect(state.phase).toBe("cath");
    expect(score(stemi, state, "r-door-to-lab")).toBe(true);
  });

  it("without activation the transfer does not open the cath phase, angiography has no result and r-door-to-lab is unmet", () => {
    const { state } = replay(stemi, solution.filter((a) => !isActivation(a)));
    expect(state.flags).toContain("transferred-cath-lab");
    expect(state.flags).not.toContain("reperfused");
    expect(state.phase).toBe("ed");
    expect(state.seen.some((k) => k.startsWith("coronary-angiography@"))).toBe(false);
    expect(score(stemi, state, "r-door-to-lab")).toBe(false);
  });

  it("activating only after a premature transfer opens the lab late and still misses r-door-to-lab", () => {
    const steps = solution.filter((a) => !isActivation(a));
    const at = steps.findIndex(isTransfer);
    const { state } = replay(stemi, [...steps.slice(0, at + 1), { type: "intervene", interventionId: "activate-cath-lab" }, ...steps.slice(at + 1)]);
    expect(state.flags).toContain("transfer-before-activation");
    expect(state.phase).toBe("cath");
    expect(score(stemi, state, "r-door-to-lab")).toBe(false);
  });

  it("the transfer harm text leads with the activation problem, not VF", () => {
    for (const L of LOCALES) {
      const harm = t(intervention(stemi, "transfer-cath-lab").harm!, L);
      const activation = L === "en" ? harm.search(/activat/) : harm.search(/启动/);
      const vf = L === "en" ? harm.search(/VF/) : harm.search(/室颤/);
      expect(activation, L).toBeGreaterThanOrEqual(0);
      expect(activation, L).toBeLessThan(vf);
    }
  });
});

describe("order notices read true once their condition is met", () => {
  const cases: Record<string, CaseDefinition> = { "stemi-inferior-rv": stemi, "acute-ischemic-stroke": stroke };
  it.each([
    ["stemi-inferior-rv", "coronary angiography", "coronary-angiography"],
    ["acute-ischemic-stroke", "thrombectomy", "dsa-evt"],
  ] as const)("%s: the angiography notice states a condition, not an instruction to do it first", (caseId, query, id) => {
    const c = cases[caseId]!;
    const [en] = orderWarnings(c, query, id, "en");
    const [zh] = orderWarnings(c, query, id, "zh-CN");
    expect(en).toMatch(/only once/);
    expect(en).not.toMatch(/\bfirst\b/);
    expect(zh).toMatch(/后才/);
    expect(zh).not.toMatch(/需先/);
  });
});

describe("acute-appendicitis: offline matcher", () => {
  it.each(["examine his testicles with a chaperone", "examine the testes", "examine his testicles", "check the genitalia"])("exam %j → ex-testes", (q) => {
    expect(matchExam(appy, q, "en")[0]?.id).toBe("ex-testes");
    expect(resolvedFinding(appy, q, "en")).toEqual({ kind: "id", id: "ex-testes" });
  });

  it("zh: 检查睾丸 / 看看阴囊 → ex-testes", () => {
    for (const q of ["检查一下睾丸", "看看阴囊"]) expect(resolvedFinding(appy, q, "zh-CN")).toEqual({ kind: "id", id: "ex-testes" });
  });

  it.each([
    ["Is it in the same place now or has it travelled?", ["hx-migration"]],
    ["Does it hurt more when you move or cough?", ["hx-aggravating"]],
    ["Have your bowels been working normally?", ["hx-bowels"]],
    ["Have you travelled anywhere recently?", ["hx-exposures"]],
    ["Do you have a cough?", ["hx-resp"]],
    ["What do you do for work?", ["hx-occupation"]],
    ["Do you work or study?", ["hx-occupation"]],
  ])("%j selects only %j", (q, ids) => {
    expect(selected(appy, appy.initialPhase ?? appy.phases[0]!.id, q, "en").selected).toEqual(ids);
  });
});

describe("pediatric-asthma / septic-shock-cap: natural zh phrasing reaches required exams and oxygen", () => {
  it.each([
    ["arrival", "让他说句话看看", "ex-speech"],
    ["arrival", "听听两边肺", "ex-auscultation"],
    ["arrival", "听一下肺", "ex-auscultation"],
    ["arrival", "看看他清不清醒", "ex-mental-status"],
    ["reassess", "再听听两边肺", "ex-reassess-auscultation"],
    ["discharge", "听一下肺", "ex-discharge-auscultation"],
    ["critical", "让他说句话看看", "ex-crit-speech"],
    ["critical", "听听两边肺", "ex-crit-auscultation"],
    ["critical", "看看他清不清醒", "ex-crit-mental"],
  ])("asthma %s: %j → %s", (phase, q, id) => {
    expect(resolvedFinding(asthma, q, "zh-CN", phase)).toEqual({ kind: "id", id });
  });

  it.each(["先给他吸上氧", "吸点氧", "给他上氧"])("asthma: %j → oxygen", (q) => {
    expect(resolvedIntervention(asthma, q, "zh-CN")).toEqual({ kind: "id", id: "oxygen" });
  });

  it.each(["查一下神志", "看看意识清不清楚", "check his conscious level"])("sepsis: %j → ex-neuro", (q) => {
    expect(resolvedFinding(sepsis, q, /[一-鿿]/.test(q) ? "zh-CN" : "en")).toEqual({ kind: "id", id: "ex-neuro" });
  });
});

describe("anaphylaxis-garden: an EpiPen in an emergency is IM adrenaline", () => {
  it.each([
    ["give an epipen", "en", "adrenaline-im"],
    ["epipen", "en", "adrenaline-im"],
    ["use the auto-injector", "en", "adrenaline-im"],
    ["给她打肾上腺素笔", "zh-CN", "adrenaline-im"],
    ["prescribe an epipen", "en", "prescribe-aai"],
    ["prescribe two auto-injectors", "en", "prescribe-aai"],
    ["auto-injectors to take home", "en", "prescribe-aai"],
    ["开两支肾上腺素笔", "zh-CN", "prescribe-aai"],
  ] as const)("%j (%s) → %s", (q, L, id) => {
    expect(resolvedIntervention(ana, q, L)).toEqual({ kind: "id", id });
  });
});

describe("anaphylaxis-garden: in the ED the patient answers only the current-state version", () => {
  it.each([
    ["How's your breathing now?", "en", ["now-breathing-ed"]],
    ["现在呼吸怎么样，喘不喘？", "zh-CN", ["now-breathing-ed"]],
    ["Is your throat still tight?", "en", ["now-airway-ed"]],
    ["Do you feel dizzy?", "en", ["now-dizzy-ed"]],
    ["Is your skin still itchy?", "en", ["now-skin-ed"]],
    ["Any nausea or tummy pain now?", "en", ["now-gi-ed"]],
  ] as const)("ed: %j → %j", (q, L, ids) => {
    expect(selected(ana, "ed", q, L).selected).toEqual(ids);
  });

  it("ed: 'How are you feeling now?' gets the ED status and volunteers no garden-time symptom", () => {
    const s = selectFacts(ana, { ...inPhase(ana, "ed"), asked: ["pc-sting"] }, "How are you feeling now?", "en");
    expect(s.selected).toEqual(["status-ed"]);
    expect(s.volunteer).toBeNull();
  });

  it("scene: the acute questions still reach the garden-time items", () => {
    expect(selected(ana, "scene", "Are you short of breath?", "en").selected).toEqual(["hpi-breathing"]);
    expect(selected(ana, "ed-resus", "Does your throat feel tight?", "en").selected).toEqual(["hpi-throat"]);
  });
});

describe("dka-adult: later phases have their own status answers", () => {
  it.each([
    ["resolution", "现在感觉怎么样？能吃东西了吗？", "zh-CN", ["hx-status-resolution"]],
    ["resolution", "How are you feeling now? Can you eat something?", "en", ["hx-status-resolution"]],
    ["resolution", "肚子还疼吗？", "zh-CN", ["hx-status-resolution"]],
    ["resolution", "How's your breathing now?", "en", ["hx-status-resolution"]],
    ["glucose-lt14", "现在感觉怎么样？", "zh-CN", ["hx-status-midway"]],
    ["glucose-lt14", "Are you feeling any better?", "en", ["hx-status-midway"]],
  ] as const)("%s: %j → %j", (phase, q, L, ids) => {
    expect(selected(dka, phase, q, L).selected).toEqual(ids);
  });

  it("arrival-time symptom answers are not available once she is improving", () => {
    for (const id of ["hx-main-complaint", "hx-oral-intake", "hx-abd-pain", "hx-breathing", "hx-drowsy", "hx-polyuria-thirst", "hx-pain-modifiers"]) {
      expect(dka.history.find((h) => h.id === id)!.phases, id).toEqual(["resus", "k-replete"]);
    }
    expect(selected(dka, "resus", "最后一次吃东西是啥时候", "zh-CN").selected).toEqual(["hx-oral-intake"]);
    expect(selected(dka, "resus", "What brought you in tonight?", "en").selected).toEqual(["hx-main-complaint"]);
  });

  it("the resolution status agrees with the nurse's report and the r-eating option", () => {
    const status = dka.history.find((h) => h.id === "hx-status-resolution")!;
    expect(t(status.answer, "zh-CN")).toMatch(/饿/);
    expect(t(status.answer, "en")).toMatch(/hungry/);
    expect(t(status.answer, "zh-CN")).not.toMatch(/吐出来|喘不上气/);
  });
});
