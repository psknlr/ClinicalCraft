/**
 * Content lints of the clinical content standard (docs/CASE_AUTHORING.md §9.8): warnings from
 * `cases validate` (errors never; `--strict` fails on them). A case written to the standard has none; each
 * lint finds exactly its own problem.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPECIALTY_LABELS, specialtyLabel } from "../i18n.js";
import type { CaseDefinition } from "../schema/case.js";
import { CANONICAL_SPECIALTIES, canonicalSpecialties, canonicalSpecialty, isCanonicalSpecialty, SPECIALTY_SYNONYMS } from "../specialties.js";
import { checkContentStandard, parseCase, WELL_FORMED_DOI } from "./index.js";

type Json = Record<string, any>;
const raw = (): Json => JSON.parse(readFileSync(new URL("./__fixtures__/mini-anaphylaxis.case.json", import.meta.url), "utf8"));
const both = (en: string, zh: string) => ({ en, "zh-CN": zh });

/** The fixture brought up to the standard. */
function standard(j: Json): void {
  j.learningOutcomes = [both("Recognise anaphylaxis", "识别过敏性休克"), both("Give IM adrenaline first", "首选肌注肾上腺素"), both("Plan observation and follow-up", "制订观察与随访计划")];
  j.provenance.review = { status: "editorial", reviewedAt: "2026-10-28", reviewers: ["editorial review"], guidelines: ["EAACI 2021 anaphylaxis"] };
  j.debrief.teachingPoints = [both("IM adrenaline is first-line.", "肌注肾上腺素是一线治疗。"), both("Observe for biphasic reactions.", "观察双相反应。"), both("Prescribe auto-injectors.", "开具自动注射笔。")];
  j.debrief.references = ["Muraro A, et al. EAACI guidelines: anaphylaxis (2021 update). Allergy. 2022;77(2):357-377. doi:10.1111/all.15032.", "Resuscitation Council UK. Emergency treatment of anaphylaxis. 2021."];
  for (const [i, extra] of [
    ["o2", { intervened: "oxygen" }],
    ["fluids", { intervened: "fluids" }],
    ["chest", { examined: "chest" }],
    ["skin", { examined: "skin" }],
  ] as const) j.rubric.push({ id: `r-${i}`, domain: "management", text: both(i, i), weight: 1, met: extra });
  const feedback = ["Right: airway, skin and circulation together.", "Wheeze alone does not explain urticaria and hypotension.", "Panic does not cause urticaria.", "Six hours at least.", "Two pens.", "Not yet: biphasic risk.", "Allergy work-up."];
  let k = 0;
  for (const d of j.decisions) for (const o of d.options) o.feedback = both(feedback[k]!, `反馈${k++}`);
  // the high-risk beta-blocker can be contraindicated: the author decides it is the case's critical error
  j.interventions.find((i: Json) => i.id === "beta-blocker").critical = true;
  j.extensions = {
    testUtterances: [
      { text: "What happened just before your lips swelled?", locale: "en", expect: ["trigger"] },
      { text: "Are you allergic to anything?", locale: "en", expect: ["allergies"] },
      { text: "对什么东西过敏吗", locale: "zh-CN", expect: ["allergies"] },
    ],
  };
}

function build(patch: (json: Json) => void = () => undefined): CaseDefinition {
  const json = raw();
  standard(json);
  patch(json);
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

const lints = (c: CaseDefinition) => checkContentStandard(c);
const at = (c: CaseDefinition, path: string) => lints(c).filter((i) => i.path === path);

describe("content standard lints", () => {
  it("a case written to the standard has none, and every lint is a warning", () => {
    expect(lints(build())).toEqual([]);
    const fixture = parseCase(raw());
    if (!fixture.ok) throw new Error("fixture");
    const found = lints(fixture.value);
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((i) => i.severity === "warning")).toBe(true);
  });

  it("DOIs are well-formed in provenance and in references that cite one", () => {
    expect(WELL_FORMED_DOI.test("10.3760/cma.cmcr20260128-00421")).toBe(true);
    expect(WELL_FORMED_DOI.test("10.1016/j.jaci.2020.01.017")).toBe(true);
    expect(WELL_FORMED_DOI.test("10.1016/S0140–6736(20)30183-5")).toBe(false); // en dash
    expect(at(build((j) => (j.provenance.doi = "10.3760/cma.cmcr20260128-00421")), "provenance.doi")).toEqual([]);
    expect(at(build((j) => (j.provenance.doi = "doi 10.3760/cma–cmcr")), "provenance.doi")).toHaveLength(1);
    expect(at(build((j) => j.debrief.references.push("Habib G, et al. 2015 ESC Guidelines. Eur Heart J. 2015;36:3075-3128. DOI: 10.1093/eurheartj/ehv319–x.")), "debrief.references.2")).toHaveLength(1);
    expect(at(build((j) => j.debrief.references.push("Shane AL, et al. IDSA 2017. Clin Infect Dis. https://doi.org/10.1093/cid/cix669")), "debrief.references.2")).toEqual([]);
    expect(at(build((j) => j.debrief.references.push("A reference that mentions doi but cites none.")), "debrief.references.2")).toHaveLength(1);
  });

  it("every option of a decision has its own feedback", () => {
    const c = build((j) => (j.decisions[0].options[2].feedback = { ...j.decisions[0].options[1].feedback }));
    expect(at(c, "decisions.0.options.2.feedback").map((i) => i.message)).toEqual(['option "panic" has the same feedback as option "asthma" (en, zh-CN): give each option its own feedback']);
  });

  it("rubric: at least 8 items with a safety item; teaching points, learning outcomes and the review", () => {
    expect(at(build((j) => j.rubric.splice(4)), "rubric")).toHaveLength(1);
    expect(at(build((j) => (j.rubric.find((r: Json) => r.domain === "safety").domain = "management")), "rubric").map((i) => i.message)).toEqual(["no safety item: the rubric needs at least one item of domain \"safety\""]);
    expect(at(build((j) => j.debrief.teachingPoints.pop()), "debrief.teachingPoints")).toHaveLength(1);
    expect(at(build((j) => j.learningOutcomes.pop()), "learningOutcomes")).toHaveLength(1);
    expect(at(build((j) => delete j.provenance.review), "provenance.review")).toHaveLength(1);
  });

  it("an objective hint must not give a correct option away", () => {
    const c = build((j) => (j.objectives[3].hint = both("Think anaphylaxis: food, airway, shock.", "考虑过敏性休克：食物、气道、休克。")));
    expect(at(c, "objectives.3.hint").map((i) => i.message)).toEqual(['hint names "Anaphylaxis", a correct option of decision "dx" (en, zh-CN): coach without the answer']);
  });

  it("the triage note and the opening line are not the library summary", () => {
    const c = build((j) => {
      j.patient.triageNote = { ...j.summary };
      j.patient.persona.openingLine = both("Simulated-clock test case", "模拟时钟测试病例");
    });
    expect(at(c, "patient.triageNote")).toHaveLength(1);
    expect(at(c, "patient.persona.openingLine")).toHaveLength(1);
  });

  it("test utterances paraphrase: none repeats its item's question, every required item has one", () => {
    const echo = build((j) => j.extensions.testUtterances.push({ text: "Do you have any allergies?", locale: "en", expect: ["allergies"] }));
    expect(at(echo, "extensions.testUtterances.3")).toHaveLength(1);
    const missing = build((j) => (j.extensions.testUtterances = j.extensions.testUtterances.filter((u: Json) => u.expect[0] !== "trigger")));
    expect(at(missing, "history.0").map((i) => i.message)).toEqual(['required history item "trigger" has no paraphrase in extensions.testUtterances']);
  });

  it("a record review needs no device and carries no procedure risk", () => {
    const record = (extra: Json) =>
      build((j) => j.investigations.push({ id: "old-mri", name: both("Previous MRI report", "既往磁共振报告"), category: "record", performedAt: "records", results: { arrival: { text: both("Normal.", "正常。") } }, ...extra }));
    expect(lints(record({ requires: ["records"] }))).toEqual([]);
    const idx = (c: CaseDefinition) => c.investigations.findIndex((i) => i.id === "old-mri");
    const device = record({ requires: ["mri", "records"] });
    expect(at(device, `investigations.${idx(device)}.requires`)).toHaveLength(1);
    const risky = record({ requires: ["records"], risk: "low" });
    expect(at(risky, `investigations.${idx(risky)}.risk`)).toHaveLength(1);
  });

  it("an avoided-harm item with scoredWhen counts whenever its harm is done", () => {
    const gate = (scoredWhen: Json) =>
      build((j) => {
        j.rubric.find((r: Json) => r.id === "no-beta").scoredWhen = scoredWhen;
      });
    const index = (c: CaseDefinition) => c.rubric.findIndex((r) => r.id === "no-beta");
    // the decision alone: a beta-blocker given before it would leave the item unscored, so the harm would cost nothing
    const narrow = gate({ attempted: "dx" });
    expect(at(narrow, `rubric.${index(narrow)}.scoredWhen`).map((i) => i.message)).toEqual([
      'rubric item "no-beta" is lost by {"intervened":"beta-blocker"}, but its scoredWhen does not hold when only that is done (the harm would go unscored): add it to the scoredWhen "any"',
    ]);
    expect(lints(gate({ any: [{ attempted: "dx" }, { intervened: "beta-blocker" }] }))).toEqual([]);
    // a harm made of two steps is covered by either; an omission (a step not done) needs no cover
    const pair = build((j) =>
      j.rubric.push({
        id: "r-one-line",
        domain: "safety",
        text: both("One antihistamine line, given after adrenaline", "抗组胺药只用一种，且在肾上腺素之后"),
        weight: 1,
        met: { all: [{ intervened: "epi" }, { not: { all: [{ intervened: "chlorphenamine" }, { intervened: "fluids" }] } }] },
        scoredWhen: { any: [{ attempted: "dx" }, { intervened: "fluids" }] },
      }),
    );
    expect(lints(pair)).toEqual([]);
  });

  it('an exam finding is not a "not recorded" placeholder (examNotRecorded says that)', () => {
    const c = build((j) => (j.exam[2].finding = both("Not recorded in the source.", "原文未记录。")));
    expect(at(c, "exam.2.finding")).toHaveLength(1);
  });

  it("a child under 12 is not asked adult social history — the carer is", () => {
    const smoke = { id: "smoking", topic: "social", question: both("Do you smoke?", "你抽烟吗？"), answer: both("No.", "不抽。") };
    const child = build((j) => {
      j.patient.age = 8;
      j.history.push(smoke);
    });
    expect(at(child, `history.${child.history.length - 1}`).map((i) => i.message)).toEqual(['"smoking" asks the child (8 years) about smoking, alcohol, drugs or work: ask the carer (household smoking, schooling) instead']);
    const carer = build((j) => {
      j.patient.age = 8;
      j.history.push(smoke);
      j.patient.persona.companion = { role: "parent", name: both("Mum", "妈妈"), persona: both("Her mother", "她的妈妈"), answersHistory: true };
    });
    expect(lints(carer)).toEqual([]);
    const adult = build((j) => j.history.push(smoke));
    expect(lints(adult)).toEqual([]);
  });

  it("an option id names the option's content, not its correctness or position", () => {
    for (const id of ["ivig-now", "acute-asthma", "wrong-strength", "no-treatment", "correct-sodium-first"]) {
      expect(at(build((j) => (j.decisions[0].options[2].id = id)), "decisions.0.options.2.id"), id).toEqual([]);
    }
    for (const id of ["supported", "correct", "right", "wrong", "incorrect", "true", "false", "yes", "no", "best", "key", "answer", "correct-answer", "wrong-2", "alternative", "alternative-1", "alt-2", "option-3", "opt1", "distractor", "distractor-b", "c", "E", "3"]) {
      expect(at(build((j) => (j.decisions[0].options[2].id = id)), "decisions.0.options.2.id"), id).toHaveLength(1);
    }
    expect(at(build((j) => (j.decisions[0].options[2].id = "supported")), "decisions.0.options.2.id")[0]!.message).toBe(
      'option id "supported" names the option\'s role, not its content — the id reaches the web board, hook payloads, traces and exports, so it gives the answer or its position away: name what the option says (e.g. "ivig-now")',
    );
  });

  it("the key of a single-best decision is the longest option in at most one decision per locale", () => {
    // dx's key is already the longest in zh-CN ("过敏性休克" against "急性哮喘", "惊恐发作"), not in en; "disposition" is select-all
    const observe = (key: Json, dxKey?: Json) =>
      build((j) => {
        if (dxKey) j.decisions[0].options[0].text = dxKey;
        j.decisions.push({
          id: "obs",
          prompt: both("How long should she be observed?", "需要观察多久？"),
          requires: { phase: "observation" },
          need: both("Stabilise her first.", "先稳定病情。"),
          options: [
            { id: "six-hours", text: key, correct: true, feedback: both("Biphasic reactions need six hours at least.", "双相反应需要至少观察6小时。") },
            { id: "one-hour", text: both("One hour", "1小时"), correct: false, feedback: both("Too short for a biphasic reaction.", "不足以发现双相反应。") },
            { id: "home-now", text: both("No observation", "不观察"), correct: false, feedback: both("Unsafe after anaphylaxis.", "过敏性休克后不安全。") },
          ],
        });
      });
    expect(lints(observe(both("Six hours", "6小时")))).toEqual([]); // en: not the longest; zh-CN: a tie is no cue
    const long = both("At least six hours of observation", "至少观察6小时");
    expect(lints(observe(long)).map((i) => [i.path, i.message])).toEqual([
      ["decisions.2.options.0.text", 'the correct option "six-hours" of decision "obs" is its longest option (zh-CN), as in an earlier decision: a key that is the longest more than once is a length cue — make a distractor as long, or the key shorter'],
    ]);
    // the cue in both locales: one warning naming both; the first decision with the cue is allowed
    const twice = observe(long, both("Anaphylaxis to peanut", "花生过敏性休克"));
    expect(lints(twice).map((i) => [i.path, i.message])).toEqual([["decisions.2.options.0.text", expect.stringContaining("(en, zh-CN)")]]);
  });

  it("no authoring language in what the learner reads from the patient, the carer or the nurse", () => {
    const fine = build((j) => {
      j.history[2].answer = both("Nothing regular. They never found the source of my last rash.", "没有长期用药。上次起疹子也没查出原因。");
      j.patient.persona.fallbackUnknown = both("That isn't in my notes, so I can't say.", "这个我病历里没写，我说不上来。");
    });
    expect(lints(fine)).toEqual([]);
    const meta = build((j) => {
      j.history[2].answer = both("The source does not record her medicines.", "原病历未记录用药。");
      j.patient.persona.companion = { role: "spouse", name: both("Husband (teaching role)", "丈夫（教学设定）"), persona: both("Her husband", "她的丈夫") };
      j.patient.triageNote = both("Lip swelling after lunch, per source notes.", "午饭后嘴唇肿。");
    });
    expect(lints(meta).map((i) => [i.path, i.message])).toEqual([
      ["history.2.answer", 'the answer to "meds" uses authoring language — "The source" (en), "原病历" (zh-CN): learners read it, so write it in character; only record-facing text (results, examNotRecorded, the debrief) may name the report'],
      ["patient.persona.companion.name", 'the companion\'s name uses authoring language — "teaching role" (en), "教学设定" (zh-CN): learners read it, so write it in character; only record-facing text (results, examNotRecorded, the debrief) may name the report'],
      ["patient.triageNote", 'the triage note uses authoring language — "source notes" (en): learners read it, so write it in character; only record-facing text (results, examNotRecorded, the debrief) may name the report'],
    ]);
  });

  it("no decision is gated on asking an item the case does not record", () => {
    const gate = (requires: Json) =>
      build((j) => {
        j.history.push({ id: "family", topic: "family", question: both("Does anyone in the family have allergies?", "家里人有过敏的吗？"), answer: both("That isn't in my notes.", "这个我病历里没写。"), disclosure: "unknown" });
        j.decisions[0].requires = requires;
      });
    expect(lints(gate({ all: [{ objective: "assess" }, { asked: "allergies" }] }))).toEqual([]);
    const hidden = gate({ all: [{ objective: "assess" }, { any: [{ examined: "skin" }, { asked: "family" }] }] });
    expect(lints(hidden).map((i) => [i.path, i.message])).toEqual([
      ["decisions.0.requires.all.1.any.1.asked", 'decision "dx" requires asking "family", which the case does not record (disclosure "unknown"): gate it on recorded evidence — a question without an answer is a hidden gate'],
    ]);
  });

  it("no redundant gate structure in phases, decisions and objectives", () => {
    const fine = build((j) => {
      j.decisions[0].requires = { all: [{ objective: "assess" }, { any: [{ asked: "allergies" }, { not: { all: [{ examined: "skin" }] } }] }] };
      delete j.decisions[1].requires; // the default { always: true } on its own is no list
    });
    expect(lints(fine)).toEqual([]);
    const noisy = build((j) => {
      j.phases[1].enterWhen = { all: [{ always: true }, { objective: "stabilise" }] };
      j.decisions[0].requires = { all: [{ all: [{ objective: "assess" }, { asked: "allergies" }] }, { examined: "skin" }] };
      j.objectives[0].completeWhen = { any: [{ any: [{ examined: "airway" }] }, { not: { any: [{ always: true }, { asked: "allergies" }] } }] };
    });
    expect(lints(noisy).map((i) => [i.path, i.message])).toEqual([
      ["phases.1.enterWhen.all.0", '{"always": true} in an "all" list adds nothing: drop it'],
      ["decisions.0.requires.all.0", 'an "all" directly in an "all" list: move its conditions into the outer list'],
      ["objectives.0.completeWhen.any.0", 'an "any" directly in an "any" list: move its conditions into the outer list'],
      ["objectives.0.completeWhen.any.1.not.any.0", '{"always": true} in an "any" list makes the whole "any" hold from the start: gate on what the learner does'],
    ]);
  });

  it("a key reasoning point is not a copy of a teaching point (in any locale)", () => {
    const reasoning = (...points: Json[]) => build((j) => (j.debrief.keyReasoning = points));
    expect(lints(reasoning(both("Urticaria and hypotension after a food trigger point to anaphylaxis.", "食物诱因后荨麻疹伴低血压，指向过敏性休克。")))).toEqual([]);
    const copy = reasoning(both("Food trigger, airway and shock.", "食物诱因、气道与休克。"), both("im adrenaline is first line", "肌注肾上腺素是一线治疗"));
    expect(lints(copy).map((i) => [i.path, i.message])).toEqual([
      ["debrief.keyReasoning.1", "the key reasoning point repeats debrief.teachingPoints.0 (en, zh-CN): give the reasoning chain that leads to the answer, not the teaching point again"],
    ]);
    expect(at(reasoning(both("Adrenaline comes first, intramuscularly.", "肌注肾上腺素是一线治疗！")), "debrief.keyReasoning.0").map((i) => i.message)).toEqual([expect.stringContaining("(zh-CN)")]);
  });

  it("a test utterance is not one of its expected item's keywords", () => {
    expect(lints(build((j) => j.extensions.testUtterances.push({ text: "Any allergies at all?", locale: "en", expect: ["allergies"] })))).toEqual([]);
    const keyword = build((j) => j.extensions.testUtterances.push({ text: "Allergic?", locale: "en", expect: ["allergies"] }, { text: "过敏", locale: "zh-CN", expect: ["allergies"] }));
    expect(lints(keyword).map((i) => [i.path, i.message])).toEqual([
      ["extensions.testUtterances.3", '"Allergic?" is a keyword of "allergies", so it tests nothing the keyword does not: write a paraphrase a learner would type'],
      ["extensions.testUtterances.4", '"过敏" is a keyword of "allergies", so it tests nothing the keyword does not: write a paraphrase a learner would type'],
    ]);
  });

  it("every specialty id is canonical; a synonym's warning names its replacement", () => {
    expect(lints(build((j) => (j.specialty = ["emergency-medicine", "allergy-immunology", "pediatric-surgery"])))).toEqual([]);
    const off = build((j) => (j.specialty = ["emergency-medicine", "allergy", "paediatric-neurology", "space-medicine"]));
    expect(lints(off).map((i) => [i.path, i.message])).toEqual([
      ["specialty.1", 'specialty "allergy" is a synonym: use "allergy-immunology"'],
      ["specialty.2", 'specialty "paediatric-neurology" is a synonym: use "pediatrics" + "neurology" — a child\'s organ specialty is the adult id beside the age group ("pediatrics", or "neonatology" for a newborn)'],
      ["specialty.3", 'specialty "space-medicine" is not a canonical id: use one of CANONICAL_SPECIALTIES (packages/core/src/specialties.ts), or add the discipline there with its bilingual label'],
    ]);
    // a newborn's age group is already "neonatology"
    const newborn = build((j) => (j.specialty = ["neonatology", "paediatric-endocrinology", "paediatric-surgery"]));
    expect(lints(newborn).map((i) => [i.path, i.message])).toEqual([
      ["specialty.1", 'specialty "paediatric-endocrinology" is a synonym: use "endocrinology" — a child\'s organ specialty is the adult id beside the age group ("pediatrics", or "neonatology" for a newborn)'],
      ["specialty.2", 'specialty "paediatric-surgery" is a synonym: use "pediatric-surgery"'],
    ]);
  });
});

describe("content standard lints: critical interventions and preset doses", () => {
  const iv = (j: Json, id: string): Json => j.interventions.find((i: Json) => i.id === id);

  it("a high-risk intervention that can be contraindicated says whether giving it then is a critical failure", () => {
    const unset = build((j) => delete iv(j, "beta-blocker").critical);
    expect(lints(unset).map((i) => [i.path, i.severity])).toEqual([["interventions.3.critical", "warning"]]);
    expect(lints(unset)[0]!.message).toMatch(/high-risk intervention "beta-blocker" can be contraindicated .* set critical to true .* or false/);
    // an explicit false is a decision too; a lower risk, or no contraindication, needs none
    expect(lints(build((j) => (iv(j, "beta-blocker").critical = false)))).toEqual([]);
    expect(lints(build((j) => Object.assign(iv(j, "beta-blocker"), { critical: undefined, risk: "moderate" })))).toEqual([]);
    expect(lints(build((j) => Object.assign(iv(j, "fluids"), { risk: "high" })))).toEqual([]);
  });

  it("a preset dose states the dose its text states (amount, range and route, in every locale)", () => {
    const epi = (dose: Json, spec: Json) => build((j) => Object.assign(iv(j, "epi"), { dose, doseSpec: spec }));
    const same = epi(both("Adrenaline 0.5 mg IM (0.5 mL of 1 mg/mL)", "肾上腺素0.5mg肌注（1 mg/mL，0.5 mL）"), { amount: 500, unit: "microgram", route: "IM" });
    expect(lints(same)).toEqual([]);
    // a tenfold slip in the preset, and a route the text does not give
    const off = epi(both("Adrenaline 0.5 mg IM", "肾上腺素0.5mg肌注"), { amount: 5, unit: "mg", route: "IV" });
    expect(lints(off).map((i) => [i.path, i.message])).toEqual([
      ["interventions.0.doseSpec", 'the preset dose of "epi" (5 mg IV) is not what its dose text states (en: 0.5 mg, IM; zh-CN: 0.5 mg, IM): make them say the same dose'],
      // the fixture's name states 0.5 mg IM too: typed as an order it would not be given
      [
        "interventions.0.doseSpec",
        '"epi" is named with a dose that is not its preset (5 mg IV), or one that cannot be checked against it: "Adrenaline 0.5 mg IM", "肾上腺素0.5mg肌注" — typed as an order it would not be given; name the preset\'s dose (one dose, with its unit), or none',
      ],
    ]);
    // a range is compared end for end; a dose per kg through the weight; units that cannot be compared are left alone
    const labetalol = (text: string, spec: Json) => build((j) => Object.assign(iv(j, "beta-blocker"), { name: both("IV beta-blocker", "静注β受体阻滞剂"), dose: text, doseSpec: spec }));
    expect(lints(labetalol("Labetalol 10–20 mg IV", { amount: 10, upTo: 20, unit: "mg", route: "IV" }))).toEqual([]);
    // a single dose lies within the range (a preset spans the doses the cited guidance allows around the text's dose)
    expect(lints(labetalol("Labetalol 10 mg IV", { amount: 10, upTo: 20, unit: "mg", route: "IV" }))).toEqual([]);
    expect(lints(labetalol("Labetalol 25 mg IV", { amount: 10, upTo: 20, unit: "mg", route: "IV" })).map((i) => i.path)).toEqual(["interventions.3.doseSpec"]);
    expect(lints(labetalol("Labetalol 12–20 mg IV", { amount: 10, upTo: 20, unit: "mg" })).map((i) => i.path)).toEqual(["interventions.3.doseSpec"]);
    const weighed = (text: string, spec: Json) => build((j) => ((j.patient.weightKg = 60), Object.assign(iv(j, "beta-blocker"), { name: both("IV beta-blocker", "静注β受体阻滞剂"), dose: text, doseSpec: spec })));
    expect(lints(weighed("Propranolol 0.015 mg/kg IV", { amount: 0.9, unit: "mg", route: "IV" }))).toEqual([]);
    expect(lints(weighed("Propranolol 1 mL of 1 mg/mL IV", { amount: 1, unit: "mg", route: "IV" }))).toEqual([]);
  });

  it("a name or alias that states a dose must be given when typed as an order: the preset's dose, one dose with its unit", () => {
    const named = (aliases: string[]) => build((j) => Object.assign(iv(j, "epi"), { doseSpec: { amount: 0.5, unit: "mg", route: "IM" }, aliases: { en: aliases, "zh-CN": ["肾上腺素"] } }));
    expect(lints(named(["adrenaline", "epi 500 micrograms"]))).toEqual([]);
    // a number without its unit, a range, a volume without its strength: the nurse would ask
    expect(lints(named(["adrenaline 0.5", "adrenaline 0.3–0.5 mg", "adrenaline 0.5 mL"])).map((i) => i.message)).toEqual([expect.stringContaining('"adrenaline 0.5", "adrenaline 0.3–0.5 mg", "adrenaline 0.5 mL" — typed as an order it would not be given')]);
  });

  it("a critical intervention is not low- or no-risk", () => {
    const low = build((j) => Object.assign(iv(j, "beta-blocker"), { risk: "low" }));
    expect(at(low, "interventions.3.risk").map((i) => [i.severity, i.message])).toEqual([
      ["warning", 'critical intervention "beta-blocker" is low risk: giving it while contraindicated is a critical safety failure — set its risk to moderate or high (the learner is asked to confirm it, and its badge says so)'],
    ]);
    expect(at(build((j) => Object.assign(iv(j, "beta-blocker"), { risk: "moderate" })), "interventions.3.risk")).toEqual([]);
  });

  it("a high-alert medicine whose text states exactly one dose has a preset, and the warning names it (lead decision: bolus-then-infusion, schedules and alternatives are exempt)", () => {
    const opioid = (dose: Json, extra: Json = {}) => build((j) => Object.assign(iv(j, "chlorphenamine"), { name: both("IV morphine", "静注吗啡"), dose, ...extra }));
    // one dose, in every locale: the preset to add, as the text states it
    expect(lints(opioid(both("Morphine 2.5 mg slow IV, repeat every 5 minutes", "吗啡2.5 mg缓慢静注，必要时每5分钟重复"))).map((i) => [i.path, i.message])).toEqual([
      [
        "interventions.2.doseSpec",
        'high-alert medication "chlorphenamine" states one dose (2.5 mg IV) but has no preset dose: an order\'s dose is not checked — a tenfold one would be given; add "doseSpec": {"amount":2.5,"unit":"mg","route":"IV"}, widened with "upTo" to every dose the case\'s cited guidance allows',
      ],
    ]);
    // one range: still one dose; without a route the warning asks for one
    expect(lints(opioid(both("Morphine 2–4 mg, titrated", "吗啡2–4 mg滴定"))).map((i) => i.message)).toEqual([expect.stringContaining('add "doseSpec": {"amount":2,"upTo":4,"unit":"mg"} (with its "route")')]);
    // a bolus then an infusion, alternatives, a schedule of doses: no single preset says it — exempt
    expect(lints(opioid(both("Heparin 80 units/kg IV bolus, then 18 units/kg/h", "肝素80 U/kg静推，随后18 U/kg/h泵入")))).toEqual([]);
    expect(lints(opioid(both("Morphine 2.5 mg IV or 5 mg IM", "吗啡2.5 mg静注或5 mg肌注")))).toEqual([]);
    // no dose stated; a preset already there; never given right (contraindicated always)
    expect(lints(opioid(both("Morphine IV, titrated to pain", "静注吗啡滴定镇痛")))).toEqual([]);
    expect(lints(opioid(both("Morphine 2.5 mg IV", "吗啡2.5 mg静注"), { doseSpec: { amount: 2.5, unit: "mg", route: "IV" } }))).toEqual([]);
    expect(lints(opioid(both("Morphine 2.5 mg IV", "吗啡2.5 mg静注"), { contraindicatedWhen: { always: true }, critical: true, risk: "high" }))).toEqual([]);
    // an item that is not a high-alert medicine needs none
    expect(lints(build((j) => (iv(j, "chlorphenamine").dose = both("Chlorphenamine 10 mg IV", "氯苯那敏10 mg静注"))))).toEqual([]);
  });
});

describe("specialty canon", () => {
  it("labels every canonical id once per locale, and nothing outside the canon but a synonym", () => {
    for (const locale of ["zh-CN", "en"] as const) {
      const labels = CANONICAL_SPECIALTIES.map((id) => SPECIALTY_LABELS[id]?.[locale]);
      expect(labels.every((l) => !!l?.trim()), locale).toBe(true);
      expect(new Set(labels).size, `${locale}: two disciplines share a label`).toBe(labels.length);
    }
    for (const id of Object.keys(SPECIALTY_LABELS)) expect(isCanonicalSpecialty(id) || id in SPECIALTY_SYNONYMS, id).toBe(true);
  });

  it("maps every synonym to canonical ids, never to itself", () => {
    for (const [id, replacement] of Object.entries(SPECIALTY_SYNONYMS)) {
      expect(isCanonicalSpecialty(id), id).toBe(false);
      expect(replacement.length, id).toBeGreaterThan(0);
      expect(replacement.every(isCanonicalSpecialty), id).toBe(true);
    }
  });

  it("canonicalises a case's list: synonyms replaced, the age group once, order kept, unknown ids kept", () => {
    expect(canonicalSpecialties(["respiratory", "critical-care"])).toEqual(["respiratory-medicine", "critical-care"]);
    expect(canonicalSpecialties(["paediatric-neurology", "cardiology", "vascular-surgery"])).toEqual(["pediatrics", "neurology", "cardiology", "vascular-surgery"]);
    expect(canonicalSpecialties(["pediatrics", "nephrology", "paediatric-surgery", "neurology"])).toEqual(["pediatrics", "nephrology", "pediatric-surgery", "neurology"]);
    expect(canonicalSpecialties(["paediatric-neurology", "paediatric-endocrinology", "ophthalmology"])).toEqual(["pediatrics", "neurology", "endocrinology", "ophthalmology"]);
    // a newborn's age group is neonatology
    expect(canonicalSpecialties(["neonatology", "paediatric-endocrinology", "paediatric-surgery"])).toEqual(["neonatology", "endocrinology", "pediatric-surgery"]);
    expect(canonicalSpecialties(["space-medicine", "toxicology"])).toEqual(["space-medicine", "clinical-toxicology"]);
    // an unlisted paediatric organ id follows the scheme; distinct disciplines and age groups do not
    expect(canonicalSpecialty("pediatric-dermatology")).toEqual(["pediatrics", "dermatology"]);
    expect(canonicalSpecialty("paediatric-haematology")).toEqual(["pediatrics", "hematology"]);
    expect(canonicalSpecialty("pediatric-surgery")).toEqual(["pediatric-surgery"]);
    expect(canonicalSpecialty("pediatric-neonatology")).toBeNull();
    expect(canonicalSpecialty("space-medicine")).toBeNull();
  });

  it("shows a synonym of one discipline by its label, so older content joins that filter; other unknown ids as words", () => {
    expect(specialtyLabel("pulmonology", "zh-CN")).toBe("呼吸内科");
    expect(specialtyLabel("respiratory", "en")).toBe("Respiratory medicine");
    expect(specialtyLabel("orthopaedics", "en")).toBe("Orthopaedics");
    expect(specialtyLabel("paediatric-neurology", "en")).toBe("paediatric neurology");
  });
});
