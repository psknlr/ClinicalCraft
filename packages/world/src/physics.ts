/**
 * V4 player physics (pure, unit-testable). Constants are V4's exactly:
 * walk 3.9, sprint 6.2, gravity 18, jump 6.3, height 1.78, radius .28,
 * eye 1.62, fov 73 → 79 while sprinting, dt capped at 50 ms.
 *
 * `stepPlayer` is a faithful port of V4 `Pd()` (axis-separated XZ moves
 * rejected on collision, then vertical integration with landing / head
 * bumping against AABB colliders, ground plane at y = 0), generalised to a
 * facility's walkable bounds.
 *
 * Moved from packages/web/src/world/physics.ts (the web module re-exports
 * it); `Aabb` there is `PhysicsCollider` here (the contract `Aabb` is the
 * plain box).
 *
 * Ramps (stairs and ramp flights, EMBODIED R10): a collider with a `ramp`
 * surface is a solid wedge whose top rises along an axis. The avatar stands
 * on the highest point of the surface under its disc, steps onto it when
 * that is at most `RAMP.stepUp` above its feet (otherwise the flight is a
 * wall), and stays on it walking down (`RAMP.snapDown`). Without ramp
 * colliders every step is exactly V4's.
 */
import type { Aabb, RampSurface } from "./contracts.js";

export const PHYSICS = {
  speed: 3.9,
  sprint: 6.2,
  gravity: 18,
  jump: 6.3,
  height: 1.78,
  radius: 0.28,
  eye: 1.62,
  fov: 73,
  fovSprint: 79,
  maxDt: 0.05,
  /** Step sound interval (ms) walking / sprinting. */
  stepMs: 365,
  stepMsSprint: 255,
  /** Arrow-key look speed (rad/s) and mouse sensitivity (rad/px). */
  turnSpeed: 1.8,
  mouse: 0.0024,
  pitchLimit: 1.48,
} as const;

/** Ramp walking: the highest step (m) climbed without jumping, and how far below the feet the surface is followed when walking down. */
export const RAMP = { stepUp: 0.5, snapDown: 0.6 } as const;

/** A box as physics and the web nav grid see it: it may be disabled (an open door leaf) or be a door (passable for planning). */
export interface PhysicsCollider extends Aabb {
  /** Disabled colliders (open doors) are ignored. */
  enabled?: boolean;
  /** Doors are passable for path-finding (opened automatically). */
  door?: boolean;
  /** A walkable flight: the box is a solid wedge under this surface (see `rampTop`). */
  ramp?: RampSurface;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vy: number;
  grounded: boolean;
}

export interface MoveInput {
  forward: number;
  side: number;
  yaw: number;
  sprint: boolean;
  jump: boolean;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Box centred at (x, y, z) with size (w, h, d). V4 `U()`. */
export function boxCollider(x: number, y: number, z: number, w: number, h: number, d: number, extra: Partial<PhysicsCollider> = {}): PhysicsCollider {
  return { minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2, ...extra };
}

/** V4 `Pl()`: player disc (radius r) overlaps the collider's XZ footprint. */
export function overlapsXZ(p: { x: number; z: number }, c: { minX: number; maxX: number; minZ: number; maxZ: number }, r: number = PHYSICS.radius): boolean {
  return p.x + r > c.minX && p.x - r < c.maxX && p.z + r > c.minZ && p.z - r < c.maxZ;
}

/**
 * Height of a ramp's surface under the player disc at (x, z): the highest
 * point of the flight the disc covers (its uphill edge, clamped to the
 * flight); −Infinity when the disc misses it or the collider is no ramp.
 */
export function rampTop(c: PhysicsCollider, x: number, z: number, r: number = PHYSICS.radius): number {
  const s = c.ramp;
  if (!s || !overlapsXZ({ x, z }, c, r)) return -Infinity;
  const u = s.axis === "x" ? x : z;
  const run = s.to - s.from;
  if (Math.abs(run) < 1e-9) return Math.max(s.y0, s.y1);
  const lo = Math.min(s.from, s.to), hi = Math.max(s.from, s.to);
  const probe = Math.max(lo, Math.min(hi, u + Math.sign(run) * r));
  const t = Math.max(0, Math.min(1, (probe - s.from) / run));
  return s.y0 + (s.y1 - s.y0) * t;
}

/** Highest ramp surface under the player disc (−Infinity when it stands on none). */
export function rampGround(p: { x: number; z: number }, colliders: Iterable<PhysicsCollider>): number {
  let g = -Infinity;
  for (const c of colliders) {
    if (!c.ramp || c.enabled === false) continue;
    const top = rampTop(c, p.x, p.z);
    if (top > g) g = top;
  }
  return g;
}

/** V4 `Id()`: player capsule-as-box intersects any enabled collider (a ramp only where its surface is more than a step above the feet). */
export function collides(p: { x: number; y: number; z: number }, colliders: Iterable<PhysicsCollider>): boolean {
  for (const c of colliders) {
    if (c.enabled === false) continue;
    if (c.ramp) {
      if (p.y + PHYSICS.height > c.minY + 0.002 && p.y < rampTop(c, p.x, p.z) - RAMP.stepUp) return true;
      continue;
    }
    if (overlapsXZ(p, c) && p.y + PHYSICS.height > c.minY + 0.002 && p.y < c.maxY - 0.002) return true;
  }
  return false;
}

/** A horizontal move's test position: lifted onto a ramp surface the avatar can step onto. */
function stepTarget(p: PlayerState, next: { x: number; y: number; z: number }, colliders: PhysicsCollider[]): { x: number; y: number; z: number } {
  const g = rampGround(next, colliders);
  return g > p.y && g - p.y <= RAMP.stepUp ? { ...next, y: g } : next;
}

/** Movement vector (dx, dz) per second for an input (V4 basis: yaw 0 looks towards −Z). */
export function moveVector(input: Pick<MoveInput, "forward" | "side" | "yaw" | "sprint">): { dx: number; dz: number } {
  const speed = input.sprint ? PHYSICS.sprint : PHYSICS.speed;
  const cos = Math.cos(input.yaw);
  const sin = Math.sin(input.yaw);
  let f = input.forward || 0;
  let s = input.side || 0;
  const len = Math.hypot(f, s) || 1;
  f /= len;
  s /= len;
  return { dx: (s * cos - f * sin) * speed, dz: (-f * cos - s * sin) * speed };
}

/** One physics step (V4 `Pd()`); mutates and returns `p`. */
export function stepPlayer(p: PlayerState, input: MoveInput, dtIn: number, colliders: PhysicsCollider[], bounds: Bounds): PlayerState {
  const dt = Math.min(dtIn, PHYSICS.maxDt);
  const { dx, dz } = moveVector(input);
  const ramps = colliders.some((c) => c.ramp);
  // standing on a flight at the start of the step (walking off its foot keeps the feet on the floor)
  const onRamp = ramps && p.grounded && Math.abs(p.y - rampGround(p, colliders)) < 0.05;
  const nx = { ...p, x: Math.max(bounds.minX, Math.min(bounds.maxX, p.x + dx * dt)) };
  if (!collides(ramps ? stepTarget(p, nx, colliders) : nx, colliders)) p.x = nx.x;
  const nz = { ...p, z: Math.max(bounds.minZ, Math.min(bounds.maxZ, p.z + dz * dt)) };
  if (!collides(ramps ? stepTarget(p, nz, colliders) : nz, colliders)) p.z = nz.z;
  const wasGrounded = p.grounded;
  let jumped = false;
  if (input.jump && p.grounded) {
    p.vy = PHYSICS.jump;
    p.grounded = false;
    jumped = true;
  }
  const prevY = p.y;
  p.vy -= PHYSICS.gravity * dt;
  p.y += p.vy * dt;
  p.grounded = false;
  for (const c of colliders) {
    if (c.enabled === false || c.ramp || !overlapsXZ(p, c)) continue;
    if (p.vy <= 0 && prevY >= c.maxY - 0.01 && p.y <= c.maxY) {
      p.y = c.maxY;
      p.vy = 0;
      p.grounded = true;
    } else if (p.vy > 0 && prevY + PHYSICS.height <= c.minY + 0.01 && p.y + PHYSICS.height >= c.minY) {
      p.y = c.minY - PHYSICS.height;
      p.vy = 0;
    }
  }
  if (ramps && !p.grounded) {
    // stand on the flight: land on / walk up its surface, or follow it walking down
    const g = rampGround(p, colliders);
    if (g > -Infinity && p.vy <= 0) {
      if (p.y <= g && prevY >= g - RAMP.stepUp) {
        p.y = g;
        p.vy = 0;
        p.grounded = true;
      } else if (wasGrounded && !jumped && p.y > g && p.y - g <= RAMP.snapDown) {
        p.y = g;
        p.vy = 0;
        p.grounded = true;
      }
    }
    if (!p.grounded && onRamp && !jumped && p.vy <= 0) {
      // stepped off the flight: down onto the floor or the box top under it
      let support = 0;
      for (const c of colliders) if (!c.ramp && c.enabled !== false && overlapsXZ(p, c) && c.maxY <= prevY + 0.01) support = Math.max(support, c.maxY);
      if (p.y > support && p.y - support <= RAMP.snapDown) {
        p.y = support;
        p.vy = 0;
        p.grounded = true;
      }
    }
  }
  if (p.y <= 0) {
    p.y = 0;
    p.vy = 0;
    p.grounded = true;
  }
  return p;
}

/** Field of view target (V4: 79 while sprinting and moving, else 73). */
export function targetFov(sprint: boolean, moving: boolean): number {
  return sprint && moving ? PHYSICS.fovSprint : PHYSICS.fov;
}

export function clampPitch(pitch: number): number {
  return Math.max(-PHYSICS.pitchLimit, Math.min(PHYSICS.pitchLimit, pitch));
}

/**
 * Uniform-grid spatial index over colliders so physics only tests nearby
 * boxes (large facilities have thousands of wall colliders).
 */
export class ColliderGrid<T extends PhysicsCollider = PhysicsCollider> {
  private readonly cells = new Map<number, T[]>();
  private readonly all = new Set<T>();
  private stamp = 0;
  private readonly marks = new WeakMap<T, number>();

  constructor(private readonly cell = 2) {}

  private key(ix: number, iz: number): number {
    return (ix + 4096) * 8192 + (iz + 4096);
  }

  add<C extends T>(c: C): C {
    this.all.add(c);
    const x0 = Math.floor(c.minX / this.cell), x1 = Math.floor(c.maxX / this.cell);
    const z0 = Math.floor(c.minZ / this.cell), z1 = Math.floor(c.maxZ / this.cell);
    for (let ix = x0; ix <= x1; ix++)
      for (let iz = z0; iz <= z1; iz++) {
        const k = this.key(ix, iz);
        let list = this.cells.get(k);
        if (!list) this.cells.set(k, (list = []));
        list.push(c);
      }
    return c;
  }

  remove(c: T): void {
    if (!this.all.delete(c)) return;
    const x0 = Math.floor(c.minX / this.cell), x1 = Math.floor(c.maxX / this.cell);
    const z0 = Math.floor(c.minZ / this.cell), z1 = Math.floor(c.maxZ / this.cell);
    for (let ix = x0; ix <= x1; ix++)
      for (let iz = z0; iz <= z1; iz++) {
        const list = this.cells.get(this.key(ix, iz));
        if (!list) continue;
        const i = list.indexOf(c);
        if (i >= 0) list.splice(i, 1);
      }
  }

  /** Colliders whose XZ cell range touches the square (x ± r, z ± r). */
  query(x: number, z: number, r: number): T[] {
    const out: T[] = [];
    const s = ++this.stamp;
    const x0 = Math.floor((x - r) / this.cell), x1 = Math.floor((x + r) / this.cell);
    const z0 = Math.floor((z - r) / this.cell), z1 = Math.floor((z + r) / this.cell);
    for (let ix = x0; ix <= x1; ix++)
      for (let iz = z0; iz <= z1; iz++) {
        const list = this.cells.get(this.key(ix, iz));
        if (!list) continue;
        for (const c of list) {
          if (this.marks.get(c) === s) continue;
          this.marks.set(c, s);
          out.push(c);
        }
      }
    return out;
  }

  get size(): number {
    return this.all.size;
  }

  values(): T[] {
    return [...this.all];
  }
}
