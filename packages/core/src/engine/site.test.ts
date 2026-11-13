/**
 * The operative site's verification (docs/TEAM.md §4.5): the record holds where the mark is and what the evidence
 * says, and an entry is what a member of the team saw or did — never what a caller claims. The mark and the
 * documents agree: confirmed. They do not: a discrepancy is raised from what the raiser read themselves, the pause is
 * an explicit hold, the primary evidence is read again, the site marked (or the wrong document corrected), and only
 * then is it confirmed and the hold released — the story a debrief reads back: who detected, who called the pause,
 * who verified what, what justified resuming.
 */
import { describe, expect, it } from "vitest";
import type { ClinicalAction, SessionState, SiteOp } from "../schema/session.js";
import { evaluate } from "./conditions.js";
import { checkCaseIntegrity } from "./integrity.js";
import { parseCase } from "./parse.js";
import { createSession, reduce } from "./reducer.js";
import { siteLedger, siteStatus } from "./site.js";
import { LAP_CHOLE_SIT } from "./procedure/__fixtures__/lap-chole-sit.js";

const L = (en: string) => ({ en, "zh-CN": en });
const NURSE = "or-7.circulating-nurse";
const SURGEON = "surgeon";

function raw(): Record<string, any> {
  const r = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>;
  r.clock = { mode: "simulated", startTime: "08:00", actionCosts: { ask: 1, examine: 1, order: 1, read: 1, intervene: 1, answer: 0 } };
  r.phases = [
    { id: "theatre", label: L("Theatre") },
    { id: "operation", label: L("Operation"), enterWhen: { intervened: "time-out", valid: true } },
  ];
  r.procedure.phases = ["operation"];
  r.interventions = [
    { id: "attach-monitor", name: L("Attach the monitor"), kind: "monitoring", maxDoses: 1 },
    // no Sign In while a discrepancy on the site is open
    { id: "sign-in", name: L("Sign In"), kind: "consult", checklist: true, maxDoses: 1, contraindicatedWhen: { any: [{ not: { intervened: "attach-monitor" } }, { site: { status: ["discrepancy", "unresolved"] } }] } },
    { id: "induction", name: L("Induction"), kind: "airway", risk: "high", maxDoses: 1, contraindicatedWhen: { not: { intervened: "sign-in", valid: true } } },
    { id: "time-out", name: L("Time Out"), kind: "consult", checklist: true, maxDoses: 1, contraindicatedWhen: { not: { intervened: "induction" } } },
  ];
  r.patient.nonVerbalWhen = { intervened: "induction" };
  r.team = {
    room: "or-7",
    phases: ["operation"],
    members: [
      { staff: NURSE, duties: ["circulate"] },
      { staff: "or-7.anaesthetist", duties: ["anaesthesia"] },
      { staff: "surgeon", duties: ["surgeon"] },
    ],
    site: {
      sides: { left: L("the patient's left"), right: L("the patient's right") },
      evidence: [
        { id: "consent", name: L("the consent form"), says: "left", kind: "document", primary: true },
        { id: "imaging", name: L("the CT's orientation marker"), says: "left", kind: "imaging", primary: true },
        { id: "patient", name: L("the patient himself"), says: "left", kind: "patient", primary: true },
        { id: "list", name: L("the operating list"), says: "left", kind: "document" },
      ],
      mark: "left",
      when: { intervened: "attach-monitor" },
      holds: "induction",
    },
    scenarios: [
      { id: "site-correct", name: L("Control"), summary: L("The mark is where the plan says."), provenance: "authored", expect: { site: "confirmed" } },
      { id: "mark-wrong-side", name: L("Mark on the usual side"), summary: L("The mark is on the right."), provenance: "authored", site: { mark: "right" }, expect: { site: "corrected" } },
      { id: "mark-missing", name: L("No mark"), summary: L("The site is not marked."), provenance: "authored", site: { mark: null }, expect: { site: "corrected" } },
      { id: "list-wrong", name: L("The list says right"), summary: L("The list was typed with the usual side."), provenance: "authored", site: { evidence: { list: "right" } }, expect: { site: "corrected" } },
      { id: "consent-wrong", name: L("The consent says right"), summary: L("The consent form itself names the other side."), provenance: "authored", site: { evidence: { consent: "right" } }, expect: { site: "unresolved" } },
    ],
  };
  return r;
}

function caseOf(r = raw()) {
  const parsed = parseCase(r);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

const c = caseOf();
const site = (op: SiteOp): ClinicalAction => ({ type: "site", site: op, by: "system" });
const read = (staff: string, source: string) => site({ op: "read", source, staff });
const iv = (id: string): ClinicalAction => ({ type: "intervene", interventionId: id });

/** A session of the scenario, the monitor attached and the site's record opened. */
function opened(scenario?: string): SessionState {
  let s = reduce(c, createSession(c), scenario ? { type: "start", team: scenario } : { type: "start" }).state;
  s = reduce(c, s, iv("attach-monitor")).state;
  return reduce(c, s, site({ op: "open", staff: "system" })).state;
}
function play(s: SessionState, actions: ClinicalAction[]): SessionState {
  for (const a of actions) {
    const r = reduce(c, s, a);
    if (r.rejected) throw new Error(`${a.type} ${JSON.stringify(a)}: ${r.rejected.message}`);
    s = r.state;
  }
  return s;
}
const entryOf = (s: SessionState, i = -1) => s.site!.entries.at(i)!;
const refusal = (s: SessionState, a: ClinicalAction) => reduce(c, s, a).rejected;

describe("the record: what was read is the record's, never the caller's", () => {
  it("a case without a site, and a session that never opened one, have no record: the status is none", () => {
    const plain = raw();
    delete plain.team.site;
    plain.team.scenarios = [];
    plain.interventions[1].contraindicatedWhen = { not: { intervened: "attach-monitor" } };
    const none = caseOf(plain);
    const s0 = reduce(none, createSession(none), { type: "start" }).state;
    expect(reduce(none, s0, site({ op: "open", staff: "system" })).rejected?.message).toMatch(/verifies no operative site/);
    const s = reduce(c, createSession(c), { type: "start" }).state;
    expect(siteStatus(s.site)).toBe("none");
    expect(evaluate(c, s, { site: { status: "none" } })).toBe(true);
    expect(refusal(s, read(NURSE, "mark"))?.code).toBe("no-record");
  });

  it("opened once, with the mark and the evidence as the scenario has them; a second open changes nothing", () => {
    const s = opened("mark-wrong-side");
    expect(s.site).toMatchObject({ mark: "right", says: { consent: "left", imaging: "left", patient: "left", list: "left" } });
    expect(siteStatus(s.site)).toBe("unchecked");
    const again = reduce(c, s, site({ op: "open", staff: "system" }));
    expect(again.rejected).toBeUndefined();
    expect(again.state.site!.entries).toHaveLength(1);
    expect(opened("mark-missing").site!.mark).toBeNull();
    expect(opened("list-wrong").site!.says.list).toBe("right");
  });

  it("a read is what the reader saw: the engine writes the value; the patient answers only while he can speak", () => {
    let s = opened("mark-wrong-side");
    s = play(s, [read(NURSE, "mark"), read(NURSE, "consent")]);
    expect(s.site!.entries.slice(-2).map((e) => [e.op, (e as { source: string }).source, e.value])).toEqual([["read", "mark", "right"], ["read", "consent", "left"]]);
    expect(refusal(s, read(NURSE, "wristband"))?.code).toBe("unknown-id");
    expect(play(s, [read(SURGEON, "patient")]).site!.entries.at(-1)).toMatchObject({ value: "left" });
    // anaesthetised: nobody asks him
    const asleep = play(opened(), [iv("sign-in"), iv("induction")]);
    expect(refusal(asleep, read(SURGEON, "patient"))?.code).toBe("cannot-answer");
  });
});

describe("the mark and the documents agree: confirmed, with no pause", () => {
  it("confirmed by someone who has seen the mark and read a document — not before", () => {
    let s = opened("site-correct");
    expect(refusal(s, site({ op: "confirm", staff: NURSE }))?.message).toMatch(/has not looked at the mark and read/);
    s = play(s, [read(NURSE, "mark")]);
    expect(refusal(s, site({ op: "confirm", staff: NURSE }))?.code).toBe("requirements-unmet");
    s = play(s, [read(NURSE, "consent"), read(NURSE, "list"), site({ op: "confirm", staff: NURSE })]);
    expect(entryOf(s)).toMatchObject({ op: "confirm", staff: NURSE, side: "left", basis: ["mark", "consent", "list"] });
    expect(siteStatus(s.site)).toBe("confirmed");
    expect(siteLedger(c, s)).toMatchObject({ status: "confirmed", detected: null, pause: null, confirmed: { by: NURSE, side: "left" }, unjustified: false });
    // a confirmed site stays as it was confirmed: no new mark, no document corrected, without a discrepancy
    expect(refusal(s, site({ op: "mark", side: "right", staff: SURGEON }))?.message).toMatch(/its mark is changed only on a discrepancy/);
    expect(refusal(s, site({ op: "amend", source: "list", to: "right", staff: SURGEON }))?.message).toMatch(/corrected on a discrepancy/);
    // nothing to raise where things agree; someone else's eyes do not count as one's own
    expect(refusal(s, site({ op: "raise", sources: ["mark", "consent"], staff: NURSE }))?.message).toMatch(/they agree/);
    expect(refusal(s, site({ op: "raise", sources: ["mark", "consent"], staff: SURGEON }))?.message).toMatch(/has not looked at both/);
  });
});

describe("a discrepancy: raised, paused, verified, put right, confirmed, resumed", () => {
  const raise = site({ op: "raise", sources: ["mark", "consent"], staff: NURSE });
  const pause: ClinicalAction = { type: "hold", interventionId: "induction", placedBy: NURSE, reason: "the site mark is on the patient's right; the consent form says the patient's left" };
  const release: ClinicalAction = { type: "release-hold", interventionId: "induction", releasedBy: NURSE, reassessment: "verified by the surgeon against the consent form, the CT's orientation marker and the patient himself: the patient's left; re-marked on the patient's left" };

  it("the mark on the wrong side: the whole story is on the record, and the held step waits for it", () => {
    let s = opened("mark-wrong-side");
    s = play(s, [read(NURSE, "mark"), read(NURSE, "consent"), read(NURSE, "list")]);
    // mark and documents disagree: she cannot confirm
    expect(refusal(s, site({ op: "confirm", staff: NURSE }))?.message).toMatch(/does not agree with the mark/);
    s = play(s, [raise, pause]);
    expect(entryOf(s, -1)).toMatchObject({ op: "raise", staff: NURSE, sources: ["mark", "consent"], values: ["right", "left"] });
    expect(siteStatus(s.site)).toBe("discrepancy");
    expect(evaluate(c, s, { site: { status: ["discrepancy", "unresolved"] } })).toBe(true);
    // no Sign In while it is open, and the induction is held
    const signIn = reduce(c, s, iv("sign-in"));
    expect(signIn.state.interventions.at(-1)).toMatchObject({ interventionId: "sign-in", invalid: true });
    expect(refusal(s, iv("induction"))?.code).toBe("on-hold");
    // a second discrepancy while one is open is the same discrepancy
    expect(refusal(s, site({ op: "raise", sources: ["mark", "list"], staff: NURSE }))?.message).toMatch(/already open/);
    // the site is marked by the surgeon who operates: nobody else moves the mark
    expect(refusal(s, site({ op: "mark", side: "left", staff: NURSE }))?.message).toBe("the site is marked by the operating surgeon");
    // she cannot confirm what nobody has verified, even with the mark put right
    let early = play(s, [site({ op: "mark", side: "left", staff: SURGEON }), read(NURSE, "mark"), read(NURSE, "consent")]);
    expect(refusal(early, site({ op: "confirm", staff: NURSE }))?.message).toMatch(/not verified since the discrepancy: imaging, patient/);
    // the surgeon verifies against the primary evidence and marks the site
    s = play(s, [read(SURGEON, "imaging"), read(SURGEON, "consent"), read(SURGEON, "patient"), read(SURGEON, "mark"), site({ op: "mark", side: "left", staff: SURGEON })]);
    // she saw the old mark: she looks again before she confirms
    expect(refusal(s, site({ op: "confirm", staff: NURSE }))?.message).toMatch(/has not looked at the mark and read what says where the operation is since the discrepancy/);
    s = play(s, [read(NURSE, "mark"), read(NURSE, "consent"), site({ op: "confirm", staff: NURSE }), release]);
    expect(siteStatus(s.site)).toBe("corrected");
    expect(siteLedger(c, s)).toMatchObject({
      status: "corrected",
      detected: { by: NURSE, sources: ["mark", "consent"], values: ["right", "left"] },
      pause: { by: NURSE, reason: expect.stringContaining("the site mark is on the patient's right") },
      verified: [
        { source: "imaging", value: "left", by: SURGEON },
        { source: "consent", value: "left", by: SURGEON },
        { source: "patient", value: "left", by: SURGEON },
        { source: "consent", value: "left", by: NURSE },
      ],
      corrections: [{ what: "mark", side: "left", by: SURGEON }],
      confirmed: { by: NURSE, side: "left" },
      resumed: { by: NURSE, justification: expect.stringContaining("verified by the surgeon") },
      escalated: null,
      unjustified: false,
    });
    // and now the Sign In and the induction go ahead
    s = play(s, [iv("sign-in"), iv("induction")]);
    expect(s.interventions.filter((i) => !i.invalid).map((i) => i.interventionId)).toEqual(["attach-monitor", "sign-in", "induction"]);
  });

  it("no mark at all is a discrepancy too: the surgeon marks after verifying", () => {
    let s = opened("mark-missing");
    s = play(s, [read(NURSE, "mark"), read(NURSE, "consent")]);
    expect(entryOf(s, -2).value).toBeNull();
    expect(refusal(s, site({ op: "confirm", staff: NURSE }))?.message).toBe("the site is not marked");
    s = play(s, [raise, pause, read(SURGEON, "imaging"), read(SURGEON, "consent"), read(SURGEON, "patient"), site({ op: "mark", side: "left", staff: SURGEON }), read(NURSE, "mark"), read(NURSE, "consent"), site({ op: "confirm", staff: NURSE }), release]);
    expect(siteLedger(c, s)).toMatchObject({ status: "corrected", detected: { values: [null, "left"] }, corrections: [{ what: "mark", side: "left" }], unjustified: false });
  });

  it("a wrong document is corrected, not the mark: the evidence decides which is wrong", () => {
    let s = opened("list-wrong");
    s = play(s, [read(NURSE, "mark"), read(NURSE, "consent"), read(NURSE, "list")]);
    s = play(s, [site({ op: "raise", sources: ["mark", "list"], staff: NURSE }), pause, read(SURGEON, "imaging"), read(SURGEON, "consent"), read(SURGEON, "patient")]);
    // primary evidence is never corrected in the room; the list is
    expect(refusal(s, site({ op: "amend", source: "consent", to: "right", staff: SURGEON }))?.message).toMatch(/not a document that can be corrected in the room/);
    s = play(s, [site({ op: "amend", source: "list", to: "left", staff: SURGEON }), read(NURSE, "mark"), read(NURSE, "consent"), read(NURSE, "list"), site({ op: "confirm", staff: NURSE }), release]);
    expect(s.site).toMatchObject({ mark: "left", says: { list: "left" } });
    expect(siteLedger(c, s)).toMatchObject({ status: "corrected", corrections: [{ what: "amend", source: "list", to: "left", by: SURGEON }], unjustified: false });
  });

  it("primary evidence that disagrees with itself cannot be confirmed in the room: escalated, and the hold stays", () => {
    let s = opened("consent-wrong");
    s = play(s, [read(NURSE, "mark"), read(NURSE, "consent"), raise, pause, read(SURGEON, "imaging"), read(SURGEON, "consent"), read(SURGEON, "patient")]);
    // even with the mark moved to match the consent, nothing can be confirmed
    const moved = play(s, [site({ op: "mark", side: "right", staff: SURGEON }), read(NURSE, "mark"), read(NURSE, "consent")]);
    expect(refusal(moved, site({ op: "confirm", staff: NURSE }))?.message).toMatch(/the primary evidence disagrees with itself/);
    s = play(s, [site({ op: "escalate", staff: NURSE, reason: "the consent form says the patient's right; the CT and the patient say left — the operation does not go on" })]);
    expect(siteStatus(s.site)).toBe("unresolved");
    expect(refusal(s, iv("induction"))?.code).toBe("on-hold");
    expect(siteLedger(c, s)).toMatchObject({ status: "unresolved", escalated: { by: NURSE }, resumed: null, unjustified: false });
    // escalated once; and an escalation settles nothing: the discrepancy is still the one to verify
    expect(refusal(s, site({ op: "escalate", staff: NURSE, reason: "again" }))?.message).toMatch(/already escalated/);
    expect(refusal(s, site({ op: "raise", sources: ["mark", "consent"], staff: NURSE }))?.message).toMatch(/already open/);
    expect(refusal(play(s, [read(NURSE, "mark"), read(NURSE, "list")]), site({ op: "confirm", staff: NURSE }))?.message).toMatch(/the primary evidence disagrees with itself/);
  });

  it("escalated because nobody answered, then verified after all: confirmed late, and the record says both", () => {
    let s = opened("mark-wrong-side");
    s = play(s, [read(NURSE, "mark"), read(NURSE, "consent"), raise, pause, site({ op: "escalate", staff: NURSE, reason: "the surgeon has not verified the side" })]);
    expect(siteStatus(s.site)).toBe("unresolved");
    // a confirmation is still held to the verification the discrepancy asks for
    const early = play(s, [site({ op: "mark", side: "left", staff: SURGEON }), read(NURSE, "mark"), read(NURSE, "consent")]);
    expect(refusal(early, site({ op: "confirm", staff: NURSE }))?.message).toMatch(/not verified since the discrepancy/);
    s = play(s, [read(SURGEON, "imaging"), read(SURGEON, "consent"), read(SURGEON, "patient"), site({ op: "mark", side: "left", staff: SURGEON }), read(NURSE, "mark"), read(NURSE, "consent"), site({ op: "confirm", staff: NURSE }), release]);
    expect(siteLedger(c, s)).toMatchObject({ status: "corrected", escalated: { by: NURSE }, confirmed: { by: NURSE, side: "left" }, resumed: { by: NURSE }, unjustified: false });
  });

  it("released before it was verified and confirmed — or the held step given — is an unjustified resume", () => {
    let s = opened("mark-wrong-side");
    s = play(s, [read(NURSE, "mark"), read(NURSE, "consent"), raise, pause, release]);
    expect(siteLedger(c, s)).toMatchObject({ status: "discrepancy", resumed: { by: NURSE }, unjustified: true });
    // put right afterwards, the record still says it was resumed too early
    s = play(s, [read(SURGEON, "imaging"), read(SURGEON, "consent"), read(SURGEON, "patient"), site({ op: "mark", side: "left", staff: SURGEON }), read(NURSE, "mark"), read(NURSE, "consent"), site({ op: "confirm", staff: NURSE })]);
    expect(siteLedger(c, s)).toMatchObject({ status: "corrected", unjustified: true });
  });
});

describe("the case check", () => {
  const messages = (mutate: (r: Record<string, any>) => void) => {
    const r = raw();
    mutate(r);
    const parsed = parseCase(r);
    if (!parsed.ok) return parsed.issues.map((i) => i.message);
    return checkCaseIntegrity(parsed.value).filter((i) => i.severity === "error").map((i) => i.message);
  };

  it("the test case is sound", () => {
    expect(messages(() => {})).toEqual([]);
  });

  it("sides, evidence, the step held and a scenario's changes are real", () => {
    expect(messages((r) => (r.team.site.mark = "middle")).join("\n")).toContain('unknown side "middle"');
    expect(messages((r) => (r.team.site.holds = "incision")).join("\n")).toContain('unknown intervention "incision"');
    expect(messages((r) => r.team.site.evidence.forEach((e: any) => delete e.primary)).join("\n")).toContain("no primary evidence");
    expect(messages((r) => (r.team.site.evidence[1].says = "right")).join("\n")).toContain("disagrees with itself");
    expect(messages((r) => (r.team.scenarios[1].site.mark = "up")).join("\n")).toContain('unknown side "up"');
    expect(messages((r) => (r.team.scenarios[3].site.evidence = { wristband: "left" })).join("\n")).toContain('unknown site evidence "wristband"');
    expect(messages((r) => delete r.team.site).join("\n")).toContain("the team verifies no operative site");
  });
});
