/**
 * Camera frames for a vision model (EMBODIED §4) in proxy mode: a mocked
 * `clinicalcraft serve` offers anthropic / claude-opus-5-5; the clinician's
 * first request offers `get_camera_frame`, the model calls it, and the next
 * request carries the avatar's view as a JPEG (≤ 768 px wide, viewport
 * only) inside the tool result.
 */
import { expect, test, type Route } from "@playwright/test";
import { embodiedSetup, enterCase, freshStart, placeAvatar, shot } from "./helpers.js";

test.use({ locale: "en-US" });

function sse(events: unknown[]): string {
  return events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("") + "event: done\ndata: {}\n\n";
}

/** Width × height of a baseline/progressive JPEG (its SOF marker). */
function jpegSize(b64: string): { width: number; height: number } | null {
  const buf = Buffer.from(b64, "base64");
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1]!;
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

type Part = { type: string; images?: { mediaType: string; data: string }[] };

test("(d) a vision model's get_camera_frame puts the avatar's view in its next request", async ({ page }) => {
  const clinician: any[] = [];
  let called = false;
  await page.route("**/api/health", (r) => r.fulfill({ json: { ok: true, name: "clinicalcraft", version: "5.0.0" } }));
  await page.route("**/api/providers", (r) =>
    r.fulfill({ json: { providers: [{ id: "anthropic", name: { "zh-CN": "Anthropic", en: "Anthropic" }, configured: true, defaultModel: "claude-opus-5-5", models: ["claude-opus-5-5"] }] } }),
  );
  await page.route("**/api/transcripts/**", (r) => r.fulfill({ status: 204, body: "" }));
  await page.route("**/api/llm/stream", async (r: Route) => {
    const body = JSON.parse(r.request().postData() ?? "{}");
    const tools: string[] = (body.request?.tools ?? []).map((t: { name: string }) => t.name);
    let events: unknown[];
    if (tools.includes("get_camera_frame")) {
      clinician.push(body);
      if (!called) {
        called = true;
        events = [
          { type: "start", model: body.model },
          { type: "tool_call_start", id: "cam-1", name: "get_camera_frame", index: 0 },
          { type: "tool_call", id: "cam-1", name: "get_camera_frame", args: { max_width: 1024 }, index: 0 },
          { type: "finish", stopReason: "tool_use", usage: { inputTokens: 50, outputTokens: 10 } },
        ];
      } else events = [{ type: "start", model: body.model }, { type: "text_delta", text: "I can see the resuscitation bay." }, { type: "finish", stopReason: "end_turn", usage: { inputTokens: 60, outputTokens: 8 } }];
    } else {
      const json = !!body.request?.responseFormat;
      const text = json ? JSON.stringify({ say: "It hurts in the middle of my chest.", nonverbal: "", usedFactIds: [], affectHint: null }) : "OK.";
      events = [{ type: "start", model: body.model }, { type: "text_delta", text }, { type: "finish", stopReason: "end_turn", usage: { inputTokens: 10, outputTokens: 3 } }];
    }
    await r.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse(events) });
  });

  await freshStart(page);
  await expect.poll(() => page.evaluate(() => (window as any).__QA__.app.server?.served ?? null), { timeout: 15_000 }).toBe(true);
  await page.locator("#intro-llm").click();
  await page.locator("#llm-mode-proxy").check();
  await page.locator("#proxy-provider").selectOption("anthropic");
  await page.locator("#proxy-model").fill("claude-opus-5-5");
  await page.locator("#proxy-model").blur();
  await expect.poll(() => page.evaluate(() => (window as any).__QA__.app.choice())).toMatchObject({ provider: "proxy:anthropic", model: "claude-opus-5-5" });
  await expect(page.locator("#section-llm .ok-text")).toBeVisible();
  await page.keyboard.press("Escape");
  await enterCase(page, "stemi-inferior-rv");
  await embodiedSetup(page, { bypassApprovals: true });
  await placeAvatar(page, 30.25, -14.0, { x: 31, z: -17.3 });

  // the sensor itself: the viewport only, capped at 768 px, with the camera pose
  const direct = await page.evaluate(() => (window as any).__QA__.cameraFrame(4096));
  expect(direct.width).toBeLessThanOrEqual(768);
  expect(direct.mimeType).toBe("image/jpeg");
  expect(direct.cameraPose).toMatchObject({ x: expect.closeTo(30.25, 1), z: expect.closeTo(-14, 1), level: "L0" });
  expect(jpegSize(direct.imageData)).toEqual({ width: direct.width, height: direct.height });

  await page.locator("#autopilot-btn").click();
  await page.locator("#autopilot-goal").fill("Look at the patient");
  await page.locator("#autopilot-start").click();
  await expect.poll(() => clinician.length, { timeout: 120_000 }).toBeGreaterThanOrEqual(2);
  const parts: Part[] = clinician[1].request.messages.flatMap((m: { content: Part[] }) => m.content);
  const result = parts.find((p) => p.type === "tool_result" && p.images?.length);
  expect(result).toBeTruthy();
  const image = result!.images![0]!;
  expect(image.mediaType).toBe("image/jpeg");
  const size = jpegSize(image.data);
  expect(size).not.toBeNull();
  expect(size!.width).toBeLessThanOrEqual(768);
  expect(size!.width).toBeGreaterThan(64);
  // the first request offered the camera to the vision model; no frame went out before it was asked for
  expect(JSON.stringify(clinician[0].request.messages)).not.toContain('"images"');
  expect(await page.evaluate(() => (window as any).__QA__.app.camera.captures)).toBeGreaterThanOrEqual(2);
  await shot(page, "embodied-camera");
  const stop = page.locator("#autopilot-stop");
  if (await stop.isVisible()) await stop.click();
});
