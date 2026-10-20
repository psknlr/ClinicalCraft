/**
 * Embodied web sessions (docs/EMBODIED.md R3, no DOM): the encounter's mode
 * is chosen at its start and kept by its save; the session builds the world
 * model with the browser's Mover; the physical world survives a save/load
 * (trimmed for local storage) and a save from another facility is dropped.
 */
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SessionSnapshot } from "@clinicalcraft/agent";
import { compileFacility, parseCase, parseCatalog, parseFacility, type EquipmentCatalog, type FacilityDefinition } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type Mover, type NavPlan, type Pose } from "@clinicalcraft/world";
import { DEFAULT_INVENTORY, EXPORT_FORMAT, SaveStore } from "./persistence.js";
import { startAppSession, type AppSession } from "./session.js";
import { defaultSettings, preferredEmbodiment } from "./settings.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const content = path.resolve(here, "../../../content");
const json = (p: string) => JSON.parse(fs.readFileSync(path.join(content, p), "utf8"));
const parsedCase = parseCase(json("cases/stemi-inferior-rv/case.json"));
if (!parsedCase.ok) throw new Error("stemi-inferior-rv does not parse");
const caseDef = parsedCase.value;
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

const offline = { provider: "offline", model: null, mode: "offline" as const, fellBack: false };

/** A mover that records the plans it was given and arrives at once (as the renderer would, later). */
class RecordingMover implements Mover {
  readonly moves: { actorId: string; plan: Extract<NavPlan, { ok: true }> }[] = [];
  async move(actorId: string, plan: Extract<NavPlan, { ok: true }>): Promise<{ arrived: boolean; pose: Pose; replans: number }> {
    this.moves.push({ actorId, plan });
    return { arrived: true, pose: { ...plan.target }, replans: 0 };
  }
  placeEntity(): void {}
  setDoor(): void {}
}

let open: AppSession[] = [];
async function start(o: { embodiment?: "clinical" | "embodied"; resume?: SessionSnapshot | null; facility?: FacilityDefinition | null; mover?: Mover } = {}): Promise<AppSession> {
  const app = await startAppSession({
    caseDef,
    facility: o.facility === undefined ? facility : o.facility,
    catalogs,
    stored: defaultSettings(),
    choice: offline,
    locale: "en",
    served: false,
    resume: o.resume ?? null,
    ...(o.embodiment ? { embodiment: o.embodiment } : {}),
    ...(o.mover ? { embodied: { mover: o.mover } } : {}),
  });
  open.push(app);
  return app;
}

afterEach(async () => {
  for (const app of open) await app.close();
  open = [];
});

async function until(cond: () => boolean, ms = 5000): Promise<void> {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("the encounter's mode (R3)", () => {
  it("is embodied by default in the 3D world, clinical when the learner turned it off", () => {
    const stored = defaultSettings();
    expect(preferredEmbodiment(stored)).toBe("embodied");
    stored.agent.embodiment = "clinical";
    expect(preferredEmbodiment(stored)).toBe("clinical");
  });

  it("starts an embodied encounter with a world model, and a clinical one without", async () => {
    const embodied = await start({ embodiment: "embodied" });
    expect(embodied.embodiment).toBe("embodied");
    expect(embodied.world()).not.toBeNull();
    expect(embodied.world()!.snapshot().actors.some((a) => a.id === PRIMARY_ACTOR)).toBe(true);
    const clinical = await start({ embodiment: "clinical" });
    expect(clinical.embodiment).toBe("clinical");
    expect(clinical.world()).toBeNull();
    // no facility (no 3D world): clinical whatever the preference
    expect((await start({ embodiment: "embodied", facility: null })).embodiment).toBe("clinical");
  });

  it("moves the learner's body with the browser's Mover along the world's plan", async () => {
    const mover = new RecordingMover();
    const app = await start({ embodiment: "embodied", mover });
    const slot = facility.patientSlots.find((s) => s.accepts.includes(caseDef.setting as never)) ?? facility.patientSlots[0]!;
    app.submit({ type: "world_action", request: { actionId: "walk-1", actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "point", x: slot.x, z: slot.z + 1.5 } } } as never);
    await until(() => app.store.worldResults.has("walk-1"));
    const r = app.store.worldResults.get("walk-1")!.result;
    expect(r.status).toBe("completed");
    expect(mover.moves).toHaveLength(1);
    expect(mover.moves[0]!.actorId).toBe(PRIMARY_ACTOR);
    expect(mover.moves[0]!.plan.path.length).toBeGreaterThan(0);
    const pose = app.world()!.snapshot().actors.find((a) => a.id === PRIMARY_ACTOR)!.pose;
    expect([pose.x, pose.z]).toEqual([mover.moves[0]!.plan.target.x, mover.moves[0]!.plan.target.z]);
  });
});

describe("saving and resuming an embodied encounter", () => {
  it("keeps the mode and the physical world (trimmed), and puts the body back where it stood", async () => {
    const app = await start({ embodiment: "embodied" });
    app.submit({ type: "world_pose", actorId: PRIMARY_ACTOR, pose: { x: 30, y: 0, z: -15, yaw: 0.5, pitch: 0, level: "L0" } } as never);
    for (let i = 0; i < 30; i++) app.submit({ type: "world_action", request: { actionId: `look-${i}`, actorId: PRIMARY_ACTOR, operation: "look_at", targetId: "eq:resus1-monitor" } } as never);
    await until(() => app.store.worldResults.has("look-29"));
    const snap = app.snapshot();
    expect(snap.embodiment).toBe("embodied");
    expect(snap.world?.results.length).toBeLessThanOrEqual(16);
    expect(snap.world?.results.every((r) => r.events.length === 0)).toBe(true);
    // a clinical preference does not change a saved embodied encounter
    const back = await start({ embodiment: "clinical", resume: snap });
    expect(back.embodiment).toBe("embodied");
    const pose = back.world()!.snapshot().actors.find((a) => a.id === PRIMARY_ACTOR)!.pose;
    const saved = snap.world!.actors.find((a) => a.id === PRIMARY_ACTOR)!.pose;
    expect([pose.x, pose.z, pose.level]).toEqual([saved.x, saved.z, saved.level]);
  });

  it("keeps a clinical save clinical, and drops a world saved for another facility", async () => {
    const clinical = await start({ embodiment: "clinical" });
    const snap = clinical.snapshot();
    expect(snap.embodiment ?? "clinical").toBe("clinical");
    expect((await start({ embodiment: "embodied", resume: snap })).embodiment).toBe("clinical");
    const embodied = await start({ embodiment: "embodied" });
    const other = embodied.snapshot();
    const foreign = { ...other, world: { ...other.world!, facilityId: "teaching-hospital" } };
    const back = await start({ resume: foreign });
    expect(back.embodiment).toBe("embodied");
    expect(back.world()!.snapshot().facilityId).toBe(facility.id);
  });

  it("validates the embodied part of an imported save", async () => {
    const app = await start({ embodiment: "embodied" });
    const session = app.snapshot();
    const known = { cases: new Set([caseDef.id]), facilities: new Set(["general-hospital"]) };
    const file = (s: unknown) => JSON.stringify({ format: EXPORT_FORMAT, version: 1, session: s, facilityId: "general-hospital", world: null, inventory: { ...DEFAULT_INVENTORY }, settings: {} });
    const ok = SaveStore.parseImport(file(session), known);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.file.session.embodiment).toBe("embodied");
      expect(ok.file.session.world?.format).toBe("clinicalcraft-world@1");
    }
    const broken = SaveStore.parseImport(file({ ...session, world: { ...session.world!, actors: [{ id: "actor:clinician" }] } }), known);
    expect(broken.ok).toBe(true);
    if (broken.ok) {
      expect(broken.file.session.embodiment).toBe("embodied");
      expect(broken.file.session.world).toBeUndefined();
    }
  });
});
