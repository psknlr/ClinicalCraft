/**
 * The place beside the map and the in-world badge are one lookup of the player's position (audit 2026-11-12 P2-15;
 * docs/EMBODIED.md §2.1): in the general hospital, after the post-operative PE patient's bed transport to the CT
 * scanner and the reposition beside the table (x = 26.1: the wall between the CT and the MRI suite), the map read
 * "CT Suite" while the badge read "In-world · MRI Suite" — two lookups of two positions: the renderer's own region at
 * its last report (none while a window is open), and the world's at a pose sent only when it changed by a centimetre.
 * Both labels now come from the world's region lookup at the avatar's position, reported whenever the body moved, and
 * the world has the body at that very position: the map's place, the badge and the world's own room agree — after
 * walking up to the wall from either suite, after the transport, after the reposition (playing, and with a window
 * open, on either side of the wall line), and after a walk the world drives. Assertions read the HUD and the world
 * model (`__QA__`), not the pixels.
 */
import { expect, test, type Page } from "@playwright/test";
import { embodiedSetup, enterCase, freshStart, placeAvatar, shot, toPatientSide } from "./helpers.js";

const CASE = "pulmonary-embolism-postop";
const PATIENT = "patient:ward-1";
/** general-hospital: the wall between the CT suite (x 21–26) and the MRI suite (x 26–31), and a line clear of both scanners. */
const WALL_X = 26;
const Z = -34.2;

/** The place beside the map, the badge, the world's name and room of the body, the avatar and the world's pose: one read. */
async function places(page: Page) {
  return page.evaluate(() => {
    const qa = (window as any).__QA__;
    const w = qa.worldModel;
    const pose = w.actor("actor:clinician").pose;
    const at = { level: pose.level, x: pose.x, z: pose.z };
    const avatar = qa.world.position;
    return {
      map: document.querySelector("#region")?.textContent ?? null,
      badge: document.querySelector("#embodiment-badge")?.textContent ?? null,
      world: w.regionName(at, "en") as string,
      room: w.roomAt(at) as string | null,
      avatar: { x: avatar.x as number, z: avatar.z as number },
      pose: { x: pose.x as number, z: pose.z as number },
    };
  });
}

/** "agree" once the map's place and the badge name the world's place of the body, the body being where the avatar is. */
async function agreement(page: Page) {
  const p = await places(page);
  const same = p.map === p.world && p.badge === `In-world · ${p.world}` && Math.abs(p.avatar.x - p.pose.x) < 1e-6 && Math.abs(p.avatar.z - p.pose.z) < 1e-6;
  return same ? "agree" : p;
}

/** Wait until both labels and the world agree; then they name `name` (and the world's room is `room`). */
async function agreeOn(page: Page, name: string, room: string): Promise<void> {
  await expect.poll(() => agreement(page), { timeout: 30_000 }).toBe("agree");
  const p = await places(page);
  expect(p.world).toBe(name);
  expect(p.room).toBe(room);
}

/**
 * Hold W from `from` towards `toward` until the body has walked and stopped (against a wall: no step in 1.5 s — under
 * SwiftShader a walk is slow); release. Returns where it stopped.
 */
async function walkInto(page: Page, from: { x: number; z: number }, toward: { x: number; z: number }): Promise<{ x: number; z: number }> {
  await placeAvatar(page, from.x, from.z, toward);
  expect(await page.evaluate(() => (window as any).__QA__.playing)).toBe(true);
  await page.evaluate(() => (window as any).__QA__.world.setKey("KeyW", true));
  let last: { x: number; z: number } | null = null;
  await expect
    .poll(
      async () => {
        const p = await page.evaluate(() => {
          const w = (window as any).__QA__.world.position;
          return { x: w.x as number, z: w.z as number };
        });
        const walked = Math.hypot(p.x - from.x, p.z - from.z) > 0.1;
        const still = !!last && Math.hypot(p.x - last.x, p.z - last.z) < 0.002;
        last = p;
        return walked && still;
      },
      { timeout: 90_000, intervals: [1500] },
    )
    .toBe(true);
  await page.evaluate(() => (window as any).__QA__.world.setKey("KeyW", false));
  return last!;
}

test.describe("the place beside the map and the badge (en)", () => {
  test.use({ locale: "en-US" });

  test("PE: one lookup of one position — walking to the CT / MRI wall, after the bed transport and the reposition", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await enterCase(page, CASE);
    await embodiedSetup(page, { bypassApprovals: true });
    await expect.poll(() => agreement(page), { timeout: 30_000 }).toBe("agree");

    // walking up to the wall from either suite: the body stops on its own side, and both labels say which
    const inCt = await walkInto(page, { x: 25.1, z: Z }, { x: 30, z: Z });
    expect(inCt.x).toBeGreaterThan(25.3);
    expect(inCt.x).toBeLessThan(WALL_X);
    await agreeOn(page, "CT Suite", "rad-ct");
    const inMri = await walkInto(page, { x: 26.9, z: Z }, { x: 20, z: Z });
    expect(inMri.x).toBeLessThan(26.7);
    expect(inMri.x).toBeGreaterThan(WALL_X);
    await agreeOn(page, "MRI Suite", "rad-mri");

    // the bed transport to the CT scanner (the world's Mover walks the avatar behind her bed)
    await toPatientSide(page);
    const there = await page.evaluate((patient) => (window as any).__QA__.worldAction({ operation: "transport_patient", targetId: patient, parameters: { destination: "eq:ct-scanner" } }), PATIENT);
    expect(there?.status, there?.message).toBe("completed");
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.moving.length), { timeout: 120_000 }).toBe(0);
    const atCt = await page.evaluate(() => (window as any).__QA__.worldModel.patientPlace());
    expect(atCt).toMatchObject({ provider: "eq:ct-scanner", room: "rad-ct" });
    await agreeOn(page, "CT Suite", "rad-ct");

    // the post-transfer reposition of the audit (beside the table, at the wall's line): one place, wherever it settles
    await placeAvatar(page, atCt.x + 2.6, atCt.z + 3.2, { x: atCt.x, z: atCt.z });
    await expect.poll(() => agreement(page), { timeout: 30_000 }).toBe("agree");
    const settled = await places(page);
    expect(settled.room === "rad-ct" ? "CT Suite" : settled.room === "rad-mri" ? "MRI Suite" : settled.room).toBe(settled.world);
    await shot(page, "place-after-transport");

    // with a window open (nobody plays: no physics, no input), the body put on either side of the wall line
    await page.locator("#minimap-btn").click();
    await expect(page.locator('#panel .window[data-panel="map"]')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__QA__.playing)).toBe(false);
    for (const [x, z, name, room] of [
      [WALL_X - 0.002, -36, "CT Suite", "rad-ct"],
      [WALL_X + 0.003, -36, "MRI Suite", "rad-mri"],
      [atCt.x + 2.6, atCt.z + 3.2, "MRI Suite", "rad-mri"],
      [WALL_X, -36, "CT Suite", "rad-ct"],
    ] as const) {
      await placeAvatar(page, x, z, { x: atCt.x, z: atCt.z });
      await agreeOn(page, name, room);
    }
    await shot(page, "place-window-open");
    await page.keyboard.press("Escape");
    await expect(page.locator("#panel")).toBeHidden();
    // playing again: the body is pushed out of the wall to one side; the labels follow it together
    await expect.poll(() => agreement(page), { timeout: 30_000 }).toBe("agree");

    // a walk the world drives: from the CT suite to the MRI scanner ("walking…" on the way), the place there
    await placeAvatar(page, 24.9, Z);
    const walk = page.evaluate(() => (window as any).__QA__.worldAction({ operation: "approach", targetId: "eq:mri-scanner" }));
    await expect.poll(() => page.evaluate(() => document.querySelector("#embodiment-badge")?.textContent ?? null), { timeout: 60_000, intervals: [100] }).toBe("In-world · walking…");
    expect((await walk)?.status).toBe("completed");
    await expect.poll(() => page.evaluate(() => (window as any).__QA__.moving.length), { timeout: 120_000 }).toBe(0);
    await agreeOn(page, "MRI Suite", "rad-mri");
    expect(errors).toEqual([]);
  });
});
