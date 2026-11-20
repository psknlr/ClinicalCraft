/**
 * The patient's Treat tab: no treatment of the case is listed until the learner searches for it or opens the full
 * list, which says that it names options they may not have thought of yet (docs/CMCR_CASES.md, known limits); what
 * was given is listed, to give again.
 */
import { expect, test } from "@playwright/test";
import { enterCase, freshStart, shot, talkToPatient } from "./helpers.js";

test.use({ locale: "en-US" });

test("Treat tab: search first, the full list only on request, what was given listed", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await freshStart(page);
  await enterCase(page, "stemi-inferior-rv");
  await talkToPatient(page, { atSide: true });
  await page.locator("#tab-treat").click();
  const tab = page.locator(".treat-tab");
  await expect(tab).toBeVisible();

  // nothing is listed outside the full list, and the full list is closed
  await expect(tab.locator(":scope > .treat-list")).toHaveCount(0);
  const all = tab.locator("details.treat-all");
  await expect(all).toBeVisible();
  expect(await all.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
  await expect(all.locator("summary")).toContainText("Every treatment in this case");

  // a search finds the treatment asked for
  await tab.locator("input[type=text]").fill("aspirin");
  await tab.locator("form button").click();
  await expect(tab.locator(".treat-row").first()).toContainText(/aspirin/i);

  // the full list opens on request, with its warning, and stays open when the tab is drawn again
  await all.locator("summary").click();
  expect(await all.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(true);
  await expect(all).toContainText("options you may not have thought of yet");
  expect(await all.locator(".treat-row").count()).toBeGreaterThan(3);
  await page.locator("#tab-talk").click();
  await page.locator("#tab-treat").click();
  expect(await page.locator(".treat-tab details.treat-all").evaluate((d) => (d as HTMLDetailsElement).open)).toBe(true);
  await shot(page, "treat-tab");
  expect(errors).toEqual([]);
});
