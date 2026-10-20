/**
 * The map of a voxel world and where things are on it: the static layers of each floor plan (terrain, buildings,
 * rooms, walls with their openings, placements, and in a multi-level facility the stairs and elevators), cached
 * per locale and level since the minimap may be drawn every frame, with the actors where they are now; the
 * minimap / big map drawing (`WorldApi.drawMap`; the avatar or the destination on another floor drawn faded);
 * and `locate`, the position of a placement, slot, staff member, room or building for waypoints.
 */
import { buildingLevels, entityLevel, roomLevel } from "@clinicalcraft/core";
import type { WorldApi, WorldPoint } from "../contracts.js";
import { drawMap as paintMap, type MapConnector, type MapData, type MapWall } from "./map.js";
import { stopOn } from "./rides.js";
import { roleName, strings, tx } from "./strings.js";
import type { WallRecord } from "./structures.js";
import type { VoxelWorld } from "./voxel-world.js";

const toMapWall = (w: WallRecord): MapWall => {
  const seg =
    w.wall.axis === "x"
      ? { x0: w.wall.from, z0: w.wall.line, x1: w.wall.to, z1: w.wall.line }
      : { x0: w.wall.line, z0: w.wall.from, x1: w.wall.line, z1: w.wall.to };
  return {
    ...seg,
    t: w.thickness,
    partition: w.partition,
    gaps: w.openings.filter((o) => o.kind !== "window").map((o) => [o.a, o.b] as [number, number]),
    windows: w.openings.filter((o) => o.kind === "window").map((o) => [o.a, o.b] as [number, number]),
  };
};

/** The map of one world. */
export class MapLayers {
  /** Static map layers per locale and level (drawMap may run every frame for the minimap). */
  private readonly cache = new Map<string, Omit<MapData, "slots">>();

  constructor(private readonly world: VoxelWorld) {}

  /** Forget the cached layers (a cart or a patient moved: their map dots). */
  invalidate(): void {
    this.cache.clear();
  }

  private matColor(id: string, fb: string): string {
    return this.world.merged.materials.get(id)?.color ?? fb;
  }

  /** Stairs/ramp flights and elevator cars on a level (map symbols of a multi-level facility). */
  private connectors(lv: string, loc: string): MapConnector[] {
    const { levels, elevators } = this.world;
    const SL = strings(loc);
    const out: MapConnector[] = [];
    for (const fl of levels.flights) {
      if (fl.foot.level !== lv && fl.head.level !== lv) continue;
      const a = fl.area;
      out.push({ kind: fl.kind === "ramp" ? "ramp" : "stairs", x: (a.minX + a.maxX) / 2, z: (a.minZ + a.maxZ) / 2, w: a.maxX - a.minX, d: a.maxZ - a.minZ, axis: fl.surface.axis, label: SL.stairs });
    }
    for (const el of elevators) {
      const s = stopOn(el, lv);
      if (!s) continue;
      const r = s.room?.rect ?? { x: s.x, z: s.z, w: 2, d: 2 };
      out.push({ kind: "elevator", x: r.x, z: r.z, w: r.w, d: r.d, label: el.name });
    }
    return out;
  }

  /** The map of a level in a locale: the cached static layers, with the staff and patients where they are now. */
  private data(loc: string, lv: string): MapData {
    const { facility, levels, walls, ctx, walkers, people } = this.world;
    const key = `${loc}|${lv}`;
    let data = this.cache.get(key);
    if (!data) {
      const SL = strings(loc);
      data = {
        bounds: facility.bounds,
        ground: facility.terrain?.ground ?? "grass",
        paths: (facility.terrain?.paths ?? []).map((p) => ({ ...p, color: p.material && p.material !== "path" ? this.matColor(p.material, "#ded0a4") : "#ded0a4" })),
        ponds: facility.terrain?.ponds ?? [],
        trees: facility.terrain?.trees ?? [],
        buildZone: facility.buildZone?.rect ?? null,
        buildZoneLabel: SL.buildZone,
        buildings: facility.buildings.filter((bb) => buildingLevels(facility, bb).includes(lv)).map((bb) => ({ ...bb.rect, name: tx(bb.name, loc) })),
        rooms: facility.rooms.filter((r) => roomLevel(facility, r) === lv).map((r) => ({ ...r.rect, name: tx(r.name, loc), kind: r.kind })),
        walls: walls.filter((w) => w.level === lv).map(toMapWall),
        placements: [...ctx.placements.values()].filter((p) => p.level === lv).map((p) => ({ x: p.x, z: p.z, w: p.w, d: p.d, kind: p.kind, solid: p.solid, label: p.label })),
        staff: [],
        northLabel: SL.north,
        ...(levels.multi ? { connectors: this.connectors(lv, loc), levelLabel: levels.name(lv, loc) } : {}),
      };
      this.cache.set(key, data);
    }
    return {
      ...data,
      // actors where they are now (staff walk when delegated; a walking one is highlighted)
      staff: [...ctx.npcs.values()]
        .filter((n) => n.kind === "staff" && n.level === lv)
        .map((n) => ({ x: n.x, z: n.z, label: n.label, ...(walkers.busy(n.id) ? { moving: true } : {}) })),
      slots: facility.patientSlots
        .filter((sl) => entityLevel(facility, sl) === lv)
        .map((sl) => {
          const npc = ctx.npcs.get(`patient:${sl.id}`);
          return { x: npc?.x ?? sl.x, z: npc?.z ?? sl.z, occupied: people.patients.has(sl.id), label: people.patients.get(sl.id)?.name ?? sl.id };
        }),
    };
  }

  /** `WorldApi.drawMap`: the minimap / big map of a floor (default: the avatar's) into a 2D canvas. */
  draw(target: HTMLCanvasElement, o: Parameters<WorldApi["drawMap"]>[1]): void {
    const world = this.world;
    const { levels, level, locale, player, overlay } = world;
    const waypoint = overlay.waypoint;
    const c2d = target.getContext("2d");
    if (!c2d) return;
    const here = levels.multi ? world.currentLevel() : level;
    const lv = o.level && levels.list.some((l) => l.id === o.level) ? o.level : here;
    const wp = o.waypoint ?? (waypoint ? { x: waypoint.x, z: waypoint.z, level: waypoint.level } : null);
    paintMap(c2d, target.width, target.height, this.data(o.locale || locale, lv), {
      big: o.big,
      waypoint: wp ? { x: wp.x, z: wp.z } : null,
      player: { x: player.x, z: player.z, yaw: world.yaw },
      timeMs: performance.now(),
      // the avatar / destination on another floor than the one shown: drawn faded
      ...(lv !== here ? { playerGhost: true } : {}),
      ...(wp && levels.multi && (wp.level ?? level) !== lv ? { waypointGhost: true } : {}),
    });
  }

  /** `WorldApi.locate`: where a placement, patient slot, staff member, room or building is (for waypoints). */
  locate(id: string): (WorldPoint & { label: string }) | null {
    const { facility, ctx, levels, level, locale, S, spawn, people } = this.world;
    // the level is reported in a multi-level facility only (single-level results are unchanged)
    const at = (x: number, z: number, label: string, lv: string) => (levels.multi ? { x, z, label, level: lv } : { x, z, label });
    const p = ctx.placements.get(id);
    if (p) return at(p.x, p.z, p.label, p.level);
    const sl = facility.patientSlots.find((s) => s.id === id);
    if (sl) {
      const npc = ctx.npcs.get(`patient:${id}`);
      return at(npc?.x ?? sl.x, npc?.z ?? sl.z, people.patients.get(id)?.name ?? S.patient, entityLevel(facility, sl));
    }
    const st = (facility.staff ?? []).find((s) => s.id === id);
    if (st) return at(st.x, st.z, `${roleName(st.role, locale)} · ${tx(st.name, locale)}`, entityLevel(facility, st));
    const room = facility.rooms.find((r) => r.id === id);
    if (room) return at(room.rect.x, room.rect.z, tx(room.name, locale), roomLevel(facility, room));
    const bl = facility.buildings.find((r) => r.id === id);
    if (bl) return at(bl.rect.x, bl.rect.z, tx(bl.name, locale), level);
    if (id === "spawn") return at(spawn.x, spawn.z, "spawn", level);
    return null;
  }
}
