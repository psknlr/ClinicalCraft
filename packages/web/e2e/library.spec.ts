/** The catalogue remains usable without fetching 135 full case files. */
import { expect, test, type Page } from "@playwright/test";
import { freshStart, shot } from "./helpers.js";

/** The search filters the list once typing pauses: wait until no search is waiting. */
async function settled(page: Page): Promise<void> {
  await expect(page.locator("#case-list")).not.toHaveAttribute("aria-busy", "true");
}

/** Desktop geometry of the intro: hero card against the library, the selected case's scroll area and the frame. */
async function desktopGeometry(page: Page) {
  return page.evaluate(() => {
    const rect = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
    const panel = document.querySelector<HTMLElement>(".intro-selected")!;
    const p = panel.getBoundingClientRect();
    const library = rect(".library");
    return {
      cardRight: rect(".intro-card").right,
      libraryLeft: library.left,
      libraryInnerBottom: library.bottom - 3,
      panelTop: p.top + panel.clientTop,
      panelVisibleBottom: p.top + panel.clientTop + panel.clientHeight,
      panelBottom: p.bottom,
      disclaimer: rect("#case-disclaimer"),
      outcomes: rect("#case-outcomes summary"),
      listHeight: rect(".case-list").height,
    };
  });
}

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
    await settled(page);
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

    // An input method's pinyin is not searched: the list waits for the committed text.
    await page.locator("#library-search").fill("");
    await settled(page);
    await page.locator("#library-search").focus();
    const cdp = await page.context().newCDPSession(page);
    for (const text of ["w", "wu", "wushi", "wushiwu"]) await cdp.send("Input.imeSetComposition", { text, selectionStart: text.length, selectionEnd: text.length });
    await expect(page.locator("#library-search")).toHaveValue("wushiwu");
    await page.waitForTimeout(500);
    await expect(cards).toHaveCount(105);
    await expect(page.locator(".library-empty")).toHaveCount(0);
    await cdp.send("Input.insertText", { text: "55岁" });
    await settled(page);
    await expect(cards).toHaveCount(1);
    await expect(cards).toHaveAttribute("data-case", "catalogue-fixture-35");

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

    // Desktop (1280×760): the hero card stays clear of the library, and the teaching-case notice and the
    // learning-outcomes disclosure are inside the selected case's visible area, not below its scroll fold.
    const desk = await desktopGeometry(page);
    expect(desk.cardRight).toBeLessThanOrEqual(desk.libraryLeft);
    for (const box of [desk.disclaimer, desk.outcomes]) {
      expect(box.top).toBeGreaterThanOrEqual(desk.panelTop - 0.5);
      expect(box.bottom).toBeLessThanOrEqual(desk.panelVisibleBottom + 0.5);
    }
    expect(desk.panelBottom).toBeLessThanOrEqual(desk.libraryInnerBottom + 0.5);
    expect(desk.listHeight).toBeGreaterThanOrEqual(130);
    // Keyboard: Tab from the search box lands on the selected card, with a ring outside its border.
    await page.locator("#library-search").focus();
    for (let i = 0; i < 10 && !(await page.evaluate(() => document.activeElement?.classList.contains("case-card"))); i++) await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const s = getComputedStyle(el);
      return { active: el.classList.contains("active"), focusVisible: el.matches(":focus-visible"), style: s.outlineStyle, width: parseFloat(s.outlineWidth), offset: parseFloat(s.outlineOffset), color: s.outlineColor, border: s.borderTopColor };
    });
    expect(ring).toMatchObject({ active: true, focusVisible: true, style: "solid" });
    expect(ring.width).toBeGreaterThanOrEqual(2);
    expect(ring.offset).toBeGreaterThan(0);
    expect(ring.color).not.toBe(ring.border);
    // A short laptop viewport: the frame grows (the page scrolls) rather than the selected case hanging out of it.
    await page.setViewportSize({ width: 1280, height: 600 });
    const short = await desktopGeometry(page);
    expect(short.panelBottom).toBeLessThanOrEqual(short.libraryInnerBottom + 0.5);
    expect(short.cardRight).toBeLessThanOrEqual(short.libraryLeft);
    expect(short.disclaimer.bottom).toBeLessThanOrEqual(short.panelVisibleBottom + 0.5);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#library-search").scrollIntoViewIfNeeded();
    const dimensions = await page.locator(".library").evaluate((library) => {
      const list = library.querySelector<HTMLElement>(".case-list")!;
      const box = library.getBoundingClientRect();
      return { right: box.right, width: window.innerWidth, contentWidth: library.scrollWidth, clientWidth: library.clientWidth, listHeight: list.clientHeight, viewportHeight: window.innerHeight, overflowing: list.scrollHeight > list.clientHeight };
    });
    expect(dimensions.right).toBeLessThanOrEqual(dimensions.width);
    expect(dimensions.contentWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    expect(dimensions.listHeight).toBeLessThan(dimensions.viewportHeight * 0.6);
    expect(dimensions.overflowing).toBe(true);
    await shot(page, `library-135-mobile-${locale}`);
    // Tapping a card part-way down the scrolled list selects it where it is: the card stays under the finger.
    await page.locator("#case-list").evaluate((list) => list.scrollIntoView({ block: "start" }));
    const tap = await page.locator("#case-list").evaluate((list) => {
      list.scrollTop = Math.round(list.scrollHeight / 3);
      const mid = (list.getBoundingClientRect().top + list.getBoundingClientRect().bottom) / 2;
      const centre = (el: Element) => (el.getBoundingClientRect().top + el.getBoundingClientRect().bottom) / 2;
      const card = [...list.querySelectorAll<HTMLElement>(".case-card")].sort((a, b) => Math.abs(centre(a) - mid) - Math.abs(centre(b) - mid))[0]!;
      const r = card.getBoundingClientRect();
      return { id: card.dataset.case!, x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top };
    });
    await page.mouse.click(tap.x, tap.y);
    const tapped = page.locator(`.case-card[data-case="${tap.id}"]`);
    await expect(tapped).toHaveAttribute("aria-selected", "true");
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(Math.abs((await tapped.evaluate((el) => el.getBoundingClientRect().top)) - tap.top)).toBeLessThanOrEqual(2);
  });
}
