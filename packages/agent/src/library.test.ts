/**
 * The shared case index (C1, docs/EMBODIED.md §11): one entry builder for the
 * web bundle, `clinicalcraft serve` and `clinicalcraft cases index`, read from
 * the raw case JSON without validating it. Its `capabilityNeeds` must decide
 * facility choice exactly as core's `caseCapabilityGaps` does on the full case.
 */
import { readFileSync } from "node:fs";
import { caseCapabilityGaps, facilityCapabilities, parseCase, type CaseDefinition, type Condition, type EquipmentCatalog, type FacilityDefinition } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { canCompleteWith, caseIndexEntry, CASE_INDEX_ENTRY_KEYS, compareLibraryOrder, libraryOrder, normalizeIndexEntry, type CaseIndexEntry } from "./library.js";
import { loadContent } from "./node/content.js";

const content = await loadContent();
const raws = new Map([...content.cases].map(([id, e]) => [id, JSON.parse(readFileSync(e.file, "utf8")) as Record<string, unknown>]));
const defs = [...content.cases.values()].map((e) => e.def);
const allCatalogs = [...content.catalogs.values()].map((e) => e.def);
const catalogsFor = (f: FacilityDefinition): EquipmentCatalog[] => {
  const listed = f.catalogs.map((id) => content.catalogs.get(id)?.def).filter((c): c is EquipmentCatalog => !!c);
  return listed.length ? listed : allCatalogs;
};
const facilities = [...content.facilities.values()].map((e) => e.def);
const HASH = "0123456789abcdef";

describe("caseIndexEntry", () => {
  it("carries exactly the library-card, filter and facility-choice fields", () => {
    expect(defs.length).toBeGreaterThan(0);
    for (const [id, raw] of raws) {
      const entry = caseIndexEntry(raw, HASH)!;
      expect(Object.keys(entry).sort(), id).toEqual([...CASE_INDEX_ENTRY_KEYS].sort());
      const def = content.cases.get(id)!.def;
      expect(entry).toMatchObject({
        id,
        version: def.version,
        title: def.title,
        summary: def.summary,
        specialty: def.specialty,
        difficulty: def.difficulty,
        setting: def.setting,
        facility: def.facility ?? null,
        locales: def.locales,
        estimatedMinutes: def.estimatedMinutes ?? null,
        provenance: def.provenance.kind,
        tags: def.tags,
        physiology: def.physiology != null,
        objectives: def.objectives.length,
        disclaimer: def.disclaimer ?? null,
        contentHash: HASH,
      });
      // Index entries never carry case answers (only the card fields above have text).
      const debrief = JSON.stringify(def.debrief.conclusion);
      expect(JSON.stringify(entry), id).not.toContain(debrief.slice(1, 40));
    }
  });

  it("keeps only the V4 label's prefix: the rest names the diagnosis", () => {
    const smzl = raws.get("smzl-lung-adeno");
    if (!smzl) return;
    const entry = caseIndexEntry(smzl, HASH)!;
    expect(entry.labelPrefix).toEqual({ "zh-CN": "CASE 01", en: "CASE 01" });
    const { id: _id, ...rest } = entry; // the id itself names the diagnosis (as everywhere): front-ends that hide ids use handles
    expect(JSON.stringify(rest)).not.toMatch(/SMZL|腺癌|adenocarcinoma/i);
    expect(caseIndexEntry({ id: "x", extensions: { v4: { caseLabel: "CASE 07 · Secret diagnosis" } } }, HASH)!.labelPrefix).toBe("CASE 07");
    expect(caseIndexEntry({ id: "x" }, HASH)!.labelPrefix).toBeNull();
  });

  it("reads malformed raw JSON defensively (defaults like the web library), and needs an id", () => {
    expect(caseIndexEntry(null, HASH)).toBeNull();
    expect(caseIndexEntry({ title: "no id" }, HASH)).toBeNull();
    expect(caseIndexEntry({ id: "../evil" }, HASH)).toBeNull();
    const entry = caseIndexEntry({ id: "bare", difficulty: "hard", specialty: ["a", 3], title: { en: "T", "zh-CN": 5 }, objectives: "x", physiology: null }, HASH)!;
    expect(entry).toMatchObject({ id: "bare", title: { en: "T" }, summary: "", specialty: ["a"], difficulty: 1, setting: "outpatient", facility: null, locales: [], estimatedMinutes: null, provenance: "synthetic", tags: [], physiology: false, objectives: 0, labelPrefix: null, disclaimer: null, version: "", capabilityNeeds: [] });
  });

  it("carries the review status and date and the number of learning outcomes, never their text (docs/GLOSSARY.md §4)", () => {
    for (const [id, raw] of raws) {
      const entry = caseIndexEntry(raw, HASH)!;
      const def = content.cases.get(id)!.def;
      expect(entry.learningOutcomeCount, id).toBe(def.learningOutcomes.length);
      const review = def.provenance.review;
      expect(entry.review, id).toEqual(review ? { status: review.status, reviewedAt: review.reviewedAt ?? null } : null);
      // Outcomes usually name the diagnosis: none of their text reaches the index.
      for (const outcome of def.learningOutcomes) {
        for (const text of typeof outcome === "string" ? [outcome] : Object.values(outcome)) expect(JSON.stringify(entry), id).not.toContain(text.slice(0, 30));
      }
    }
    const raw = {
      id: "meta",
      learningOutcomes: [{ en: "Recognise X", "zh-CN": "识别 X" }, 7, { en: "Treat X" }],
      provenance: { kind: "synthetic", review: { status: "editorial", reviewedAt: "2026-10-28", reviewers: ["R"], guidelines: ["G 2023"], notes: { en: "N" } } },
    };
    expect(caseIndexEntry(raw, HASH)).toMatchObject({ learningOutcomeCount: 2, review: { status: "editorial", reviewedAt: "2026-10-28" } });
    expect(JSON.stringify(caseIndexEntry(raw, HASH))).not.toMatch(/Recognise|G 2023|"N"/);
    // An unknown status is no review; a malformed date is no date.
    expect(caseIndexEntry({ id: "x", provenance: { review: { status: "approved" } } }, HASH)!.review).toBeNull();
    expect(caseIndexEntry({ id: "x", provenance: { review: { status: "unreviewed", reviewedAt: "28/10/2026" } } }, HASH)!.review).toEqual({ status: "unreviewed", reviewedAt: null });
    expect(caseIndexEntry({ id: "x" }, HASH)).toMatchObject({ learningOutcomeCount: 0, review: null });
    // Untrusted entries (a server listing) are clamped the same way.
    expect(normalizeIndexEntry({ id: "x", learningOutcomeCount: 1e9, review: { status: "clinician-reviewed", reviewedAt: "2026-01-02", notes: "x" } })).toMatchObject({
      learningOutcomeCount: 100,
      review: { status: "clinician-reviewed", reviewedAt: "2026-01-02" },
    });
    expect(normalizeIndexEntry({ id: "x", learningOutcomeCount: "6", review: "editorial" })).toMatchObject({ learningOutcomeCount: 0, review: null });
  });

  it("sorts like the shared library order (index entries and full cases alike)", () => {
    const entries = [...raws.values()].map((raw) => caseIndexEntry(raw, HASH)!);
    expect(libraryOrder(entries).map((e) => e.id)).toEqual(libraryOrder(defs).map((c) => c.id));
    const mixed: (CaseIndexEntry | CaseDefinition)[] = [...entries.slice(0, 3), ...defs.slice(3)];
    expect([...mixed].sort(compareLibraryOrder).map((c) => c.id)).toEqual(libraryOrder(defs).map((c) => c.id));
  });
});

describe("capabilityNeeds (facility choice without the full case)", () => {
  it("agrees with caseCapabilityGaps for every built-in case in every built-in facility", () => {
    let checked = 0;
    for (const def of defs) {
      const entry = caseIndexEntry(raws.get(def.id)!, HASH)!;
      for (const f of facilities) {
        const cats = catalogsFor(f);
        const blocked = caseCapabilityGaps(def, f, cats).some((g) => g.blocking);
        expect(canCompleteWith(entry, facilityCapabilities(f, cats)), `${def.id} in ${f.id}`).toBe(!blocked);
        checked++;
      }
    }
    expect(checked).toBe(defs.length * facilities.length);
    // At least one built-in case is blocked somewhere (new-onset T2DM in the V4 clinic), so the check bites.
    const t2dm = raws.get("new-onset-t2dm");
    const clinic = content.facilities.get("clinic-v4")?.def;
    if (t2dm && clinic) expect(canCompleteWith(caseIndexEntry(t2dm, HASH)!, facilityCapabilities(clinic, catalogsFor(clinic)))).toBe(false);
  });

  it("a record review needs no capability, as in core's investigationNeeds (the chart can be read at the bedside)", () => {
    const raw = (performedAt?: string) => ({
      id: "chart-case",
      investigations: [{ id: "chart", requires: ["records"], ...(performedAt ? { performedAt } : {}) }],
      objectives: [{ id: "o", completeWhen: { read: "chart" } }],
    });
    const noRecords = new Set(["oxygen"]);
    expect(canCompleteWith(caseIndexEntry(raw("records"), HASH)!, noRecords)).toBe(true);
    expect(canCompleteWith(caseIndexEntry(raw(), HASH)!, noRecords)).toBe(false);
  });

  it("agrees with caseCapabilityGaps on random conditions, requirements and facilities (incl. empty any, not, unknown items)", () => {
    const base = defs.find((d) => d.exam.length > 2 && d.investigations.length > 2 && d.interventions.length > 2);
    if (!base) return;
    const caps = ["ecg-12lead", "ct", "xray", "ultrasound", "lab", "infusion", "oxygen", "defibrillation", "stethoscope"];
    let seed = 20261019;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const pick = <T>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)]!;
    const leaf = (): Condition => {
      const r = rnd();
      if (r < 0.2) return { examined: pick(base.exam).id };
      if (r < 0.35) return { ordered: pick(base.investigations).id };
      if (r < 0.5) return { read: pick(base.investigations).id };
      if (r < 0.6) return { resultReady: pick(base.investigations).id };
      if (r < 0.75) return { intervened: pick(base.interventions).id };
      if (r < 0.8) return { intervened: "no-such-item" };
      if (r < 0.9) return { asked: pick(base.history).id };
      return { always: true };
    };
    const cond = (depth: number): Condition => {
      const r = rnd();
      if (depth <= 0 || r < 0.35) return leaf();
      if (r < 0.45) return { not: cond(depth - 1) };
      const n = Math.floor(rnd() * 4); // 0 → an empty all/any
      const children = Array.from({ length: n }, () => cond(depth - 1));
      return r < 0.7 ? { all: children } : { any: children };
    };
    const requires = () => (rnd() < 0.4 ? [] : Array.from(new Set(Array.from({ length: 1 + Math.floor(rnd() * 2) }, () => pick(caps)))));
    // Parsing is slow (zod): conditions and requirements are set on a raw copy (for the index) and on a
    // parsed copy (for core) alike — a decision without `requires` defaults to `{always: true}` in core.
    for (let round = 0; round < 300; round++) {
      const raw = structuredClone(raws.get(base.id)!) as Record<string, any>;
      const def = structuredClone(base) as CaseDefinition;
      for (const [key, defKey] of [["exam", "exam"], ["investigations", "investigations"], ["interventions", "interventions"]] as const) {
        raw[key].forEach((item: Record<string, unknown>, i: number) => {
          const req = requires();
          item.requires = req;
          (def[defKey][i] as { requires: string[] }).requires = req;
        });
      }
      def.objectives.forEach((o, i) => {
        o.completeWhen = cond(3);
        raw.objectives[i].completeWhen = o.completeWhen;
      });
      def.decisions.forEach((d, i) => {
        if (rnd() < 0.3) {
          delete raw.decisions[i].requires;
          d.requires = { always: true };
        } else {
          d.requires = cond(3);
          raw.decisions[i].requires = d.requires;
        }
      });
      const entry = caseIndexEntry(raw, HASH)!;
      for (let k = 0; k < 4; k++) {
        const have = caps.filter(() => rnd() < 0.5);
        const facility: FacilityDefinition = { ...facilities[0]!, placements: [{ id: "kit", type: "random-kit", x: 0, y: 0, z: 0, rot: 0, capabilities: have } as never] };
        const blocked = caseCapabilityGaps(def, facility, []).some((g) => g.blocking);
        expect(canCompleteWith(entry, facilityCapabilities(facility, [])), `round ${round}/${k}`).toBe(!blocked);
      }
    }
    // The generated conditions are valid case data.
    expect(parseCase({ ...raws.get(base.id)!, objectives: [{ ...(raws.get(base.id)!.objectives as object[])[0], completeWhen: cond(3) }] }).ok).toBe(true);
  });
});

describe("normalizeIndexEntry (entries from a server are untrusted)", () => {
  it("accepts a builder entry unchanged after a JSON round trip", () => {
    for (const raw of raws.values()) {
      const entry = caseIndexEntry(raw, HASH)!;
      expect(normalizeIndexEntry(JSON.parse(JSON.stringify(entry)))).toEqual(entry);
    }
  });

  it("drops entries without a safe id and sanitises every field", () => {
    expect(normalizeIndexEntry(null)).toBeNull();
    expect(normalizeIndexEntry({ id: "../x" })).toBeNull();
    expect(normalizeIndexEntry({ id: "A".repeat(81) })).toBeNull();
    const deep: unknown[] = [];
    let node: unknown = ["ct"];
    for (let i = 0; i < 40; i++) node = { all: [node] };
    deep.push(node);
    const e = normalizeIndexEntry({
      id: "ok-case",
      title: { en: "<b>", "zh-CN": ["x"] },
      difficulty: 99,
      objectives: -3,
      tags: "a,b",
      contentHash: "zz zz",
      capabilityNeeds: [["ct", 5], { any: [["xray"], "bad"] }, { nope: 1 }, ...deep],
    })!;
    expect(e).toMatchObject({ id: "ok-case", title: { en: "<b>" }, difficulty: 5, objectives: 0, tags: [], contentHash: "" });
    expect(e.capabilityNeeds).toEqual([["ct"], { any: [["xray"]] }]);
  });
});
