/**
 * The UI strings in both languages: every key of one table is in the other with the same blanks, the places' and
 * controls' names are core's (`POSITION_TITLES`, `CONTROL_TITLES`: one source for every front-end), the picker's words
 * follow docs/GLOSSARY.md, and the window by place has its words in both languages.
 */
import { CONTROL_TITLES, POSITION_TITLES, StaffPositionSchema, SURGICAL_CONTROLS, TEAM_PLACES } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import en from "./en.js";
import { POSITIONS_EN, POSITIONS_ZH } from "./positions.js";
import { SURGERY_EN, SURGERY_ZH } from "./surgery.js";
import zh from "./zh-CN.js";

const blanks = (text: string) => [...text.matchAll(/\{(\w+)\}/gu)].map((m) => m[1]).sort();

describe("both languages", () => {
  it("every key exists in both locales, with the same blanks", () => {
    const zhKeys = Object.keys(zh).sort();
    expect(Object.keys(en).sort()).toEqual(zhKeys);
    const differ = zhKeys.filter((k) => JSON.stringify(blanks((zh as Record<string, string>)[k]!)) !== JSON.stringify(blanks((en as Record<string, string>)[k]!)));
    expect(differ).toEqual([]);
    for (const table of [POSITIONS_ZH, POSITIONS_EN, SURGERY_ZH, SURGERY_EN]) for (const [k, v] of Object.entries(table)) expect(v.trim(), k).not.toBe("");
    expect(Object.keys(POSITIONS_EN).sort()).toEqual(Object.keys(POSITIONS_ZH).sort());
  });

  it("names every position, place and control as core does", () => {
    for (const p of StaffPositionSchema.options) {
      expect(POSITIONS_ZH[`position.${p}`], p).toBe(POSITION_TITLES[p]["zh-CN"]);
      expect(POSITIONS_EN[`position.${p}`], p).toBe(POSITION_TITLES[p].en);
    }
    for (const c of SURGICAL_CONTROLS) {
      expect(POSITIONS_ZH[`control.${c}`], c).toBe(CONTROL_TITLES[c]["zh-CN"]);
      expect(POSITIONS_EN[`control.${c}`], c).toBe(CONTROL_TITLES[c].en);
    }
    for (const p of TEAM_PLACES) {
      expect(POSITIONS_ZH[`place.${p}`]).toBe(POSITION_TITLES[p]["zh-CN"]);
      expect(POSITIONS_EN[`place.${p}`].toLowerCase()).toBe(POSITION_TITLES[p].en);
    }
    // the operating surgeon's place is the learner as always (docs/GLOSSARY.md "your place in the team")
    expect([POSITIONS_EN["place.surgeon"], POSITIONS_ZH["place.surgeon"]]).toEqual(["Operating surgeon (you may also do the team's parts)", "主刀医生（团队各岗位的事也可由你做）"]);
    expect([POSITIONS_EN["intro.lineup.label"], POSITIONS_ZH["intro.lineup.label"]]).toEqual(["Team", "团队配置"]);
  });

  it("says a reason to the one it is about in both languages: each 'you' sentence has its template's blanks less the person", () => {
    const you = Object.keys(SURGERY_ZH).filter((k) => k.startsWith("surgery.reason.") && k.endsWith(".you")) as (keyof typeof SURGERY_ZH)[];
    expect(you.length).toBe(7);
    for (const k of you) {
      expect(blanks(SURGERY_ZH[k]), k).toEqual(blanks(SURGERY_EN[k]));
      const base = k.slice(0, -".you".length) as keyof typeof SURGERY_ZH;
      for (const b of blanks(SURGERY_EN[k])) expect(blanks(SURGERY_EN[base]), k).toContain(b);
    }
  });
});
