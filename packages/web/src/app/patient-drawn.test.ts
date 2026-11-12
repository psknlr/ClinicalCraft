/**
 * How the people of a case are drawn in the world (docs/CASE_AUTHORING.md, docs/FACILITIES.md "Staff in the 3D
 * world"): the patient with a woman's features or a man's by the sex the case records, a companion as neither's in
 * particular unless the case says who they are — never by their hair, and no more than the record says.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCase, parseFacility, t, type CaseDefinition, type FacilityDefinition } from "@clinicalcraft/core";
import { patientFor } from "./world-bridge.js";

const content = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../content");

function facility(id: string): FacilityDefinition {
  const parsed = parseFacility(JSON.parse(fs.readFileSync(path.join(content, "facilities", `${id}.json`), "utf8")));
  if (!parsed.ok) throw new Error(`${id} does not parse`);
  return parsed.value;
}

const cases: CaseDefinition[] = fs
  .readdirSync(path.join(content, "cases"))
  .filter((dir) => fs.existsSync(path.join(content, "cases", dir, "case.json")))
  .map((dir) => {
    const parsed = parseCase(JSON.parse(fs.readFileSync(path.join(content, "cases", dir, "case.json"), "utf8")));
    if (!parsed.ok) throw new Error(`${dir} does not parse`);
    return parsed.value;
  });
const hospitals = [facility("general-hospital"), facility("teaching-hospital")];

/** A case's patient as the world is given them, in the first hospital that has a place for the case. */
function drawn(c: CaseDefinition) {
  for (const f of hospitals) {
    const p = patientFor(c, f, "en");
    if (p) return p;
  }
  return null;
}

describe("how the people of a case are drawn", () => {
  it("the patient by the sex the case records, whatever their hair", () => {
    let seen = 0;
    const kinds = new Set<string>();
    for (const c of cases) {
      const p = drawn(c);
      if (!p) continue;
      seen++;
      const want = c.patient.appearance.presentation ?? (c.patient.sex === "female" ? "feminine" : c.patient.sex === "male" ? "masculine" : "neutral");
      expect(p.appearance.presentation, c.id).toBe(want);
      kinds.add(`${c.patient.sex}:${c.patient.appearance.hairStyle}`);
      // the rest of the appearance is the case's own
      expect({ ...p.appearance, presentation: undefined }, c.id).toEqual({ ...c.patient.appearance, presentation: undefined });
    }
    expect(seen).toBeGreaterThan(20);
    // (among them women with cropped hair: drawn as women)
    expect(kinds.has("female:short")).toBe(true);
    expect(kinds.has("male:short")).toBe(true);
  });

  it("a patient whose sex is neither's is drawn as neither; what the author says wins", () => {
    const base = cases.find((c) => c.id === "dka-adult")!;
    const f = hospitals[0]!;
    for (const sex of ["unspecified", "intersex"] as const) expect(patientFor({ ...base, patient: { ...base.patient, sex } }, f, "en")!.appearance.presentation).toBe("neutral");
    expect(patientFor({ ...base, patient: { ...base.patient, sex: "male" } }, f, "en")!.appearance.presentation).toBe("masculine");
    const said = { ...base, patient: { ...base.patient, sex: "male" as const, appearance: { ...base.patient.appearance, presentation: "feminine" as const } } };
    expect(patientFor(said, f, "en")!.appearance.presentation).toBe("feminine");
  });

  it("a companion as neither's in particular unless the case says who they are — and it says so wherever their name does", () => {
    let seen = 0, said = 0;
    for (const c of cases) {
      const companion = c.patient.persona.companion;
      const p = drawn(c);
      if (!companion || !p) continue;
      seen++;
      expect(p.companion, c.id).toBeDefined();
      expect(p.companion!.appearance.presentation, c.id).toBe(companion.appearance?.presentation ?? "neutral");
      // a wife, a mother, a daughter; a husband, a father, a son: the name tells, so the appearance tells
      const name = t(companion.name, "en");
      // "Ms Li (his wife)" is a woman; "Ms Ouyang's relative" is the relative of a woman — the name does not tell
      const woman = /\((?:his |her )?(?:wife|mother|daughter|sister)\b/.test(name) || /^(?:Ms|Mrs) [A-Z][a-z]+ \(/.test(name);
      const man = /\((?:his |her )?(?:husband|father|son|brother)\b/.test(name) || /^Mr [A-Z][a-z]+ \(/.test(name);
      if (woman) expect(companion.appearance?.presentation, `${c.id}: ${name}`).toBe("feminine");
      if (man) expect(companion.appearance?.presentation, `${c.id}: ${name}`).toBe("masculine");
      if (woman || man) said++;
      // "a parent", "a relative" the source does not describe: nothing is added
      if (/does not say/.test(t(companion.persona, "en"))) expect(companion.appearance?.presentation, c.id).toBeUndefined();
    }
    expect(seen).toBeGreaterThan(10);
    expect(said).toBeGreaterThan(5);
    // and a companion's hair says nothing of it: long hair and no word is still neither's
    const base = cases.find((c) => c.id === "dka-adult")!;
    const companion = base.patient.persona.companion!;
    const unsaid = { ...base, patient: { ...base.patient, persona: { ...base.patient.persona, companion: { ...companion, appearance: { ...companion.appearance, presentation: undefined } } } } };
    expect(unsaid.patient.persona.companion.appearance.hairStyle).toBe("long");
    expect(patientFor(unsaid, hospitals[0]!, "en")!.companion!.appearance.presentation).toBe("neutral");
  });
});
