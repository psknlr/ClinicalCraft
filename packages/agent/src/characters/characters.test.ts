/**
 * The character framework (docs/CHARACTERS.md): every position has a complete, distinct role card; a staff member's
 * position comes from the facility, else the case team's duties, else the facility role; a model-driven team member
 * chooses only among the legal moves, words what it says in its own voice — grounded in what it perceives — and the
 * rules stand in for anything else; a staff line worded by a model is checked the same way.
 */
import { describe, expect, it } from "vitest";
import { StaffPositionSchema, type CaseDefinition, type FacilityDefinition, type TeamDuty } from "@clinicalcraft/core";
import { ScriptedProvider, textScript } from "../providers/scripted.js";
import type { ChatRequest } from "../providers/types.js";
import type { ColleagueView, MemberView } from "../session/team/policy.js";
import type { MemberState, Proposal, TeamMessage, TeamTask } from "../session/team/types.js";
import { positionOf, ROLE_CARDS, roleSection, SHARED_PROTOCOL } from "./roles.js";
import { lineProblem, ModelTeamMind, type MindHost } from "./team-mind.js";
import { placeClaimProblem, wordLine } from "./voice.js";

const CIRC = "staff:or.circulating";
const SCRUB = "staff:or.scrub";
const SURGEON = "actor:clinician";
const NAMES: Record<string, string> = { [CIRC]: "Nurse Aisyah", [SCRUB]: "Nurse Lim", [SURGEON]: "the surgeon", "or-7": "OR 7", "eq:nh-1": "needle holder" };

const member = (id: string, duties: TeamDuty[]): MemberState => ({ id, staff: id.replace(/^staff:/u, ""), duties, inbox: [], memory: [], relief: false, absent: false });
const colleague = (id: string, duties: TeamDuty[], extra: Partial<ColleagueView> = {}): ColleagueView => ({ id, duties, present: true, busy: false, relief: false, absent: false, distance: 2, ...extra });
const task = (extra: Partial<TeamTask> = {}): TeamTask => ({ id: "task-1", kind: "supply", need: "n1", item: "needle-holder", for: SURGEON, owner: CIRC, initiator: CIRC, thread: "thread-1", status: "open", since: 0, tried: [], acts: 0, ...extra });
const message = (extra: Partial<TeamMessage> = {}): TeamMessage => ({ id: "msg-1", thread: "thread-1", from: CIRC, to: SCRUB, kind: "request", text: { en: "Nurse Lim, a needle holder for the surgeon, please.", "zh-CN": "林护士，请给术者一把持针器。" }, about: { need: "n1", item: "needle-holder", for: SURGEON }, room: "or-7", patient: null, at: 0, round: 4, evidence: [], delivered: true, read: false, ...extra });

function view(me: MemberState, extra: Partial<MemberView> = {}): MemberView {
  let n = 0;
  return {
    me: { ...me, holding: [], inRoom: true },
    room: "or-7",
    count: null,
    patient: "patient:or-7",
    round: 5,
    waitRounds: 3,
    inbox: [],
    tasks: [],
    needs: [],
    colleagues: [colleague(SCRUB, ["instruments"]), colleague(SURGEON, ["surgeon"])],
    items: () => [],
    heldBy: () => [],
    inRoom: () => true,
    sees: () => true,
    near: () => false,
    claims: {},
    name: (who) => ({ en: NAMES[who] ?? who, "zh-CN": NAMES[who] ?? who }),
    itemName: () => ({ en: "needle holder", "zh-CN": "持针器" }),
    newId: (p) => `${p}-${++n}`,
    ...extra,
  };
}

/** The circulating nurse asking the scrub nurse for a needle holder (the policy's move). */
const request: Proposal = { kind: "say", to: SCRUB, message: { thread: "thread-1", kind: "request", text: message().text, about: message().about, evidence: [] } };
const readback: Proposal = { kind: "say", to: CIRC, message: { thread: "thread-1", kind: "readback", text: { en: "Needle holder for the surgeon.", "zh-CN": "给术者持针器。" }, about: message().about, evidence: [], replyTo: "msg-1" } };

const decision = (o: Record<string, unknown>) => textScript(JSON.stringify(o));

function harness(scripts: ((request: ChatRequest) => ReturnType<typeof textScript>)[] | null, o: { locale?: string; timeoutMs?: number; delayMs?: number } = {}) {
  const provider = scripts ? new ScriptedProvider(scripts, { delayMs: o.delayMs ?? 0 }) : null;
  const warnings: string[] = [];
  const records: Record<string, unknown>[] = [];
  const host: MindHost = {
    locale: o.locale ?? "en",
    timeoutMs: o.timeoutMs ?? 2000,
    model: () => (provider ? { provider, agent: "nurse", request: {} } : null),
    position: (m) => (m.duties.includes("circulate") ? "circulating-nurse" : "scrub-nurse"),
    name: (id) => NAMES[id] ?? id,
    staffNames: () => ["Nurse Aisyah", "Nurse Lim", "Dr Tanaka (anaesthesia)"],
    warn: (m) => void warnings.push(m),
    record: (r) => void records.push(r),
    usage: () => undefined,
  };
  return { mind: new ModelTeamMind(host), provider, warnings, records };
}
const offered = (r: ChatRequest) => ((r.responseFormat!.schema.properties as Record<string, { enum: string[] }>).option.enum);

describe("role cards", () => {
  it("every position has a complete card of its own", () => {
    const titles = new Set<string>();
    for (const p of StaffPositionSchema.options) {
      const c = ROLE_CARDS[p];
      expect(c.position).toBe(p);
      expect(c.title.en.length * c.title["zh-CN"].length, p).toBeGreaterThan(0);
      for (const list of [c.responsibilities, c.may, c.mayNot, c.protocol, c.knows]) expect(list.length, p).toBeGreaterThan(0);
      for (const e of c.escalatesTo) expect(StaffPositionSchema.options).toContain(e);
      titles.add(c.title.en);
    }
    expect(titles.size).toBe(StaffPositionSchema.options.length);
  });

  it("a staff member's position: the facility's, else the team's duty, else the facility role's", () => {
    const facility = { staff: [
      { id: "or.scrub", role: "nurse" },
      { id: "or.anaes", role: "attending" },
      { id: "or.assistant", role: "attending", position: "assistant-surgeon" },
      { id: "ward.nurse", role: "nurse" },
      { id: "porter", role: "porter" },
    ] } as unknown as FacilityDefinition;
    const c = { team: { members: [{ staff: "or.scrub", duties: ["instruments", "count"] }, { staff: "or.anaes", duties: ["anaesthesia"] }, { staff: "or.assistant", duties: ["surgeon"] }], scenarios: [{ relief: [{ staff: "next.scrub", duties: ["instruments"] }] }] } } as unknown as CaseDefinition;
    expect(positionOf(c, facility, "staff:or.scrub")).toBe("scrub-nurse");
    expect(positionOf(c, facility, "or.anaes")).toBe("anaesthetist");
    expect(positionOf(c, facility, "or.assistant")).toBe("assistant-surgeon");
    expect(positionOf(c, facility, "next.scrub")).toBe("scrub-nurse");
    expect(positionOf(c, facility, "ward.nurse")).toBe("ward-nurse");
    expect(positionOf(c, facility, "porter")).toBe("porter");
    expect(positionOf(c, facility, "nobody")).toBeNull();
  });

  it("the role section is the job description: distinct duties and limits, then the shared protocol", () => {
    const scrub = roleSection(ROLE_CARDS["scrub-nurse"], "Nurse Lim");
    const anaes = roleSection(ROLE_CARDS.anaesthetist, "Dr Tanaka");
    expect(scrub).toMatch(/^<role>\nYou are Nurse Lim, the scrub nurse\./u);
    expect(scrub).toMatch(/- leave the sterile field unrelieved/u);
    expect(anaes).toMatch(/- leave an anaesthetised patient before a colleague has taken over in person/u);
    expect(anaes).toMatch(/not the learner's preceptor/u);
    for (const line of SHARED_PROTOCOL) expect(scrub).toContain(line);
    expect(scrub).not.toBe(anaes);
  });
});

describe("a model-driven team member", () => {
  it("does the protocol's move in their own words; the other language keeps the team's wording", async () => {
    let seen: ChatRequest | null = null;
    const { mind, records } = harness([(r) => ((seen = r), decision({ option: "act", line: "Lim, could you pass the surgeon a needle holder?", why: "the surgeon needs one" }))]);
    const p = await mind.decide(member(CIRC, ["circulate"]), view(member(CIRC, ["circulate"]), { tasks: [task()] }), request, new AbortController().signal);
    expect(p).toMatchObject({ kind: "say", to: SCRUB, message: { kind: "request", text: { en: "Lim, could you pass the surgeon a needle holder?", "zh-CN": "林护士，请给术者一把持针器。" } } });
    // the model saw its role card, its situation and the legal moves — never the hidden state
    expect(seen!.system[0]!.text).toMatch(/You are Nurse Aisyah, the circulating nurse/u);
    expect(JSON.stringify(seen!.messages)).toMatch(/Your tasks:\\n- task-1: supply — needle holder for the surgeon — open/u);
    expect(offered(seen!)).toEqual(["act", "wait", "notice"]);
    expect(records.at(-1)).toMatchObject({ source: "team-mind", option: "act", accepted: true });
  });

  it("an ungrounded line is refused: a number nobody perceived, a colleague not in view, the wrong language — the team's words are said", async () => {
    for (const line of ["Lim, pass the surgeon 3 needle holders.", "Dr Tanaka, a needle holder please.", "林护士，请递持针器。"]) {
      const { mind, records } = harness([() => decision({ option: "act", line, why: "-" })]);
      const p = await mind.decide(member(CIRC, ["circulate"]), view(member(CIRC, ["circulate"])), request, new AbortController().signal);
      expect(p).toEqual(request);
      expect(records.at(-1)).toMatchObject({ accepted: false, refused: expect.any(String) });
    }
  });

  it("may wait once on an optional move — never twice in a row, never on a read-back it owes", async () => {
    const reqs: ChatRequest[] = [];
    const { mind } = harness([(r) => (reqs.push(r), decision({ option: "wait", line: "", why: "the surgeon is mid-step" })), (r) => (reqs.push(r), decision({ option: "act", line: "", why: "now" }))]);
    const me = member(CIRC, ["circulate"]);
    expect(await mind.decide(me, view(me), request, new AbortController().signal)).toBeNull();
    expect(await mind.decide(me, view(me), request, new AbortController().signal)).toEqual(request);
    expect(offered(reqs[0]!)).toContain("wait");
    expect(offered(reqs[1]!)).not.toContain("wait");
    const owes = harness([(r) => (reqs.push(r), decision({ option: "act", line: "Needle holder for the surgeon — got it.", why: "read back" }))]);
    const scrub = member(SCRUB, ["instruments"]);
    const back = await owes.mind.decide(scrub, view(scrub, { inbox: [message()] }), readback, new AbortController().signal);
    // an owed read-back is the only move offered: no waiting, no remark first
    expect(offered(reqs[2]!)).toEqual(["act"]);
    expect(back).toMatchObject({ message: { kind: "readback", text: { en: "Needle holder for the surgeon — got it." } } });
  });

  it("an option not offered, an unreadable answer, no model or a slow model: the rules decide, with one warning", async () => {
    const me = member(CIRC, ["circulate"]);
    const bad = harness([() => decision({ option: "fetch-it-myself", line: "", why: "" }), () => textScript("I think I'll ask Lim.")]);
    expect(await bad.mind.decide(me, view(me), request, new AbortController().signal)).toEqual(request);
    expect(await bad.mind.decide(me, view(me), request, new AbortController().signal)).toEqual(request);
    expect(bad.warnings).toHaveLength(1);
    const none = harness(null);
    expect(await none.mind.decide(me, view(me), request, new AbortController().signal)).toEqual(request);
    expect(none.warnings[0]).toMatch(/^Nurse Aisyah: no model — the team's rules decided this round\./u);
    const slow = harness([() => decision({ option: "wait", line: "", why: "" })], { timeoutMs: 30, delayMs: 40 });
    expect(await slow.mind.decide(me, view(me), request, new AbortController().signal)).toEqual(request);
    expect(slow.warnings[0]).toMatch(/no decision within 30 ms/u);
  });

  it("tells a colleague in the room what it sees (no obligation); escalates its own task stuck waiting", async () => {
    const me = member(CIRC, ["circulate"]);
    const { mind } = harness([
      () => decision({ option: "notice", to: SCRUB, line: "Lim, I'm getting the needle holder from the Mayo stand.", why: "keep the scrub nurse informed" }),
      () => decision({ option: "escalate", line: "Nobody in the room can bring a needle holder: Lim is on a break and the relief is not answering.", why: "stuck" }),
    ]);
    const told = await mind.decide(me, view(me, { tasks: [task()] }), null, new AbortController().signal);
    expect(told).toBeNull(); // nothing to do and nothing heard: quiet, no model call
    const notice = await mind.decide(me, view(me, { inbox: [message({ from: SCRUB, to: CIRC, kind: "report" })] }), null, new AbortController().signal);
    expect(notice).toMatchObject({ kind: "say", to: SCRUB, message: { kind: "notice", text: { en: "Lim, I'm getting the needle holder from the Mayo stand." } } });
    const stuck = await mind.decide(me, view(me, { tasks: [task({ status: "waiting" })] }), request, new AbortController().signal);
    expect(stuck).toMatchObject({ kind: "say", to: SURGEON, message: { kind: "escalate" } });
    expect(stuck!.patch).toContainEqual({ id: "task-1", set: expect.objectContaining({ status: "escalated" }) });
  });
});

describe("grounded lines", () => {
  const o = { locale: "en", perceived: "critical alarm: SBP 72", staffNames: ["Dr Tanaka (anaesthesia)", "Nurse Lim"], namesInView: ["Dr Tanaka (anaesthesia)"] };
  it("one line, the session's language, only perceived numbers and people", () => {
    expect(lineProblem("SBP 72 — I'm with the patient, checking the line.", o)).toBeNull();
    expect(lineProblem("SBP 70 — checking.", o)).toMatch(/numbers not in what the member perceives: 70/u);
    expect(lineProblem("Nurse Lim, come here.", o)).toMatch(/names someone not in view: Nurse Lim/u);
    expect(lineProblem("血压72，我在看。", o)).toMatch(/not in English/u);
    expect(lineProblem("two\nlines", o)).toMatch(/more than one line/u);
  });

  it("a staff line in the speaker's words when grounded, else the template", async () => {
    const base = { speaker: "Dr Tanaka (anaesthesia)", card: ROLE_CARDS.anaesthetist, intent: "a new alarm", facts: ["critical alarm: SBP 72"], template: "Alarm: SBP 72 — I'm at the patient and checking it.", locale: "en", timeoutMs: 2000, staffNames: o.staffNames };
    const good = new ScriptedProvider([textScript("Pressure's 72 systolic — I'm on it, checking the art line now.")]);
    expect(await wordLine({ ...base, model: { provider: good, agent: "attending", request: {} } })).toEqual({ text: "Pressure's 72 systolic — I'm on it, checking the art line now.", source: "model" });
    const bad = new ScriptedProvider([textScript("Pressure's 60 — giving 10 of ephedrine.")]);
    expect(await wordLine({ ...base, model: { provider: bad, agent: "attending", request: {} } })).toMatchObject({ text: base.template, source: "template", refused: expect.stringMatching(/numbers/u) });
    expect(await wordLine({ ...base, model: null })).toMatchObject({ text: base.template, source: "template" });
  });

  it("a line never claims a place the record contradicts: shut out, no \"at the bedside\" in either language; arrived, no \"can't get there\" (the follow-up audit)", async () => {
    // away (the alarm's walk blocked): every arrival or bedside-action claim is refused, in English and in Chinese
    for (const claim of ["I am at the bedside and checking the patient.", "I'm with the patient now.", "I've arrived — on it.", "I'm here, checking.", "I'm examining him now.", "我已经在床旁，正在检查病人。", "我到了，马上处理。"])
      expect(placeClaimProblem(claim, "away"), claim).toMatch(/claims to be at the patient/u);
    // what a shut-out responder may truthfully say
    for (const truthful of ["I can't get out of the workroom — the door's locked; someone go to the bedside now.", "I am in the anaesthesia workroom and the door is locked.", "门锁了，我过不去——请人马上到床旁。"])
      expect(placeClaimProblem(truthful, "away"), truthful).toBeNull();
    // at the patient: never "I can't get there"
    expect(placeClaimProblem("I can't get through, the door's locked.", "at-patient")).toMatch(/claims not to be at the patient/u);
    expect(placeClaimProblem("I'm at the patient, checking the line.", "at-patient")).toBeNull();
    // in wordLine: the audit's scripted reply, blocked — the template is said, and why
    const blocked = { speaker: "Dr Tanaka (anaesthesia)", card: ROLE_CARDS.anaesthetist, intent: "a new alarm; you cannot get to the patient", facts: ["critical alarm: SBP 72", "you cannot get to the patient: the door is locked"], template: "Alarm: SBP 72 — I can't get to the patient: the door is locked. I need someone at the bedside now.", locale: "en", timeoutMs: 2000, staffNames: o.staffNames, where: "away" as const };
    const liar = new ScriptedProvider([textScript("I am at the bedside and checking the patient.")]);
    expect(await wordLine({ ...blocked, model: { provider: liar, agent: "attending", request: {} } })).toMatchObject({ text: blocked.template, source: "template", refused: expect.stringMatching(/claims to be at the patient \("I am at the bedside/u) });
    const zh = new ScriptedProvider([textScript("我已经在床旁了，正在检查病人。")]);
    expect(await wordLine({ ...blocked, locale: "zh-CN", template: "报警：SBP 72——我过不去：门锁了。需要有人马上到床旁。", model: { provider: zh, agent: "attending", request: {} } })).toMatchObject({ source: "template", refused: expect.stringMatching(/claims to be at the patient/u) });
    const honest = new ScriptedProvider([textScript("SBP 72 and the door's locked — I can't get out, someone get to the bedside now!")]);
    expect(await wordLine({ ...blocked, model: { provider: honest, agent: "attending", request: {} } })).toMatchObject({ source: "model" });
  });
});

describe("the switch at runtime", () => {
  it("configure {characters: {engine}} changes how the characters are driven; anything else is refused", async () => {
    const { makeSession, msgsOf } = await import("../__fixtures__/harness.js");
    const t = await makeSession();
    expect(t.session.settings.characters).toEqual({ engine: "rules", timeoutMs: 8000 });
    const on = await t.session.run({ type: "configure", patch: { characters: { engine: "llm" } } });
    expect(t.session.settings.characters.engine).toBe("llm");
    expect(msgsOf(on, "config_changed")[0]?.patch).toMatchObject({ characters: { engine: "llm" } });
    const bad = await t.session.run({ type: "configure", patch: { characters: { engine: "telepathy" } } } as never);
    expect(msgsOf(bad, "error")[0]).toMatchObject({ code: "invalid_config" });
    expect(t.session.settings.characters.engine).toBe("llm");
    await t.session.close();
  });
});
