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

/** Teleport to the nearest workstation/device providing every capability and interact with it. */
export async function useStation(page: Page, caps: string[], kind: "workstation" | "device"): Promise<string> {
  const id = await page.evaluate(
    ({ caps, kind }) => {
      const qa = (window as any).__QA__;
      const game = qa.game;
      const list = game.stations.providersOf(caps).filter((p: any) => game.stations.kindOf(p) === kind);
      const p = list[0];
      if (!p) throw new Error(`no ${kind} providing ${caps.join(",")}`);
      qa.world.teleport(p.x, p.z + 1.6, 0);
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
