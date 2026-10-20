/**
 * Portable equipment in a voxel world (carts, handheld items — EMBODIED §5/§8; portable.ts draws them): parked
 * where the world model says it stands (`WorldApi.placeEquipment`; hidden while carried), and drawn in front
 * of its walker — the avatar or a staff member — while pushed (`pushEquipment`), with no collider meanwhile.
 */
import type { EquipmentSpot } from "../contracts.js";
import { yawOfRig } from "./embodiment.js";
import { detachShared } from "./equipment.js";
import { dragPortable, placePortable, pushPortable, type PortableHost } from "./portable.js";
import type { VoxelWorld } from "./voxel-world.js";

/** The portable placements of one world. */
export class Carts {
  /** What portable.ts needs of the world (moving portable placements to where the world model has them). */
  readonly host: PortableHost;

  constructor(private readonly world: VoxelWorld) {
    const { ctx, levelRoots, levels, colliderLevels, stage } = world;
    const root = stage.root;
    this.host = {
      ctx,
      levelRoot: (lv) => levelRoots.get(lv) ?? root,
      elevation: (lv) => levels.elevation(lv),
      addCollider: (box, lv) => {
        const b = ctx.colliders.add(box);
        colliderLevels.set(b, lv);
        return b;
      },
      removeCollider: (box) => ctx.colliders.remove(box),
      markShadows: stage.markShadows,
      detachShared: (id, parent) => detachShared(ctx, id, parent),
    };
  }

  /** `WorldApi.placeEquipment`: where the world model parks it, back home, or hidden while carried. */
  place(placementId: string, at: EquipmentSpot | "home" | null): void {
    const world = this.world;
    const rec = world.ctx.portables.get(placementId.replace(/^eq:/, ""));
    if (!rec) return;
    placePortable(this.host, rec, at);
    world.map.invalidate(); // map dots of moved carts
    world.culling.invalidate();
  }

  /** `WorldApi.pushEquipment`: drawn in front of a walker while pushed (`by`), or not any more (`null`). */
  push(placementId: string, by: string | null): void {
    const world = this.world;
    const rec = world.ctx.portables.get(placementId.replace(/^eq:/, ""));
    if (!rec) return;
    pushPortable(this.host, rec, by);
    if (by) this.drag();
    world.stage.markShadows();
  }

  /** Draw the carts being pushed in front of their walkers (each frame while any is pushed). */
  drag(): void {
    const world = this.world;
    const { ctx, player, levels, level } = world;
    for (const rec of ctx.portables.values()) {
      if (!rec.pushedBy) continue;
      if (rec.pushedBy === "avatar") dragPortable(this.host, rec, player.x, player.z, world.yaw, levels.multi ? world.currentLevel() : level);
      else {
        const n = ctx.npcs.get(`staff:${rec.pushedBy}`);
        if (n) dragPortable(this.host, rec, n.x, n.z, yawOfRig(n.rig.root.rotation.y), n.level);
      }
    }
  }
}
