/**
 * Shared e2e helpers: fresh start, entering a case, QA-driven movement and
 * screenshots (CC_SHOTS=<dir> to keep them; default test-results/shots).
 */
import { expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SHOTS = process.env.CC_SHOTS || path.join(here, "..", "test-results", "shots");

export async function shot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(SHOTS, `ui-${name}.png`) });
}

/** Open the app in QA mode with empty storage. */
export async function freshStart(page: Page): Promise<void> {
  await page.goto("/?qa");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await expect(page.locator("#intro")).toBeVisible();
  await expect(page.locator("#enter")).toBeEnabled({ timeout: 180_000 });
}

/** Select a case card in the library and enter the world. */
export async function enterCase(page: Page, caseId: string): Promise<void> {
  await page.locator(`.case-card[data-case="${caseId}"]`).click();
  await expect(page.locator(`.case-card[data-case="${caseId}"]`)).toHaveAttribute("aria-selected", "true");
  await page.locator("#enter").click();
  await page.waitForFunction(() => (window as unknown as { __QA__?: { game?: { entered?: boolean } } }).__QA__?.game?.entered === true, null, { timeout: 180_000 });
  await expect(page.locator("#hud")).toBeVisible();
}

/** Teleport next to the case patient and "press E" on them. */
export async function talkToPatient(page: Page): Promise<void> {
  await page.evaluate(() => {
    const qa = (window as any).__QA__;
    const game = qa.game;
    const slot = game.facility.patientSlots.find((s: { id: string }) => s.id === game.slotId);
    const loc = qa.world.locate(slot.id) ?? slot;
    qa.world.teleport(loc.x, loc.z + 2, 0);
    qa.interact({ kind: "patient", slotId: slot.id, caseId: game.caseDef.id, name: "patient", hint: "" });
  });
  await expect(page.locator('#panel .window[data-panel="conversation"]')).toBeVisible();
}

/**
 * Teleport to the workstation/device providing every capability nearest to the case's patient (embodied
 * mode: a bedside device is used at the bedside) and interact with it.
 */
export async function useStation(page: Page, caps: string[], kind: "workstation" | "device"): Promise<string> {
  const id = await page.evaluate(
    ({ caps, kind }) => {
      const qa = (window as any).__QA__;
      const game = qa.game;
      const slot = game.facility.patientSlots.find((s: { id: string }) => s.id === game.slotId);
      const dist = (p: any) => (slot ? Math.hypot(p.x - slot.x, p.z - slot.z) : 0);
      const list = game.stations
        .providersOf(caps)
        .filter((p: any) => game.stations.kindOf(p) === kind)
        .sort((a: any, b: any) => dist(a) - dist(b));
      const p = list[0];
      if (!p) throw new Error(`no ${kind} providing ${caps.join(",")}`);
      qa.world.teleport(p.x, p.z + 1.6, 0);
      qa.game.embodied?.syncPose();
      qa.interact({ kind: "equipment", placementId: p.id, type: p.type, interaction: kind, capabilities: game.stations.caps(p.id), name: p.id, hint: "", room: p.room ?? null });
      return p.id as string;
    },
    { caps, kind },
  );
  return id;
}

/** Deterministic engine actions without the approval gate (test set-up only). */
export async function dispatch(page: Page, actions: unknown[]): Promise<void> {
  await page.evaluate((list) => {
    const qa = (window as any).__QA__;
    for (const a of list) qa.dispatch(a);
  }, actions);
}

/** Embodied-mode set-up: low render quality (SwiftShader walks and renders faster); approvals bypassed when asked. */
export async function embodiedSetup(page: Page, opts: { bypassApprovals?: boolean } = {}): Promise<void> {
  await page.evaluate((bypass) => {
    const qa = (window as any).__QA__;
    qa.app.prefs.update((s: any) => (s.ui.quality = "low"));
    if (bypass) qa.submit({ type: "configure", patch: { approvalMode: "bypass" } });
  }, !!opts.bypassApprovals);
  expect(await page.evaluate(() => (window as any).__QA__.embodiment)).toBe("embodied");
}

/** Put the avatar at (x, z) facing (fx, fz) and hand the pose to the world model (the avatar is its input device). */
export async function placeAvatar(page: Page, x: number, z: number, face?: { x: number; z: number }): Promise<void> {
  await page.evaluate(
    ({ x, z, face }) => {
      const qa = (window as any).__QA__;
      const yaw = face ? Math.atan2(-(face.x - x), -(face.z - z)) : 0;
      qa.world.debug.teleport(x, z, 0, yaw, 0);
      qa.game.embodied?.syncPose();
    },
    { x, z, face },
  );
  await expect
    .poll(() => page.evaluate(() => (window as any).__QA__.worldSnapshot()?.actors.find((a: any) => a.id === "actor:clinician")?.pose ?? null))
    .toMatchObject({ x: expect.closeTo(x, 1), z: expect.closeTo(z, 1) });
}

/** The world model's pose of an actor (`actor:clinician`, `staff:<id>`). */
export async function worldPose(page: Page, actorId = "actor:clinician"): Promise<{ x: number; z: number; level: string; yaw: number }> {
  return page.evaluate((id) => (window as any).__QA__.worldSnapshot().actors.find((a: any) => a.id === id).pose, actorId);
}

/** Trace spans as `kind:name:ok|x[:code]` (the episode trace, newest last). */
export async function traceLines(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__QA__.traceSpans().map((s: any) => `${s.kind}:${s.name}:${s.ok ? "ok" : "x"}${s.refs.errorCode ? `:${s.refs.errorCode}` : ""}`));
}
