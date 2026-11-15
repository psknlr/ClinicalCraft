/**
 * A place in the care team in the browser (docs/EMBODIED.md §2.1, docs/TEAM.md §1): no built-in case has a team, so the
 * case card shows neither the line-up nor the place row for any of them and an encounter looks as it always did — no
 * place in the badge, no scrub nurse's bar, the hand with its stethoscope, no surgery window. A case with a team — the
 * engine's own lap-chole team fixture, given to the page as a server would (`content.addServerContent`) — offers its
 * places; a start in the first assistant's place — chosen in the picker and started from the case card's own Enter —
 * puts the learner's body and view at the operating table, the badge and the team's panel say the place, the hand is
 * gloved, and the surgery window works by place. Deterministic: no model provider, the team paused right after the
 * start, the state read from `__QA__`, not the pixels.
 */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enterCase, freshStart, shot } from "./helpers.js";

const here = path.dirname(fileURLToPath(import.meta.url));
/** The engine's lap-chole team fixture, served to the page by the dev server as source (`/@fs/…`). */
const FIXTURES = path.resolve(here, "../../core/src/engine/procedure/__fixtures__");
const CASE = "mini-lap-chole-sit";
const FACILITY = "e2e-theatre-hospital";

/**
 * Give the page the team case and a hospital whose theatre has the team's staff (general-hospital's theatre, as the
 * world's own theatre fixture builds it), as `clinicalcraft serve` would; the library shows the new card.
 */
async function addTeamCase(page: Page): Promise<void> {
  const added = await page.evaluate(
    async ({ fixtures, caseId, facilityId }) => {
      const sit = await import(/* @vite-ignore */ `/@fs${fixtures}/lap-chole-sit.ts`);
      const team = await import(/* @vite-ignore */ `/@fs${fixtures}/lap-chole-team.ts`);
      const qa = (window as any).__QA__;
      const raw = { ...structuredClone(sit.LAP_CHOLE_SIT), id: caseId, team: { ...structuredClone(team.LAP_CHOLE_TEAM), room: "or-theatre" }, solution: structuredClone(team.LAP_CHOLE_SOLUTION) };
      const facility = structuredClone(qa.content.facilities.get("general-hospital"));
      facility.id = facilityId;
      const L = (en: string, zh: string) => ({ en, "zh-CN": zh });
      const staff = (id: string, role: string, position: string, en: string, zh: string, x: number, z: number, room = "or-theatre") => ({ id, role, position, name: L(en, zh), room, x, z, rot: 0 });
      facility.staff.push(
        staff("doc-0", "attending", "surgeon", "Dr Ito", "伊藤医生", -19.5, -7),
        staff("doc-1", "attending", "first-assistant", "Dr Abe", "阿部医生", -20.5, -6),
        staff("doc-2", "attending", "second-assistant", "Dr Sato", "佐藤医生", -21.5, -6),
        staff("nurse-1", "nurse", "circulating-nurse", "Lin Xiao", "林晓", -19, -9.5),
        staff("nurse-2", "nurse", "scrub-nurse", "Chen Yu", "陈雨", -22.5, -6),
        staff("anaes-1", "attending", "anaesthetist", "Dr Wang", "王医生", -28.5, -9.5),
        staff("nurse-9", "nurse", "scrub-nurse", "Zhou Min", "周敏", -21, -18, "or-scrub"),
      );
      const n = qa.content.addServerContent({ cases: [raw], facilities: [facility], catalogs: [] });
      qa.app.intro.render();
      return { n, issues: qa.content.issues.slice(-5) };
    },
    { fixtures: FIXTURES, caseId: CASE, facilityId: FACILITY },
  );
  expect(added.n, JSON.stringify(added.issues)).toBe(2);
}

test.describe("a place in the care team (zh-CN)", () => {
  test.use({ locale: "zh-CN" });

  test("no built-in case offers a place: no line-up or place row on any card, and an encounter is as it always was", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await expect(page.locator("#embodied-toggle")).toBeChecked();
    const cards = await page.evaluate(() => (window as any).__QA__.content.cards.map((c: any) => ({ id: c.id, seats: c.seats, lineups: c.lineups })));
    expect(cards.length).toBeGreaterThan(10);
    for (const card of cards) {
      expect(card, card.id).toMatchObject({ seats: [], lineups: [] });
      await page.locator(`.case-card[data-case="${card.id}"]`).click();
      await expect(page.locator(".case-card[aria-selected=true]")).toHaveAttribute("data-case", card.id);
      await expect(page.locator("#place-row"), card.id).toHaveCount(0);
      await expect(page.locator("#lineup-row"), card.id).toHaveCount(0);
    }
    await enterCase(page, "stemi-inferior-rv");
    await expect(page.locator("#embodiment-badge")).toHaveAttribute("data-mode", "embodied");
    const seen = await page.evaluate(() => {
      const qa = (window as any).__QA__;
      return { seat: qa.session.state.seat ?? null, held: qa.world.debug.held, surgery: (document.querySelector("#surgery-btn") as HTMLElement).hidden, scrub: (document.querySelector("#scrub-bar") as HTMLElement).hidden, badge: document.querySelector("#embodiment-badge")!.textContent };
    });
    expect(seen).toMatchObject({ seat: null, held: "bedside", surgery: true, scrub: true });
    // the badge says where the learner is, and nothing of a place
    for (const place of ["第一助手", "第二助手", "洗手护士"]) expect(seen.badge).not.toContain(place);
    expect(errors).toEqual([]);
  });

  test("a case with a team offers its places; the first assistant's start puts the learner at the table, gloved, the window by place", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await addTeamCase(page);
    await page.locator(`.case-card[data-case="${CASE}"]`).click();
    // the line-up and the place rows, in-world
    await expect(page.locator("#lineup-row")).toBeVisible();
    await expect(page.locator("#place-row")).toBeVisible();
    const places = await page.locator("#place-select option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    expect(places).toEqual(["", "first-assistant", "scrub-nurse"]);
    await page.locator("#lineup-select").selectOption("three-surgeons");
    expect(await page.locator("#place-select option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))).toEqual(["", "first-assistant", "second-assistant", "scrub-nurse"]);
    await page.locator("#lineup-select").selectOption("");
    // the hospital the page was given, then the place — and the case card's own Enter starts the encounter in it
    await page.locator("#facility-select").selectOption(FACILITY);
    await page.locator("#place-select").selectOption("first-assistant");
    await expect(page.locator("#place-select")).toHaveValue("first-assistant");
    await expect(page.locator("#facility-select")).toHaveValue(FACILITY);
    await shot(page, "places-picker");
    await page.locator("#enter").click();
    await page.waitForFunction(() => (window as any).__QA__?.game?.entered === true, null, { timeout: 180_000 });
    // started as the picker chose: the place, no line-up, the hospital
    expect(await page.evaluate(() => { const qa = (window as any).__QA__; return { seat: qa.session.state.seat ?? null, lineup: qa.session.state.lineup ?? null, facility: qa.game.facility.id }; })).toEqual({ seat: "first-assistant", lineup: null, facility: FACILITY });
    // the team waits for the test from here on (one round at a time, none asked)
    await page.evaluate(() => (window as any).__QA__.session.run({ type: "team", action: "pause" }));
    const at = await page.evaluate(() => {
      const qa = (window as any).__QA__;
      const world = qa.worldModel;
      const pose = world.actor("actor:clinician").pose;
      const bed = world.patientPlace();
      const view = qa.world.position;
      return { seat: qa.session.state.seat, room: world.roomOf("actor:clinician"), fromBed: Math.hypot(pose.x - bed.x, pose.z - bed.z), view: Math.hypot(view.x - pose.x, view.z - pose.z), held: qa.world.debug.held };
    });
    expect(at).toMatchObject({ seat: "first-assistant", room: "or-theatre", held: "sterile" });
    expect(at.fromBed).toBeLessThan(2);
    expect(at.view).toBeLessThan(0.5);
    // the badge says the place
    await expect(page.locator("#embodiment-badge")).toContainText("第一助手");
    // the team's panel: the place in its header, the play/observe row's own ids
    await page.evaluate(() => (window as any).__QA__.route("team"));
    await expect(page.locator("#team-place")).toHaveAttribute("data-seat", "first-assistant");
    await expect(page.locator("#team-place")).toContainText("你：第一助手");
    // the team as it works: the learner's own place, the colleague standing by, the stand-in who operates
    await expect(page.locator("#team-members")).toContainText("第一助手：你");
    await expect(page.locator("#team-members")).toContainText("阿部医生在旁待命");
    await expect(page.locator("#team-members")).toContainText("主刀医生：伊藤医生");
    // in a place the stand-in asks and the learner answers: no Ask row
    await expect(page.locator("#team-ask")).toHaveCount(0);
    await expect(page.locator("#team-learner")).toBeVisible();
    await expect(page.locator("#team-observer")).toBeVisible();
    await shot(page, "places-team");
    // the surgery window by place
    await page.evaluate(() => (window as any).__QA__.route("surgery"));
    await expect(page.locator("#lap-place")).toHaveAttribute("data-seat", "first-assistant");
    await shot(page, "places-surgery");
    expect(errors).toEqual([]);
  });
});
