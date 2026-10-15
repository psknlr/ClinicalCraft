/**
 * Proxy mode against a mocked `clinicalcraft serve`: GET /api/health and
 * /api/providers are answered, POST /api/llm/stream streams StreamEvents as
 * SSE, transcripts are POSTed to /api/transcripts/:id. Verifies the browser
 * session uses the proxy (no key in the page), streams replies into the chat
 * and the badge/pill show the upstream model.
 */
import { expect, test, type Route } from "@playwright/test";
import { enterCase, freshStart, shot, talkToPatient } from "./helpers.js";

test.use({ locale: "zh-CN" });

function sse(events: unknown[]): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "event: done\ndata: {}\n\n";
}

test("proxy mode streams model replies through /api/llm/stream", async ({ page }) => {
  const llmBodies: any[] = [];
  let transcriptPosts = 0;
  await page.route("**/api/health", (r) => r.fulfill({ json: { ok: true, name: "clinicalcraft", version: "5.0.0" } }));
  await page.route("**/api/providers", (r) =>
    r.fulfill({ json: { providers: [{ id: "zhipu", name: { "zh-CN": "智谱 GLM", en: "Zhipu GLM" }, configured: true, defaultModel: "glm-4.6", models: ["glm-4.6", "glm-5"] }] } }),
  );
  await page.route("**/api/transcripts/**", (r) => {
    transcriptPosts++;
    return r.fulfill({ status: 204, body: "" });
  });
  await page.route("**/api/llm/stream", async (r: Route) => {
    const body = JSON.parse(r.request().postData() ?? "{}");
    llmBodies.push(body);
    const json = !!body.request?.responseFormat;
    const text = json ? JSON.stringify({ say: "嗯……左上腹这边不太舒服。", nonverbal: "", usedFactIds: [], affectHint: null }) : "（代理模型）我在，生命体征请看床旁监护仪。";
    const chunks = text.match(/.{1,6}/gsu) ?? [text];
    await r.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream" },
      body: sse([{ type: "start", model: body.model }, ...chunks.map((c) => ({ type: "text_delta", text: c })), { type: "finish", stopReason: "end_turn", usage: { inputTokens: 10, outputTokens: chunks.length } }]),
    });
  });

  await freshStart(page);
  await expect.poll(() => page.evaluate(() => (window as any).__QA__.app.server?.served ?? null), { timeout: 15_000 }).toBe(true);
  await page.locator("#intro-llm").click();
  await page.locator("#llm-mode-proxy").check();
  await expect(page.locator("#proxy-provider")).toBeVisible();
  await page.locator("#proxy-provider").selectOption("zhipu");
  await expect(page.locator("#section-llm .ok-text")).toBeVisible();
  await shot(page, "proxy-settings");
  await page.keyboard.press("Escape");
  await expect(page.locator("#intro-llm")).toContainText("代理");

  await enterCase(page, "smzl-lung-adeno");
  await expect(page.locator("#hud-llm")).toContainText("代理");
  await talkToPatient(page);
  await expect(page.locator(".llm-badge.online")).toBeVisible();
  await page.locator(".chat-input").fill("哪里不舒服？");
  await page.locator(".chat-input").press("Enter");
  await expect(page.locator(".chat-log .msg.agent").first()).toBeVisible({ timeout: 60_000 });
  await page.locator(".chat-input").fill("@护士 现在情况怎么样？");
  await page.locator(".chat-input").press("Enter");
  await expect(page.locator(".chat-log .msg.agent-nurse .bubble").last()).toContainText("代理模型", { timeout: 60_000 });
  await shot(page, "proxy-conversation");

  expect(llmBodies.length).toBeGreaterThan(0);
  for (const b of llmBodies) {
    expect(b.provider).toBe("zhipu");
    expect(JSON.stringify(b)).not.toMatch(/apiKey|sk-[a-z0-9]/i);
  }
  await expect.poll(() => transcriptPosts, { timeout: 15_000 }).toBeGreaterThan(0);
});
