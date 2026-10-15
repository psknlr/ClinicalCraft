/**
 * Review round 3 (journeys): /read after an automatic phase change, available:false
 * records keep their authored explanation, "no record" orders, max-dose refusals
 * before the approval gate, neutral alarm wording and cosmetic CLI text.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseCase, type CaseDefinition } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { makeSession, msgsOf } from "./__fixtures__/harness.js";
import type { ApprovalDecision } from "./protocol.js";
import { formatResult } from "./tools/format.js";

function loadCase(id: string): CaseDefinition | null {
  const path = fileURLToPath(new URL(`../../content/cases/${id}/case.json`, import.meta.url));
  if (!existsSync(path)) return null;
  const parsed = parseCase(JSON.parse(readFileSync(path, "utf8")) as unknown);
  return parsed.ok ? parsed.value : null;
}

type T = Awaited<ReturnType<typeof makeSession>>;

async function cmd(t: T, line: string) {
  const events = await t.session.run({ type: "user_message", text: line });
  const out = msgsOf(events, "command_output");
  return { events, text: out.map((o) => o.text).join("\n"), out: out.at(-1) };
}

function approveAll(t: T, decision: ApprovalDecision = "approved"): void {
  t.session.subscribe((e) => {
    if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision });
  });
}

const ana = loadCase("anaphylaxis-garden");
const stroke = loadCase("acute-ischemic-stroke");
const dka = loadCase("dka-adult");
const t2dm = loadCase("new-onset-t2dm");

describe("/read after an automatic phase change", () => {
  it.skipIf(!ana)("reads the order of another phase when the current phase has none, and names the ordered phases otherwise", async () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const t = await makeSession({ caseDef: ana!, settingsPatch: { locale, approvalMode: "bypass" } });
      await cmd(t, "/give adrenaline-im");
      expect(t.session.state.phase).toBe("treated");
      await cmd(t, "/order tryptase-1");
      await cmd(t, "/give transfer-ed");
      expect(t.session.state.phase).toBe("ed-resus");
      await cmd(t, "/wait 95");
      const read = await cmd(t, "/read tryptase-1");
      expect(read.out?.data).toMatchObject({ ok: true });
      expect(t.session.state.seen).toContain("tryptase-1@treated");
      // an explicit phase without an order: the rejection names the phase(s) it was ordered in, with the command
      const wrong = await cmd(t, "/read tryptase-1 ed-resus");
      expect(wrong.text).toContain("/read tryptase-1 treated");
      // /results shows the phase id the command needs
      const results = await cmd(t, "/results");
      expect(results.text).toMatch(/\(treated\)/);
    }
  });
});

describe("available:false records keep their authored explanation", () => {
  it.skipIf(!t2dm)("the retinal referral text is shown with a short notice", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const r = formatResult(t2dm!, "inv-retinal", "initial", locale);
      expect(r.text).toContain(locale === "en" ? "retinal photography is booked for week 6" : "眼底照相室已预约在初诊后第6周");
      expect(r.text).toMatch(locale === "en" ? /No result in this phase/ : /本阶段无结果/);
    }
  });

  it.skipIf(!t2dm)("explanations of tests not performed state no other result's values", () => {
    const ogtt = formatResult(t2dm!, "inv-ogtt", "initial", "en").text;
    expect(ogtt).not.toMatch(/9\.8|8\.6/);
    expect(formatResult(t2dm!, "inv-ogtt", "initial", "zh-CN").text).not.toMatch(/9\.8|8\.6/);
    expect(formatResult(t2dm!, "inv-ctca", "initial", "en").text).not.toMatch(/a normal resting ECG/);
  });
});

describe("an order with no record is not shown as ready", () => {
  it.skipIf(!stroke)("/results and /status say 'no record'", async () => {
    const t = await makeSession({ caseDef: stroke!, settingsPatch: { locale: "en", approvalMode: "bypass" } });
    await cmd(t, "/order dsa-evt");
    await cmd(t, "/wait 60");
    const results = await cmd(t, "/results");
    const row = results.text.split("\n").find((l) => l.includes("dsa-evt"))!;
    expect(row).toMatch(/no record/);
    expect(row).not.toMatch(/ready/);
    const status = await cmd(t, "/status");
    expect(status.text).toMatch(/\[dsa-evt@ed\] no record/);
    const zh = await makeSession({ caseDef: stroke!, settingsPatch: { locale: "zh-CN", approvalMode: "bypass" } });
    await cmd(zh, "/order dsa-evt");
    expect((await cmd(zh, "/results")).text).toMatch(/无记录/);
  });
});

describe("max-dose refusals", () => {
  it.skipIf(!stroke)("are given before the approval gate and name the item", async () => {
    const t = await makeSession({ caseDef: stroke!, settingsPatch: { locale: "en" } });
    approveAll(t);
    await cmd(t, "/give alteplase");
    expect(t.session.state.interventions.filter((r) => r.interventionId === "alteplase")).toHaveLength(1);
    const again = await cmd(t, "/give alteplase");
    expect(msgsOf(again.events, "approval_request")).toEqual([]);
    expect(again.text).toMatch(/maximum number of doses/);
    expect(again.text).toMatch(/Alteplase/i);
  });

  it.skipIf(!dka)("zh: the refusal names the matched item", async () => {
    const t = await makeSession({ caseDef: dka!, settingsPatch: { locale: "zh-CN", approvalMode: "bypass" } });
    await cmd(t, "/give friii");
    const again = await cmd(t, "/give friii");
    const name = dka!.interventions.find((i) => i.id === "friii")!.name as Record<string, string>;
    expect(again.text).toContain("已达到最大给药次数");
    expect(again.text).toContain(name["zh-CN"]!);
  });
});

describe("alarm wording does not claim a monitor", () => {
  it.skipIf(!stroke)("the nurse reports the value without 'the monitor is alarming'", async () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const t = await makeSession({ caseDef: stroke!, settingsPatch: { locale } });
      const events = await t.session.run({ type: "clinical_action", action: { type: "start" } });
      const lines = msgsOf(events, "agent_message").map((m) => m.text);
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) expect(l).not.toMatch(/monitor is alarming|监护仪在报警/);
    }
  });
});

describe("cosmetic text", () => {
  it.skipIf(!stroke)("a locked decision is labelled once ('not yet available', no '(locked)' suffix)", async () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const t = await makeSession({ caseDef: stroke!, settingsPatch: { locale } });
      await t.session.run({ type: "clinical_action", action: { type: "start" } });
      for (const line of ["/board", "/status"]) {
        const { text } = await cmd(t, line);
        expect(text).toMatch(locale === "en" ? /not yet available/ : /尚未开放/);
        expect(text).not.toMatch(/\(locked\)|\(未解锁\)|（未解锁）/);
      }
    }
  });

  it.skipIf(!stroke)("zh offline nurse sentences are punctuated", async () => {
    const t = await makeSession({ caseDef: stroke!, settingsPatch: { locale: "zh-CN" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const events = await t.session.run({ type: "user_message", text: "情况怎么样？", to: "nurse" });
    const reply = msgsOf(events, "agent_message").filter((m) => m.agent === "nurse").at(-1)!.text;
    expect(reply).not.toMatch(/[一-龥A-Za-z0-9]目前还没有开/);
  });
});
