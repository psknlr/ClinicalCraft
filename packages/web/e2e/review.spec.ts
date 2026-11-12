/**
 * Adversarial review regressions: keyboard & focus (T → chat input, digits
 * stay in inputs, Tab never leaves a window — also after a re-render —, the
 * approval dialog takes focus at once and Esc denies with the typed reason
 * whatever has focus), slash-command output in the chat, missing local
 * assets (placeholders, atlas reopened without leaking WebGL contexts),
 * toasts (hidden toast fully off-screen, newest kept in a burst, bottom
 * placement over windows, top on phones), the finished-case HUD, phone
 * layout (no HUD overlaps, settings/rubric inside the viewport) and API-key
 * handling (session-only by default, never in exports, transcripts or the
 * event log). A clean console (no errors / WebGL warnings) throughout, and a
 * strict CSP (no inline scripts / eval / handlers / style attributes).
 */
import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import fs from "node:fs";
import { dispatch, enterCase, freshStart, shot, talkToPatient } from "./helpers.js";

/** Console errors and warnings (WebGL warnings included). */
function watchConsole(page: Page): string[] {
  const out: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error" || m.type() === "warning") out.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => out.push(`pageerror: ${e.message}`));
  return out;
}

const active = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    return { id: a?.id ?? "", cls: String(a?.className ?? ""), inPanel: !!a?.closest("#panel"), inApproval: !!a?.closest("#approval"), body: a === document.body };
  });
const qaPanel = (page: Page) => page.evaluate(() => (window as any).__QA__.panel as string | null);

/**
 * A strict CSP on the page: no inline scripts, eval or inline event handlers, no style=""
 * attributes (styles go through CSSOM). Vite dev injects CSS as <style> elements, hence
 * style-src-elem 'unsafe-inline' (the production build passes with plain style-src 'self').
 */
const CSP =
  "default-src 'self'; script-src 'self'; style-src-elem 'self' 'unsafe-inline'; style-src-attr 'none'; img-src 'self' data: blob:; connect-src 'self' ws: https:; object-src 'none'; base-uri 'self'";

async function withCsp(page: Page): Promise<void> {
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), "content-security-policy": CSP } });
  });
  await page.addInitScript(() => {
    (window as any).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => (window as any).__csp.push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`));
  });
}

test.describe("keyboard, focus and approvals", () => {
  test.use({ locale: "en-US" });

  test("T/Esc/Tab/approval focus, slash commands, reset confirmation (STEMI, en, strict CSP)", async ({ page }) => {
    const consoleLog = watchConsole(page);
    await withCsp(page);
    await freshStart(page);
    // The intro backdrop is clinic-v4; STEMI rebuilds the world for general-hospital in the same WebGL context.
    await enterCase(page, "stemi-inferior-rv");
    await page.locator("#world").focus();

    // T opens the chat with the input focused synchronously: keys typed right away stay in it.
    const slot = await page.evaluate(() => (window as any).__QA__.app.slot);
    await page.keyboard.press("KeyT");
    await page.keyboard.type("4 5 m j b");
    expect(await qaPanel(page)).toBe("conversation");
    await expect(page.locator(".chat-input")).toHaveValue("4 5 m j b");
    expect(await page.evaluate(() => (window as any).__QA__.app.slot)).toBe(slot);
    // Esc inside the input closes the window and gives the keyboard back to the world.
    await page.keyboard.press("Escape");
    await expect(page.locator("#panel")).toBeHidden();
    expect((await active(page)).id).toBe("world");

    // Tab is trapped in the window (both directions).
    await page.keyboard.press("KeyJ");
    await expect(page.locator('#panel .window[data-panel="journal"]')).toBeVisible();
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press(i % 6 === 5 ? "Shift+Tab" : "Tab");
      expect((await active(page)).inPanel, `Tab #${i} left the journal`).toBe(true);
    }
    // Background is inert while a window is open.
    await expect(page.locator("#hud")).toHaveAttribute("inert", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("#hud")).not.toHaveAttribute("inert", "");

    // Focus survives a re-render (the examination list re-renders after the finding is recorded).
    await talkToPatient(page);
    await page.locator("#tab-exam").click();
    const finding = page.locator("[data-finding]:not([disabled])").first();
    const findingId = await finding.getAttribute("data-finding");
    await finding.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(`.exam-row.done [data-finding="${findingId}"]`)).toBeVisible();
    await expect.poll(async () => (await active(page)).id || (await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset?.finding ?? ""))).toBe(findingId);
    await page.keyboard.press("Tab");
    expect((await active(page)).inPanel).toBe(true);

    // Slash commands typed in the chat show their output in that conversation.
    await page.locator("#tab-talk").click();
    await page.locator(".chat-input").fill("/vitals");
    await page.locator(".chat-input").press("Enter");
    await expect(page.locator(".chat-log .msg.learner.tone-command")).toContainText("/vitals");
    await expect(page.locator(".chat-log .msg.system.tone-command").first()).not.toBeEmpty();
    await shot(page, "review-slash-command");

    // High-risk intervention: the dialog takes focus at once (Deny); Tab stays inside; the panel is inert.
    // (IV access first: an IV drug without a cannula is refused before any approval — EMBODIED §6 G7.)
    await page.locator("#tab-treat").click();
    await page.locator('[data-intervention="iv-access"]').click();
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.session.state.interventions.some((i: any) => i.interventionId === "iv-access"))).toBe(true);
    const lysis = page.locator('[data-intervention="tenecteplase"]');
    await lysis.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#approval")).toBeVisible();
    expect((await active(page)).id).toBe("approval-deny");
    await expect(page.locator("#panel")).toHaveAttribute("inert", "");
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press(i % 4 === 3 ? "Shift+Tab" : "Tab");
      expect((await active(page)).inApproval, `Tab #${i} left the approval dialog`).toBe(true);
    }
    // Esc denies and keeps the typed reason; focus goes back into the window underneath.
    await page.locator("#approval-reason").fill("PCI available — no lysis");
    await page.keyboard.press("Escape");
    await expect(page.locator("#approval")).toBeHidden();
    const resolved = await page.evaluate(() => {
      const log = (window as any).__QA__.store.log as any[];
      const e = [...log].reverse().find((x) => x.kind === "event" && x.event.msg.type === "approval_resolved");
      return { decision: e?.event.msg.decision, reason: e?.event.msg.reason };
    });
    expect(resolved).toEqual({ decision: "denied", reason: "PCI available — no lysis" });
    expect(await qaPanel(page)).toBe("conversation");
    await expect.poll(async () => (await active(page)).inPanel).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator("#panel")).toBeHidden();

    // A request while walking around (no window): Esc answers it even though the canvas has focus,
    // then the world resumes with the keyboard.
    await page.locator("#world").focus();
    await page.evaluate(() => (window as any).__QA__.act({ type: "intervene", interventionId: "tenecteplase" }));
    await expect(page.locator("#approval")).toBeVisible();
    expect(await page.evaluate(() => (window as any).__QA__.playing)).toBe(false);
    expect((await active(page)).id).toBe("approval-deny");
    await page.keyboard.press("Digit3");
    expect(await qaPanel(page)).toBeNull();
    await page.keyboard.press("Escape");
    await expect(page.locator("#approval")).toBeHidden();
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.playing)).toBe(true);
    expect((await active(page)).id).toBe("world");
    expect(await page.evaluate(() => (window as any).__QA__.session.state.interventions.some((i: any) => i.interventionId === "tenecteplase"))).toBe(false);

    // "Start over" confirmation: the initial focus is on Cancel, so Enter never wipes progress.
    await page.evaluate(() => (window as any).__QA__.route("pause"));
    await page.locator("#new-game").click();
    await expect(page.locator("#confirm-reset")).toBeVisible();
    expect((await active(page)).id).toBe("cancel-reset");
    await page.keyboard.press("Enter");
    expect(await qaPanel(page)).toBe("pause");
    expect(await page.evaluate(() => (window as any).__QA__.session.state.examined.length)).toBeGreaterThan(0);
    await page.keyboard.press("Escape");

    expect(await page.evaluate(() => (window as any).__csp)).toEqual([]);
    expect(consoleLog).toEqual([]);
  });
});

test.describe("assets, toasts and the finished HUD", () => {
  test.use({ locale: "zh-CN" });

  test("missing local assets → placeholders; atlas reopened 18× keeps the world's WebGL context; toasts (SMZL, zh)", async ({ page }) => {
    const consoleLog = watchConsole(page);
    await page.route("**/local-assets/**", (r) => r.fulfill({ status: 404, contentType: "application/json", body: '{"error":"not installed"}' }));
    await freshStart(page);

    // The hidden toast is completely out of view (no edge peeking at the top of the screen).
    const hiddenToast = await page.locator(".toast").evaluate((el) => ({ vis: getComputedStyle(el).visibility, bottom: el.getBoundingClientRect().bottom }));
    expect(hiddenToast.vis === "hidden" || hiddenToast.bottom <= 0).toBe(true);

    await enterCase(page, "smzl-lung-adeno");

    // A burst of toasts keeps the newest ones (burst-0 shows at once; burst-1…4 are dropped).
    await expect(page.locator(".toast.show")).toHaveCount(0, { timeout: 15_000 });
    // The hidden toast still slides out for 220 ms before the toaster is idle again.
    await page.waitForTimeout(400);
    // The page records each toast it shows. The sequence takes ≥ 9.7 s of the page's own timers, and
    // just after entering, a software-rendered world (SwiftShader) can hold them back for many seconds,
    // so no wall-clock poll decides it; the test timeout bounds it.
    const seen = await page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const toast = document.querySelector(".toast")!;
          const title = toast.querySelector(".toast-title")!;
          const shown: string[] = [];
          const done = () => {
            observer.disconnect();
            clearTimeout(guard);
            resolve(shown);
          };
          const note = () => {
            const t = title.textContent ?? "";
            if (toast.classList.contains("show") && t.startsWith("burst-") && shown[shown.length - 1] !== t) shown.push(t);
            if (shown[shown.length - 1] === "burst-7" || shown.length > 4) done();
          };
          // a toaster that never shows burst-7 fails here with what it did show
          const guard = setTimeout(done, 120_000);
          const observer = new MutationObserver(note);
          observer.observe(toast, { attributes: true, attributeFilter: ["class"], childList: true, characterData: true, subtree: true });
          const app = (window as any).__QA__.app;
          for (let i = 0; i < 8; i++) app.toast(`burst-${i}`, "");
          note();
        }),
    );
    expect(seen).toEqual(["burst-0", "burst-5", "burst-6", "burst-7"]);

    // Report figures: placeholders instead of broken images.
    // embodied mode: CT images are read at an imaging workstation — set-up reads it (this checks the placeholders)
    await dispatch(page, [{ type: "order", investigationId: "abdct" }, { type: "read", investigationId: "abdct" }]);
    await page.evaluate(() => (window as any).__QA__.route("report", { investigationId: "abdct", phase: "pre", back: { panel: "journal" } }));
    const tiles = page.locator(".report-images .image-tile");
    await expect(tiles.first()).toBeVisible();
    await expect(page.locator(".report-images .image-tile.missing")).toHaveCount(await tiles.count());
    await expect(page.locator(".report-images .image-tile.missing").first()).toBeDisabled();
    expect(await page.evaluate(() => [...document.querySelectorAll("#panel img")].filter((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth === 0).length)).toBe(0);

    // While a window is open a toast slides in at the bottom (it never covers the window title).
    await page.evaluate(() => (window as any).__QA__.app.toast("bottom-toast", "over the window footer"));
    await expect(page.locator(".toast.show .toast-title")).toHaveText("bottom-toast", { timeout: 15_000 });
    await page.waitForTimeout(300);
    const box = await page.locator(".toast").boundingBox();
    const head = await page.locator("#panel .window-head").boundingBox();
    expect(box!.y).toBeGreaterThan(head!.y + head!.height);
    await shot(page, "review-assets-missing-report");

    // The source PDF and diagnosis-bearing credits stay locked before the debrief.
    await page.evaluate(() => (window as any).__QA__.route("journal"));
    await expect(page.locator("#download-paper")).toBeDisabled();
    await page.locator("#source-btn").click();
    await expect(page.locator('#panel .window[data-panel="source"]')).toContainText("将在完成病例后开放");
    await expect(page.locator(".asset-status")).toHaveCount(0);
    await page.keyboard.press("Escape");

    // Atlas: "not installed" status; reopening it never exhausts WebGL contexts.
    await page.evaluate(() => (window as any).__QA__.route("atlas"));
    await expect(page.locator("#atlas-status")).toContainText(/import-v4|解剖|模型/, { timeout: 60_000 });
    await page.keyboard.press("Escape");
    for (let i = 0; i < 18; i++) {
      await page.evaluate(() => (window as any).__QA__.route("atlas"));
      await page.waitForTimeout(120);
      await page.evaluate(() => (window as any).__QA__.closePanel());
    }
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as any).__QA__.world.debug.renderer.getContext().isContextLost())).toBe(false);

    // Finished case: the quest card points at the review (not "go back to the board"), and of the
    // five chapters completed at once only the latest chapter toast is shown (no stale "next: …").
    const lastChapter = await page.evaluate(() => {
      const qa = (window as any).__QA__;
      const objectives = qa.game.caseDef.objectives;
      const title = objectives[objectives.length - 1].title;
      return typeof title === "string" ? title : title["zh-CN"];
    });
    await page.evaluate(() => {
      const qa = (window as any).__QA__;
      for (const a of qa.game.caseDef.solution) qa.dispatch(a);
    });
    await expect(page.locator(".toast.show .toast-title")).toContainText(lastChapter);
    await expect(page.locator("#chapter")).toHaveText("CASE CLOSED");
    await expect(page.locator("#quest-title")).toHaveText("病例已结束 · 查看复盘");
    await shot(page, "review-hud-finished");

    // After completion, missing media is still reported accurately in the unlocked credits.
    await page.evaluate(() => (window as any).__QA__.route("journal"));
    await expect(page.locator("#download-paper")).toBeDisabled();
    await page.locator("#source-btn").click();
    await expect(page.locator('#panel .window[data-panel="source"]')).toContainText("DOI");
    const assets = await page.evaluate(() => (window as any).__QA__.game.caseDef.assets.length);
    await expect(page.locator(".asset-status.missing")).toHaveCount(assets);

    expect(consoleLog.filter((l) => !/local-assets|404 \(Not Found\)/.test(l))).toEqual([]);
  });
});

test.describe("phone layout (390 px)", () => {
  test.use({ locale: "en-US", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("HUD without overlaps, toast at the top, settings and rubric inside the viewport (STEMI, en)", async ({ page }) => {
    await freshStart(page);
    await page.locator('.case-card[data-case="stemi-inferior-rv"]').scrollIntoViewIfNeeded();
    await enterCase(page, "stemi-inferior-rv");
    await expect(page.locator("#vitals-strip")).toBeVisible();
    await expect(page.locator(".touch-controls")).toBeVisible();

    // A toast on a phone stays at the top (it hid the vitals strip, hotbar and touch controls at the bottom).
    await page.evaluate(() => (window as any).__QA__.app.toast("top-toast", "phone"));
    await expect(page.locator(".toast.show .toast-title")).toHaveText("top-toast", { timeout: 15_000 });
    await page.waitForTimeout(300);
    expect((await page.locator(".toast").boundingBox())!.y).toBeLessThan(120);
    await shot(page, "review-mobile-hud");

    const overlaps = await page.evaluate(() => {
      const sel = ["#quest", "#minimap-btn", "#vitals-strip", "#hotbar", "#hud .touch-controls", "#hud .touch-actions", "#hud .hud-buttons"];
      const r = sel.map((s) => [s, document.querySelector(s)!.getBoundingClientRect()] as const);
      const out: string[] = [];
      for (let i = 0; i < r.length; i++)
        for (let j = i + 1; j < r.length; j++) {
          const a = r[i][1];
          const b = r[j][1];
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (w > 3 && h > 3) out.push(`${r[i][0]} ∩ ${r[j][0]}`);
        }
      return out;
    });
    expect(overlaps).toEqual([]);

    // Settings: long option labels never push a control off-screen; the language switch stays on one line.
    await page.evaluate(() => (window as any).__QA__.route("pause"));
    for (const id of ["#setting-pipeline", "#setting-approval", "#setting-scope", "#setting-quality"]) {
      const b = (await page.locator(id).boundingBox())!;
      expect(b.x + b.width, id).toBeLessThanOrEqual(390);
    }
    const zh = (await page.locator('[data-locale="zh-CN"]').boundingBox())!;
    expect(zh.height).toBeLessThan(48);
    await page.keyboard.press("Escape");

    // Debrief rubric: stacked rows inside the window (no horizontal overflow).
    await page.evaluate(() => {
      const qa = (window as any).__QA__;
      for (const a of qa.game.caseDef.solution) if (a.type !== "finish") qa.dispatch(a);
      qa.route("board");
    });
    await page.locator("#finish").click();
    await expect(page.locator(".rubric-table")).toBeVisible({ timeout: 60_000 });
    const fit = await page.evaluate(() => {
      const win = document.querySelector("#panel .window")!.getBoundingClientRect();
      const t = document.querySelector(".rubric-table")!.getBoundingClientRect();
      const body = document.querySelector("#panel .window-body") as HTMLElement;
      return { right: t.right, winRight: win.right, hScroll: body.scrollWidth > body.clientWidth + 1 };
    });
    expect(fit.right).toBeLessThanOrEqual(fit.winRight);
    expect(fit.hScroll).toBe(false);
    await page.locator(".rubric-table").scrollIntoViewIfNeeded();
    await shot(page, "review-mobile-rubric");
    await page.keyboard.press("Escape");
    // Finished: the quest card says so and no banner sits on top of it on a phone.
    await expect(page.locator("#quest-title")).toHaveText("Case finished · read your review");
    expect(await page.evaluate(() => (window as any).__QA__.playing)).toBe(true);
    await expect(page.locator("#hud .finished-banner")).toBeHidden();
  });
});

test.describe("API keys", () => {
  test.use({ locale: "en-US" });

  test("direct-mode key: session-only by default, opt-in remember, never in saves/exports/transcripts", async ({ page, context }) => {
    const KEY = "sk-ant-api03-E2E-QA-KEY-0123456789";
    const keyed: string[] = [];
    // No real network: every external request is answered 401 (and recorded when it carries the key).
    await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => {
      const req = route.request();
      if (Object.values(req.headers()).some((v) => v.includes(KEY))) keyed.push(new URL(req.url()).host);
      return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }) });
    });
    await freshStart(page);
    const storage = () => page.evaluate(() => ({ local: JSON.stringify({ ...localStorage }), session: JSON.stringify({ ...sessionStorage }) }));

    await page.locator("#intro-llm").click();
    await page.locator("#llm-mode-direct").check();
    await page.locator("#direct-provider").selectOption("anthropic");
    await page.locator("#direct-key").fill(KEY);
    await page.locator("#direct-key").press("Tab");
    let s = await storage();
    expect(s.local).not.toContain(KEY);
    expect(s.session).toContain(KEY);
    await page.locator("#direct-remember").check();
    expect((await storage()).local).toContain(KEY);
    await page.locator("#direct-remember").uncheck();
    expect((await storage()).local).not.toContain(KEY);
    await page.keyboard.press("Escape");
    await expect(page.locator("#intro-llm")).toContainText("Anthropic");

    await enterCase(page, "smzl-lung-adeno");
    await talkToPatient(page);
    await page.locator(".chat-input").fill("Where does it hurt?");
    await page.locator(".chat-input").press("Enter");
    // The provider error (401) falls back to the deterministic reply — the learner still gets an answer.
    await expect(page.locator(".chat-log .msg.agent").first()).toBeVisible({ timeout: 60_000 });
    expect(keyed.every((h) => h === "api.anthropic.com")).toBe(true);
    await page.keyboard.press("Escape");

    const downloads: string[] = [];
    page.on("download", async (d) => downloads.push(fs.readFileSync((await d.path())!, "utf8")));
    await page.evaluate(() => (window as any).__QA__.app.exportRecord());
    await page.evaluate(() => (window as any).__QA__.app.exportSave());
    await expect.poll(() => downloads.length).toBe(2);
    for (const text of downloads) expect(text).not.toContain(KEY);
    const dumps = await page.evaluate(() => {
      const qa = (window as any).__QA__;
      const t = qa.game.session.transcript;
      return [JSON.stringify(t.items ?? t.memory?.items ?? []), JSON.stringify(qa.store.log), JSON.stringify(qa.game.session.settings), JSON.stringify({ ...localStorage })];
    });
    for (const d of dumps) expect(d).not.toContain(KEY);
    // No inline event-handler attributes anywhere (CSP without 'unsafe-inline' scripts).
    expect(await page.evaluate(() => [...document.querySelectorAll("*")].some((el) => [...el.attributes].some((a) => /^on/i.test(a.name))))).toBe(false);
  });
});
