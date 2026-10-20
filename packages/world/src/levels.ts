/**
 * Levels (storeys), connectors and access zones of a facility with their
 * defaults applied (core schema `levels`, `connectors`, `access`; EMBODIED
 * R10). A facility without `levels` has one implicit level `L0` at
 * elevation 0; entities without `level` stand on the default level.
 */
import { buildingLevels, defaultLevelId, entityLevel, facilityLevels, roomLevel, type FacilityDefinition } from "@clinicalcraft/core";
import type { AccessZone, ConnectorInfo, EntityId, LevelInfo, RampSurface } from "./contracts.js";

export { buildingLevels, defaultLevelId, entityLevel, roomLevel };

/** Default seconds between adjacent stops of a connector without `travelSeconds`. */
export const CONNECTOR_TRAVEL_SECONDS = { stairs: 15, ramp: 10, elevator: 20 } as const;

/** The facility's levels (contract form; the implicit `L0` when none are declared). */
export function levelInfos(f: Pick<FacilityDefinition, "levels">): LevelInfo[] {
  return facilityLevels(f).map((l) => ({ id: l.id, name: l.name, elevation: l.elevation, height: l.height }));
}

/** Floor elevation of a level (0 for unknown ids). */
export function levelElevation(f: Pick<FacilityDefinition, "levels">, level: string): number {
  return facilityLevels(f).find((l) => l.id === level)?.elevation ?? 0;
}

/**
 * Connectors with defaults applied: `connector:<id>` ids, `travelSeconds`
 * by kind (`CONNECTOR_TRAVEL_SECONDS`), `accessible` (elevators and ramps
 * yes, stairs no) and `roles` ([] = everyone).
 */
export function connectorInfos(f: Pick<FacilityDefinition, "connectors">): ConnectorInfo[] {
  return (f.connectors ?? []).map((c) => ({
    id: `connector:${c.id}`,
    kind: c.kind,
    name: c.name,
    stops: c.stops.map((s) => ({ level: s.level, x: s.x, z: s.z })),
    travelSeconds: c.travelSeconds ?? CONNECTOR_TRAVEL_SECONDS[c.kind],
    accessible: c.accessible ?? c.kind !== "stairs",
    roles: [...(c.roles ?? [])],
  }));
}

/** Access zones with their level resolved (default level when omitted). */
export function accessZones(f: Pick<FacilityDefinition, "access" | "levels">): AccessZone[] {
  const fallback = defaultLevelId(f);
  return (f.access ?? []).map((z) => ({ id: z.id, name: z.name, level: z.level ?? fallback, rect: { ...z.rect }, roles: [...z.roles] }));
}

/** Levels on which a building stands, with elevations (ordered as declared). */
export function buildingLevelInfos(f: Pick<FacilityDefinition, "levels">, building: { levels?: string[] }): LevelInfo[] {
  const all = levelInfos(f);
  return buildingLevels(f, building).flatMap((id) => all.filter((l) => l.id === id));
}

/* ------------------------------------------------------------------ */
/* Flights (stairs / ramps) and floor slabs of upper levels            */
/* ------------------------------------------------------------------ */

/** Thickness (m) of an upper level's floor slab (its top is the level's elevation). */
export const SLAB_THICKNESS = 0.2;
/** Default width (m) of a stairs or ramp flight (connector `width`). */
export const FLIGHT_WIDTH = 2;
/** Height (m) of the balustrade along a flight and around its stairwell. */
export const RAIL_HEIGHT = 1.0;
/** Thickness (m) of a balustrade. */
export const RAIL_THICKNESS = 0.08;

/** An axis-aligned area on the ground plane. */
export interface FlightArea {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * One straight flight of a stairs or ramp connector, between two
 * consecutive stops on different levels: the foot (lower stop) and the head
 * (upper stop). Its footprint is the run between them × `width`; the
 * walkable surface rises from the foot's elevation to the head's.
 */
export interface Flight {
  /** `connector:<id>`. */
  connector: EntityId;
  /** The connector id as authored (collider ids `ramp:<id>:<index>`). */
  connectorId: string;
  kind: "stairs" | "ramp";
  /** Index of the stop pair (stops[index] → stops[index + 1]). */
  index: number;
  foot: { level: string; x: number; z: number; elevation: number };
  head: { level: string; x: number; z: number; elevation: number };
  width: number;
  area: FlightArea;
  surface: RampSurface;
}

/**
 * Every buildable flight of the facility's stairs and ramps: consecutive
 * stops on levels at different elevations, at least 5 cm apart and
 * axis-aligned (others are navigation-only portals; `checkFacility` warns
 * about skewed ones).
 */
export function connectorFlights(f: Pick<FacilityDefinition, "connectors" | "levels">): Flight[] {
  const out: Flight[] = [];
  for (const c of f.connectors ?? []) {
    if (c.kind === "elevator") continue;
    for (let k = 1; k < c.stops.length; k++) {
      const a = c.stops[k - 1], b = c.stops[k];
      const ea = levelElevation(f, a.level), eb = levelElevation(f, b.level);
      if (ea === eb) continue;
      const dx = Math.abs(a.x - b.x), dz = Math.abs(a.z - b.z);
      if (Math.hypot(dx, dz) <= 0.05 || (dx > 0.05 && dz > 0.05)) continue;
      const [foot, head] = ea < eb ? [{ ...a, elevation: ea }, { ...b, elevation: eb }] : [{ ...b, elevation: eb }, { ...a, elevation: ea }];
      const axis: "x" | "z" = dx >= dz ? "x" : "z";
      const width = c.width ?? FLIGHT_WIDTH;
      const across = axis === "x" ? (foot.z + head.z) / 2 : (foot.x + head.x) / 2;
      const area: FlightArea =
        axis === "x"
          ? { minX: Math.min(foot.x, head.x), maxX: Math.max(foot.x, head.x), minZ: across - width / 2, maxZ: across + width / 2 }
          : { minX: across - width / 2, maxX: across + width / 2, minZ: Math.min(foot.z, head.z), maxZ: Math.max(foot.z, head.z) };
      out.push({
        connector: `connector:${c.id}`,
        connectorId: c.id,
        kind: c.kind,
        index: k - 1,
        foot: { level: foot.level, x: foot.x, z: foot.z, elevation: foot.elevation },
        head: { level: head.level, x: head.x, z: head.z, elevation: head.elevation },
        width,
        area,
        surface: { axis, from: axis === "x" ? foot.x : foot.z, to: axis === "x" ? head.x : head.z, y0: foot.elevation, y1: head.elevation },
      });
    }
  }
  return out;
}

/** The floor slab of one building on one upper level: rects covering the building minus its stairwells. */
export interface LevelSlab {
  level: string;
  building: string;
  /** Top of the slab (the level's elevation). */
  elevation: number;
  /** Building rect minus the holes, as disjoint rectangles (deterministic order). */
  rects: FlightArea[];
  /** Stairwell holes cut into it (flights arriving on this level). */
  holes: FlightArea[];
}

/**
 * Floor slabs of the levels above the default level: one per building and
 * upper level it spans, covering the building rect (wall centre lines)
 * minus the stairwells of the flights whose head is on that level.
 */
export function levelSlabs(f: Pick<FacilityDefinition, "buildings" | "connectors" | "levels">): LevelSlab[] {
  const groundElevation = levelElevation(f, defaultLevelId(f));
  const flights = connectorFlights(f);
  const out: LevelSlab[] = [];
  for (const b of f.buildings ?? []) {
    const r = b.rect;
    const rect: FlightArea = { minX: r.x - r.w / 2, maxX: r.x + r.w / 2, minZ: r.z - r.d / 2, maxZ: r.z + r.d / 2 };
    for (const level of buildingLevelInfos(f, b)) {
      if (level.elevation <= groundElevation) continue;
      const holes = flights
        .filter((fl) => fl.head.level === level.id)
        .map((fl) => ({ minX: Math.max(rect.minX, fl.area.minX), maxX: Math.min(rect.maxX, fl.area.maxX), minZ: Math.max(rect.minZ, fl.area.minZ), maxZ: Math.min(rect.maxZ, fl.area.maxZ) }))
        .filter((h) => h.maxX - h.minX > 1e-6 && h.maxZ - h.minZ > 1e-6);
      out.push({ level: level.id, building: b.id, elevation: level.elevation, rects: subtractAreas(rect, holes), holes });
    }
  }
  return out;
}

/** `rect` minus `holes` as disjoint rectangles: grid cells on every edge, merged into rows, then equal rows stacked. */
export function subtractAreas(rect: FlightArea, holes: readonly FlightArea[]): FlightArea[] {
  if (!holes.length) return [{ ...rect }];
  const cuts = (lo: number, hi: number, edges: number[]) => [...new Set([lo, hi, ...edges.filter((e) => e > lo + 1e-9 && e < hi - 1e-9)])].sort((a, b) => a - b);
  const xs = cuts(rect.minX, rect.maxX, holes.flatMap((h) => [h.minX, h.maxX]));
  const zs = cuts(rect.minZ, rect.maxZ, holes.flatMap((h) => [h.minZ, h.maxZ]));
  const solid = (i: number, j: number) => {
    const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
    return !holes.some((h) => cx > h.minX && cx < h.maxX && cz > h.minZ && cz < h.maxZ);
  };
  // runs of solid cells per row
  const rows: { j: number; runs: [number, number][] }[] = [];
  for (let j = 0; j < zs.length - 1; j++) {
    const runs: [number, number][] = [];
    let start = -1;
    for (let i = 0; i <= xs.length - 1; i++) {
      const s = i < xs.length - 1 && solid(i, j);
      if (s && start < 0) start = i;
      if (!s && start >= 0) {
        runs.push([start, i]);
        start = -1;
      }
    }
    rows.push({ j, runs });
  }
  // stack identical runs of consecutive rows
  const out: FlightArea[] = [];
  const open = new Map<string, FlightArea>();
  for (const { j, runs } of rows) {
    const keys = new Set(runs.map(([a, b]) => `${a}:${b}`));
    for (const [key, area] of [...open]) {
      if (!keys.has(key)) {
        out.push(area);
        open.delete(key);
      }
    }
    for (const [a, b] of runs) {
      const key = `${a}:${b}`;
      const cur = open.get(key);
      if (cur) cur.maxZ = zs[j + 1];
      else open.set(key, { minX: xs[a], maxX: xs[b], minZ: zs[j], maxZ: zs[j + 1] });
    }
  }
  out.push(...open.values());
  return out.sort((p, q) => p.minZ - q.minZ || p.minX - q.minX);
}
