/**
 * Content lints of the clinical content standard (docs/CASE_AUTHORING.md §9.8): warnings from
 * `cases validate` (errors never; `--strict` fails on them). A case written to the standard has none; each
 * lint finds exactly its own problem.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
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
});
