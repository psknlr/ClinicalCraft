/**
 * English run of an acute simulated case (inferior STEMI with RV
 * involvement): vitals strip and bedside monitor (V) before and after the
 * monitor is attached, examination, an approval
 * dialog for a high-risk intervention (default focus "Deny"), settings
 * language switch, and save → reload → continue.
 */
import { expect, test } from "@playwright/test";
import { enterCase, freshStart, placeAvatar, shot, talkToPatient } from "./helpers.js";

test.use({ locale: "en-US" });

const CASE = "stemi-inferior-rv";

test("STEMI (en): vitals, monitor, approval, settings, save/continue", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await freshStart(page);
  await expect(page.locator("#lang-toggle")).toHaveText("中文");
  await expect(page.locator("#intro-llm")).toContainText("Offline");
  await page.locator(`.case-card[data-case="${CASE}"]`).click();
  await expect(page.locator("#facility-select")).toHaveValue("general-hospital");
  // clinic-v4 is only offered for outpatient cases
  await expect(page.locator('#facility-select option[value="clinic-v4"]')).toHaveCount(0);
  await shot(page, "en-intro");

  await enterCase(page, CASE);
  // Not on the monitor at triage: the strip says so and shows the triage readings taken by hand.
  const strip = page.locator("#vitals-strip");
  await expect(strip).toBeVisible();
  await expect(strip).toHaveClass(/off-monitor/);
  await expect(strip.locator('[data-vital="monitor"]')).toHaveText(/NO MONITOR\s*TRIAGE/);
  await expect(strip.locator('[data-vital="hr"]')).toHaveClass(/manual/);
  await expect(strip.locator('[data-vital="hr"] b')).toHaveText("54");
  await expect(strip.locator('[data-vital="bp"] b')).toHaveText("98/62");
  await expect(strip.locator(".trend")).toHaveCount(0);
  await expect(page.locator("#sim-clock")).toBeVisible();
  await shot(page, "en-hud-monitor-off");

  // Embodied mode (the default): the monitor's buttons are operations of the device in the world, so the
  // learner stands at the bedside — between the bed and its monitor (cuff and screen within reach).
  await placeAvatar(page, 30.1, -18.75, { x: 31, z: -17.3 });
  // V opens the bedside monitor: dark until attached; no rhythm, no NIBP, the triage readings listed.
  await page.locator("#world").focus();
  await page.keyboard.press("KeyV");
  await expect(page.locator('#panel .window[data-panel="monitor"]')).toBeVisible();
  await expect(page.locator(".monitor-canvas")).toBeVisible();
  await expect(page.locator("#monitor-off")).toContainText("no ECG, rhythm, NIBP or SpO₂");
  await expect(page.locator("#monitor-spot-checks")).toContainText("HR 54/min · BP 98/62 mmHg");
  await expect(page.locator("#nibp-cycle")).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__QA__.store.snapshot.vitals.vitals.rhythm)).toBeUndefined();
  await page.waitForTimeout(500);
  await shot(page, "en-monitor-off");
  // Attach it from the panel (the case's monitoring intervention, recorded like any treatment).
  await page.locator("#monitor-attach").click();
  await expect.poll(() => page.evaluate(() => typeof (window as any).__QA__.session.state.monitorAttachedAt)).toBe("number");
  expect(await page.evaluate(() => (window as any).__QA__.session.state.interventions.map((i: any) => i.interventionId))).toEqual(["cardiac-monitoring"]);
  await expect(page.locator("#monitor-off")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).__QA__.store.snapshot.vitals.vitals.rhythm)).toBe("sinus-bradycardia");
  await expect(page.locator("#nibp-cycle")).toBeEnabled();
  await page.waitForTimeout(800);
  await shot(page, "en-monitor");
  await page.locator("#nibp-cycle").click();
  await expect(page.locator(".nibp .small")).toContainText("NIBP", { timeout: 10_000 });
  await page.keyboard.press("Escape");
  await expect(page.locator("#panel")).toBeHidden();
  // Live values now: no "no monitor" chip, nothing marked as taken by hand.
  await expect(strip).not.toHaveClass(/off-monitor/);
  await expect(strip.locator('[data-vital="monitor"]')).toHaveCount(0);
  await expect(strip.locator(".vital.manual")).toHaveCount(0);
  await expect(strip.locator('[data-vital="hr"] b')).not.toBeEmpty();
  await shot(page, "en-hud");

  // talk + examine
  await talkToPatient(page);
  await page.locator(".suggestions .question[data-item]").first().click();
  await expect(page.locator(".chat-log .msg.agent").first()).toBeVisible();
  await page.locator("#tab-exam").click();
  await page.locator("[data-finding]:not([disabled])").first().click();
  await expect(page.locator(".exam-row.done .finding").first()).not.toBeEmpty();
  await shot(page, "en-examine");

  // high-risk intervention → approval dialog, default focus on Deny
  await page.locator("#tab-treat").click();
  const lysis = page.locator('[data-intervention="tenecteplase"]');
  await expect(lysis).toBeEnabled();
  await shot(page, "en-treat");
  await lysis.click();
  const dialog = page.locator("#approval");
  await expect(dialog).toBeVisible();
  await expect(page.locator(".approval-window.high")).toBeVisible();
  await expect(page.locator("#approval-session")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("approval-deny");
  await shot(page, "en-approval");
  await page.locator("#approval-reason").fill("No fibrinolysis: primary PCI available");
  await page.locator("#approval-deny").click();
  await expect(dialog).toBeHidden();
  const given = await page.evaluate(() => (window as any).__QA__.session.state.interventions.some((i: any) => i.interventionId === "tenecteplase"));
  expect(given).toBe(false);
  // a moderate-risk one can be approved for the session
  await page.locator('[data-intervention="nitroglycerin"]').click();
  await expect(dialog).toBeVisible();
  await expect(page.locator("#approval-session")).toBeVisible();
  await page.locator("#approval-approve").click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as any).__QA__.session.state.interventions.some((i: any) => i.interventionId === "nitroglycerin"))).toBe(true);
  await page.keyboard.press("Escape");

  // settings: switch the language to Chinese and back
  await page.evaluate(() => (window as any).__QA__.route("pause"));
  await expect(page.locator("#panel-title")).toHaveText("Paused");
  await shot(page, "en-settings");
  await page.locator('[data-locale="zh-CN"]').click();
  await expect(page.locator("#panel-title")).toHaveText("探索暂停");
  await expect(page.locator("#journal-btn")).toContainText("档案");
  await shot(page, "settings-zh");
  await page.locator('[data-locale="en"]').click();
  await expect(page.locator("#panel-title")).toHaveText("Paused");
  await page.locator("#resume").click();
  await expect(page.locator("#panel")).toBeHidden();

  // save → reload → continue restores progress
  const before = await page.evaluate(() => {
    const qa = (window as any).__QA__;
    qa.save();
    const s = qa.session.state;
    return { asked: s.asked.length, examined: s.examined.length, interventions: s.interventions.length, clock: s.clock };
  });
  expect(before.asked).toBeGreaterThan(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#enter")).toBeEnabled({ timeout: 180_000 });
  await expect(page.locator(`.case-card[data-case="${CASE}"] .saved`)).toBeVisible();
  await expect(page.locator("#enter")).toContainText("Continue");
  await shot(page, "en-continue");
  await page.locator("#enter").click();
  await page.waitForFunction(() => (window as any).__QA__?.game?.entered === true, null, { timeout: 180_000 });
  const after = await page.evaluate(() => {
    const s = (window as any).__QA__.session.state;
    return { asked: s.asked.length, examined: s.examined.length, interventions: s.interventions.length, clock: s.clock };
  });
  expect(after.asked).toBe(before.asked);
  expect(after.examined).toBe(before.examined);
  expect(after.interventions).toBe(before.interventions);
  expect(after.clock).toBeGreaterThanOrEqual(before.clock);
  await talkToPatient(page);
  await expect(page.locator(".chat-log .msg.agent").first()).toBeVisible();
  await shot(page, "en-resumed-conversation");

  expect(errors).toEqual([]);
});

test("settings panel from the intro switches the UI language", async ({ page }) => {
  await freshStart(page);
  await page.locator("#intro-llm").click();
  await expect(page.locator('#panel .window[data-panel="pause"]')).toBeVisible();
  await expect(page.locator("#llm-mode-offline")).toBeChecked();
  await page.locator("#llm-mode-direct").check();
  await expect(page.locator("#direct-provider")).toBeVisible();
  await expect(page.locator("#direct-key")).toHaveAttribute("type", "password");
  await page.locator("#direct-key-toggle").click();
  await expect(page.locator("#direct-key")).toHaveAttribute("type", "text");
  await page.locator("#direct-remember").check();
  await expect(page.locator(".setting.remember .bad-text")).toBeVisible();
  await shot(page, "en-settings-llm");
  await page.locator("#direct-remember").uncheck();
  await page.locator("#llm-mode-offline").check();
  await page.locator('[data-locale="zh-CN"]').click();
  await expect(page.locator("#panel-title")).toContainText("设置");
  await page.keyboard.press("Escape");
  await expect(page.locator("#intro h2").first()).toHaveText("临床方块世界");
  await expect(page.locator("#lang-toggle")).toHaveText("EN");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("clinicalcraft-v5-settings") ?? "{}"));
  expect(stored.ui.locale).toBe("zh-CN");
  expect(stored.llm.mode).toBe("offline");
  expect(JSON.stringify(stored)).not.toMatch(/sk-/);
});
