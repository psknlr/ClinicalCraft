/**
 * Levels in the voxel world (EMBODIED R10): elevations, the level the avatar
 * stands on, and the rules of level-aware culling. Every level above the
 * default one is built into its own static batch and group (`levelRoots`),
 * so it can be hidden as a whole; the default level (terrain, outdoors, the
 * ground floor and the ceilings/slabs of the floors above it) is never
 * hidden. A single-level facility has only the default level: nothing here
 * changes how it is built or drawn.
 */
import { defaultLevelId, facilityLevels, t, type FacilityDefinition, type LocalizedText } from "@clinicalcraft/core";
import { connectorFlights, type Flight } from "@clinicalcraft/world";

export interface LevelView {
  id: string;
  name: LocalizedText;
  elevation: number;
  height: number;
}

/** How far (m, from a flight's footprint) the stairwell lets the levels it joins see each other. */
export const STAIRWELL_VIEW_RANGE = 9;
/** The avatar is on a level once its feet are at most this far below the level's floor (half-way up a flight is still the lower level). */
const LEVEL_SNAP = 0.6;

export class WorldLevels {
  /** Levels sorted by elevation. */
  readonly list: LevelView[];
  readonly ground: string;
  readonly multi: boolean;
  /** Stairs and ramp flights (from the collision model's connectors). */
  readonly flights: Flight[];
  private readonly byId: Map<string, LevelView>;

  constructor(f: FacilityDefinition) {
    this.list = facilityLevels(f)
      .map((l) => ({ id: l.id, name: l.name, elevation: l.elevation, height: l.height }))
      .sort((a, b) => a.elevation - b.elevation);
    this.ground = defaultLevelId(f);
    this.multi = this.list.length > 1;
    this.flights = this.multi ? connectorFlights(f) : [];
    this.byId = new Map(this.list.map((l) => [l.id, l]));
  }

  /** Floor elevation of a level (0 for unknown ids). */
  elevation(id: string | undefined): number {
    return (id ? this.byId.get(id)?.elevation : undefined) ?? this.byId.get(this.ground)?.elevation ?? 0;
  }

  /** Localised level name. */
  name(id: string, locale: string): string {
    const l = this.byId.get(id);
    return l ? t(l.name, locale) || id : id;
  }

  /** The level whose floor the avatar's feet (height `y`) are on: the highest floor at most `LEVEL_SNAP` above them. */
  at(y: number): string {
    if (!this.multi) return this.ground;
    let best = this.list[0];
    for (const l of this.list) if (l.elevation <= y + LEVEL_SNAP) best = l;
    return best.id;
  }

  /** Is (x, z) within `range` of a flight that joins `level` (the stairwell opens the view between its levels)? */
  nearFlight(x: number, z: number, level: string, range = STAIRWELL_VIEW_RANGE): boolean {
    for (const fl of this.flights) {
      if (fl.foot.level !== level && fl.head.level !== level) continue;
      const dx = Math.max(fl.area.minX - x, 0, x - fl.area.maxX);
      const dz = Math.max(fl.area.minZ - z, 0, z - fl.area.maxZ);
      if (Math.hypot(dx, dz) <= range) return true;
    }
    return false;
  }

  /**
   * Is content on `level` visible from a camera on `camLevel` at (x, z)?
   * Outdoors everything is; indoors only the camera's own level, and the
   * levels a nearby stairwell joins it to.
   */
  visibleFrom(level: string, camLevel: string, x: number, z: number, indoors: boolean): boolean {
    if (!this.multi || !indoors || level === camLevel) return true;
    return this.nearFlight(x, z, level) && this.nearFlight(x, z, camLevel);
  }
}
