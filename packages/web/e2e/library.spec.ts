/** The catalogue remains usable without fetching 135 full case files. */
import { expect, test } from "@playwright/test";
import { freshStart, shot } from "./helpers.js";

for (const locale of ["zh-CN", "en"] as const) {
  test(`135-case library: collection, search, keyboard and mobile layout (${locale})`, async ({ page }) => {
    await freshStart(page);
    await page.evaluate((language) => {
      const app = (window as any).__QA__.app;
      const original = app.content.cards.filter((card: any) => card.tags.includes("cmcr-20"));
      const other = app.content.cards.filter((card: any) => !card.tags.includes("cmcr-20") && !card.tags.includes("cmcr-105")).slice(0, 10);
      // Index-only fixtures deliberately have no corresponding case file. Searching must not fetch them.
      const additions = Array.from({ length: 105 }, (_, n) => ({
        ...original[0], id: `catalogue-fixture-${n}`, tags: ["cmcr-105", "historical-review"],
        title: { "zh-CN": `反复胸痛 · ${n + 20}岁成人`, en: `Recurrent chest pain · adult aged ${n + 20}` },
        summary: { "zh-CN": "运动后出现胸痛，需要复核既往检查。", en: "Pain after exercise; review the previous investigations." },
        specialty: ["cardiology"], setting: "inpatient",
      }));
      app.content.cards = [...original, ...other, ...additions];
      app.setLocale(language);
      app.intro.render();
    }, locale);
    await expect(page.locator(".case-card")).toHaveCount(135);
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("catalogue-fixture")) requests.push(request.url());
    });
    await page.locator("#filter-collection").selectOption("cmcr-105");
    await expect(page.locator(".case-card")).toHaveCount(105);
    await expect(page.locator(".library-results")).toContainText("105");
    await page.locator("#library-search").fill("ＣＨＥＳＴ，exercise");
    await expect(page.locator(".case-card")).toHaveCount(105);
    const cards = page.locator(".case-card");
    await cards.first().focus();
    await page.keyboard.press("ArrowDown");
    await expect(cards.nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(cards.last()).toBeFocused();
    await page.keyboard.press("Home");
    await expect(cards.first()).toBeFocused();
    await shot(page, `library-135-${locale}`);
    expect(requests).toEqual([]);
    await page.locator("#library-search").fill("no such presentation");
    await expect(cards).toHaveCount(0);
    await expect(page.locator(".library-empty p")).toBeVisible();
    await page.locator("#library-reset").click();
    await expect(cards).toHaveCount(135);
    await expect(page.locator("#library-search")).toBeFocused();
    await page.locator("#filter-collection").selectOption("cmcr-20");
    await expect(cards).toHaveCount(20);
    await cards.first().click();
    await expect(page.locator(".case-card.active")).toBeFocused();
    await expect(page.locator("#selected-case-summary")).not.toBeEmpty();
    await expect(page.locator("#case-outcomes")).not.toHaveAttribute("open", "");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#library-search").scrollIntoViewIfNeeded();
    const dimensions = await page.locator(".library").evaluate((library) => {
      const list = library.querySelector<HTMLElement>(".case-list")!;
      const box = library.getBoundingClientRect();
      return { right: box.right, width: window.innerWidth, listHeight: list.clientHeight, viewportHeight: window.innerHeight, overflowing: list.scrollHeight > list.clientHeight };
    });
    expect(dimensions.right).toBeLessThanOrEqual(dimensions.width);
    expect(dimensions.listHeight).toBeLessThan(dimensions.viewportHeight * 0.6);
    expect(dimensions.overflowing).toBe(true);
    await shot(page, `library-135-mobile-${locale}`);
  });
}
