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
  checkCaseIntegrity,
  createSession,
  historyCredited,
  matchExam,
  matchHistory,
  matchInterventions,
  matchOrders,
  orderWarnings,
  parseCase,
  reduce,
  replay,
  t,
  vitalsAt,
  type CaseDefinition,
  type ClinicalAction,
  type SessionState,
} from "@clinicalcraft/core";
import { npcTools, resolveFinding, resolveIntervention, selectFacts, type ToolContext } from "@clinicalcraft/agent";

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
const t2dm = load("new-onset-t2dm");
const pe = load("pulmonary-embolism-postop");
const ALL: Record<string, CaseDefinition> = {
  "acute-appendicitis": appy,
  "acute-ischemic-stroke": stroke,
  "anaphylaxis-garden": ana,
  "dka-adult": dka,
  "new-onset-t2dm": t2dm,
  "pediatric-asthma": asthma,
  "pulmonary-embolism-postop": pe,
  "septic-shock-cap": sepsis,
  "smzl-lung-adeno": smzl,
  "stemi-inferior-rv": stemi,
};

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
    expect(state.phase).toBe("post-pci"); // the cath lab, after the PCI result (review round 3)
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
    expect(state.phase).toBe("post-pci");
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
  /** [case, query, angiography investigation, team-activation intervention, phase where the result exists] */
  const NOTICES = [
    ["stemi-inferior-rv", "coronary angiography", "coronary-angiography", "activate-cath-lab", "cath"],
    ["acute-ischemic-stroke", "thrombectomy", "dsa-evt", "evt-activate", "angio"],
  ] as const;

  // Every caller now passes the session (the web order panel too, review round 3); a caller without one still prints
  // it in every phase, so the wording must hold there as well (CASE_AUTHORING §5).
  it.each(NOTICES)("%s: the angiography notice states a condition, not an instruction to do it first", (caseId, query, id) => {
    const c = cases[caseId]!;
    const [en] = orderWarnings(c, query, id, "en");
    const [zh] = orderWarnings(c, query, id, "zh-CN");
    expect(en).toMatch(/only once/);
    expect(en).not.toMatch(/\bfirst\b/);
    expect(zh).toMatch(/后才/);
    expect(zh).not.toMatch(/需先/);
  });

  it.each(NOTICES)("%s: `unless` hides the notice once the patient is where the result exists, not before", (caseId, query, id, activation, phase) => {
    const c = cases[caseId]!;
    // the phase where the result exists (STEMI: also `post-pci`, the cath lab after the PCI result)
    expect(JSON.stringify(c.orderMatching.warnings.find((w) => w.investigation === id)!.unless)).toContain(JSON.stringify({ phase }));
    const steps = c.solution as ClinicalAction[];
    const activateAt = steps.findIndex((a) => a.type === "intervene" && a.interventionId === activation);
    const orderAt = steps.findIndex((a) => a.type === "order" && a.investigationId === id);
    const after = (n: number) => replay(c, steps.slice(0, n)).state;
    const arrival = after(1);
    const activated = after(activateAt + 1); // team called, patient still in the ED
    const there = after(orderAt); // the session as the reference path places the order
    expect([arrival.phase, activated.phase, there.phase]).toEqual(["ed", "ed", phase]);
    for (const L of LOCALES) {
      expect(orderWarnings(c, query, id, L, arrival), L).toHaveLength(1);
      expect(orderWarnings(c, query, id, L, activated), L).toHaveLength(1);
      expect(orderWarnings(c, query, id, L, there), L).toEqual([]);
      expect(orderWarnings(c, query, id, L), `${L} without a session`).toHaveLength(1);
    }
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

describe("anaphylaxis-garden: the ED symptom answers are phase twins of the garden-time items (supersedes)", () => {
  const TWINS: Record<string, readonly string[]> = {
    "now-breathing-ed": ["hpi-breathing"],
    "now-airway-ed": ["hpi-throat", "hpi-lips-tongue"],
    "now-dizzy-ed": ["hpi-dizzy", "hpi-chest-palp"],
    "now-skin-ed": ["hpi-itch-rash"],
    "now-gi-ed": ["hpi-gi"],
  };
  const GARDEN: readonly string[] = Object.values(TWINS).flat();
  const twinOf = (id: string) => Object.keys(TWINS).find((twin) => TWINS[twin]!.includes(id))!;
  const item = (id: string) => ana.history.find((h) => h.id === id)!;
  const REQUIRED_RE_ASKED = ["hpi-throat", "hpi-breathing", "hpi-dizzy"];

  it("each ED item supersedes what it re-asks; the garden-time items keep only the phases where their answers hold", () => {
    for (const [twin, ids] of Object.entries(TWINS)) {
      expect(item(twin).supersedes, twin).toEqual(ids);
      expect(item(twin).phases, twin).toEqual(["ed"]);
    }
    for (const id of GARDEN) expect(item(id).phases, id).toEqual(["scene", "treated", "ed-resus"]);
    for (const id of REQUIRED_RE_ASKED) expect(item(id).required, id).toBe(true);
    expect(checkCaseIntegrity(ana)).toEqual([]);
  });

  it.each(GARDEN.flatMap((id) => LOCALES.map((L) => [id, L] as const)))("the canonical %s question (%s) selects its twin in ed and the item itself in ed-resus", (id, L) => {
    const q = t(item(id).question, L);
    const sel = selected(ana, "ed", q, L).selected;
    expect(sel).toContain(twinOf(id));
    expect(sel.filter((x) => GARDEN.includes(x))).toEqual([]);
    expect(matchHistory(ana, q, L, { phase: "ed" }).filter((h) => GARDEN.includes(h.id))).toEqual([]);
    expect(selected(ana, "ed-resus", q, L).selected).toContain(id);
  });

  it("ed: reveal_facts answers a garden-time id with its twin (tool pipeline)", async () => {
    const reveal = npcTools().find((tool) => tool.name === "reveal_facts")!;
    const state = inPhase(ana, "ed");
    const dispatched: string[] = [];
    const ctx = {
      caseDef: ana,
      locale: "en",
      agent: "patient",
      state: () => state,
      dispatch: (action: { type: string; itemId?: string }) => {
        dispatched.push(action.itemId ?? action.type);
        return { state, events: [] };
      },
    } as unknown as ToolContext;
    const out = await reveal.run({ fact_ids: ["hpi-throat", "hpi-itch-rash"] }, ctx);
    expect(out.ok).toBe(true);
    expect(dispatched).toEqual(["now-airway-ed", "now-skin-ed"]);
    expect(out.output).toContain(t(item("now-airway-ed").answer, "en"));
    expect(out.output).not.toMatch(/squeezing shut|raised lumps everywhere/);
  });

  // The reference path minus its three required garden-time symptom questions, asked instead in the ED as their twins.
  const path = (c: CaseDefinition, inEd: string[]): ClinicalAction[] => {
    const steps = (c.solution as ClinicalAction[]).filter((a) => !(a.type === "ask" && REQUIRED_RE_ASKED.includes(a.itemId)));
    const finishAt = steps.findIndex((a) => a.type === "finish");
    return [...steps.slice(0, finishAt), ...inEd.map((itemId): ClinicalAction => ({ type: "ask", itemId })), ...steps.slice(finishAt)];
  };

  it("ed: a garden-time item cannot be asked; asking the twins credits the required items without revealing them", () => {
    const without = path(ana, []);
    const skipped = replay(ana, without);
    expect(skipped.rejections).toEqual([]);
    expect(assess(ana, skipped.state).history.missingRequired).toEqual(REQUIRED_RE_ASKED);
    const inEd = replay(ana, without.slice(0, without.findIndex((a) => a.type === "finish"))).state;
    expect(inEd.phase).toBe("ed");
    expect(reduce(ana, inEd, { type: "ask", itemId: "hpi-throat" }).rejected?.code).toBe("phase-locked");

    const twins = ["now-airway-ed", "now-breathing-ed", "now-dizzy-ed"];
    const { state, rejections } = replay(ana, path(ana, twins));
    expect(rejections).toEqual([]);
    expect(state.finished).toBe(true);
    const report = assess(ana, state);
    expect(report.history.missingRequired).toEqual([]);
    expect(report.history.requiredAsked).toBe(report.history.required);
    expect(report.history.asked).toBe(assess(ana, skipped.state).history.asked + twins.length); // only what was really asked
    for (const id of REQUIRED_RE_ASKED) {
      expect(state.asked, id).not.toContain(id); // never revealed: not in the ledger, journal or transcript
      expect(historyCredited(ana, state, id), id).toBe(true);
    }
    expect(state.asked).toEqual(expect.arrayContaining(twins));
  });

  it("credit is one-way: the garden-time questions never credit the ED re-assessment", () => {
    const { state } = replay(ana, ana.solution as ClinicalAction[]);
    expect(state.asked).toEqual(expect.arrayContaining(REQUIRED_RE_ASKED));
    for (const twin of Object.keys(TWINS)) expect(historyCredited(ana, state, twin), twin).toBe(false);
  });
});

describe("pediatric-asthma: the later-phase child and alertness answers are phase twins of the arrival items", () => {
  const item = (id: string) => asthma.history.find((h) => h.id === id)!;

  it("links each later-phase variant to the arrival question it answers", () => {
    expect(item("hx-child-feeling-later").supersedes).toEqual(["hx-child-feeling"]);
    expect(item("hx-child-discharge").supersedes).toEqual(["hx-child-feeling-later", "hx-child-feeling"]);
    expect(item("hx-child-feeling-critical").supersedes).toEqual(["hx-child-feeling"]);
    expect(item("hx-alertness-critical").supersedes).toEqual(["hx-alertness"]);
    expect(checkCaseIntegrity(asthma)).toEqual([]);
  });

  it.each([
    ["arrival", "How do you feel, buddy?", "en", "hx-child-feeling"],
    ["reassess", "How do you feel, buddy?", "en", "hx-child-feeling-later"],
    ["reassess", "Are you OK?", "en", "hx-child-feeling-later"],
    ["reassess", "小朋友你感觉怎么样", "zh-CN", "hx-child-feeling-later"],
    ["discharge", "How do you feel, buddy?", "en", "hx-child-discharge"],
    ["discharge", "小朋友，你现在哪里不舒服？", "zh-CN", "hx-child-discharge"],
    ["critical", "How do you feel, buddy?", "en", "hx-child-feeling-critical"],
    ["reassess", "Is he drowsy?", "en", "hx-alertness"],
    ["critical", "Is he drowsy?", "en", "hx-alertness-critical"],
    ["critical", "他精神怎么样？", "zh-CN", "hx-alertness-critical"],
  ] as const)("%s: %j → %s", (phase, q, L, id) => {
    expect(selected(asthma, phase, q, L).selected).toEqual([id]);
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

/* ------------------------------------------------------------------ */
/* Review round 3                                                      */
/* ------------------------------------------------------------------ */

const option = (c: CaseDefinition, decisionId: string, optionId: string) => c.decisions.find((d) => d.id === decisionId)!.options.find((o) => o.id === optionId)!;
const localeOf = (q: string) => (/[一-鿿]/.test(q) ? "zh-CN" : "en");

describe("round 3 (K1) smzl-lung-adeno: the spleen answer stays in the patient's voice", () => {
  it("drops the clinician's diagnostic caveat in both locales; the attending keeps it as teaching knowledge", () => {
    const spleen = smzl.history.find((h) => h.id === "spleen")!;
    expect(t(spleen.answer, "zh-CN")).toBe("大约30年前就发现脾大了。2024年11月的PET/CT又提示脾脏明显增大。");
    expect(t(spleen.answer, "en")).not.toMatch(/lymphoma|establish/);
    const attending = smzl.npcs.find((n) => n.role === "attending")!;
    expect(t(attending.knowledge, "zh-CN")).toMatch(/不能据此认定淋巴瘤已经持续30年/);
    expect(t(attending.knowledge, "en")).toMatch(/does not by itself establish that a lymphoma has been present for 30 years/);
  });
});

describe("round 3 (K2): no dose text gives away an elicited weight or a number derived from it", () => {
  it.each(Object.keys(ALL))("%s: the weight is in no dose text unless the triage note states it", (id) => {
    const c = ALL[id]!;
    const w = c.patient.weightKg;
    if (w == null) return;
    const triage = c.patient.triageNote ? t(c.patient.triageNote, "en") : "";
    if (new RegExp(`(^|[^\\d.])${w} ?kg`).test(triage)) return; // weighed or estimated at triage: nothing to elicit
    for (const iv of c.interventions) {
      for (const L of LOCALES) {
        const dose = iv.dose ? t(iv.dose, L) : "";
        expect(dose, `${iv.id} ${L}`).not.toMatch(new RegExp(`(^|[^\\d.])${w} ?(kg|公斤)`));
      }
    }
  });

  it.each([
    ["pulmonary-embolism-postop", "ufh", /5,?600|1,?260/, [/5,?600 U/, /1,?260 U\/h/]],
    ["pulmonary-embolism-postop", "lmwh-treatment", /70 ?mg|7,?000/, [/70 mg/]],
    ["pulmonary-embolism-postop", "noradrenaline", /3\.5 ?µg/, [/3\.5 µg\/min/]],
    ["stemi-inferior-rv", "ufh", /5,?500|7,?800|6,?000/, [/6,?000 U/]],
    ["stemi-inferior-rv", "enoxaparin", /40 ?mg/, [/40 mg/]],
    ["stemi-inferior-rv", "dobutamine", /0\.2–0\.4 ?mg/, [/0\.2–0\.4 mg\/min/]],
    ["stemi-inferior-rv", "noradrenaline", /4–8 ?µg/, [/4–8 µg\/min/]],
    ["stemi-inferior-rv", "tenecteplase", /^(Tenecteplase|替奈普酶) ?40 ?mg|\(8,?000 ?U/, [/40 mg/]],
    ["acute-appendicitis", "iv-fluids", /80 ?mL\/h/, [/80 mL\/h/]],
    ["dka-adult", "insulin-bolus", /5\.5 ?U/, [/5\.5 U/]],
    ["dka-adult", "nacl-1l-1h", /18 ?mL\/kg/, [/18 mL\/kg/]],
    ["dka-adult", "balanced-1l-1h", /18 ?mL\/kg/, [/18 mL\/kg/]],
    ["new-onset-t2dm", "iv-lifestyle", /4\.5 ?kg/, [/4\.5 kg/]],
  ] as const)("%s %s: the dose is the formula/regimen; the computed number is only in the response", (id, ivId, leak, inResponse) => {
    const iv = intervention(ALL[id]!, ivId);
    for (const L of LOCALES) {
      expect(t(iv.dose!, L), `${ivId} dose ${L}`).not.toMatch(leak);
      for (const re of inResponse) expect(t(iv.response!, L), `${ivId} response ${L}`).toMatch(re);
    }
  });

  it("stemi-inferior-rv: the tenecteplase dose lists the weight bands instead of naming his", () => {
    for (const L of LOCALES) expect(t(intervention(stemi, "tenecteplase").dose!, L), L).toMatch(/30 mg[\s\S]*50 mg/);
  });

  it("new-onset-t2dm: basal insulin is dosed by the standard regimen, not ≈ his weight", () => {
    for (const L of LOCALES) expect(t(intervention(t2dm, "iv-insulin").dose!, L), L).toMatch(/0\.1–0\.2 U\/kg/);
  });

  it("pediatric-asthma: the pMDI dose does not grade this attack before the learner does", () => {
    for (const L of LOCALES) expect(t(intervention(asthma, "salbutamol-mdi").dose!, L), L).not.toMatch(/\bhere\b|本例/);
  });

  it("pulmonary-embolism-postop: the paracetamol dose does not read the drug chart for the learner", () => {
    const paracetamol = intervention(pe, "paracetamol");
    for (const L of LOCALES) {
      expect(t(paracetamol.dose!, L), L).not.toMatch(/12:00|18:00/);
      expect(t(paracetamol.response!, L), L).toMatch(/12:00[\s\S]*18:00/);
    }
  });
});

describe("round 3 (K2): labels and decision options do not reveal an unelicited fact or an unread result", () => {
  it.each([
    ["pulmonary-embolism-postop", "anticoag-choice", "ufh", /5,?600|1,?260/],
    ["pulmonary-embolism-postop", "anticoag-choice", "lmwh", /70 ?mg/],
    ["pulmonary-embolism-postop", "dx-strategy", "ctpa-direct", /Wells 10|10 ?分/],
    ["stemi-inferior-rv", "antithrombotic-bundle", "at-tnk", /40 ?mg/],
    ["stemi-inferior-rv", "nitrate-safety", "nitro-furosemide", /^(The raised JVP|颈静脉怒张提示)/],
    ["anaphylaxis-garden", "dx-criteria", "llr-criterion", /last year|去年/i],
    ["dka-adult", "precipitant", "p-pump", /4 days|4天|四天/],
    ["dka-adult", "precipitant", "p-gastro", /roommate|室友/],
    ["new-onset-t2dm", "dec-review", "rv-stop-statin", /ALT|fatty|脂肪肝/],
    ["pediatric-asthma", "dec-discharge", "dc-education", /restart|恢复/i],
  ] as const)("%s %s/%s", (id, decisionId, optionId, leak) => {
    const o = option(ALL[id]!, decisionId, optionId);
    for (const L of LOCALES) expect(t(o.text, L), L).not.toMatch(leak);
  });

  it.each([
    ["pulmonary-embolism-postop", "enox-prophylaxis", /missed|补打/i],
    ["septic-shock-cap", "hold-home-meds", /metformin|amlodipine|ibuprofen|二甲双胍|氨氯地平|布洛芬/i],
    ["pediatric-asthma", "smoke-free-advice", /father|dad|父亲|爸爸/i],
    ["pediatric-asthma", "controller-ics", /restart|恢复/i],
    ["new-onset-t2dm", "iv-antifungal", /balanitis|tinea|龟头炎|足癣/i],
  ] as const)("%s %s: name and dose", (id, ivId, leak) => {
    const iv = intervention(ALL[id]!, ivId);
    for (const L of LOCALES) {
      expect(t(iv.name, L), `name ${L}`).not.toMatch(leak);
      if (iv.dose) expect(t(iv.dose, L), `dose ${L}`).not.toMatch(leak);
    }
  });

  it("pediatric-asthma: smoke-free advice does not reveal who smokes at home", () => {
    for (const L of LOCALES) expect(t(intervention(asthma, "smoke-free-advice").response!, L), L).not.toMatch(/dad|爸爸/i);
  });

  it("septic-shock-cap: the regimen prompt does not quote her records (no MRSA/Pseudomonas isolate) that it does not require", () => {
    const d = sepsis.decisions.find((x) => x.id === "abx-regimen")!;
    expect(JSON.stringify(d.requires)).not.toContain('"records"');
    for (const L of LOCALES) expect(t(d.prompt, L), L).not.toMatch(/MRSA|Pseudomonas|铜绿/);
  });

  it("acute-ischemic-stroke: the thrombectomy decision, whose options quote NIHSS 14 and ASPECTS 9, needs the NIHSS and the CT read", () => {
    const requires = JSON.stringify(stroke.decisions.find((d) => d.id === "d-evt")!.requires);
    expect(requires).toContain('{"examined":"nihss"}');
    expect(requires).toContain('{"read":"ct-head"}');
  });
});

describe("round 3 (K3): matcher follow-ups", () => {
  it.each([
    ["septic-shock-cap", "resus", "以前有什么病？", ["hx-pmh"]],
    ["septic-shock-cap", "resus", "她以前有什么病", ["hx-pmh"]],
    ["septic-shock-cap", "resus", "有什么病吗？", ["hx-pmh"]],
    ["acute-ischemic-stroke", "ed", "今天量过血压吗？", ["unknown-bp-today"]],
    ["acute-ischemic-stroke", "ed", "在家量过血压没有？", ["unknown-bp-today"]],
  ] as const)("%s %s: %j → %j", (id, phase, q, ids) => {
    expect(selected(ALL[id]!, phase, q, "zh-CN").selected).toEqual(ids);
  });

  it("septic-shock-cap: a family question is not her own past history; stroke: a usual reading is not today's", () => {
    expect(selected(sepsis, "resus", "家里有人有什么病吗？", "zh-CN").selected).not.toContain("hx-pmh");
    expect(selected(stroke, "ed", "平时量过血压吗？", "zh-CN").selected[0]).toBe("pmh-htn");
  });

  it.each(["activate the cath lab", "启动导管室", "通知导管室", "cath lab activation", "page the cath lab"])("stemi: %j → activate-cath-lab, never offering the transfer", (q) => {
    const L = localeOf(q);
    expect(resolvedIntervention(stemi, q, L)).toEqual({ kind: "id", id: "activate-cath-lab" });
    expect(matchInterventions(stemi, q, L).map((h) => h.id)).not.toContain("transfer-cath-lab");
  });

  it.each(["transfer him to the cath lab", "send him to the cath lab", "转运到导管室"])("stemi: %j → transfer-cath-lab", (q) => {
    expect(resolvedIntervention(stemi, q, localeOf(q))).toEqual({ kind: "id", id: "transfer-cath-lab" });
  });

  it.each([
    "get the defibrillator ready",
    "keep the defib nearby",
    "put the defib pads on",
    "attach the defibrillator",
    "check the defibrillator",
    "he's in cardiogenic shock",
    "treat the shock",
    "准备除颤仪",
    "除颤仪放床边",
    "贴除颤电极片",
    "心源性休克怎么处理",
  ])("stemi: benign %j never offers defibrillation", (q) => {
    expect(matchInterventions(stemi, q, localeOf(q)).map((h) => h.id)).not.toContain("defibrillation");
  });

  it.each(["shock him", "defibrillate", "deliver a shock at 200 J", "除颤", "电除颤", "立即电击", "非同步电除颤200J"])("stemi: %j → defibrillation", (q) => {
    expect(resolvedIntervention(stemi, q, localeOf(q))).toEqual({ kind: "id", id: "defibrillation" });
  });

  it.each([
    ["keep him calm", "position-upright"],
    ["calm him down", "position-upright"],
    ["让他安静下来", "position-upright"],
    ["安抚一下", "position-upright"],
    ["give him something to calm him down", "sedation"],
    ["sedate him", "sedation"],
    ["镇定剂", "sedation"],
    ["给点镇静药", "sedation"],
  ] as const)("asthma: %j → %s", (q, id) => {
    expect(resolvedIntervention(asthma, q, localeOf(q))).toEqual({ kind: "id", id });
  });

  it("asthma: comforting him never offers the (contraindicated) sedative", () => {
    for (const q of ["keep him calm", "让他安静下来", "让他别哭", "安抚一下"]) expect(matchInterventions(asthma, q, localeOf(q)).map((h) => h.id), q).not.toContain("sedation");
  });

  it.each([
    ["acute-appendicitis", "最后一次吃东西是什么时候？", ["hx-last-intake"]],
    ["anaphylaxis-garden", "Are you on any blood pressure tablets?", ["meds-bb"]],
    ["dka-adult", "你平时怎么用胰岛素？", ["hx-insulin-pump"]],
    ["pediatric-asthma", "How often does he wake at night coughing?", ["hx-interval-symptoms"]],
    ["pediatric-asthma", "seen by a GP b4 coming in?", ["hx-prior-care"]],
    ["stemi-inferior-rv", "疼痛会放射到别的地方吗？", ["pain-radiation"]],
    ["stemi-inferior-rv", "Have you taken Viagra recently?", ["pde5"]],
    ["stemi-inferior-rv", "Is there an old ECG we could compare with?", ["prior-ecg"]],
    ["stemi-inferior-rv", "Does it hurt to breathe?", ["pain-pleuritic"]],
  ] as const)("%s: %j selects only %j (no extra fact credited)", (id, q, ids) => {
    const c = ALL[id]!;
    const first = c.history.find((h) => h.id === ids[0])!;
    expect(selected(c, first.phases?.[0] ?? c.initialPhase ?? c.phases[0]!.id, q, localeOf(q)).selected).toEqual(ids);
  });
});

describe("round 3 (K4): result values and reference texts are per locale", () => {
  const CJK = /[一-鿿]/;
  /** Unit and assay abbreviations that read the same in every locale. */
  const NEUTRAL = new Set(["mmol", "mol", "kpa", "mmhg", "hpf", "feu", "ifcc", "rhd", "hco"]);
  it.each(Object.keys(ALL))("%s: no plain string mixes languages or carries words of one language", (id) => {
    const c = ALL[id]!;
    for (const inv of c.investigations) {
      for (const [phase, r] of Object.entries(inv.results)) {
        for (const v of r.values) {
          for (const field of ["value", "refText"] as const) {
            const x = v[field];
            if (typeof x !== "string") continue;
            const where = `${inv.id}@${phase} ${t(v.analyte, "en")} ${field}: ${x}`;
            expect(CJK.test(x), where).toBe(false);
            expect((x.match(/[A-Za-z]{3,}/g) ?? []).filter((w) => !NEUTRAL.has(w.toLowerCase())), where).toEqual([]);
          }
        }
      }
    }
  });
});

describe("round 3 (K5): who speaks", () => {
  it("pediatric-asthma: the boy's own answers are spoken by him, not his mother", () => {
    const own = asthma.history.filter((h) => h.id.startsWith("hx-child-"));
    expect(own.map((h) => h.id)).toEqual(["hx-child-feeling", "hx-child-feeling-critical", "hx-child-feeling-later", "hx-child-discharge"]);
    for (const h of own) expect(h.speaker, h.id).toBe("patient");
  });

  it.each(Object.keys(ALL))("%s: attending and pharmacist lines are narrated; the patient's own lines are hers", (id) => {
    const c = ALL[id]!;
    const patientName = t(c.patient.displayName, "en").replace(/\s*\(.*\)$/, "");
    for (const ev of c.physiology?.events ?? []) {
      if (!ev.message) continue;
      const en = t(ev.message, "en");
      if (/^(The attending|Attending|Pharmacist)\b/.test(en)) expect(ev.speaker, ev.id).toBe("narrator");
      if (en.startsWith("Ms Lin:") || en.startsWith(`${patientName}:`)) expect(ev.speaker, ev.id).toBe("patient");
    }
  });

  it("anaphylaxis-garden: Ms Lin asking to leave is her own line", () => {
    expect(ana.physiology!.events.find((e) => e.id === "asks-to-leave")!.speaker).toBe("patient");
  });
});

describe("review round 3 (journeys): matcher and content follow-ups", () => {
  const phaseOf = (c: CaseDefinition, id: string) => c.history.find((h) => h.id === id)!.phases?.[0] ?? c.initialPhase ?? c.phases[0]!.id;
  const examIn = (c: CaseDefinition, q: string, phase: string) => resolvedFinding(c, q, localeOf(q), phase);

  it.each([
    ["pediatric-asthma", "给点镇静药让他安静下来", "sedation"],
    ["pediatric-asthma", "give him something to calm him down", "sedation"],
    ["pediatric-asthma", "让他安静下来", "position-upright"],
    ["pediatric-asthma", "教一下吸入装置用法", "inhaler-teaching"],
    ["pediatric-asthma", "家里不要抽烟", "smoke-free-advice"],
    ["dka-adult", "把她的胰岛素泵摘掉", "suspend-pump"],
    ["septic-shock-cap", "再补500", "fluid-bolus"],
    ["septic-shock-cap", "再补一次液", "fluid-bolus"],
    ["septic-shock-cap", "再给500毫升", "fluid-bolus"],
    ["septic-shock-cap", "再推一个500", "fluid-bolus"],
    ["acute-appendicitis", "吗啡止痛", "morphine"],
    ["acute-appendicitis", "morphine for the pain", "morphine"],
  ] as const)("%s: %j → %s", (cid, q, id) => {
    expect(resolvedIntervention(ALL[cid]!, q, localeOf(q))).toEqual({ kind: "id", id });
  });

  it("dka: 'remove her pump' never starts the insulin infusion", () => {
    expect(matchInterventions(dka, "把她的胰岛素泵摘掉", "zh-CN").map((h) => h.id)).not.toContain("friii");
  });

  it.each([
    ["dka-adult", "看她呼吸是不是又深又快", "ex-breathing-pattern"],
    ["dka-adult", "查一下肚子", "ex-abdomen"],
    ["dka-adult", "看看肚子", "ex-abdomen"],
    ["acute-ischemic-stroke", "look at his eyes and gaze", "gaze-pupils"],
  ] as const)("%s: exam %j → %s", (cid, q, id) => {
    const c = ALL[cid]!;
    expect(examIn(c, q, c.initialPhase ?? c.phases[0]!.id)).toEqual({ kind: "id", id });
  });

  it.each([
    ["acute-ischemic-stroke", "does he take anything to thin the blood?", ["anticoagulants"]],
    ["acute-ischemic-stroke", "did somebody actually see it start?", ["onset-witness"]],
    ["acute-ischemic-stroke", "has he ever had a bleed anywhere, stomach bleeding, black poo?", ["bleeding-history"]],
    ["acute-ischemic-stroke", "any diabetes in the family?", ["family-history"]],
    ["stemi-inferior-rv", "any diabetes in the family?", ["family"]],
    ["new-onset-t2dm", "any diabetes in the family?", ["hx-family"]],
    ["new-onset-t2dm", "what do you do for a living?", ["hx-occupation"]],
    ["septic-shock-cap", "any diabetes in the family?", ["hx-family"]],
    ["septic-shock-cap", "is there any heart disease in your family?", ["hx-family"]],
    ["pediatric-asthma", "any diabetes in the family?", ["hx-family"]],
    ["pediatric-asthma", "is there any heart disease in your family?", ["hx-family"]],
    ["pediatric-asthma", "does anything run in the family?", ["hx-family"]],
    ["pediatric-asthma", "家里有人有哮喘或者过敏吗？", ["hx-family"]],
    ["dka-adult", "When did all this start?", ["hx-onset-course"]],
    ["dka-adult", "除了胰岛素还吃别的药吗？", ["hx-meds"]],
    ["new-onset-t2dm", "how much fluid are you getting through each day?", ["hx-polydipsia"]],
  ] as const)("%s: %j selects only %j", (cid, q, ids) => {
    const c = ALL[cid]!;
    expect(selected(c, phaseOf(c, ids[0]), q, localeOf(q)).selected).toEqual(ids);
  });

  it("t2dm: a family heart-disease question reaches the family history first", () => {
    expect(selected(t2dm, "initial", "is there any heart disease in your family?", "en").selected[0]).toBe("hx-family");
  });

  it("t2dm review: home BP is answered once (the first-visit answer is its phase twin), and the review opener is answered", () => {
    for (const q of ["have you been checking your blood pressure at home?", "在家量血压了吗？"]) {
      expect(selected(t2dm, "review", q, localeOf(q)).selected).toEqual(["hx-rv-home-bp"]);
    }
    expect(selected(t2dm, "review", "how have you been since the last visit?", "en").selected).toEqual(["hx-rv-symptoms"]);
    expect(selected(t2dm, "initial", "have you ever been told your blood pressure was high?", "en").selected).toEqual(["hx-prior-bp"]);
  });

  it("orders: the full UACR name and a plain CT 'without contrast' are not ambiguous", () => {
    expect(matchOrders(t2dm, "urine albumin creatinine ratio", "en")).toEqual(["inv-uacr"]);
    expect(matchOrders(t2dm, "renal function and urine albumin", "en").sort()).toEqual(["inv-renal", "inv-uacr"]);
    expect(matchOrders(stroke, "ct head without contrast", "en")).toEqual(["ct-head"]);
    for (const q of ["mri dwi", "dwi", "MRI brain", "头颅dwi"]) expect(matchOrders(stroke, q, localeOf(q)), q).toContain("mri-brain");
  });

  it("decision feedback states no result the decision does not require", () => {
    const fb = (c: CaseDefinition, d: string, o: string) => LOCALES.map((L) => t(c.decisions.find((x) => x.id === d)!.options.find((x) => x.id === o)!.feedback, L)).join(" ");
    expect(fb(t2dm, "dec-review", "rv-statin")).not.toMatch(/46|68/);
    expect(fb(t2dm, "dec-review", "rv-stop-statin")).not.toMatch(/46/);
    expect(fb(asthma, "dec-severity", "sev-severe")).not.toMatch(/42/);
    expect(fb(asthma, "dec-discharge", "dc-pef")).not.toMatch(/145|81/);
    expect(fb(dka, "dx-severity", "dx-hhs")).not.toMatch(/299/);
  });

  it("stroke: texts shown before imaging state no imaging result or decision answer", () => {
    for (const id of ["alteplase", "tenecteplase"]) for (const L of LOCALES) expect(t(intervention(stroke, id).harm!, L), `${id} ${L}`).not.toMatch(/this CT happened|本例CT恰好/);
    for (const L of LOCALES) expect(t(intervention(stroke, "evt-activate").response!, L), L).not.toMatch(/accepts for emergency thrombectomy|同意急诊取栓/);
    const ctDelay = stroke.physiology!.events.find((e) => e.id === "ct-delay")!;
    expect(t(ctDelay.message!, "en")).not.toMatch(/no scan ordered/);
    for (const L of LOCALES) expect(t(stroke.objectives.find((o) => o.id === "obj4-lysis")!.title, L), L).not.toMatch(/safely|安全/);
  });

  it("stemi: the post-PCI ECG is not readable before the angiography/PCI result", () => {
    const ecg = stemi.investigations.find((i) => i.id === "ecg-12lead")!;
    expect(ecg.results.cath).toBeUndefined();
    expect(t(ecg.results["post-pci"]!.text, "en")).toMatch(/Post-PCI/);
    const postPci = stemi.phases.find((p) => p.id === "post-pci")!;
    expect(postPci.enterWhen).toEqual({ resultReady: "coronary-angiography", phase: "cath" });
    expect(postPci.learnerSwitchable).toBe(false);
  });

  it("pe: the nurse asks only what has not been done when the anticoagulant goes in", () => {
    const messages = (actions: ClinicalAction[]) => {
      const r = replay(pe, [{ type: "start" }, ...actions]);
      const said = (id: string) => pe.physiology!.events.find((x) => x.id === id)!.message;
      return r.events.flatMap((e) => (e.type === "scenario.event" && /anticoag/.test(e.eventId) && said(e.eventId) ? [t(said(e.eventId)!, "en")] : []));
    };
    const anticoag = pe.interventions.find((i) => i.setFlags.includes("anticoagulated"))!.id;
    const woundChecked = messages([{ type: "ask", itemId: "h-bleeding" }, { type: "examine", findingId: "ex-abdomen" }, { type: "intervene", interventionId: anticoag }]);
    expect(woundChecked).toHaveLength(1);
    expect(woundChecked[0]).toMatch(/surgeons/);
    expect(woundChecked[0]).not.toMatch(/wound/);
    const surgeonsTold = messages([{ type: "intervene", interventionId: "consult-surgeon" }, { type: "intervene", interventionId: anticoag }]);
    expect(surgeonsTold).toHaveLength(1);
    expect(surgeonsTold[0]).toMatch(/wound/);
    expect(surgeonsTold[0]).not.toMatch(/surgeons/);
    const neither = messages([{ type: "intervene", interventionId: anticoag }]);
    expect(neither).toHaveLength(1);
    expect(neither[0]).toMatch(/surgeons.*wound/);
  });
});
