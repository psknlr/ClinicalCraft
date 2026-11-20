/**
 * A place in the care team in the browser (docs/EMBODIED.md §2.1, docs/TEAM.md §1): no built-in case has a team, so the
 * case card shows neither the line-up nor the place row for any of them and an encounter looks as it always did — no
 * place in the badge, no scrub nurse's bar, the hand with its stethoscope, no surgery window. A case with a team — the
 * engine's own lap-chole team fixture, given to the page as a server would (`content.addServerContent`) — offers its
 * places; a start in the first assistant's place — chosen in the picker and started from the case card's own Enter —
 * puts the learner's body and view at the operating table, the badge and the team's panel say the place, the hand is
 * gloved, the demonstration's buttons are greyed out, and the surgery window works by place. The start takes no team
 * round (its team begins paused); once the encounter is entered the team goes on at its own pace and the encounter is
 * saved so (`letTeamGoOn`) — where the stand-in's first step is a critical one, its call-out comes then, on its card, and
 * is let go on there. Deterministic: no model provider, the team paused by the test once it has gone on (the call-out
 * test excepted: it answers the one card), the state read from `__QA__`, not the pixels.
 */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enterCase, freshStart, shot } from "./helpers.js";

const here = path.dirname(fileURLToPath(import.meta.url));
/** The engine's lap-chole team fixture, served to the page by the dev server as source (`/@fs/…`). */
const FIXTURES = path.resolve(here, "../../core/src/engine/procedure/__fixtures__");
const CASE = "mini-lap-chole-sit";
/** The same case whose team works from the clipping on: a place joins just before the first clip (`addTeamCase`). */
const CALLOUT_CASE = "mini-lap-chole-callout";
const FACILITY = "e2e-theatre-hospital";

/**
 * Give the page the team case and a hospital whose theatre has the team's staff (general-hospital's theatre, as the
 * world's own theatre fixture builds it), as `clinicalcraft serve` would; the library shows the new card. `calloutFirst`:
 * the case's team works from the clipping on (a phase of the operation of its own), so a place joins along the reference
 * path to just before the first clip and the stand-in surgeon's first step is a critical one — its call-out first.
 */
async function addTeamCase(page: Page, caseId = CASE, calloutFirst = false): Promise<void> {
  const added = await page.evaluate(
    async ({ fixtures, caseId, facilityId, calloutFirst }) => {
      const sit = await import(/* @vite-ignore */ `/@fs${fixtures}/lap-chole-sit.ts`);
      const team = await import(/* @vite-ignore */ `/@fs${fixtures}/lap-chole-team.ts`);
      const qa = (window as any).__QA__;
      const raw = { ...structuredClone(sit.LAP_CHOLE_SIT), id: caseId, team: { ...structuredClone(team.LAP_CHOLE_TEAM), room: "or-theatre" }, solution: structuredClone(team.LAP_CHOLE_SOLUTION) };
      if (calloutFirst) {
        const ops = structuredClone(team.REFERENCE_OPS) as { op: string }[];
        const clipAt = ops.findIndex((op) => op.op === "clip");
        const operate = (xs: unknown[]) => xs.map((op) => ({ type: "operate", op }));
        raw.phases = [...raw.phases, { id: "clipping", label: { en: "Clipping", "zh-CN": "夹闭" } }];
        raw.procedure = { ...raw.procedure, phases: ["theatre", "clipping"] };
        raw.team = { ...raw.team, phases: ["clipping"] };
        raw.solution = [{ type: "start" }, { type: "set-phase", phase: "theatre" }, ...operate(ops.slice(0, clipAt)), { type: "set-phase", phase: "clipping" }, ...operate(ops.slice(clipAt)), { type: "finish" }];
      }
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
    { fixtures: FIXTURES, caseId, facilityId: FACILITY, calloutFirst },
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
    // the demonstration is offered as always
    await expect(page.locator("#autopilot-btn")).toBeEnabled();
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
    // the start took no team round; entered, the team goes on at its own pace — and the encounter is saved so, for a resume
    await page.waitForFunction(() => (window as any).__QA__.session.team()?.autonomy === "auto", null, { timeout: 30_000 });
    expect(await page.evaluate((id) => (window as any).__QA__.app.saves.data.sessions[id]?.snapshot?.team?.autonomy ?? null, CASE)).toBe("auto");
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
    // the demonstration works the case as the operating surgeon: greyed out in a place, with the session's own words
    const refused = "示范接诊是以主刀医生的身份完成病例：你担任第一助手岗位时不能使用。";
    await expect(page.locator("#autopilot-btn")).toBeDisabled();
    await expect(page.locator("#autopilot-btn")).toHaveAttribute("title", refused);
    // … and so are the pause menu's button and the demonstration panel's Start and Watch, with the same words
    await page.evaluate(() => (window as any).__QA__.route("pause", { menu: true }));
    await expect(page.locator("#autopilot-menu")).toBeDisabled();
    await expect(page.locator("#autopilot-menu")).toHaveAttribute("title", refused);
    await page.evaluate(() => (window as any).__QA__.route("autopilot"));
    for (const id of ["#autopilot-start", "#autopilot-watch"]) {
      await expect(page.locator(id)).toBeDisabled();
      await expect(page.locator(id)).toHaveAttribute("title", refused);
    }
    await expect(page.locator("#autopilot-place")).toHaveText(refused);
    await page.evaluate(() => (window as any).__QA__.closePanel());
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

test.describe("a place in the care team: the stand-in's call-out (en)", () => {
  test.use({ locale: "en" });

  test("entered, the team goes on: the stand-in's first step is a critical one — its call-out on its card, let go on there", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await freshStart(page);
    await addTeamCase(page, CALLOUT_CASE, true);
    await page.locator(`.case-card[data-case="${CALLOUT_CASE}"]`).click();
    await page.locator("#facility-select").selectOption(FACILITY);
    await page.locator("#place-select").selectOption("first-assistant");
    await page.locator("#enter").click();
    await page.waitForFunction(() => (window as any).__QA__?.game?.entered === true, null, { timeout: 180_000 });
    // joined just before the clipping; the start took no team round, so nothing was asked before the card could show it
    expect(await page.evaluate(() => { const s = (window as any).__QA__.session.state; return { seat: s.seat, phase: s.phase }; })).toEqual({ seat: "first-assistant", phase: "clipping" });
    // the stand-in's call-out, asked of the learner on its own card once the team goes on
    await expect(page.locator(".callout-card")).toBeVisible({ timeout: 90_000 });
    await expect(page.locator("#approval-title")).toHaveText("Dr Ito: Clipping the cystic duct.");
    expect(await page.evaluate(() => (window as any).__QA__.session.team()?.autonomy)).toBe("auto");
    await shot(page, "places-callout");
    // No objection: the stand-in clips
    await page.locator("#approval-approve[data-callout=go]").click();
    await page.waitForFunction(() => ((window as any).__QA__.session.state.procedure?.clips?.["cystic-duct"] ?? 0) > 0, null, { timeout: 90_000 });
    const answered = await page.evaluate(() => {
      const qa = (window as any).__QA__;
      const asked = qa.store.log.flatMap((e: any) => (e.kind === "event" && e.event.msg.type === "approval_request" ? [[e.event.msg.agent, e.event.msg.actorId, e.event.msg.callout]] : []));
      return { asked, resolved: [...qa.store.resolved.values()], pending: qa.store.pendingApprovals().length };
    });
    expect(answered).toEqual({ asked: [["team", "staff:doc-0", "Clipping the cystic duct."]], resolved: ["approved"], pending: 0 });
    expect(errors).toEqual([]);
  });
});
