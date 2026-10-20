/**
 * Room templates (EMBODIED R10): an authoring-time macro. A facility places
 * `clinicalcraft/room-template@1` rooms with `instances`; `compileFacility`
 * expands them into the flat facility format — rooms, placements, patient
 * slots, staff and access zones — so the renderer, navigation and tools
 * never see a template. Pure and deterministic: the same facility and
 * templates give the same output, in instance order, byte for byte.
 *
 * Frames: a template is centred on its origin (x along its width, z along
 * its depth); an instance at (x, z) with `rot` (0/90/180/270°, three.js
 * `rotation.y`: local +Z → (sin rot, cos rot)) maps a local point (lx, lz)
 * to (x, z) + rotate(lx, lz). Sides rotate with it (at 90° local north
 * becomes west); an opening's `offset` along its wall is re-signed when the
 * wall's axis direction flips. A side that lies on a wall of the room's
 * building (inside the wall's thickness) uses that wall: the template's
 * partition there is left out, so facade windows stay visible. Compiled
 * ids: the room is `${instance}`, everything else `${instance}.${localId}`.
 */
import type { Issue, ParseResult } from "./types.js";
import { issuesFromZodError, contentWarnings } from "./parse.js";
import { buildingLevels, checkFacility, defaultLevelId, SPATIAL_TOLERANCE } from "./facility.js";
import {
  FACILITY_SCHEMA_ID,
  FacilitySchema,
  RoomTemplateSchema,
  TEMPLATE_ROTATIONS,
  type AccessZone,
  type EquipmentCatalog,
  type FacilityDefinition,
  type Placement,
  type Rect,
  type Room,
  type RoomPartition,
  type RoomTemplate,
  type TemplateInstance,
} from "../schema/facility.js";

type Side = "n" | "s" | "e" | "w";
type Slot = FacilityDefinition["patientSlots"][number];
type Staff = FacilityDefinition["staff"][number];

/** Result of `compileFacility`: the flat facility and what was wrong with the instances (`ok`: no errors). */
export interface CompileResult {
  ok: boolean;
  facility: FacilityDefinition;
  issues: Issue[];
}

const err = (path: string, message: string): Issue => ({ path, message, severity: "error" });
const warn = (path: string, message: string): Issue => ({ path, message, severity: "warning" });

/** Round to 1 µm (no 3.5999999999999996 from a rotation) and turn −0 into 0. */
const r6 = (v: number): number => Math.round(v * 1e6) / 1e6 + 0;

const norm = (rot: number): number => ((rot % 360) + 360) % 360;

/** Rotate a template-local offset by a right angle (three.js rotation.y; exact). */
export function rotateLocal(x: number, z: number, rot: number): [number, number] {
  switch (norm(rot)) {
    case 90:
      return [z + 0, -x + 0];
    case 180:
      return [-x + 0, -z + 0];
    case 270:
      return [-z + 0, x + 0];
    default:
      return [x + 0, z + 0];
  }
}

const SIDE_VECTOR: Record<Side, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
/** Positive direction of the axis a wall on `side` runs along (+X for north/south walls, +Z for east/west). */
const alongAxis = (side: Side): [number, number] => (side === "n" || side === "s" ? [1, 0] : [0, 1]);

/** The side a local side becomes after rotating by `rot`. */
export function rotateSide(side: Side, rot: number): Side {
  const [x, z] = rotateLocal(...SIDE_VECTOR[side], rot);
  return x > 0.5 ? "e" : x < -0.5 ? "w" : z > 0.5 ? "s" : "n";
}

/** +1 when a wall's along-axis keeps its direction after the rotation, −1 when it flips (an opening's `offset` changes sign). */
export function offsetSign(side: Side, rot: number): 1 | -1 {
  const [ax, az] = rotateLocal(...alongAxis(side), rot);
  const [bx, bz] = alongAxis(rotateSide(side, rot));
  return ax * bx + az * bz >= 0 ? 1 : -1;
}

/** A template-local rect (centre + size) placed by an instance. */
function placeRect(rect: Rect, at: { x: number; z: number }, rot: number): Rect {
  const [dx, dz] = rotateLocal(rect.x, rect.z, rot);
  const quarter = norm(rot) === 90 || norm(rot) === 270;
  return { x: r6(at.x + dx), z: r6(at.z + dz), w: quarter ? rect.d : rect.w, d: quarter ? rect.w : rect.d };
}

function placePoint<T extends { x: number; z: number }>(p: T, at: { x: number; z: number }, rot: number): T {
  const [dx, dz] = rotateLocal(p.x, p.z, rot);
  return { ...p, x: r6(at.x + dx), z: r6(at.z + dz) };
}

function rotatePartition(p: RoomPartition, rot: number): RoomPartition {
  const sign = offsetSign(p.side, rot);
  return { ...p, side: rotateSide(p.side, rot), openings: p.openings.map((o) => ({ ...o, offset: r6(o.offset * sign) })) };
}

/**
 * Does a room side lie on one of a building's walls (its line inside the
 * wall's thickness, running along it)? Then the building wall — with its
 * windows — is that side of the room and the template's partition is left out.
 */
function onBuildingWall(rect: Rect, side: Side, building: { rect: Rect; walls?: { thickness?: number } }): boolean {
  const t = building.walls?.thickness ?? 1;
  const b = building.rect;
  const ns = side === "n" || side === "s";
  const line = side === "n" ? rect.z - rect.d / 2 : side === "s" ? rect.z + rect.d / 2 : side === "w" ? rect.x - rect.w / 2 : rect.x + rect.w / 2;
  const walls = ns ? [b.z - b.d / 2, b.z + b.d / 2] : [b.x - b.w / 2, b.x + b.w / 2];
  if (!walls.some((w) => Math.abs(line - w) <= t / 2 + 0.01)) return false;
  const [a0, a1] = ns ? [rect.x - rect.w / 2, rect.x + rect.w / 2] : [rect.z - rect.d / 2, rect.z + rect.d / 2];
  const [b0, b1] = ns ? [b.x - b.w / 2 - t / 2, b.x + b.w / 2 + t / 2] : [b.z - b.d / 2 - t / 2, b.z + b.d / 2 + t / 2];
  return a0 >= b0 - 0.01 && a1 <= b1 + 0.01;
}

/** Is `inner` inside `outer` (tolerance `SPATIAL_TOLERANCE`)? */
function rectWithin(inner: Rect, outer: Rect): boolean {
  const t = SPATIAL_TOLERANCE;
  return (
    inner.x - inner.w / 2 >= outer.x - outer.w / 2 - t &&
    inner.x + inner.w / 2 <= outer.x + outer.w / 2 + t &&
    inner.z - inner.d / 2 >= outer.z - outer.d / 2 - t &&
    inner.z + inner.d / 2 <= outer.z + outer.d / 2 + t
  );
}

function overlapRects(a: Rect, b: Rect): { w: number; d: number } {
  return {
    w: Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2),
    d: Math.min(a.z + a.d / 2, b.z + b.d / 2) - Math.max(a.z - a.d / 2, b.z - b.d / 2),
  };
}

/** Index templates by id (later entries override earlier ones, like catalogs and content directories). */
function templateIndex(templates: Iterable<RoomTemplate> | ReadonlyMap<string, RoomTemplate>): Map<string, RoomTemplate> {
  if (templates instanceof Map) return new Map(templates);
  const out = new Map<string, RoomTemplate>();
  for (const t of templates as Iterable<RoomTemplate>) out.set(t.id, t);
  return out;
}

/** One expanded instance. */
interface Expanded {
  room: Room;
  placements: Placement[];
  slots: Slot[];
  staff: Staff[];
  access: AccessZone[];
}

function expand(f: FacilityDefinition, inst: TemplateInstance, t: RoomTemplate, path: string, issues: Issue[]): Expanded {
  const o = inst.overrides ?? {};
  const rot = inst.rot ?? 0;
  const at = { x: inst.x, z: inst.z };
  const omit = new Set(o.omit ?? []);
  const known = new Set([...t.placements, ...t.patientSlots, ...t.staff, ...t.zones].map((e) => e.id));
  for (const id of omit) if (!known.has(id)) issues.push(warn(`${path}.overrides.omit`, `template "${t.id}" has no placement, slot, staff member or zone "${id}"`));
  const patchKeys = (kind: "placements" | "patientSlots" | "staff", ids: string[]) => {
    for (const id of Object.keys(o[kind] ?? {})) if (!ids.includes(id)) issues.push(warn(`${path}.overrides.${kind}.${id}`, `template "${t.id}" has no ${kind === "patientSlots" ? "patient slot" : kind === "staff" ? "staff member" : "placement"} "${id}"`));
  };
  patchKeys("placements", t.placements.map((p) => p.id));
  patchKeys("patientSlots", t.patientSlots.map((s) => s.id));
  patchKeys("staff", t.staff.map((s) => s.id));

  const level = inst.level;
  const onLevel = level ?? defaultLevelId(f);
  const rect = placeRect({ x: 0, z: 0, w: t.size.w, d: t.size.d }, at, rot);
  const building =
    inst.building ?? f.buildings.find((b) => buildingLevels(f, b).includes(onLevel) && Math.abs(inst.x - b.rect.x) <= b.rect.w / 2 && Math.abs(inst.z - b.rect.z) <= b.rect.d / 2)?.id;
  const sign = o.sign === null ? undefined : (o.sign ?? t.sign);
  const host = building ? f.buildings.find((b) => b.id === building) : undefined;
  const partitions = (o.partitions ?? t.partitions).map((p) => rotatePartition(p, rot)).filter((p) => !(host && onBuildingWall(rect, p.side, host)));
  const room: Room = {
    id: inst.id,
    name: o.name ?? t.name,
    kind: t.kind,
    ...(building ? { building } : {}),
    ...(level ? { level } : {}),
    rect,
    ...((o.floor ?? t.floor) ? { floor: o.floor ?? t.floor } : {}),
    partitions,
    ...(sign ? { sign: { ...sign, ...(sign.side ? { side: rotateSide(sign.side, rot) } : {}) } } : {}),
    lights: (o.lights ?? t.lights).map((l) => placePoint(l, at, rot)),
  };

  const id = (local: string) => `${inst.id}.${local}`;
  const placements: Placement[] = [];
  const kept = new Set<string>();
  for (const p of t.placements) {
    if (omit.has(p.id)) continue;
    kept.add(p.id);
    const merged = { ...p, ...(o.placements?.[p.id] ?? {}) };
    const placed = placePoint(merged, at, rot);
    placements.push({ ...placed, id: id(p.id), rot: norm((merged.rot ?? 0) + rot), room: inst.id });
  }
  const slots: Slot[] = [];
  t.patientSlots.forEach((s, j) => {
    if (omit.has(s.id)) return;
    const patch = o.patientSlots?.[s.id] ?? {};
    const ref = (field: "bed" | "monitor"): string | undefined => {
      const local = s[field];
      if (local === undefined) return undefined;
      if (!kept.has(local)) {
        issues.push(err(`${path}.template`, `slot "${s.id}" of template "${t.id}" (patientSlots.${j}.${field}) names placement "${local}", which ${omit.has(local) ? "the instance omits" : "the template does not have"}`));
        return undefined;
      }
      return id(local);
    };
    const bed = ref("bed");
    const monitor = ref("monitor");
    const placed = placePoint(s, at, rot);
    slots.push({
      id: id(s.id),
      room: inst.id,
      x: placed.x,
      z: placed.z,
      rot: norm((s.rot ?? 0) + rot),
      posture: patch.posture ?? s.posture,
      ...(bed ? { bed } : {}),
      accepts: [...(patch.accepts ?? s.accepts)],
      ...(monitor ? { monitor } : {}),
    });
  });
  const staff: Staff[] = [];
  for (const s of t.staff) {
    if (omit.has(s.id)) continue;
    const patch = o.staff?.[s.id] ?? {};
    const placed = placePoint(s, at, rot);
    const appearance = patch.appearance ? { ...(s.appearance ?? {}), ...patch.appearance } : s.appearance;
    const greeting = patch.greeting ?? s.greeting;
    staff.push({
      id: id(s.id),
      role: patch.role ?? s.role,
      name: patch.name ?? s.name,
      room: inst.id,
      x: placed.x,
      z: placed.z,
      rot: norm((s.rot ?? 0) + rot),
      ...(appearance ? { appearance } : {}),
      ...(greeting ? { greeting } : {}),
    });
  }
  const access: AccessZone[] = t.zones
    .filter((z) => !omit.has(z.id))
    .map((z) => ({ id: id(z.id), name: z.name, ...(level ? { level } : {}), rect: placeRect(z.rect, at, rot), roles: [...z.roles] }));
  return { room, placements, slots, staff, access };
}

/**
 * Expand a facility's template `instances` into the flat format: one room
 * per instance (id = the instance id, rect rotated, partitions/sign sides
 * rotated, opening offsets re-signed), its placements, patient slots, staff
 * and zones (→ `access`) with ids `${instance}.${local}`, positions rotated
 * and `rot` added — appended after the authored ones, in instance order.
 * The result has no `instances` left. A facility without instances is
 * returned as is (the same object).
 *
 * Errors: duplicate instance ids, unknown templates, rotations other than
 * 0/90/180/270, slot `bed`/`monitor` naming a missing local placement,
 * compiled ids that collide with authored ones, rooms of two instances that
 * overlap on one level. Warnings: an instance room partly overlapping an
 * authored room (one nested inside the other is fine); overrides naming
 * unknown local ids. Instances with an error in their
 * own definition are left out.
 */
export function compileFacility(f: FacilityDefinition, templates: Iterable<RoomTemplate> | ReadonlyMap<string, RoomTemplate>): CompileResult {
  const instances = f.instances ?? [];
  if (instances.length === 0) return { ok: true, facility: f, issues: [] };
  const byId = templateIndex(templates);
  const issues: Issue[] = [];
  const authored = {
    rooms: new Set(f.rooms.map((r) => r.id)),
    placements: new Set(f.placements.map((p) => p.id)),
    patientSlots: new Set(f.patientSlots.map((s) => s.id)),
    staff: new Set(f.staff.map((s) => s.id)),
    access: new Set((f.access ?? []).map((z) => z.id)),
  };
  const out = { rooms: [] as Room[], placements: [] as Placement[], patientSlots: [] as Slot[], staff: [] as Staff[], access: [] as AccessZone[] };
  const placed: { index: number; id: string; level: string; rect: Rect }[] = [];
  const seen = new Set<string>();
  instances.forEach((inst, i) => {
    const path = `instances.${i}`;
    if (seen.has(inst.id)) {
      issues.push(err(`${path}.id`, `duplicate instance id "${inst.id}"`));
      return;
    }
    seen.add(inst.id);
    const t = byId.get(inst.template);
    if (!t) {
      issues.push(err(`${path}.template`, `unknown room template "${inst.template}"`));
      return;
    }
    if (!(TEMPLATE_ROTATIONS as readonly number[]).includes(inst.rot ?? 0)) {
      issues.push(err(`${path}.rot`, `rotation ${String(inst.rot)}° is not one of ${TEMPLATE_ROTATIONS.join(", ")}`));
      return;
    }
    const before = issues.filter((x) => x.severity === "error").length;
    const e = expand(f, inst, t, path, issues);
    if (issues.filter((x) => x.severity === "error").length > before) return;
    // compiled ids must not collide with the authored ones
    const collide = (kind: keyof typeof authored, ids: string[], label: string) => {
      for (const id of ids) if (authored[kind].has(id)) issues.push(err(`${path}.id`, `compiled ${label} id "${id}" collides with an authored ${label}`));
    };
    collide("rooms", [e.room.id], "room");
    collide("placements", e.placements.map((p) => p.id), "placement");
    collide("patientSlots", e.slots.map((s) => s.id), "patient slot");
    collide("staff", e.staff.map((s) => s.id), "staff");
    collide("access", e.access.map((z) => z.id), "access zone");
    const level = inst.level ?? defaultLevelId(f);
    for (const other of placed) {
      if (other.level !== level) continue;
      const o = overlapRects(e.room.rect, other.rect);
      if (o.w > SPATIAL_TOLERANCE && o.d > SPATIAL_TOLERANCE) issues.push(err(`${path}`, `room of instance "${inst.id}" overlaps instance "${other.id}" by ${o.w.toFixed(2)}×${o.d.toFixed(2)} m on level "${level}"`));
    }
    for (const r of f.rooms) {
      if ((r.level ?? defaultLevelId(f)) !== level) continue;
      // a room nested in an authored one (an elevator car in a lobby) is fine; partial overlaps are not
      if (rectWithin(e.room.rect, r.rect) || rectWithin(r.rect, e.room.rect)) continue;
      const o = overlapRects(e.room.rect, r.rect);
      if (o.w > SPATIAL_TOLERANCE && o.d > SPATIAL_TOLERANCE) issues.push(warn(`${path}`, `room of instance "${inst.id}" overlaps authored room "${r.id}" by ${o.w.toFixed(2)}×${o.d.toFixed(2)} m`));
    }
    placed.push({ index: i, id: inst.id, level, rect: e.room.rect });
    out.rooms.push(e.room);
    out.placements.push(...e.placements);
    out.patientSlots.push(...e.slots);
    out.staff.push(...e.staff);
    out.access.push(...e.access);
  });
  const facility: FacilityDefinition = {
    ...f,
    rooms: [...f.rooms, ...out.rooms],
    placements: [...f.placements, ...out.placements],
    patientSlots: [...f.patientSlots, ...out.patientSlots],
    staff: [...f.staff, ...out.staff],
    access: [...(f.access ?? []), ...out.access],
    instances: [],
  };
  return { ok: !issues.some((x) => x.severity === "error"), facility, issues };
}

/** Parse and validate a room template (`clinicalcraft/room-template@1`); warnings: missing translations, non-canonical capabilities. */
export function parseRoomTemplate(json: unknown): ParseResult<RoomTemplate> {
  const result = RoomTemplateSchema.safeParse(json);
  if (!result.success) return { ok: false, issues: issuesFromZodError(result.error, json) };
  const value = result.data;
  const locales = new Set<string>();
  const collect = (v: unknown) => {
    if (v && typeof v === "object" && !Array.isArray(v)) for (const k of Object.keys(v)) locales.add(k);
  };
  collect(value.name);
  collect(value.description);
  return { ok: true, value, warnings: contentWarnings(RoomTemplateSchema, value, [...locales]) };
}

/**
 * Validate a template against the catalogs: it is compiled alone at the
 * origin and checked like a facility (`checkFacility`: unknown equipment
 * types and materials, duplicate ids, positions outside the room, slot
 * references, overlapping solids…; paths mapped back to the template),
 * plus capabilities the template declares that its equipment does not
 * provide (warning).
 */
export function checkRoomTemplate(t: RoomTemplate, catalogs: EquipmentCatalog[]): Issue[] {
  const half = Math.max(t.size.w, t.size.d) / 2 + 2;
  const f = FacilitySchema.parse({
    schema: FACILITY_SCHEMA_ID,
    id: `template-${t.id}`.slice(0, 80),
    name: t.name,
    description: t.name,
    bounds: { minX: -half, maxX: half, minZ: -half, maxZ: half },
    spawn: { x: 0, z: 0 },
    catalogs: catalogs.map((c) => c.id),
    instances: [{ id: t.id, template: t.id, x: 0, z: 0 }],
  });
  const compiled = compileFacility(f, [t]);
  const map = (path: string): string =>
    path
      .replace(/^instances\.0\.template$/, "")
      .replace(/^rooms\.0\.?/, "")
      .replace(/^access\./, "zones.");
  const issues: Issue[] = compiled.issues.map((i) => ({ ...i, path: map(i.path) }));
  for (const i of checkFacility(compiled.facility, catalogs)) {
    // the synthetic facility's own fields (terrain, bounds, spawn, catalogs) are not the template's
    if (!/^(rooms|placements|patientSlots|staff|access)\b/.test(i.path)) continue;
    issues.push({ ...i, path: map(i.path) });
  }
  const provided = new Set<string>();
  const equipment = new Map(catalogs.flatMap((c) => c.equipment.map((e) => [e.id, e] as const)));
  for (const p of t.placements) {
    for (const cap of equipment.get(p.type)?.capabilities ?? []) provided.add(cap);
    for (const cap of p.capabilities ?? []) provided.add(cap);
  }
  t.capabilities.forEach((cap, i) => {
    if (!provided.has(cap)) issues.push(warn(`capabilities.${i}`, `template "${t.id}" declares "${cap}", which none of its equipment provides`));
  });
  return issues;
}
