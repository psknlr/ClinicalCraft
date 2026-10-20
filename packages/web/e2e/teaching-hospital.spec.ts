/**
 * The two-level teaching hospital (room templates, EMBODIED R10): offered
 * as an alternative facility, the stairs walked to the first floor (QA
 * hooks: the W key held), the elevator ridden back down through its car
 * panel, and the map's floor tabs.
 */
import { expect, test } from "@playwright/test";
import { freshStart, shot } from "./helpers.js";

test.use({ locale: "zh-CN" });

/** An inpatient case: the teaching hospital is one of its facilities, never its own. */
const CASE = "pulmonary-embolism-postop";

test("teaching hospital: stairs up, elevator down, map floors", async ({ page }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await freshStart(page);
  // SwiftShader renders slowly: low quality keeps the walk and the ride short
  await page.evaluate(() => (window as any).__QA__.app.prefs.update((s: any) => (s.ui.quality = "low")));

  await page.locator(`.case-card[data-case="${CASE}"]`).click();
  const select = page.locator("#facility-select");
  await expect(select.locator('option[value="teaching-hospital"]')).toHaveCount(1);
  await expect(select).not.toHaveValue("teaching-hospital");
  await select.selectOption("teaching-hospital");
  await page.locator("#enter").click();
  await page.waitForFunction(() => (window as any).__QA__?.game?.entered === true, null, { timeout: 180_000 });
  await expect(page.locator("#hud")).toBeVisible();
  const ids = await page.evaluate(() => {
    const qa = (window as any).__QA__;
    return { facility: qa.game.facility.id, own: qa.game.caseDef.facility ?? null, levels: qa.world.levels().map((l: { id: string }) => l.id) };
  });
  expect(ids.facility).toBe("teaching-hospital");
  expect(ids.own).not.toBe("teaching-hospital");
  expect(ids.levels).toEqual(["L0", "L1"]);

  // stairs: from the approach point at the foot, walk north (W) up the flight to the first floor
  await page.evaluate(() => (window as any).__QA__.world.teleport(-5.6, 9.2, 0, "L0"));
  await page.evaluate(() => (window as any).__QA__.world.setKey("KeyW", true));
  await page.waitForFunction(() => (window as any).__QA__.world.position.y >= 4.45, null, { timeout: 300_000 });
  await page.evaluate(() => (window as any).__QA__.world.setKey("KeyW", false));
  const top = await page.evaluate(() => (window as any).__QA__.world.position);
  expect(top.level).toBe("L1");
  expect(top.z).toBeLessThan(2.5); // past the head of the flight, on the first-floor landing
  await expect(page.locator("#region")).toContainText("二层", { timeout: 30_000 });
  await shot(page, "teaching-stairs-top");

  // elevator: in the first-floor car, aim at the car panel and press E → choose the ground floor
  const aimed = await page.evaluate(() => {
    const w = (window as any).__QA__.world;
    const t = w.debug.targets.get("elevator:lift:L1:car");
    const px = 6.2, pz = 3.4;
    const cy = (t.box.min.y + t.box.max.y) / 2;
    const dist = Math.hypot(t.x - px, t.z - pz);
    w.debug.teleport(px, pz, 4.5, Math.atan2(px - t.x, pz - t.z), Math.atan2(cy - (4.5 + 1.62), dist));
    w.debug.updateAim();
    return w.debug.target;
  });
  expect(aimed).toMatchObject({ kind: "elevator", connectorId: "lift", level: "L1", inside: true, stops: ["L0", "L1"] });
  await page.evaluate(() => (window as any).__QA__.world.interact());
  const panel = page.locator('#panel .window[data-panel="elevator"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator("button[data-level]")).toHaveCount(2);
  await expect(panel.locator('button[data-level="L1"]')).toBeDisabled();
  await shot(page, "teaching-elevator-panel");
  await panel.locator('button[data-level="L0"]').click();
  await expect(page.locator("#panel")).toBeHidden();
  await page.waitForFunction(
    () => {
      const w = (window as any).__QA__.world;
      return w.position.level === "L0" && w.position.y < 0.05 && !w.debug.ride;
    },
    null,
    { timeout: 300_000 },
  );
  const down = await page.evaluate(() => {
    const w = (window as any).__QA__.world;
    return { pos: w.position, doorL0: w.debug.elevators[0].stops[0].door.open, doorL1: w.debug.elevators[0].stops[1].door.open };
  });
  expect(down.pos.x).toBeCloseTo(6.2, 1); // the same spot of the car, one floor down
  expect(down.doorL0).toBe(true);
  expect(down.doorL1).toBe(false);
  await shot(page, "teaching-elevator-arrived");

  // map: opens on the avatar's floor; the tabs switch to the other one
  await page.locator("#minimap-btn").click();
  await expect(page.locator('#panel .window[data-panel="map"]')).toBeVisible();
  const tabs = page.locator("#map-levels button[data-level]");
  await expect(tabs).toHaveCount(2);
  await expect(page.locator("#bigmap")).toHaveAttribute("data-level", "L0");
  await expect(page.locator('#map-levels button[data-level="L0"]')).toHaveAttribute("aria-selected", "true");
  await page.locator('#map-levels button[data-level="L1"]').click();
  await expect(page.locator("#bigmap")).toHaveAttribute("data-level", "L1");
  await expect(page.locator('#map-levels button[data-level="L1"]')).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('#map-levels button[data-level="L0"]')).toHaveAttribute("aria-selected", "false");
  await shot(page, "teaching-map-L1");
  // a first-floor room is listed with its floor
  await expect(page.locator('.dest[data-waypoint="icu-1"]')).toContainText("二层");
  await page.keyboard.press("Escape");
  await expect(page.locator("#panel")).toBeHidden();

  expect(errors).toEqual([]);
});
