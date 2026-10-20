/**
 * Patient transport in the 3D world (review G8, docs/EMBODIED.md §8) and truthful posture (G12): in the
 * general hospital, the post-operative PE patient is wheeled on her ward bed to the CT scanner — the bed is
 * pushed in front of the avatar with her lying on it, then drawn where the world parks it, her on the scanner
 * table — the CTPA is ordered there, and she is wheeled back to her bed space. Sitting her up (an authored
 * `posture`) changes the posture of the drawn patient. Assertions read the authoritative state (__QA__: the
 * world model, the renderer's records), not the pixels.
 */
import { expect, test, type Page } from "@playwright/test";
import { embodiedSetup, enterCase, freshStart, placeAvatar, shot, toPatientSide, traceLines } from "./helpers.js";

const CASE = "pulmonary-embolism-postop";
const SLOT = "ward-1";
const PATIENT = `patient:${SLOT}`;
const BED = "ward-bed-1";

const drawnPatient = (page: Page) => page.evaluate((slot) => (window as any).__QA__.world.debug.patientPose(slot), SLOT);
const worldPlace = (page: Page) => page.evaluate(() => (window as any).__QA__.worldModel.patientPlace());
const drawnBed = (page: Page) =>
  page.evaluate((id) => {
    const r = (window as any).__QA__.world.debug.portables.get(id);
    return r ? { x: r.x as number, z: r.z as number, pushedBy: (r.pushedBy ?? null) as string | null, promoted: r.promoted as boolean } : null;
  }, BED);

test.describe("patient transport (en)", () => {
  test.use({ locale: "en-US" });

  test("(k) PE: the patient NPC is wheeled on her bed to the CT scanner, the CTPA ordered there, and wheeled back", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page, { bypassApprovals: true });
    // the CTPA is refused in the ward: the world says to take her there
    await toPatientSide(page);
    const refused = await page.evaluate(() => {
      const w = (window as any).__QA__.worldModel;
      const c = w.checkSpatial("actor:clinician", { tool: "order_test", kind: "order", investigationId: "ctpa" });
      return { ok: c.ok, reason: c.reason, then: c.hint?.then ?? null };
    });
    expect(refused).toEqual({ ok: false, reason: "patient-not-at-provider", then: { operation: "transport_patient", targetId: PATIENT, parameters: { destination: "eq:ct-scanner" } } });
    const before = await drawnPatient(page);
    expect(before).toMatchObject({ posture: "lying", travelling: null, spot: null });

    // wheel her there: the bed is pushed in front of the avatar, she lies on it
    const done = page.evaluate((patient) => (window as any).__QA__.worldAction({ operation: "transport_patient", targetId: patient, parameters: { destination: "eq:ct-scanner" } }), PATIENT);
    await expect.poll(async () => (await drawnPatient(page))?.travelling ?? null, { timeout: 60_000, intervals: [200] }).toBe("avatar");
    expect((await drawnBed(page))?.pushedBy).toBe("avatar");
    expect((await drawnPatient(page))?.posture).toBe("lying");
    await shot(page, "transport-pushing");
    const result = await done;
    expect(result?.status, result?.message).toBe("completed");
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.moving.length), { timeout: 120_000 }).toBe(0);

    // on the scanner table, drawn where the world has her; the bed parked beside the scanner, drawn there
    const atCt = await worldPlace(page);
    expect(atCt).toMatchObject({ provider: "eq:ct-scanner", support: "eq:ct-scanner", posture: "lying", room: "rad-ct" });
    const drawnAtCt = await drawnPatient(page);
    expect(drawnAtCt).toMatchObject({ posture: "lying", travelling: null, spot: { support: "ct-scanner" } });
    expect(Math.hypot(drawnAtCt.x - atCt.x, drawnAtCt.z - atCt.z)).toBeLessThan(0.05);
    const parked = await page.evaluate((id) => (window as any).__QA__.worldSnapshot().entities[`eq:${id}`].position, BED);
    const bedAtCt = await drawnBed(page);
    expect(bedAtCt).toMatchObject({ pushedBy: null, promoted: true });
    expect(Math.hypot(bedAtCt!.x - parked.x, bedAtCt!.z - parked.z)).toBeLessThan(0.05);
    // look at her on the table
    await placeAvatar(page, atCt.x + 2.6, atCt.z + 3.2, { x: atCt.x, z: atCt.z });
    await shot(page, "transport-at-ct");

    // the CTPA, ordered with her on the table (the learner's act: a short step if needed)
    await toPatientSide(page);
    await page.evaluate(() => (window as any).__QA__.act({ type: "order", investigationId: "ctpa" }));
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.session.state.orders.map((o: any) => o.investigationId)), { timeout: 60_000 }).toContain("ctpa");

    // and back to her bed space: the bed goes home with her on it
    const back = await page.evaluate((patient) => (window as any).__QA__.worldAction({ operation: "transport_patient", targetId: patient, parameters: { destination: "home" } }), PATIENT);
    expect(back?.status, back?.message).toBe("completed");
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.moving.length), { timeout: 120_000 }).toBe(0);
    expect(await worldPlace(page)).toMatchObject({ slot: SLOT, provider: null });
    const home = await drawnPatient(page);
    expect(home).toMatchObject({ travelling: null, spot: null, posture: "lying" });
    const bedHome = await page.evaluate((id) => (window as any).__QA__.worldModel.entity(`eq:${id}`).position, BED);
    expect(Math.hypot(home.x - bedHome.x, home.z - bedHome.z)).toBeLessThan(0.05);
    const bed = await drawnBed(page);
    expect(Math.hypot(bed!.x - bedHome.x, bed!.z - bedHome.z)).toBeLessThan(0.05);
    // the episode trace has both transports as interactions
    expect((await traceLines(page)).filter((l) => /:transport_patient:/.test(l))).toEqual([expect.stringMatching(/:transport_patient:ok$/), expect.stringMatching(/:transport_patient:ok$/)]);
    await placeAvatar(page, home.x + 2, home.z + 2.6, { x: home.x, z: home.z });
    await shot(page, "transport-home");
    expect(errors).toEqual([]);
  });

  test("(l) PE: sitting her up changes the drawn patient's posture (the authored posture of the intervention)", async ({ page }) => {
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page, { bypassApprovals: true });
    await toPatientSide(page);
    expect((await drawnPatient(page))?.posture).toBe("lying");
    await page.evaluate(() => (window as any).__QA__.act({ type: "intervene", interventionId: "positioning" }));
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.session.state.interventions.map((i: any) => i.interventionId)), { timeout: 60_000 }).toContain("positioning");
    await expect.poll(async () => (await drawnPatient(page))?.posture, { timeout: 30_000 }).toBe("sitting");
    // what bystanders see in the world model says the same
    const seen = await page.evaluate((id) => (window as any).__QA__.worldModel.inspect("actor:clinician", id)?.cues?.posture ?? null, PATIENT);
    expect(seen).toBe("sitting");
    const at = await worldPlace(page);
    await placeAvatar(page, at.x + 1.8, at.z + 2.4, { x: at.x, z: at.z });
    await shot(page, "transport-posture-sitting");
  });
});
