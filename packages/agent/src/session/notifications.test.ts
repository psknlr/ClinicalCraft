import type { CaseInput, DomainEvent } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase } from "../__fixtures__/mini-case.js";
import { reactToDomainEvent, scenarioSpeech } from "./notifications.js";

const L = (zh: string, en: string) => ({ "zh-CN": zh, en });

/** The mini case with one scenario event per message. */
function caseWith(messages: Record<string, { "zh-CN": string; en: string }>) {
  return loadMiniCase((x: CaseInput) => {
    x.physiology!.events = Object.entries(messages).map(([id, message], i) => ({ id, atMinute: 10 + i, message, severity: "info" })) as NonNullable<CaseInput["physiology"]>["events"];
  });
}

function staffLine(c: ReturnType<typeof caseWith>, eventId: string, locale: string) {
  const event = { type: "scenario.event", eventId, severity: "info" } as unknown as DomainEvent;
  return reactToDomainEvent(c, event, locale).find((r) => r.staffLine)?.staffLine;
}

describe("scenario announcements (L21)", () => {
  const c = caseWith({
    nurse: L("护士：“到院已经半小时了，电解质您看过了吗？”", "Nurse: \"She's been here half an hour — have you seen her electrolytes?\""),
    named: L("陈护士：两套血培养已送检。", "Nurse Chen: Two sets of blood cultures are off."),
    trailing: L("护士：“血压又冲上去了！”（疑似颅内出血）", "Nurse: \"His pressure has shot up!\" (suspected bleed)"),
    monitor: L("监护：窦性心律，心率已降到100次/分以下。", "Monitor: sinus rhythm, rate now below 100/min."),
    narrative: L("她重新睁开眼睛，能切题对答。", "She opens her eyes and answers appropriately again."),
    attending: L("上级医生：“现在卡在哪一步？”", "Attending: \"What's holding it up?\""),
  });

  it("a line written as nurse speech is spoken by the nurse, without the prefix or the wrapping quotes", () => {
    expect(staffLine(c, "nurse", "zh-CN")).toEqual({ agent: "nurse", speaker: "nurse", text: "到院已经半小时了，电解质您看过了吗？" });
    expect(staffLine(c, "nurse", "en")).toEqual({ agent: "nurse", speaker: "nurse", text: "She's been here half an hour — have you seen her electrolytes?" });
    expect(staffLine(c, "named", "zh-CN")).toEqual({ agent: "nurse", speaker: "nurse", text: "两套血培养已送检。" });
    expect(staffLine(c, "named", "en")).toEqual({ agent: "nurse", speaker: "nurse", text: "Two sets of blood cultures are off." });
    // A quote followed by narration keeps its quotes (the narration is not the nurse's words).
    expect(staffLine(c, "trailing", "zh-CN")).toEqual({ agent: "nurse", speaker: "nurse", text: "“血压又冲上去了！”（疑似颅内出血）" });
  });

  it("monitor lines drop their own 'Monitor:' prefix; narration and other staff are narrated, never 'Monitor'", () => {
    expect(staffLine(c, "monitor", "zh-CN")).toEqual({ agent: "nurse", speaker: "monitor", text: "窦性心律，心率已降到100次/分以下。" });
    expect(staffLine(c, "monitor", "en")).toEqual({ agent: "nurse", speaker: "monitor", text: "sinus rhythm, rate now below 100/min." });
    expect(staffLine(c, "narrative", "en")).toEqual({ agent: "nurse", speaker: "narrator", text: "She opens her eyes and answers appropriately again." });
    expect(staffLine(c, "attending", "zh-CN")?.speaker).toBe("narrator");
    expect(staffLine(c, "attending", "zh-CN")?.text).toBe("上级医生：“现在卡在哪一步？”");
  });

  it("a patient quote is the patient's line; monitor alarms stay at the monitor; an explicit speaker wins", () => {
    const q = caseWith({
      quote: L("李先生说：‘我现在完全好了，能回家吗？’", "Mr Li: 'I feel completely fine now — can I go home?'"),
      full: L("李明：‘好多了。’", "Li Ming: 'Much better.'"),
      alarm: L("监护仪报警！患者突然意识丧失。", "Monitor alarm! The patient suddenly loses consciousness."),
      lab: L("导管室：右冠开通，TIMI 3级血流。", "Cath lab: RCA reopened with TIMI 3 flow."),
      review: L("复诊护士测量的生命体征：血压128/79 mmHg。", "Review-visit vital signs recorded by the nurse: BP 128/79 mmHg."),
    });
    expect(staffLine(q, "quote", "en")).toEqual({ agent: "patient", speaker: "patient", text: "I feel completely fine now — can I go home?" });
    expect(staffLine(q, "quote", "zh-CN")).toEqual({ agent: "patient", speaker: "patient", text: "我现在完全好了，能回家吗？" });
    expect(staffLine(q, "full", "en")).toEqual({ agent: "patient", speaker: "patient", text: "Much better." });
    expect(staffLine(q, "alarm", "zh-CN")).toEqual({ agent: "nurse", speaker: "monitor", text: "监护仪报警！患者突然意识丧失。" });
    expect(staffLine(q, "alarm", "en")?.speaker).toBe("monitor");
    expect(staffLine(q, "lab", "en")).toEqual({ agent: "nurse", speaker: "narrator", text: "Cath lab: RCA reopened with TIMI 3 flow." });
    expect(staffLine(q, "review", "en")?.speaker).toBe("narrator");
    expect(scenarioSpeech("Ms Lin: 'fine'", { patient: ["Lin Xiaolan"] }, "narrator")).toEqual({ speaker: "narrator", text: "Ms Lin: 'fine'" });
    expect(scenarioSpeech("林女士说：‘好了’", { patient: ["林晓岚"] })).toEqual({ speaker: "patient", text: "好了" });
    expect(scenarioSpeech("Wu Fan: 'He looks pale.'", { patient: ["Zhou Yuhang"], companion: ["Wu Fan, his roommate"] })).toEqual({ speaker: "companion", text: "He looks pale." });
  });

  it("the notification keeps the authored text", () => {
    const event = { type: "scenario.event", eventId: "nurse", severity: "info" } as unknown as DomainEvent;
    expect(reactToDomainEvent(c, event, "zh-CN")[0]?.notification?.body).toBe("护士：“到院已经半小时了，电解质您看过了吗？”");
  });
});

describe("critical results are called through by who reports them (J6)", () => {
  const c = loadMiniCase((x: CaseInput) => {
    for (const inv of x.investigations) inv.results = Object.fromEntries(Object.entries(inv.results).map(([k, r]) => [k, { ...r, critical: true }]));
  });
  const lines = (investigationId: string, locale: string) => {
    const event = { type: "result.ready", investigationId, phase: "ed", critical: true } as unknown as DomainEvent;
    const r = reactToDomainEvent(c, event, locale);
    return { line: r.find((x) => x.staffLine)?.staffLine?.text ?? "", body: r.find((x) => x.notification)?.notification?.body ?? "" };
  };

  it("lab results: the lab phoned", () => {
    expect(lines("troponin", "en").line).toContain("the lab just called");
    expect(lines("troponin", "zh-CN").line).toContain("检验科");
  });

  it("imaging: radiology, never the lab", () => {
    for (const locale of ["en", "zh-CN"]) {
      const { line, body } = lines("ct-head", locale);
      expect(line).not.toMatch(/\blab\b|检验科/);
      expect(body).not.toMatch(/\blab\b|检验科/);
    }
    expect(lines("ct-head", "en").line).toContain("radiology");
    expect(lines("ct-head", "zh-CN").line).toContain("放射科");
  });

  it("bedside tests (ECG): a critical finding at the bedside, nobody phoned", () => {
    for (const locale of ["en", "zh-CN"]) {
      const { line, body } = lines("ecg", locale);
      expect(line).not.toMatch(/\blab\b|检验科|phoned|called|电话/);
      expect(body).not.toMatch(/\blab\b|检验科|phoned|电话/);
    }
    expect(lines("ecg", "en").line).toBe("Doctor, the ECG shows a critical finding — please look at it now.");
  });
});
