/**
 * The people around a place in the team (docs/TEAM.md §1, docs/CHARACTERS.md): a colleague's specialty for an offline
 * answer goes by their position in the operating team, never by a word in their name; the colleague whose place the
 * learner holds speaks from their role card plus the standing-by line, and nobody else does; the count's record names
 * the learner by their place's member while they hold one (`surgeon` while they operate).
 */
import { describe, expect, it } from "vitest";
import { t } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { specialtyOf } from "../agents/offline.js";
import { ROLE_CARDS, roleSection } from "../characters/roles.js";
import { textScript } from "../providers/scripted.js";
import { kernelOf, STAFF, theatreCase, theatreFacility, theatreSession } from "./__fixtures__/theatre.js";

const STANDING = /You are standing by: the learner holds your place as the first assistant in this operation\./;

describe("the people around a place", () => {
  it("a surgical colleague by position (the operating surgeon, the first and second assistants) — never by a word in a name", () => {
    const c = theatreCase();
    const f = theatreFacility();
    for (const id of ["doc-0", "doc-1", "doc-2"]) expect(specialtyOf(c, id, t(f.staff.find((s) => s.id === id)!.name, "en"), f), id).toBe("surgery");
    expect(specialtyOf(c, "anaes-1", "Dr Wang", f)).toBe("anaesthesia");
    expect(specialtyOf(c, "nurse-2", "Chen Yu", f)).toBe("other");
    // a name is not a position
    expect(specialtyOf(c, "nobody", "Surgeon Lee", f)).toBe("other");
    expect(specialtyOf(c, "nobody", "外科李医生", f)).toBe("other");
  });

  it("the colleague standing by speaks from their card and the standing-by line; the others from their card alone", async () => {
    expect(roleSection(ROLE_CARDS["first-assistant"], "Dr Abe", true)).toMatch(STANDING);
    expect(roleSection(ROLE_CARDS["first-assistant"], "Dr Abe")).not.toMatch(/standing by/);
    const t = await theatreSession({ start: { type: "start", seat: "first-assistant" }, scripts: [textScript("I'm standing by."), textScript("Ready.")] });
    await t.session.run({ type: "user_message", text: "Are you all right there?", to: "attending", staff: "doc-1" } as never);
    await t.session.run({ type: "user_message", text: "Are you ready?", to: "attending", staff: "doc-2" } as never);
    const [stoodDown, other] = t.provider!.requests.map((r) => r.system.map((x) => x.text).join("\n"));
    expect(stoodDown).toMatch(STANDING);
    expect(other).toBeDefined();
    expect(other).not.toMatch(/You are standing by/);
    await t.session.close();
  });

  it("the count's record names the learner by their place's member while they hold one; operating, the surgeon", async () => {
    const operating = await theatreSession();
    expect(kernelOf(operating).embodied!.count.staffOf(PRIMARY_ACTOR)).toBe("surgeon");
    expect(kernelOf(operating).embodied!.count.staffOf(STAFF.circulating)).toBe("nurse-1");
    await operating.session.close();
    const scrub = await theatreSession({ start: { type: "start", seat: "scrub-nurse" } });
    expect(kernelOf(scrub).embodied!.count.staffOf(PRIMARY_ACTOR)).toBe("nurse-2");
    await scrub.session.close();
  });
});
