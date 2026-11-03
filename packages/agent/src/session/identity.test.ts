/**
 * Who spoke and who authorised (the 2.3.0 audit, repair 4; docs/PROTOCOL.md §3, §3.1):
 *
 * - a hold is released by the caller, never by a name the caller supplies: a learner's `release-hold` naming the
 *   attending is the learner's, and refused; the attending who placed it releases it once, after a reassessment;
 * - one room-aware resolver for a named colleague — "Dr Tanaka", "Nurse Lim", the staff id, "anaesthetist" and
 *   "麻醉医生" reach the same person in the encounter's room; a name several people answer to equally asks which;
 * - an `@` mention names a colleague ("@Nurse Lim …", "@林护士请…"), never a bare agent ("@nurse …").
 */
import { describe, expect, it } from "vitest";
import { parseCase, type ClinicalAction, type FacilityDefinition } from "@clinicalcraft/core";
import { LAP_CHOLE_SIT } from "../../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import { lookupStaff, resolveConsultStaff } from "../tools/consult-target.js";
import { makeSession, msgsOf } from "../__fixtures__/harness.js";
import { parseMention } from "./router.js";

const L = (en: string, zh = en) => ({ en, "zh-CN": zh });

function holdCase() {
  const raw = structuredClone(LAP_CHOLE_SIT) as unknown as Record<string, any>;
  raw.interventions = [
    { id: "sign-in", name: L("Sign In"), kind: "consult", checklist: true, maxDoses: 1 },
    { id: "induction", name: L("Induction"), kind: "airway", risk: "high", maxDoses: 1 },
  ];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

describe("a hold is released by its holder, as the caller is", () => {
  it("a learner naming the attending releases as the learner: refused; the attending releases it once", async () => {
    const t = await makeSession({ caseDef: holdCase() });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    // the attending's tool records the hold in the attending's own name
    expect(t.session.dispatch({ type: "hold", interventionId: "induction", placedBy: "attending", reason: "antithrombotic status unknown", by: "agent" }).rejected).toBeUndefined();
    const forged = await t.session.run({ type: "clinical_action", action: { type: "release-hold", interventionId: "induction", releasedBy: "attending", reassessment: "fine" } as ClinicalAction });
    const rejected = msgsOf(forged, "clinical_event").find((e) => e.event.type === "action.rejected");
    expect(rejected?.event).toMatchObject({ code: "requirements-unmet", message: expect.stringContaining("only attending can release it") });
    expect(t.session.state.holds?.[0]?.released).toBeUndefined();
    // the attending reassesses and releases (its tool's path: the caller's own role); a second release finds nothing held
    expect(t.session.dispatch({ type: "release-hold", interventionId: "induction", releasedBy: "attending", reassessment: "Aspirin only: proceed.", by: "agent" }).rejected).toBeUndefined();
    expect(t.session.state.holds?.[0]?.released).toMatchObject({ by: "attending", reassessment: "Aspirin only: proceed." });
    expect(t.session.dispatch({ type: "release-hold", interventionId: "induction", releasedBy: "attending", reassessment: "again", by: "agent" }).rejected?.code).toBe("invalid");
    await t.session.close();
  });
});

const staff = (id: string, role: FacilityDefinition["staff"][number]["role"], name: { en: string; "zh-CN": string }, room: string) => ({ id, role, name, room, x: 0, z: 0, rot: 0 });
const facility = {
  staff: [
    staff("l1-anaesthetist", "attending", L("Dr Wang (anaesthesia on call)", "王医生（麻醉科值班主治）"), "l1-workroom"),
    staff("or-6.anaesthetist", "attending", L("Dr Lee (anaesthesia)", "李医生（麻醉）"), "or-6"),
    staff("or-7.anaesthetist", "attending", L("Dr Tanaka (anaesthesia)", "田中医生（麻醉）"), "or-7"),
    staff("or-6.scrub-nurse", "nurse", L("Nurse Rahman (scrub)", "拉曼护士（洗手）"), "or-6"),
    staff("or-7.scrub-nurse", "nurse", L("Nurse Lim (scrub)", "林护士（洗手）"), "or-7"),
  ],
} as unknown as FacilityDefinition;

describe("one room-aware resolver for a named colleague", () => {
  it("names, titles and ids in either language reach the same person in the encounter's room", () => {
    const id = (asked: string) => {
      const r = lookupStaff(facility, asked, "or-7");
      return r.kind === "one" ? r.staff.id : r.kind;
    };
    for (const asked of ["Dr Tanaka", "tanaka", "or-7.anaesthetist", "staff:or-7.anaesthetist", "anaesthetist", "the anesthesiologist", "麻醉医生", "田中医生"]) expect(id(asked), asked).toBe("or-7.anaesthetist");
    for (const asked of ["Nurse Lim", "@Nurse Lim", "Lim", "林护士", "scrub nurse", "洗手护士", "or-7.scrub-nurse"]) expect(id(asked), asked).toBe("or-7.scrub-nurse");
    // another room's colleague by name is still that person
    expect(id("Nurse Rahman")).toBe("or-6.scrub-nurse");
    expect(id("nobody at all")).toBe("none");
  });

  it("a title several people answer to, with no room to prefer, asks which", () => {
    const r = lookupStaff(facility, "anaesthetist", null);
    expect(r.kind).toBe("ambiguous");
    expect(r.kind === "ambiguous" && r.staff.map((s) => s.id)).toEqual(["or-6.anaesthetist", "or-7.anaesthetist"]);
    const c = holdCase();
    const consult = resolveConsultStaff(c, facility, "anaesthetist", "en");
    expect(consult).toMatchObject({ ok: false, ambiguous: true });
    // the case's team room makes it one
    const inOr7 = resolveConsultStaff({ ...c, team: { room: "or-7" } } as typeof c, facility, "麻醉医生", "zh-CN");
    expect(inOr7.ok && inOr7.target.voice?.staffId).toBe("or-7.anaesthetist");
  });

  it("an @ mention names a colleague — in words or run together in Chinese — never a bare agent", () => {
    const lookup = (name: string) => {
      const r = lookupStaff(facility, name, "or-7");
      return r.kind === "one" ? r.staff.id : null;
    };
    expect(parseMention("@Nurse Lim, pass me the needle holder", lookup)).toEqual({ found: "or-7.scrub-nurse", text: "pass me the needle holder" });
    expect(parseMention("@林护士请把持针器递给我", lookup)).toEqual({ found: "or-7.scrub-nurse", text: "请把持针器递给我" });
    expect(parseMention("@Dr Tanaka is the patient ready?", lookup)).toEqual({ found: "or-7.anaesthetist", text: "is the patient ready?" });
    expect(parseMention("@nurse is the CBC back?", lookup, ["nurse", "patient"])).toBeNull();
    expect(parseMention("no mention here", lookup)).toBeNull();
  });
});
