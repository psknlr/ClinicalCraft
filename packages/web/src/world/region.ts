/**
 * Region naming (V4 `O()` generalised): smallest room containing the point,
 * else the building, else the build zone, else the facility's outdoor region.
 * In a multi-level facility pass the level: only its rooms and the buildings
 * spanning it count (the build zone and the outdoors are on the ground).
 */
import { buildingLevels, roomLevel, type FacilityDefinition } from "@clinicalcraft/core";
import { rectContains } from "./geometry.js";
import { strings, tx } from "./strings.js";

type RoomDef = FacilityDefinition["rooms"][number];

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

export function regionAt(
  f: Pick<FacilityDefinition, "rooms" | "buildings" | "buildZone" | "outdoorRegion" | "levels">,
  x: number,
  z: number,
  locale: string,
  level?: string,
): { name: string; roomId: string | null } {
  const room = roomAt(f, x, z, level);
  if (room) return { name: tx(room.name, locale), roomId: room.id };
  const b = (f.buildings ?? []).find((bb) => rectContains(bb.rect, x, z) && (level === undefined || buildingLevels(f, bb).includes(level)));
  if (b) return { name: tx(b.name, locale), roomId: null };
  if (f.buildZone && rectContains(f.buildZone.rect, x, z)) return { name: strings(locale).buildZone, roomId: null };
  return { name: tx(f.outdoorRegion ?? { "zh-CN": "疗愈花园", en: "Healing Garden" }, locale), roomId: null };
}
