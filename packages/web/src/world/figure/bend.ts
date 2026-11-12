/**
 * Someone on their side over the break of a flexed table: the trunk bends sideways over it and both ends of the
 * body go down — which is what opens the spaces between the ribs of the side that is up. A geometry of the
 * figure's own (upright) frame is bent in its X–Y plane: within `span` of the height `at` the body follows an
 * arc, beyond it it goes straight on, turned by `angle`.
 */
import type { BufferAttribute, BufferGeometry } from "three";

export interface SideBend {
  /** The height the body bends about (figure units). */
  at: number;
  /** How far either way of it the bend is spread. */
  span: number;
  /** How far each end is turned down (radians). */
  angle: number;
  /** The side that is up, and so on the outside of the bend: 1 the left (+X), −1 the right. */
  up: 1 | -1;
}

/** Where a point of the body goes, and how far (radians about +Z) the body is turned there. */
export function bendPoint(b: SideBend, x: number, y: number): { x: number; y: number; turn: number } {
  if (b.angle === 0) return { x, y, turn: 0 };
  const k = b.angle / b.span;
  const s = y - b.at;
  const inside = Math.max(-b.span, Math.min(b.span, s));
  const phi = k * inside;
  // the middle line: an arc inside the span, straight on beyond it
  let cx = (-b.up * (1 - Math.cos(phi))) / k;
  let cy = b.at + Math.sin(phi) / k;
  const beyond = s - inside;
  cx += beyond * -b.up * Math.sin(phi);
  cy += beyond * Math.cos(phi);
  return { x: cx + x * Math.cos(phi), y: cy + x * b.up * Math.sin(phi), turn: b.up * phi };
}

/** Bend a geometry of the figure's frame (positions and normals; a head keeps its shape and is turned by its rig). */
export function bendGeometry(g: BufferGeometry, b: SideBend): void {
  if (b.angle === 0) return;
  const position = g.getAttribute("position") as BufferAttribute;
  const normal = g.getAttribute("normal") as BufferAttribute | undefined;
  for (let i = 0; i < position.count; i++) {
    const at = bendPoint(b, position.getX(i), position.getY(i));
    position.setXY(i, at.x, at.y);
    if (normal) {
      const c = Math.cos(at.turn), s = Math.sin(at.turn);
      const nx = normal.getX(i), ny = normal.getY(i);
      normal.setXY(i, nx * c - ny * s, nx * s + ny * c);
    }
  }
  position.needsUpdate = true;
  if (normal) normal.needsUpdate = true;
  g.computeBoundingBox();
  g.computeBoundingSphere();
}
