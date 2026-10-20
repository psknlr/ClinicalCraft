/**
 * The build zone of a voxel world (V4): the blocks placed in it (seeded, or restored from a save), each with the
 * collision model's block box; mining (a burst of particles) and placing at the aimed face, within reach and
 * the zone's rules and capacity, with the app's materials check; and the hotbar's block slots — the block held
 * in the first-person hand.
 */
import { InstancedMesh, Matrix3, Matrix4, Mesh, Vector3, type Intersection } from "three";
import { blockBox } from "@clinicalcraft/world";
import { buildRules, canPlace, cellKey, validBlocks, type BuildRules, type Cell } from "./buildzone.js";
import { BUILD_RANGE } from "./interaction.js";
import type { Aabb } from "./physics.js";
import { createLcg } from "./textures.js";
import { UNIT_BOX } from "./voxels.js";
import type { VoxelWorld } from "./voxel-world.js";

/** A block in the build zone. */
export interface PlacedBlock {
  mesh: Mesh;
  collider: Aabb;
  type: string;
  cell: Cell;
}

interface Particle {
  m: Mesh;
  v: Vector3;
  t: number;
}

/** The build zone of one world. */
export class BuildZone {
  readonly rules: BuildRules | null;
  /** Placed blocks by cell key. */
  readonly placed = new Map<string, PlacedBlock>();
  /** Mining particles in flight. */
  readonly particles: Particle[] = [];
  private readonly prng = createLcg(7103 ^ 0x1234567);
  /** Materials of the hotbar's block slots (3, 4, …). */
  readonly materials: readonly string[];
  private readonly nm = new Matrix3();
  private readonly im = new Matrix4();

  constructor(private readonly world: VoxelWorld) {
    const { facility, opts } = world;
    const rules: BuildRules | null = facility.buildZone ? buildRules(facility.buildZone) : null;
    this.rules = rules;
    if (rules) {
      const saved = opts.saved;
      const savedValid = saved && saved.facilityId === facility.id && Array.isArray(saved.blocks);
      const list = savedValid ? validBlocks(rules, saved!.blocks) : validBlocks(rules, facility.buildZone?.seedBlocks ?? []);
      for (const bl of list) this.add(bl.cell, bl.type, false);
    }
    this.materials = rules?.materials ?? ["wood", "stone", "glass", "lamp"];
  }

  /** Place a block (false when the cell is taken); `notify` tells the app (inventory). */
  add(cell: Cell, type: string, notify = true): boolean {
    const { lib, ctx, callbacks, stage } = this.world;
    const k = cellKey(cell);
    if (this.placed.has(k)) return false;
    const mesh = new Mesh(UNIT_BOX, lib.get(type));
    mesh.position.set(cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.userData.block = { cell: [...cell], type };
    stage.root.add(mesh);
    mesh.updateMatrixWorld(true); // ray-pickable before the next render
    ctx.pickables.push(mesh);
    const collider = ctx.colliders.add({ ...blockBox(cell) }); // the collision model's block box
    this.placed.set(k, { mesh, collider, type, cell: [...cell] as Cell });
    stage.markShadows();
    if (notify) callbacks.onBlock("place", type);
    return true;
  }

  /** Remove the block at a cell key (null when there is none). */
  private remove(k: string): PlacedBlock | null {
    const { ctx, stage } = this.world;
    const pb = this.placed.get(k);
    if (!pb) return null;
    pb.mesh.removeFromParent();
    const i = ctx.pickables.indexOf(pb.mesh);
    if (i >= 0) ctx.pickables.splice(i, 1);
    ctx.colliders.remove(pb.collider);
    this.placed.delete(k);
    stage.markShadows();
    return pb;
  }

  private burst(pos: Vector3, type: string): void {
    const { lib, stage } = this.world;
    const prng = this.prng;
    for (let i = 0; i < 8; i++) {
      const m = new Mesh(UNIT_BOX, lib.get(type));
      m.scale.setScalar(0.08 + prng() * 0.09);
      m.position.copy(pos);
      stage.scene.add(m);
      this.particles.push({ m, v: new Vector3((prng() - 0.5) * 3, prng() * 3 + 0.5, (prng() - 0.5) * 3), t: 0.6 });
    }
  }

  /** Move and fade the mining particles (each frame). */
  updateParticles(dt: number): void {
    const particles = this.particles;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.t -= dt;
      p.v.y -= 9 * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.t <= 0) {
        this.world.stage.scene.remove(p.m);
        particles.splice(i, 1);
      }
    }
  }

  /** Mine the aimed block (`place` false) or place the selected block at the aimed face (`place` true). */
  build(place: boolean): void {
    const world = this.world;
    const { S, callbacks, player, interaction } = world;
    const rules = this.rules;
    if (!world.started || world.paused) return;
    if (!rules) return;
    const type = this.materials[world.slot - 3];
    if (world.slot < 3) {
      world.toast(S.selectBlock);
      return;
    }
    const hit = interaction.aimHit;
    if (!hit || hit.distance > BUILD_RANGE) return;
    if (!place) {
      const blk = hit.object.userData.block as { cell: Cell; type: string } | undefined;
      if (!blk) {
        world.toast(S.protected);
        return;
      }
      const pb = this.remove(cellKey(blk.cell));
      if (!pb) return;
      this.burst(pb.mesh.position, pb.type);
      callbacks.onBlock("mine", pb.type);
      world.swing = 1;
      callbacks.onSound("mine");
      interaction.aimHit = null;
      return;
    }
    if (!type) return;
    const normal = this.worldNormal(hit);
    const p = hit.point.clone().addScaledVector(normal, 0.025);
    const cell: Cell = [Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)];
    if (!canPlace(rules, cell, player, this.placed.has(cellKey(cell)))) {
      world.toast(S.cannotPlace);
      return;
    }
    if (callbacks.onBlock("check", type) === false) {
      world.toast(S.noMaterial);
      return;
    }
    if (this.placed.size >= rules.maxBlocks) {
      world.toast(S.full);
      return;
    }
    this.add(cell, type);
    world.swing = 1;
    callbacks.onSound("place");
  }

  private worldNormal(hit: Intersection): Vector3 {
    const { nm, im } = this;
    const n = hit.face?.normal?.clone() ?? new Vector3(0, 1, 0);
    const obj = hit.object as Mesh;
    if ((obj as InstancedMesh).isInstancedMesh && hit.instanceId != null) {
      (obj as InstancedMesh).getMatrixAt(hit.instanceId, im);
      im.premultiply(obj.matrixWorld);
      n.applyMatrix3(nm.getNormalMatrix(im)).normalize();
    } else if (obj.matrixWorld) {
      n.applyMatrix3(nm.getNormalMatrix(obj.matrixWorld)).normalize();
    }
    return n;
  }

  /** Hotbar slot `n`: a block slot shows its block in the hand. */
  select(n: number): void {
    const { lib, overlay } = this.world;
    this.world.slot = n;
    const mat = this.materials[n - 3];
    overlay.held.visible = n >= 3 && !!mat;
    overlay.held.material = mat ? lib.get(mat) : lib.get("wood");
  }
}
