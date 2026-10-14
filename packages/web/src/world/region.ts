/**
 * Region naming (V4 `O()` generalised): smallest room containing the point,
 * else the building, else the build zone, else the facility's outdoor region.
 */
import type { FacilityDefinition } from "@clinicalcraft/core";
import { rectContains } from "./geometry.js";
import { strings, tx } from "./strings.js";

export function roomAt(f: Pick<FacilityDefinition, "rooms">, x: number, z: number): FacilityDefinition["rooms"][number] | null {
  let best: FacilityDefinition["rooms"][number] | null = null;
  let area = Infinity;
  for (const r of f.rooms ?? []) {
    if (!rectContains(r.rect, x, z)) continue;
    const a = r.rect.w * r.rect.d;
    if (a < area) {
      area = a;
      best = r;
    }
  }
  return best;
}

export function regionAt(f: Pick<FacilityDefinition, "rooms" | "buildings" | "buildZone" | "outdoorRegion">, x: number, z: number, locale: string): { name: string; roomId: string | null } {
  const room = roomAt(f, x, z);
  if (room) return { name: tx(room.name, locale), roomId: room.id };
  const b = (f.buildings ?? []).find((bb) => rectContains(bb.rect, x, z));
  if (b) return { name: tx(b.name, locale), roomId: null };
  if (f.buildZone && rectContains(f.buildZone.rect, x, z)) return { name: strings(locale).buildZone, roomId: null };
  return { name: tx(f.outdoorRegion ?? { "zh-CN": "疗愈花园", en: "Healing Garden" }, locale), roomId: null };
}
