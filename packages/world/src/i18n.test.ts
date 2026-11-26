/**
 * World strings (CLAUDE.md: every user-facing string bilingual): both languages, the same placeholders, and
 * no raw tool or operation ids in a learner sentence (extra review item 2) — the id a model needs travels in
 * the refusal's `hint` (`then.operation`) and `details`, never in the sentence.
 */
import { describe, expect, it } from "vitest";
import { EVENT_SUMMARIES, NAV_MESSAGES, OPERATION_NAMES, ROOM_KIND_NAMES, STATE_NAMES, WHEREABOUTS, WORLD_MESSAGES, ageSexTag, operationName } from "./i18n.js";

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

  it("the new operation has a name in both languages", () => {
    expect(operationName("transport_patient", "en")).toBe("Transport the patient");
    expect(operationName("transport_patient", "zh-CN")).toBe("转运患者");
  });

  it("the patient's age/sex tag gives the age as clinicians write it (core patientAgeText), never a raw count or fraction", () => {
    expect(ageSexTag({ age: 58, sex: "male" }, "en")).toBe("58 years male");
    expect(ageSexTag({ age: 58, ageUnit: "years", sex: "male" }, "zh-CN")).toBe("58岁男性");
    // a child stored in months: years and months, not "100 months"
    expect(ageSexTag({ age: 100, ageUnit: "months", sex: "male" }, "en")).toBe("8 years 4 months male");
    expect(ageSexTag({ age: 100, ageUnit: "months", sex: "female" }, "zh-CN")).toBe("8岁4个月女性");
    // a fractional year, an infant and a newborn
    expect(ageSexTag({ age: 4 + 1 / 12, sex: "female" }, "en")).toBe("4 years 1 month female");
    expect(ageSexTag({ age: 10, ageUnit: "months", sex: "male" }, "zh-CN")).toBe("10个月男性");
    expect(ageSexTag({ age: 0.75, ageUnit: "days", sex: "female" }, "en")).toBe("18 hours female");
  });
});
