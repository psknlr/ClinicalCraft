/**
 * Geometry of laparoscopic access (docs/PROCEDURE.md §3): instruments pivot about their port, so a
 * tip can reach only what lies within the shaft's length and a workable angle of the abdominal wall;
 * two shafts that pass close inside the abdomen clash; a shaft across the scope's line of sight
 * obstructs it. Patient frame, metres.
 */
import type { Direction, PortPlan, ProcedureDefinition, Vec3 } from "../../schema/procedure.js";

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export function unit(a: Vec3): Vec3 {
  const l = length(a);
  return l > 1e-12 ? scale(a, 1 / l) : [0, 0, 0];
}
/** Angle between two directions (degrees, 0–180). */
export function angleDeg(a: Vec3, b: Vec3): number {
  const c = dot(unit(a), unit(b));
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

const NAMED: Record<string, Vec3> = {
  cephalad: [0, 1, 0],
  caudal: [0, -1, 0],
  "patient-left": [1, 0, 0],
  "patient-right": [-1, 0, 0],
  anterior: [0, 0, 1],
  posterior: [0, 0, -1],
};

/** A direction as a unit vector: a vector, or the sum of named directions ("cephalad" + "patient-left"). */
export function directionVector(d: Direction): Vec3 {
  if (typeof d[0] === "number") return unit(d as Vec3);
  return unit((d as string[]).reduce<Vec3>((acc, name) => add(acc, NAMED[name] ?? [0, 0, 0]), [0, 0, 0]));
}

/** The named direction closest to a unit vector, for read-outs ("cephalad, patient-left"). */
export function describeDirection(v: Vec3): string[] {
  const out: string[] = [];
  const axes: [number, string, string][] = [
    [v[1], "cephalad", "caudal"],
    [v[0], "patient-left", "patient-right"],
    [v[2], "anterior", "posterior"],
  ];
  for (const [value, pos, neg] of axes) if (Math.abs(value) >= 0.35) out.push(value > 0 ? pos : neg);
  return out.length ? out : ["none"];
}

/** Closest distance between segments p1–q1 and p2–q2. */
export function segmentDistance(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): number {
  const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let s = 0, t = 0;
  if (a <= 1e-12 && e <= 1e-12) return length(r);
  if (a <= 1e-12) {
    t = Math.max(0, Math.min(1, f / e));
  } else {
    const c = dot(d1, r);
    if (e <= 1e-12) {
      s = Math.max(0, Math.min(1, -c / a));
    } else {
      const b = dot(d1, d2), denom = a * e - b * b;
      s = denom > 1e-12 ? Math.max(0, Math.min(1, (b * f - c * e) / denom)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.max(0, Math.min(1, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.max(0, Math.min(1, (b - c) / a));
      }
    }
  }
  return length(sub(add(p1, scale(d1, s)), add(p2, scale(d2, t))));
}

/** Default working length of a laparoscopic shaft (m). */
export const SHAFT_LENGTH = 0.34;
/** Steepest workable angle between a shaft and the inward wall normal (degrees). */
export const MAX_WALL_ANGLE = 80;
/** Shafts closer than this inside the abdomen (excluding the last `TIP_ZONE` before the tips) clash. */
export const CLASH_DISTANCE = 0.008;
export const TIP_ZONE = 0.04;

export interface Reach {
  ok: boolean;
  distance: number;
  wallAngle: number;
  reason?: "too-far" | "too-oblique";
}

/** Can an instrument through `port` (with outward wall `normal`) reach `target`? */
export function reach(port: Vec3, normal: Vec3, target: Vec3, lengthM = SHAFT_LENGTH): Reach {
  const shaft = sub(target, port);
  const distance = length(shaft);
  const wallAngle = angleDeg(shaft, scale(unit(normal), -1));
  if (distance > lengthM) return { ok: false, distance, wallAngle, reason: "too-far" };
  if (wallAngle > MAX_WALL_ANGLE) return { ok: false, distance, wallAngle, reason: "too-oblique" };
  return { ok: true, distance, wallAngle };
}

/** The shaft of an instrument from its port to `TIP_ZONE` short of its tip. */
export function shaftSegment(port: Vec3, tip: Vec3): [Vec3, Vec3] {
  const v = sub(tip, port);
  const l = length(v);
  return [port, l > TIP_ZONE ? add(port, scale(v, (l - TIP_ZONE) / l)) : port];
}

/** Two shafts clash when they pass within `CLASH_DISTANCE` of each other inside the abdomen. */
export function shaftsClash(portA: Vec3, tipA: Vec3, portB: Vec3, tipB: Vec3): boolean {
  const [a0, a1] = shaftSegment(portA, tipA);
  const [b0, b1] = shaftSegment(portB, tipB);
  return segmentDistance(a0, a1, b0, b1) < CLASH_DISTANCE;
}

export interface PortMetric {
  site: string;
  role: "camera" | "working" | "assist";
  hand?: "left" | "right";
  distance: number;
  wallAngle: number;
  reachable: boolean;
  /** Angle between this port's line to the target and the scope's (working ports). */
  fromScope: number | null;
}

export interface PortReport {
  plan: string;
  ports: PortMetric[];
  /** Angle at the target between the two hands' instruments (the manipulation angle), when both are assigned. */
  manipulationAngle: number | null;
  /** The surgeon's hands cross outside the body (the right hand works the port on the surgeon's left). */
  handsCross: boolean;
  warnings: ("out-of-reach" | "sword-fighting" | "too-wide" | "hands-cross" | "port-too-close" | "camera-in-line")[];
}

/** The surgeon's right-hand direction, standing at the patient's `side`, facing the patient (up = anterior). */
export function surgeonRight(side: "left" | "right"): Vec3 {
  const facing: Vec3 = side === "left" ? [-1, 0, 0] : [1, 0, 0];
  return cross(facing, [0, 0, 1]);
}

/**
 * Ergonomics of a port plan to the operative target (docs/PROCEDURE.md §3): reach of every port,
 * the manipulation angle between the two hands (ideal 45–75°; below 25° the shafts fence, above 100°
 * the hands work against each other), whether the hands cross, ports too close to the target
 * (< 7 cm) and working ports in line with the scope (< 10°: the instrument hides behind the camera).
 * There is no single right plan: the report states consequences, not a verdict.
 */
export function portReport(def: ProcedureDefinition, plan: PortPlan): PortReport {
  const sites = new Map(def.portSites.map((s) => [s.id, s]));
  const camera = plan.ports.find((p) => p.role === "camera");
  const camSite = camera ? sites.get(camera.site) : undefined;
  const camLine = camSite ? sub(def.target, camSite.at) : null;
  const warnings = new Set<PortReport["warnings"][number]>();
  const ports: PortMetric[] = plan.ports.map((p) => {
    const site = sites.get(p.site);
    if (!site) return { site: p.site, role: p.role, hand: p.hand, distance: NaN, wallAngle: NaN, reachable: false, fromScope: null };
    const r = reach(site.at, site.normal ?? [0, 0, 1], def.target);
    if (!r.ok) warnings.add("out-of-reach");
    if (r.distance < 0.07) warnings.add("port-too-close");
    const fromScope = p.role !== "camera" && camLine ? angleDeg(sub(def.target, site.at), camLine) : null;
    if (fromScope != null && p.role === "working" && fromScope < 10) warnings.add("camera-in-line");
    return { site: p.site, role: p.role, hand: p.hand, distance: r.distance, wallAngle: r.wallAngle, reachable: r.ok, fromScope };
  });
  const left = plan.ports.find((p) => p.role === "working" && p.hand === "left");
  const right = plan.ports.find((p) => p.role === "working" && p.hand === "right");
  let manipulationAngle: number | null = null;
  let handsCross = false;
  const ls = left ? sites.get(left.site) : undefined;
  const rs = right ? sites.get(right.site) : undefined;
  if (ls && rs) {
    manipulationAngle = angleDeg(sub(ls.at, def.target), sub(rs.at, def.target));
    if (manipulationAngle < 25) warnings.add("sword-fighting");
    if (manipulationAngle > 100) warnings.add("too-wide");
    const r = surgeonRight(plan.surgeonSide);
    handsCross = dot(sub(rs.at, ls.at), r) < 0;
    if (handsCross) warnings.add("hands-cross");
  }
  return { plan: plan.id, ports, manipulationAngle, handsCross, warnings: [...warnings] };
}
