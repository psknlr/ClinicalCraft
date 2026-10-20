/**
 * Interior detail culling of a voxel world. Signs, live screens, interior door leaves and NPCs inside a
 * building are only drawn while the camera is inside that building or within DETAIL_RANGE of them: from
 * outside, walls and the roof hide them anyway (frustum culling cannot know that), and they were most of the
 * draw calls of outdoor views of a large hospital. Levels (multi-level facilities): indoors, only the camera's
 * level is drawn (and the levels a nearby stairwell joins it to); outdoors every level is (the building's upper
 * storeys are its facade). The default level's static batch is never hidden, its details and NPCs are.
 */
import type { Object3D } from "three";
import type { VoxelWorld } from "./voxel-world.js";

const DETAIL_RANGE = 25;

interface Detail {
  obj: Object3D;
  x: number;
  z: number;
  building: number;
  level: string;
}

/** The detail culling of one world. */
export class DetailCulling {
  private readonly buildingRects: { x: number; z: number; w: number; d: number }[];
  private readonly details: Detail[] = [];
  /** Camera position of the last interior-culling pass (null = re-evaluate). */
  private detailAt: { x: number; z: number; level: string } | null = null;

  constructor(private readonly world: VoxelWorld) {
    this.buildingRects = world.facility.buildings.map((bb) => bb.rect);
  }

  /** Index of the building containing (x, z), or -1 outdoors. */
  buildingAt(x: number, z: number): number {
    return this.buildingRects.findIndex((r) => Math.abs(x - r.x) <= r.w / 2 && Math.abs(z - r.z) <= r.d / 2);
  }

  /** Re-evaluate on the next pass (an NPC rig was rebuilt, a staff member or a cart moved). */
  invalidate(): void {
    this.detailAt = null;
  }

  /** Register the culled details of the built scene: signs, live screens, interior door leaves. */
  collect(): void {
    const { levelRoots, ctx } = this.world;
    const addDetail = (obj: Object3D, x: number, z: number, lv: string) => {
      const bi = this.buildingAt(x, z);
      if (bi >= 0) this.details.push({ obj, x, z, building: bi, level: lv });
    };
    for (const [lv, g] of levelRoots) for (const o of g.children) if (o.name === "sign") addDetail(o, o.position.x, o.position.z, lv);
    for (const sc of ctx.screens) addDetail(sc.mesh, sc.x, sc.z, sc.level);
    for (const d of ctx.doors) if (d.interior) for (const l of d.leaves) addDetail(l.pivot, d.centre.x, d.centre.z, d.level);
  }

  /** Show or hide levels, details, NPCs and portable placements for the camera (`force`: even when it barely moved). */
  cull(force = false): void {
    const { ctx, levels, levelRoots, stage, player, walkers } = this.world;
    const { camera, root } = stage;
    const details = this.details;
    if (!details.length && !ctx.npcs.size && !levels.multi) return;
    const cx = camera.position.x, cz = camera.position.z;
    const camLevel = levels.at(player.y);
    if (!force && this.detailAt && this.detailAt.level === camLevel && Math.hypot(cx - this.detailAt.x, cz - this.detailAt.z) < 0.75) return;
    this.detailAt = { x: cx, z: cz, level: camLevel };
    const inside = this.buildingAt(cx, cz);
    const levelShown = (lv: string) => levels.visibleFrom(lv, camLevel, cx, cz, inside >= 0);
    const show = (bi: number, x: number, z: number, lv: string) => levelShown(lv) && (bi < 0 || bi === inside || Math.hypot(x - cx, z - cz) < DETAIL_RANGE);
    let changed = false;
    const set = (o: Object3D, v: boolean) => {
      if (o.visible === v) return;
      o.visible = v;
      changed = true;
    };
    for (const [lv, g] of levelRoots) if (g !== root) set(g, levelShown(lv));
    for (const d of details) set(d.obj, show(d.building, d.x, d.z, d.level));
    for (const n of ctx.npcs.values()) set(n.rig.root, !walkers.riding(n.id) && show(this.buildingAt(n.x, n.z), n.x, n.z, n.level));
    // portable placements are drawn where they stand now (and not while carried)
    for (const pr of ctx.portables.values()) set(pr.group, !pr.hidden && show(this.buildingAt(pr.x, pr.z), pr.x, pr.z, pr.level));
    // hidden casters were left out of the cached shadow map
    if (changed) stage.markShadows();
  }

  /** Culling of the NPCs walking now (they move without the camera moving). */
  cullWalkers(): void {
    const { levels, stage, player, walkers } = this.world;
    const camera = stage.camera;
    const cx = camera.position.x, cz = camera.position.z;
    const camLevel = levels.at(player.y);
    const inside = this.buildingAt(cx, cz);
    for (const n of walkers.walking()) {
      const bi = this.buildingAt(n.x, n.z);
      const shown = !walkers.riding(n.id) && levels.visibleFrom(n.level, camLevel, cx, cz, inside >= 0) && (bi < 0 || bi === inside || Math.hypot(n.x - cx, n.z - cz) < DETAIL_RANGE);
      if (n.rig.root.visible !== shown) n.rig.root.visible = shown;
    }
  }
}
