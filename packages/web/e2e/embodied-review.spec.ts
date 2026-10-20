/**
 * Embodied UI review (docs/EMBODIED.md §2.1, §6): the UI never shows more than
 * the world lets the learner perceive, and every refusal has a way forward.
 *
 *   (m) the monitor panel and the HUD's vitals strip show the live screen only
 *       where the world says it can be read — behind the resus wall they say
 *       why and offer the way there; walking there brings the screen back
 *   (n) staff are named (the nurse called with @nurse is Lin Xiao, with her
 *       delegate tasks); a delegation reads as a sentence, not a command
 *   (o) a lab test is ordered at the patient's side (the sample is taken
 *       there): the lab station says so before anything is placed, with the
 *       way to the patient; the patient's window orders it; nothing claims an
 *       order was sent when it was not
 *   (p) the aim ray does not reach equipment through a wall
 */
import { expect, test, type Page } from "@playwright/test";
import { dispatch, embodiedSetup, enterCase, freshStart, placeAvatar, shot, toPatientSide, traceLines } from "./helpers.js";

const CASE = "stemi-inferior-rv";
/** general-hospital: the resus-1 bed and its monitor (29.65, -19.475, in the resus room). */
const SLOT = { x: 31, z: -17.325 };
const MONITOR = { x: 29.65, z: -19.475 };
const BEDSIDE = { x: 30.1, z: -18.75 };
/** The north corridor behind the resus room's wall: within 6 m of the monitor, no line of sight. */
const BEHIND_WALL = { x: 30.5, z: -21.9 };

/** Strongly green pixels on the monitor panel's canvas (the ECG sweep and HR digits are #3dff7a). */
async function greenPixels(page: Page): Promise<number> {
  return page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>("#panel .monitor-canvas");
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return -1;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 1]! > 200 && d[i]! < 120 && d[i + 2]! < 170) n++;
    return n;
  });
}

test.describe("embodied review (en)", () => {
  test.use({ locale: "en-US" });

  test("(m) the monitor's live screen only where the world says it can be read", async ({ page }) => {
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page, { bypassApprovals: true });
    await dispatch(page, [{ type: "intervene", interventionId: "cardiac-monitoring" }]);
    const strip = page.locator("#vitals-strip");

    // at the bedside: the live screen, in the panel and on the strip
    await placeAvatar(page, BEDSIDE.x, BEDSIDE.z, SLOT);
    await expect(strip.locator('[data-vital="hr"]')).toBeVisible();
    await expect(strip).not.toHaveClass(/out-of-view/);
    await page.locator("#world").focus();
    await page.keyboard.press("KeyV");
    await expect(page.locator("#monitor-screen")).toHaveAttribute("data-screen", "live");
    await expect.poll(() => greenPixels(page)).toBeGreaterThan(50);
    await page.keyboard.press("Escape");

    // behind the resus wall: within 6 m of the monitor, no line of sight — no reading anywhere
    await placeAvatar(page, BEHIND_WALL.x, BEHIND_WALL.z, MONITOR);
    await expect(strip).toHaveClass(/out-of-view/);
    await expect(strip.locator('[data-vital="hr"]')).toHaveCount(0);
    await expect(strip.locator('[data-vital="monitor"]')).toContainText("OUT OF VIEW");
    await shot(page, "review-strip-out-of-view");
    await page.locator("#world").focus();
    await page.keyboard.press("KeyV");
    await expect(page.locator("#monitor-screen")).toHaveAttribute("data-screen", "out-of-view");
    await expect(page.locator("#monitor-out-of-view")).toContainText("Resus Monitor 1");
    await expect(page.locator(".alarm-list .alarm")).toHaveCount(0);
    await page.waitForTimeout(400);
    expect(await greenPixels(page)).toBe(0);
    await shot(page, "review-monitor-out-of-view");

    // the way there: the world plans the walk round to the monitor; the screen comes back in the open panel
    await page.locator("#monitor-go").click();
    await expect(page.locator("#monitor-screen")).toHaveAttribute("data-screen", "live", { timeout: 120_000 });
    await expect.poll(() => greenPixels(page)).toBeGreaterThan(50);
    const there = await page.evaluate(() => (window as any).__QA__.worldSnapshot().actors.find((a: any) => a.id === "actor:clinician").pose);
    expect(there.z).toBeGreaterThan(-20);
    await shot(page, "review-monitor-back-in-view");
  });

  test("(n) staff are named, and a delegation reads as a sentence", async ({ page }) => {
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page, { bypassApprovals: true });
    await toPatientSide(page);
    await page.evaluate(() => {
      const qa = (window as any).__QA__;
      qa.interact({ kind: "patient", slotId: qa.game.slotId, caseId: qa.game.caseDef.id, name: "patient", hint: "" });
    });
    await expect(page.locator('#panel .window[data-panel="conversation"]')).toBeVisible();
    // "@nurse" alone opens the nurse's window: the nurse at this patient's bed is Lin Xiao
    await page.locator(".chat-input").fill("@nurse");
    await page.locator(".chat-input").press("Enter");
    await expect(page.locator("#panel-title")).toHaveText("Talk · Lin Xiao");
    await expect(page.locator(".convo-side")).toContainText("Nurse · Lin Xiao");
    await expect(page.locator(".chat-empty")).toContainText("Ask Lin Xiao.");
    await expect(page.locator(".chat-input")).toHaveAttribute("placeholder", /Say something to Lin Xiao/);
    // her delegate tasks are offered here too
    await page.locator('#delegate-chips button[data-task="attach_monitor"]').click();
    const mine = page.locator(".chat-log .msg.learner").last();
    await expect(mine).toContainText("Lin Xiao");
    await expect(mine).toContainText("Attach the monitor");
    await expect(page.locator(".chat-log")).not.toContainText("staff:ed-nurse");
    await expect.poll(() => page.evaluate(() => typeof (window as any).__QA__.session.state.monitorAttachedAt), { timeout: 180_000 }).toBe("number");
    await shot(page, "review-nurse-named");
  });

  test("(o) a lab test is ordered at the patient's side; the lab station says so first", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page, { bypassApprovals: true });
    // the lab workstation, before any sample: the world's reason and the way, before anything is placed
    const lab = await page.evaluate(() => {
      const qa = (window as any).__QA__;
      const p = qa.game.stations.placement("lab-workstation");
      return { x: p.x as number, z: p.z as number, type: p.type as string, room: p.room as string };
    });
    await placeAvatar(page, lab.x, lab.z + 1.4, { x: lab.x, z: lab.z });
    await page.evaluate((s) => {
      const qa = (window as any).__QA__;
      qa.interact({ kind: "equipment", placementId: "lab-workstation", type: s.type, interaction: "workstation", capabilities: qa.game.stations.caps("lab-workstation"), name: "lab", hint: "", room: s.room });
    }, lab);
    await page.locator("#exam-input").fill("Full blood count");
    await page.locator("#exam-form button").click();
    const cbc = page.locator('#candidates [data-investigation="cbc"]');
    await expect(cbc).toContainText("The sample is taken at");
    await cbc.click();
    await expect(page.locator("#panel #action-feedback #go-there")).toContainText("Go to");
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as any).__QA__.session.state.orders.length)).toBe(0);
    await expect(page.locator(".toast.show").filter({ hasText: "sent" })).toHaveCount(0);
    await shot(page, "review-lab-station-sample-first");
    await page.keyboard.press("Escape");

    // at the patient's side: the patient's window orders it (the sample is taken here)
    await toPatientSide(page);
    await page.evaluate(() => {
      const qa = (window as any).__QA__;
      qa.interact({ kind: "patient", slotId: qa.game.slotId, caseId: qa.game.caseDef.id, name: "patient", hint: "" });
    });
    await page.locator("#tab-tests").click();
    await page.locator('#bedside-tests [data-investigation="cbc"]').click();
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.session.state.orders.map((o: any) => o.investigationId))).toContain("cbc");
    await expect(page.locator(".toast.show").filter({ hasText: "sent" }).first()).toBeVisible({ timeout: 15_000 });
    await shot(page, "review-bedside-tests");
    const lines = await traceLines(page);
    expect(lines).toContain("clinical_action:order_test:ok");
    expect(errors).toEqual([]);
  });

  test("(p) the aim does not reach equipment through a wall", async ({ page }) => {
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page);
    // behind the resus wall, 2.5 m from the monitor, looking straight at it
    await placeAvatar(page, MONITOR.x, MONITOR.z - 2.5, MONITOR);
    const aimed = await page.evaluate(() => {
      const w = (window as any).__QA__.world;
      w.debug.updateAim();
      const t = w.debug.target;
      return t ? `${t.kind}:${t.placementId ?? t.id ?? ""}` : null;
    });
    expect(aimed).not.toBe("equipment:resus1-monitor");
  });
});
