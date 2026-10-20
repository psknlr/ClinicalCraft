/**
 * The bedside monitor a learner must attach (`physiology.monitor`): every
 * runtime surface — /vitals, check_vitals, get_vitals, the nurse, model
 * prompts, alarm notifications and state snapshots — respects it.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createSession as createEngineState, parseCase, reduce, vitalsAt, type CaseDefinition, type CaseInput, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase, makeSession, msgsOf } from "../__fixtures__/harness.js";
import { buildSystemSections } from "../agents/prompts.js";
import { BUILTIN_AGENTS } from "../agents/builtin.js";
import { formatVitals, vitalsText } from "../tools/format.js";

/** The mini case (hr 96, BP 138/84, rr 18, SpO₂ 96 falling 0.5/min, T 36.8) with a monitor to attach. */
const withMonitor = (spotChecks: string[] = ["hr", "sbp", "dbp", "rr", "spo2", "temp"]) => (x: CaseInput) => {
  x.interventions!.push({
    id: "monitor",
    name: { "zh-CN": "连接心电监护", en: "Attach the monitor" },
    kind: "monitoring",
    aliases: { "zh-CN": ["监护"], en: ["monitor"] },
    risk: "none",
    maxDoses: 1,
    response: { "zh-CN": "监护仪已连接。", en: "Monitor attached." },
  });
  x.physiology!.baseline.rhythm = "sinus-tachycardia";
  x.physiology!.baseline.gcs = 15;
  x.physiology!.monitor = { attachedWhen: { intervened: "monitor" }, spotChecks: spotChecks as never };
};

const start = { type: "clinical_action", action: { type: "start" } } as const;
const act = (action: ClinicalAction) => ({ type: "clinical_action", action }) as const;
const TRIAGE_EN = "Triage / first observations, taken by hand (not live): HR 96/min · BP 138/84 mmHg (MAP 102) · RR 18/min · SpO₂ 96% · T 36.8 °C.";

function engine(mutate: (x: CaseInput) => void, actions: ClinicalAction[]) {
  const c = loadMiniCase(mutate);
  let s: SessionState = createEngineState(c);
  for (const a of [{ type: "start" } as ClinicalAction, ...actions]) s = reduce(c, s, a).state;
  return { c, s };
}

describe("formatting a snapshot before the monitor is attached", () => {
  it("says the monitor is not attached, labels the triage readings, shows no rhythm or 'no alarms'", () => {
    const { c, s } = engine(withMonitor(), [{ type: "advance-time", minutes: 10 }]);
    const snap = vitalsAt(c, s);
    const en = vitalsText(snap, "en", "09:10");
    expect(en).toBe(
      ["[09:10] No monitor attached yet — no continuous ECG, blood pressure or SpO₂ readings and no rhythm; attach the monitor to see continuous readings.", TRIAGE_EN, "Bedside observations: GCS 15."].join("\n"),
    );
    expect(en).not.toMatch(/rhythm sinus|alarm/i);
    const zh = vitalsText(snap, "zh-CN");
    expect(zh).toContain("尚未连接监护");
    expect(zh).toContain("分诊/首次手测数值（非实时）：心率 96/min · 血压 138/84 mmHg (MAP 102) · 呼吸 18/min · SpO₂ 96% · 体温 36.8 °C。");
    expect(zh).toContain("床旁观察：GCS 15。");
    expect(zh).not.toMatch(/窦性|心律 /);
    expect(formatVitals(snap, "en")).toBe(`No monitor attached yet — no continuous ECG, blood pressure or SpO₂ readings and no rhythm; attach the monitor to see continuous readings. ${TRIAGE_EN} Bedside observations: GCS 15.`);
  });

  it("without spot checks gives no number at all", () => {
    const { c, s } = engine(withMonitor([]), []);
    const text = vitalsText(vitalsAt(c, s), "en");
    expect(text).not.toMatch(/96|138|36\.8/);
    expect(text).toContain("Bedside observations: GCS 15.");
  });

  it("once attached: live readings, alarms and the rhythm; trend arrows from the attachment on", () => {
    const { c, s } = engine(withMonitor(), [{ type: "advance-time", minutes: 10 }, { type: "intervene", interventionId: "monitor" }]);
    // minute 11: SpO₂ 90.5 → 91, only 0.5 below its reading at attachment (minute 10) — no arrow yet
    expect(vitalsText(vitalsAt(c, s), "en")).toBe("HR 96/min · BP 138/84 mmHg (MAP 102) · RR 18/min · SpO₂ 91% · T 36.8 °C · GCS 15 · rhythm sinus tachycardia\nAlarms: SpO₂ 91% (warning)");
    const text = vitalsText(vitalsAt(c, s, 15), "en");
    expect(text).toContain("SpO₂ 89%↓");
    expect(text).not.toMatch(/taken by hand|No monitor/);
  });
});

describe("a monitor attached without ECG leads (physiology.monitor.ecgWhen)", () => {
  const leadsLater = (x: CaseInput) => {
    withMonitor()(x);
    x.interventions!.push({ id: "ecg-leads", name: { "zh-CN": "接心电导联", en: "Attach the ECG leads" }, kind: "monitoring", risk: "none", maxDoses: 1 } as never);
    x.physiology!.monitor = { ...x.physiology!.monitor!, ecgWhen: { intervened: "ecg-leads" } };
  };
  it("gives the live readings and says there is no rhythm yet; then the rhythm", () => {
    const { c, s } = engine(leadsLater, [{ type: "intervene", interventionId: "monitor" }]);
    const en = vitalsText(vitalsAt(c, s), "en");
    expect(en).toContain("HR 96/min");
    expect(en).toContain("No ECG leads on yet — no rhythm.");
    expect(en).not.toMatch(/sinus/);
    expect(formatVitals(vitalsAt(c, s), "en")).toContain("No ECG leads on yet — no rhythm.");
    expect(vitalsText(vitalsAt(c, s), "zh-CN")).toContain("尚未接心电导联——看不到心律。");
    const { c: c2, s: s2 } = engine(leadsLater, [{ type: "intervene", interventionId: "monitor" }, { type: "intervene", interventionId: "ecg-leads" }]);
    const on = vitalsText(vitalsAt(c2, s2), "en");
    expect(on).toContain("rhythm sinus tachycardia");
    expect(on).not.toContain("No ECG leads");
  });

  it("the offline nurse gives the readings but no rhythm while the leads are off", async () => {
    const t = await makeSession({ caseDef: loadMiniCase(leadsLater) });
    await t.session.run(start);
    await t.session.run(act({ type: "intervene", interventionId: "monitor" }));
    const reply = msgsOf(await t.session.run({ type: "user_message", text: "What are his vitals?", to: "nurse" }), "agent_message").find((m) => m.agent === "nurse")!.text;
    expect(reply).toMatch(/^Latest observations: HR 96\/min/);
    expect(reply).toContain("The ECG leads aren't on yet, so I can't tell you the rhythm.");
    expect(reply).not.toMatch(/sinus|\.\./);
  });
});

describe("a session before the monitor is attached", () => {
  it("/vitals says so; attaching the monitor shows live readings", async () => {
    const t = await makeSession({ caseDef: loadMiniCase(withMonitor()) });
    await t.session.run(start);
    const before = msgsOf(await t.session.run({ type: "slash_command", name: "vitals", args: "" }), "command_output")[0]!.text;
    expect(before).toContain("No monitor attached yet");
    expect(before).toContain(TRIAGE_EN);
    expect(before).not.toMatch(/sinus|No active alarms/);
    await t.session.run(act({ type: "intervene", interventionId: "monitor" }));
    const after = msgsOf(await t.session.run({ type: "slash_command", name: "vitals", args: "" }), "command_output")[0]!.text;
    expect(after).toContain("rhythm sinus tachycardia");
    expect(after).not.toContain("No monitor attached yet");
  });

  it("raises no alarm notification or nurse alarm line until the monitor is on, then alarms on attachment", async () => {
    const t = await makeSession({ caseDef: loadMiniCase(withMonitor()) });
    await t.session.run(start);
    const waited = await t.session.run(act({ type: "advance-time", minutes: 10 })); // SpO₂ 91 — no monitor to alarm
    expect(msgsOf(waited, "notification").filter((n) => n.title === "Vital-sign alert")).toEqual([]);
    expect(msgsOf(waited, "agent_message").filter((m) => m.agent === "nurse")).toEqual([]);
    expect(msgsOf(waited, "state_snapshot").at(-1)!.vitals).toMatchObject({ monitorAttached: false, spotChecks: ["hr", "sbp", "dbp", "rr", "spo2", "temp"] });
    expect(msgsOf(waited, "state_snapshot").at(-1)!.vitals.vitals.spo2).toBe(96);

    const attached = await t.session.run(act({ type: "intervene", interventionId: "monitor" }));
    expect(msgsOf(attached, "notification").filter((n) => n.title === "Vital-sign alert").map((n) => n.body)).toEqual(["SpO₂ 91% (warning)"]);
    expect(msgsOf(attached, "agent_message").find((m) => m.agent === "nurse")?.text).toBe("Doctor, SpO₂ is 91%.");
    const snap = msgsOf(attached, "state_snapshot").at(-1)!;
    expect(snap.vitals.monitorAttached).toBe(true);
    expect(snap.state.monitorAttachedAt).toBe(10);
    expect(snap.vitals.vitals.rhythm).toBe("sinus-tachycardia");
  });

  it("the offline nurse says the monitor is not on, gives the readings taken by hand and offers to attach it", async () => {
    const t = await makeSession({ caseDef: loadMiniCase(withMonitor()) });
    await t.session.run(start);
    const reply = msgsOf(await t.session.run({ type: "user_message", text: "What are his vitals?", to: "nurse" }), "agent_message").find((m) => m.agent === "nurse")!.text;
    expect(reply).toContain("We haven't put the monitor on yet, so I have no continuous readings — just say and I'll attach it.");
    expect(reply).toContain("What we measured by hand at the start: HR 96/min · BP 138/84 mmHg (MAP 102) · RR 18/min · SpO₂ 96% · T 36.8 °C.");
    expect(reply).toContain("My observations now: GCS 15.");
    expect(reply).not.toMatch(/sinus|rhythm/);

    const zh = await makeSession({ caseDef: loadMiniCase(withMonitor()), settingsPatch: { locale: "zh-CN" } });
    await zh.session.run(start);
    const zhReply = msgsOf(await zh.session.run({ type: "user_message", text: "生命体征怎么样？", to: "nurse" }), "agent_message").find((m) => m.agent === "nurse")!.text;
    expect(zhReply).toContain("还没接上监护仪");
    expect(zhReply).toContain("一开始手测的数值：心率 96/min");
    expect(zhReply).not.toContain("心律");
  });

  it("model-backed nurse, attending and clinician prompts carry the same monitor section", () => {
    const { c, s } = engine(withMonitor(), []);
    for (const name of ["nurse", "attending", "clinician"]) {
      const profile = BUILTIN_AGENTS.find((a) => a.name === name)!;
      const sections = buildSystemSections(profile, { caseDef: c, state: s, locale: "en" } as Parameters<typeof buildSystemSections>[1]);
      const monitor = sections.find((x) => x.id === "monitor")!.text;
      expect(monitor).toContain("No monitor attached yet");
      expect(monitor).not.toMatch(/sinus/);
    }
    const nurse = BUILTIN_AGENTS.find((a) => a.name === "nurse")!;
    expect(nurse.prompt).toMatch(/not on the monitor yet/);
  });
});

function loadCase(id: string): CaseDefinition | null {
  const path = fileURLToPath(new URL(`../../../content/cases/${id}/case.json`, import.meta.url));
  if (!existsSync(path)) return null;
  const parsed = parseCase(JSON.parse(readFileSync(path, "utf8")) as unknown);
  return parsed.ok ? parsed.value : null;
}

describe("a read glucose before the monitor is attached (DKA)", () => {
  const dka = loadCase("dka-adult");
  it.skipIf(!dka)("is shown with the bedside observations, called through as a critical result — never as a monitor alarm", async () => {
    const t = await makeSession({ caseDef: dka!, settingsPatch: { approvalMode: "bypass" } });
    await t.session.run(start);
    await t.session.run(act({ type: "order", investigationId: "poc-glucose" }));
    const events = [...(await t.session.run(act({ type: "advance-time", minutes: 5 }))), ...(await t.session.run(act({ type: "read", investigationId: "poc-glucose" })))];
    expect(t.session.state.monitorAttachedAt).toBeUndefined();
    expect(msgsOf(events, "clinical_event").filter((e) => e.event.type === "vitals.alarm")).toEqual([]);
    expect(msgsOf(events, "notification").filter((n) => n.title === "Vital-sign alert")).toEqual([]);
    expect(msgsOf(events, "agent_message").map((m) => m.text).join(" ")).not.toMatch(/Doctor, Glucose is/);
    const text = vitalsText(vitalsAt(dka!, t.session.state), "en");
    expect(text).toMatch(/Bedside observations: .*Glucose 2\d(\.\d)? mmol\/L/);
    expect(text).not.toMatch(/Alarms?:/);
    // On the monitor the read glucose alarms with the monitored vitals.
    const attached = await t.session.run(act({ type: "intervene", interventionId: "cardiac-monitoring" }));
    expect(msgsOf(attached, "clinical_event").some((e) => e.event.type === "vitals.alarm" && e.event.vital === "glucose")).toBe(true);
  });
});
