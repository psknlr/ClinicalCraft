/**
 * A bedside monitor the learner must bring and attach (zh-CN, anaphylaxis in
 * the garden — there is no monitor out there): the vitals strip says so and
 * shows only the nurse's portable readings, taken by hand (no temperature:
 * nobody took one); /vitals at her side agrees (observations by hand: within
 * contact range, EMBODIED §6); the monitor panel is dark, without NIBP. The
 * learner wheels a monitor-defibrillator from the hospital to the bench (the
 * case's monitoring needs a cardiac monitor at the bedside, G6) and attaches
 * it from the panel: the live values and alarms of its oximeter and cuff — no
 * temperature, and no rhythm until the emergency team puts the ECG leads on.
 */
import { expect, test } from "@playwright/test";
import { dispatch, enterCase, fetchToPatient, freshStart, shot, talkToPatient } from "./helpers.js";

test.use({ locale: "zh-CN" });

test("anaphylaxis in the garden (zh): no monitor numbers until the monitor is attached", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await freshStart(page);
  await enterCase(page, "anaphylaxis-garden");

  const strip = page.locator("#vitals-strip");
  await expect(strip).toBeVisible();
  await expect(strip).toHaveClass(/off-monitor/);
  await expect(strip).toHaveAttribute("title", /未连接监护/);
  await expect(strip.locator('[data-vital="monitor"]')).toHaveText(/未接监护\s*分诊手测/);
  await expect(strip.locator('[data-vital="bp"] b')).toHaveText("78/44");
  await expect(strip.locator('[data-vital="hr"] b')).toHaveText("128");
  await expect(strip.locator('[data-vital="temp"]')).toHaveCount(0);
  await expect(strip.locator(".alarm-critical, .alarm-warning")).toHaveCount(0);

  // /vitals in the conversation, at her side: not attached, the readings taken by hand, no rhythm.
  await talkToPatient(page, { atSide: true });
  await page.locator(".chat-input").fill("/vitals");
  await page.locator(".chat-input").press("Enter");
  const out = page.locator(".chat-log .msg.system.tone-command").last();
  await expect(out).toContainText("尚未连接监护");
  await expect(out).toContainText("分诊/首次手测数值（非实时）：心率 128/min · 血压 78/44 mmHg");
  await expect(out).not.toContainText("窦性");
  await page.keyboard.press("Escape");
  await expect(page.locator("#panel")).toBeHidden();

  // The monitor panel: a dark screen, no NIBP; attach the monitor from it.
  await page.locator("#world").focus();
  await page.keyboard.press("KeyV");
  await expect(page.locator('#panel .window[data-panel="monitor"]')).toBeVisible();
  await expect(page.locator("#monitor-off")).toContainText("还没有人给患者连接监护仪");
  await expect(page.locator("#monitor-spot-checks")).toContainText("血压 78/44 mmHg");
  await expect(page.locator("#nibp-cycle")).toBeDisabled();
  await page.waitForTimeout(400);
  await shot(page, "zh-monitor-off");
  await page.keyboard.press("Escape");
  // No monitor in the garden: wheel the nearest monitor-defibrillator over from the hospital, then attach it.
  const defibrillator = await fetchToPatient(page, "cardiac-monitor");
  expect(await page.evaluate((id) => (window as any).__QA__.worldModel.atBedside(id), defibrillator)).toBe(true);
  await page.locator("#world").focus();
  await page.keyboard.press("KeyV");
  await expect(page.locator('#panel .window[data-panel="monitor"]')).toBeVisible();
  await page.locator("#monitor-attach").click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__QA__.session.state.interventions.map((i: any) => i.interventionId)))
    .toContain("monitoring");
  await expect(page.locator("#monitor-off")).toHaveCount(0);
  await expect(page.locator(".alarm-list .alarm").first()).toBeVisible();
  await expect(page.locator("#nibp-cycle")).toBeEnabled();
  await page.waitForTimeout(400);
  await shot(page, "zh-monitor-on");
  await page.keyboard.press("Escape");

  // Live values now from the monitor's oximeter and cuff — still no temperature (nothing measures one) and
  // no rhythm: the ECG leads go on when the emergency team arrives, which nobody has called yet.
  await expect(strip).not.toHaveClass(/off-monitor/);
  await expect(strip.locator('[data-vital="monitor"]')).toHaveCount(0);
  await expect(strip.locator('[data-vital="temp"]')).toHaveCount(0);
  const vitals = () => page.evaluate(() => (window as any).__QA__.store.snapshot.vitals);
  expect(await vitals()).toMatchObject({ monitorAttached: true, ecgAttached: false });
  expect((await vitals()).vitals.rhythm).toBeUndefined();
  // Calling for help brings the team, who put the ECG leads on: now the rhythm is on the screen.
  await dispatch(page, [{ type: "intervene", interventionId: "call-help" }]);
  await expect.poll(async () => (await vitals()).vitals.rhythm).toBe("sinus-tachycardia");
  expect((await vitals()).ecgAttached).toBe(true);
  await expect(strip.locator('[data-vital="temp"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
