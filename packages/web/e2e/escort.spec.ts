/**
 * Walking with the patient and who speaks (docs/EMBODIED.md §8.4, PROTOCOL §4) in the 3D world:
 *
 * - the case's companion (the asthmatic child's parent) is drawn at the patient's side, and when the parent
 *   answers, the parent's mouth moves — not the child's;
 * - "Please follow me." said to an outpatient: the world has them walk with the learner, the scene draws them
 *   following the avatar wherever it goes, and "Please wait here." leaves them standing there;
 * - "Please come with me to the CT scanner." to a standing outpatient (SMZL, clinic-v4): they walk there upright —
 *   never carried lying through the air — and lie down only on the scanner's table.
 *
 * Assertions read the authoritative state (__QA__: the world model, the renderer's records), not the pixels.
 */
import { expect, test, type Page } from "@playwright/test";
import { embodiedSetup, enterCase, freshStart, placeAvatar, shot, toPatientSide } from "./helpers.js";

const drawn = (page: Page) => page.evaluate(() => (window as any).__QA__.world.debug.patientPose((window as any).__QA__.game.slotId));
const place = (page: Page) => page.evaluate(() => (window as any).__QA__.worldModel.patientPlace());
const say = (page: Page, text: string, to = "patient") => page.evaluate(({ text, to }) => (window as any).__QA__.say(text, to), { text, to });
const still = (page: Page) => expect.poll(() => page.evaluate(() => (window as any).__QA__.moving.length), { timeout: 120_000 }).toBe(0);

test.describe("walking with the patient (en)", () => {
  test.use({ locale: "en-US" });

  test("(w1) the companion stands at the child's side and speaks with their own mouth", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await enterCase(page, "pediatric-asthma");
    await embodiedSetup(page, { bypassApprovals: true });
    const at = await drawn(page);
    expect(at.companion).not.toBeNull();
    expect(Math.hypot(at.companion.x - at.x, at.companion.z - at.z)).toBeLessThan(2.5);
    await toPatientSide(page);
    await shot(page, "companion-at-side");
    await say(page, "When did the wheeze start?", "companion");
    await expect.poll(async () => (await drawn(page)).companion.speaking, { timeout: 30_000, intervals: [50] }).toBe(true);
    expect((await drawn(page)).speaking).toBe(false);
    expect(errors).toEqual([]);
  });

  test("(w2) 'Please follow me.' — the outpatient walks with the avatar; 'Please wait here.' — they stay", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await enterCase(page, "new-onset-t2dm");
    await embodiedSetup(page, { bypassApprovals: true });
    await toPatientSide(page);
    await say(page, "Please follow me.");
    await expect.poll(async () => (await place(page))?.escort ?? null, { timeout: 30_000 }).toBe("actor:clinician");
    await expect.poll(async () => (await drawn(page)).escort, { timeout: 30_000 }).toBe("avatar");
    // walk to the waiting room by the world's route: the patient is drawn a step behind the avatar all the way
    const walk = page.evaluate(() => (window as any).__QA__.worldAction({ operation: "navigate", goal: { kind: "room", id: "opd-waiting" } }));
    await page.waitForTimeout(1500);
    const mid = await drawn(page);
    const me = await page.evaluate(() => (window as any).__QA__.world.position);
    expect(Math.hypot(mid.x - me.x, mid.z - me.z)).toBeLessThan(2.2);
    expect(mid.posture).toBe("standing");
    expect((await walk)?.status).toBe("completed");
    await still(page);
    const there = await drawn(page);
    const avatar = await page.evaluate(() => (window as any).__QA__.world.position);
    expect(Math.hypot(there.x - avatar.x, there.z - avatar.z)).toBeLessThan(2.2);
    // turn round (without moving): the patient stands a step behind
    await placeAvatar(page, avatar.x, avatar.z, { x: there.x, z: there.z });
    await shot(page, "escort-following");
    await say(page, "Please wait here.");
    await expect.poll(async () => (await place(page))?.escort ?? null, { timeout: 30_000 }).toBeNull();
    const waits = await place(page);
    expect(waits).toMatchObject({ slot: null, posture: "standing" });
    const stays = await drawn(page);
    expect(stays.escort).toBeNull();
    expect(Math.hypot(stays.x - waits.x, stays.z - waits.z)).toBeLessThan(0.05);
    expect(errors).toEqual([]);
  });

  test("(w3) SMZL: walked upright to the CT, lying only on its table", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await enterCase(page, "smzl-lung-adeno");
    await embodiedSetup(page, { bypassApprovals: true });
    await toPatientSide(page);
    const postures = new Set<string>();
    const sample = setInterval(() => {
      void drawn(page)
        .then((p) => p?.travelling && postures.add(p.posture))
        .catch(() => undefined);
    }, 100);
    await say(page, "Please come with me to the CT scanner.");
    await expect.poll(async () => (await place(page))?.provider ?? null, { timeout: 120_000 }).toBe("eq:ct-scanner");
    clearInterval(sample);
    await still(page);
    expect([...postures]).toEqual(["standing"]);
    expect(await place(page)).toMatchObject({ provider: "eq:ct-scanner", posture: "lying" });
    expect(await drawn(page)).toMatchObject({ posture: "lying", travelling: null });
    expect(errors).toEqual([]);
  });

  test("(w4) a colleague asked in words answers in her own voice, walks over, and her own mouth moves", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await enterCase(page, "stemi-inferior-rv");
    await embodiedSetup(page, { bypassApprovals: true });
    await toPatientSide(page);
    await page.evaluate(() => (window as any).__QA__.interact({ kind: "staff", staffId: "ed-nurse", role: "nurse", name: "nurse", hint: "" }));
    await expect(page.locator('#panel .window[data-panel="conversation"]')).toBeVisible();
    await page.locator('#come-chips button[data-ask="come"]').click();
    await expect(page.locator(".chat-log .msg.agent").filter({ hasText: "On my way to the bedside." }).first()).toContainText("Lin Xiao");
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.world.debug.npcs.get("staff:ed-nurse")?.speaking ?? false), { timeout: 10_000, intervals: [50] }).toBe(true);
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.moving.length), { timeout: 120_000 }).toBe(0);
    const nurse = await page.evaluate(() => (window as any).__QA__.worldSnapshot().actors.find((a: any) => a.id === "staff:ed-nurse").pose);
    const bed = await place(page);
    expect(Math.hypot(nurse.x - bed.x, nurse.z - bed.z)).toBeLessThan(3);
    // outside the receptionist's role: she says so herself, and nothing is done
    await page.evaluate(() => (window as any).__QA__.say("Could you attach the monitor?", "nurse", "receptionist"));
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.store.chat.some((m: any) => m.staffId === "receptionist" && /A nurse can/.test(m.text))), { timeout: 30_000 }).toBe(true);
    await shot(page, "staff-answers");
    expect(errors).toEqual([]);
  });

  test("(w5) 'Please lie down.' — the outpatient lies down on the couch where you can see it", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await enterCase(page, "smzl-lung-adeno");
    await embodiedSetup(page, { bypassApprovals: true });
    await toPatientSide(page);
    expect((await drawn(page)).posture).toBe("standing");
    await say(page, "Please lie down.");
    await expect.poll(async () => (await place(page))?.posture, { timeout: 30_000 }).toBe("lying");
    await expect.poll(async () => (await drawn(page))?.posture, { timeout: 30_000 }).toBe("lying");
    await shot(page, "patient-lies-down");
    expect(errors).toEqual([]);
  });
});
