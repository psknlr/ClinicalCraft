/**
 * The field's people and its camera in the learner's words (docs/PROCEDURE.md §7, A19): the learner — operating, or
 * their place's member — is "you" (the camera "held by you" / "由你握持"), anyone else by name and position, in both
 * languages. The scope dock and the surgery window say the camera with this one sentence (`cameraWords`).
 */
import { createSession, observeField, reduce, type ClinicalAction, type FacilityDefinition, type ProcedureOp, type SessionState } from "@clinicalcraft/core";
import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "../i18n/index.js";
import { cameraWords, learnerField, partyName, partyWords } from "./field-names.js";
import { lapCholeTeamCase } from "./panels/__fixtures__/lap-chole-sit.js";

const k = lapCholeTeamCase();
const def = k.procedure!;
type Start = Extract<ClinicalAction, { type: "start" }>;

/** The theatre's people, by name (the facility's staff the words read). */
const facility = {
  staff: [
    { id: "doc-0", role: "attending", position: "surgeon", name: { en: "Dr Ito", "zh-CN": "伊藤医生" } },
    { id: "doc-1", role: "attending", position: "first-assistant", name: { en: "Dr Abe", "zh-CN": "阿部医生" } },
    { id: "nurse-2", role: "nurse", position: "scrub-nurse", name: { en: "Chen Yu", "zh-CN": "陈雨" } },
  ],
} as unknown as FacilityDefinition;

/** The encounter after its start (in the theatre) and `steps`, each of which must be accepted. */
function encounter(start: Start, steps: readonly { op: ProcedureOp; actor?: string }[]): SessionState {
  let s = reduce(k, createSession(k), start).state;
  if (s.phase !== "theatre") s = reduce(k, s, { type: "set-phase", phase: "theatre" }).state;
  for (const x of steps) {
    const r = reduce(k, s, { type: "operate", op: x.op, ...(x.actor ? { actor: x.actor } : {}) } as ClinicalAction);
    if (r.rejected) throw new Error(`${x.op.op} by ${x.actor ?? "the operator"}: ${r.rejected.message}`);
    s = r.state;
  }
  return s;
}

/** The operator's access (by `actor`: the stand-in while the learner holds a place): the gas, the scope in A, a grasper in B. */
const access = (actor?: string) =>
  (
    [
      { op: "plan-ports", plan: "mirror-four-port" },
      { op: "insufflate", pressure: 12 },
      { op: "insert", port: "A", instrument: "laparoscope" },
      { op: "insert", port: "B", instrument: "grasper" },
    ] as ProcedureOp[]
  ).map((op) => ({ op, ...(actor ? { actor } : {}) }));

afterEach(() => setLocale("en"));

describe("the field's people in the learner's words", () => {
  it("the learner is 'you' — operating, or holding a place —; anyone else by name and position", () => {
    const operating = encounter({ type: "start" }, access());
    const op = learnerField(k, facility, () => operating);
    const first = encounter({ type: "start", seat: "first-assistant" }, access("doc-0"));
    const fa = learnerField(k, facility, () => first);
    setLocale("en");
    expect([partyWords(op, undefined), partyName(op, ""), partyWords(op, "doc-1"), partyName(op, "doc-1")]).toEqual(["you", "you", "Dr Abe (first assistant)", "Dr Abe"]);
    // in the first assistant's place: their member is the learner; the stand-in operates
    expect([partyWords(fa, "doc-1"), partyWords(fa, undefined), partyName(fa, undefined), partyWords(fa, "nurse-2")]).toEqual(["you", "Dr Ito (operating surgeon)", "Dr Ito", "Chen Yu (scrub nurse)"]);
    // the words follow the UI language of the moment they are read
    setLocale("zh-CN");
    expect([partyWords(op, undefined), partyWords(op, "doc-1")]).toEqual(["你", "阿部医生（第一助手）"]);
    expect([partyWords(fa, "doc-1"), partyWords(fa, undefined), partyWords(fa, "nurse-2")]).toEqual(["你", "伊藤医生（主刀医生）", "陈雨（洗手护士）"]);
  });

  it("a name the facility already qualifies in brackets is said once — its position not added again", () => {
    // a content pack's theatre names its staff with their part ("Dr Mori (assistant surgeon)", "林护士（洗手）")
    const qualified = {
      staff: [
        { id: "doc-1", role: "attending", position: "first-assistant", name: { en: "Dr Mori (assistant surgeon)", "zh-CN": "森医生（助手）" } },
        { id: "nurse-2", role: "nurse", position: "scrub-nurse", name: { en: "Nurse Lim (scrub)", "zh-CN": "林护士（洗手）" } },
        { id: "anaes-1", role: "attending", position: "anaesthetist", name: { en: "Dr Tanaka", "zh-CN": "田中医生" } },
      ],
    } as unknown as FacilityDefinition;
    const s = encounter({ type: "start" }, [...access(), { op: { op: "hand-over", port: "A", to: "doc-1" } }]);
    const words = learnerField(k, qualified, () => s);
    setLocale("en");
    expect([partyWords(words, "doc-1"), partyWords(words, "nurse-2"), partyWords(words, "anaes-1")]).toEqual(["Dr Mori (assistant surgeon)", "Nurse Lim (scrub)", "Dr Tanaka (anaesthetist)"]);
    expect(cameraWords(words, observeField(def, s.procedure!), def)).toBe("Port A: the whole field, wide — held by Dr Mori (assistant surgeon)");
    setLocale("zh-CN");
    expect([partyWords(words, "doc-1"), partyWords(words, "nurse-2"), partyWords(words, "anaes-1")]).toEqual(["森医生（助手）", "林护士（洗手）", "田中医生（麻醉医生）"]);
  });
});

describe("the camera in the learner's words (the scope dock and the surgery window)", () => {
  it("says where it looks, how close, and who holds it — 'held by you' / '由你握持' for the learner", () => {
    // the first assistant takes the camera port, aims at the gallbladder bed and goes close
    const steps = [...access("doc-0"), ...([{ op: "hand-over", port: "A", to: "doc-1" }, { op: "aim", port: "A", at: "gallbladder-bed" }, { op: "zoom", port: "A", level: "close" }] as ProcedureOp[]).map((op) => ({ op, actor: "doc-1" }))];
    const held = encounter({ type: "start", seat: "first-assistant" }, steps);
    const words = learnerField(k, facility, () => held);
    const v = observeField(def, held.procedure!);
    expect(v.camera).toEqual({ port: "A", at: "gallbladder-bed", zoom: "close", holder: "doc-1" });
    setLocale("en");
    expect(cameraWords(words, v, def)).toBe("Port A: aimed at Gallbladder bed, close up — held by you");
    setLocale("zh-CN");
    expect(cameraWords(words, v, def)).toBe("A 孔：对准Gallbladder bed，近景——由你握持");

    // the stand-in's own camera, before anyone takes it: the operator by name and position
    const before = encounter({ type: "start", seat: "first-assistant" }, access("doc-0"));
    const bw = learnerField(k, facility, () => before);
    setLocale("en");
    expect(cameraWords(bw, observeField(def, before.procedure!), def)).toBe("Port A: the whole field, wide — held by Dr Ito (operating surgeon)");

    // operating: the camera handed to the first assistant is held by them, by name; the operator's own is "you"
    const handed = encounter({ type: "start" }, [...access(), { op: { op: "hand-over", port: "A", to: "doc-1" } }]);
    const hw = learnerField(k, facility, () => handed);
    expect(cameraWords(hw, observeField(def, handed.procedure!), def)).toBe("Port A: the whole field, wide — held by Dr Abe (first assistant)");
    setLocale("zh-CN");
    expect(cameraWords(hw, observeField(def, handed.procedure!), def)).toBe("A 孔：全视野，全景——由阿部医生（第一助手）握持");
    const own = encounter({ type: "start" }, access());
    expect(cameraWords(learnerField(k, facility, () => own), observeField(def, own.procedure!), def)).toBe("A 孔：全视野，全景——由你握持");

    // no laparoscope in a camera port: nothing to say
    const dark = encounter({ type: "start" }, access().slice(0, 2));
    expect(cameraWords(learnerField(k, facility, () => dark), observeField(def, dark.procedure!), def)).toBeNull();
  });
});
