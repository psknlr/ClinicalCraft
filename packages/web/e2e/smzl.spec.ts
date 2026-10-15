/**
 * zh-CN walkthrough of the V4 case (SMZL coexisting with lung adenocarcinoma):
 * intro → case library → world → talk (suggested question → reply) →
 * lab workstation "血常规" → report → journal evidence → evidence board
 * decision → finish → debrief.
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
  // Not ordered yet: the button says it places an order (开具), not that it opens a record (调阅).
  await expect(candidate).toContainText("开具");
  await shot(page, "orders");
  await candidate.click();
  await expect(page.locator('#panel .window[data-panel="report"]')).toBeVisible();
  await expect(page.locator(".report-text")).not.toBeEmpty();
  await shot(page, "report");

  // an exam that belongs to another station → "go to" + waypoint (V4)
  await page.locator("#report-back").click();
  await page.locator("#exam-input").fill("骨髓活检");
  await page.locator("#exam-input").press("Enter");
  await expect(page.locator('.candidate.elsewhere[data-investigation="biopsy"]')).toContainText("请前往");

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
  await expect(card).toContainText("可以判断");
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
