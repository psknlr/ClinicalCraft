/**
 * Embodiment in the renderer (docs/EMBODIED.md §2, R1): three.js is a *view*
 * of the world model. Bodies move along routes the world model planned
 * (`NavPlan.path`), never along routes the renderer invents — these pure
 * helpers turn such a route into the renderer's walking legs (walk the
 * points, climb a flight, ride an elevator) and do the arithmetic of NPC
 * path following. No three.js here (unit-tested in node).
 */
import type { RoutePoint } from "../contracts.js";
import type { Leg } from "./route.js";

/** Arrival radius (m) of the last point of a route: the planner's interaction point is a free cell centre, so the walker then settles on it exactly. */
export const ROUTE_ARRIVE = 0.4;
/** Staff walking speed (m/s): a brisk hospital walk, a little slower than the avatar's 3.9 m/s. */
export const STAFF_SPEED = 3.2;
/** Seconds an NPC spends "in" an elevator car (doors, ride) before it appears on the other level. */
export const STAFF_RIDE_SECONDS = 2.4;

/** A connector's kind (`stairs` / `ramp` are walked, an `elevator` is ridden), null when unknown. */
export type ConnectorKindOf = (connectorId: string) => "stairs" | "ramp" | "elevator" | null;

/** `connector:<id>` → `<id>` (route points name connectors with the world's prefixed ids). */
export function connectorIdOf(via: string): string {
  return via.startsWith("connector:") ? via.slice("connector:".length) : via;
}

/**
 * The renderer legs that walk a world-model route (`NavPlan.path`, which
 * starts after the body's current position). Points on one level become a
 * `path` leg; a point reached `via` stairs or a ramp is a straight `flight`
 * from the previous point (physics climbs the ramp surface); `via` an
 * elevator is a `ride` (the previous leg ends in the car), after which the
 * walk goes on from the arrival stop. The last walking leg is `final`.
 */
export function worldRouteLegs(route: readonly RoutePoint[], startLevel: string, kindOf: ConnectorKindOf): Leg[] {
  const legs: Leg[] = [];
  let level = startLevel;
  let points: { x: number; z: number }[] = [];
  let last: { x: number; z: number } | null = null;
  const flush = () => {
    if (points.length) legs.push({ kind: "path", level, points, final: false });
    points = [];
  };
  for (const p of route) {
    const here = { x: p.x, z: p.z };
    if (p.via) {
      flush();
      const id = connectorIdOf(p.via);
      if (kindOf(id) === "elevator") {
        legs.push({ kind: "ride", connectorId: id, level: p.level });
        level = p.level;
        // after the ride: step to the arrival stop (the avatar arrives at the same spot of the car)
        points = [here];
      } else {
        legs.push({ kind: "flight", level: p.level, path: last ? [{ ...last }, here] : [here] });
        level = p.level;
      }
    } else points.push(here);
    last = here;
  }
  flush();
  for (let i = legs.length - 1; i >= 0; i--) {
    const leg = legs[i]!;
    if (leg.kind === "path") {
      leg.final = true;
      break;
    }
    if (leg.kind === "ride") break;
  }
  return legs;
}

/**
 * World yaw (0 looks towards −Z, the camera's convention) ↔ the rotation of
 * a voxel person, built facing +Z: the rig faces the world yaw when rotated
 * by `yaw + π`.
 */
export function rigRotationOf(yaw: number): number {
  return normAngle(yaw + Math.PI);
}

/** The world yaw a rig rotated by `rotation` faces (inverse of `rigRotationOf`). */
export function yawOfRig(rotation: number): number {
  return normAngle(rotation - Math.PI);
}

/** World yaw facing from (x0, z0) towards (x1, z1). */
export function yawTowards(x0: number, z0: number, x1: number, z1: number): number {
  return Math.atan2(-(x1 - x0), -(z1 - z0));
}

/** Angle in (−π, π]. */
export function normAngle(a: number): number {
  const t = Math.atan2(Math.sin(a), Math.cos(a));
  return t === -Math.PI ? Math.PI : t;
}

/**
 * Advance a point by `distance` towards `target`: the new point, whether
 * the target was reached and the distance left over.
 */
export function stepTowards(x: number, z: number, target: { x: number; z: number }, distance: number): { x: number; z: number; reached: boolean; rest: number } {
  const dx = target.x - x, dz = target.z - z;
  const d = Math.hypot(dx, dz);
  if (d <= distance || d < 1e-9) return { x: target.x, z: target.z, reached: true, rest: Math.max(0, distance - d) };
  const k = distance / d;
  return { x: x + dx * k, z: z + dz * k, reached: false, rest: 0 };
}

/** Length of a polyline from (x, z) through `points`. */
export function polylineLength(x: number, z: number, points: readonly { x: number; z: number }[]): number {
  let len = 0;
  let px = x, pz = z;
  for (const p of points) {
    len += Math.hypot(p.x - px, p.z - pz);
    px = p.x;
    pz = p.z;
  }
  return len;
}
