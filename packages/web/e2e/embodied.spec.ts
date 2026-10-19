/**
 * Embodied mode in the 3D world (docs/EMBODIED.md R1/R3/R8, §6–§10): the
 * offline autopilot walks the avatar to the patient and works the real
 * devices; a human's panel buttons go through the same world actions (a
 * short step is taken for them, otherwise the refusal with "Go there"); a
 * delegated nurse walks to the bed herself; clinical mode stays available.
 * Assertions read the authoritative state (__QA__: engine state, world
 * snapshot, episode trace), not the pixels.
 */
import { expect, test, type Page } from "@playwright/test";
import { embodiedSetup, enterCase, freshStart, placeAvatar, shot, traceLines, worldPose } from "./helpers.js";

const CASE = "stemi-inferior-rv";
/** general-hospital: the resus-1 bed (patient slot) and its monitor. */
const SLOT = { x: 31, z: -17.325 };
const MONITOR = "eq:resus1-monitor";

const state = (page: Page) => page.evaluate(() => (window as any).__QA__.session.state);

test.describe("embodied mode (en)", () => {
  test.use({ locale: "en-US" });

  test("(a) the offline autopilot walks to the patient, works the devices at the bedside and treats", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await expect(page.locator("#embodied-toggle")).toBeChecked();
    await enterCase(page, CASE);
    await embodiedSetup(page, { bypassApprovals: true });
    await expect(page.locator("#embodiment-badge")).toHaveAttribute("data-mode", "embodied");
    const spawn = await worldPose(page);

    await page.locator("#autopilot-btn").click();
    await expect(page.locator('#panel .window[data-panel="autopilot"]')).toBeVisible();
    await page.locator("#autopilot-start").click();
    // an agent drives the body: the real-time clock is paused (R8) and the avatar walks (the world's Mover)
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.agentDriving), { timeout: 30_000 }).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.moving.includes("actor:clinician")), { timeout: 60_000 }).toBe(true);
    await expect(page.locator("#autopilot-trace .trace-group").first()).toBeVisible({ timeout: 60_000 });
    await shot(page, "embodied-autopilot-walking");
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.session.state.finished), { timeout: 400_000, intervals: [2000] }).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.store.autopilotRunning), { timeout: 60_000 }).toBe(false);
    await page.locator("#autopilot-trace").scrollIntoViewIfNeeded();
    await shot(page, "embodied-autopilot-trace");

    // engine: monitor attached, the ECG recorded and read, treated
    const s = await state(page);
    expect(typeof s.monitorAttachedAt).toBe("number");
    expect(s.seen).toContain("ecg-12lead@ed");
    expect(s.interventions.map((i: { interventionId: string }) => i.interventionId)).toContain("cardiac-monitoring");
    expect(s.interventions.length).toBeGreaterThan(2);

    // world: the body really moved; the ECG cart is back to idle after its record cycle
    const end = await worldPose(page);
    expect(Math.hypot(end.x - spawn.x, end.z - spawn.z)).toBeGreaterThan(10);
    const snap = await page.evaluate(() => (window as any).__QA__.worldSnapshot());
    expect(snap.format).toBe("clinicalcraft-world@1");

    // trace: the ECG step walked to the bedside, operated the cart, ordered and verified — in this order
    const lines = await traceLines(page);
    const ecgEnd = lines.indexOf("plan:order_test ecg-12lead:ok");
    expect(ecgEnd).toBeGreaterThan(0);
    const step = lines.slice(0, ecgEnd);
    const order = ["navigation:navigate:ok", "interaction:prepare:ok", "interaction:connect:ok", "interaction:record:ok", "clinical_action:order_test:ok", "verification:order:ok"].map((l) => step.indexOf(l));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(lines).toContain("interaction:attach:ok");
    expect(lines).toContain("plan:intervene cardiac-monitoring:ok");
    // the walk that took the body to the ECG ended at the bedside (the world's navigation record)
    const walks = await page.evaluate(() =>
      [...(window as any).__QA__.store.worldResults.values()].map((r: any) => r.result).filter((r: any) => r.navigation?.ok),
    );
    const first = walks[0]?.navigation;
    expect(first).toBeTruthy();
    expect(Math.hypot(first.path.at(-1).x - 31, first.path.at(-1).z - -17.325)).toBeLessThan(4);
    // the live trace in the autopilot window: finished steps with their walk / operate / clinical spans
    await expect(page.locator("#autopilot-trace .trace-group.ok").first()).toBeVisible();
    await expect(page.locator("#autopilot-trace")).toContainText("record");
    expect(errors).toEqual([]);
  });

  test("(b) panel buttons are world actions: a short step is taken; through a wall, Go there", async ({ page }) => {
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page, { bypassApprovals: true });
    // ~4 m from the bed, in the resus room
    await placeAvatar(page, 30.25, -11.5, SLOT);
    await page.locator("#world").focus();
    await page.keyboard.press("KeyV");
    await expect(page.locator('#panel .window[data-panel="monitor"]')).toBeVisible();
    await page.locator("#monitor-attach").click();
    await expect.poll(() => page.evaluate(() => typeof (window as any).__QA__.session.state.monitorAttachedAt), { timeout: 120_000 }).toBe("number");
    // the world refused it from there, walked the body over (≤ 5.5 m) and did it: attach → navigate → attach
    const lines = await traceLines(page);
    const refused = lines.findIndex((l) => /^interaction:attach:x:(NOT_IN_RANGE|SPATIAL_REQUIREMENT_UNMET)$/.test(l));
    expect(refused).toBeGreaterThanOrEqual(0);
    const walked = lines.indexOf("navigation:navigate:ok", refused);
    expect(walked).toBeGreaterThan(refused);
    expect(lines.indexOf("interaction:attach:ok", walked)).toBeGreaterThan(walked);
    const near = await worldPose(page);
    expect(Math.hypot(near.x - SLOT.x, near.z - SLOT.z)).toBeLessThan(3.2);
    expect(await page.evaluate(() => (window as any).__QA__.feedback)).toBeNull();
    await expect(page.locator("#monitor-off")).toHaveCount(0);
    await shot(page, "embodied-monitor-attached");

    // behind the resus wall (north corridor): within 6 m of the screen but no line of sight; the way round is long
    await placeAvatar(page, 30.5, -21.9, SLOT);
    await page.locator("#monitor-read").click();
    const feedback = page.locator("#panel #action-feedback");
    await expect(feedback).toBeVisible({ timeout: 60_000 });
    await expect(feedback.locator("#go-there")).toBeVisible();
    const refusal = await page.evaluate(() => (window as any).__QA__.feedback);
    expect(refusal.goal).toBeTruthy();
    expect((await traceLines(page)).at(-1)).toMatch(/^interaction:read:x:NOT_(VISIBLE|IN_RANGE)$/);
    await shot(page, "embodied-go-there");
    await feedback.locator("#go-there").click();
    // the world planned the way round (through the doors) to a spot with a view of the screen; the avatar walked it
    await expect(page.locator(".toast.show").filter({ hasText: "Arrived" }).first()).toBeVisible({ timeout: 120_000 });
    const there = await worldPose(page);
    expect(Math.hypot(there.x - 30.5, there.z - -21.9)).toBeGreaterThan(3);
    expect(there.z).toBeGreaterThan(-20);
    await page.locator("#monitor-read").click();
    await expect(page.locator("#monitor-read-result")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("#monitor-read-result")).not.toBeEmpty();
    expect((await traceLines(page)).filter((l) => l === "interaction:read:ok")).toHaveLength(1);
  });

  test("(c) a delegated nurse walks to the bed and attaches the monitor herself", async ({ page }) => {
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page, { bypassApprovals: true });
    const before = await worldPose(page, "staff:ed-nurse");
    await page.evaluate(() => (window as any).__QA__.interact({ kind: "staff", staffId: "ed-nurse", role: "nurse", name: "nurse", hint: "" }));
    await expect(page.locator('#panel .window[data-panel="conversation"]')).toBeVisible();
    await page.locator('#delegate-chips button[data-task="attach_monitor"]').click();
    // she walks (the renderer animates the world's route) and the HUD announces it
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.world.debug.walkingStaff.includes("ed-nurse")), { timeout: 60_000, intervals: [100] }).toBe(true);
    await expect(page.locator(".toast.show").filter({ hasText: "walking to" }).first()).toBeVisible();
    await shot(page, "embodied-delegate-walking");
    await expect.poll(() => page.evaluate(() => typeof (window as any).__QA__.session.state.monitorAttachedAt), { timeout: 180_000 }).toBe("number");
    const after = await worldPose(page, "staff:ed-nurse");
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(4);
    expect(Math.hypot(after.x - SLOT.x, after.z - SLOT.z)).toBeLessThan(3.2);
    // the rig stands where the world has her
    const drawn = await page.evaluate(() => (window as any).__QA__.world.staffPose("ed-nurse"));
    expect(Math.hypot(drawn.x - after.x, drawn.z - after.z)).toBeLessThan(0.3);
    const lines = await traceLines(page);
    expect(lines.some((l) => l.startsWith("plan:delegate"))).toBe(true);
    await expect(page.locator(".toast.show").filter({ hasText: "Attach the monitor" }).first()).toBeVisible({ timeout: 30_000 });
    await shot(page, "embodied-delegate-done");
  });

  test("(e) clinical mode can be chosen at case start and keeps remote actions", async ({ page }) => {
    await freshStart(page);
    await page.locator(`.case-card[data-case="${CASE}"]`).click();
    await expect(page.locator("#embodied-toggle")).toBeChecked();
    await page.locator("#embodied-toggle").uncheck();
    await page.locator("#enter").click();
    await page.waitForFunction(() => (window as any).__QA__?.game?.entered === true, null, { timeout: 180_000 });
    expect(await page.evaluate(() => (window as any).__QA__.embodiment)).toBe("clinical");
    expect(await page.evaluate(() => (window as any).__QA__.worldSnapshot())).toBeNull();
    await expect(page.locator("#embodiment-badge")).toHaveText("Clinical mode");
    // from the entrance, far from the bed: the monitor attaches (no spatial gate in clinical mode)
    await page.locator("#world").focus();
    await page.keyboard.press("KeyV");
    await page.locator("#monitor-attach").click();
    await expect.poll(() => page.evaluate(() => typeof (window as any).__QA__.session.state.monitorAttachedAt)).toBe("number");
    await page.keyboard.press("Escape");
    // the setting: the next case's mode; this one stays clinical
    await page.locator("#embodiment-badge").click();
    await expect(page.locator("#setting-embodiment")).toHaveValue("clinical");
    await expect(page.locator("#embodiment-note")).toContainText("clinical mode");
    await shot(page, "clinical-mode-settings");
    await page.locator("#setting-embodiment").selectOption("embodied");
    await expect(page.locator("#embodiment-note")).toContainText("clinical mode");
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("clinicalcraft-v5-settings") ?? "{}"));
    expect(stored.agent.embodiment).toBe("embodied");
  });
});

test.describe("embodied mode (en): doors", () => {
  test.use({ locale: "en-US" });

  test("(i) a locked door: the learner's unlock is a world action, and the keys rule refuses it", async ({ page }) => {
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page);
    // a scenario control locks the resus room's door on the corridor; the scene follows the world
    const door = await page.evaluate(() => {
      const q = (window as any).__QA__;
      const doors = q.world.debug.doors.filter((d: any) => d.interior && d.level === "L0" && Math.abs(d.centre.z - -4) < 0.6 && d.centre.x > 26 && d.centre.x < 46);
      const d = doors[0];
      q.worldModel.setDoor(`door:${d.id}`, { locked: true });
      return { id: d.id as string, x: d.centre.x as number, z: d.centre.z as number };
    });
    await expect.poll(() => page.evaluate((id) => (window as any).__QA__.world.debug.doors.find((d: any) => d.id === id).locked, door.id)).toBe(true);
    // in the corridor, facing the door: E
    await placeAvatar(page, door.x, door.z + 1.6, { x: door.x, z: door.z });
    const aimed = await page.evaluate(() => {
      const w = (window as any).__QA__.world;
      w.debug.updateAim();
      return w.debug.target;
    });
    expect(aimed).toMatchObject({ kind: "door", id: door.id });
    await page.evaluate(() => (window as any).__QA__.world.interact());
    // the world answers (porters and reception hold the keys): its refusal in the HUD, traced like any operation
    const fb = page.locator("#hud-feedback #action-feedback");
    await expect(fb).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () => (await traceLines(page)).at(-1)).toBe("interaction:unlock:x:NOT_AUTHORIZED");
    const st = await page.evaluate((id) => (window as any).__QA__.worldSnapshot().entities[`door:${id}`]?.door, door.id);
    expect(st).toMatchObject({ locked: true, open: false });
    await shot(page, "embodied-locked-door");
  });
});

test.describe("embodied mode (zh-CN)", () => {
  test.use({ locale: "zh-CN" });

  test("(g) HUD: badge, refusal with Go there, a delegated nurse's toast, the live trace", async ({ page }) => {
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page, { bypassApprovals: true });
    await expect(page.locator("#embodiment-badge")).toContainText("具身");
    // from the entrance: too far for the monitor — the HUD's refusal names the way
    await page.evaluate((id) => (window as any).__QA__.worldAction({ operation: "attach", targetId: id }), MONITOR);
    const fb = page.locator("#hud-feedback #action-feedback");
    await expect(fb).toBeVisible({ timeout: 60_000 });
    await expect(fb.locator("#go-there")).toContainText("刘振华");
    await expect(fb).toContainText("米");
    // a nurse delegated to attach it walks there (the HUD says so) while the refusal is still shown
    await page.evaluate(() => (window as any).__QA__.submit({ type: "user_message", text: "/delegate staff:ed-nurse attach_monitor" }));
    await expect(page.locator(".toast.show").filter({ hasText: "正前往" }).first()).toBeVisible({ timeout: 60_000 });
    await shot(page, "embodied-zh-hud");
    await expect.poll(() => page.evaluate(() => typeof (window as any).__QA__.session.state.monitorAttachedAt), { timeout: 180_000 }).toBe("number");
    // the autopilot window's live trace shows her steps: walk → operate → clinical act
    await page.locator("#autopilot-btn").click();
    const trace = page.locator("#autopilot-trace");
    await expect(trace.locator(".trace-group.ok").first()).toBeVisible({ timeout: 30_000 });
    await expect(trace).toContainText("导航");
    await expect(trace).toContainText("attach");
    await trace.scrollIntoViewIfNeeded();
    await shot(page, "embodied-zh-trace");
  });

  test("(h) teaching hospital: the world's route upstairs is walked (stairs) to the patient on the first floor", async ({ page }) => {
    await freshStart(page);
    await page.evaluate(() => (window as any).__QA__.app.prefs.update((s: any) => (s.ui.quality = "low")));
    await page.locator('.case-card[data-case="pulmonary-embolism-postop"]').click();
    await page.locator("#facility-select").selectOption("teaching-hospital");
    await page.locator("#enter").click();
    await page.waitForFunction(() => (window as any).__QA__?.game?.entered === true, null, { timeout: 180_000 });
    expect(await page.evaluate(() => (window as any).__QA__.embodiment)).toBe("embodied");
    const patient = await page.evaluate(() => `patient:${(window as any).__QA__.game.slotId}`);
    const start = await worldPose(page);
    expect(start.level).toBe("L0");
    const plan = await page.evaluate((id) => (window as any).__QA__.worldModel.plan("actor:clinician", { kind: "interact", id }), patient);
    expect(plan.ok).toBe(true);
    expect(plan.target.level).toBe("L1");
    expect(plan.path.some((p: { via?: string }) => !!p.via)).toBe(true);
    // "Go there" to the patient: the world plans across the floors, the Mover walks the flight
    const r = await page.evaluate((id) => (window as any).__QA__.game.embodied.goTo({ kind: "interact", id }, null), patient);
    expect(r.status).toBe("completed");
    expect(r.navigation.ok).toBe(true);
    const end = await worldPose(page);
    expect(end.level).toBe("L1");
    expect(Math.hypot(end.x - plan.target.x, end.z - plan.target.z)).toBeLessThan(1);
    const drawn = await page.evaluate(() => (window as any).__QA__.world.position);
    expect(drawn.level).toBe("L1");
    expect(drawn.y).toBeGreaterThan(4);
    await expect(page.locator("#embodiment-badge")).toContainText("具身");
    await shot(page, "embodied-teaching-upstairs");
  });
});
