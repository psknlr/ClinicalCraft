/**
 * The live screens drawn in the 3D world show what the world says the device is connected to now (audit 2026-11-12
 * P2-13; docs/EMBODIED.md §6, THE screen rule, the device's side): the STEMI patient lies in resus 1 of the general
 * hospital. The ECG cart of resus 2, wheeled to her and its leads connected, shows her — the bedside snapshot the
 * monitor panel shows and the engine holds —; wheeled back to resus 2 its leads come off and it shows nobody. Her own
 * bed's cart, idle or only prepared, shows nobody; connected, her; wheeled to resus 2, nobody (unplugged); wheeled
 * back, nobody until its leads are connected again, then her. Before, a screen kept the bed it was
 * built beside: the moved cart asked for resus 2's patient (none: "no patient") and the cart wheeled away kept her
 * vitals. Assertions read the renderer's screen records (`__QA__.world.debug.screens`: whose vitals each screen drew
 * last, and the snapshot it drew), the world model's answer, the engine's snapshot and the monitor panel — not pixels.
 */
import { expect, test, type Page } from "@playwright/test";
import { embodiedSetup, enterCase, freshStart, placeAvatar, shot, toPatientSide } from "./helpers.js";

const CASE = "stemi-inferior-rv";
const SLOT = "resus-1";
const PATIENT = `patient:${SLOT}`;
const MONITOR = "resus1-monitor";

/** A screen as last drawn, the world's answer for its device and the engine's bedside snapshot, in one read. */
async function screen(page: Page, placementId: string) {
  return page.evaluate((id) => {
    const qa = (window as any).__QA__;
    const sc = qa.world.debug.screens.find((s: any) => s.placementId === id);
    const pick = (v: any) =>
      v
        ? {
            minute: v.minute,
            monitorAttached: v.monitorAttached ?? null,
            ecgAttached: v.ecgAttached ?? null,
            hr: v.vitals.hr ?? null,
            sbp: v.vitals.sbp ?? null,
            dbp: v.vitals.dbp ?? null,
            spo2: v.vitals.spo2 ?? null,
            rhythm: v.vitals.rhythm ?? null,
            alarms: (v.alarms ?? []).map((a: any) => `${a.vital}:${a.level}:${Math.round(a.value * 10) / 10}`),
          }
        : null;
    return {
      built: (sc?.slotId ?? null) as string | null,
      showing: (sc?.showing ?? null) as string | null,
      shown: pick(sc?.shown ?? null),
      engine: pick(qa.store.snapshot?.vitals ?? null),
      world: qa.worldModel.screenPatient(`eq:${id}`) as string | null,
    };
  }, placementId);
}

/** "same" once the screen draws the patient's bedside exactly as the engine holds it now; else what it shows. */
async function sameAsEngine(page: Page, placementId: string) {
  const s = await screen(page, placementId);
  return s.showing === SLOT && s.world === PATIENT && s.shown !== null && JSON.stringify(s.shown) === JSON.stringify(s.engine) ? "same" : s;
}

/** "nobody" once the screen draws no patient (and the world says it shows nobody); else what it shows. */
async function nobody(page: Page, placementId: string) {
  const s = await screen(page, placementId);
  return s.showing === null && s.shown === null && s.world === null ? "nobody" : s;
}

/**
 * "agree" once the monitor panel (open, live), the HUD strip and the screen's last drawing read the same: heart rate,
 * blood pressure and the alarms the panel lists (as the panel lists them: none for a vital it cannot read).
 */
async function panelAgrees(page: Page, placementId: string) {
  const r = await page.evaluate((id) => {
    const qa = (window as any).__QA__;
    const v = qa.world.debug.screens.find((s: any) => s.placementId === id)?.shown;
    const text = (k: string) => document.querySelector(`#vitals-strip [data-vital="${k}"] b`)?.textContent ?? null;
    const unread = new Set(v?.unmeasurable ?? []);
    return {
      panel: document.querySelector("#monitor-screen")?.getAttribute("data-screen") ?? null,
      strip: { hr: text("hr"), bp: text("bp") },
      listed: document.querySelectorAll("#panel .alarm-list li.alarm").length,
      screen: v
        ? {
            hr: String(Math.round(v.vitals.hr)),
            bp: `${Math.round(v.vitals.sbp)}/${Math.round(v.vitals.dbp)}`,
            alarms: (v.alarms ?? []).filter((a: any) => a.vital === "hr" || !unread.has(a.vital)).length,
          }
        : null,
    };
  }, placementId);
  return r.panel === "live" && r.screen && r.strip.hr === r.screen.hr && r.strip.bp === r.screen.bp && r.listed === r.screen.alarms ? "agree" : r;
}

/** Open the monitor panel (`V`), compare it with a screen's drawing, close it. */
async function checkPanel(page: Page, placementId: string): Promise<void> {
  await page.locator("#world").focus();
  await page.keyboard.press("KeyV");
  await expect(page.locator('#panel .window[data-panel="monitor"]')).toBeVisible();
  await expect.poll(() => sameAsEngine(page, placementId), { timeout: 30_000 }).toBe("same");
  await expect.poll(() => panelAgrees(page, placementId), { timeout: 30_000 }).toBe("agree");
  await page.keyboard.press("Escape");
  await expect(page.locator("#panel")).toBeHidden();
}

/** Stand at a cart and wheel it to `goal` through the world (`move_to`); wait until every body has stopped. */
async function wheel(page: Page, cart: string, goal: { kind: "interact"; id: string }): Promise<void> {
  const at = await page.evaluate((id) => {
    const plan = (window as any).__QA__.worldModel.plan("actor:clinician", { kind: "interact", id });
    if (!plan.ok) throw new Error(`no way to ${id}: ${plan.code}`);
    return { x: plan.target.x as number, z: plan.target.z as number };
  }, `eq:${cart}`);
  await placeAvatar(page, at.x, at.z);
  const r = await page.evaluate(({ id, goal }) => (window as any).__QA__.worldAction({ operation: "move_to", targetId: id, goal }), { id: `eq:${cart}`, goal });
  expect(r?.status, r?.message).toBe("completed");
  await expect.poll(() => page.evaluate(() => (window as any).__QA__.moving.length), { timeout: 120_000 }).toBe(0);
}

/** The learner's operations on a device, through the UI's path (a short step is taken for them). */
async function operate(page: Page, placementId: string, operations: string[]): Promise<void> {
  for (const operation of operations) {
    const r = await page.evaluate(({ id, operation }) => (window as any).__QA__.worldAction({ operation, targetId: id }), { id: `eq:${placementId}`, operation });
    expect(r?.status, `${operation}: ${r?.message}`).toBe("completed");
  }
}

const stateOf = (page: Page, placementId: string) => page.evaluate((id) => (window as any).__QA__.worldModel.stateOf(`eq:${id}`), placementId);

test.describe("live screens follow the world (en)", () => {
  test.use({ locale: "en-US" });

  test("a cart wheeled from another bed and connected shows the patient; wheeled away, nobody", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page, { bypassApprovals: true });
    // the bedside monitor attached first (the world's `attach`): her snapshot is live, on the panel and the HUD strip
    await toPatientSide(page);
    await operate(page, MONITOR, ["attach"]);
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.store.snapshot?.vitals?.monitorAttached ?? null), { timeout: 60_000 }).toBe(true);

    // as built: her monitor shows her; resus 2's cart (built beside resus 2) and her own idle cart show nobody
    expect((await screen(page, "resus2-ecg")).built).toBe("resus-2");
    expect((await screen(page, "resus1-ecg")).built).toBe(SLOT);
    await expect.poll(() => sameAsEngine(page, MONITOR), { timeout: 30_000 }).toBe("same");
    await expect.poll(() => nobody(page, "resus2-ecg"), { timeout: 30_000 }).toBe("nobody");
    await expect.poll(() => nobody(page, "resus1-ecg"), { timeout: 30_000 }).toBe("nobody");

    // resus 2's cart wheeled to her and the leads attached: it shows her — what the panel shows, what the engine holds
    await wheel(page, "resus2-ecg", { kind: "interact", id: PATIENT });
    await expect.poll(() => nobody(page, "resus2-ecg"), { timeout: 30_000 }).toBe("nobody"); // by her bed, idle: nothing on her yet
    await operate(page, "resus2-ecg", ["prepare"]);
    await expect.poll(() => nobody(page, "resus2-ecg"), { timeout: 30_000 }).toBe("nobody"); // prepared: no leads on her yet
    await operate(page, "resus2-ecg", ["connect"]);
    expect(await stateOf(page, "resus2-ecg")).toBe("connected");
    await expect.poll(() => sameAsEngine(page, "resus2-ecg"), { timeout: 30_000 }).toBe("same");
    expect((await screen(page, "resus2-ecg")).built).toBe("resus-2");
    await checkPanel(page, "resus2-ecg");
    const home = await page.evaluate(() => (window as any).__QA__.worldModel.entity("eq:resus2-ecg").position);
    const now = await page.evaluate(() => (window as any).__QA__.worldSnapshot().entities["eq:resus2-ecg"].position);
    expect(Math.hypot(now.x - home.x, now.z - home.z)).toBeGreaterThan(3); // far from the bed it was built beside
    await placeAvatar(page, now.x + 1.2, now.z + 1.8, { x: now.x, z: now.z });
    await shot(page, "screens-cart-connected");

    // wheeled back to resus 2 (the leads off: "prepared"): it shows nobody, while her monitor, the panel and the engine go on
    await wheel(page, "resus2-ecg", { kind: "interact", id: "eq:resus2-monitor" });
    expect(await stateOf(page, "resus2-ecg")).toBe("prepared");
    await expect.poll(() => nobody(page, "resus2-ecg"), { timeout: 30_000 }).toBe("nobody");
    await toPatientSide(page);
    await checkPanel(page, MONITOR);
    await expect.poll(() => nobody(page, "resus2-ecg"), { timeout: 30_000 }).toBe("nobody");

    // and again with her own bed's cart: connected, her; wheeled to resus 2, nobody (unplugged); wheeled back, nobody
    // until its leads are connected again, then her
    await operate(page, "resus1-ecg", ["prepare", "connect"]);
    await expect.poll(() => sameAsEngine(page, "resus1-ecg"), { timeout: 30_000 }).toBe("same");
    await wheel(page, "resus1-ecg", { kind: "interact", id: "eq:resus2-monitor" });
    expect(await stateOf(page, "resus1-ecg")).toBe("prepared");
    await expect.poll(() => nobody(page, "resus1-ecg"), { timeout: 30_000 }).toBe("nobody");
    expect((await screen(page, "resus1-ecg")).built).toBe(SLOT);
    await wheel(page, "resus1-ecg", { kind: "interact", id: PATIENT });
    await expect.poll(() => nobody(page, "resus1-ecg"), { timeout: 30_000 }).toBe("nobody");
    await operate(page, "resus1-ecg", ["connect"]);
    await expect.poll(() => sameAsEngine(page, "resus1-ecg"), { timeout: 30_000 }).toBe("same");
    await checkPanel(page, "resus1-ecg");
    expect(errors).toEqual([]);
  });
});
