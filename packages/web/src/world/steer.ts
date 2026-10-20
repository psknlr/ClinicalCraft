/**
 * Auto-walk steering (the avatar walking a planned path: `walk_to`, and the
 * world model's routes in embodied mode). Pure and frame-rate independent:
 * a slow frame (SwiftShader, a busy laptop) takes a long physics step, and a
 * walker that turned a fixed fraction per *frame* while always walking
 * forward ended up circling a waypoint close behind it forever. Here the
 * turn is a fraction per *second*, the walker turns in place before walking
 * when a nearby waypoint is off to the side, and a waypoint it already
 * passed counts as reached. No three.js here (unit-tested in node).
 */
import { PHYSICS } from "./physics.js";
import { normAngle } from "./embodiment.js";

/** A waypoint closer than this (m) is reached. */
export const WAYPOINT_RADIUS = 0.35;
/** A waypoint the walker is already past (towards the next one) within this distance (m) counts as reached. */
const PASSED_RADIUS = 0.75;
/** Fraction of the heading error turned per 60 Hz frame (the original per-frame rate, now per 1/60 s). */
const TURN_PER_FRAME = 0.18;
/** Below this distance (m) to the waypoint the walker only walks when facing it within `NEAR_ALIGN` rad. */
const NEAR = 1.5;
const NEAR_ALIGN = 0.5;
/** Farther away it walks while turning up to this error (rad). */
const FAR_ALIGN = 1.2;
/** Sprint when the waypoint is farther than this (m). */
const SPRINT_FROM = 6;

/**
 * The index of the waypoint to head for, from `index` on: waypoints within
 * `WAYPOINT_RADIUS`, or already passed (the walker stands beyond one,
 * towards the next, within `PASSED_RADIUS`), are skipped. The last one is
 * never skipped (arrival has its own radius).
 */
export function nextWaypoint(path: readonly { x: number; z: number }[], index: number, x: number, z: number): number {
  let i = Math.max(0, index);
  while (i < path.length - 1) {
    const wp = path[i]!;
    const next = path[i + 1]!;
    const d = Math.hypot(wp.x - x, wp.z - z);
    const passed = d < PASSED_RADIUS && (x - wp.x) * (next.x - wp.x) + (z - wp.z) * (next.z - wp.z) > 0;
    if (d >= WAYPOINT_RADIUS && !passed) break;
    i++;
  }
  return i;
}

/** Turn `yaw` towards `want` (rad) the short way round, by the same amount per second at any frame rate. */
export function turnTowards(yaw: number, want: number, dt: number): number {
  const k = 1 - Math.pow(1 - TURN_PER_FRAME, Math.max(0, dt) * 60);
  return yaw + normAngle(want - yaw) * k;
}

/**
 * One step of steering towards waypoint `wp` from (x, z) facing `yaw`
 * (world convention: 0 looks −Z): the new yaw, whether to walk (`forward`
 * 1) or turn in place (0 — physics normalises any other forward value to
 * full speed), and whether to sprint.
 */
export function steer(yaw: number, x: number, z: number, wp: { x: number; z: number }, dt: number): { yaw: number; forward: 0 | 1; sprint: boolean } {
  const want = Math.atan2(-(wp.x - x), -(wp.z - z));
  const turned = turnTowards(yaw, want, dt);
  const dist = Math.hypot(wp.x - x, wp.z - z);
  const off = Math.abs(normAngle(want - turned));
  const forward = off < (dist < NEAR ? NEAR_ALIGN : FAR_ALIGN) ? 1 : 0;
  return { yaw: turned, forward, sprint: forward === 1 && dist > SPRINT_FROM };
}

/**
 * Simulated seconds a route walk of `length` metres may take before it
 * gives up (detours around people, doors, a blocked final spot): three
 * times the walking time plus 20 s.
 */
export function walkBudget(length: number): number {
  return (Math.max(0, length) / PHYSICS.speed) * 3 + 20;
}
