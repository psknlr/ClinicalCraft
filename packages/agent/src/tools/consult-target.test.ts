/**
 * Lookup by position (docs/PROTOCOL.md §3, docs/GLOSSARY.md "position", "camera holder"): the one resolver that `@`
 * mentions, `consult {staff}` and `delegate_task` share names whoever holds a position in this encounter's team —
 * after names, before titles —: every position's title in either language, 一助 and 二助, 主刀 and 术者 (whoever operates:
 * the stand-in while the learner holds a place, the learner otherwise — no colleague), and the camera holder (扶镜手,
 * "camera holder": whoever holds the camera port with the scope in it, else the present member other than the surgeon
 * who holds the camera control). Resolved through the case's team as it is (the line-up chosen), never the facility's
 * titles.
 */
import { describe, expect, it } from "vitest";
import { createSession, reduce, type CaseDefinition, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { LAP_CHOLE_TEAM } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-team.js";
import { ACCESS, THEATRE, theatreCase, theatreFacility } from "../session/__fixtures__/theatre.js";
import { parseMention } from "../session/router.js";
import { lookupStaff, resolveConsultStaff } from "./consult-target.js";
import { positionWord } from "./position-words.js";

const facility = theatreFacility();
const c = theatreCase();
type Choice = Partial<Pick<SessionState, "seat" | "lineup" | "teamScenario" | "procedure">>;

/** Whom a word names in the theatre (a staff id, or `none` / `ambiguous`). */
function who(asked: string, state: Choice = {}, caseDef: CaseDefinition = c): string {
  const r = lookupStaff(facility, asked, THEATRE, { caseDef, state });
  return r.kind === "one" ? r.staff.id : r.kind;
}

/** The state after these actions (each accepted). */
function after(caseDef: CaseDefinition, actions: ClinicalAction[]): SessionState {
  let s = createSession(caseDef);
  for (const a of actions) {
    const r = reduce(caseDef, s, a);
    if (r.rejected) throw new Error(`${a.type}: ${r.rejected.message}`);
    s = r.state;
  }
  return s;
}

describe("a position in words names whoever holds it in this encounter", () => {
  it("一助, 二助, 主刀, 术者, 扶镜手, 'camera holder', 'first assistant' — each resolves", () => {
    // two surgeons: the first assistant also holds the camera
    for (const asked of ["一助", "first assistant", "First Assistant", "the first assistant", "第一助手", "扶镜手", "camera holder", "the camera holder"]) expect(who(asked), asked).toBe("doc-1");
    // three surgeons: the second assistant holds the camera
    const three = { lineup: "three-surgeons" };
    for (const asked of ["二助", "second assistant", "第二助手", "扶镜手", "camera holder"]) expect(who(asked, three), asked).toBe("doc-2");
    expect(who("一助", three)).toBe("doc-1");
    // whoever operates: the stand-in while the learner holds a place
    for (const asked of ["主刀", "术者", "operating surgeon", "主刀医生"]) expect(who(asked, { seat: "first-assistant" }), asked).toBe("doc-0");
    for (const asked of ["scrub nurse", "洗手护士"]) expect(who(asked), asked).toBe("nurse-2");
  });

  it("nobody holds a position the team as it is does not have: no second assistant without the line-up, no operating colleague while the learner operates", () => {
    expect(who("二助")).toBe("none");
    expect(who("second assistant", { lineup: "three-surgeons", teamScenario: "second-away" })).toBe("none");
    for (const asked of ["主刀", "术者"]) expect(who(asked), asked).toBe("none");
    // and without a team the words are nobody's: the position tier needs the case's team
    expect(lookupStaff(facility, "一助", THEATRE)).toEqual({ kind: "none" });
  });

  it("the camera holder is whoever holds the camera port with the scope in it — else the one member (never the surgeon) holding the camera control", () => {
    // both assistants hold the camera control (the team gives the first assistant it too): by control, either
    const team = structuredClone(LAP_CHOLE_TEAM) as { room: string; members: { staff: string; controls?: string[] }[] };
    team.room = THEATRE;
    team.members.find((m) => m.staff === "doc-1")!.controls = ["retract", "suction", "camera"];
    const both = theatreCase({ team });
    const three = { type: "start", lineup: "three-surgeons" } as ClinicalAction;
    expect(who("扶镜手", { lineup: "three-surgeons" }, both)).toBe("ambiguous");
    // once one of them holds the scope, the camera holder is they
    const held = after(both, [three, { type: "set-phase", phase: "theatre" }, ...ACCESS.map((op) => ({ type: "operate", op }) as ClinicalAction), { type: "operate", op: { op: "hand-over", port: "A", to: "doc-1" }, actor: "doc-1" }]);
    expect(held.procedure!.ports.find((p) => p.site === "A")!.holder).toBe("doc-1");
    for (const asked of ["扶镜手", "camera holder"]) expect(who(asked, held, both), asked).toBe("doc-1");
  });

  it("names come first: 'Dr Abe' is Dr Abe; the words are matched whole, an @ and 'the' aside", () => {
    expect(who("Dr Abe")).toBe("doc-1");
    expect(positionWord("@一助")).toBe("first-assistant");
    expect(positionWord("The Camera Holder")).toBe("camera-holder");
    expect(positionWord("assistant")).toBeNull();
  });
});

describe("one resolver for consult, @ mentions and delegation", () => {
  it("consult {staff} and an @ mention reach the same colleague by position", () => {
    const placed = { seat: "first-assistant" as const };
    for (const [asked, id] of [
      ["一助", "doc-1"],
      ["扶镜手", "doc-1"],
      ["主刀", "doc-0"],
    ] as const) {
      const r = resolveConsultStaff(c, facility, asked, "zh-CN", asked === "主刀" ? placed : {});
      expect(r.ok && r.target.voice?.staffId, asked).toBe(id);
    }
    const lookup = (name: string) => {
      const r = lookupStaff(facility, name, THEATRE, { caseDef: c, state: {} });
      return r.kind === "one" ? r.staff.id : null;
    };
    expect(parseMention("@一助请拉住B孔", lookup)).toEqual({ found: "doc-1", text: "请拉住B孔" });
    expect(parseMention("@first assistant, hold port B please", lookup)).toEqual({ found: "doc-1", text: "hold port B please" });
    expect(parseMention("@camera holder closer please", lookup)).toEqual({ found: "doc-1", text: "closer please" });
  });
});
