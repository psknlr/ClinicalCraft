/**
 * The remaining windows (map, inventory & crafting, help, atlas, autopilot,
 * source & scope, image viewer placeholder) and the 375 px layout.
 */
import { expect, test } from "@playwright/test";
import { enterCase, freshStart, shot, talkToPatient } from "./helpers.js";

test.use({ locale: "zh-CN" });

test("map, inventory, crafting, help, atlas, autopilot", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await freshStart(page);
  await enterCase(page, "smzl-lung-adeno");

  // map: big map + destinations; picking one sets the beacon/quest destination
  await page.locator("#minimap-btn").click();
  await expect(page.locator('#panel .window[data-panel="map"]')).toBeVisible();
  await expect(page.locator("#bigmap")).toBeVisible();
  await expect(page.locator(".dest-group").first()).toBeVisible();
  await shot(page, "map");
  const dest = page.locator('.dest[data-waypoint="patient"]');
  await dest.click();
  await expect(page.locator("#panel")).toBeHidden();
  await expect(page.locator("#quest-destination")).toContainText("目的地");

  // hotbar 8 → inventory; crafting via the bench panel
  await page.locator('.slot[data-slot="7"]').click();
  await expect(page.locator('#panel .window[data-panel="inventory"]')).toBeVisible();
  await expect(page.locator('.inventory-item[data-block="stone"] strong')).toHaveText("32");
  await shot(page, "inventory");
  await page.evaluate(() => (window as any).__QA__.route("craft"));
  await page.locator("#craft-glass").click();
  await expect(page.locator('.slot[data-slot="5"] .count')).toHaveText("20");
  await expect(page.locator('.slot[data-slot="4"] .count')).toHaveText("28");
  await shot(page, "craft");
  await page.keyboard.press("Escape");

  // help (hotbar 9)
  await page.locator('.slot[data-slot="8"]').click();
  await expect(page.locator('#panel .window[data-panel="help"] .keylist')).toBeVisible();
  await shot(page, "help");
  await page.keyboard.press("Escape");

  // atlas: model not installed in CI → stage + install hint
  await page.evaluate(() => (window as any).__QA__.route("atlas"));
  await expect(page.locator('#panel .window[data-panel="atlas"]')).toBeVisible();
  await expect(page.locator("#atlas-status")).toContainText(/import-v4|解剖|模型/, { timeout: 60_000 });
  await page.waitForTimeout(1500);
  await shot(page, "atlas");
  await page.keyboard.press("Escape");

  // source & scope + original figure placeholder
  await page.locator("#journal-btn").click();
  await page.locator("#source-btn").click();
  await expect(page.locator('#panel .window[data-panel="source"]')).toContainText("DOI");
  await shot(page, "source");
  await page.evaluate(() => {
    const qa = (window as any).__QA__;
    qa.dispatch({ type: "order", investigationId: "abdct" });
    qa.route("report", { investigationId: "abdct", phase: "pre", back: { panel: "journal" } });
  });
  await expect(page.locator(".report-images .image-tile").first()).toBeVisible();
  await page.waitForTimeout(1500);
  await shot(page, "report-figures");
  await page.keyboard.press("Escape");

  // autopilot (offline clinician replays the reference path; approvals still apply)
  await page.locator("#autopilot-btn").click();
  await expect(page.locator('#panel .window[data-panel="autopilot"]')).toBeVisible();
  await page.locator("#autopilot-goal").fill("完成病史采集");
  await page.locator("#autopilot-start").click();
  await expect(page.locator("#autopilot-calls .call").first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2500);
  // approve anything the clinician asks for while we watch
  for (let i = 0; i < 4; i++) {
    if (await page.locator("#approval").isVisible()) await page.locator("#approval-approve").click();
    await page.waitForTimeout(400);
  }
  await shot(page, "autopilot");
  const stop = page.locator("#autopilot-stop");
  if (await stop.isVisible()) await stop.click();
  await expect(page.locator("#autopilot-start")).toBeVisible({ timeout: 60_000 });

  expect(errors).toEqual([]);
});

test.describe("375 px", () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });

  test("intro, HUD and conversation at phone width", async ({ page }) => {
    await freshStart(page);
    await shot(page, "mobile-intro");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
    await page.locator('.case-card[data-case="pediatric-asthma"]').scrollIntoViewIfNeeded();
    await enterCase(page, "pediatric-asthma");
    await expect(page.locator(".touch-controls")).toBeVisible();
    await shot(page, "mobile-hud");
    await talkToPatient(page);
    await shot(page, "mobile-conversation");
  });
});
