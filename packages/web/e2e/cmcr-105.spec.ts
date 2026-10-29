/** Real source cases, distinct from the catalogue-only stress fixtures. */
import { expect, test } from "@playwright/test";
import { enterCase, freshStart, shot, toPatientSide } from "./helpers.js";

for (const locale of ["zh-CN", "en"] as const) {
  test(`real collection library: counts, search and mobile layout (${locale})`, async ({ page }) => {
    await page.addInitScript((language) => localStorage.setItem("clinicalcraft-v5-settings", JSON.stringify({ version: 1, ui: { quality: "low", locale: language } })), locale);
    await freshStart(page);
    const cards = page.locator(".case-card");
    await expect(cards).toHaveCount(135);
    await page.locator("#filter-collection").selectOption("cmcr-20");
    await expect(cards).toHaveCount(20);
    await page.locator("#filter-collection").selectOption("cmcr-105");
    await expect(cards).toHaveCount(105);
    await page.locator("#library-search").fill("脐血");
    await expect(cards).toHaveCount(1);
    await expect(cards).toHaveAttribute("data-case", "cmcr-655458");
    await cards.click();
    await expect(page.locator("#case-load-status")).toHaveAttribute("data-status", "ready");
    await expect(page.locator("#case-outcomes")).not.toHaveAttribute("open", "");
    await page.locator("#library-search").fill("");
    await expect(cards).toHaveCount(105);
    await shot(page, `real-library-105-${locale}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#library-search").scrollIntoViewIfNeeded();
    const dimensions = await page.locator(".library").evaluate((library) => {
      const list = library.querySelector<HTMLElement>(".case-list")!;
      return { right: library.getBoundingClientRect().right, width: innerWidth, listHeight: list.clientHeight, viewportHeight: innerHeight, overflow: list.scrollHeight > list.clientHeight };
    });
    expect(dimensions.right).toBeLessThanOrEqual(dimensions.width);
    expect(dimensions.listHeight).toBeLessThan(dimensions.viewportHeight * 0.6);
    expect(dimensions.overflow).toBe(true);
    await shot(page, `real-library-105-mobile-${locale}`);
  });
}

for (const locale of ["zh-CN", "en"] as const) {
  for (const caseId of ["cmcr-1551888", "cmcr-655458"]) {
    test(`additional collection: ${caseId} loads and completes in-world (${locale})`, async ({ page }) => {
      await page.addInitScript((language) => localStorage.setItem("clinicalcraft-v5-settings", JSON.stringify({ version: 1, ui: { quality: "low", locale: language } })), locale);
      await freshStart(page);
      await expect(page.locator(".case-card")).toHaveCount(135);
      await page.locator("#filter-collection").selectOption("cmcr-105");
      await expect(page.locator(".case-card")).toHaveCount(105);
      await enterCase(page, caseId);
      expect(await page.evaluate(() => (window as any).__QA__.embodiment)).toBe("embodied");
      await toPatientSide(page);
      await shot(page, `${caseId}-${locale}-bedside`);
      if (caseId === "cmcr-655458") {
        expect(await page.evaluate(() => {
          const patient = (window as any).__QA__.game.caseDef.patient;
          return { stature: patient.appearance.stature, nonVerbal: patient.nonVerbalWhen, carerAnswers: patient.persona.companion.answersHistory };
        })).toEqual({ stature: "infant", nonVerbal: { always: true }, carerAnswers: true });
      }
      await page.evaluate(() => (window as any).__QA__.route("source"));
      const sourcePanel = page.locator('#panel .window[data-panel="source"]');
      const source = await page.evaluate(() => {
        const provenance = (window as any).__QA__.game.caseDef.provenance;
        return { citation: provenance.citation, doi: provenance.doi };
      });
      // Generic review notes may mention DOI verification; the actual identity must remain hidden.
      await expect(sourcePanel).not.toContainText(source.citation);
      await expect(sourcePanel).not.toContainText(source.doi);
      await expect(sourcePanel.locator(".asset-status")).toHaveCount(0);
      // The all-case embodied autopilot suite exercises physical navigation; this checks the final browser view.
      await page.evaluate(() => {
        const qa = (window as any).__QA__;
        for (const action of qa.game.caseDef.solution) qa.dispatch(action);
      });
      await expect.poll(() => page.evaluate(() => (window as any).__QA__.store.snapshot.state.finished)).toBe(true);
      await page.evaluate(() => (window as any).__QA__.route("source"));
      await expect(sourcePanel).toContainText(source.citation);
      await expect(sourcePanel).toContainText(source.doi);
      await shot(page, `${caseId}-${locale}-source-review`);
    });
  }
}
