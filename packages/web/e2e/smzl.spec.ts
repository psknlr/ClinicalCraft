/**
 * zh-CN walkthrough of the V4 case (SMZL coexisting with lung adenocarcinoma):
 * intro → case library → world → talk (suggested question → reply) →
 * lab workstation "血常规" (says before any sample that the blood is drawn
 * at the patient's side, and shows the way) → ordered at the patient's side
 * (the patient's Tests tab) → read at the lab workstation → report → journal
 * evidence → evidence board decision → finish → debrief.
 */
import { expect, test } from "@playwright/test";
import { dispatch, enterCase, freshStart, shot, talkToPatient, useStation } from "./helpers.js";

test.use({ locale: "zh-CN" });

test("SMZL (zh-CN): talk, order, read, decide, debrief", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await freshStart(page);
  await expect(page.locator("#intro h1")).toContainText("CLINICAL");
  await expect(page.locator(".version")).toHaveText("V5 · AGENT EDITION");
  await expect(page.locator("#intro-llm")).toContainText("离线");
  await expect(page.locator('.case-card[data-case="smzl-lung-adeno"] .prov')).toHaveText("已发表病例");
  await shot(page, "intro");

  // library filter + search
  await page.locator("#library-search").fill("脾");
  await expect(page.locator(".case-card")).toHaveCount(1);
  await page.locator("#library-search").fill("");
  await page.locator("#filter-setting").selectOption("outpatient");
  await expect(page.locator('.case-card[data-case="smzl-lung-adeno"]')).toBeVisible();
  await expect(page.locator('.case-card[data-case="stemi-inferior-rv"]')).toHaveCount(0);
  await page.locator("#filter-setting").selectOption("");

  await enterCase(page, "smzl-lung-adeno");
  await expect(page.locator("#quest-title")).not.toBeEmpty();
  await expect(page.locator("#phase-label")).toContainText("诊断期");
  await expect(page.locator("#vitals-strip")).toBeHidden();
  await shot(page, "hud");

  // conversation: a suggested (canonical) question gets the authored answer
  await talkToPatient(page);
  await expect(page.locator(".llm-badge.offline")).toBeVisible();
  const first = page.locator(".suggestions .question[data-item]").first();
  const itemId = await first.getAttribute("data-item");
  await first.click();
  await expect(page.locator(".chat-log .msg.agent .bubble").first()).not.toBeEmpty();
  await expect(page.locator(".chat-log .msg.learner")).toHaveCount(1);
  await expect(page.locator(`.suggestions .question[data-item="${itemId}"]`)).toHaveCount(0);
  await expect(page.locator(".grounded .fact-chip").first()).toBeVisible();
  // free text goes through the same pipeline (deterministic matcher offline)
  await page.locator(".chat-input").fill("以前发现过脾大吗？");
  await page.locator(".chat-input").press("Enter");
  await expect(page.locator(".chat-log .msg.agent")).toHaveCount(2, { timeout: 30_000 });
  await shot(page, "conversation");

  // examine tab: the source case records no examination in the diagnostic phase → "not recorded"
  await page.locator("#tab-exam").click();
  await expect(page.locator(".exam-tab .notice")).toContainText("未记录");
  await page.locator(".exam-search input").fill("腹部触诊");
  await page.locator(".exam-search input").press("Enter");
  await expect(page.locator(".exam-result .notice")).toContainText("未记录");
  await shot(page, "examine");
  await page.keyboard.press("Escape");
  await expect(page.locator("#panel")).toBeHidden();

  // lab workstation: V4 order entry with free-text matching
  await useStation(page, ["lab-hematology"], "workstation");
  await expect(page.locator('#panel .window[data-panel="orders"]')).toBeVisible();
  await expect(page.locator(".phase-pill")).toContainText("诊断期");
  await page.locator("#exam-input").fill("血常规");
  await page.locator("#exam-input").press("Enter");
  const candidate = page.locator('.candidate[data-investigation="cbc"]');
  // The blood is drawn at the patient's side (EMBODIED §6): before a sample the workstation says so, in the world's
  // words, before anything is placed — and its click shows the way to the patient (no order, no report).
  await expect(candidate).toHaveClass(/refused/);
  await expect(candidate).toContainText("标本要在");
  await shot(page, "orders");
  await candidate.click();
  await expect(page.locator("#panel #action-feedback #go-there")).toContainText("前往");
  await expect(page.locator('#panel .window[data-panel="report"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__QA__.session.state.orders.length)).toBe(0);
  await page.keyboard.press("Escape");
  // at the patient's side: the sample is taken and the test ordered there — from the patient's Tests tab
  await talkToPatient(page, { atSide: true });
  await page.locator("#tab-tests").click();
  await page.locator('#bedside-tests [data-investigation="cbc"]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__QA__.session.state.orders.map((o: any) => o.investigationId))).toContain("cbc");
  await page.keyboard.press("Escape");
  // back at the lab workstation the ordered test is read (调阅)
  await useStation(page, ["lab-hematology"], "workstation");
  await page.locator("#exam-input").fill("血常规");
  await page.locator("#exam-input").press("Enter");
  await expect(candidate).toContainText("调阅");
  await candidate.click();
  await expect(page.locator('#panel .window[data-panel="report"]')).toBeVisible();
  await expect(page.locator(".report-text")).not.toBeEmpty();
  await shot(page, "report");

  // an exam that belongs to another station: the world names the station (its click shows the way there)
  await page.locator("#report-back").click();
  await page.locator("#exam-input").fill("骨髓活检");
  await page.locator("#exam-input").press("Enter");
  await expect(page.locator('.candidate.refused[data-investigation="biopsy"]')).toContainText("病理");

  // journal lists the acquired evidence
  await page.keyboard.press("Escape");
  await page.locator("#journal-btn").click();
  await expect(page.locator('.evidence-card[data-order="cbc@pre"]')).toBeVisible();
  await expect(page.locator('.evidence-card[data-order="cbc@pre"]')).toHaveClass(/read/);
  await shot(page, "journal");
  await page.keyboard.press("Escape");

  // obtain the rest of the diagnostic evidence through the engine (test set-up)
  await dispatch(page, [
    { type: "ask", itemId: "pain" },
    { type: "ask", itemId: "spleen" },
    { type: "ask", itemId: "lung" },
    { type: "order", investigationId: "abdct" },
    { type: "read", investigationId: "abdct" },
    { type: "order", investigationId: "biopsy" },
    { type: "read", investigationId: "biopsy" },
    { type: "order", investigationId: "flow" },
    { type: "read", investigationId: "flow" },
  ]);

  // evidence board: answer the diagnosis decision with the scripted answer
  await page.evaluate(() => (window as any).__QA__.route("board"));
  const card = page.locator('.decision[data-decision="diagnosis"]');
  await expect(card).toContainText("可以作答");
  const correct = await page.evaluate(() => (window as any).__QA__.game.caseDef.decisions.find((d: any) => d.id === "diagnosis").options.find((o: any) => o.correct).id as string);
  await card.locator(`[data-option="${correct}"]`).click();
  await expect(card).toHaveClass(/correct/);
  await expect(card.locator(".feedback")).not.toBeEmpty();
  await shot(page, "board");

  // complete the remaining chapters via the reference path, then finish → debrief
  await page.evaluate(() => {
    const qa = (window as any).__QA__;
    for (const a of qa.game.caseDef.solution) if (a.type !== "finish") qa.dispatch(a);
  });
  await page.locator("#finish").click();
  await expect(page.locator('#panel .window[data-panel="debrief"]')).toBeVisible();
  await expect(page.locator(".assessment")).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(".formative")).toBeVisible();
  await expect(page.locator(".metric-grid")).toBeVisible();
  await shot(page, "debrief");
  await page.locator(".window-body").evaluate((el) => (el.scrollTop = el.scrollHeight));
  await shot(page, "debrief-assessment");

  expect(errors).toEqual([]);
});
