/**
 * Build-zone rules — moved to @clinicalcraft/world (pure; the collision
 * model validates seed blocks with them). This shim keeps the web world's
 * imports working.
 */
export { cellKey, zoneCells, buildRules, canPlace, checkerMaterial, validBlocks, DEFAULT_BUILD_MATERIALS } from "@clinicalcraft/world";
export type { Cell, BuildZoneLike, BuildRules } from "@clinicalcraft/world";
