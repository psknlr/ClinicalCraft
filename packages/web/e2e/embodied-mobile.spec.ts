/**
 * Embodied mode on a phone (390 × 844, touch): the embodiment badge, a
 * delegated nurse's toast and a refusal with "Go there" fit on screen and
 * cover none of the HUD's controls — zh-CN and en.
 */
import { expect, test, type Page } from "@playwright/test";
import { embodiedSetup, enterCase, freshStart, shot } from "./helpers.js";

type Box = { x: number; y: number; width: number; height: number };
const intersects = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function boxOf(page: Page, selector: string): Promise<Box | null> {
  const l = page.locator(selector).first();
  if (!(await l.count()) || !(await l.isVisible())) return null;
  return l.boundingBox();
}

/** Every visible HUD control the embodied bits must leave alone. */
const CONTROLS = ["#hotbar", "#vitals-strip", "#touch-talk", "#touch-use", "#mini", "#quest", ".hud-buttons", "#sim-clock", "#autopilot-dock"];

for (const locale of ["zh-CN", "en-US"] as const) {
  test.describe(`embodied HUD on a phone (${locale})`, () => {
    test.use({ locale, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test(`(f) badge, toast and Go there fit at 390 px (${locale})`, async ({ page }) => {
      const en = locale === "en-US";
      await freshStart(page);
      await enterCase(page, "stemi-inferior-rv");
      await embodiedSetup(page, { bypassApprovals: true });
      const badge = page.locator("#embodiment-badge");
      await expect(badge).toBeVisible();
      await expect(badge).toContainText(en ? "Embodied" : "具身");
      const b = (await boxOf(page, "#embodiment-badge"))!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(390);
      for (const sel of CONTROLS) {
        const other = await boxOf(page, sel);
        if (other) expect(intersects(b, other), `badge over ${sel}`).toBe(false);
      }

      // a refusal far from the bed (the entrance): the HUD's feedback with "Go there", on screen, clear of the controls
      await page.evaluate(() => (window as any).__QA__.worldAction({ operation: "attach", targetId: "eq:resus1-monitor" }));
      const fb = page.locator("#hud-feedback #action-feedback");
      await expect(fb).toBeVisible({ timeout: 60_000 });
      await expect(fb.locator("#go-there")).toBeVisible();
      const f = (await fb.boundingBox())!;
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x + f.width).toBeLessThanOrEqual(390);
      for (const sel of ["#hotbar", "#touch-talk", "#touch-use", "#embodiment-badge", "#vitals-strip"]) {
        const other = await boxOf(page, sel);
        if (other) expect(intersects(f, other), `feedback over ${sel}`).toBe(false);
      }

      // a delegated nurse: her walking toast (while the refusal is still shown)
      await page.evaluate(() => (window as any).__QA__.submit({ type: "user_message", text: "/delegate staff:ed-nurse attach_monitor" }));
      const toast = page.locator(".toast.show").filter({ hasText: en ? "walking to" : "正前往" }).first();
      await expect(toast).toBeVisible({ timeout: 60_000 });
      const t = (await toast.boundingBox())!;
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x + t.width).toBeLessThanOrEqual(390);
      expect(intersects(t, b)).toBe(false);
      if (await fb.isVisible()) expect(intersects(t, (await fb.boundingBox())!)).toBe(false);
      await shot(page, `embodied-mobile-${locale}`);
      // no horizontal page scroll
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });
  });
}
