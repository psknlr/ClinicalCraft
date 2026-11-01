/**
 * The laparoscopic picture as plain geometry (`LapSceneSpec`, contracts.ts): what the surgery window's
 * three.js view draws, derived from the case's procedure definition, the field state and the operator's
 * `FieldView`. Only what the field shows is described — the organs and parts in view, the ducts and
 * vessels in view keyed by their handle ("T1"…, never a structure id or name), the tissue still covering
 * each region, the instruments, blood, bile and stones. Pure: no DOM, no three.js.
 */
import { directionVector, type FieldView, type ProcedureDefinition, type ProcedureState, type Structure, type Vec3 } from "@clinicalcraft/core";
import type { LapSceneSpec, LapVec3 } from "../../contracts.js";

/** How far a retraction pulls the part it holds (m), by force. */
export const PULL_M: Record<"gentle" | "firm" | "excessive", number> = { gentle: 0.006, firm: 0.012, excessive: 0.02 };

/** Opacity of the tissue still over a region, by how far it is dissected. */
export const TISSUE_OPACITY: Record<FieldView["regions"][number]["dissection"], number> = { untouched: 0.82, begun: 0.62, partly: 0.4, mostly: 0.18, cleared: 0 };

/** Thinnest tube drawn (m): a 1 mm artery stays visible at 15 cm. */
const MIN_TUBE_RADIUS = 0.0012;

const sub = (a: Vec3, b: Vec3): LapVec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): LapVec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): LapVec3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const dist = (a: Vec3, b: Vec3): number => len(sub(a, b));
const nearest = (p: Vec3, pts: readonly Vec3[]): number => Math.min(...pts.map((q) => dist(p, q)));

const TUBULAR = new Set(["duct", "artery", "vein"]);

/** The colour family an organ is drawn in (the operator recognises organs; a duct's identity is never shown). */
export function organTint(def: ProcedureDefinition, st: Structure): LapSceneSpec["organs"][number]["tint"] {
  if (st.kind === "plate") return "plate";
  if (st.kind === "ligament") return "ligament";
  if (st.id === def.specimen || st.parent === def.specimen || st.role === "specimen") return "gallbladder";
  const id = st.id.toLowerCase();
  if (/liver|hepat/.test(id)) return "liver";
  if (/stomach|gastr|pylor/.test(id)) return "stomach";
  if (/duoden|colon|bowel|intestin|ileum|jejun|omentum/.test(id)) return "bowel";
  return "tissue";
}

/** The structure, its parent, its siblings and its parts: what moves when it is pulled. */
function family(def: ProcedureDefinition, st: Structure): Set<string> {
  const out = new Set([st.id]);
  for (const x of def.anatomy) {
    if (x.parent === st.id) out.add(x.id);
    if (st.parent && (x.id === st.parent || x.parent === st.parent)) out.add(x.id);
  }
  return out;
}

/**
 * How each point of a structure is displaced by the retractions now held: the held part moves along the
 * pull, its organ less the farther a point is from the grasp, and a duct or vessel entering it only near
 * that end (the traction shows on the tube).
 */
export function retractionField(def: ProcedureDefinition, state: ProcedureState): (st: Structure, p: Vec3) => LapVec3 {
  const pulls = Object.entries(state.retractions).flatMap(([id, r]) => {
    const held = def.anatomy.find((x) => x.id === id);
    if (!held) return [];
    const v = directionVector(r.direction);
    return [{ held, members: family(def, held), vector: scale(v, PULL_M[r.force] ?? PULL_M.firm) }];
  });
  return (st, p) => {
    let out: LapVec3 = [0, 0, 0];
    for (const pull of pulls) {
      const d = nearest(p, pull.held.points);
      let w = 0;
      if (pull.members.has(st.id)) w = Math.max(0.3, 1 - d / (pull.held.radius * 2 + 0.03));
      else if (TUBULAR.has(st.kind) && st.enters && pull.members.has(st.enters)) w = Math.max(0, 1 - d / 0.03);
      if (w > 0) out = add(out, scale(pull.vector, w));
    }
    return out;
  };
}

/** The port holding the laparoscope (the camera), if any. */
function scopePort(state: ProcedureState) {
  return state.ports.find((p) => p.instrument === "laparoscope") ?? null;
}

/** The view up: anterior (the abdominal wall at the top of the screen), cranial when looking straight down. */
function viewUp(at: Vec3, target: Vec3): LapVec3 {
  const d = sub(target, at);
  const l = len(d) || 1;
  return Math.abs(d[2] / l) > 0.95 ? [0, 1, 0] : [0, 0, 1];
}

/** Regions that hide a structure: tissue lies over them until they are dissected. */
function covering(def: ProcedureDefinition): Set<string> {
  return new Set(def.anatomy.flatMap((s) => (s.in ? [s.in] : [])));
}

/** The laparoscopic picture for the field now (`field` = `observeField(def, state)`). */
export function lapScene(def: ProcedureDefinition, state: ProcedureState, field: FieldView): LapSceneSpec {
  const sites = new Map(def.portSites.map((s) => [s.id, s]));
  const scope = scopePort(state);
  const scopeAt = scope ? sites.get(scope.site)?.at : undefined;
  const live = field.inView && !!scopeAt;
  const camera = live && scopeAt ? { at: [...scopeAt] as LapVec3, target: [...def.target] as LapVec3, up: viewUp(scopeAt, def.target) } : null;
  const displace = retractionField(def, state);
  const moved = (st: Structure): LapVec3[] => st.points.map((p) => add(p, displace(st, p)));
  const specimenParts = new Set([def.specimen, ...def.anatomy.filter((x) => x.parent === def.specimen).map((x) => x.id)]);

  const organs: LapSceneSpec["organs"] = live
    ? field.organs.flatMap((o) => {
        const st = def.anatomy.find((x) => x.id === o.id);
        if (!st || TUBULAR.has(st.kind)) return [];
        const points = moved(st);
        const offsets = points.map((p, i) => sub(p, st.points[i]));
        const offset = scale(offsets.reduce<LapVec3>((a, b) => add(a, b), [0, 0, 0]), 1 / offsets.length);
        // an organ that would wrap the target or the scope is drawn see-through (never the specimen)
        const wraps = (p: Vec3) => nearest(p, st.points) < st.radius;
        const seeThrough = !specimenParts.has(st.id) && (wraps(def.target) || (!!scopeAt && wraps(scopeAt)));
        return [
          {
            id: st.id,
            points,
            radius: st.radius,
            shape: st.kind === "plate" ? "plate" : st.kind === "ligament" ? "band" : "blob",
            tint: organTint(def, st),
            seeThrough,
            ...(st.mesh ? { mesh: st.mesh } : {}),
            offset,
          },
        ];
      })
    : [];

  const tubes: LapSceneSpec["tubes"] = live
    ? field.tubes.flatMap((t) => {
        const id = state.handles.find((h) => h.handle === t.handle)?.structure;
        const st = id ? def.anatomy.find((x) => x.id === id) : undefined;
        if (!st || !TUBULAR.has(st.kind)) return [];
        return [{ handle: t.handle, points: moved(st), radius: Math.max(MIN_TUBE_RADIUS, st.radius), kind: st.kind as "duct" | "artery" | "vein", clips: t.clips, divided: t.divided, isolated: t.isolated }];
      })
    : [];

  const covers = covering(def);
  const tissue: LapSceneSpec["tissue"] = live
    ? field.regions.flatMap((r) => {
        const region = def.regions.find((x) => x.id === r.id);
        const opacity = TISSUE_OPACITY[r.dissection];
        if (!region || !covers.has(region.id) || opacity <= 0) return [];
        return [{ id: region.id, centre: [...region.centre] as LapVec3, radius: region.radius, opacity }];
      })
    : [];

  const shafts: LapSceneSpec["shafts"] = live
    ? state.ports.flatMap((p) => {
        const site = sites.get(p.site);
        if (!site || !p.instrument || p === scope) return [];
        const diameter = def.instruments.find((i) => i.id === p.instrument)?.diameterMm ?? 5;
        return [{ port: p.site, from: [...site.at] as LapVec3, to: [...(p.tip ?? def.target)] as LapVec3, radius: diameter / 2000, instrument: p.instrument }];
      })
    : [];

  const f = new Set(field.findings);
  return {
    live,
    camera,
    organs,
    tubes,
    tissue,
    shafts,
    blood: !live ? "none" : f.has("field-obscured") ? "haze" : f.has("bleeding") || f.has("major-bleeding") ? "pool" : "none",
    bile: live && f.has("bile"),
    stones: live && f.has("stones"),
    pool: [def.target[0], def.target[1], def.target[2] - 0.015],
  };
}

/** A stable key of a scene (the view redraws only when it changes). */
export function sceneKey(spec: LapSceneSpec): string {
  return JSON.stringify(spec, (_k, v: unknown) => (typeof v === "number" ? Math.round(v * 1e5) / 1e5 : v));
}
