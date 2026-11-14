/**
 * World strings (CLAUDE.md: every user-facing string bilingual): both languages, the same placeholders, and
 * no raw tool or operation ids in a learner sentence (extra review item 2) — the id a model needs travels in
 * the refusal's `hint` (`then.operation`) and `details`, never in the sentence.
 */
import { describe, expect, it } from "vitest";
import { EVENT_SUMMARIES, NAV_MESSAGES, OPERATION_NAMES, ROOM_KIND_NAMES, STATE_NAMES, WHEREABOUTS, WORLD_MESSAGES, operationName } from "./i18n.js";

const TABLES = { WORLD_MESSAGES, EVENT_SUMMARIES, NAV_MESSAGES, OPERATION_NAMES, ROOM_KIND_NAMES, STATE_NAMES, WHEREABOUTS };
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("world strings", () => {
  it("every string in both languages, with the same placeholders", () => {
    for (const [table, rec] of Object.entries(TABLES)) {
      for (const [key, pair] of Object.entries(rec)) {
        expect(pair.en.trim(), `${table}.${key} en`).not.toBe("");
        expect(pair["zh-CN"].trim(), `${table}.${key} zh-CN`).not.toBe("");
        expect(placeholders(pair["zh-CN"]), `${table}.${key}`).toEqual(placeholders(pair.en));
      }
    }
  });

  it("no raw tool or operation id in a learner sentence (move_to, wash_hands, transport_patient …)", () => {
    for (const [table, rec] of Object.entries(TABLES)) {
      for (const [key, pair] of Object.entries(rec)) {
        for (const text of [pair.en, pair["zh-CN"]]) expect(text.replace(/\{\w+\}/g, ""), `${table}.${key}`).not.toMatch(/\b[a-z]+_[a-z_]+\b/);
      }
    }
    for (const key of ["pre.notAtBedside", "pre.notOperableCart", "spatial.provider-not-at-bedside", "spatial.provider-busy", "hint.fetch", "pre.handsClean"]) {
      expect(WORLD_MESSAGES[key], key).toBeDefined();
      for (const text of Object.values(WORLD_MESSAGES[key]!)) expect(text).not.toMatch(/move_to|wash_hands/);
    }
  });

  it("the refusals by control name the holders, the actor and the position — the learner's own as you, without a name; the colleague standing by with the same parts", () => {
    expect(placeholders(WORLD_MESSAGES["pre.control"]!.en)).toEqual(["holders", "operation", "position", "who"]);
    expect(placeholders(WORLD_MESSAGES["pre.woundScrubbed"]!.en)).toEqual(["control", "holders", "position", "who"]);
    for (const key of ["pre.control", "pre.woundScrubbed"]) {
      const theirs = placeholders(WORLD_MESSAGES[key]!.en);
      for (const lang of ["en", "zh-CN"] as const) {
        expect(placeholders(WORLD_MESSAGES[`${key}.self`]![lang]), `${key}.self ${lang}`).toEqual(theirs.filter((p) => p !== "who"));
        expect(placeholders(WORLD_MESSAGES[`${key}.standingBy`]![lang]), `${key}.standingBy ${lang}`).toEqual(theirs);
      }
    }
  });

  it("the new operation has a name in both languages", () => {
    expect(operationName("transport_patient", "en")).toBe("Transport the patient");
    expect(operationName("transport_patient", "zh-CN")).toBe("转运患者");
  });
});
