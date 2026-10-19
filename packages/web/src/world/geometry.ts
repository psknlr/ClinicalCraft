/**
 * Pure facility geometry — moved to @clinicalcraft/world (shared with the
 * headless world model). This shim keeps the web world's imports working.
 */
export {
  DEG,
  normDeg,
  rotateXZ,
  rotatedFootprint,
  placementBox,
  partBox,
  unionBox,
  rectContains,
  rectBounds,
  wallLine,
  wallPoint,
  resolveOpenings,
  splitInterval,
  segmentWall,
  inOpening,
  textUnits,
  signWidth,
  greedyRects,
  mergeWallPieces,
  sideRotation,
} from "@clinicalcraft/world";
export type { Side, Rect, Box3D, WallLine, OpeningKind, OpeningSpec, ResolvedOpening, WallPiece, GridRect } from "@clinicalcraft/world";
