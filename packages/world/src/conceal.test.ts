/**
 * Concealed items (conceal.ts): out of everyone's sight — observations, find, canSee, events, acting by id — until a
 * search within reach (or of the thing it is concealed in) reveals them; kept by a snapshot.
 */
import { describe, expect, it } from "vitest";
import { parseCatalog, type EquipmentCatalog } from "@clinicalcraft/core";
import { PRIMARY_ACTOR } from "./contracts.js";
import { loadFacility } from "./__fixtures__/content.js";
import { catalogs, makeWorld, type TestWorld } from "./__fixtures__/world.js";

const A = PRIMARY_ACTOR;
const NURSE = "staff:ed-nurse";
const part = [{ m: "white", p: [0, 0.05, 0], s: [0.2, 0.1, 0.1] }];

function swabCatalog(): EquipmentCatalog {
  const r = parseCatalog({
    schema: "clinicalcraft/equipment-catalog@1",
    id: "conceal-test",
    name: { "zh-CN": "测试", en: "Test" },
    equipment: [{ id: "swab", name: { "zh-CN": "纱布", en: "Swab" }, category: "surgery", description: { "zh-CN": "纱布", en: "A swab" }, footprint: { w: 0.1, d: 0.1, h: 0.02 }, solid: false, parts: part, interaction: { kind: "device" }, portable: "handheld" }],
  });
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.value;
}

function world(): TestWorld {
  const facility = structuredClone(loadFacility("general-hospital"));
  facility.placements.push(
    { id: "swab-1", type: "swab", x: 35, z: -13, y: 0, rot: 0, room: "ed-resus" },
    { id: "swab-2", type: "swab", x: 35.4, z: -13, y: 0, rot: 0, room: "ed-resus" },
  );
  return makeWorld("stemi-inferior-rv", { facility, catalogs: [...catalogs(), swabCatalog()] });
}

const seen = (w: TestWorld, actor: string, id: string) => w.runtime.find(actor, { type: "swab" }).some((e) => e.id === id);

describe("concealed items", () => {
  it("nobody perceives a concealed item, nor can act on it by id; a search within reach reveals it", async () => {
    const w = world();
    expect((await w.act({ actorId: A, operation: "approach", targetId: "eq:swab-1" })).status).toBe("completed");
    expect(seen(w, A, "eq:swab-2")).toBe(true);
    w.runtime.placeItem("eq:swab-2", "eq:swab-1", { concealed: true });
    expect(seen(w, A, "eq:swab-2")).toBe(false);
    expect(w.runtime.canSee(A, "eq:swab-2")).toBe(false);
    expect(w.runtime.observe(A).entities.some((e) => e.id === "eq:swab-2")).toBe(false);
    // not even remembered where it was seen, and not reachable by id
    expect(w.runtime.find(A, { type: "swab", awareness: ["remembered"] }).some((e) => e.id === "eq:swab-2")).toBe(false);
    expect((await w.act({ actorId: A, operation: "pick_up", targetId: "eq:swab-2" })).errorCode).toBe("TARGET_NOT_FOUND");
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "interact", id: "eq:swab-2" } })).errorCode).toBe("TARGET_NOT_FOUND");
    // a search where one stands reveals it
    const r = await w.act({ actorId: A, operation: "search" });
    expect(r.status, r.message).toBe("completed");
    expect(r.events.some((e) => e.type === "entity.concealed" && e.entityId === "eq:swab-2" && !e.concealed)).toBe(true);
    expect(seen(w, A, "eq:swab-2")).toBe(true);
    expect((await w.act({ actorId: A, operation: "pick_up", targetId: "eq:swab-2" })).status).toBe("completed");
  });

  it("an item concealed inside something (the wound) is found only by searching that, within reach", async () => {
    const w = world();
    const patient = w.runtime.find(A, { kind: "patient" })[0]!.id;
    w.runtime.placeItem("eq:swab-1", patient, { inside: true });
    // far away: nothing
    const revealed = (r: { events: { type: string }[] }) => r.events.flatMap((e) => (e.type === "entity.concealed" ? [(e as { entityId: string }).entityId] : []));
    expect(revealed(await w.act({ actorId: A, operation: "search" }))).toEqual([]);
    // at the patient: a search around finds nothing in the wound; searching the patient does
    expect((await w.act({ actorId: A, operation: "navigate", goal: { kind: "interact", id: patient } })).status).toBe("completed");
    expect(revealed(await w.act({ actorId: A, operation: "search" }))).toEqual([]);
    expect(seen(w, A, "eq:swab-1")).toBe(false);
    const wound = await w.act({ actorId: A, operation: "search", targetId: patient });
    expect(wound.status, wound.message).toBe("completed");
    expect(revealed(wound)).toEqual(["eq:swab-1"]);
    // brought out: in the searcher's hand
    expect(w.runtime.actor(A)!.holding).toContain("eq:swab-1");
    expect(seen(w, A, "eq:swab-1")).toBe(true);
  });

  it("the concealment is nobody's event to perceive, and a snapshot keeps it", async () => {
    const w = world();
    expect((await w.act({ actorId: NURSE, operation: "approach", targetId: "eq:swab-1" })).status).toBe("completed");
    w.runtime.placeItem("eq:swab-2", "eq:swab-1", { concealed: true });
    expect(w.runtime.observe(NURSE).recentEvents.some((e) => e.summary.includes("Swab"))).toBe(false);
    const snap = w.runtime.snapshot();
    expect(snap.entities["eq:swab-2"]?.concealed).toBe(true);
  });
});
