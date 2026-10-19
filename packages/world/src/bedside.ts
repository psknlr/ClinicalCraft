/**
 * The bedside rule (EMBODIED §6) — ONE rule for every consumer: the spatial
 * policy (`bedside-provider`), the `deviceAtBedside` precondition of device
 * operations, the patient's monitor, delegation, skills and the benchmark
 * (`WorldRuntime.atBedside`).
 *
 * An entity — where it is now: a moved cart where it was parked, a carried
 * item with its holder — is at the patient's bedside when it is on the
 * slot's level and
 *
 * 1. in the slot's room, or
 * 2. within `BEDSIDE_RADIUS` (6 m) of the slot point AND (visible from the
 *    slot point at eye height OR reachable from the bedside by a walk of at
 *    most the radius) — where the radius bridges a room boundary only for an
 *    open slot (outdoors, or a slot without a room) or for portable
 *    equipment standing in open space just outside the room (no room, an
 *    outdoor room, a corridor).
 *
 * Never through a wall: fixed equipment in another room does not count,
 * however close; neither does anything seen through a window into another
 * room (line of sight counts only between open spaces).
 */
import type { FacilityDefinition, PatientSlot } from "@clinicalcraft/core";
import { BEDSIDE_RADIUS } from "./contracts.js";
import type { Placed } from "./locate.js";
import type { NavGrids } from "./nav/grid.js";
import { flood, nearestFreeCell } from "./nav/search.js";
import { cellIndex, distanceToArea, inFrame } from "./raster.js";
import type { SightTarget, VisibilityModel } from "./visibility.js";

/** Room kinds that are open circulation space indoors: a cart parked there stands "just outside" the rooms around it. */
export const OPEN_ROOM_KINDS: readonly string[] = ["corridor"];

/** Search band around an entity for the walk from the bedside (m beyond its footprint). */
const WALK_BAND = 1.4;

export interface BedsideRuleDeps {
  facility: FacilityDefinition;
  visibility: VisibilityModel;
  /** The navigation grids (walking distances); null with a custom backend (then only the room and line of sight count). */
  grids: NavGrids | null;
  slot: PatientSlot | null;
  /** Level of the slot (null without a slot). */
  slotLevel: string | null;
  /** The sight target of a placed entity (its current footprint). */
  sight(p: Placed): SightTarget;
}

/** The bedside rule of one encounter (see the module docs). */
export class BedsideRule {
  private walkField: { version: number; field: Float64Array } | null = null;
  private readonly openSlot: boolean;

  constructor(private readonly d: BedsideRuleDeps) {
    this.openSlot = !d.slot?.room || this.isOpenRoom(d.slot.room);
  }

  /** Is a room open space: no room, a room outside every building (outdoors), or an indoor corridor? */
  isOpenRoom(roomId: string | null): boolean {
    if (!roomId) return true;
    const room = this.d.facility.rooms.find((r) => r.id === roomId);
    if (!room) return true;
    return !room.building || OPEN_ROOM_KINDS.includes(room.kind);
  }

  /** Is the slot itself in open space (the garden bench)? */
  get slotIsOpen(): boolean {
    return this.openSlot;
  }

  /** Is the placed entity at the bedside now (see the module docs)? */
  at(p: Placed): boolean {
    const slot = this.d.slot;
    if (!slot || p.level !== this.d.slotLevel) return false;
    if (slot.room && p.room === slot.room) return true;
    if (Math.hypot(p.position.x - slot.x, p.position.z - slot.z) > BEDSIDE_RADIUS + 1e-9) return false;
    const open = this.isOpenRoom(p.room);
    const portable = !!p.entity?.portable || !!p.heldBy;
    // the radius bridges a room boundary only for an open slot, or a portable item just outside the room
    if (!this.openSlot && !(portable && open)) return false;
    if (open && this.d.visibility.visibleFrom(p.level, { x: slot.x, z: slot.z }, this.d.sight(p))) return true;
    return this.walk(p) <= BEDSIDE_RADIUS + 1e-9;
  }

  /**
   * Metres walked from the bedside (the free cell nearest the slot point) to
   * the nearest free cell within `WALK_BAND` of the entity's footprint with a
   * line of sight to it (locked doors block; carts and obstacles do not).
   * Infinity when there is no such walk within the radius (or no grid).
   */
  walk(p: Placed): number {
    const grids = this.d.grids;
    const slot = this.d.slot;
    const level = this.d.slotLevel;
    const g = level ? grids?.grid(level) : null;
    if (!grids || !g || !slot || !level || p.level !== level) return Infinity;
    if (!this.walkField || this.walkField.version !== grids.version) {
      const mask = grids.compose(level, { role: "clinician", ignoreZones: true, ignoreDynamic: true })!;
      const start = inFrame(g, slot.x, slot.z) ? nearestFreeCell(g, mask, cellIndex(g, slot.x, slot.z), 4) : null;
      this.walkField = { version: grids.version, field: start === null ? new Float64Array(g.cols * g.rows).fill(Infinity) : flood(g, mask, start) };
    }
    const field = this.walkField.field;
    const a = p.area;
    const x0 = Math.max(0, Math.floor((a.minX - WALK_BAND - g.minX) / g.cell));
    const x1 = Math.min(g.cols - 1, Math.floor((a.maxX + WALK_BAND - g.minX) / g.cell));
    const z0 = Math.max(0, Math.floor((a.minZ - WALK_BAND - g.minZ) / g.cell));
    const z1 = Math.min(g.rows - 1, Math.floor((a.maxZ + WALK_BAND - g.minZ) / g.cell));
    // cells next to the entity reached by the flood, nearest first; the first with a line of sight to it (never across a wall)
    const cells: { i: number; d: number; x: number; z: number }[] = [];
    for (let iz = z0; iz <= z1; iz++)
      for (let ix = x0; ix <= x1; ix++) {
        const i = iz * g.cols + ix;
        const d = field[i];
        if (!Number.isFinite(d)) continue;
        const x = g.minX + (ix + 0.5) * g.cell, z = g.minZ + (iz + 0.5) * g.cell;
        if (distanceToArea(x, z, a) <= WALK_BAND) cells.push({ i, d, x, z });
      }
    cells.sort((u, v) => u.d - v.d || u.i - v.i);
    const sight = this.d.sight(p);
    for (const c of cells) {
      if (c.d * g.cell > BEDSIDE_RADIUS + 1e-9) break;
      if (this.d.visibility.visibleFrom(level, c, sight)) return c.d * g.cell;
    }
    return Infinity;
  }
}
