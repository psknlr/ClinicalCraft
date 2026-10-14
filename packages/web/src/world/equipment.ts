/**
 * Equipment placements: voxel parts instanced per material (owners map ray
 * hits back to placements), rotated footprint colliders, live/static
 * screens, animated parts, equipment lights, labels and interaction targets.
 */
import { Box3, Color, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from "three";
import type { EquipmentType } from "@clinicalcraft/core";
import type { InteractionTarget } from "../contracts.js";
import type { BuildContext, PlacementInfo, TargetRecord } from "./context.js";
import { DEG, partBox, placementBox, rectContains, rotateXZ, rotatedFootprint, unionBox } from "./geometry.js";
import { createScreenTexture, type ScreenKind } from "./screens.js";
import { strings, tx } from "./strings.js";
import { UNIT_BOX } from "./voxels.js";

type InteractionKind = Extract<InteractionTarget, { kind: "equipment" }>["interaction"];

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

/** Room id whose rect contains (x, z) — smallest room wins. */
export function roomIdAt(ctx: Pick<BuildContext, "facility">, x: number, z: number): string | null {
  let best: { id: string; area: number } | null = null;
  for (const r of ctx.facility.rooms) {
    if (!rectContains(r.rect, x, z)) continue;
    const area = r.rect.w * r.rect.d;
    if (!best || area < best.area) best = { id: r.id, area };
  }
  return best?.id ?? null;
}

/** Top of the sleeping surface of a bed/couch type (part named "mattress", else highest broad part below 1.3). */
export function surfaceTop(type: EquipmentType | undefined): number {
  if (!type) return 0.9;
  const named = type.parts.find((p) => p.name === "mattress" || p.name === "seat");
  if (named) return named.p[1] + named.s[1] / 2;
  let top = 0;
  for (const p of type.parts) {
    const t = p.p[1] + p.s[1] / 2;
    if (p.s[0] * p.s[2] >= 0.5 && t <= 1.3) top = Math.max(top, t);
  }
  return top || 0.9;
}

export function buildPlacements(ctx: BuildContext): void {
  const f = ctx.facility;
  const S = strings(ctx.locale);
  const black = ctx.lib.get(ctx.lib.has("black") ? "black" : "coal");
  for (const p of f.placements) {
    const type = ctx.catalogs.equipment.get(p.type);
    if (!type) {
      ctx.warnings.push(`unknown equipment type "${p.type}" (placement ${p.id})`);
      continue;
    }
    const rot = p.rot ?? 0;
    const y = p.y ?? 0;
    const kind = (type.interaction?.kind ?? "none") as InteractionKind | "door";
    const screenKind = (type.screen ?? "none") as ScreenKind;
    const caps = [...new Set([...(type.capabilities ?? []), ...(p.capabilities ?? [])])];
    const label = tx(p.label ?? type.name, ctx.locale);
    const room = p.room ?? roomIdAt(ctx, p.x, p.z);
    const interactive = kind !== "none";
    const fp = rotatedFootprint(type.footprint.w, type.footprint.d, rot);
    const info: PlacementInfo = {
      id: p.id,
      type,
      x: p.x,
      z: p.z,
      y,
      rot,
      w: fp.w,
      d: fp.d,
      h: type.footprint.h,
      solid: type.solid !== false,
      kind,
      label,
      room,
    };
    ctx.placements.set(p.id, info);

    const boxes = [];
    for (const part of type.parts) {
      const [lx, ly, lz] = part.p;
      const [wx, wz] = rotateXZ(lx, lz, rot);
      const ry = (rot + (part.r ?? 0)) * DEG;
      const px = p.x + wx, py = y + ly, pz = p.z + wz;
      boxes.push(partBox({ x: p.x, z: p.z, y, rot }, part as never));
      const anim = part.anim ?? "none";
      if (part.name === "screen" && screenKind !== "none") {
        const sc = createScreenTexture(screenKind, part.s[0], part.s[1], p.id, ctx.lib.def(part.m)?.color);
        const live = screenKind === "vitals" || screenKind === "ecg";
        // live monitors are self-lit displays; static panels are lit like V4's emissive "screen" blocks
        const screenMat = live
          ? new MeshBasicMaterial({ map: sc.texture, toneMapped: false })
          : new MeshStandardMaterial({ map: sc.texture, emissiveMap: sc.texture, emissive: new Color(0xffffff), emissiveIntensity: screenKind === "text" ? 0.35 : 0.85, roughness: 0.6 });
        const mats = [black, black, black, black, screenMat, black];
        const mesh = new Mesh(UNIT_BOX, mats);
        mesh.position.set(px, py, pz);
        mesh.rotation.y = ry;
        mesh.scale.set(part.s[0], part.s[1], part.s[2]);
        mesh.userData.owner = p.id;
        ctx.root.add(mesh);
        ctx.pickables.push(mesh);
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
        ctx.screens.push({ placementId: p.id, kind: screenKind, mesh, canvas: sc.canvas, ctx: sc.ctx, texture: sc.texture, x: px, z: pz, slotId, lastDraw: -1e9 });
        continue;
      }
      if (anim !== "none") {
        const base = ctx.lib.get(part.m);
        const material = base.clone() as MeshStandardMaterial;
        if (anim === "blink" || anim === "pulse") {
          if (material.emissive.getHex() === 0) material.emissive = new Color(material.color);
          if (!material.emissiveIntensity) material.emissiveIntensity = 0.8;
        }
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

    if (info.solid) {
      const b = placementBox({ x: p.x, z: p.z, y, rot }, type.footprint);
      ctx.colliders.add({ ...b });
    }
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
      });
    }
    // floating label above labelled interactive equipment (V4 station signs)
    if (p.label && interactive) {
      const color = labelColor(kind, caps);
      const width = Math.min(3, Math.max(1.7, fp.w + 0.4));
      const sign = ctx.signs.make(label, width, color, true);
      const [lx, lz] = rotateXZ(0, 0, rot);
      const top = Math.max(...type.parts.map((pp) => pp.p[1] + pp.s[1] / 2));
      sign.position.set(p.x + lx, y + top + 0.5, p.z + lz);
      sign.rotation.y = rot * DEG;
      ctx.root.add(sign);
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
      const rec: TargetRecord = { id: p.id, target, box, x: p.x, z: p.z, label, kind };
      ctx.targets.set(p.id, rec);
    }
  }
}
