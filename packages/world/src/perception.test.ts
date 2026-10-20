import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { t, type CaseDefinition, type LocalizedText } from "@clinicalcraft/core";
import { PRIMARY_ACTOR, type Pose } from "./contracts.js";
import { yawTowards } from "./visibility.js";
import { caseIds, makeWorld, type TestWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;
const at = (x: number, z: number, yaw = 0): Pose => ({ x, y: 0, z, yaw, pitch: 0, level: "L0" });
const facing = (w: TestWorld, from: { x: number; z: number }, id: string): Pose => {
  const e = w.runtime.entity(id)!;
  return at(from.x, from.z, yawTowards(from, e.position));
};

describe("awareness levels (EMBODIED R7)", () => {
  it("from the entrance: the patient, fixed stations and where carts are usually kept are mapped; staff are unknown until seen", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const [patient] = w.runtime.find(A, { kind: "patient" });
    expect(patient).toMatchObject({ id: w.patientId, awareness: "mapped", visible: false, reachable: true });
    expect(patient.cues).toBeUndefined();
    expect(patient.name).toBe("Liu Zhenhua (pseudonym) (58 years male)");
    expect(w.runtime.find(A, { type: "ct-scanner" })).toMatchObject([{ id: "eq:ct-scanner", awareness: "mapped" }]);
    // portable equipment: on the map where the department keeps it (lead note 1)
    for (const e of w.runtime.find(A, { type: "ecg-machine" })) expect(e).toMatchObject({ awareness: "mapped", lastKnown: { kind: "usual" }, inReach: false });
    expect(w.runtime.find(A, { type: "ecg-machine" }).map((e) => e.id)).toContain("eq:resus1-ecg");
    expect(w.runtime.find(A, { kind: "staff" }).map((e) => e.id)).not.toContain("staff:ed-nurse");
    expect(w.runtime.inspect(A, "staff:ed-nurse")).toBeNull();
    expect(w.runtime.inspect(A, "eq:resus1-ecg")).toMatchObject({ awareness: "mapped", room: "ed-resus" });
    for (const e of w.runtime.observe(A).entities) expect(["visible", "nearby", "remembered"]).toContain(e.awareness);
    // at the bedside the cart is visible; walking away it is remembered
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    expect(w.runtime.observe(A).entities.find((e) => e.id === "eq:resus1-ecg")).toMatchObject({ awareness: "visible", state: "idle", stateVersion: 0 });
    expect((await w.act({ actorId: A, operation: "approach", targetId: "lab-workstation" })).status).toBe("completed");
    expect(w.runtime.find(A, { type: "ecg-machine", awareness: ["remembered"] })).toMatchObject([{ id: "eq:resus1-ecg", awareness: "remembered", visible: false, lastKnown: { kind: "last-seen" } }]);
    expect(w.runtime.actor(A)!.seen).toContain("eq:resus1-ecg");
  });

  it("nearby: around the actor with a line of sight, whatever its facing — never through walls", () => {
    const w = makeWorld("stemi-inferior-rv");
    const ecg = w.runtime.entity("eq:resus1-ecg")!;
    w.runtime.updatePose(A, at(ecg.position.x + 3, ecg.position.z, Math.PI / 2 + Math.PI)); // looking away (+X)
    expect(w.runtime.canSee(A, ecg.id)).toBe(false);
    expect(w.runtime.find(A, { type: "ecg-machine" }).find((e) => e.id === ecg.id)).toMatchObject({ awareness: "nearby", visible: false });
    // in the ED station next door, behind the solid part of its east wall (its window spans z −16.25…−13.75): neither visible nor nearby
    w.runtime.updatePose(A, at(24.5, -19, Math.PI / 2 + Math.PI));
    expect(w.runtime.find(A, { type: "ecg-machine", awareness: ["visible", "nearby"] }).map((e) => e.id)).not.toContain(ecg.id);
    // …but through the window it is in view
    w.runtime.updatePose(A, at(24.5, -15, Math.PI / 2 + Math.PI));
    expect(w.runtime.canSee(A, ecg.id)).toBe(true);
  });
});

describe("observations are bounded, ordered and oriented", () => {
  it("nearest first (perceived before remembered), truncated at maxEntities; bearings relative to facing", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    const full = w.runtime.observe(A);
    expect(full.entities.length).toBeGreaterThan(5);
    const small = w.runtime.observe(A, { maxEntities: 3 });
    expect(small.truncated).toBe(true);
    expect(small.entities.map((e) => e.id)).toEqual(full.entities.slice(0, 3).map((e) => e.id));
    const perceived = full.entities.filter((e) => e.awareness !== "remembered").map((e) => e.distance);
    expect(perceived).toEqual([...perceived].sort((a, b) => a - b));
    expect(full).toMatchObject({ actor: { id: A, role: "clinician", room: "ed-resus", roomName: "Resuscitation Room", holding: [] }, worldVersion: w.runtime.version });
    expect(full.recentEvents.length).toBeGreaterThan(0);
    expect(full.recentEvents.at(-1)!.summary).toMatch(/^You: Approach/); // the observer's own action, in the second person (G13)
    // bearings: straight ahead ≈ 0, to the right > 0, to the left < 0
    const monitor = w.runtime.entity("eq:resus1-monitor")!;
    const me = w.runtime.actor(A)!.pose;
    w.runtime.updatePose(A, facing(w, me, monitor.id));
    const ahead = w.runtime.inspect(A, monitor.id)!;
    expect(Math.abs(ahead.bearing)).toBeLessThan(1);
    w.runtime.updatePose(A, { ...w.runtime.actor(A)!.pose, yaw: w.runtime.actor(A)!.pose.yaw + Math.PI / 4 }); // turn left 45°
    expect(w.runtime.inspect(A, monitor.id)!.bearing).toBeCloseTo(45, 0);
  });

  it("find filters by kind, type, capability, name (either language), room and distance; path sort by reachability", () => {
    const w = makeWorld("stemi-inferior-rv");
    const labs = w.runtime.find(A, { capabilities: ["lab-chemistry"] });
    expect(labs.map((e) => e.id).sort()).toEqual(["eq:lab-chemistry", "eq:lab-workstation"]);
    for (const e of labs) expect(e).toMatchObject({ reachable: true, pathDistance: expect.any(Number) });
    expect(labs[0].pathDistance!).toBeLessThanOrEqual(labs[1].pathDistance!);
    expect(w.runtime.find(A, { name: "ct" }).map((e) => e.id)).toContain("eq:ct-scanner");
    expect(w.runtime.find(A, { name: "检验", kind: "room" }).map((e) => e.id)).toContain("room:laboratory");
    expect(w.runtime.find(A, { room: "rad-ct" }).every((e) => e.room === "rad-ct")).toBe(true);
    expect(w.runtime.find(A, { maxDistance: 5, awareness: ["mapped"] }).every((e) => e.distance <= 5)).toBe(true);
    expect(w.runtime.find(A, { kind: "room", limit: 2 })).toHaveLength(2);
  });
});

describe("read-only tools never change a version; memory is recorded silently", () => {
  it("observe / find / inspect / roomInfo / canSee", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    const v = w.runtime.version;
    const actorVersion = w.runtime.snapshot().entities[A].version;
    const seen = w.runtime.actor(A)!.seen.length;
    w.runtime.updatePose(A, { ...w.runtime.actor(A)!.pose, yaw: w.runtime.actor(A)!.pose.yaw + Math.PI }); // a sensor turn: the actor's own version only
    expect(w.runtime.version).toBe(v);
    const first = JSON.stringify(w.runtime.observe(A).entities);
    w.runtime.find(A, {});
    w.runtime.inspect(A, w.patientId);
    w.runtime.roomInfo(A);
    w.runtime.canSee(A, "eq:resus1-monitor");
    expect(JSON.stringify(w.runtime.observe(A).entities)).toBe(first);
    expect(w.runtime.version).toBe(v);
    expect(w.runtime.snapshot().entities[A].version).toBe(actorVersion + 1);
    expect(w.runtime.actor(A)!.seen.length).toBeGreaterThanOrEqual(seen);
  });
});

describe("cues: bystander facts only, while perceived", () => {
  it("patient cues from ClinicalView.cues", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    expect(w.runtime.inspect(A, w.patientId)!.cues).toEqual({ posture: "lying" });
    w.harness.cues = { posture: "sitting", distressed: true, accessory: "oxygen mask", speaking: true };
    expect(w.runtime.inspect(A, w.patientId)!.cues).toEqual({ posture: "sitting", distressed: "visibly distressed", accessory: "oxygen mask", speaking: "speaking" });
    // the description tells the posture now (G12: truthful bystander cues), not the encounter's first one
    expect(w.runtime.inspect(A, w.patientId)!.description).toBe("Liu Zhenhua (pseudonym), 58 years male, sitting");
  });

  it("the monitor screen only when the monitor is visible, within 6 m, the patient's and attached — what check_vitals shows", async () => {
    const w = makeWorld("stemi-inferior-rv");
    const id = "eq:resus1-monitor";
    const monitor = w.runtime.entity(id)!;
    const near = { x: monitor.position.x + 2.5, z: monitor.position.z + 2 };
    w.runtime.updatePose(A, facing(w, near, id));
    expect(w.runtime.inspect(A, id)).toMatchObject({ awareness: "visible", state: "detached" });
    expect(w.runtime.inspect(A, id)!.cues).toBeUndefined();
    w.harness.dispatch({ type: "intervene", interventionId: "cardiac-monitoring" });
    const cues = w.runtime.inspect(A, id)!.cues!;
    expect(cues.screen).toMatch(/^HR \d+\/min/);
    const vitals = w.harness.view.bedside()!.vitals;
    expect(cues.screen).toContain(`${vitals.hr}/min`);
    expect(cues.screen).toContain(`${vitals.sbp}/${vitals.dbp} mmHg`);
    // turned away: nearby, no screen
    w.runtime.updatePose(A, { ...w.runtime.actor(A)!.pose, yaw: w.runtime.actor(A)!.pose.yaw + Math.PI });
    expect(w.runtime.inspect(A, id)).toMatchObject({ awareness: "nearby" });
    expect(w.runtime.inspect(A, id)!.cues).toBeUndefined();
    // in view but beyond the 6 m screen range
    const far = { x: monitor.position.x + 9, z: monitor.position.z + 6 };
    w.runtime.updatePose(A, facing(w, far, id));
    expect(w.runtime.inspect(A, id)).toMatchObject({ awareness: "visible" });
    expect(w.runtime.inspect(A, id)!.cues).toBeUndefined();
    // the other bay's monitor never shows this patient
    w.runtime.updatePose(A, facing(w, { x: 39.65 + 2, z: -19.475 + 2 }, "eq:resus2-monitor"));
    expect(w.runtime.inspect(A, "eq:resus2-monitor")).toMatchObject({ awareness: "visible", state: "detached" });
    expect(w.runtime.inspect(A, "eq:resus2-monitor")!.cues).toBeUndefined();
  });

  it("a case without a physiology model shows no values on a monitor", async () => {
    const f = structuredClone((await import("./__fixtures__/content.js")).loadFacility("clinic-v4"));
    f.placements.push({ id: "test-monitor", type: "patient-monitor", x: -8, z: 5.5, y: 0, rot: 0, room: "consult" });
    const w = makeWorld("smzl-lung-adeno", { facility: f });
    w.runtime.updatePose(A, facing(w, { x: -6, z: 6.5 }, "eq:test-monitor"));
    expect(w.runtime.inspect(A, "eq:test-monitor")).toMatchObject({ state: "attached", cues: { screen: "no reading recorded" } });
  });
});

describe("rooms and reachability", () => {
  it("roomInfo: the actor's room, its exits and what the actor knows in it", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect(w.runtime.roomInfo(A)).toBeNull(); // outdoors
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    const room = w.runtime.roomInfo(A)!;
    expect(room).toMatchObject({ id: "room:ed-resus", name: "Resuscitation Room", kind: "resus", level: "L0" });
    expect(room.exits.map((x) => x.to).sort()).toEqual(["ed-hall", "ed-station"]);
    expect(room.entities.map((e) => e.id)).toEqual(expect.arrayContaining([w.patientId, "eq:resus1-ecg", "eq:resus1-monitor"]));
    expect(room.entities.every((e) => e.room === "ed-resus")).toBe(true);
    expect(w.runtime.roomInfo(A, "laboratory")!.entities.every((e) => e.awareness === "mapped" || e.awareness === "remembered")).toBe(true);
    expect(w.runtime.roomInfo(A, "nowhere")).toBeNull();
  });

  it("behind a locked door: not reachable; unlocked: reachable again", () => {
    const w = makeWorld("stemi-inferior-rv");
    const [door] = w.runtime.collision.doors.filter((d) => d.rooms.includes("ed-store"));
    const store = () => w.runtime.find(A, { kind: "room" }).find((e) => e.id === "room:ed-store")!;
    expect(store()).toMatchObject({ awareness: "mapped", reachable: true });
    w.runtime.setDoor(door.id, { locked: true });
    expect(store()).toMatchObject({ reachable: false });
    w.runtime.setDoor(door.id, { locked: false });
    expect(store()).toMatchObject({ reachable: true });
  });

  it("people: staff by role and name; the clinician as another actor sees them", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: "staff:ed-nurse" })).status).toBe("completed");
    const nurse = w.runtime.inspect(A, "staff:ed-nurse")!;
    expect(nurse).toMatchObject({ kind: "staff", type: "nurse", awareness: "visible", inReach: true, availableActions: [] });
    expect(nurse.description).toMatch(/^Nurse · /);
    const me = w.runtime.inspect("staff:ed-nurse", A)!;
    expect(me).toMatchObject({ kind: "actor", type: "clinician", name: "Clinician" });
  });
});

/* ------------------------------------------------------------------ */
/* The information boundary (grounding rule, extended to space)        */
/* ------------------------------------------------------------------ */

const texts = (x: LocalizedText | undefined): string[] => (x === undefined ? [] : typeof x === "string" ? [x] : Object.values(x));

/** Case texts an observation must never contain: history answers, findings, results, diagnosis, decision options. */
function forbidden(c: CaseDefinition): string[] {
  const out = [
    ...c.history.flatMap((h) => texts(h.answer)),
    ...c.exam.flatMap((f) => texts(f.finding)),
    ...c.investigations.flatMap((i) => Object.values(i.results).flatMap((r) => [...texts(r.text), ...texts(r.note)])),
    ...c.decisions.flatMap((d) => d.options.flatMap((o) => texts(o.text))),
    ...texts(c.title),
    ...texts(c.debrief.title),
    ...texts(c.debrief.conclusion),
    ...c.debrief.keyReasoning.flatMap(texts),
    ...texts(c.patient.chiefComplaint),
    ...texts(c.patient.triageNote),
  ];
  return [...new Set(out.map((s) => s.trim()).filter((s) => s.length >= 4))];
}

/** Public content (facility, catalogs): a case text that also appears there is not a secret. */
const PUBLIC = ["facilities/general-hospital.json", "facilities/clinic-v4.json", "catalogs/core-clinical.json", "catalogs/core-diagnostics.json", "catalogs/core-furniture.json"].map((rel) => readFileSync(new URL(`../../content/${rel}`, import.meta.url), "utf8")).join("\n");

describe("perception never reveals case facts (all built-in cases, both languages)", () => {
  for (const caseId of caseIds()) {
    for (const locale of ["en", "zh-CN"]) {
      it(`${caseId} (${locale})`, async () => {
        const w = makeWorld(caseId, { locale });
        const outputs: unknown[] = [w.runtime.observe(A), w.runtime.find(A, {})];
        expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
        // put the monitor on when there is one, so its screen is part of what is seen
        const monitors = w.runtime.find(A, { kind: "equipment", type: "patient-monitor", maxDistance: 6 });
        for (const m of monitors) await w.act({ actorId: A, operation: "attach", targetId: m.id });
        for (const m of monitors) {
          w.runtime.updatePose(A, facing(w, w.runtime.actor(A)!.pose, m.id));
          outputs.push(w.runtime.inspect(A, m.id));
        }
        outputs.push(w.runtime.observe(A), w.runtime.find(A, {}), w.runtime.find(A, { kind: "patient" }), w.runtime.inspect(A, w.patientId), w.runtime.roomInfo(A));
        const json = JSON.stringify(outputs);
        const name = w.caseDef.patient.displayName;
        const secrets = forbidden(w.caseDef).filter((s) => !PUBLIC.includes(s) && !texts(name).some((n) => n.includes(s)));
        expect(secrets.length).toBeGreaterThan(5);
        for (const s of secrets) expect(json.includes(s), `${caseId}: observation contains "${s}"`).toBe(false);
        expect(json).toContain(t(name, locale));
      });
    }
  }
});

describe("G13: recent events are the observer's own, its delegates' and what it perceives", () => {
  const N = "staff:ed-nurse"; // Lin Xiao, at the ED nurse station
  const mentionsNurse = (w: TestWorld) => w.runtime.observe(A).recentEvents.filter((e) => /Lin Xiao|林晓/.test(e.summary));

  it("another actor out of sight: its walk is not reported; the same walk done for the observer is, in the third person", async () => {
    const w = makeWorld("stemi-inferior-rv");
    // the clinician in the physician office, far from the ED
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
    expect((await w.act({ actorId: N, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    expect(w.runtime.find(A, { kind: "staff", awareness: ["visible", "nearby"] }).map((e) => e.id)).not.toContain(N);
    expect(mentionsNurse(w)).toEqual([]);
    // a delegated task: the nurse acts for the clinician — the clinician hears of it wherever it is
    expect((await w.act({ actorId: N, operation: "approach", targetId: "eq:resus1-ecg", onBehalfOf: A })).status).toBe("completed");
    const told = mentionsNurse(w);
    expect(told.length).toBeGreaterThan(0);
    expect(told.map((e) => e.summary).join(" ")).toMatch(/^Lin Xiao moved|Lin Xiao: /);
    expect(told.every((e) => !/\byou\b/i.test(e.summary))).toBe(true);
    // never another actor's own discoveries unless done for the observer
    expect(w.runtime.observe(A).recentEvents.filter((e) => e.type === "actor.discovered").every((e) => !/Lin Xiao/.test(e.summary) || told.some((t) => t.id === e.id))).toBe(true);
  });

  it("the observer's own events are in the second person (both locales); a perceived actor's in the third", async () => {
    for (const locale of ["en", "zh-CN"]) {
      const w = makeWorld("stemi-inferior-rv", { locale });
      expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
      const own = w.runtime.observe(A).recentEvents;
      expect(own.find((e) => e.type === "actor.moved")!.summary).toMatch(locale === "en" ? /^You moved \d/ : /^你移动了/);
      expect(own.find((e) => e.type === "action.completed")!.summary).toMatch(locale === "en" ? /^You: / : /^你：/);
      // the nurse walks into the resus room where the clinician stands: perceived, third person
      expect((await w.act({ actorId: N, operation: "approach", targetId: "eq:resus1-monitor" })).status).toBe("completed");
      const seen = w.runtime.find(A, { kind: "staff", awareness: ["visible", "nearby"] }).map((e) => e.id);
      expect(seen).toContain(N);
      const nurse = w.runtime.observe(A).recentEvents.filter((e) => /Lin Xiao|林晓/.test(e.summary));
      expect(nurse.length).toBeGreaterThan(0);
      expect(nurse.find((e) => e.type === "actor.moved")!.summary).toMatch(locale === "en" ? /^Lin Xiao moved/ : /^林晓移动了/);
    }
  });

  it("a device changed out of the observer's sight is not reported; in sight it is", async () => {
    const w = makeWorld("stemi-inferior-rv");
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:office-records" })).status).toBe("completed");
    // the nurse wheels the bay's ECG cart to the patient
    expect((await w.act({ actorId: N, operation: "approach", targetId: "eq:resus1-ecg" })).status).toBe("completed");
    expect((await w.act({ actorId: N, operation: "move_to", targetId: "eq:resus1-ecg", goal: { kind: "interact", id: w.patientId } })).status).toBe("completed");
    expect(w.runtime.observe(A).recentEvents.filter((e) => e.type === "entity.moved")).toEqual([]);
    expect((await w.act({ actorId: A, operation: "approach", targetId: w.patientId })).status).toBe("completed");
    expect(w.runtime.observe(A).recentEvents.filter((e) => e.type === "entity.moved").map((e) => e.summary)).toEqual([expect.stringMatching(/ECG/)]);
  });
});
