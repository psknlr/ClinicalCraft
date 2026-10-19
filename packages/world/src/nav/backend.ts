/**
 * `GridAStarBackend` — the default `NavigationBackend` (EMBODIED §7, R12):
 * grid A* per level on the collision model (`NavGrids`), string-pulled
 * paths, mineflayer-pathfinder-style goals and a portal graph over the
 * facility's connectors for multi-level routes.
 *
 * Goals (ranges in metres from the target's footprint):
 * - `point` {x, z, level?, range?}: within `range` of the point (default 0:
 *   the point itself, or the nearest free cell when it is inside furniture).
 * - `entity` {id, range = 1.5}: within range of the entity.
 * - `interact` {id}: the best interaction point — a free cell within the
 *   entity's `reach` of its footprint (or one of its declared
 *   `interactionPoints`), with line of sight to it, not inside it; the
 *   cheapest to reach; final yaw faces the entity. None → NO_INTERACTION_POINT.
 * - `room` {id}: any free cell inside the room.
 * - `follow` {id, range = 1}: one-shot `entity` goal on the target's current
 *   pose (actors and staff via `WorldDynamics.actorPose`).
 * - `look` {id, range = 15}: a cell within range with line of sight; faces it.
 * - `any` {goals}: the satisfiable sub-goal with the shortest travel time.
 *
 * Planning respects the actor's role (access zones; connector `roles`),
 * locked doors and dynamic obstacles. Failures are diagnosed by relaxing
 * them: ACCESS_DENIED (passable without the zone/connector restriction;
 * `details.zones` / `details.connectors`), PATH_BLOCKED (passable through
 * locked doors or obstacles; `details.doors` / `details.obstacles`),
 * TARGET_NOT_REACHABLE otherwise; NAVIGATION_TIMEOUT when the A* expansion
 * budget runs out; TARGET_NOT_FOUND for unknown ids.
 *
 * Travel time: walking length / WALK_SPEED + connector `travelSeconds` per
 * hop (stairs and ramps add their 3D walking length to `length`; elevators
 * none). Staff bodies are dynamic and not on the grid.
 */
import { t, type FacilityDefinition } from "@clinicalcraft/core";
import { RANGES, WALK_SPEED, type CollisionModel, type ConnectorInfo, type EntityId, type NavErrorCode, type NavGoal, type NavigationBackend, type NavPlan, type NavRequest, type PathPoint, type Pose, type Vec2 } from "../contracts.js";
import { navMessage, roleName } from "../i18n.js";
import { connectorInfos, levelElevation } from "../levels.js";
import { smoothPath } from "../pathfind.js";
import { cellIndex, cellPoint, distanceToArea, footprintArea, inFrame, type Area, type WorldDynamics } from "../raster.js";
import { BODY_FOOTPRINT, type SemanticRegistry } from "../registry.js";
import { rotateXZ, rotatedFootprint } from "../geometry.js";
import { VisibilityModel, yawTowards, type SightTarget } from "../visibility.js";
import { NAV_CELL, NAV_INFLATE, NAV_RADIUS, NavGrids, type MaskOptions, type NavLevelGrid } from "./grid.js";
import { astar, flood, nearestFreeCell } from "./search.js";

export interface GridAStarOptions {
  facility: FacilityDefinition;
  collision: CollisionModel;
  registry: SemanticRegistry;
  /** Occlusion for interaction/look goals (built from the collision model when omitted). */
  visibility?: VisibilityModel;
  /** Physical state: door locks, obstacles, displaced carts, actor poses. */
  dynamics?: WorldDynamics;
  /** Language of failure messages (default zh-CN). */
  locale?: string;
  /** A* expansion budget of one `plan` call, shared by every target its goal resolves to (default 200 000). */
  maxExpanded?: number;
  /** Injected wall clock (ms) for the wall-time budget of one `plan` call; without it only the expansion budget bounds it. */
  clock?: () => number;
  /** Wall-time budget of one `plan` call (ms, default 1 000), checked between targets. */
  wallBudgetMs?: number;
}

/** Most distinct targets one goal may resolve to (the cap of `goalProblem`; a caller that skips it is cut here). */
export const MAX_TARGETS = 16;
/** Largest goal range honoured by the planner (m; larger ranges are clamped). */
export const MAX_RANGE = 30;

/** The expansion budget left in one `plan` call (shared by every search it runs). */
interface Budget {
  left: number;
}

/** A target to reach, resolved from a goal (one level). */
interface Target {
  goal: NavGoal;
  level: string;
  label: string;
  entity?: EntityId;
  /** Candidate goal cells (precomputed) … */
  cells?: Set<number>;
  /** … or a predicate (cheap tests only). */
  test?: (i: number) => boolean;
  /** Heuristic: distance (m) to this area minus `slack`. */
  area: Area;
  slack: number;
  /** Final yaw faces this point. */
  face?: Vec2;
  /** End exactly here when the path ends in its cell. */
  exact?: Vec2;
  /** Look goals: the vantage range (a failed look with no vantage cell at all is NO_INTERACTION_POINT). */
  lookRange?: number;
}

interface Leg {
  level: string;
  /** Exact start point of the leg. */
  from: Vec2;
  /** Grid cells from the start cell to the end cell (inclusive). */
  cells: number[];
  /** Connector ridden to reach the start of this leg (null for the first). */
  via: ConnectorInfo | null;
  /** Hops of `via` (stops travelled). */
  hops: number;
}

type Route = { ok: true; legs: Leg[]; target: Target; seconds: number } | { ok: false; budget: boolean };

type Failure = { ok: false; goal: NavGoal; code: NavErrorCode; message: string; details?: Record<string, unknown> };

interface Located {
  id: EntityId;
  level: string;
  position: Vec2;
  footprint: { w: number; d: number };
  reach: number;
  kind: string;
  name: string;
  interactionPoints?: Vec2[];
  /** Has no collider on the static grid (staff, actors): exclude cells inside it. */
  soft: boolean;
}

const DEFAULT_ENTITY_RANGE = RANGES.interact;
const DEFAULT_FOLLOW_RANGE = 1;
const LOOK_RANGE = 15;
/**
 * Smallest effective goal range / reach (m from a footprint): a free cell
 * centre lies ≥ NAV_INFLATE (0.38) from any collider, so a band of one cell
 * beyond it (0.88 m) always contains cell centres.
 */
export const MIN_RANGE = NAV_INFLATE + NAV_CELL;

export class GridAStarBackend implements NavigationBackend {
  readonly id = "grid-astar";
  readonly grids: NavGrids;
  readonly visibility: VisibilityModel;
  private readonly facility: FacilityDefinition;
  private readonly registry: SemanticRegistry;
  private readonly dynamics: WorldDynamics;
  private readonly connectors: ConnectorInfo[];
  private readonly locale: string;
  private readonly budget: number;
  private readonly clock: (() => number) | null;
  private readonly wallBudgetMs: number;
  private masks = new Map<string, Uint8Array>();
  private comps = new Map<string, Int32Array>();
  private floods = new Map<string, Float64Array>();
  private cacheVersion = -1;

  constructor(opts: GridAStarOptions) {
    this.facility = opts.facility;
    this.registry = opts.registry;
    this.dynamics = opts.dynamics ?? {};
    this.locale = opts.locale ?? "zh-CN";
    this.budget = opts.maxExpanded ?? 200000;
    this.clock = opts.clock ?? null;
    this.wallBudgetMs = opts.wallBudgetMs ?? 1000;
    this.connectors = connectorInfos(opts.facility);
    const rotOf = (id: string) => opts.registry.entity(id)?.rot ?? 0;
    this.grids = new NavGrids(opts.facility, opts.collision, { dynamics: this.dynamics, rotOf });
    this.visibility = opts.visibility ?? new VisibilityModel(opts.facility, opts.collision, { dynamics: this.dynamics, rotOf });
  }

  invalidate(area?: { level: string; minX: number; maxX: number; minZ: number; maxZ: number }): void {
    this.grids.invalidate(area);
    this.visibility.invalidate(area);
  }

  plan(request: NavRequest): NavPlan {
    const from = request.from;
    const start = this.grids.grid(from.level);
    if (!start || !inFrame(start, from.x, from.z)) return this.fail(request.goal, "TARGET_NOT_REACHABLE", { target: this.goalLabel(request.goal) }, { reason: !start ? "unknown-level" : "start-out-of-bounds", level: from.level });
    // one cost bound for the whole goal (EMBODIED §7): identical leaves and targets once, at most MAX_TARGETS, one shared budget
    const leaves = goalLeaves(request.goal);
    if (!leaves.length) return this.fail(request.goal, "TARGET_NOT_FOUND", { target: "—" }, { reason: "no-goals" });
    const resolved: Target[] = [];
    let failure: Failure | null = null;
    for (const leaf of leaves) {
      const r = this.resolve(leaf, from);
      if ("code" in r) failure ??= r;
      else resolved.push(...r);
    }
    if (!resolved.length) return failure!;
    const seen = new Set<string>();
    const targets = resolved.filter((t) => {
      const key = targetKey(t);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, MAX_TARGETS);
    const budget: Budget = { left: request.maxExpanded ?? this.budget };
    const started = this.clock?.() ?? 0;
    const late = () => this.clock !== null && this.clock() - started > this.wallBudgetMs;
    const strict: MaskOptions = { role: request.role, allowZones: this.grids.zonesAt(from.level, from.x, from.z) };
    let best: { route: Extract<Route, { ok: true }> } | null = null;
    let exhausted = false;
    for (const target of targets) {
      if (budget.left <= 0 || late()) {
        exhausted = true;
        break;
      }
      const r = this.route(request, target, strict, budget);
      if (r.ok) {
        if (!best || r.seconds < best.route.seconds) best = { route: r };
      } else if (r.budget) exhausted = true;
    }
    if (best) return this.toPlan(request, best.route);
    if (exhausted || budget.left <= 0 || late()) return this.fail(request.goal, "NAVIGATION_TIMEOUT", { target: targets[0].label }, { maxExpanded: request.maxExpanded ?? this.budget });
    return this.diagnose(request, targets, strict, budget);
  }

  /* ---------------- goal resolution ---------------- */

  private resolve(goal: NavGoal, from: Pose): Target[] | Failure {
    switch (goal.kind) {
      case "any": {
        const out: Target[] = [];
        let failure: Failure | null = null;
        for (const sub of goal.goals) {
          const r = this.resolve(sub, from);
          if ("code" in r) failure ??= r;
          else out.push(...r);
        }
        if (out.length) return out;
        return failure ?? this.fail(goal, "TARGET_NOT_FOUND", { target: "—" }, { reason: "no-goals" });
      }
      case "point": {
        const level = goal.level ?? from.level;
        const g = this.grids.grid(level);
        const label = `(${goal.x.toFixed(1)}, ${goal.z.toFixed(1)})`;
        if (!g) return this.fail(goal, "TARGET_NOT_FOUND", { target: level }, { reason: "unknown-level", level });
        if (!inFrame(g, goal.x, goal.z)) return this.fail(goal, "TARGET_NOT_REACHABLE", { target: label }, { reason: "out-of-bounds" });
        const range = Math.min(MAX_RANGE, Math.max(0, goal.range ?? 0));
        const p = { x: goal.x, z: goal.z };
        if (range > 0) {
          const cells = cellsNear(g, pointArea(p), range, 0);
          if (!cells.size) return this.fail(goal, "TARGET_NOT_REACHABLE", { target: label }, { reason: "inside-obstacle" });
          return [{ goal, level, label, cells, area: pointArea(p), slack: range }];
        }
        const own = cellIndex(g, p.x, p.z);
        const cell = nearestFreeCell(g, g.base, own, 12);
        if (cell === null) return this.fail(goal, "TARGET_NOT_REACHABLE", { target: label }, { reason: "inside-obstacle" });
        return [{ goal, level, label, cells: new Set([cell]), area: pointArea(cellPoint(g, cell)), slack: 0, ...(cell === own ? { exact: p } : {}) }];
      }
      case "room": {
        const id = this.registry.resolveId(goal.id.startsWith("room:") ? goal.id : `room:${goal.id}`) ?? this.registry.resolveId(goal.id);
        const room = id ? this.registry.entity(id) : null;
        if (!room || room.kind !== "room") return this.fail(goal, "TARGET_NOT_FOUND", { target: goal.id });
        return [this.roomTarget(goal, room.id)];
      }
      default: {
        const target = this.locate(goal.id);
        if (!target) return this.fail(goal, "TARGET_NOT_FOUND", { target: goal.id });
        const g = this.grids.grid(target.level);
        if (!g) return this.fail(goal, "TARGET_NOT_FOUND", { target: target.name }, { reason: "unknown-level", level: target.level });
        const area = footprintArea({ position: target.position, footprint: target.footprint });
        if (target.kind === "room") return [this.roomTarget(goal, target.id)];
        if (goal.kind === "entity" || goal.kind === "follow") {
          // a free cell centre is ≥ NAV_INFLATE from a collider: smaller ranges could have no cell at all
          const range = Math.min(MAX_RANGE, Math.max(MIN_RANGE, goal.range ?? (goal.kind === "follow" ? DEFAULT_FOLLOW_RANGE : DEFAULT_ENTITY_RANGE)));
          const cells = cellsNear(g, area, range, target.soft ? NAV_RADIUS : 0);
          return [{ goal, level: target.level, label: target.name, entity: target.id, cells, area, slack: range, face: target.position }];
        }
        if (goal.kind === "look") {
          const range = Math.min(MAX_RANGE, Math.max(MIN_RANGE, goal.range ?? LOOK_RANGE));
          // lazy: line of sight is tested only on cells the search pops (memoised)
          const sight: SightTarget = { level: target.level, position: target.position, footprint: target.footprint, id: target.id };
          const memo = new Map<number, boolean>();
          const test = (i: number) => {
            let ok = memo.get(i);
            if (ok === undefined) {
              const c = cellPoint(g, i);
              ok = distanceToArea(c.x, c.z, area) <= range + 1e-9 && !(target.soft && distanceToArea(c.x, c.z, area) < NAV_RADIUS) && this.visibility.visibleFrom(target.level, c, sight);
              memo.set(i, ok);
            }
            return ok;
          };
          return [{ goal, level: target.level, label: target.name, entity: target.id, test, area, slack: range, face: target.position, lookRange: range }];
        }
        // interact
        if (target.kind === "level") return this.fail(goal, "NO_INTERACTION_POINT", { target: target.name }, { reason: "not-interactive" });
        const reach = Math.max(MIN_RANGE, target.reach);
        const cells = this.candidates(g, area, reach, target, true);
        if (!cells.size) return this.fail(goal, "NO_INTERACTION_POINT", { target: target.name }, { reach: target.reach, declaredPoints: target.interactionPoints?.length ?? 0 });
        // declared points may lie beyond the reach band: the heuristic slack must cover every goal cell
        const slack = target.interactionPoints?.length ? Math.max(reach, ...[...cells].map((i) => distanceToArea(cellPoint(g, i).x, cellPoint(g, i).z, area))) : reach;
        return [{ goal, level: target.level, label: target.name, entity: target.id, cells, area, slack, face: target.position }];
      }
    }
  }

  private roomTarget(goal: NavGoal, roomId: EntityId): Target {
    const room = this.registry.entity(roomId)!;
    const g = this.grids.grid(room.level)!;
    const area = footprintArea(room);
    return { goal, level: room.level, label: t(room.name, this.locale), entity: room.id, cells: cellsNear(g, area, 0, 0), area, slack: 0 };
  }

  /**
   * Interaction / vantage cells: statically free cells within `range` of the
   * footprint (declared interaction points when `points` and the entity has
   * some), not inside a body without a collider, with line of sight to it.
   */
  private candidates(g: NavLevelGrid, area: Area, range: number, target: Located, points: boolean): Set<number> {
    const out = new Set<number>();
    const sight: SightTarget = { level: target.level, position: target.position, footprint: target.footprint, id: target.id };
    const visible = (i: number) => this.visibility.visibleFrom(target.level, cellPoint(g, i), sight);
    if (points && target.interactionPoints?.length) {
      for (const p of target.interactionPoints) {
        if (!inFrame(g, p.x, p.z)) continue;
        const i = nearestFreeCell(g, g.base, cellIndex(g, p.x, p.z), 1);
        if (i !== null && visible(i)) out.add(i);
      }
      return out;
    }
    const x0 = Math.max(0, Math.floor((area.minX - range - g.minX) / g.cell));
    const x1 = Math.min(g.cols - 1, Math.floor((area.maxX + range - g.minX) / g.cell));
    const z0 = Math.max(0, Math.floor((area.minZ - range - g.minZ) / g.cell));
    const z1 = Math.min(g.rows - 1, Math.floor((area.maxZ + range - g.minZ) / g.cell));
    for (let iz = z0; iz <= z1; iz++)
      for (let ix = x0; ix <= x1; ix++) {
        const i = iz * g.cols + ix;
        if (g.base[i]) continue;
        const c = cellPoint(g, i);
        const d = distanceToArea(c.x, c.z, area);
        if (d > range + 1e-9 || d < (target.soft ? NAV_RADIUS : 0) - 1e-9) continue;
        if (d === 0) continue; // never inside the target
        if (visible(i)) out.add(i);
      }
    return out;
  }

  /** Where an entity is now: registry entity (displaced carts moved), actors and walking staff from `actorPose`. */
  private locate(idOrAlias: string): Located | null {
    const pose = this.dynamics.actorPose?.(idOrAlias);
    const id = this.registry.resolveId(idOrAlias);
    const e = id ? this.registry.entity(id) : null;
    const actorPose = pose ?? (id ? this.dynamics.actorPose?.(id) : null);
    if (actorPose && (!e || e.kind === "staff" || idOrAlias.startsWith("actor:"))) {
      return { id: e?.id ?? idOrAlias, level: actorPose.level, position: { x: actorPose.x, z: actorPose.z }, footprint: { w: BODY_FOOTPRINT.standing.w, d: BODY_FOOTPRINT.standing.d }, reach: e?.reach ?? RANGES.talk, kind: e?.kind ?? "actor", name: e ? t(e.name, this.locale) : idOrAlias, soft: true };
    }
    if (!e) return null;
    const moved = (this.dynamics.displaced?.() ?? []).find((d) => d.id === e.id)?.position;
    let position: Vec2 = { x: e.position.x, z: e.position.z };
    let level = e.level;
    let footprint = { w: e.footprint?.w ?? 0.2, d: e.footprint?.d ?? 0.2 };
    let points = e.interactionPoints;
    if (moved) {
      position = { x: moved.x, z: moved.z };
      level = moved.level;
      const rot = moved.rot ?? e.rot;
      const type = e.equipmentType;
      if (type) {
        const fp = rotatedFootprint(type.footprint.w, type.footprint.d, rot);
        footprint = { w: fp.w, d: fp.d };
        points = type.interactionPoints?.map((p) => {
          const [dx, dz] = rotateXZ(p.x, p.z, rot);
          return { x: moved.x + dx, z: moved.z + dz };
        });
      }
    }
    const soft = e.kind === "staff" || e.kind === "door" || e.kind === "connector" || (e.kind === "equipment" && e.equipmentType?.solid === false);
    return { id: e.id, level, position, footprint, reach: e.reach, kind: e.kind, name: t(e.name, this.locale), ...(points ? { interactionPoints: points } : {}), soft };
  }

  /* ---------------- routing ---------------- */

  private mask(level: string, opts: MaskOptions): Uint8Array | null {
    if (this.cacheVersion !== this.grids.version) {
      this.masks.clear();
      this.comps.clear();
      this.floods.clear();
      this.cacheVersion = this.grids.version;
    }
    const key = maskKey(level, opts);
    let m = this.masks.get(key);
    if (!m) {
      const composed = this.grids.compose(level, opts);
      if (!composed) return null;
      m = composed;
      this.masks.set(key, m);
    }
    return m;
  }

  /** Connected components of a level's mask (cached with the mask). */
  private component(level: string, opts: MaskOptions): Int32Array {
    const key = maskKey(level, opts);
    let c = this.comps.get(key);
    if (!c) {
      c = components(this.grids.grid(level)!, this.mask(level, opts)!);
      this.comps.set(key, c);
    }
    return c;
  }

  /** Cheapest route from the request's start to a target under a mask (portal graph over connectors). */
  private route(request: NavRequest, target: Target, opts: MaskOptions, budget: Budget): Route {
    const from = request.from;
    const startGrid = this.grids.grid(from.level)!;
    const startMask = this.mask(from.level, opts)!;
    const startCell = nearestFreeCell(startGrid, startMask, cellIndex(startGrid, from.x, from.z), 4);
    if (startCell === null) return { ok: false, budget: false };
    const finish = (level: string, cell: number) => {
      const g = this.grids.grid(level)!;
      const m = this.mask(level, opts)!;
      const isGoal = target.cells ? (i: number) => target.cells!.has(i) : target.test!;
      const { minX, maxX, minZ, maxZ } = target.area;
      const h = (i: number) => {
        const ix = i % g.cols;
        const x = g.minX + (ix + 0.5) * g.cell, z = g.minZ + ((i - ix) / g.cols + 0.5) * g.cell;
        const dx = Math.max(minX - x, 0, x - maxX), dz = Math.max(minZ - z, 0, z - maxZ);
        return Math.max(0, Math.sqrt(dx * dx + dz * dz) - target.slack) / g.cell;
      };
      const r = astar(g, m, cell, isGoal, h, Math.max(0, budget.left));
      budget.left -= r.expanded;
      return r;
    };

    // single level, no connectors: direct A*
    const usable = this.connectors.filter((c) => (!request.accessibleOnly || c.accessible) && (opts.ignoreZones || !c.roles.length || c.roles.includes(request.role)));
    if (!this.connectors.length || (!usable.length && target.level === from.level)) {
      if (target.level !== from.level) return { ok: false, budget: false };
      // no goal cell in the start's component: unreachable without searching the whole grid
      if (target.cells) {
        const comp = this.component(from.level, opts);
        let reachable = false;
        for (const c of target.cells) if (comp[c] === comp[startCell]) {
          reachable = true;
          break;
        }
        if (!reachable) return { ok: false, budget: false };
      }
      const r = finish(from.level, startCell);
      if (!r.found) return { ok: false, budget: !r.exhausted };
      return { ok: true, legs: [{ level: from.level, from: { x: from.x, z: from.z }, cells: r.cells, via: null, hops: 0 }], target, seconds: (r.cost * startGrid.cell) / WALK_SPEED };
    }

    // portal graph: start + every stop of every usable connector
    type Node = { level: string; cell: number; point: Vec2; connector: ConnectorInfo | null; stop: number };
    const nodes: Node[] = [{ level: from.level, cell: startCell, point: { x: from.x, z: from.z }, connector: null, stop: -1 }];
    for (const c of usable) {
      c.stops.forEach((s, k) => {
        const g = this.grids.grid(s.level);
        const m = g ? this.mask(s.level, opts) : null;
        if (!g || !m || !inFrame(g, s.x, s.z)) return;
        const cell = nearestFreeCell(g, m, cellIndex(g, s.x, s.z), 4);
        if (cell !== null) nodes.push({ level: s.level, cell, point: { x: s.x, z: s.z }, connector: c, stop: k });
      });
    }
    const walkFrom = (u: Node): Float64Array => {
      const key = `${maskKey(u.level, opts)}|${u.cell}`;
      let d = this.floods.get(key);
      if (!d) {
        d = flood(this.grids.grid(u.level)!, this.mask(u.level, opts)!, u.cell);
        this.floods.set(key, d);
      }
      return d;
    };
    const finishes = new Map<number, ReturnType<typeof finish>>();
    const finishOf = (k: number) => {
      let r = finishes.get(k);
      if (!r) finishes.set(k, (r = finish(nodes[k].level, nodes[k].cell)));
      return r;
    };
    const dist = new Array<number>(nodes.length).fill(Infinity);
    const prev = new Array<number>(nodes.length).fill(-1);
    const done = new Array<boolean>(nodes.length).fill(false);
    dist[0] = 0;
    let bestTotal = Infinity, bestNode = -1, budgetHit = false;
    for (;;) {
      let u = -1;
      for (let k = 0; k < nodes.length; k++) if (!done[k] && dist[k] < Infinity && (u < 0 || dist[k] < dist[u])) u = k;
      if (u < 0 || dist[u] >= bestTotal) break;
      done[u] = true;
      const nu = nodes[u];
      if (nu.level === target.level) {
        const r = finishOf(u);
        if (r.found) {
          const total = dist[u] + (r.cost * this.grids.grid(nu.level)!.cell) / WALK_SPEED;
          if (total < bestTotal) {
            bestTotal = total;
            bestNode = u;
          }
        } else if (!r.exhausted) budgetHit = true;
      }
      // walk to other stops on this level
      const field = walkFrom(nu);
      const cell = this.grids.grid(nu.level)!.cell;
      for (let v = 1; v < nodes.length; v++) {
        if (done[v] || nodes[v].level !== nu.level) continue;
        const d = field[nodes[v].cell];
        if (!Number.isFinite(d)) continue;
        const nd = dist[u] + (d * cell) / WALK_SPEED;
        if (nd < dist[v]) {
          dist[v] = nd;
          prev[v] = u;
        }
      }
      // ride the connector to its other stops
      if (nu.connector) {
        for (let v = 1; v < nodes.length; v++) {
          const nv = nodes[v];
          if (done[v] || nv.connector !== nu.connector || nv.stop === nu.stop) continue;
          const nd = dist[u] + nu.connector.travelSeconds * Math.abs(nv.stop - nu.stop);
          if (nd < dist[v]) {
            dist[v] = nd;
            prev[v] = u;
          }
        }
      }
    }
    if (bestNode < 0) return { ok: false, budget: budgetHit };
    const chain: Node[] = [];
    for (let k = bestNode; k !== -1; k = prev[k]) chain.push(nodes[k]);
    chain.reverse();
    const last = finishOf(bestNode);
    if (!last.found) return { ok: false, budget: !last.exhausted };
    const legs = this.legsFromChain(chain, last.cells, opts, budget);
    return legs ? { ok: true, legs, target, seconds: bestTotal } : { ok: false, budget: false };
  }

  /**
   * Legs from a node chain (start, stops…): consecutive nodes on one level
   * are walked (A* between their cells), consecutive stops of one connector
   * are ridden (a new leg starts at the arrival stop); `finalCells` (from the
   * last node to the target) close the last leg.
   */
  private legsFromChain(
    chain: { level: string; cell: number; point: Vec2; connector: ConnectorInfo | null; stop: number }[],
    finalCells: number[],
    opts: MaskOptions,
    budget: Budget,
  ): Leg[] | null {
    const legs: Leg[] = [];
    let cur = chain[0];
    let leg: Leg = { level: cur.level, from: cur.point, cells: [cur.cell], via: null, hops: 0 };
    for (let k = 1; k < chain.length; k++) {
      const next = chain[k];
      if (cur.connector && next.connector === cur.connector && next.stop !== cur.stop) {
        legs.push(leg);
        leg = { level: next.level, from: next.point, cells: [next.cell], via: cur.connector, hops: Math.abs(next.stop - cur.stop) };
      } else {
        const walk = this.walk(cur, next, opts, budget);
        if (!walk) return null;
        leg.cells.push(...walk.slice(1));
      }
      cur = next;
    }
    leg.cells.push(...finalCells.slice(1));
    legs.push(leg);
    return legs;
  }

  /** Grid cells walking from node a to node b on one level (inclusive). */
  private walk(a: { level: string; cell: number }, b: { level: string; cell: number }, opts: MaskOptions, budget: Budget): number[] | null {
    const g = this.grids.grid(a.level)!;
    const m = this.mask(a.level, opts)!;
    const goal = cellPoint(g, b.cell);
    const r = astar(g, m, a.cell, (i) => i === b.cell, (i) => {
      const c = cellPoint(g, i);
      const dx = Math.abs(c.x - goal.x) / g.cell, dz = Math.abs(c.z - goal.z) / g.cell;
      return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
    }, Math.max(0, budget.left));
    budget.left -= r.expanded;
    return r.found ? r.cells : null;
  }

  /* ---------------- results ---------------- */

  private toPlan(request: NavRequest, route: Extract<Route, { ok: true }>): NavPlan {
    const path: PathPoint[] = [];
    let length = 0;
    let walking = 0;
    let seconds = 0;
    let prevPoint: { x: number; z: number; level: string } | null = null;
    for (const leg of route.legs) {
      const g = this.grids.grid(leg.level)!;
      const m = this.mask(leg.level, { role: request.role, allowZones: this.grids.zonesAt(request.from.level, request.from.x, request.from.z) })!;
      if (leg.via && prevPoint) {
        const stop = leg.from;
        const climb = leg.via.kind === "elevator" ? 0 : Math.hypot(stop.x - prevPoint.x, stop.z - prevPoint.z, levelElevation(this.facility, leg.level) - levelElevation(this.facility, prevPoint.level));
        length += climb;
        seconds += leg.via.travelSeconds * leg.hops;
        path.push({ x: stop.x, z: stop.z, level: leg.level, via: leg.via.id });
      }
      const centres = leg.cells.slice(1).map((i) => cellPoint(g, i));
      const isLast = leg === route.legs[route.legs.length - 1];
      const exact = route.target.exact;
      if (isLast && exact && cellIndex(g, exact.x, exact.z) === leg.cells[leg.cells.length - 1]) {
        if (centres.length) centres[centres.length - 1] = { ...exact };
        else if (Math.hypot(exact.x - leg.from.x, exact.z - leg.from.z) > 0.05) centres.push({ ...exact });
      }
      const view = { minX: g.minX, minZ: g.minZ, cell: g.cell, cols: g.cols, rows: g.rows, blocked: m };
      const smooth = centres.length ? smoothPath(view, leg.from, centres) : [];
      let p = leg.from;
      for (const q of smooth) {
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        length += d;
        walking += d;
        path.push({ x: q.x, z: q.z, level: leg.level });
        p = q;
      }
      prevPoint = { x: p.x, z: p.z, level: leg.level };
    }
    seconds += walking / WALK_SPEED;
    const lastLeg = route.legs[route.legs.length - 1];
    const end = path.length ? path[path.length - 1] : { x: request.from.x, z: request.from.z, level: request.from.level };
    // arrival heading: the last segment on the final level (a connector arrival keeps the start yaw)
    const before = path.length >= 2 ? path[path.length - 2] : { x: request.from.x, z: request.from.z, level: request.from.level };
    const moved = path.length > 0 && !path[path.length - 1].via && before.level === end.level && (end.x !== before.x || end.z !== before.z);
    const yaw = route.target.face ? yawTowards(end, route.target.face) : moved ? yawTowards(before, end) : request.from.yaw;
    const target: Pose = { x: end.x, y: levelElevation(this.facility, lastLeg.level), z: end.z, yaw, pitch: 0, level: lastLeg.level };
    const plan: NavPlan = { ok: true, goal: request.goal, path, length, travelSeconds: seconds, target };
    if (route.target.entity) plan.targetEntity = route.target.entity;
    return plan;
  }

  /** Why no route: relax zones, then locks/obstacles, then both. */
  private diagnose(request: NavRequest, targets: Target[], strict: MaskOptions, budget: Budget): NavPlan {
    const label = targets[0].label;
    const relaxed = (opts: MaskOptions, accessibleOnly = request.accessibleOnly) => {
      for (const target of targets) {
        if (budget.left <= 0) return null;
        const r = this.route({ ...request, accessibleOnly }, target, opts, budget);
        if (r.ok) return r;
      }
      return null;
    };
    const zonesOnly = relaxed({ ...strict, ignoreZones: true });
    if (zonesOnly) {
      const { zones, connectors } = this.restrictionsOn(zonesOnly, request);
      return this.fail(request.goal, "ACCESS_DENIED", { target: label, role: roleName(request.role, this.locale), zones: [...zones, ...connectors].join(", ") || "—" }, { role: request.role, zones, connectors });
    }
    const unlocked = relaxed({ ...strict, ignoreLocks: true, ignoreDynamic: true });
    const all = unlocked ?? relaxed({ ...strict, ignoreZones: true, ignoreLocks: true, ignoreDynamic: true });
    if (all) {
      const { doors, obstacles } = this.blockersOn(all);
      const details: Record<string, unknown> = { doors, obstacles };
      if (!unlocked) {
        const { zones, connectors } = this.restrictionsOn(all, request);
        Object.assign(details, { zones, connectors, role: request.role });
      }
      return this.fail(request.goal, "PATH_BLOCKED", { target: label, blockers: [...doors, ...obstacles].join(", ") || "—" }, details);
    }
    if (request.accessibleOnly && relaxed({ ...strict, ignoreZones: true, ignoreLocks: true, ignoreDynamic: true }, false)) {
      return this.fail(request.goal, "TARGET_NOT_REACHABLE", { target: label }, { reason: "no-accessible-route", accessibleOnly: true });
    }
    const look = targets.find((tg) => tg.lookRange !== undefined && tg.entity);
    if (look && targets.length === 1) {
      const located = this.locate(look.entity!);
      const g = located ? this.grids.grid(located.level) : null;
      if (located && g && !this.candidates(g, look.area, look.lookRange!, located, false).size) return this.fail(request.goal, "NO_INTERACTION_POINT", { target: label }, { reason: "no-line-of-sight", range: look.lookRange });
    }
    return this.fail(request.goal, "TARGET_NOT_REACHABLE", { target: label }, { level: targets[0].level, from: request.from.level });
  }

  private blockersOn(route: Extract<Route, { ok: true }>): { doors: string[]; obstacles: string[] } {
    const doors = new Set<string>(), obstacles = new Set<string>();
    for (const leg of route.legs) {
      const g = this.grids.grid(leg.level)!;
      for (const i of leg.cells) {
        if (g.door[i] && this.grids.locked(g.door[i])) doors.add(this.grids.doorIds[g.door[i] - 1]);
        if (g.dynamic[i]) obstacles.add(this.grids.dynamicIds[g.dynamic[i] - 1]);
      }
    }
    return { doors: [...doors], obstacles: [...obstacles] };
  }

  private restrictionsOn(route: Extract<Route, { ok: true }>, request: NavRequest): { zones: string[]; connectors: string[] } {
    const zones = new Set<string>(), connectors = new Set<string>();
    const allow = this.grids.zonesAt(request.from.level, request.from.x, request.from.z);
    for (const leg of route.legs) {
      const g = this.grids.grid(leg.level)!;
      for (const i of leg.cells) {
        const z = g.zone[i];
        if (z && !this.grids.zoneAllows(z, request.role, allow)) for (const id of this.grids.zoneSets[z - 1].ids) if (!allow.includes(id)) zones.add(id);
      }
      if (leg.via && leg.via.roles.length && !leg.via.roles.includes(request.role)) connectors.add(leg.via.id);
    }
    return { zones: [...zones], connectors: [...connectors] };
  }

  private fail(goal: NavGoal, code: NavErrorCode, vars: Record<string, string | number>, details?: Record<string, unknown>): Failure {
    const out: Failure = { ok: false, goal, code, message: navMessage(code, this.locale, vars) };
    if (details) out.details = details;
    return out;
  }

  private goalLabel(goal: NavGoal): string {
    return "id" in goal ? goal.id : goal.kind === "point" ? `(${goal.x}, ${goal.z})` : goal.kind;
  }
}

/** Deepest `any` nesting the planner follows (deeper sub-goals are ignored; `goalProblem` refuses them first). */
const MAX_GOAL_DEPTH = 8;

/**
 * The leaves of a goal (nested `any` flattened, in order), identical leaves
 * once, at most MAX_TARGETS: whatever the shape, resolution stays bounded.
 */
function goalLeaves(goal: NavGoal): NavGoal[] {
  const out: NavGoal[] = [];
  const seen = new Set<string>();
  const visit = (g: NavGoal, depth: number): void => {
    if (g.kind === "any") {
      if (depth >= MAX_GOAL_DEPTH) return;
      for (const sub of g.goals) {
        if (out.length >= MAX_TARGETS) return;
        visit(sub, depth + 1);
      }
      return;
    }
    const key = JSON.stringify(g);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(g);
  };
  visit(goal, 0);
  return out;
}

/** Identity of a resolved target (the same leaf twice resolves to equal targets). */
function targetKey(t: Target): string {
  return `${t.level}|${t.entity ?? ""}|${JSON.stringify(t.goal)}`;
}

function maskKey(level: string, opts: MaskOptions): string {
  return `${level}|${opts.role}|${opts.ignoreZones ? 1 : 0}${opts.ignoreLocks ? 1 : 0}${opts.ignoreDynamic ? 1 : 0}|${(opts.allowZones ?? []).join(",")}`;
}

/** Statically free cells whose centre is within [minRange, range] of an area (0 = inside counts). */
function cellsNear(g: NavLevelGrid, area: Area, range: number, minRange: number): Set<number> {
  const out = new Set<number>();
  const x0 = Math.max(0, Math.floor((area.minX - range - g.minX) / g.cell));
  const x1 = Math.min(g.cols - 1, Math.floor((area.maxX + range - g.minX) / g.cell));
  const z0 = Math.max(0, Math.floor((area.minZ - range - g.minZ) / g.cell));
  const z1 = Math.min(g.rows - 1, Math.floor((area.maxZ + range - g.minZ) / g.cell));
  for (let iz = z0; iz <= z1; iz++) {
    const cz = g.minZ + (iz + 0.5) * g.cell;
    for (let ix = x0; ix <= x1; ix++) {
      const i = iz * g.cols + ix;
      if (g.base[i]) continue;
      const cx = g.minX + (ix + 0.5) * g.cell;
      const d = distanceToArea(cx, cz, area);
      if (d <= range + 1e-9 && d >= minRange - 1e-9) out.add(i);
    }
  }
  return out;
}

/** 4-connected components of the free cells of a mask (−1 = blocked): A* reachability without searching. */
export function components(g: { cols: number; rows: number }, blocked: Uint8Array): Int32Array {
  const comp = new Int32Array(blocked.length).fill(-1);
  const stack: number[] = [];
  let next = 0;
  for (let s = 0; s < blocked.length; s++) {
    if (blocked[s] || comp[s] >= 0) continue;
    comp[s] = next;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % g.cols;
      if (x > 0 && !blocked[i - 1] && comp[i - 1] < 0) (comp[i - 1] = next), stack.push(i - 1);
      if (x < g.cols - 1 && !blocked[i + 1] && comp[i + 1] < 0) (comp[i + 1] = next), stack.push(i + 1);
      if (i >= g.cols && !blocked[i - g.cols] && comp[i - g.cols] < 0) (comp[i - g.cols] = next), stack.push(i - g.cols);
      if (i + g.cols < blocked.length && !blocked[i + g.cols] && comp[i + g.cols] < 0) (comp[i + g.cols] = next), stack.push(i + g.cols);
    }
    next++;
  }
  return comp;
}

function pointArea(p: Vec2): Area {
  return { minX: p.x, maxX: p.x, minZ: p.z, maxZ: p.z };
}
