/**
 * What the learner is told (backlog L9, L11, L13):
 *
 *  - the case's "fictional teaching case / not medical advice" disclaimer is
 *    shown in the intro's selected-case summary, once on entering the world
 *    (quest card — never over a control, phones included) and in Sources;
 *  - a test that has not been ordered is offered as "开具 / Order", not
 *    "调阅 / Open" (a click places an order), and the device panel's empty
 *    state does not ask for typing (it has no search box);
 *  - a saved game resumes with its published workup plan.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dispatch, enterCase, freshStart, shot, useStation } from "./helpers.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const disclaimer = (caseId: string): Record<"zh-CN" | "en", string> =>
  JSON.parse(fs.readFileSync(path.resolve(here, "../../content/cases", caseId, "case.json"), "utf8")).disclaimer;

/** Evaluate `fn(window.__QA__)` in the page (`fn` must be self-contained). */
const qa = <T>(page: Page, fn: (qa: any) => T) => page.evaluate(`(${fn.toString()})(window.__QA__)`) as Promise<T>;

type Box = { x: number; y: number; width: number; height: number };
const intersects = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Boxes of every visible HUD control (buttons, hotbar, touch pads, vitals strip, minimap). */
async function controlBoxes(page: Page): Promise<{ id: string; box: Box }[]> {
  return page.evaluate(() => {
    const out: { id: string; box: { x: number; y: number; width: number; height: number } }[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("#hud button, #hud .hotbar, #hud .touch-controls, #hud .touch-actions, #hud select, #hud input")) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || style.visibility === "hidden" || style.display === "none") continue;
      out.push({ id: el.id || el.className || el.tagName, box: { x: r.x, y: r.y, width: r.width, height: r.height } });
    }
    return out;
  });
}

async function expectClearOfControls(page: Page, notice: Locator): Promise<void> {
  const box = await notice.boundingBox();
  expect(box).toBeTruthy();
  const vp = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);
  // The quest card that holds it must not cover any control either.
  const card = await page.locator("#quest").boundingBox();
  for (const c of await controlBoxes(page)) {
    if (c.id === "hint-btn") continue; // inside the quest card itself
    expect(intersects(box!, c.box), `disclaimer overlaps ${c.id}`).toBe(false);
    expect(intersects(card!, c.box), `quest card overlaps ${c.id}`).toBe(false);
  }
}

test.describe("review status and learning outcomes on the case card (docs/GLOSSARY.md §4)", () => {
  const stemi = (): { learningOutcomes?: Record<"zh-CN" | "en", string>[]; provenance: { review?: { status: string; reviewedAt?: string } } } =>
    JSON.parse(fs.readFileSync(path.resolve(here, "../../content/cases/stemi-inferior-rv/case.json"), "utf8"));

  test("the review is stated on the card; the outcomes stay closed until opened (zh-CN, desktop)", async ({ page }) => {
    const c = stemi();
    test.skip(!c.provenance.review || !c.learningOutcomes?.length, "the STEMI case records no review or outcomes yet");
    await freshStart(page);
    const card = page.locator('.case-card[data-case="stemi-inferior-rv"]');
    await expect(card.locator(".review-tag")).toHaveText("编辑审核");
    await card.click();
    await expect(page.locator("#case-review")).toHaveText(`编辑审核 ${c.provenance.review!.reviewedAt} · 尚未经执业医师审核`);
    const outcomes = page.locator("#case-outcomes");
    await expect(outcomes).toHaveJSProperty("open", false);
    await expect(outcomes.locator("summary")).toHaveText(`学习目标（${c.learningOutcomes!.length}）· 可能提示诊断`);
    await expect(outcomes.locator("li").first()).toBeHidden();
    await page.locator(".intro-selected").scrollIntoViewIfNeeded();
    await shot(page, "case-card-review-desktop-zh-closed");
    await outcomes.locator("summary").click();
    await expect(outcomes.locator("li")).toHaveCount(c.learningOutcomes!.length);
    await expect(outcomes.locator("li").first()).toHaveText(c.learningOutcomes![0]!["zh-CN"]);
    await page.locator(".intro-selected").scrollIntoViewIfNeeded();
    await shot(page, "case-card-review-outcomes-desktop-zh");
  });

  test.describe("on a phone (390×844, touch)", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test("fits the screen with the outcomes open (en)", async ({ page }) => {
      const c = stemi();
      test.skip(!c.provenance.review || !c.learningOutcomes?.length, "the STEMI case records no review or outcomes yet");
      await freshStart(page);
      await page.locator("#lang-toggle").click();
      await page.waitForFunction(() => document.documentElement.lang === "en");
      await page.locator('.case-card[data-case="stemi-inferior-rv"]').click();
      await expect(page.locator("#case-review")).toHaveText(`Editorial review ${c.provenance.review!.reviewedAt} · not yet reviewed by a licensed clinician`);
      const outcomes = page.locator("#case-outcomes");
      await outcomes.locator("summary").click();
      await expect(outcomes.locator("li").first()).toHaveText(c.learningOutcomes![0]!.en);
      await outcomes.scrollIntoViewIfNeeded();
      const box = (await outcomes.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(390.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await shot(page, "case-card-review-outcomes-phone-en");
    });
  });
});

test.describe("case disclaimer (L9)", () => {
  test("intro summary, once on entering the world, and in Sources (zh-CN, desktop)", async ({ page }) => {
    const text = disclaimer("stemi-inferior-rv")["zh-CN"];
    await freshStart(page);
    await page.locator('.case-card[data-case="stemi-inferior-rv"]').click();
    await expect(page.locator(".intro-selected #case-disclaimer")).toHaveText(text);
    await enterCase(page, "stemi-inferior-rv");
    const notice = page.locator("#quest-disclaimer");
    await expect(notice).toBeVisible();
    await expect(notice).toHaveText(text);
    await expectClearOfControls(page, notice);
    // Shown once: it leaves the quest card by itself.
    await expect(notice).toBeHidden({ timeout: 25_000 });
    await qa(page, (q) => q.route("source"));
    await expect(page.locator('#panel .window[data-panel="source"]')).toContainText(text);
  });

  test.describe("on a phone (390×844, touch)", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test("is readable and never covers a control (en)", async ({ page }) => {
      const text = disclaimer("dka-adult").en;
      await freshStart(page);
      await page.locator("#lang-toggle").click();
      await page.waitForFunction(() => document.documentElement.lang === "en");
      await page.locator('.case-card[data-case="dka-adult"]').click();
      const summary = page.locator(".intro-selected #case-disclaimer");
      await summary.scrollIntoViewIfNeeded();
      await expect(summary).toBeVisible();
      await expect(summary).toHaveText(text);
      const sb = (await summary.boundingBox())!;
      // Sub-pixel tolerance: font metrics differ between machines (CI measured 390.0625); what matters is
      // that nothing spills past the viewport, i.e. the page never scrolls sideways.
      expect(sb.x + sb.width).toBeLessThanOrEqual(390.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
      await enterCase(page, "dka-adult");
      // The welcome toast names the on-screen button, not a key (J12).
      await expect(page.locator(".toast")).toContainText("then tap Use");
      await expect(page.locator(".toast")).not.toContainText("press E");
      const notice = page.locator("#quest-disclaimer");
      await expect(notice).toBeVisible();
      await expect(notice).toHaveText(text);
      await expectClearOfControls(page, notice);
      await expect(page.locator("#touch-use")).toBeVisible();
    });
  });
});

test.describe("order labels (L13)", () => {
  test("an unordered test says 开具, an ordered one 调阅; the device panel asks for no typing", async ({ page }) => {
    await freshStart(page);
    await enterCase(page, "stemi-inferior-rv");
    await useStation(page, ["ecg-12lead"], "device");
    await expect(page.locator('#panel .window[data-panel="device"]')).toBeVisible();
    const ecg = page.locator('.candidate[data-investigation="ecg-12lead"]');
    await expect(ecg).toContainText("开具");
    await expect(ecg).not.toContainText("调阅");
    await expect(page.locator("#evidence-empty")).toBeVisible();
    await expect(page.locator("#evidence-empty")).not.toContainText("输入");
    expect(await qa(page, (q) => q.session.state.orders.length)).toBe(0);
    await ecg.click();
    await page.waitForFunction(() => (window as any).__QA__.session.state.orders.some((o: any) => o.investigationId === "ecg-12lead"));
    await dispatch(page, [{ type: "advance-time", minutes: 6 }]);
    await page.keyboard.press("Escape");
    await useStation(page, ["ecg-12lead"], "device");
    await expect(page.locator('.candidate[data-investigation="ecg-12lead"]')).toContainText("调阅");
  });
});

test.describe("save / load (L11)", () => {
  test("a resumed game keeps the published workup plan", async ({ page }) => {
    const plan = [
      { text: "Glucose, ketones and VBG now", status: "completed" },
      { text: "Fluids before insulin; check K⁺", status: "in_progress" },
    ];
    await freshStart(page);
    await enterCase(page, "dka-adult");
    // Next load: the local save carries a plan (what the clinician published before the page closed).
    await page.addInitScript((items) => {
      try {
        const raw = JSON.parse(localStorage.getItem("clinicalcraft-v5") ?? "null");
        const save = raw?.sessions?.["dka-adult"];
        if (save && !save.snapshot.plan.length) {
          save.snapshot.plan = items;
          localStorage.setItem("clinicalcraft-v5", JSON.stringify(raw));
        }
      } catch {
        /* no save yet */
      }
    }, plan);
    await page.reload();
    await expect(page.locator("#enter")).toBeEnabled({ timeout: 180_000 });
    await page.locator('.case-card[data-case="dka-adult"]').click();
    await page.locator("#enter").click();
    await page.waitForFunction(() => (window as any).__QA__?.game?.entered === true, null, { timeout: 180_000 });
    expect(await qa(page, (q) => q.session.workupPlan().items)).toEqual(plan);
    await qa(page, (q) => q.route("journal"));
    await expect(page.locator(".plan-list li")).toHaveCount(2);
    await expect(page.locator(".plan-list")).toContainText(plan[1].text);
  });
});
