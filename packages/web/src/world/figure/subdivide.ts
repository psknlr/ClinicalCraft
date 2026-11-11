/**
 * Smooth skin from a coarse cage: Catmull–Clark refinement of a polygon mesh, the way a modelled hand or face is
 * smoothed. A cage of a few hundred points (rings of four to six round each finger, a ring per joint) becomes a
 * surface without corners whose webs, knuckles and folds follow from how the cage is joined, not from pieces pushed
 * into one another. `subdivide` is one step (every face becomes one quad per corner); `limitPoints` puts the points
 * of an all-quad mesh where infinitely many steps would; `fitCage` moves a cage so that this limit surface passes
 * through the places the cage was drawn at (a cage's own surface lies inside it, thinner than it was meant).
 *
 * A point is `stride` numbers: x, y, z, then any channels (how far round to the back of the hand a point is, …),
 * refined exactly like the position. An open border (a wrist) stays a clean loop.
 */

/** A polygon mesh: `stride` numbers per point, faces of three or more point indices (outward when counter-clockwise). */
export interface PolyMesh {
  stride: number;
  points: Float64Array;
  faces: number[][];
}

interface Edges {
  /** Two point indices per edge. */
  ends: number[];
  /** Two face indices per edge; the second is −1 on a border. */
  sides: number[];
  /** Per face, the edge after each of its corners. */
  ofFace: number[][];
}

function edgesOf(m: PolyMesh): Edges {
  const n = m.points.length / m.stride;
  const index = new Map<number, number>();
  const ends: number[] = [], sides: number[] = [], ofFace: number[][] = [];
  m.faces.forEach((face, f) => {
    const list: number[] = [];
    for (let i = 0; i < face.length; i++) {
      const a = face[i]!, b = face[(i + 1) % face.length]!;
      const key = a < b ? a * n + b : b * n + a;
      let e = index.get(key);
      if (e === undefined) {
        e = ends.length / 2;
        index.set(key, e);
        ends.push(a, b);
        sides.push(f, -1);
      } else sides[2 * e + 1] = f;
      list.push(e);
    }
    ofFace.push(list);
  });
  return { ends, sides, ofFace };
}

/**
 * One Catmull–Clark step. The refined mesh keeps the points' order (then one point per face, then one per edge),
 * and face `f`'s children follow one another in the order of its corners — so after one step of an all-quad cage,
 * faces 4f … 4f+3 are cage face f.
 */
export function subdivide(m: PolyMesh): PolyMesh {
  const { stride: s, points: P, faces } = m;
  const nV = P.length / s, nF = faces.length;
  const { ends, sides, ofFace } = edgesOf(m);
  const nE = ends.length / 2;
  const out = new Float64Array((nV + nF + nE) * s);
  // a point in the middle of each face
  faces.forEach((face, f) => {
    const o = (nV + f) * s;
    for (const v of face) for (let k = 0; k < s; k++) out[o + k] = out[o + k]! + P[v * s + k]! / face.length;
  });
  // a point on each edge: between its ends and the middles of its two faces (on a border: between its ends)
  for (let e = 0; e < nE; e++) {
    const a = ends[2 * e]! * s, b = ends[2 * e + 1]! * s, o = (nV + nF + e) * s;
    const f0 = (nV + sides[2 * e]!) * s, f1 = sides[2 * e + 1]!;
    for (let k = 0; k < s; k++) out[o + k] = f1 < 0 ? (P[a + k]! + P[b + k]!) / 2 : (P[a + k]! + P[b + k]! + out[f0 + k]! + out[(nV + f1) * s + k]!) / 4;
  }
  // each point moves towards the average of what surrounds it
  const faceSum = new Float64Array(nV * s), midSum = new Float64Array(nV * s), borderSum = new Float64Array(nV * s);
  const nf = new Uint16Array(nV), ne = new Uint16Array(nV), nb = new Uint8Array(nV);
  faces.forEach((face, f) => {
    for (const v of face) {
      nf[v] = nf[v]! + 1;
      for (let k = 0; k < s; k++) faceSum[v * s + k] = faceSum[v * s + k]! + out[(nV + f) * s + k]!;
    }
  });
  for (let e = 0; e < nE; e++) {
    const a = ends[2 * e]!, b = ends[2 * e + 1]!;
    const border = sides[2 * e + 1]! < 0;
    ne[a] = ne[a]! + 1;
    ne[b] = ne[b]! + 1;
    if (border) {
      nb[a] = nb[a]! + 1;
      nb[b] = nb[b]! + 1;
    }
    for (let k = 0; k < s; k++) {
      const mid = (P[a * s + k]! + P[b * s + k]!) / 2;
      midSum[a * s + k] = midSum[a * s + k]! + mid;
      midSum[b * s + k] = midSum[b * s + k]! + mid;
      if (border) {
        borderSum[a * s + k] = borderSum[a * s + k]! + P[b * s + k]!;
        borderSum[b * s + k] = borderSum[b * s + k]! + P[a * s + k]!;
      }
    }
  }
  for (let v = 0; v < nV; v++) {
    const n = ne[v]!;
    for (let k = 0; k < s; k++) {
      const p = P[v * s + k]!;
      if (nb[v] === 2) out[v * s + k] = (6 * p + borderSum[v * s + k]!) / 8;
      else if (nb[v]! > 0 || !nf[v] || n < 3) out[v * s + k] = p;
      else out[v * s + k] = (faceSum[v * s + k]! / nf[v]! + (2 * midSum[v * s + k]!) / n + (n - 3) * p) / n;
    }
  }
  const refined: number[][] = [];
  faces.forEach((face, f) => {
    const n = face.length, edges = ofFace[f]!;
    for (let i = 0; i < n; i++) refined.push([face[i]!, nV + nF + edges[i]!, nV + f, nV + nF + edges[(i + n - 1) % n]!]);
  });
  return { stride: s, points: out, faces: refined };
}

/** Where each point of an all-quad mesh ends up on the smooth surface (the limit of refining for ever). */
export function limitPoints(m: PolyMesh): Float64Array {
  const { stride: s, points: P, faces } = m;
  const nV = P.length / s;
  const { ends, sides } = edgesOf(m);
  const edgeSum = new Float64Array(nV * s), diagSum = new Float64Array(nV * s), borderSum = new Float64Array(nV * s);
  const ne = new Uint16Array(nV), nb = new Uint8Array(nV);
  for (let e = 0; e < ends.length / 2; e++) {
    const a = ends[2 * e]!, b = ends[2 * e + 1]!;
    const border = sides[2 * e + 1]! < 0;
    ne[a] = ne[a]! + 1;
    ne[b] = ne[b]! + 1;
    if (border) {
      nb[a] = nb[a]! + 1;
      nb[b] = nb[b]! + 1;
    }
    for (let k = 0; k < s; k++) {
      edgeSum[a * s + k] = edgeSum[a * s + k]! + P[b * s + k]!;
      edgeSum[b * s + k] = edgeSum[b * s + k]! + P[a * s + k]!;
      if (border) {
        borderSum[a * s + k] = borderSum[a * s + k]! + P[b * s + k]!;
        borderSum[b * s + k] = borderSum[b * s + k]! + P[a * s + k]!;
      }
    }
  }
  for (const face of faces) {
    if (face.length !== 4) throw new Error("limitPoints: refine the mesh once first (a face is not a quad)");
    for (let i = 0; i < 4; i++) {
      const v = face[i]! * s, across = face[(i + 2) % 4]! * s;
      for (let k = 0; k < s; k++) diagSum[v + k] = diagSum[v + k]! + P[across + k]!;
    }
  }
  const out = new Float64Array(P.length);
  for (let v = 0; v < nV; v++) {
    const n = ne[v]!;
    for (let k = 0; k < s; k++) {
      const p = P[v * s + k]!;
      if (nb[v] === 2) out[v * s + k] = (4 * p + borderSum[v * s + k]!) / 6;
      else if (nb[v]! > 0 || n < 3) out[v * s + k] = p;
      else out[v * s + k] = (n * n * p + 4 * edgeSum[v * s + k]! + diagSum[v * s + k]!) / (n * (n + 5));
    }
  }
  return out;
}

/**
 * Move a cage's points so that its smooth surface passes (nearly) through where they were drawn: `rounds` times,
 * each point is shifted by what its place on the surface is short of its target. More rounds fit closer; a few
 * keep the surface from rippling between the targets.
 */
export function fitCage(target: PolyMesh, rounds = 5): PolyMesh {
  const n = target.points.length;
  let cage: PolyMesh = { stride: target.stride, points: Float64Array.from(target.points), faces: target.faces };
  for (let r = 0; r < rounds; r++) {
    const once = subdivide(cage);
    const limit = limitPoints(once);
    const next = Float64Array.from(cage.points);
    for (let i = 0; i < n; i++) next[i] = next[i]! + target.points[i]! - limit[i]!;
    cage = { stride: cage.stride, points: next, faces: cage.faces };
  }
  return cage;
}

/** A cage's smooth surface as triangles: its points (on the limit surface), and which of them lie on an open border. */
export interface SmoothSurface {
  stride: number;
  points: Float64Array;
  triangles: number[];
  border: number[];
}

/** The smooth surface of a cage after `levels` steps (at least one). */
export function smoothSurface(cage: PolyMesh, levels: number): SmoothSurface {
  let m = cage;
  for (let l = 0; l < Math.max(1, levels); l++) m = subdivide(m);
  const points = limitPoints(m);
  const s = m.stride;
  const triangles: number[] = [];
  const d2 = (a: number, b: number) => (points[a * s]! - points[b * s]!) ** 2 + (points[a * s + 1]! - points[b * s + 1]!) ** 2 + (points[a * s + 2]! - points[b * s + 2]!) ** 2;
  for (const [a, b, c, d] of m.faces as [number, number, number, number][]) {
    // split each quad along its shorter diagonal
    if (d2(a, c) <= d2(b, d)) triangles.push(a, b, c, a, c, d);
    else triangles.push(a, b, d, b, c, d);
  }
  const { ends, sides } = edgesOf(m);
  const onBorder = new Set<number>();
  for (let e = 0; e < sides.length / 2; e++) if (sides[2 * e + 1]! < 0) onBorder.add(ends[2 * e]!).add(ends[2 * e + 1]!);
  return { stride: s, points, triangles, border: [...onBorder] };
}
