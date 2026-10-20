/**
 * The embodied controller asks the world model (no rule of the web's own,
 * EMBODIED §6): the patient's monitor and the bedside capabilities are the
 * world's (`atBedside`, `bedsideProviders`), the monitor's live screen is
 * readable only when the world's vitals check holds through that screen, and
 * a panel learns from the world whether an act can be done from here, after a
 * short step, or not — with the world's reason and way forward. Headless: a
 * real embodied session (STEMI, general-hospital), the avatar moved by poses.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { compileFacility, parseCase, parseCatalog, parseFacility, type CaseDefinition, type EquipmentCatalog, type FacilityDefinition } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { setLocale } from "../i18n/index.js";
import { ActionFeedback } from "../ui/feedback.js";
import { BrowserMover } from "./embodied.js";
import { EmbodiedLink } from "./embodied-link.js";
import { startAppSession, type AppSession } from "./session.js";
import { defaultSettings } from "./settings.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const content = path.resolve(here, "../../../content");
const json = (p: string) => JSON.parse(fs.readFileSync(path.join(content, p), "utf8"));
const caseOf = (id: string): CaseDefinition => {
  const r = parseCase(json(`cases/${id}/case.json`));
  if (!r.ok) throw new Error(`${id} does not parse`);
  return r.value;
};
const parsedFacility = parseFacility(json("facilities/general-hospital.json"));
if (!parsedFacility.ok) throw new Error("general-hospital does not parse");
const compiled = compileFacility(parsedFacility.value, []);
if (!compiled.ok) throw new Error("general-hospital does not compile");
const facility: FacilityDefinition = compiled.facility;
const catalogs: EquipmentCatalog[] = fs
  .readdirSync(path.join(content, "catalogs"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => parseCatalog(json(`catalogs/${f}`)))
  .flatMap((r) => (r.ok ? [r.value] : []));

/** STEMI's bed (resus-1) and its monitor; a spot between them; one behind the resus room's north wall. */
const MONITOR = "eq:resus1-monitor";
const BEDSIDE = { x: 30.1, z: -18.75 };
const BEHIND_WALL = { x: 30.5, z: -21.9 };

let open: { app: AppSession; link: EmbodiedLink }[] = [];
afterEach(async () => {
  for (const o of open) {
    o.link.dispose();
    await o.app.close();
  }
  open = [];
  setLocale("zh-CN");
});

async function start(caseId = "stemi-inferior-rv", locale = "en"): Promise<{ app: AppSession; link: EmbodiedLink; c: CaseDefinition; feedback: ActionFeedback }> {
  setLocale(locale === "en" ? "en" : "zh-CN");
  const c = caseOf(caseId);
  const stored = defaultSettings();
  stored.agent.approvalMode = "bypass";
  const app = await startAppSession({ caseDef: c, facility, catalogs, stored, choice: { provider: "offline", model: null, mode: "offline", fellBack: false }, locale, served: false, embodiment: "embodied" });
  app.submit({ type: "configure", patch: { approvalMode: "bypass" } });
  app.session.dispatch({ type: "start" });
  const slot = facility.patientSlots.find((s) => s.accepts.includes(c.setting as never)) ?? facility.patientSlots[0]!;
  const feedback = new ActionFeedback(() => null, () => null, () => undefined);
  const link = new EmbodiedLink({
    app,
    renderer: () => null,
    mover: new BrowserMover({ renderer: () => null }),
    facility,
    caseDef: c,
    slotId: slot.id,
    feedback,
    toast: () => undefined,
    locale: () => locale,
  });
  open.push({ app, link });
  return { app, link, c, feedback };
}

/** Stand at (x, z) facing (fx, fz): the avatar's pose goes to the world (the browser's sensor update). */
function stand(app: AppSession, at: { x: number; z: number }, face: { x: number; z: number } = { x: 31, z: -17.325 }): void {
  const yaw = Math.atan2(-(face.x - at.x), -(face.z - at.z));
  app.session.submit({ type: "world_pose", actorId: PRIMARY_ACTOR, pose: { x: at.x, y: 0, z: at.z, yaw, pitch: 0, level: "L0" } });
}

describe("the patient's monitor and the bedside (the world's rule)", () => {
  it("names the slot's linked monitor and counts the bedside capabilities the world counts", async () => {
    const { app, link } = await start();
    expect(link.patientMonitor()).toBe(MONITOR);
    const world = app.world()!;
    const caps = link.bedsideCaps();
    // the personal kit, what the world's bedside providers give, and pharmacy-delivered drugs
    expect(caps.has("stethoscope")).toBe(true);
    for (const cap of ["cardiac-monitor", "ecg-12lead", "oxygen"]) expect(caps.has(cap), cap).toBe(world.bedsideProviders(cap).length > 0);
    expect(caps.has("medications")).toBe(true);
    // never a capability only found in another room (CT is in radiology)
    expect(caps.has("ct")).toBe(false);
  });
});

describe("the monitor's live screen", () => {
  it("is dark until the monitor is attached, then readable from the bedside only", async () => {
    const { app, link } = await start();
    stand(app, BEDSIDE);
    expect(link.screen()).toMatchObject({ readable: false, reason: "no-monitor-attached", monitorId: MONITOR });
    app.session.dispatch({ type: "intervene", interventionId: "cardiac-monitoring" });
    expect(link.screen()).toMatchObject({ readable: true, monitorId: MONITOR });
  });

  it("behind the resus room's wall (within 6 m, no line of sight): out of view, with the world's words and a way there", async () => {
    const { app, link } = await start();
    app.session.dispatch({ type: "intervene", interventionId: "cardiac-monitoring" });
    stand(app, BEHIND_WALL);
    const view = link.screen();
    expect(view).toMatchObject({ readable: false, reason: "monitor-not-in-view", monitorId: MONITOR });
    expect(view.message).toContain("Resus Monitor 1");
    expect(view.message).toContain("6.0");
    expect(view.hint).toEqual({ goal: { kind: "interact", id: MONITOR }, label: 'Go to "Resus Monitor 1"' });
  });
});

describe("the HUD's screen check (cheap while walking)", () => {
  it("asks the world only where the screen could be read, and not again for the same pose", async () => {
    const { app, link } = await start();
    app.session.dispatch({ type: "intervene", interventionId: "cardiac-monitoring" });
    const world = app.world()!;
    let checks = 0;
    const real = world.checkSpatial.bind(world);
    world.checkSpatial = (...a: Parameters<typeof real>) => {
      checks++;
      return real(...a);
    };
    // the entrance: far beyond the screen range — out of view without a check
    stand(app, { x: facility.spawn.x, z: facility.spawn.z }, { x: 0, z: 0 });
    expect(link.screenKey(0)).toBe("monitor-not-in-view");
    expect(checks).toBe(0);
    // at the bedside: the world's check, once for this pose
    stand(app, BEDSIDE);
    expect(link.screenKey(1000)).toBe("readable");
    expect(link.screenKey(1100)).toBe("readable");
    expect(checks).toBe(1);
    // behind the wall (in range, no line of sight), in the corridor: not the monitor's room — out of view at once
    stand(app, BEHIND_WALL);
    expect(link.screenKey(1200)).toBe("monitor-not-in-view");
    expect(checks).toBe(1);
    // in the room again, across it: checked again once the 400 ms since the last check are up
    stand(app, { x: 30.25, z: -14 });
    expect(link.screenKey(1300)).toBe("readable");
    expect(checks).toBe(1);
    expect(link.screenKey(1500)).toBe("readable");
    expect(checks).toBe(2);
  });
});

describe("what a panel may offer (the world's verdict)", () => {
  it("at the bedside: done here; across the room: a short step; from the entrance: refused with the way there", async () => {
    const { app, link, c } = await start();
    const examine = { type: "examine", findingId: c.exam.find((f) => f.requires.length === 0)!.id } as const;
    stand(app, { x: 31, z: -16 });
    expect(link.verdict(examine)).toEqual({ kind: "ok" });
    stand(app, { x: 30.25, z: -11.5 });
    expect(link.verdict(examine)).toMatchObject({ kind: "step" });
    stand(app, { x: facility.spawn.x, z: facility.spawn.z }, { x: 0, z: 0 });
    const far = link.verdict(examine);
    expect(far).toMatchObject({ kind: "refused", reason: "not-at-patient", hint: { goal: { kind: "interact", id: "patient:resus-1" } } });
  });

  it("a lab test at the lab before any sample: refused, with the patient's side as the way (no order is placed)", async () => {
    const { app, link } = await start();
    const lab = facility.placements.find((p) => p.id === "lab-workstation")!;
    stand(app, { x: lab.x, z: lab.z + 1.4 }, { x: lab.x, z: lab.z });
    const v = link.verdict({ type: "order", investigationId: "cbc" });
    expect(v).toMatchObject({ kind: "refused", hint: { goal: { kind: "interact", id: "patient:resus-1" } } });
    expect(app.session.state.orders).toHaveLength(0);
    // at the patient's side the sample is taken there: it can be ordered
    stand(app, { x: 31, z: -16 });
    expect(link.verdict({ type: "order", investigationId: "cbc" })).toEqual({ kind: "ok" });
  });

  it("an IV drug before the cannula: refused with the procedure to do first (no walk fixes it)", async () => {
    const { app, link, c } = await start();
    stand(app, { x: 31, z: -16 });
    const drug = c.interventions.find((i) => i.requires.includes("iv-access") && i.id !== "iv-access")!;
    const v = link.verdict({ type: "intervene", interventionId: drug.id });
    expect(v).toMatchObject({ kind: "refused", reason: "clinical-prerequisite", hint: null, prerequisite: "iv-access" });
  });

  it("a short step the UI takes by itself is announced while it walks, and the act then goes through", async () => {
    const { app, link, c, feedback } = await start();
    const finding = c.exam.find((f) => f.requires.length === 0)!;
    stand(app, { x: 30.25, z: -11.5 });
    link.act({ type: "examine", findingId: finding.id });
    expect(feedback.current).toMatchObject({ tone: "info" });
    const t0 = Date.now();
    while (!app.session.state.examined.includes(finding.id) && Date.now() - t0 < 10_000) await new Promise((r) => setTimeout(r, 20));
    expect(app.session.state.examined).toContain(finding.id);
    expect(feedback.current).toBeNull();
  });

  it("a fetch: Go there walks to the cart and wheels it to the patient, as its label says", async () => {
    const { app, link } = await start("anaphylaxis-garden");
    const bench = facility.patientSlots.find((s) => s.id === "garden-bench")!;
    stand(app, { x: bench.x, z: bench.z + 1.2 }, bench);
    const v = link.verdict({ type: "intervene", interventionId: "monitoring" });
    expect(v).toMatchObject({ kind: "refused", reason: "provider-not-at-bedside" });
    if (v.kind !== "refused" || !v.hint?.then) throw new Error("expected a fetch hint");
    const cart = v.hint.then.targetId;
    const r = await link.goTo(v.hint.goal, v.hint.label, v.hint.then);
    expect(r?.status).toBe("completed");
    expect(app.world()!.atBedside(cart)).toBe(true);
    // at the bench with the monitor beside it: the monitoring can be started here now (or after a step)
    expect(["ok", "step"]).toContain(link.verdict({ type: "intervene", interventionId: "monitoring" }).kind);
  });

  it("speaks to a person: no operation ids in the refusal text", async () => {
    const { app, link, c } = await start("stemi-inferior-rv", "zh-CN");
    stand(app, { x: 31, z: -16 });
    for (const iv of c.interventions) {
      const v = link.verdict({ type: "intervene", interventionId: iv.id });
      if (v.kind === "refused") expect(v.message).not.toMatch(/move_to|navigate_to/);
    }
  });
});
