/**
 * Levels (storeys), connectors and access zones of a facility with their
 * defaults applied (core schema `levels`, `connectors`, `access`; EMBODIED
 * R10). A facility without `levels` has one implicit level `L0` at
 * elevation 0; entities without `level` stand on the default level.
 */
import { buildingLevels, defaultLevelId, entityLevel, facilityLevels, roomLevel, type FacilityDefinition } from "@clinicalcraft/core";
import type { AccessZone, ConnectorInfo, LevelInfo } from "./contracts.js";

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
