/**
 * Bedside monitors the learner must attach (`physiology.monitor`) in the
 * built-in acute cases: which cases have one, what attaches it, which triage
 * readings are shown by hand before it, and that no scenario line talks about
 * a monitor that may not be there (docs/CASE_AUTHORING.md §6).
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  conditionRefs,
  parseCase,
  replay,
  t,
  verifyCase,
  vitalsAt,
  type CaseDefinition,
  type ClinicalAction,
  type Condition,
} from "@clinicalcraft/core";

function parseCaseFile(id: string): CaseDefinition | null {
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(new URL(`../cases/${id}/case.json`, import.meta.url), "utf8"));
  } catch {
    return null;
  }
  const r = parseCase(json);
  return r.ok ? r.value : null;
}

function load(id: string): CaseDefinition {
  const c = parseCaseFile(id);
  if (!c) throw new Error(`${id}: not a valid case`);
  return c;
}

/** Case → what attaches its monitor (and its ECG leads, when they come separately) and which triage readings it shows by hand before that. */
const EXPECTED: Record<string, { attachedBy: string[]; ecgBy?: string[]; spotChecks: string[] }> = {
  "acute-ischemic-stroke": { attachedBy: ["intervened:cardiac-monitoring", "intervened:post-lysis-monitoring", "phase:angio"], spotChecks: ["hr", "sbp", "dbp", "rr", "spo2", "temp"] },
  "dka-adult": { attachedBy: ["intervened:cardiac-monitoring"], spotChecks: ["hr", "sbp", "dbp", "rr", "spo2", "temp"] },
  "stemi-inferior-rv": { attachedBy: ["intervened:cardiac-monitoring", "intervened:transfer-cath-lab", "flag:vf-arrest"], spotChecks: ["hr", "sbp", "dbp", "rr", "spo2", "temp"] },
  "septic-shock-cap": { attachedBy: ["intervened:monitor", "intervened:arterial-line"], spotChecks: ["hr", "sbp", "dbp", "rr", "spo2", "temp"] },
  "pulmonary-embolism-postop": { attachedBy: ["intervened:monitoring", "intervened:transfer-hdu"], spotChecks: ["hr", "sbp", "dbp", "rr", "spo2", "temp"] },
  // the nurse's portable readings in the garden: no temperature; her oximeter and cuff go on with `monitoring`,
  // the ECG leads with the team's monitor-defibrillator (called for help) or in the ED
  "anaphylaxis-garden": { attachedBy: ["intervened:monitoring", "intervened:transfer-ed"], ecgBy: ["intervened:call-help", "intervened:transfer-ed"], spotChecks: ["hr", "sbp", "dbp", "rr", "spo2"] },
};

const ALL = readdirSync(new URL("../cases/", import.meta.url)).filter((id) => parseCaseFile(id) !== null);

const leaves = (cond: Condition) =>
  conditionRefs(cond).map((r) => `${r.kind === "intervention" ? "intervened" : r.kind}:${r.id}`);

describe("cases with a monitoring step declare physiology.monitor", () => {
  it("exactly the acute cases whose triage puts the patient off the monitor", () => {
    const monitored = ALL.filter((id) => load(id).physiology?.monitor).sort();
    expect(monitored).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [id, expected] of Object.entries(EXPECTED)) {
    describe(id, () => {
      const c = load(id);
      const monitor = c.physiology!.monitor!;

      it("is attached by the monitoring intervention (and realistic alternatives)", () => {
        expect(leaves(monitor.attachedWhen)).toEqual(expected.attachedBy);
        expect(monitor.ecgWhen ? leaves(monitor.ecgWhen) : undefined).toEqual(expected.ecgBy);
        expect(monitor.spotChecks).toEqual(expected.spotChecks);
      });

      it("shows only the triage readings the triage note records, by hand, before the monitor", () => {
        const snap = vitalsAt(c, replay(c, [{ type: "start" }]).state);
        expect(snap.monitorAttached).toBe(false);
        expect(snap.spotChecks).toEqual(expected.spotChecks);
        expect(snap.vitals.rhythm).toBeUndefined();
        expect(snap.alarms).toEqual([]);
        const note = `${t(c.patient.triageNote ?? "", "en")} ${c.npcs.filter((n) => n.role === "nurse").map((n) => t(n.knowledge, "en")).join(" ")}`;
        for (const vital of expected.spotChecks) {
          const value = c.physiology!.baseline[vital as "hr"];
          expect(note, `${vital} ${value}`).toContain(String(value));
        }
      });

      it("the reference solution attaches it and still verifies", () => {
        const result = verifyCase(c);
        expect(result.ok).toBe(true);
        expect(result.issues.filter((i) => i.path.startsWith("physiology.monitor"))).toEqual([]);
        expect(result.finalState.monitorAttachedAt).toBeTypeOf("number");
      });

      it("no scenario line speaks of the monitor unless it is attached when the line fires", () => {
        // Allowed: the line's `when` requires (in a top-level `all`) a leaf that attaches the monitor, or one
        // ruling the monitor out (the unmonitored variant may say there is none), or the line fires only in a
        // phase entered through such a step; and lines about a monitor that is needed, not read.
        const attaching = new Set([...expected.attachedBy, ...(expected.ecgBy ?? [])]);
        const monitoredPhases: Record<string, string[]> = { "anaphylaxis-garden": ["ed"] };
        const aboutNeed: Record<string, string[]> = { "septic-shock-cap": ["ev-ct-before-abx"] };
        const attaches = (ids: string[]) =>
          ids.length > 0 && ids.every((x) => attaching.has(x) || (x.startsWith("phase:") && (monitoredPhases[id] ?? []).includes(x.slice(6))));
        for (const event of c.physiology!.events) {
          const text = `${t(event.message ?? "", "en")} ${t(event.message ?? "", "zh-CN")}`;
          if (!/monitor|监护/i.test(text) || (aboutNeed[id] ?? []).includes(event.id)) continue;
          const when = event.when;
          const required = when && "all" in when ? when.all : when ? [when] : [];
          const ok = required.some((leaf) => {
            if ("not" in leaf) return attaches("any" in leaf.not ? leaf.not.any.flatMap(leaves) : leaves(leaf.not));
            return attaches("any" in leaf ? leaf.any.flatMap(leaves) : "all" in leaf ? [] : leaves(leaf));
          });
          expect(ok, `${event.id}: ${text}`).toBe(true);
        }
      });
    });
  }
});

describe("monitor-dependent scenario lines branch on the monitor", () => {
  const play = (id: string, actions: ClinicalAction[]) => {
    const c = load(id);
    return replay(c, [{ type: "start" }, ...actions]).state;
  };

  it("DKA: the insulin-before-potassium crash is a monitor alarm only on the monitor", () => {
    const off = play("dka-adult", [{ type: "intervene", interventionId: "friii" }, { type: "advance-time", minutes: 120 }, { type: "intervene", interventionId: "cardiac-monitoring" }]);
    expect(Object.keys(off.firedEvents).filter((e) => e.startsWith("ev-k-crash"))).toEqual(["ev-k-crash-unmonitored"]);
    const on = play("dka-adult", [{ type: "intervene", interventionId: "cardiac-monitoring" }, { type: "intervene", interventionId: "friii" }, { type: "advance-time", minutes: 120 }]);
    expect(Object.keys(on.firedEvents).filter((e) => e.startsWith("ev-k-crash"))).toEqual(["ev-k-crash"]);
    for (const s of [off, on]) expect(s.flags).toContain("k-crash");
  });

  it("anaphylaxis: an IV adrenaline push without ECG leads is felt at the pulse, not read off a screen", () => {
    const bolus: ClinicalAction[] = [{ type: "intervene", interventionId: "adrenaline-iv-bolus" }, { type: "advance-time", minutes: 30 }];
    const unmonitored = ["iv-bolus-arrhythmia-unmonitored", "iv-bolus-ischaemia-unmonitored", "iv-bolus-wears-off-unmonitored"];
    const off = play("anaphylaxis-garden", bolus);
    expect(Object.keys(off.firedEvents).filter((e) => e.startsWith("iv-bolus"))).toEqual(unmonitored);
    // the portable oximeter and cuff show no ectopics or ST segments either
    const oximeter = play("anaphylaxis-garden", [{ type: "intervene", interventionId: "monitoring" }, ...bolus]);
    expect(Object.keys(oximeter.firedEvents).filter((e) => e.startsWith("iv-bolus"))).toEqual(unmonitored);
    const on = play("anaphylaxis-garden", [{ type: "intervene", interventionId: "call-help" }, { type: "intervene", interventionId: "monitoring" }, ...bolus]);
    expect(Object.keys(on.firedEvents).filter((e) => e.startsWith("iv-bolus"))).toEqual(["iv-bolus-arrhythmia", "iv-bolus-ischaemia", "iv-bolus-wears-off"]);
    for (const s of [off, oximeter, on]) expect(s.flags).toEqual(expect.arrayContaining(["iv-adrenaline-harm", "iv-bolus-st-change", "iv-bolus-settled"]));
  });

  it("anaphylaxis: `monitoring` in the garden puts on the oximeter and cuff — live numbers, no rhythm; never a temperature", () => {
    const c = load("anaphylaxis-garden");
    const oximeter = vitalsAt(c, replay(c, [{ type: "start" }, { type: "intervene", interventionId: "monitoring" }]).state);
    expect(oximeter).toMatchObject({ monitorAttached: true, ecgAttached: false });
    expect(Object.keys(oximeter.vitals).sort()).toEqual(["dbp", "gcs", "hr", "map", "rr", "sbp", "spo2"]);
    // the team's monitor-defibrillator brings the ECG; the ED is monitored
    for (const path of [["call-help", "monitoring"], ["adrenaline-im", "transfer-ed"]]) {
      const snap = vitalsAt(c, replay(c, [{ type: "start" }, ...path.map((id): ClinicalAction => ({ type: "intervene", interventionId: id }))]).state);
      expect(snap, path.join(" + ")).toMatchObject({ monitorAttached: true, ecgAttached: true });
      expect(snap.vitals.rhythm).toBe("sinus-tachycardia");
      expect(snap.vitals.temp, "nobody takes a temperature").toBeUndefined();
    }
  });

  it("STEMI: an unmonitored VF arrest puts the defibrillator on — the rhythm is then on the screen", () => {
    const c = load("stemi-inferior-rv");
    const s = replay(c, [{ type: "start" }, { type: "advance-time", minutes: 36 }]).state;
    expect(s.monitorAttachedAt).toBe(35);
    const snap = vitalsAt(c, s);
    expect(snap.vitals.rhythm).toBe("ventricular-fibrillation");
    expect(snap.unmeasurable).toEqual(["hr", "sbp", "dbp", "spo2"]);
    expect(vitalsAt(c, s, 30).monitorAttached).toBe(false);
  });

  it("stroke: atrial fibrillation is not on show before the monitor, the pulse or the ECG", () => {
    const c = load("acute-ischemic-stroke");
    const s = replay(c, [{ type: "start" }, { type: "advance-time", minutes: 10 }]).state;
    expect(JSON.stringify(vitalsAt(c, s))).not.toContain("fibrillation");
    const after = replay(c, [{ type: "start" }, { type: "intervene", interventionId: "cardiac-monitoring" }]).state;
    expect(vitalsAt(c, after).vitals.rhythm).toBe("atrial-fibrillation");
  });
});

describe("texts a learner can meet before the monitor is attached do not read it", () => {
  const en = (x: Parameters<typeof t>[0] | undefined) => t(x ?? "", "en");
  const zh = (x: Parameters<typeof t>[0] | undefined) => t(x ?? "", "zh-CN");
  const intervention = (c: CaseDefinition, id: string) => {
    const found = c.interventions.find((i) => i.id === id);
    if (!found) throw new Error(`${c.id}: no intervention ${id}`);
    return found;
  };
  /** A text may mention the monitor as something to attach, never as a screen to read that may be dark. */
  const conditional = (text: string, zhText: string) => {
    if (/monitor/i.test(text)) expect(text).toMatch(/attach/i);
    if (/监护/.test(zhText)) expect(zhText).toMatch(/连接/);
  };

  it("septic: attaching the monitor names no rhythm — dopamine before it may already have caused AF", () => {
    const c = load("septic-shock-cap");
    const response = intervention(c, "monitor").response;
    expect(en(response)).not.toMatch(/sinus|tachycardia|fibrillation/i);
    expect(zh(response)).not.toMatch(/窦性|心动过速|房颤|心房颤动/);
    const s = replay(c, [{ type: "start" }, { type: "intervene", interventionId: "iv-access" }, { type: "intervene", interventionId: "dopamine" }, { type: "intervene", interventionId: "monitor" }]).state;
    expect(vitalsAt(c, s).vitals.rhythm).toBe("atrial-fibrillation");
  });

  it("septic: the reassessment findings and the vasopressor decision do not send the learner to an unattached monitor", () => {
    const c = load("septic-shock-cap");
    const texts = [
      ...c.exam.filter((e) => e.id === "ex-reassess-perfusion" || e.id === "ex-reassess-perfusion-late").map((e) => e.finding),
      c.decisions.find((d) => d.id === "vasopressor")!.need,
    ];
    expect(texts).toHaveLength(3);
    for (const text of texts) conditional(en(text), zh(text));
  });

  it("oxygen responses claim no SpO₂ reading (septic, PE) — the oximeter may not be on", () => {
    for (const [id, ids] of [["septic-shock-cap", ["o2-nasal", "o2-venturi", "o2-nrb"]], ["pulmonary-embolism-postop", ["o2-nasal", "o2-nrb"]]] as const) {
      const c = load(id);
      for (const o2 of ids) {
        const response = intervention(c, o2).response;
        expect(en(response), `${id} ${o2}`).not.toMatch(/(SpO2|SpO₂|saturation)\s+(quickly\s+)?(rises|reaches)|rises (quickly|into|towards)/i);
        expect(zh(response), `${id} ${o2}`).not.toMatch(/(SpO₂|血氧|饱和度)[^。；]*(升至|升到|上升)/);
      }
    }
  });

  it("PE: the patient's acting notes do not have her watching a monitor that may not be there", () => {
    const notes = load("pulmonary-embolism-postop").patient.persona.actingNotes;
    expect(en(notes)).not.toMatch(/monitor/i);
    expect(zh(notes)).not.toMatch(/监护/);
  });

  it("DKA: the KCl order, the HDU referral and the glucose notes claim no monitor that may not be attached", () => {
    const c = load("dka-adult");
    const kcl = intervention(c, "kcl-replacement").dose;
    expect(en(kcl)).toMatch(/needs continuous ECG monitoring \(attach the monitor\)/);
    expect(zh(kcl)).toMatch(/需持续心电监护（请连接监护）/);
    const hdu = intervention(c, "hdu-referral").response;
    conditional(en(hdu), zh(hdu));
    const notes = JSON.stringify(c.investigations);
    expect(notes).not.toMatch(/bedside monitor|床旁监护仪|监护仪上的当前值/);
    expect(en(c.patient.persona.actingNotes)).not.toMatch(/monitor shows/i);
    expect(zh(c.patient.persona.actingNotes)).not.toMatch(/监护提示/);
  });

  it("stroke: the post-thrombolysis monitoring order (BP every 15 min on the cardiac monitor) attaches the monitor", () => {
    const c = load("acute-ischemic-stroke");
    const s = replay(c, [{ type: "start" }, { type: "intervene", interventionId: "post-lysis-monitoring" }]).state;
    expect(s.monitorAttachedAt).toBe(0);
    expect(vitalsAt(c, s).monitorAttached).toBe(true);
  });
});
