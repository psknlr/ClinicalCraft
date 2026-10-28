/**
 * Record review (`investigations[].performedAt: "records"`, docs/CASE_AUTHORING.md §5, EMBODIED §6): an
 * existing report retrieved from the chart. It needs nothing a facility might lack — the chart is read at a
 * records terminal or the notes at the bedside — so it is never a capability gap.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CaseDefinition } from "../schema/case.js";
import { caseCapabilityGaps, investigationNeeds, parseCase, parseCatalog, parseFacility } from "./index.js";

type Json = Record<string, any>;
const read = (name: string): Json => JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));

function build(patch: (json: Json) => void): CaseDefinition {
  const json = read("mini-anaphylaxis.case.json");
  patch(json);
  const parsed = parseCase(json);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues, null, 2));
  return parsed.value;
}

const prior = (extra: Json = {}): Json => ({
  id: "prior-echo",
  name: { en: "Previous echocardiogram report", "zh-CN": "既往超声心动图报告" },
  category: "record",
  requires: ["records"],
  performedAt: "records",
  results: { arrival: { text: { en: "Normal biventricular function (2024).", "zh-CN": "双心室功能正常（2024年）。" } } },
  ...extra,
});

describe('performedAt: "records"', () => {
  it("is accepted by the schema", () => {
    const c = build((j) => j.investigations.push(prior()));
    expect(c.investigations.find((i) => i.id === "prior-echo")?.performedAt).toBe("records");
  });

  it("needs nothing a facility might lack, whatever its requires say", () => {
    const c = build((j) => j.investigations.push(prior({ requires: ["echocardiography", "records"] })));
    const inv = c.investigations.find((i) => i.id === "prior-echo")!;
    expect(investigationNeeds(inv)).toEqual([]);
    expect(investigationNeeds(c.investigations.find((i) => i.id !== "prior-echo")!)).toEqual(c.investigations.find((i) => i.id !== "prior-echo")!.requires);
  });

  it("is never a capability gap of a facility", () => {
    const facility = parseFacility(read("mini.facility.json"));
    const catalog = parseCatalog(read("mini.catalog.json"));
    if (!facility.ok || !catalog.ok) throw new Error("fixtures");
    const study = (performedAt?: string) =>
      build((j) => {
        j.investigations.push(prior({ requires: ["echocardiography"], ...(performedAt ? { performedAt } : {}) }));
        j.objectives[0].completeWhen = { all: [j.objectives[0].completeWhen, { read: "prior-echo" }] };
      });
    // a performed echo the facility cannot do blocks the objective…
    const performed = caseCapabilityGaps(study("provider"), facility.value, [catalog.value]).find((g) => g.id === "prior-echo");
    expect(performed?.blocking).toBe(true);
    // …retrieving the existing report does not
    expect(caseCapabilityGaps(study("records"), facility.value, [catalog.value]).find((g) => g.id === "prior-echo")).toBeUndefined();
  });
});
