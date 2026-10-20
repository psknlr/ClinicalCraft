/**
 * Auto-walk in a voxel world: the avatar walked by the autopilot (`WorldApi.walkTo`: a path planned on the
 * level's nav grid, in legs to another level — stairs flights walked, elevators ridden) or along a route the
 * world model planned (`followRoute`, docs/EMBODIED.md §2.1: the renderer animates what the world model planned,
 * it never plans or decides itself — a stall detours locally to the route's next point, and doors the walk
 * opened close behind it). Steering is frame-rate independent (steer.ts); doors ahead open (a locked one stays
 * shut); a progress watchdog re-plans when blocked and gives up after three fruitless tries; a world-model walk
 * has a time budget, at most `MAX_ROUTE_DETOURS` detours, and ends next to a last spot somebody occupies.
 */
import type { BodyMove, BodyPose, RoutePoint, WorldPoint } from "../contracts.js";
import type { DoorRecord } from "./context.js";
import { polylineLength, ROUTE_ARRIVE, worldRouteLegs } from "./embodiment.js";
import { buildNavGrid, findPath, type NavGrid } from "./pathfind.js";
import { PHYSICS, type Aabb } from "./physics.js";
import { routeLegs, type Leg } from "./route.js";
import { nextWaypoint, steer, walkBudget } from "./steer.js";
import type { VoxelWorld } from "./voxel-world.js";

interface AutoWalk {
  path: { x: number; z: number }[];
  index: number;
  goal: { x: number; z: number };
  /** Arrival radius: 1 m, or the reachable distance to a goal inside furniture (+ .35). */
  arrive: number;
  /** Consecutive re-plans that did not lead to progress (give up after 3). */
  replans: number;
  resolve: () => void;
  reject: (e: Error) => void;
  /** Simulated seconds without progress along the path (frame-rate independent watchdog). */
  stall: number;
  /** Best remaining path length so far (progress = this shrinking, even on detours away from the goal). */
  bestRemaining: number;
  /** Remaining length right after the last re-plan (re-plan budget refills after 1 m of real progress). */
  replanBase: number;
  signal?: AbortSignal;
  onAbort?: () => void;
  /** Level of the current leg: walking legs plan on its nav grid and arrive only on it. */
  level: string;
  /** A straight leg (a flight): re-planning keeps this path. */
  fixed?: { x: number; z: number }[];
  /** Legs after the current one (a route to another level). */
  legs: Leg[];
  /** Waiting for an elevator ride (the walk resumes on arrival). */
  riding?: boolean;
  /**
   * Embodiment (`followRoute`): the current leg follows the world model's points (a stall detours locally
   * to the next point instead of re-planning the whole leg), and doors this walk opened close behind it.
   */
  route?: { opened: Set<DoorRecord>; detours: number };
  /** Current leg is a `path` leg of a world-model route. */
  pathLeg?: boolean;
  /** Simulated seconds a world-model route may still take before the walk gives up (`walkBudget`). */
  budget?: number;
}

/** A world-model route walk gives up after this many local detours (blocked repeatedly). */
const MAX_ROUTE_DETOURS = 8;
/** Stalled this close (m) to a route's last point, the walk ends there (the spot is occupied or out of reach). */
const ROUTE_SETTLE = 0.8;
const NAV_RADIUS = PHYSICS.radius + 0.08;
/** Arrival radius of an intermediate leg (a flight's approach point, an elevator car): above the 0.35 waypoint radius. */
const LEG_ARRIVE = 0.4;

/** The avatar's auto-walk in one world. */
export class AutoWalker {
  /** The walk in progress, or null. */
  current: AutoWalk | null = null;
  /** The nav grid of the last path planned (QA). */
  navGrid: NavGrid | null = null;

  constructor(private readonly world: VoxelWorld) {}

  /** Kind of a facility connector (route legs: stairs and ramps are walked, elevators ridden). */
  readonly connectorKind = (id: string) => (this.world.facility.connectors ?? []).find((c) => c.id === id)?.kind ?? null;

  /** End the walk: resolved (`err` null) or rejected with `err`; the keys are released. */
  cancel(err: Error | null): void {
    const w = this.current;
    if (!w) return;
    this.current = null;
    this.world.keys = {};
    if (w.signal && w.onAbort) w.signal.removeEventListener("abort", w.onAbort);
    if (err) w.reject(err);
    else w.resolve();
  }

  /** Remaining length of the autopilot path from the player (current waypoint onwards). */
  private remainingPath(w: AutoWalk): number {
    const { player } = this.world;
    let len = 0;
    let fx = player.x, fz = player.z;
    for (let i = w.index; i < w.path.length; i++) {
      len += Math.hypot(w.path[i].x - fx, w.path[i].z - fz);
      fx = w.path[i].x;
      fz = w.path[i].z;
    }
    return len;
  }

  /** The walk's movement input for a physics step of `dt` s (null: nothing to walk now). */
  input(dt: number): { forward: number; side: number; sprint: boolean } | null {
    const world = this.world;
    const { player, levels, level, ctx, S } = world;
    const w = this.current;
    if (!w || w.riding) return null;
    const dGoal = Math.hypot(w.goal.x - player.x, w.goal.z - player.z);
    if (dGoal <= w.arrive && (!levels.multi || world.currentLevel() === w.level)) {
      if (!w.legs.length) this.cancel(null);
      else if (!this.nextLeg(w)) this.cancel(new Error(S.unreachable));
      return null;
    }
    if (w.index >= w.path.length) {
      if (!this.replan(w)) {
        this.cancel(new Error(S.unreachable));
        return null;
      }
    }
    if (w.budget !== undefined && (w.budget -= dt) <= 0) {
      // a world-model route that cannot be finished (blocked again and again): stop where the body is
      this.cancel(new Error("stuck"));
      return null;
    }
    // reached or already passed (a slow frame's long step): on to the next waypoint
    w.index = nextWaypoint(w.path, w.index, player.x, player.z);
    const wp = w.path[w.index];
    if (w.index === w.path.length - 1 && Math.hypot(wp.x - player.x, wp.z - player.z) < 0.35) {
      w.index++;
      return null;
    }
    // open closed doors ahead (on the avatar's level); a locked one stays shut (the world model's lock)
    const here = levels.multi ? world.currentLevel() : level;
    for (const d of ctx.doors) {
      if (d.open || d.locked || d.level !== here) continue;
      const near = Math.hypot(d.centre.x - player.x, d.centre.z - player.z) < 2.6;
      if (near) {
        world.doors.toggle(d, true);
        w.route?.opened.add(d);
      }
    }
    // a world-model route closes the doors it opened once they are behind it (the world's doors stay as they were)
    if (w.route) world.doors.closeBehind(w.route.opened);
    // progress watchdog: path length still to walk must shrink within 3 s of simulated walking
    // (wall-clock time and straight-line goal distance both misfire: slow frames, detours)
    const remaining = this.remainingPath(w);
    if (remaining < w.bestRemaining - 0.05) {
      w.bestRemaining = remaining;
      w.stall = 0;
      if (w.replanBase - remaining > 1) w.replans = 0;
    } else if ((w.stall += dt) > 3) {
      // a route's last spot that cannot be reached (somebody stands there): the walk ends next to it
      if (w.route && !w.legs.length && (!levels.multi || world.currentLevel() === w.level) && Math.hypot(w.goal.x - player.x, w.goal.z - player.z) <= ROUTE_SETTLE) {
        this.cancel(null);
        return null;
      }
      // blocked (an NPC stepped in, a door swung): re-plan from here, give up after 3 fruitless tries
      if (!this.replan(w)) {
        this.cancel(new Error("stuck"));
        return null;
      }
    }
    // frame-rate independent steering (steer.ts): turns in place before walking off towards a waypoint behind
    const s = steer(world.yaw, player.x, player.z, wp, dt);
    world.yaw = s.yaw;
    world.pitch += (0 - world.pitch) * Math.min(1, dt * 6);
    return { forward: s.forward, side: 0, sprint: s.sprint };
  }

  /**
   * Nav grid of one level of a multi-level facility: what stands in that level's walking space (its walls,
   * equipment and people, the flights and balustrades crossing it), heights relative to its floor; an
   * upper level is walkable only on its slabs (stairwells and the outside are void).
   */
  private levelNavGrid(lv: string): NavGrid {
    const { levels, level, ctx, levelFloors, walkBounds } = this.world;
    const e = levels.elevation(lv);
    const list: Aabb[] = [];
    for (const c of ctx.colliders.values()) {
      if (c.maxY <= e + 0.01 || c.minY >= e + PHYSICS.height) continue;
      const box: Aabb = { minX: c.minX, maxX: c.maxX, minY: c.minY - e, maxY: c.maxY - e, minZ: c.minZ, maxZ: c.maxZ };
      if (c.door) box.door = true;
      if (c.enabled === false) box.enabled = false;
      list.push(box);
    }
    const floors = lv === level ? undefined : (levelFloors.get(lv) ?? []);
    return buildNavGrid(walkBounds, list, { cell: 0.5, radius: NAV_RADIUS, ...(floors ? { floors } : {}) });
  }

  private planPath(goal: { x: number; z: number }, lv: string = this.world.level): { path: { x: number; z: number }[]; arrive: number } | null {
    const { levels, ctx, walkBounds, player } = this.world;
    const navGrid = levels.multi ? this.levelNavGrid(lv) : buildNavGrid(walkBounds, ctx.colliders.values(), { cell: 0.5, radius: NAV_RADIUS });
    this.navGrid = navGrid;
    const path = findPath(navGrid, { x: player.x, z: player.z }, goal);
    if (!path || !path.length) return null;
    const end = path[path.length - 1];
    return { path, arrive: Math.max(1, Math.hypot(end.x - goal.x, end.z - goal.z) + 0.35) };
  }

  private replan(w: AutoWalk): boolean {
    const { player } = this.world;
    if (w.replans >= 3) return false;
    w.replans++;
    let path: { x: number; z: number }[];
    if (w.fixed) path = w.fixed.filter((p, i) => i === w.fixed!.length - 1 || Math.hypot(p.x - player.x, p.z - player.z) > 0.35);
    else if (w.pathLeg) {
      // a world-model route: a local detour to its next point, then on along its points (a bounded number of times)
      if (w.route && w.route.detours >= MAX_ROUTE_DETOURS) return false;
      const rest = w.path.slice(Math.min(w.index, Math.max(0, w.path.length - 1)));
      if (!rest.length) return false;
      const p = this.planPath(rest[0], w.level);
      if (!p) return false;
      path = [...p.path, ...rest.slice(1)];
      if (w.route) w.route.detours++;
    } else {
      const p = this.planPath(w.goal, w.level);
      if (!p) return false;
      path = p.path;
      w.arrive = Math.max(w.arrive, p.arrive);
    }
    w.path = path;
    w.index = 0;
    w.stall = 0;
    w.bestRemaining = w.replanBase = this.remainingPath(w);
    return true;
  }

  /** Start the next leg of a route; false when it cannot be planned. */
  private nextLeg(w: AutoWalk): boolean {
    const world = this.world;
    const { player, S } = world;
    const leg = w.legs.shift();
    if (!leg) return false;
    w.index = 0;
    w.replans = 0;
    w.stall = 0;
    w.bestRemaining = w.replanBase = Infinity;
    w.fixed = undefined;
    w.pathLeg = false;
    if (leg.kind === "path") {
      // the world model's points on this level (embodiment)
      w.level = leg.level;
      w.pathLeg = true;
      w.path = leg.points.map((p) => ({ ...p }));
      const end = w.path[w.path.length - 1];
      w.goal = { x: end.x, z: end.z };
      w.arrive = leg.final ? ROUTE_ARRIVE : LEG_ARRIVE;
      return true;
    }
    if (leg.kind === "ride") {
      w.riding = true;
      w.path = [];
      world.rides.ride(leg.connectorId, leg.level).then(
        () => {
          w.riding = false;
          if (this.current !== w) return;
          if (!w.legs.length) this.cancel(null);
          else if (!this.nextLeg(w)) this.cancel(new Error(S.unreachable));
        },
        (err: unknown) => {
          w.riding = false;
          if (this.current === w) this.cancel(err instanceof Error ? err : new Error(String(err)));
        },
      );
      return true;
    }
    w.level = leg.level;
    if (leg.kind === "flight") {
      // a flight that starts where the avatar stands (a world route beginning at the stairs): from here
      if (leg.path.length < 2) leg.path = [{ x: player.x, z: player.z }, ...leg.path];
      w.fixed = leg.path;
      w.path = [...leg.path];
      w.goal = leg.path[leg.path.length - 1];
      w.arrive = LEG_ARRIVE;
      return true;
    }
    const plan = this.planPath(leg.goal, leg.level);
    if (!plan) return false;
    w.path = plan.path;
    w.goal = { x: leg.goal.x, z: leg.goal.z };
    w.arrive = leg.final ? plan.arrive : LEG_ARRIVE;
    return true;
  }

  /** `WorldApi.walkTo`: walk the avatar to a point (another level via stairs or an elevator). */
  walkTo(target: WorldPoint, signal?: AbortSignal): Promise<void> {
    const world = this.world;
    const { player, levels, level, elevators, S } = world;
    this.cancel(new Error("superseded"));
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      if (world.disposed) {
        reject(new Error("disposed"));
        return;
      }
      const here = levels.multi ? world.currentLevel() : level;
      const to = levels.multi && target.level && levels.list.some((l) => l.id === target.level) ? target.level : levels.multi ? level : here;
      if (to === here && Math.hypot(target.x - player.x, target.z - player.z) <= 1) {
        resolve();
        return;
      }
      const goal = { x: target.x, z: target.z };
      const legs = routeLegs(levels.flights, elevators, here, to, { x: player.x, z: player.z }, goal);
      const w: AutoWalk = { path: [], index: 0, goal, arrive: 1, replans: 0, resolve, reject, stall: 0, bestRemaining: Infinity, replanBase: Infinity, signal, level: here, legs: legs ?? [] };
      if (!legs || !this.nextLeg(w)) {
        reject(new Error(S.unreachable));
        return;
      }
      if (signal) {
        w.onAbort = () => {
          if (this.current === w) this.cancel(new DOMException("Aborted", "AbortError") as unknown as Error);
        };
        signal.addEventListener("abort", w.onAbort, { once: true });
      }
      this.current = w;
    });
  }

  /** The avatar's pose in the world model's convention (feet height, yaw 0 → −Z). */
  avatarPose(): BodyPose {
    const world = this.world;
    const { player, levels, level } = world;
    return { x: player.x, y: player.y, z: player.z, yaw: world.yaw, pitch: world.pitch, level: levels.multi ? world.currentLevel() : level };
  }

  /**
   * Walk the avatar along a world-model route (`WorldApi.followRoute`): the existing auto-walk machinery
   * (doors, stalls, flights, elevator rides) on legs built from the route's own points.
   */
  followRoute(route: RoutePoint[], opts: { yaw?: number; signal?: AbortSignal } = {}): Promise<BodyMove> {
    const world = this.world;
    const { player, levels, level, stage } = world;
    const camera = stage.camera;
    this.cancel(new Error("superseded"));
    return new Promise<BodyMove>((resolve) => {
      const here = levels.multi ? world.currentLevel() : level;
      const tracker = { opened: new Set<DoorRecord>(), detours: 0 };
      let done = false;
      const finish = (arrived: boolean) => {
        if (done) return;
        done = true;
        if (arrived) {
          // settle exactly on the planned spot (a free cell centre) and face the target
          const end = route[route.length - 1];
          if (end && end.level === (levels.multi ? world.currentLevel() : level) && Math.hypot(end.x - player.x, end.z - player.z) <= ROUTE_ARRIVE + 0.1) {
            player.x = end.x;
            player.z = end.z;
          }
          if (opts.yaw !== undefined && Number.isFinite(opts.yaw)) {
            world.yaw = opts.yaw;
            world.pitch = 0;
          }
          camera.position.set(player.x, player.y + PHYSICS.eye, player.z);
          camera.rotation.set(world.pitch, world.yaw, 0);
        }
        resolve({ arrived, pose: this.avatarPose(), replans: tracker.detours });
      };
      if (opts.signal?.aborted || world.disposed) {
        finish(false);
        return;
      }
      const legs = worldRouteLegs(route, here, this.connectorKind);
      if (!legs.length) {
        finish(true);
        return;
      }
      const w: AutoWalk = {
        path: [],
        index: 0,
        goal: { x: player.x, z: player.z },
        arrive: ROUTE_ARRIVE,
        replans: 0,
        resolve: () => finish(true),
        reject: () => finish(false),
        stall: 0,
        bestRemaining: Infinity,
        replanBase: Infinity,
        signal: opts.signal,
        level: here,
        legs,
        route: tracker,
        budget: walkBudget(polylineLength(player.x, player.z, route)),
      };
      if (!this.nextLeg(w)) {
        finish(false);
        return;
      }
      if (opts.signal) {
        w.onAbort = () => {
          if (this.current === w) this.cancel(new DOMException("Aborted", "AbortError") as unknown as Error);
        };
        opts.signal.addEventListener("abort", w.onAbort, { once: true });
      }
      this.current = w;
    });
  }
}
