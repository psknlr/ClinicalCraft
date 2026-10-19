/**
 * Wall layout of a facility — the single list of walls both the three.js
 * renderer (visual pieces, windows, door leaves) and the collision model
 * (colliders) are built from (EMBODIED R2).
 *
 * Building walls: four per building per level it spans (V4 corner mode:
 * north/south walls run past the corners). Room partitions: the listed sides
 * of each room, deduplicated per wall line and level (a stretch already
 * built by an earlier room is not built twice), so one partition side may
 * become several sub-walls.
 *
 * Ids: `door:<ownerKey>:<side>:<n>` and `window:<ownerKey>:<side>:<n>`
 * number the openings of one owner side in build order; `<ownerKey>` is the
 * room id, or the building id suffixed `@<level>` off the default level (a
 * building may span several levels). A door id minus its `door:` prefix is
 * the renderer's door record id (V4 `clinic:s:0`).
 */
import type { FacilityDefinition, LocalizedText } from "@clinicalcraft/core";
import { resolveOpenings, wallLine, type OpeningSpec, type ResolvedOpening, type Side, type WallLine } from "./geometry.js";
import { buildingLevels, defaultLevelId, levelElevation, roomLevel } from "./levels.js";

export interface WallMaterials {
  base: string;
  body: string;
  top: string;
}

/** One wall (or partition sub-wall) with its openings resolved against it. */
export interface WallSpec {
  /** Unique key: `wall:<ownerKey>:<side>` (buildings) or `partition:<ownerKey>:<side>:<n>` (room partitions). */
  key: string;
  /** Building or room id. */
  owner: string;
  /** `owner`; for a building off the default level `owner@level`. */
  ownerKey: string;
  ownerName: LocalizedText;
  partition: boolean;
  level: string;
  /** Floor elevation of `level` (m). */
  elevation: number;
  side: Side;
  wall: WallLine;
  height: number;
  thickness: number;
  materials: WallMaterials;
  /** Openings clamped to this wall (`resolveOpenings`), sorted along it. */
  openings: ResolvedOpening[];
  /** Entity id per opening: `door:…` for doors, `window:…` for windows, null for plain openings. */
  openingIds: (string | null)[];
}

const SIDES: Side[] = ["n", "s", "e", "w"];

const isDoorKind = (kind: string) => kind === "door" || kind === "double-door" || kind === "sliding-door";

/** Every wall of the facility, in the renderer's build order (buildings, then room partitions). */
export function facilityWalls(f: FacilityDefinition): WallSpec[] {
  const out: WallSpec[] = [];
  const ground = defaultLevelId(f);
  const counters = new Map<string, number>();
  const next = (key: string) => {
    const n = counters.get(key) ?? 0;
    counters.set(key, n + 1);
    return n;
  };
  const ownerKeyOf = (owner: string, level: string) => (level === ground ? owner : `${owner}@${level}`);
  const push = (spec: Omit<WallSpec, "openings" | "openingIds">, openings: Partial<OpeningSpec>[]) => {
    const resolved = resolveOpenings(spec.wall, spec.height, openings);
    const openingIds = resolved.map((o) =>
      o.kind === "window"
        ? `window:${spec.ownerKey}:${spec.side}:${next(`window:${spec.ownerKey}:${spec.side}`)}`
        : isDoorKind(o.kind)
          ? `door:${spec.ownerKey}:${spec.side}:${next(`door:${spec.ownerKey}:${spec.side}`)}`
          : null,
    );
    out.push({ ...spec, openings: resolved, openingIds });
  };

  for (const b of f.buildings) {
    const ws = Object.assign({ height: 5, base: "teal", body: "cream", top: "wood", thickness: 1 }, b.walls ?? {});
    for (const level of buildingLevels(f, b)) {
      const ownerKey = ownerKeyOf(b.id, level);
      const elevation = levelElevation(f, level);
      for (const side of SIDES) {
        const wall = wallLine(b.rect, side, ws.thickness, "building");
        const openings = (b.openings ?? []).filter((o) => o.side === side);
        push(
          {
            key: `wall:${ownerKey}:${side}`,
            owner: b.id,
            ownerKey,
            ownerName: b.name,
            partition: false,
            level,
            elevation,
            side,
            wall,
            height: ws.height,
            thickness: ws.thickness,
            materials: { base: ws.base, body: ws.body, top: ws.top },
          },
          openings,
        );
      }
    }
  }

  // partitions, deduplicated per wall line (and level): build only the stretches not already built
  const built = new Map<string, [number, number][]>();
  for (const r of f.rooms) {
    const level = roomLevel(f, r);
    const ownerKey = r.id; // a room is on one level: its id is unique
    const elevation = levelElevation(f, level);
    for (const p of r.partitions ?? []) {
      const thickness = p.thickness ?? 0.35;
      const height = p.height ?? 4;
      const wl = wallLine(r.rect, p.side, thickness, "exact");
      const lineKey = `${level}|${wl.axis}:${wl.line.toFixed(2)}`;
      const done = built.get(lineKey) ?? [];
      let segs: [number, number][] = [[wl.from, wl.to]];
      for (const [a, b] of done) {
        const nextSegs: [number, number][] = [];
        for (const [s0, s1] of segs) {
          if (b <= s0 || a >= s1) nextSegs.push([s0, s1]);
          else {
            if (a > s0) nextSegs.push([s0, a]);
            if (b < s1) nextSegs.push([b, s1]);
          }
        }
        segs = nextSegs;
      }
      for (const [s0, s1] of segs) {
        if (s1 - s0 < 0.05) continue;
        push(
          {
            key: `partition:${ownerKey}:${p.side}:${next(`partition:${ownerKey}:${p.side}`)}`,
            owner: r.id,
            ownerKey,
            ownerName: r.name,
            partition: true,
            level,
            elevation,
            side: p.side,
            wall: { ...wl, from: s0, to: s1 },
            height,
            thickness,
            materials: { base: p.base ?? "teal", body: p.material ?? "white", top: p.material ?? "white" },
          },
          (p.openings ?? []).map((o) => ({ ...o })),
        );
      }
      done.push([wl.from, wl.to]);
      built.set(lineKey, done);
    }
  }
  return out;
}
