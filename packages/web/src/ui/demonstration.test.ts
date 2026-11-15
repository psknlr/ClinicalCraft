/**
 * The demonstration greyed out (docs/TEAM.md §1, docs/GLOSSARY.md "demonstration"): in a place in the care team its
 * buttons carry the session's own refusal — the words the session says when the demonstration is asked for there anyway
 * —, in both languages; operating, it is offered; external control locks it as before.
 */
import { describe, expect, it } from "vitest";
import { setLocale, tr } from "../i18n/index.js";
import { demonstrationLock } from "./demonstration.js";
import { placeSession } from "./panels/__fixtures__/team-play.js";

describe("the demonstration's buttons (demonstrationLock)", () => {
  it("in a place: greyed out with the session's own refusal, in both languages; operating or between encounters: offered", async () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const app = await placeSession({ seat: "first-assistant" }, locale);
      try {
        const why = demonstrationLock(false, app.session.state, locale);
        expect(why, locale).toBeTruthy();
        // asked for anyway, the session refuses it in the place with these very words
        const r = await app.session.run({ type: "autopilot", maxTurns: 1 });
        const refusals = r.flatMap((e) => (e.msg.type === "error" ? [e.msg] : []));
        expect(refusals, locale).toEqual([expect.objectContaining({ code: "permission_denied" })]);
        expect(refusals[0]!.message, locale).toContain(why!);
      } finally {
        await app.close();
      }
    }
    expect(demonstrationLock(false, { seat: "first-assistant" }, "en")).toBe("The demonstration works the case as the operating surgeon: it does not run while you hold the first assistant's place.");
    expect(demonstrationLock(false, { seat: "scrub-nurse" }, "zh-CN")).toBe("示范接诊是以主刀医生的身份完成病例：你担任洗手护士岗位时不能使用。");
    // operating (no place recorded), or no encounter running: offered
    expect(demonstrationLock(false, {}, "en")).toBeNull();
    expect(demonstrationLock(false, null, "en")).toBeNull();
  });

  it("external control on: locked with its own words, a place held or not", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      setLocale(locale);
      expect(demonstrationLock(true, {}, locale)).toBe(tr("ext.autopilotOff"));
      expect(demonstrationLock(true, { seat: "scrub-nurse" }, locale)).toBe(tr("ext.autopilotOff"));
    }
    setLocale("en");
  });
});
