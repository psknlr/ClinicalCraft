/**
 * Equipment placements: voxel parts instanced per material (owners map ray
 * hits back to placements), live/static screens, animated parts, equipment
 * lights, labels and interaction targets. The rotated footprint colliders of
 * solid equipment are the collision model's (`eq:<placementId>`).
 */
import { Box3, CanvasTexture, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, NearestFilter, SRGBColorSpace, Vector3, type BufferAttribute } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { entityLevel, type EquipmentType, type Placement, type VoxelPart } from "@clinicalcraft/core";
import type { InteractionTarget } from "../contracts.js";
import type { BuildContext, PlacementInfo, TargetRecord } from "./context.js";
import { DEG, partBox, placementBox, rotateXZ, rotatedFootprint, unionBox } from "./geometry.js";
import { beginPortable } from "./portable.js";
import { roomAt } from "./region.js";
import { createScreenTexture, type ScreenKind } from "./screens.js";
import { strings, tx } from "./strings.js";
import { BoxBatch, UNIT_BOX, UNIT_PLANE } from "./voxels.js";

type InteractionKind = Extract<InteractionTarget, { kind: "equipment" }>["interaction"];

/** Interaction kinds that get a floating V4 station sign when the placement has a label. */
export const SIGNED_KINDS = new Set(["workstation", "board", "atlas", "craft"]);

const IMAGING = ["xray", "ct", "mri", "ultrasound", "pet-ct", "fluoroscopy", "echocardiography"];
const PATHOLOGY = ["histopathology", "cytology", "cytogenetics", "molecular"];

/** Label colour (V4 station colours) by interaction kind / capability family. */
export function labelColor(kind: string, caps: string[]): string {
  if (kind === "board") return "#716541";
  if (kind === "atlas") return "#417868";
  if (kind === "monitor") return "#66cca8";
  if (kind === "craft") return "#2f574d";
  if (caps.some((c) => c.startsWith("lab-") || c === "flow-cytometry" || c === "point-of-care")) return "#f2c978";
  if (caps.some((c) => PATHOLOGY.includes(c))) return "#c7a1e5";
  if (caps.some((c) => IMAGING.includes(c))) return "#79c9e6";
  return "#2f574d";
}

/** Room id whose rect contains (x, z) — smallest room wins; with `level`, only that level's rooms. */
export function roomIdAt(ctx: Pick<BuildContext, "facility">, x: number, z: number, level?: string): string | null {
  return roomAt(ctx.facility, x, z, level)?.id ?? null;
}

/**
 * Top of the sleeping / sitting surface of a bed, couch or chair type: a part
 * named "mattress" or "seat", else the highest level (≤ 1.3 m) whose flat
 * parts (flatter than they are wide) together cover ≥ 40 % of the largest
 * flat part — so a pillow or a rail on top of the mattress does not lift the
 * patient off the bed, while segmented pads (operating table) still count.
 */
export function surfaceTop(type: Pick<EquipmentType, "parts"> | undefined): number {
  if (!type) return 0.9;
  const named = type.parts.find((p) => p.name === "mattress" || p.name === "seat");
  if (named) return named.p[1] + named.s[1] / 2;
  const flats = type.parts
    .filter((p) => p.s[1] < Math.min(p.s[0], p.s[2]) && p.p[1] + p.s[1] / 2 <= 1.3 && p.s[0] * p.s[2] >= 0.02)
    .map((p) => ({ top: p.p[1] + p.s[1] / 2, area: p.s[0] * p.s[2] }));
  if (!flats.length) return 0.9;
  const largest = Math.max(...flats.map((f) => f.area));
  let best = 0;
  for (const f of flats) {
    const level = flats.filter((g) => Math.abs(g.top - f.top) <= 0.02).reduce((a, g) => a + g.area, 0);
    if (level >= largest * 0.4 && largest >= 0.15) best = Math.max(best, f.top);
  }
  return best || 0.9;
}

/**
 * Parts a placement renders, in its local frame (rotated with the placement):
 * the equipment type's parts except the indices in `placement.hideParts`,
 * then `placement.extraParts` (V4 per-station details such as the lab's test
 * tubes). Exported for tests.
 */
export function placementParts(type: Pick<EquipmentType, "parts">, placement: Pick<Placement, "extraParts" | "hideParts">): VoxelPart[] {
  const hidden = new Set(placement.hideParts ?? []);
  const base = hidden.size ? type.parts.filter((_, i) => !hidden.has(i)) : type.parts;
  return placement.extraParts?.length ? [...base, ...placement.extraParts] : base;
}

interface StaticScreen {
  level: string;
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  z: number;
  ry: number;
  w: number;
  h: number;
  owner: string;
  /** V4 text panels glow less than imaging / lab screens. */
  dim: boolean;
}

interface LedPart {
  x: number;
  y: number;
  z: number;
  ry: number;
  s: [number, number, number];
  cast: boolean;
}

/** Shelf-pack canvases into one atlas (pure layout; returns pixel rects and the atlas size). Exported for tests. */
export function packShelves(sizes: { w: number; h: number }[], width = 512): { rects: { x: number; y: number }[]; width: number; height: number } {
  const order = sizes.map((s, i) => i).sort((a, b) => sizes[b].h - sizes[a].h);
  const rects: { x: number; y: number }[] = new Array(sizes.length);
  let x = 0, y = 0, rowH = 0;
  for (const i of order) {
    const { w, h } = sizes[i];
    if (x + w > width) {
      x = 0;
      y += rowH + 1;
      rowH = 0;
    }
    rects[i] = { x, y };
    x += w + 1;
    rowH = Math.max(rowH, h);
  }
  return { rects, width, height: Math.max(1, y + rowH) };
}

function buildStaticScreens(ctx: BuildContext, all: StaticScreen[]): void {
  if (!all.length) return;
  // one atlas texture; per level two meshes (dim text panels, bright imaging/lab screens) so a level can be culled
  const screens = all;
  const pack = packShelves(screens.map((s) => ({ w: s.canvas.width, h: s.canvas.height })));
  const atlas = document.createElement("canvas");
  atlas.width = pack.width;
  atlas.height = pack.height;
  const c2d = atlas.getContext("2d");
  screens.forEach((s, i) => c2d?.drawImage(s.canvas, pack.rects[i].x, pack.rects[i].y));
  const tex = new CanvasTexture(atlas);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = SRGBColorSpace;
  ctx.ownedTextures.push(tex);
  for (const level of [...new Set(screens.map((s) => s.level))])
  for (const dim of [false, true]) {
    const list = screens.map((s, i) => ({ s, i })).filter((e) => e.s.dim === dim && e.s.level === level);
    if (!list.length) continue;
    ctx.onLevel(level);
    const geoms = list.map(({ s, i }) => {
      const g = UNIT_PLANE.clone();
      const uv = g.getAttribute("uv") as BufferAttribute;
      const r = pack.rects[i];
      const u0 = (r.x + 0.5) / pack.width, u1 = (r.x + s.canvas.width - 0.5) / pack.width;
      const v1 = 1 - (r.y + 0.5) / pack.height, v0 = 1 - (r.y + s.canvas.height - 0.5) / pack.height;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), v0 + uv.getY(k) * (v1 - v0));
      g.scale(s.w, s.h, 1).rotateY(s.ry).translate(s.x, s.y, s.z);
      return g;
    });
    const merged = mergeGeometries(geoms, false);
    for (const g of geoms) g.dispose();
    if (!merged) continue;
    const mat = new MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new Color(0xffffff),
      emissiveIntensity: dim ? 0.35 : 0.85,
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    const mesh = new Mesh(merged, mat);
    mesh.name = dim ? "screens:text" : "screens:static";
    // ray hits resolve per quad (2 triangles each) to the owning placement
    mesh.userData.quadOwners = list.map(({ s }) => s.owner);
    ctx.root.add(mesh);
    ctx.pickables.push(mesh);
  }
  ctx.onLevel(ctx.level);
}

function buildLeds(ctx: BuildContext, leds: Map<string, LedPart[]>): void {
  for (const [levelKey, list] of leds) {
    // keys: "<level>|<material>|<anim>|<bucket>" (one merged mesh per level so a level can be culled)
    const [level, ...rest] = levelKey.split("|");
    const key = rest.join("|");
    const [m, anim, bucket] = key.split("|");
    ctx.onLevel(level);
    const geoms = list.map((l) => UNIT_BOX.clone().scale(l.s[0], l.s[1], l.s[2]).rotateY(l.ry).translate(l.x, l.y, l.z));
    const merged = mergeGeometries(geoms, false);
    for (const g of geoms) g.dispose();
    if (!merged) continue;
    const material = ctx.lib.get(m).clone() as MeshStandardMaterial;
    if (material.emissive.getHex() === 0) material.emissive = new Color(material.color);
    if (!material.emissiveIntensity) material.emissiveIntensity = 0.8;
    const mesh = new Mesh(merged, material);
    mesh.name = `leds:${key}`;
    mesh.castShadow = list.some((l) => l.cast);
    mesh.receiveShadow = true;
    ctx.root.add(mesh); // not ray-picked: the equipment behind the LED resolves the aim
    ctx.animated.push({ mesh, anim: anim as "blink" | "pulse", base: { y: 0, ry: 0, sx: 1, sy: 1, sz: 1 }, material, phase: Number(bucket) * 0.5 });
  }
  ctx.onLevel(ctx.level);
}

export function buildPlacements(ctx: BuildContext): void {
  const f = ctx.facility;
  const S = strings(ctx.locale);
  const blackId = ctx.lib.has("black") ? "black" : "coal";
  const staticScreens: StaticScreen[] = [];
  const leds = new Map<string, LedPart[]>();
  for (const p of f.placements) {
    const level = entityLevel(f, p);
    const elevation = ctx.levels.elevation(level);
    ctx.onLevel(level);
    const type = ctx.catalogs.equipment.get(p.type);
    if (!type) {
      ctx.warnings.push(`unknown equipment type "${p.type}" (placement ${p.id})`);
      continue;
    }
    const rot = p.rot ?? 0;
    // world height of the placement's origin: its level's floor + its own `y`
    const y = elevation + (p.y ?? 0);
    const kind = (type.interaction?.kind ?? "none") as InteractionKind | "door";
    const screenKind = (type.screen ?? "none") as ScreenKind;
    const caps = [...new Set([...(type.capabilities ?? []), ...(p.capabilities ?? [])])];
    const label = tx(p.label ?? type.name, ctx.locale);
    const room = p.room ?? roomIdAt(ctx, p.x, p.z, ctx.levels.multi ? level : undefined);
    const interactive = kind !== "none";
    const fp = rotatedFootprint(type.footprint.w, type.footprint.d, rot);
    const info: PlacementInfo = {
      id: p.id,
      type,
      x: p.x,
      z: p.z,
      y: p.y ?? 0,
      rot,
      w: fp.w,
      d: fp.d,
      h: type.footprint.h,
      solid: type.solid !== false,
      kind,
      label,
      room,
      level,
      elevation,
    };
    ctx.placements.set(p.id, info);

    // a portable placement (cart, handheld item) is its own movable group, drawn where the world model says it
    // stands (embodiment, portable.ts) — never part of the static batches
    const portable = type.portable ? beginPortable(ctx, { id: p.id, x: p.x, z: p.z, rot }, y, level) : null;
    // a type with a GLB model: its voxel parts get their own group and batch (the fallback, hidden once the model is in)
    let finishFallback: (() => void) | null = null;
    const modelled = !!(ctx.models && type.model);
    // screens and LEDs of a standalone placement stay in its own group (not in the level-wide atlases)
    const standalone = modelled || !!portable;
    if (modelled) {
      const fallback = new Group();
      fallback.name = `voxels:${p.id}`;
      ctx.root.add(fallback);
      const batch = new BoxBatch();
      const prevRoot = ctx.root, prevBatch = ctx.batch;
      ctx.root = fallback;
      ctx.batch = batch;
      finishFallback = () => {
        for (const m of batch.build(fallback, ctx.lib, ctx.shadows)) ctx.pickables.push(m);
        ctx.root = prevRoot;
        ctx.batch = prevBatch;
        ctx.models!.push({ placementId: p.id, model: type.model!, footprint: { ...type.footprint }, at: { x: p.x, y, z: p.z, rot }, level, fallback, ...(portable ? { parent: portable.record.inner } : {}) });
      };
    }

    const parts = placementParts(type, p);
    const boxes = [];
    for (const part of parts) {
      const [lx, ly, lz] = part.p;
      const [wx, wz] = rotateXZ(lx, lz, rot);
      const ry = (rot + (part.r ?? 0)) * DEG;
      const px = p.x + wx, py = y + ly, pz = p.z + wz;
      boxes.push(partBox({ x: p.x, z: p.z, y, rot }, part as never));
      const anim = part.anim ?? "none";
      if (part.name === "screen" && screenKind !== "none") {
        const sc = createScreenTexture(screenKind, part.s[0], part.s[1], p.id, ctx.lib.def(part.m)?.color);
        const live = screenKind === "vitals" || screenKind === "ecg";
        // housing: a batched black box (no extra draw call); display: one quad just proud of the +Z face
        ctx.batch.add(blackId, px, py, pz, part.s[0], part.s[1], part.s[2], ry, interactive ? p.id : undefined);
        const lift = part.s[2] / 2 + 0.003;
        const qx = px + Math.sin(ry) * lift, qz = pz + Math.cos(ry) * lift;
        if (!live && !standalone) {
          // static pixel art never changes: packed into one atlas, all panels drawn by two meshes
          sc.texture.dispose();
          staticScreens.push({ level, canvas: sc.canvas, x: qx, y: py, z: qz, ry, w: part.s[0], h: part.s[1], owner: p.id, dim: screenKind === "text" });
          continue;
        }
        // live monitors are self-lit displays redrawn at ≤ 10 Hz (own texture, one draw call each)
        const screenMat = new MeshBasicMaterial({ map: sc.texture, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
        const mesh = new Mesh(UNIT_PLANE, screenMat);
        mesh.position.set(qx, py, qz);
        mesh.rotation.y = ry;
        mesh.scale.set(part.s[0], part.s[1], 1);
        mesh.userData.owner = p.id;
        ctx.root.add(mesh);
        ctx.pickables.push(mesh);
        if (!live) {
          // a standalone (modelled / portable) placement's static screen: its own quad in its group
          ctx.ownedTextures.push(sc.texture);
          continue;
        }
        // vitals source: slot whose monitor is this placement, else the nearest slot in the same room within 4 m
        let slotId: string | null = null;
        if (screenKind === "vitals" || screenKind === "ecg") {
          const linked = f.patientSlots.find((s) => s.monitor === p.id);
          if (linked) slotId = linked.id;
          else {
            let best = 4;
            for (const s of f.patientSlots) {
              const d = Math.hypot(s.x - p.x, s.z - p.z);
              if (d < best && (!room || s.room === room)) {
                best = d;
                slotId = s.id;
              }
            }
          }
        }
        ctx.screens.push({ placementId: p.id, kind: screenKind, mesh, canvas: sc.canvas, ctx: sc.ctx, texture: sc.texture, x: px, z: pz, slotId, lastDraw: -1e9, level });
        continue;
      }
      if ((anim === "blink" || anim === "pulse") && !standalone) {
        // indicator LEDs: merged per (material, animation, phase half) → a handful of draw calls
        const bucket = (p.x * 0.37 + p.z * 0.71) % 1 < 0.5 ? 0 : 1;
        const key = `${level}|${part.m}|${anim}|${bucket}`;
        let list = leds.get(key);
        if (!list) leds.set(key, (list = []));
        list.push({ x: px, y: py, z: pz, ry, s: part.s, cast: ctx.shadows && ctx.lib.castShadow(part.m) });
        continue;
      }
      if (anim === "spin") {
        // spinning parts need their own transform; they keep the shared library material
        const material = ctx.lib.get(part.m);
        const mesh = new Mesh(UNIT_BOX, material);
        mesh.position.set(px, py, pz);
        mesh.rotation.y = ry;
        mesh.scale.set(part.s[0], part.s[1], part.s[2]);
        mesh.castShadow = ctx.shadows && ctx.lib.castShadow(part.m);
        mesh.receiveShadow = true;
        mesh.userData.owner = interactive ? p.id : undefined;
        ctx.root.add(mesh);
        if (interactive) ctx.pickables.push(mesh);
        ctx.animated.push({
          mesh,
          anim,
          base: { y: py, ry, sx: part.s[0], sy: part.s[1], sz: part.s[2] },
          material,
          phase: (p.x * 0.37 + p.z * 0.71) % 1,
        });
        continue;
      }
      ctx.batch.add(part.m, px, py, pz, part.s[0], part.s[1], part.s[2], ry, interactive ? p.id : undefined);
    }
    finishFallback?.();
    if (portable) for (const m of portable.finish()) ctx.pickables.push(m);

    if (type.light) {
      ctx.lights.push({
        x: p.x,
        y: y + type.light.y,
        z: p.z,
        color: type.light.color,
        intensity: type.light.intensity,
        distance: type.light.distance,
        decay: 2,
        source: p.id,
        level,
      });
    }
    // floating label above labelled stations (V4: workstations, board, atlas kiosk, crafting bench);
    // other equipment shows its name in the aim tooltip only (keeps dense wards readable)
    if (p.label && SIGNED_KINDS.has(kind)) {
      const color = labelColor(kind, caps);
      const width = Math.min(3, Math.max(1.7, fp.w + 0.4));
      const sign = ctx.signs.make(label, width, color, true);
      const [lx, lz] = rotateXZ(0, 0, rot);
      const top = parts.length ? Math.max(...parts.map((pp) => pp.p[1] + pp.s[1] / 2)) : type.footprint.h;
      sign.position.set(p.x + lx, y + top + 0.5, p.z + lz);
      sign.rotation.y = rot * DEG;
      (portable?.record.inner ?? ctx.root).add(sign);
    }
    if (interactive && kind !== "door") {
      const ub = unionBox(boxes) ?? placementBox({ x: p.x, z: p.z, y, rot }, type.footprint);
      const box = new Box3(new Vector3(ub.minX, ub.minY, ub.minZ), new Vector3(ub.maxX, ub.maxY, ub.maxZ));
      const prompt = type.interaction?.prompt ? tx(type.interaction.prompt, ctx.locale) : S.use;
      const target: InteractionTarget = {
        kind: "equipment",
        placementId: p.id,
        type: type.id,
        interaction: kind as InteractionKind,
        capabilities: caps,
        name: label,
        hint: prompt,
        room,
      };
      const rec: TargetRecord = { id: p.id, target, box, x: p.x, z: p.z, label, kind, level };
      ctx.targets.set(p.id, rec);
    }
  }
  ctx.onLevel(ctx.level);
  buildStaticScreens(ctx, staticScreens);
  buildLeds(ctx, leds);
}
