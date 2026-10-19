/**
 * Grid A* for autopilot `walkTo` — moved to @clinicalcraft/world (pure;
 * the embodied navigation backend builds on it). This shim keeps the web
 * world's imports working.
 */
export { buildNavGrid, cellOf, cellCentre, isFree, nearestFree, findPathCells, lineOfSight, smoothPath, findPath } from "@clinicalcraft/world";
export type { NavGrid, NavOptions } from "@clinicalcraft/world";
