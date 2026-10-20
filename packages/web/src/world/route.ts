/**
 * Autopilot routes across levels (EMBODIED R10): the legs of a `walkTo`
 * whose goal is on another level — walk to a flight's approach point, walk
 * the flight straight to its exit point on the next level (or walk into an
 * elevator car and ride it), and so on, then walk to the goal. Pure: the
 * world plans each walking leg on that level's nav grid.
 */
import type { Flight } from "@clinicalcraft/world";

/** One stretch of a multi-level autopilot route. */
export type Leg =
  /** Walk on a level (planned on that level's nav grid); `final`: the route's goal. */
  | { kind: "walk"; level: string; goal: { x: number; z: number }; final: boolean }
  /** Walk a stairs/ramp flight straight from its approach point to its exit point on `level`. */
  | { kind: "flight"; level: string; path: { x: number; z: number }[] }
  /** Ride an elevator (the avatar stands in its car) to `level`. */
  | { kind: "ride"; connectorId: string; level: string }
  /**
   * Follow given points on a level — a route planned by the world model
   * (embodiment, see embodiment.ts); obstructions are bypassed with a local
   * detour to the next point. `final`: the route's goal.
   */
  | { kind: "path"; level: string; points: { x: number; z: number }[]; final: boolean };

/** An elevator as routing sees it: its stops (a stop without a car room cannot be boarded). */
export interface RouteElevator {
  id: string;
  stops: readonly { level: string; x: number; z: number; room: unknown }[];
}

/** Distance (m) of a flight's approach and exit points from its ends, along its axis. */
export const FLIGHT_APPROACH = 0.9;

/** A flight's approach point (on the level it is entered from) and exit point (beyond its other end). */
export function flightEnds(fl: Pick<Flight, "foot" | "head">, up: boolean): { approach: { x: number; z: number }; exit: { x: number; z: number } } {
  const a = up ? fl.foot : fl.head, b = up ? fl.head : fl.foot;
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const ux = (b.x - a.x) / len, uz = (b.z - a.z) / len;
  return { approach: { x: a.x - ux * FLIGHT_APPROACH, z: a.z - uz * FLIGHT_APPROACH }, exit: { x: b.x + ux * FLIGHT_APPROACH, z: b.z + uz * FLIGHT_APPROACH } };
}

type Hop =
  | { kind: "flight"; flight: Pick<Flight, "foot" | "head">; up: boolean; next: string; at: { x: number; z: number } }
  | { kind: "ride"; elevator: RouteElevator; from: RouteElevator["stops"][number]; next: string; at: { x: number; z: number } };

/**
 * Legs from level `from` (the avatar at `start`) to `goal` on level `to`: the
 * fewest level changes over the flights (walked) and elevators (ridden),
 * flights preferred and, per level, the one nearest the avatar (first hop)
 * or the goal; null when `to` cannot be reached. Same level: one final walk.
 */
export function routeLegs(
  flights: readonly Pick<Flight, "foot" | "head">[],
  elevators: readonly RouteElevator[],
  from: string,
  to: string,
  start: { x: number; z: number },
  goal: { x: number; z: number },
): Leg[] | null {
  const prev = new Map<string, { level: string; hop: Hop }>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length && !seen.has(to)) {
    const lv = queue.shift()!;
    const hops: Hop[] = [];
    for (const fl of flights) {
      if (fl.foot.level === lv) hops.push({ kind: "flight", flight: fl, up: true, next: fl.head.level, at: fl.foot });
      else if (fl.head.level === lv) hops.push({ kind: "flight", flight: fl, up: false, next: fl.foot.level, at: fl.head });
    }
    for (const el of elevators) {
      const a = el.stops.find((s) => s.level === lv);
      if (!a?.room) continue;
      for (const s of el.stops) if (s !== a && s.room) hops.push({ kind: "ride", elevator: el, from: a, next: s.level, at: a });
    }
    const ref = lv === from ? start : goal;
    hops.sort((p, q) => Number(p.kind === "ride") - Number(q.kind === "ride") || Math.hypot(p.at.x - ref.x, p.at.z - ref.z) - Math.hypot(q.at.x - ref.x, q.at.z - ref.z));
    for (const hop of hops) {
      if (seen.has(hop.next)) continue;
      seen.add(hop.next);
      prev.set(hop.next, { level: lv, hop });
      queue.push(hop.next);
    }
  }
  if (!seen.has(to)) return null;
  const hops: Hop[] = [];
  for (let lv = to; lv !== from; ) {
    const p = prev.get(lv)!;
    hops.unshift(p.hop);
    lv = p.level;
  }
  const legs: Leg[] = [];
  let lv = from;
  for (const hop of hops) {
    if (hop.kind === "flight") {
      const { approach, exit } = flightEnds(hop.flight, hop.up);
      legs.push({ kind: "walk", level: lv, goal: approach, final: false });
      legs.push({ kind: "flight", level: hop.next, path: [approach, exit] });
    } else {
      legs.push({ kind: "walk", level: lv, goal: { x: hop.from.x, z: hop.from.z }, final: false });
      legs.push({ kind: "ride", connectorId: hop.elevator.id, level: hop.next });
    }
    lv = hop.next;
  }
  legs.push({ kind: "walk", level: to, goal: { x: goal.x, z: goal.z }, final: true });
  return legs;
}
