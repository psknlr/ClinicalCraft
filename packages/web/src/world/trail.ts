/**
 * Where a walker has walked, for the people walking with it (EMBODIED §8.4: a patient who walks with the
 * clinician, the companion at the patient's side): followers keep a distance *along the walker's own path*, so
 * they round corners and pass doorways where the walker did instead of cutting through walls. A jump (a
 * teleport, a hidden tab that put the walker at its target at once) starts the trail afresh.
 */

export interface TrailPoint {
  x: number;
  z: number;
  level: string;
}

/** Spacing (m) of the points kept; the longest jump (m) between frames still walked; points kept. */
const SPACING = 0.12;
const JUMP = 4.5;
const MAX_POINTS = 240;
/** How far back (m) behind the walker a restarted trail begins. */
const RESTART = 2.2;

export class Trail {
  private pts: TrailPoint[] = [];

  /** Start a trail through `points` (oldest first: where a follower stands now, then the walker). */
  constructor(points: readonly TrailPoint[] = []) {
    for (const p of points) this.push(p.x, p.z, p.level);
  }

  /**
   * The walker is at (x, z) on `level` now, facing `yaw` (the world's convention: yaw 0 looks towards −Z). After a
   * jump or on another floor the trail starts again from a spot behind the walker (`RESTART` m back along its
   * facing), so a follower is never drawn on top of it.
   */
  push(x: number, z: number, level: string, yaw = 0): void {
    const last = this.pts[this.pts.length - 1];
    if (last && (last.level !== level || Math.hypot(x - last.x, z - last.z) > JUMP)) {
      this.pts = [
        { x: x + Math.sin(yaw) * RESTART, z: z + Math.cos(yaw) * RESTART, level },
        { x, z, level },
      ];
      return;
    }
    if (last && Math.hypot(x - last.x, z - last.z) < 1e-6) return;
    // the newest point is the walker's own spot (the head); it becomes a kept point once SPACING past the one before
    const anchor = this.pts.length > 1 ? this.pts[this.pts.length - 2]! : null;
    if (anchor && Math.hypot(x - anchor.x, z - anchor.z) < SPACING) {
      this.pts[this.pts.length - 1] = { x, z, level };
      return;
    }
    this.pts.push({ x, z, level });
    if (this.pts.length > MAX_POINTS) this.pts.splice(0, this.pts.length - MAX_POINTS);
  }

  /**
   * The point `back` metres behind the walker along the trail, and the yaw of travel there (the world's convention:
   * yaw 0 looks towards −Z) — the trail's start when it is shorter; null when empty.
   */
  at(back: number): (TrailPoint & { yaw: number | null }) | null {
    const pts = this.pts;
    if (!pts.length) return null;
    let left = back;
    for (let i = pts.length - 1; i > 0; i--) {
      const a = pts[i - 1]!, b = pts[i]!;
      const seg = Math.hypot(b.x - a.x, b.z - a.z);
      if (seg >= left && seg > 1e-9) {
        const u = left / seg;
        return { x: b.x + (a.x - b.x) * u, z: b.z + (a.z - b.z) * u, level: b.level, yaw: Math.atan2(-(b.x - a.x), -(b.z - a.z)) };
      }
      left -= seg;
    }
    const first = pts[0]!, second = pts[1];
    return { ...first, yaw: second ? Math.atan2(-(second.x - first.x), -(second.z - first.z)) : null };
  }

  /** The walker's own spot (the newest point), or null. */
  get head(): TrailPoint | null {
    return this.pts[this.pts.length - 1] ?? null;
  }
}
