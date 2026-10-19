/**
 * Reachability for perception and hint ranking: walking distance from an
 * actor to the nearest spot from which an entity can be operated, without
 * an A* search per entity. One Dijkstra flood per (level, role, allowed
 * zones, actor cell, grid version) — cached, a handful at a time — then
 * each entity costs a scan of its interaction cells (the planner's rule:
 * statically free cells within its reach band, or its declared interaction
 * points, with line of sight to it; inside a room for rooms).
 *
 * Distances are grid path lengths (8-connected, before string pulling): a
 * slight over-estimate of the planned route, good for ranking. An entity on
 * another level is reached through one connector ride (the stairs, a lift,
 * a ramp usable by the actor's role): the walk to its stop, the ride at
 * walking speed (its `travelSeconds` × stops × `WALK_SPEED`) and the walk
 * from the arrival stop — walking-equivalent metres, so the same ranking
 * holds across levels. Null only without a grid backend.
 */
import { WALK_SPEED, type ActorState, type ConnectorInfo } from "./contracts.js";
import { connectorInfos } from "./levels.js";
import type { Placed, WorldLocator } from "./locate.js";
import { NAV_RADIUS, type NavGrids, type NavLevelGrid } from "./nav/grid.js";
import { flood, nearestFreeCell } from "./nav/search.js";
import { cellIndex, cellPoint, distanceToArea, inFrame } from "./raster.js";

export class Reachability {
  private masks = new Map<string, Uint8Array>();
  private floods = new Map<string, Float64Array>();
  private version = -1;
  private readonly connectors: ConnectorInfo[];

  constructor(
    private readonly grids: NavGrids | null,
    private readonly locator: WorldLocator,
    private readonly maxFloods = 16,
  ) {
    this.connectors = connectorInfos(locator.facility);
  }

  /**
   * Metres of walking from the actor to the nearest interaction spot of `p`
   * (0 for an item the actor carries), Infinity when there is none it can
   * reach, null when not computed (another level, or no grid backend).
   */
  pathDistance(actor: ActorState, p: Placed): number | null {
    if (p.heldBy === actor.id) return 0;
    const level = actor.pose.level;
    const g = this.grids?.grid(level);
    if (!this.grids || !g) return null;
    const walk = this.walkField(actor);
    if (!walk) return Infinity;
    if (p.level !== level) return this.acrossLevels(actor, walk.field, p);
    return this.toEntity(g, walk.field, p);
  }

  /** Metres of the field to the nearest interaction cell of `p` with a line of sight to it (Infinity: none). */
  private toEntity(g: NavLevelGrid, field: Float64Array, p: Placed): number {
    const cells = this.cells(g, p).filter((i) => Number.isFinite(field[i]));
    cells.sort((a, b) => field[a] - field[b] || a - b);
    const sight = this.locator.sight(p);
    for (const i of cells) {
      if (p.kind === "room" || this.locator.visibility.visibleFrom(g.level, cellPoint(g, i), sight)) return field[i] * g.cell;
    }
    return Infinity;
  }

  /** One connector ride to the entity's level (see the module docs): the cheapest walk + ride + walk, Infinity when none leads there. */
  private acrossLevels(actor: ActorState, field: Float64Array, p: Placed): number {
    const grids = this.grids!;
    const from = grids.grid(actor.pose.level)!;
    const to = grids.grid(p.level);
    if (!to) return Infinity;
    let best = Infinity;
    for (const c of this.connectors) {
      if (c.roles.length && !c.roles.includes(actor.role)) continue;
      const a = c.stops.findIndex((s) => s.level === actor.pose.level);
      const b = c.stops.findIndex((s) => s.level === p.level);
      if (a < 0 || b < 0) continue;
      const stopA = c.stops[a]!, stopB = c.stops[b]!;
      if (!inFrame(from, stopA.x, stopA.z) || !inFrame(to, stopB.x, stopB.z)) continue;
      const startMask = this.mask(actor.pose.level, actor.role, grids.zonesAt(actor.pose.level, actor.pose.x, actor.pose.z));
      const cellA = nearestFreeCell(from, startMask, cellIndex(from, stopA.x, stopA.z), 4);
      if (cellA === null || !Number.isFinite(field[cellA])) continue;
      const toStop = field[cellA] * from.cell;
      const ride = c.travelSeconds * Math.abs(b - a) * WALK_SPEED;
      if (toStop + ride >= best) continue;
      const arrivalZones = grids.zonesAt(p.level, stopB.x, stopB.z);
      const arrivalMask = this.mask(p.level, actor.role, arrivalZones);
      const cellB = nearestFreeCell(to, arrivalMask, cellIndex(to, stopB.x, stopB.z), 4);
      if (cellB === null) continue;
      const fromStop = this.toEntity(to, this.floodFrom(p.level, actor.role, arrivalZones, cellB), p);
      best = Math.min(best, toStop + ride + fromStop);
    }
    return best;
  }

  private mask(level: string, role: ActorState["role"], zones: readonly string[]): Uint8Array {
    const key = `${level}|${role}|${zones.join(",")}`;
    let mask = this.masks.get(key);
    if (!mask) {
      mask = this.grids!.compose(level, { role, allowZones: zones })!;
      this.masks.set(key, mask);
    }
    return mask;
  }

  private floodFrom(level: string, role: ActorState["role"], zones: readonly string[], start: number): Float64Array {
    const key = `${level}|${role}|${zones.join(",")}|${start}`;
    let field = this.floods.get(key);
    if (!field) {
      field = flood(this.grids!.grid(level)!, this.mask(level, role, zones), start);
      this.floods.set(key, field);
      if (this.floods.size > this.maxFloods) this.floods.delete(this.floods.keys().next().value!);
    }
    return field;
  }

  /**
   * The actor's walking flood on its level (cells of the planner's grid;
   * Infinity where it cannot walk), cached per actor cell, role and zones;
   * null without a grid backend or when the actor stands nowhere walkable.
   */
  walkField(actor: ActorState): { level: string; field: Float64Array } | null {
    const level = actor.pose.level;
    const g = this.grids?.grid(level);
    if (!this.grids || !g) return null;
    if (this.version !== this.grids.version) {
      this.masks.clear();
      this.floods.clear();
      this.version = this.grids.version;
    }
    const zones = this.grids.zonesAt(level, actor.pose.x, actor.pose.z);
    const mask = this.mask(level, actor.role, zones);
    if (!inFrame(g, actor.pose.x, actor.pose.z)) return null;
    const start = nearestFreeCell(g, mask, cellIndex(g, actor.pose.x, actor.pose.z), 4);
    if (start === null) return null;
    return { level, field: this.floodFrom(level, actor.role, zones, start) };
  }

  /** Candidate interaction cells of an entity (statically free; see module docs). */
  private cells(g: NavLevelGrid, p: Placed): number[] {
    const out: number[] = [];
    if (p.interactionPoints?.length) {
      for (const pt of p.interactionPoints) {
        if (!inFrame(g, pt.x, pt.z)) continue;
        const i = nearestFreeCell(g, g.base, cellIndex(g, pt.x, pt.z), 1);
        if (i !== null) out.push(i);
      }
      return out;
    }
    const area = p.area;
    const room = p.kind === "room";
    const range = room ? 0 : this.locator.reach(p);
    const soft = p.kind === "staff" || p.kind === "actor" || p.kind === "door" || p.kind === "connector" || (p.kind === "equipment" && p.entity?.equipmentType?.solid === false);
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
        if (room ? d > 1e-9 : d > range + 1e-9 || d === 0 || (soft && d < NAV_RADIUS - 1e-9)) continue;
        out.push(i);
      }
    return out;
  }
}
