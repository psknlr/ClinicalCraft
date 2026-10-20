/**
 * Aiming and interaction in a voxel world (V4 `Ne`): a ray from the centre of the view finds what the player
 * aims at — an interactive target within reach (outlined; the UI is told when it changes), else a build-zone
 * block — with an analytic ground plane, and in a multi-level facility only what is drawn (hidden levels and
 * culled rigs never take the ray). `E` opens or closes the aimed door (never on the player; a locked one is the
 * world model's to unlock), calls or works an elevator, or hands the target to the app; with nothing aimed at,
 * the hotbar's first slots are shortcuts.
 */
import { Box3, Group, Raycaster, Vector2, Vector3, type InstancedMesh, type Intersection, type Object3D } from "three";
import type { BlockInfo, InteractionTarget } from "../contracts.js";
import type { Cell } from "./buildzone.js";
import type { VoxelWorld } from "./voxel-world.js";

/** How far the aim ray reaches (m). */
export const AIM_FAR = 5.5;
/** Interactive targets are aimed at within this distance (m). */
const TARGET_RANGE = 3.5;
/** Build-zone blocks are mined / placed within this distance (m). */
export const BUILD_RANGE = 5.3;

/** Identity of an aim target (re-announced to the UI only when it changes). */
function targetId(t: InteractionTarget): string {
  switch (t.kind) {
    case "equipment":
      return t.placementId;
    case "patient":
      return t.slotId;
    case "staff":
      return t.staffId;
    case "elevator":
      return `${t.connectorId}@${t.level}:${t.inside ? "car" : "call"}`;
    default:
      return t.id;
  }
}

/** The aim of one world and what `E` does with it. */
export class Interaction {
  /** The interactive target aimed at (within reach), or null. */
  aimTarget: InteractionTarget | null = null;
  /** The aim ray's nearest hit (the build zone mines / places at it), or null. */
  aimHit: Intersection | null = null;
  /** The build-zone block aimed at, or null. */
  aimBlock: BlockInfo | null = null;
  private lastTargetKey = "";
  private readonly raycaster = new Raycaster();
  private readonly centre = new Vector2(0, 0);
  private readonly groundProxy = new Group();

  constructor(private readonly world: VoxelWorld) {
    this.groundProxy.name = "ground";
  }

  /** `E`: work the aimed target, else a hotbar shortcut. */
  interact(): void {
    const world = this.world;
    const { ctx, callbacks, S } = world;
    if (!world.started || world.paused) return;
    const t = this.aimTarget;
    if (t) {
      if (t.kind === "door") {
        const door = ctx.doors.find((d) => d.id === t.id);
        if (!door) return;
        if (door.open && world.doors.playerInDoorway(door)) {
          world.toast(S.leaveDoor);
          return;
        }
        if (!door.open && door.locked) {
          // locked by the world model (embodiment): the app asks the world to unlock it (keys), else it stays shut
          if (!callbacks.onLockedDoor?.(door.id)) world.toast(S.doorLocked);
          return;
        }
        world.doors.toggle(door); // both leaves of a double door share one record (V4 toggles them together)
        callbacks.onDoor?.(door.id, door.open);
        return;
      }
      if (t.kind === "elevator") {
        world.rides.panel(t);
        return;
      }
      callbacks.onInteract(t);
      return;
    }
    if (world.slot === 0) world.toast(S.approach);
    else if (world.slot === 1) callbacks.onShortcut("journal");
    else if (world.slot === 2) callbacks.onShortcut("map");
  }

  private resolveAction(hit: Intersection): { target: InteractionTarget; box: Box3 } | null {
    const { ctx } = this.world;
    let o: Object3D | null = hit.object;
    const inst = hit.object as InstancedMesh;
    if (inst.isInstancedMesh && hit.instanceId != null && inst.userData.owners) {
      const owner = (inst.userData.owners as (string | undefined)[])[hit.instanceId];
      const rec = owner ? ctx.targets.get(owner) : undefined;
      return rec ? { target: rec.target, box: rec.box } : null;
    }
    if (hit.object.userData.owner) {
      const rec = ctx.targets.get(hit.object.userData.owner as string);
      return rec ? { target: rec.target, box: rec.box } : null;
    }
    const quads = hit.object.userData.quadOwners as string[] | undefined;
    if (quads && hit.faceIndex != null) {
      const rec = ctx.targets.get(quads[Math.floor(hit.faceIndex / 2)] ?? "");
      return rec ? { target: rec.target, box: rec.box } : null;
    }
    while (o && !o.userData.action) o = o.parent;
    if (!o) return null;
    const box = new Box3().setFromObject((o.userData.highlight as Object3D | undefined) ?? o);
    if (o.userData.action.kind === "door") {
      // highlight the whole doorway (both leaves)
      const door = ctx.doors.find((d) => d.id === o!.userData.action.id);
      if (door) for (const obj of door.objects) box.union(new Box3().setFromObject(obj));
    }
    return { target: o.userData.action as InteractionTarget, box };
  }

  /** Pickables the aim ray may hit: in a multi-level facility, not those of a hidden level (or culled rig). */
  private aimables(): Object3D[] {
    const { ctx, levels } = this.world;
    if (!levels.multi) return ctx.pickables;
    return ctx.pickables.filter((o) => {
      for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
      return true;
    });
  }

  /** Cast the aim ray from the camera: target, block, highlight; tells the app when the target changes. */
  update(): void {
    const world = this.world;
    const { stage, callbacks, overlay } = world;
    const { camera } = stage;
    const { raycaster, centre, groundProxy } = this;
    const highlight = overlay.highlight;
    camera.updateMatrixWorld();
    raycaster.setFromCamera(centre, camera);
    raycaster.far = AIM_FAR;
    const hits = raycaster.intersectObjects(this.aimables(), true);
    let hit: Intersection | null = hits.find((h) => h.object.visible !== false) ?? null;
    // analytic ground plane (y = 0) — the ground grid is not ray-tested
    const ray = raycaster.ray;
    if (ray.direction.y < -1e-4) {
      const tGround = (0 - ray.origin.y) / ray.direction.y;
      if (tGround > 0 && tGround <= AIM_FAR && (!hit || tGround < hit.distance)) {
        const point = ray.origin.clone().addScaledVector(ray.direction, tGround);
        hit = { distance: tGround, point, object: groundProxy, face: { a: 0, b: 0, c: 0, normal: new Vector3(0, 1, 0), materialIndex: 0 } } as Intersection;
      }
    }
    this.aimHit = hit;
    this.aimTarget = null;
    this.aimBlock = null;
    highlight.visible = false;
    if (hit) {
      const act = hit.object === groundProxy ? null : this.resolveAction(hit);
      if (act && hit.distance < TARGET_RANGE) {
        this.aimTarget = act.target;
        highlight.visible = true;
        const size = new Vector3();
        act.box.getCenter(highlight.position);
        act.box.getSize(size);
        highlight.scale.copy(size).multiplyScalar(1.025);
      } else if (hit.object.userData.block && hit.distance < BUILD_RANGE && world.slot >= 3) {
        const blk = hit.object.userData.block as { cell: Cell; type: string };
        this.aimBlock = { cell: [...blk.cell] as [number, number, number], type: blk.type };
        highlight.visible = true;
        highlight.position.copy(hit.object.position);
        highlight.scale.setScalar(1);
      } else if (hit.object.userData.block) {
        const blk = hit.object.userData.block as { cell: Cell; type: string };
        this.aimBlock = { cell: [...blk.cell] as [number, number, number], type: blk.type };
      }
    }
    const aimTarget = this.aimTarget;
    const aimBlock = this.aimBlock;
    const key = aimTarget ? `${aimTarget.kind}:${targetId(aimTarget)}:${aimTarget.hint}` : aimBlock ? `b:${aimBlock.cell.join(",")}` : "";
    if (key !== this.lastTargetKey) {
      this.lastTargetKey = key;
      callbacks.onTarget(aimTarget, aimBlock);
    }
  }
}
