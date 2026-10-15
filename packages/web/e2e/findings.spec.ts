/**
 * Review findings (web): nothing is shown before it is earned and the HUD
 * stays readable —
 *
 *  - a refused order never shows its report (practice scope, strict + Deny);
 *  - `/assess` mid-case offers only "assessment so far", never the authored
 *    debrief; the journal shows hints only for done objectives;
 *  - locked judgements show neither prompt nor options; the exam search
 *    performs only a clear match; web-owned slash commands (/quit, /lang)
 *    stay in the UI;
 *  - no glucose before a glucose test (DKA); the waypoint names the
 *    patient's own monitor; one specialty filter per label;
 *  - no HUD overlaps (zh status bar vs hotbar; vitals strip vs hotbar on
 *    narrow mouse/keyboard windows).
 */
import { expect, test, type Page } from "@playwright/test";
import { dispatch, enterCase, freshStart, talkToPatient, useStation } from "./helpers.js";

/** Evaluate `fn(window.__QA__)` in the page (`fn` must be self-contained). */
const qa = <T>(page: Page, fn: (qa: any) => T) => page.evaluate(`(${fn.toString()})(window.__QA__)`) as Promise<T>;

async function chat(page: Page, text: string): Promise<void> {
  await page.locator(".chat-input").fill(text);
  await page.locator(".chat-input").press("Enter");
}

function box(page: Page, selector: string) {
  return page.locator(selector).first().boundingBox();
}

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test.describe("grounded web panels (zh-CN)", () => {
  test("refused orders, mid-case debrief, journal hints, locked judgements, exam search", async ({ page }) => {
    await freshStart(page);
    await enterCase(page, "smzl-lung-adeno");

    // Practice scope "history-only": order_test is out of scope → the report shows the refusal, not the result.
    await qa(page, (q) => q.submit({ type: "configure", patch: { practiceScope: "history-only" } }));
    await page.waitForFunction(() => (window as any).__QA__.store.config?.practiceScope === "history-only");
    await useStation(page, ["lab-hematology"], "workstation");
    await page.locator("#exam-input").fill("血常规");
    await page.locator("#exam-input").press("Enter");
    await page.locator('.candidate[data-investigation="cbc"]').click();
    await expect(page.locator('#panel .window[data-panel="report"]')).toBeVisible();
    await expect(page.locator("#report-refused")).toBeVisible();
    await expect(page.locator(".report-text")).toHaveCount(0);
    await expect(page.locator(".lab-table")).toHaveCount(0);
    expect(await qa(page, (q) => q.session.state.orders.length)).toBe(0);

    // Strict approvals: while the dialog is pending nothing is shown; after Deny, the refusal.
    await qa(page, (q) => q.submit({ type: "configure", patch: { practiceScope: "full", approvalMode: "strict" } }));
    await page.waitForFunction(() => (window as any).__QA__.store.config?.approvalMode === "strict");
    await useStation(page, ["lab-hematology"], "workstation");
    await page.locator("#exam-input").fill("血常规");
    await page.locator("#exam-input").press("Enter");
    await page.locator('.candidate[data-investigation="cbc"]').click();
    await expect(page.locator("#approval")).toBeVisible();
    await expect(page.locator(".report-text")).toHaveCount(0);
    await page.locator("#approval-deny").click();
    await expect(page.locator("#report-refused")).toBeVisible();
    await expect(page.locator(".report-text")).toHaveCount(0);
    expect(await qa(page, (q) => q.session.state.seen.length)).toBe(0);
    await page.keyboard.press("Escape");

    // Back to the default mode: an accepted order + read shows the report.
    await qa(page, (q) => q.submit({ type: "configure", patch: { approvalMode: "default" } }));
    await page.waitForFunction(() => (window as any).__QA__.store.config?.approvalMode === "default");
    await useStation(page, ["lab-hematology"], "workstation");
    await page.locator("#exam-input").fill("血常规");
    await page.locator("#exam-input").press("Enter");
    await page.locator('.candidate[data-investigation="cbc"]').click();
    await expect(page.locator(".report-text")).not.toBeEmpty();
    expect(await qa(page, (q) => q.session.state.seen)).toContain("cbc@pre");
    await page.keyboard.press("Escape");

    // /assess mid-case: the journal offers the formative view only.
    await talkToPatient(page);
    await chat(page, "/assess");
    await page.waitForFunction(() => !!(window as any).__QA__.store.assessment);
    await page.keyboard.press("Escape");
    await qa(page, (q) => q.route("journal"));
    await expect(page.locator("#journal-debrief")).toBeHidden();
    await expect(page.locator("#journal-progress")).toBeVisible();
    // Upcoming objectives: title only (their hints are the scored hint action).
    await expect(page.locator("#task-list .task-row.upcoming small")).toHaveCount(0);
    const hints = await qa(page, (q) => q.game.caseDef.objectives.slice(1).map((o: any) => o.hint["zh-CN"] as string));
    const journalText = (await page.locator("#task-list").textContent()) ?? "";
    for (const hint of hints) expect(journalText).not.toContain(hint);
    await page.locator("#journal-progress").click();
    await expect(page.locator('#panel .window[data-panel="debrief"]')).toBeVisible();
    await expect(page.locator("#debrief-locked")).toBeVisible();
    await expect(page.locator("#debrief-conclusion")).toHaveCount(0);
    const conclusion = await qa(page, (q) => q.game.caseDef.debrief.conclusion["zh-CN"] as string);
    expect((await page.locator("#panel").textContent()) ?? "").not.toContain(conclusion.slice(0, 20));
    await expect(page.locator("#panel-title")).not.toContainText("病例完成");
    await page.keyboard.press("Escape");

    // Locked judgements on the board: no prompt, no options.
    await qa(page, (q) => q.route("board"));
    const prompts = await qa(page, (q) => q.game.caseDef.decisions.map((d: any) => d.prompt["zh-CN"] as string));
    const lockedCards = await page.locator(".decision.locked").all();
    expect(lockedCards.length).toBeGreaterThan(0);
    for (const card of lockedCards) {
      await expect(card.locator("[data-option]")).toHaveCount(0);
      const title = (await card.locator("h3").textContent()) ?? "";
      expect(prompts).not.toContain(title);
    }
  });

  test("exam search, web slash commands, DKA glucose, waypoint and the specialty filter", async ({ page }) => {
    await freshStart(page);
    // One filter per specialty label (呼吸内科 once).
    const labels = await page.locator("#filter-specialty option").allTextContents();
    expect(labels.filter((l) => l === "呼吸内科")).toHaveLength(1);
    expect(new Set(labels).size).toBe(labels.length);
    // The library search does not match diagnosis-bearing case ids.
    await page.locator("#library-search").fill("stemi");
    await expect(page.locator('.case-card[data-case="stemi-inferior-rv"]')).toHaveCount(0);
    await page.locator("#library-search").fill("");

    await enterCase(page, "dka-adult");
    // Waypoint: the patient's own monitor in the resus bay, not the cubicle monitor nearest the spawn.
    const dest = (await page.locator(".quest-footer").textContent()) ?? "";
    expect(dest).not.toContain("诊室 1");
    // Not on the monitor at triage (zh): the strip says so; the triage readings were taken by hand.
    await expect(page.locator("#vitals-strip")).toHaveClass(/off-monitor/);
    await expect(page.locator('#vitals-strip [data-vital="monitor"]')).toHaveText(/未接监护\s*分诊手测/);
    await expect(page.locator('#vitals-strip [data-vital="hr"] b')).toHaveText("118");
    // No glucose on the monitor or the HUD before a glucose test.
    const snap = await qa(page, (q) => q.store.snapshot.vitals);
    expect(snap.vitals.glucose).toBeUndefined();
    expect(snap.alarms.map((a: any) => a.vital)).not.toContain("glucose");

    await talkToPatient(page);
    // /quit and /lang are the web's own: the session keeps running, the whole UI switches language.
    await chat(page, "/quit");
    expect(await qa(page, (q) => q.session.isClosed)).toBe(false);
    await chat(page, "/lang en");
    await page.waitForFunction(() => document.documentElement.lang === "en");
    await page.waitForFunction(() => (window as any).__QA__.session.locale === "en");

    // Exam search: a weak match ("examine the eyes") is not performed.
    await page.keyboard.press("Escape");
    await talkToPatient(page);
    await page.locator("#tab-exam").click();
    await page.locator(".exam-search input").fill("examine the eyes");
    await page.locator(".exam-search input").press("Enter");
    await expect(page.locator("#exam-not-recorded")).toBeVisible();
    expect(await qa(page, (q) => q.session.state.examined)).toEqual([]);
    await page.keyboard.press("Escape");

    // After a capillary glucose is read, glucose is charted.
    await dispatch(page, [{ type: "order", investigationId: "poc-glucose" }, { type: "advance-time", minutes: 10 }, { type: "read", investigationId: "poc-glucose" }]);
    await page.waitForFunction(() => typeof (window as any).__QA__.store.snapshot.vitals.vitals.glucose === "number");
  });
});

test.describe("HUD layout", () => {
  for (const vp of [
    { width: 1280, height: 760 },
    { width: 1366, height: 768 },
    { width: 820, height: 1180 },
  ]) {
    test(`zh-CN status bar never runs under the hotbar at ${vp.width}×${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await freshStart(page);
      await enterCase(page, "dka-adult");
      const status = await box(page, ".statusbar");
      const hotbar = await box(page, ".hotbar");
      expect(status && hotbar).toBeTruthy();
      expect(intersects(status!, hotbar!)).toBe(false);
    });
  }

  for (const vp of [
    { width: 390, height: 844 },
    { width: 700, height: 900 },
  ]) {
    test(`vitals strip clears the hotbar on a narrow mouse/keyboard window ${vp.width}×${vp.height}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await freshStart(page);
      await enterCase(page, "dka-adult");
      await expect(page.locator("#vitals-strip")).toBeVisible();
      const strip = await box(page, "#vitals-strip");
      const hotbar = await box(page, ".hotbar");
      expect(intersects(strip!, hotbar!)).toBe(false);
    });
  }
});
