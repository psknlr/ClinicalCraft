/**
 * Region naming. `placeAt` — where the player is, by name, for the HUD — is THE region lookup of the world
 * (`regionLookup` of @clinicalcraft/world, the one `WorldRuntime.regionName` uses): the smallest room containing
 * the point on the level; in no room but in a building, that building's corridor; outdoors, the facility's outdoor
 * region. The place beside the map and the in-world badge both show it (one lookup of one position, audit
 * 2026-11-12 P2-15). `roomAt` is the room a placement is built in (V4 `O()` generalised: smallest room containing
 * the point; in a multi-level facility pass the level — only its rooms count).
 */
import { defaultLevelId, roomLevel, type FacilityDefinition } from "@clinicalcraft/core";
import { regionLookup, type NamedRegion } from "@clinicalcraft/world";
import { rectContains } from "./geometry.js";

type RoomDef = FacilityDefinition["rooms"][number];
type RegionSource = Pick<FacilityDefinition, "rooms" | "levels" | "buildings" | "outdoorRegion">;

export function roomAt(f: Pick<FacilityDefinition, "rooms" | "levels">, x: number, z: number, level?: string): RoomDef | null {
  let best: RoomDef | null = null;
  let area = Infinity;
  for (const r of f.rooms ?? []) {
    if (!rectContains(r.rect, x, z)) continue;
    if (level !== undefined && roomLevel(f, r) !== level) continue;
    const a = r.rect.w * r.rect.d;
    if (a < area) {
      area = a;
      best = r;
    }
  }
  return best;
}

/** The world's region lookup of each facility (built once). */
const lookups = new WeakMap<object, (at: { level: string; x: number; z: number }, locale: string) => NamedRegion>();

/**
 * Where (x, z) is on `level` (default: the facility's default level), by name — THE region lookup of the world (see
 * the module docs): `{ name, roomId }`, `roomId` null outside a room.
 */
export function placeAt(f: RegionSource, x: number, z: number, locale: string, level?: string): { name: string; roomId: string | null } {
  let lookup = lookups.get(f);
  if (!lookup) lookups.set(f, (lookup = regionLookup(f)));
  const r = lookup({ level: level ?? defaultLevelId(f), x, z }, locale);
  return { name: r.name, roomId: r.room };
}
