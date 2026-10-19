/**
 * Content at scale (C1, docs/EMBODIED.md §11): the library is the bundled case
 * index — at start only the selected case's file is fetched; a case's file
 * loads when it is selected; a failed load shows the status line, refuses to
 * enter (toast) and recovers with a page reload.
 */
import { expect, test } from "@playwright/test";
import { enterCase, freshStart } from "./helpers.js";

test.use({ locale: "zh-CN" });

const CASE_FILE = /\/content\/cases\/([^/]+)\/case\.json/;
const STEMI_FILE = "**/content/cases/stemi-inferior-rv/case.json*";

test("full cases load on demand; a failed case file says so and recovers with a reload (C1)", async ({ page }) => {
  const fetched: string[] = [];
  page.on("request", (r) => {
    const id = CASE_FILE.exec(r.url())?.[1];
    if (id) fetched.push(id);
  });
  await freshStart(page);
  const qa = <T>(fn: string, arg?: unknown) => page.evaluate(([f, a]) => (window as any).__QA__[f as string](a), [fn, arg] as const) as Promise<T>;
  const selected = await page.evaluate(() => (window as any).__QA__.app.selection.caseId as string);
  expect(await page.locator(".case-card").count()).toBeGreaterThan(1);
  await expect.poll(() => qa<string>("caseStatus", selected)).toBe("ready");
  // The library lists every case, but only the selected one was loaded.
  expect([...new Set(fetched)]).toEqual([selected]);
  expect(selected).not.toBe("stemi-inferior-rv");

  // Another case whose file cannot be fetched.
  await page.route(STEMI_FILE, (r) => r.abort());
  await page.locator('.case-card[data-case="stemi-inferior-rv"]').click();
  const status = page.locator("#case-load-status");
  await expect(status).toHaveAttribute("data-status", "failed");
  await expect(status).toBeVisible();
  await expect(status).toContainText("无法加载此病例的文件");
  await expect(page.locator("#case-load-reload")).toBeVisible();
  expect(fetched).toContain("stemi-inferior-rv");
  // Entering is refused with a toast; the library stays.
  await page.locator("#enter").click();
  await expect(page.locator(".toast-title").filter({ hasText: "病例加载失败" })).toBeVisible();
  await expect(page.locator("#intro")).toBeVisible();
  expect(await page.evaluate(() => (window as any).__QA__.game)).toBeNull();

  // The reload brings it back.
  await page.unroute(STEMI_FILE);
  await Promise.all([page.waitForEvent("load"), page.locator("#case-load-reload").click()]);
  await expect(page.locator("#enter")).toBeEnabled({ timeout: 180_000 });
  await enterCase(page, "stemi-inferior-rv");
  expect(await page.evaluate(() => (window as any).__QA__.game.caseDef.id)).toBe("stemi-inferior-rv");
});
