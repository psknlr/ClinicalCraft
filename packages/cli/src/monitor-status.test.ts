/**
 * The REPL status line respects the bedside monitor (`physiology.monitor`):
 * before it is attached it says so and shows only the triage readings taken
 * by hand — no live number, no rhythm; once attached, the live vitals; in an
 * arrest, "---" for what the monitor cannot read (never a placeholder 0).
 */
import { describe, expect, it } from "vitest";
import { loadContent } from "@clinicalcraft/agent/node";
import { progress, replay, vitalsAt, type CaseDefinition, type ClinicalAction } from "@clinicalcraft/core";
import { createPalette } from "./ansi.js";
import { EventRenderer } from "./render.js";

const content = await loadContent();
const stroke = content.cases.get("acute-ischemic-stroke")?.def;
const stemi = content.cases.get("stemi-inferior-rv")?.def;

function status(c: CaseDefinition, actions: ClinicalAction[], locale = "en"): string {
  const renderer = new EventRenderer({ out: { write: () => true }, palette: createPalette(false), caseDef: c, locale: () => locale, interactive: false });
  const { state } = replay(c, [{ type: "start" }, ...actions]);
  renderer.snapshot = { state, progress: progress(c, state), vitals: vitalsAt(c, state), waypoint: null };
  return renderer.statusLine();
}

describe("status line and the bedside monitor", () => {
  it.skipIf(!stroke)("before the monitor: 'no monitor' and the triage readings, labelled; then the live values", () => {
    const off = status(stroke!, []);
    expect(off).toContain("no monitor · triage HR 96 BP 192/104 SpO₂ 96% RR 18 T 36.8");
    expect(status(stroke!, [], "zh-CN")).toContain("未接监护 · 分诊手测 HR 96 BP 192/104");
    const on = status(stroke!, [{ type: "intervene", interventionId: "cardiac-monitoring" }]);
    expect(on).not.toContain("no monitor");
    expect(on).toMatch(/HR \d+ BP \d+\/\d+ SpO₂ \d+% RR \d+ T 36\.\d/);
  });

  it.skipIf(!stemi)("in an arrest: '---' for what the monitor cannot read, never 0", () => {
    const line = status(stemi!, [{ type: "intervene", interventionId: "cardiac-monitoring" }, { type: "advance-time", minutes: 36 }]);
    expect(line).toContain("HR --- BP --- SpO₂ ---");
    expect(line).not.toMatch(/HR 0|BP 0\/0|SpO₂ 0%/);
  });
});

describe("alarm lines and the bedside monitor", () => {
  it.skipIf(!stemi)("VF attaching the monitor: the arrest's placeholder zeros are never printed as alarm readings", () => {
    for (const [locale, noReading] of [["en", "no reading"], ["zh-CN", "测不出"]] as const) {
      let out = "";
      const renderer = new EventRenderer({ out: { write: (s: string) => ((out += s), true) }, palette: createPalette(false), caseDef: stemi!, locale: () => locale, interactive: false });
      const { events } = replay(stemi!, [{ type: "start" }, { type: "advance-time", minutes: 34 }, { type: "advance-time", minutes: 2 }]);
      expect(events.some((e) => e.type === "vitals.alarm" && e.vital === "spo2")).toBe(true);
      let seq = 0;
      for (const event of events) renderer.handle({ id: "s", seq: ++seq, msg: { type: "clinical_event", event } } as Parameters<EventRenderer["handle"]>[0]);
      expect(out).not.toMatch(/\b0 mmHg|SpO₂ 0%|(HR|心率) 0\/min/); // RR 0 is a reading: apnoea
      expect(out).toContain(noReading);
    }
  });
});
