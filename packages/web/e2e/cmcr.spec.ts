import { expect, test } from "@playwright/test";
import { enterCase, freshStart, shot } from "./helpers.js";

test.use({ locale: "zh-CN", reducedMotion: "reduce" });

test("CMCR collection lists 20 cases, loads a case, and keeps the original paper for review", async ({ page }) => {
  // This checks content/UI; low quality avoids expensive shadow rendering on software GPUs.
  await page.addInitScript(() => localStorage.setItem("clinicalcraft-v5-settings", JSON.stringify({ version: 1, ui: { quality: "low", locale: "zh-CN" } })));
  await freshStart(page);
  await page.locator("#filter-collection").selectOption("cmcr-20");
  await expect(page.locator(".case-card")).toHaveCount(20);
  await expect(page.locator("#case-list")).not.toContainText("急性心肌梗死");
  await shot(page, "cmcr-library");
  await page.locator('.case-card[data-case="cmcr-1551890"]').click();
  await expect(page.locator("#case-load-status")).toHaveAttribute("data-status", "ready");
  await enterCase(page, "cmcr-1551890");
  await page.evaluate(() => (window as any).__QA__.app.open("journal"));
  await expect(page.locator("#download-paper")).toBeDisabled();
  await page.locator("#source-btn").click();
  await expect(page.locator('#panel .window[data-panel="source"]')).toContainText("将在完成病例后开放");
  await expect(page.locator('#panel .window[data-panel="source"]')).not.toContainText("室間隔破裂");
  await shot(page, "cmcr-source-locked");
  await page.evaluate(() => {
    const qa = (window as any).__QA__;
    for (const action of qa.game.caseDef.solution) qa.dispatch(action);
  });
  await expect.poll(() => page.evaluate(() => (window as any).__QA__.store.snapshot.state.finished)).toBe(true);
  await page.evaluate(() => (window as any).__QA__.route("source"));
  await expect(page.locator('#panel .window[data-panel="source"]')).toContainText("DOI");
  await expect(page.locator('#panel .window[data-panel="source"]')).toContainText("室間隔破裂");
  await expect(page.locator(".asset-status")).toHaveCount(4);
});
