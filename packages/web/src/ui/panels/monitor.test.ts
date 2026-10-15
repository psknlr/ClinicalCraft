/**
 * The bedside monitor panel before the case's monitor is attached: which
 * intervention its "Attach the monitor" button gives, and how the triage
 * readings taken by hand are listed; the voxel patient still looks critically
 * ill when nobody has attached a monitor.
 */
import { replay, vitalsAt, type CaseDefinition, type ClinicalAction } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadContent } from "../../app/content.js";
import { inExtremis } from "../../app/world-bridge.js";
import { setLocale } from "../../i18n/index.js";
import { monitorIntervention, spotCheckText } from "./monitor.js";

const getCase = (id: string): CaseDefinition => {
  const c = loadContent().getCase(id);
  if (!c) throw new Error(`${id} missing`);
  return c;
};
const play = (c: CaseDefinition, actions: ClinicalAction[] = []) => replay(c, [{ type: "start" }, ...actions]).state;

describe("monitor panel helpers", () => {
  it("offers the case's own monitoring intervention, never another kind named in attachedWhen", () => {
    expect(monitorIntervention(getCase("acute-ischemic-stroke"))?.id).toBe("cardiac-monitoring");
    expect(monitorIntervention(getCase("septic-shock-cap"))?.id).toBe("monitor");
    expect(monitorIntervention(getCase("anaphylaxis-garden"))?.id).toBe("monitoring"); // not transfer-ed
    expect(monitorIntervention(getCase("stemi-inferior-rv"))?.id).toBe("cardiac-monitoring"); // not the cath-lab transfer
    expect(monitorIntervention(getCase("pediatric-asthma"))).toBeNull(); // monitored from the start
  });

  it("with several monitoring interventions in attachedWhen, offers the first (condition order)", () => {
    const stroke = getCase("acute-ischemic-stroke");
    const leaf = (id: string) => ({ intervened: id });
    const twoLeaves = (first: string, second: string): CaseDefinition => ({
      ...stroke,
      physiology: { ...stroke.physiology!, monitor: { ...stroke.physiology!.monitor!, attachedWhen: { any: [leaf(first), { phase: "angio" }, leaf(second)] } } },
    });
    expect(monitorIntervention(twoLeaves("cardiac-monitoring", "post-lysis-monitoring"))?.id).toBe("cardiac-monitoring");
    expect(monitorIntervention(twoLeaves("post-lysis-monitoring", "cardiac-monitoring"))?.id).toBe("post-lysis-monitoring");
  });

  it("lists the triage readings taken by hand, with the blood pressure as a pair", () => {
    const c = getCase("acute-ischemic-stroke");
    const snap = vitalsAt(c, play(c));
    setLocale("en");
    expect(spotCheckText(snap)).toBe("HR 96/min · BP 192/104 mmHg · RR 18/min · SpO₂ 96% · Temp 36.8 °C");
    setLocale("zh-CN");
    expect(spotCheckText(snap)).toBe("心率 96/min · 血压 192/104 mmHg · 呼吸 18/min · 血氧 96% · 体温 36.8 °C");
    const ana = getCase("anaphylaxis-garden");
    setLocale("en");
    expect(spotCheckText(vitalsAt(ana, play(ana)))).toBe("HR 128/min · BP 78/44 mmHg · RR 26/min · SpO₂ 92%");
    expect(spotCheckText(vitalsAt(ana, play(ana, [{ type: "intervene", interventionId: "monitoring" }])))).toBe("");
  });
});

describe("the voxel patient's distress", () => {
  it("follows the patient, not the monitor: critically ill before any monitor is attached", () => {
    const ana = getCase("anaphylaxis-garden");
    const s = play(ana);
    expect(vitalsAt(ana, s).alarms).toEqual([]); // no monitor, no alarm
    expect(inExtremis(ana, s)).toBe(true); // BP 78/44: it shows
    const stroke = getCase("acute-ischemic-stroke");
    expect(inExtremis(stroke, play(stroke))).toBe(false);
  });
});
