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
 * slight over-estimate of the planned route, good for ranking. Entities on
 * another level than the actor are not computed (null): the portal graph
 * belongs to the planner.
 */
import type { ActorState } from "./contracts.js";
import type { Placed, WorldLocator } from "./locate.js";
import { NAV_RADIUS, type NavGrids, type NavLevelGrid } from "./nav/grid.js";
import { flood, nearestFreeCell } from "./nav/search.js";
import { cellIndex, cellPoint, distanceToArea, inFrame } from "./raster.js";

export class Reachability {
  private masks = new Map<string, Uint8Array>();
  private floods = new Map<string, Float64Array>();
  private version = -1;

  constructor(
    private readonly grids: NavGrids | null,
    private readonly locator: WorldLocator,
    private readonly maxFloods = 8,
  ) {}

  /**
   * Metres of walking from the actor to the nearest interaction spot of `p`
   * (0 for an item the actor carries), Infinity when there is none it can
   * reach, null when not computed (another level, or no grid backend).
   */
  pathDistance(actor: ActorState, p: Placed): number | null {
    if (p.heldBy === actor.id) return 0;
    const level = actor.pose.level;
    const g = this.grids?.grid(level);
    if (!this.grids || !g || p.level !== level) return null;
    if (this.version !== this.grids.version) {
      this.masks.clear();
      this.floods.clear();
      this.version = this.grids.version;
    }
    const zones = this.grids.zonesAt(level, actor.pose.x, actor.pose.z);
    const maskKey = `${level}|${actor.role}|${zones.join(",")}`;
    let mask = this.masks.get(maskKey);
    if (!mask) {
      mask = this.grids.compose(level, { role: actor.role, allowZones: zones })!;
      this.masks.set(maskKey, mask);
    }
    if (!inFrame(g, actor.pose.x, actor.pose.z)) return Infinity;
    const start = nearestFreeCell(g, mask, cellIndex(g, actor.pose.x, actor.pose.z), 4);
    if (start === null) return Infinity;
    const floodKey = `${maskKey}|${start}`;
    let field = this.floods.get(floodKey);
    if (!field) {
      field = flood(g, mask, start);
      this.floods.set(floodKey, field);
      if (this.floods.size > this.maxFloods) this.floods.delete(this.floods.keys().next().value!);
    }
    const cells = this.cells(g, p).filter((i) => Number.isFinite(field![i]));
    cells.sort((a, b) => field![a] - field![b] || a - b);
    const sight = this.locator.sight(p);
    for (const i of cells) {
      if (p.kind === "room" || this.locator.visibility.visibleFrom(level, cellPoint(g, i), sight)) return field[i] * g.cell;
    }
    return Infinity;
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
