/**
 * V4 player physics — moved to @clinicalcraft/world (pure; shared with the
 * headless world model). This shim keeps the web world's imports working;
 * `Aabb` here is the world package's `PhysicsCollider`.
 */
export { PHYSICS, boxCollider, overlapsXZ, collides, moveVector, stepPlayer, targetFov, clampPitch, ColliderGrid } from "@clinicalcraft/world";
export type { PhysicsCollider as Aabb, PlayerState, MoveInput, Bounds } from "@clinicalcraft/world";
