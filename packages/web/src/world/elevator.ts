/**
 * Elevators (EMBODIED R10). An elevator connector's car is a room on every
 * level it serves (the `elevator-cabin` template: steel walls and a glass
 * sliding door) with the connector's stop inside it. The renderer adds a
 * call panel outside and a car panel inside next to each car door; aiming
 * at one and pressing E calls the car (its door opens) or — inside — offers
 * the levels to ride to. The ride itself (doors close, a short dimmed ride,
 * the avatar arrives at the same spot of the car on the destination level,
 * the doors open) runs in the world's frame loop (index.ts).
 */
import { Box3, Vector3 } from "three";
import type { FacilityDefinition } from "@clinicalcraft/core";
import type { InteractionTarget } from "../contracts.js";
import type { BuildContext, DoorRecord } from "./context.js";
import { strings, tx } from "./strings.js";

type RoomDef = FacilityDefinition["rooms"][number];

export interface ElevatorStop {
  level: string;
  x: number;
  z: number;
  elevation: number;
  /** The car on this level (the smallest room containing the stop; an `elevator` room preferred). */
  room: RoomDef | null;
  door: DoorRecord | null;
}

export interface Elevator {
  /** Connector id (as authored). */
  id: string;
  name: string;
  stops: ElevatorStop[];
}

export type ElevatorTarget = Extract<InteractionTarget, { kind: "elevator" }>;

/** The car (room) on a level that contains a stop: an `elevator` room first, else the smallest room there. */
function carRoom(f: FacilityDefinition, level: string, x: number, z: number, levelOf: (r: RoomDef) => string): RoomDef | null {
  const inside = f.rooms.filter((r) => levelOf(r) === level && Math.abs(x - r.rect.x) <= r.rect.w / 2 && Math.abs(z - r.rect.z) <= r.rect.d / 2);
  inside.sort((a, b) => Number(b.kind === "elevator") - Number(a.kind === "elevator") || a.rect.w * a.rect.d - b.rect.w * b.rect.d);
  return inside[0] ?? null;
}

/** Is (x, z) inside a stop's car (its room rect, inset by the wall)? */
export function inCar(stop: ElevatorStop, x: number, z: number): boolean {
  const r = stop.room?.rect;
  if (!r) return Math.hypot(x - stop.x, z - stop.z) < 1.2;
  return Math.abs(x - r.x) < r.w / 2 - 0.1 && Math.abs(z - r.z) < r.d / 2 - 0.1;
}

/**
 * Find the cars and doors of every elevator connector and add the panels
 * (batched voxels owned by an interaction target): outside, a call panel
 * beside the door; inside, the car panel beside the door.
 */
export function buildElevators(ctx: BuildContext, levelOf: (r: RoomDef) => string): Elevator[] {
  const f = ctx.facility;
  const S = strings(ctx.locale);
  const out: Elevator[] = [];
  for (const c of f.connectors ?? []) {
    if (c.kind !== "elevator") continue;
    const name = tx(c.name, ctx.locale) || S.elevator;
    const stops: ElevatorStop[] = c.stops.map((s) => {
      const room = carRoom(f, s.level, s.x, s.z, levelOf);
      const door = room ? (ctx.doors.find((d) => d.level === s.level && d.id.startsWith(`${room.id}:`)) ?? null) : null;
      return { level: s.level, x: s.x, z: s.z, elevation: ctx.levels.elevation(s.level), room, door };
    });
    const elevator: Elevator = { id: c.id, name, stops };
    const served = [...new Set(stops.map((s) => s.level))].sort((a, b) => ctx.levels.elevation(a) - ctx.levels.elevation(b));
    out.push(elevator);
    for (const stop of stops) {
      if (!stop.door || !stop.room) continue;
      const spec = ctx.doorSpecs.get(stop.door.id);
      if (!spec) continue;
      ctx.onLevel(stop.level);
      // along the wall: beside the door; across it: the room side is "inside"
      const along = spec.axis === "x" ? { x: 1, z: 0 } : { x: 0, z: 1 };
      const inward = spec.axis === "x" ? { x: 0, z: Math.sign(stop.room.rect.z - spec.centre.z) || 1 } : { x: Math.sign(stop.room.rect.x - spec.centre.x) || 1, z: 0 };
      const offset = spec.width / 2 + 0.32;
      for (const inside of [false, true]) {
        const n = inside ? 1 : -1;
        const depth = 0.175 + 0.035;
        const px = spec.centre.x + along.x * offset + inward.x * n * depth;
        const pz = spec.centre.z + along.z * offset + inward.z * n * depth;
        const py = stop.elevation + 1.25;
        const owner = `elevator:${c.id}:${stop.level}:${inside ? "car" : "call"}`;
        const ry = Math.atan2(inward.x * n, inward.z * n);
        const steel = ctx.lib.has("steel") ? "steel" : "coal";
        ctx.batch.add(steel, px, py, pz, 0.26, 0.42, 0.04, ry, owner);
        const fx = inward.x * n * 0.025, fz = inward.z * n * 0.025;
        ctx.batch.add(ctx.lib.has("led-amber") ? "led-amber" : "gold", px + fx, py + 0.09, pz + fz, 0.09, 0.09, 0.02, ry, owner);
        ctx.batch.add(ctx.lib.has("led-green") ? "led-green" : "green", px + fx, py - 0.07, pz + fz, 0.09, 0.09, 0.02, ry, owner);
        if (inside) ctx.batch.add(ctx.lib.has("screen-dark") ? "screen-dark" : "black", px + fx, py + 0.16, pz + fz, 0.16, 0.05, 0.02, ry, owner);
        const target: ElevatorTarget = { kind: "elevator", connectorId: c.id, level: stop.level, inside, name: `${name} · ${ctx.levels.name(stop.level, ctx.locale)}`, hint: inside ? S.elevatorChoose : S.elevatorCall, stops: served };
        const box = new Box3(new Vector3(px - 0.2, py - 0.25, pz - 0.2), new Vector3(px + 0.2, py + 0.25, pz + 0.2));
        ctx.targets.set(owner, { id: owner, target, box, x: px, z: pz, label: target.name, kind: "elevator", level: stop.level });
      }
    }
  }
  ctx.onLevel(ctx.level);
  return out;
}
