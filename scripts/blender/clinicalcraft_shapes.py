"""
Shapes in the ClinicalCraft frame for building equipment models in Blender (docs/BLENDER.md):
metres, x right, y up, z front, the origin at the footprint centre on the floor — the frame of
the voxel parts, so a model can be written straight from a type's parts. Every shape goes into
one mesh in the model collection (`cc-model`) with one material for everything opaque (colours as
vertex colours, roughness, metalness and glow from a palette texture: `palette_material`), so a
model costs the renderer one draw call — plus one per transparent entry — however many shapes and
colours it has.

    import clinicalcraft_blender as cc
    from clinicalcraft_shapes import Kit
    eq = cc.load_type("sc-mayo-stand", content=["<SurgeryCraft>/content"])
    k = Kit(eq)                                   # empties cc-model
    k.box((0, 1.12, 0), (0.5, 0.03, 0.42), "steel", r=0.008)
    k.tube((-0.22, 0.04, -0.12), (-0.22, 1.1, -0.12), 0.016, "chrome")
    k.caster(-0.22, -0.18)
    k.finish()                                    # the mesh, smooth-shaded with sharp edges by angle
    cc.export_model(eq, path, license=…, use=…, source=…)

Materials are palette ids (the world's own colours) or names made with `k.paint(name, base, …)`.
Rotations are degrees about the frame's axes, `rot=(rx, ry, rz)`, applied x, then y, then z.

A model whose look follows its equipment's state has **layers** (docs/BLENDER.md "Layers"): shapes built
inside `with k.layer("scope"):` go to a mesh of their own — a node named `layer:scope` in the file — that
the world draws only in the states whose look names it (`behavior.states.<id>.look.layers`). A layer
shares the model's palette and material, and costs a draw call of its own while it is shown.

    k.box(…)                                      # the table: always drawn
    with k.layer("scope"):
        k.tube(…)                                 # drawn while the scope is in

Needs Blender 4.1 or newer.
"""
from __future__ import annotations

import math
import re
from contextlib import contextmanager
from typing import Iterable, Iterator, Sequence

import bpy  # first: with the `bpy` module, bmesh is importable only once bpy is
import bmesh
from mathutils import Matrix, Vector

import clinicalcraft_blender as cc

Vec = Sequence[float]
#: A layer's id (core `LayerIdSchema`): what follows `layer:` in the name of its node.
LAYER_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,39}$")
#: Local axis turns: shapes are made along Blender +Z (the frame's y) and turned to x or z.
_AXIS = {"y": None, "x": (0, 0, -90), "z": (90, 0, 0)}


def B(v: Vec) -> Vector:
    """A point or direction of the ClinicalCraft frame in Blender's."""
    return Vector(cc.to_blender(v))


#: For shapes turned about a frame axis: the two in-plane directions angles are measured between
#: (from the first towards the second) and the axis itself, in the ClinicalCraft frame.
_PLANES = {
    "x": (Vector((0, 0, 1)), Vector((0, 1, 0)), Vector((1, 0, 0))),
    "y": (Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, 1, 0))),
    "z": (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))),
}


def rotation(rot: Vec | None) -> Matrix:
    """Rotation (degrees about the frame's x, y, z, applied in that order) as a Blender matrix."""
    m = Matrix.Identity(4)
    for angle, axis in zip(rot or (), ((1, 0, 0), (0, 1, 0), (0, 0, 1))):
        if angle:
            m = Matrix.Rotation(math.radians(angle), 4, B(axis)) @ m
    return m


def rrect(w: float, d: float, r: float, n: int = 4) -> list[tuple[float, float]]:
    """Outline (x, z) of a w × d rectangle centred on the origin with corner radius r."""
    r = min(r, w / 2, d / 2)
    pts = []
    for cx, cz, a0 in ((w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90), (-w / 2 + r, -d / 2 + r, 180), (w / 2 - r, -d / 2 + r, 270)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return _dedupe(pts)


def _dedupe(pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
    out: list[tuple[float, float]] = []
    for p in pts:
        if not out or math.dist(out[-1], p) > 1e-7:
            out.append(p)
    if len(out) > 2 and math.dist(out[0], out[-1]) <= 1e-7:
        out.pop()
    return out


def _bevel(bm, edges, r: float, seg: int) -> None:
    if r > 0 and edges:
        bmesh.ops.bevel(bm, geom=list(edges), offset=r, segments=seg, profile=0.5, affect="EDGES", clamp_overlap=True)


class Kit:
    """Builds one model of `eq` in collection `name` (emptied)."""

    def __init__(self, eq: cc.Equipment, name: str = cc.MODEL, smooth_angle: float = 35):
        self.eq = eq
        self.col = cc.collection(name, clear=True)
        #: where shapes go now: the model's own mesh, or the mesh of the layer being built
        self.bm = bmesh.new()
        self.base = self.bm
        self.layers: dict[str, object] = {}
        self.slots: list[str] = []
        self.paints: dict[str, tuple[str, dict]] = {}
        self.smooth = math.radians(smooth_angle)

    # ---------------------------------------------------------------- layers
    @contextmanager
    def layer(self, name: str) -> Iterator["Kit"]:
        """Shapes built inside go to layer `name`: a mesh of its own, exported as a node named
        `layer:<name>`, which the world draws only in the states whose look names it. Entering a
        layer again adds to it; layers do not nest."""
        if not LAYER_ID.match(name):
            raise ValueError(f'layer "{name}": lower-case letters, digits, "_" and "-", starting with a letter or digit')
        if self.bm is not self.base:
            raise ValueError(f'layer "{name}" inside another layer: layers do not nest')
        if name not in self.layers:
            self.layers[name] = bmesh.new()
        self.bm = self.layers[name]
        try:
            yield self
        finally:
            self.bm = self.base

    # ---------------------------------------------------------------- materials
    def paint(self, name: str, base: str, **over) -> str:
        """A named material: the palette entry `base` with overrides (color, roughness, metalness, emissive…)."""
        self.paints[name] = (base, over)
        return name

    def _slot(self, m: str) -> int:
        if m not in self.slots:
            self.slots.append(m)
        return self.slots.index(m)

    def _material(self, m: str):
        if m in self.paints:
            base, over = self.paints[m]
            return cc.material(self.eq, base, name=f"cc:{self.eq.id}:{m}", **over)
        return cc.material(self.eq, m)

    def _def(self, m: str) -> dict:
        """The palette entry behind material name `m` (with a paint's overrides)."""
        base, over = self.paints.get(m, (m, {}))
        return {**self.eq.palette.get(base, {"color": "#c8c8c8"}), **over}

    def _commit(self, bm, m: str, at: Vec = (0, 0, 0), rot: Vec | None = None, local: Matrix | None = None) -> None:
        """Paint a shape built in its own bmesh, move it into place and append it to the model."""
        i = self._slot(m)
        for f in bm.faces:
            f.material_index = i
        mat = Matrix.Translation(B(at)) @ rotation(rot) @ (local or Matrix.Identity(4))
        bmesh.ops.transform(bm, matrix=mat, verts=bm.verts)
        me = bpy.data.meshes.new("cc-shape")
        bm.to_mesh(me)
        bm.free()
        self.bm.from_mesh(me)
        bpy.data.meshes.remove(me)

    # ---------------------------------------------------------------- shapes
    def box(self, at: Vec, size: Vec, m: str, r: float = 0.0, seg: int = 3, rot: Vec | None = None) -> None:
        """A box centred at `at`, size (w, h, d), its edges rounded with radius `r`."""
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        sx, sy, sz = size
        for v in bm.verts:
            v.co = Vector((v.co.x * sx, v.co.y * sz, v.co.z * sy))
        _bevel(bm, bm.edges, min(r, 0.49 * min(size)), seg)
        self._commit(bm, m, at, rot)

    def cyl(self, at: Vec, radius: float, height: float, m: str, axis: str = "y", seg: int = 24, r2: float | None = None, bevel: float = 0.0, rot: Vec | None = None) -> None:
        """A cylinder (a frustum with `r2`) centred at `at` along the frame's axis x, y or z; `bevel` rounds its rims."""
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=radius, radius2=radius if r2 is None else r2, depth=height)
        rims = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-9]
        _bevel(bm, rims, min(bevel, 0.45 * min(radius, r2 if r2 is not None else radius), 0.45 * height), 2)
        self._commit(bm, m, at, rot, rotation(_AXIS[axis]))

    def tube(self, a: Vec, b: Vec, radius: float, m: str, seg: int = 16, r2: float | None = None) -> None:
        """A round bar from point `a` to point `b` (a taper with `r2`)."""
        pa, pb = B(a), B(b)
        d = pb - pa
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=radius, radius2=radius if r2 is None else r2, depth=d.length)
        turn = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        bmesh.ops.transform(bm, matrix=Matrix.Translation((pa + pb) / 2) @ turn, verts=bm.verts)
        self._commit(bm, m)

    def path(self, points: Sequence[Vec], radius: float, m: str, seg: int = 12) -> None:
        """A bent bar through `points` (a tube per segment, a ball at each inner joint)."""
        for a, b in zip(points, points[1:]):
            self.tube(a, b, radius, m, seg)
        for p in points[1:-1]:
            self.ball(p, radius, m, seg=seg)

    def ball(self, at: Vec, radius: float, m: str, seg: int = 16, squash: Vec = (1, 1, 1)) -> None:
        """A sphere (an ellipsoid with `squash` = (x, y, z) factors)."""
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg // 2), radius=radius)
        sx, sy, sz = squash
        for v in bm.verts:
            v.co = Vector((v.co.x * sx, v.co.y * sz, v.co.z * sy))
        self._commit(bm, m, at)

    def torus(self, at: Vec, R: float, r: float, m: str, axis: str = "y", seg: int = 24, ring: int = 10, stretch: tuple[float, float] = (1, 1), rot: Vec | None = None) -> None:
        """A ring of major radius R and tube radius r around `axis`; `stretch` makes it oval (a finger ring)."""
        bm = bmesh.new()
        rows = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            row = []
            for j in range(ring):
                b = 2 * math.pi * j / ring
                k = R + r * math.cos(b)
                row.append(bm.verts.new((k * math.cos(a) * stretch[0], k * math.sin(a) * stretch[1], r * math.sin(b))))
            rows.append(row)
        for i in range(seg):
            for j in range(ring):
                bm.faces.new((rows[i][j], rows[(i + 1) % seg][j], rows[(i + 1) % seg][(j + 1) % ring], rows[i][(j + 1) % ring]))
        self._commit(bm, m, at, rot, rotation(_AXIS[axis]))

    def lathe(self, profile: Sequence[tuple[float, float]], at: Vec, m: str, axis: str = "y", seg: int = 24, rot: Vec | None = None) -> None:
        """A body of revolution: `profile` is (radius, position along the axis) from one end to the
        other; a radius of 0 closes that end in a point, otherwise the end is capped flat."""
        bm = bmesh.new()
        rings = []
        for rad, h in profile:
            if rad <= 1e-6:
                rings.append([bm.verts.new((0, 0, h))])
            else:
                rings.append([bm.verts.new((rad * math.cos(2 * math.pi * i / seg), rad * math.sin(2 * math.pi * i / seg), h)) for i in range(seg)])
        for r0, r1 in zip(rings, rings[1:]):
            if len(r0) == 1 and len(r1) == 1:
                continue
            for i in range(seg):
                j = (i + 1) % seg
                if len(r0) == 1:
                    bm.faces.new((r0[0], r1[i], r1[j]))
                elif len(r1) == 1:
                    bm.faces.new((r0[i], r0[j], r1[0]))
                else:
                    bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
        if len(rings[0]) > 1:
            bm.faces.new(list(reversed(rings[0])))
        if len(rings[-1]) > 1:
            bm.faces.new(rings[-1])
        self._commit(bm, m, at, rot, rotation(_AXIS[axis]))

    def slab(self, outline: Iterable[tuple[float, float]], y0: float, thickness: float, m: str, at: Vec = (0, 0, 0), r: float = 0.0, seg: int = 2, rot: Vec | None = None) -> None:
        """A flat piece: `outline` (x, z) seen from above, from height y0 up by `thickness` — a blade,
        a handle, a rounded table top (`rrect`); `r` rounds its top and bottom rims."""
        pts = [cc.to_blender((x, 0, z))[:2] for x, z in _dedupe(list(outline))]
        n = len(pts)
        if sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n)) < 0:
            pts.reverse()  # counter-clockwise seen from above: outward side faces
        bm = bmesh.new()
        bottom = [bm.verts.new((x, y, y0)) for x, y in pts]
        top = [bm.verts.new((x, y, y0 + thickness)) for x, y in pts]
        bm.faces.new(top)
        bm.faces.new(list(reversed(bottom)))
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((bottom[i], bottom[j], top[j], top[i]))
        rims = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-9]
        _bevel(bm, rims, min(r, 0.45 * thickness), seg)
        self._commit(bm, m, at, rot)

    def panel(self, outline: Iterable[tuple[float, float]], z0: float, thickness: float, m: str, r: float = 0.0, seg: int = 2) -> None:
        """A flat piece standing up: `outline` (x, y) seen from the front, from depth z0 forwards by
        `thickness` — a headboard, a backrest, a sign; `r` rounds its front and back rims."""
        self.slab([(x, -y) for x, y in outline], z0, thickness, m, r=r, seg=seg, rot=(90, 0, 0))

    def side(self, outline: Iterable[tuple[float, float]], x0: float, thickness: float, m: str, r: float = 0.0, seg: int = 2) -> None:
        """A flat piece standing up seen from the side: `outline` (z, y), from x0 towards +x by
        `thickness` — a side rail, a cart's end panel, a wheel guard; `r` rounds its rims."""
        self.slab([(-y, z) for z, y in outline], x0, thickness, m, r=r, seg=seg, rot=(0, 0, -90))

    def gantry(self, centre: Vec, z0: float, z1: float, inner: float, half_w: float, top: float, bottom: float, m: str,
               seg: int = 64, power: float = 4.0, chamfer: float = 0.03) -> None:
        """A ring housing around the frame's z axis through `centre` (x, y), from z0 (back) to z1 (front):
        a squircle outside (`power` 4; 2 is an ellipse) reaching `half_w` sideways, `top` above and
        `bottom` below the centre, a round bore of radius `inner`, edges chamfered — a CT, MRI or PET
        gantry, or the trim round a bore."""
        depth = z1 - z0
        ch = max(0.0, min(chamfer, depth / 3, (min(half_w, top, bottom) - inner) / 3))
        cx, cy = centre[0], centre[1]
        bm = bmesh.new()

        def outer(t: float) -> float:
            c, s_ = math.cos(t), math.sin(t)
            b = top if s_ >= 0 else bottom
            return (abs(c / half_w) ** power + abs(s_ / b) ** power) ** (-1 / power)

        angles = [2 * math.pi * i / seg for i in range(seg)]
        rings = []
        for kind, dr, z in (("o", -ch, z1), ("o", 0, z1 - ch), ("o", 0, z0 + ch), ("o", -ch, z0),
                            ("i", ch, z0), ("i", 0, z0 + ch), ("i", 0, z1 - ch), ("i", ch, z1)):
            ring = []
            for t in angles:
                r = (outer(t) if kind == "o" else inner) + dr
                ring.append(bm.verts.new(B((cx + r * math.cos(t), cy + r * math.sin(t), z))))
            rings.append(ring)
        for a, b_ in zip(rings, rings[1:] + rings[:1]):
            for i in range(seg):
                j = (i + 1) % seg
                bm.faces.new((a[i], a[j], b_[j], b_[i]))
        self._commit(bm, m)

    def revolve(self, profile: Sequence[tuple[float, float]], centre: Vec, m: str, axis: str = "y", a0: float = 0.0, a1: float = 360.0,
                seg: int = 32) -> None:
        """A closed section swept round `axis` through `centre`: `profile` is the section's outline as
        (radius, position along the axis) points, three or more. A full turn is a ring (a tyre, a
        bezel, a trim); from `a0` to `a1` degrees it is an arc with flat ends (the C of a C-arm, a
        curved rail, a handle). Angles turn from the first in-plane axis towards the second —
        axis "x": from +z (front) up to +y; "y": from +x to +z; "z": from +x up to +y."""
        e1, e2, ax = _PLANES[axis]
        full = abs(a1 - a0) >= 360 - 1e-6
        n = max(3, seg if full else math.ceil(seg * abs(a1 - a0) / 360))
        steps = n if full else n + 1
        c = Vector(centre)
        pts = [(float(r), float(h)) for r, h in profile]
        bm = bmesh.new()
        rings = []
        for i in range(steps):
            t = math.radians(a0 + (a1 - a0) * i / n)
            radial = e1 * math.cos(t) + e2 * math.sin(t)
            rings.append([bm.verts.new(B(c + radial * r + ax * h)) for r, h in pts])
        k = len(pts)
        for i in range(n):
            a, b = rings[i], rings[(i + 1) % steps]
            for j in range(k):
                bm.faces.new((a[j], a[(j + 1) % k], b[(j + 1) % k], b[j]))
        if not full:
            bm.faces.new(rings[0])
            bm.faces.new(list(reversed(rings[-1])))
        self._commit(bm, m)

    def _sweep(self, line: list[Vector], radius: float, m: str, seg: int, r2: float | None = None) -> None:
        """A round tube along the polyline `line` (frame coordinates): a ring at every point, turned to
        the bisector of the segments meeting there and carried along without twisting (parallel
        transport), the ends capped flat; `r2` tapers it."""
        line = [p for i, p in enumerate(line) if i == 0 or (p - line[i - 1]).length > 1e-7]
        n = len(line)
        if n < 2:
            return
        dirs = [(b - a).normalized() for a, b in zip(line, line[1:])]
        tangents = [dirs[0]] + [((a + b).normalized() if (a + b).length > 1e-9 else b) for a, b in zip(dirs, dirs[1:])] + [dirs[-1]]
        ref = Vector((0, 1, 0)) if abs(tangents[0].y) < 0.9 else Vector((1, 0, 0))
        normal = (ref - tangents[0] * ref.dot(tangents[0])).normalized()
        bm = bmesh.new()
        rings = []
        for i in range(n):
            if i:
                carried = normal - tangents[i] * normal.dot(tangents[i])
                if carried.length > 1e-9:
                    normal = carried.normalized()
            binormal = tangents[i].cross(normal)
            rad = radius if r2 is None else radius + (r2 - radius) * i / (n - 1)
            rings.append([bm.verts.new(B(line[i] + (normal * math.cos(2 * math.pi * j / seg) + binormal * math.sin(2 * math.pi * j / seg)) * rad)) for j in range(seg)])
        for a, b in zip(rings, rings[1:]):
            for j in range(seg):
                bm.faces.new((a[j], a[(j + 1) % seg], b[(j + 1) % seg], b[j]))
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
        self._commit(bm, m)

    def hose(self, points: Sequence[Vec], radius: float, m: str, seg: int = 8, steps: int = 4, r2: float | None = None) -> None:
        """A smooth round hose or cable through `points`: one tube swept along the centripetal
        Catmull-Rom spline through them (`steps` rings per span; no overshoot where the points are
        unevenly spaced), tapering to `r2` — a breathing limb, a suction line, a cable; far fewer
        triangles than `path`, with no joints to see."""
        ctrl = [Vector(p) for p in points]
        ctrl = [p for i, p in enumerate(ctrl) if i == 0 or (p - ctrl[i - 1]).length > 1e-7]
        if len(ctrl) < 2:
            return
        ext = [ctrl[0] * 2 - ctrl[1]] + ctrl + [ctrl[-1] * 2 - ctrl[-2]]
        line = [ctrl[0]]
        for i in range(1, len(ext) - 2):
            p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
            t0 = 0.0
            t1 = t0 + math.sqrt((p1 - p0).length)
            t2 = t1 + math.sqrt((p2 - p1).length)
            t3 = t2 + math.sqrt((p3 - p2).length)
            for s_ in range(1, steps + 1):
                t = t1 + (t2 - t1) * s_ / steps
                a1 = p0 * ((t1 - t) / (t1 - t0)) + p1 * ((t - t0) / (t1 - t0))
                a2 = p1 * ((t2 - t) / (t2 - t1)) + p2 * ((t - t1) / (t2 - t1))
                a3 = p2 * ((t3 - t) / (t3 - t2)) + p3 * ((t - t2) / (t3 - t2))
                b1 = a1 * ((t2 - t) / (t2 - t0)) + a2 * ((t - t0) / (t2 - t0))
                b2 = a2 * ((t3 - t) / (t3 - t1)) + a3 * ((t - t1) / (t3 - t1))
                line.append(b1 * ((t2 - t) / (t2 - t1)) + b2 * ((t - t1) / (t2 - t1)))
        self._sweep(line, radius, m, seg, r2)

    def pipe(self, points: Sequence[Vec], radius: float, m: str, bend: float = 0.03, seg: int = 8, step: float = 22.5) -> None:
        """A bent tube through `points`: straight runs joined by round bends of radius `bend` (less
        where a run is too short for it), a ring every `step` degrees of a bend — a bed rail, a
        trolley handle, a chair frame; one tube, no joints."""
        ctrl = [Vector(p) for p in points]
        ctrl = [p for i, p in enumerate(ctrl) if i == 0 or (p - ctrl[i - 1]).length > 1e-7]
        if len(ctrl) < 2:
            return
        line = [ctrl[0]]
        for i in range(1, len(ctrl) - 1):
            a, p, b = ctrl[i - 1], ctrl[i], ctrl[i + 1]
            d1, d2 = (p - a).normalized(), (b - p).normalized()
            turn = d1.angle(d2, 0.0)
            if turn < math.radians(1) or turn > math.radians(179):
                line.append(p)
                continue
            # the bend starts and ends `reach` from the corner; at most half of either run
            reach = min(bend * math.tan(turn / 2), 0.5 * (p - a).length, 0.5 * (b - p).length)
            rad = reach / math.tan(turn / 2)
            start, stop = p - d1 * reach, p + d2 * reach
            centre = p + (d2 - d1).normalized() * (rad / math.cos(turn / 2))
            n = max(2, math.ceil(math.degrees(turn) / step))
            u, v = start - centre, stop - centre
            for j in range(n + 1):
                t = j / n
                w = (u * math.sin((1 - t) * turn) + v * math.sin(t * turn)) / math.sin(turn)
                line.append(centre + w)
        line.append(ctrl[-1])
        self._sweep(line, radius, m, seg)

    # ---------------------------------------------------------------- assemblies
    def caster(self, x: float, z: float, r: float = 0.04, wheel: str = "rubber", fork: str = "chrome", stem: float = 0.03, lite: bool = False) -> None:
        """A swivel caster standing on the floor at (x, z): wheel, hub, fork and stem up to y = 2r + stem.
        `lite` is the same caster in two fifths of the triangles, for small ones and for types
        placed in numbers (a stool's five, a bed's four)."""
        w = r * 0.55
        if lite:
            self.lathe([(r * 0.62, -w / 2), (r, -w * 0.22), (r, w * 0.22), (r * 0.62, w / 2)], (x, r, z), wheel, axis="x", seg=10)
            self.box((x, r * 1.6, z - r * 0.2), (w * 1.5, r * 0.6, r * 1.2), fork)
            self.cyl((x, 2 * r + stem / 2, z), r * 0.28, stem + r * 0.2, fork, seg=6)
            return
        self.cyl((x, r, z), r, w, wheel, axis="x", seg=14, bevel=r * 0.25)
        self.cyl((x, r, z), r * 0.45, w * 1.2, fork, axis="x", seg=8)
        self.box((x, r * 1.6, z - r * 0.2), (w * 1.5, r * 0.6, r * 1.2), fork, r=r * 0.12, seg=1)
        self.cyl((x, 2 * r + stem / 2, z), r * 0.28, stem + r * 0.2, fork, seg=8)

    def wheel(self, at: Vec, radius: float, width: float, tyre: str = "rubber", hub: str = "chrome", axis: str = "x", spokes: int = 0,
              tread: float = 0.22, seg: int = 20) -> None:
        """A wheel centred at `at`, turning about `axis`: a rounded tyre (`tread` of the radius thick),
        then a rim, hub and `spokes` spokes across it, or (0) a solid disc — a trolley's or a bed's
        wheel, a wheelchair's drive wheel."""
        t = radius * tread
        w = width / 2
        self.revolve([(radius - t, -w), (radius - 0.3 * t, -w), (radius, -0.45 * w), (radius, 0.45 * w), (radius - 0.3 * t, w), (radius - t, w)], at, tyre, axis=axis, seg=seg)
        if spokes:
            self.revolve([(radius - t, -w * 0.7), (radius - t, w * 0.7), (radius - t * 1.6, 0.0)], at, hub, axis=axis, seg=seg)
            self.cyl(at, radius * 0.14, width * 0.9, hub, axis=axis, seg=8)
            e1, e2, _ = _PLANES[axis]
            for i in range(spokes):
                a = math.pi * i / spokes
                d = e1 * math.cos(a) + e2 * math.sin(a)
                self.tube(Vector(at) - d * (radius - t * 1.3), Vector(at) + d * (radius - t * 1.3), radius * 0.03, hub, seg=4)
        else:
            self.cyl(at, radius - t * 0.9, width * 0.7, hub, axis=axis, seg=seg)
            self.cyl(at, radius * 0.22, width * 0.95, tyre, axis=axis, seg=8)

    def gauge(self, at: Vec, radius: float, axis: str = "z", face: str = "paper", bezel: str = "chrome", needle: str = "ambulance-red", depth: float = 0.012,
              angle: float = 35.0) -> None:
        """A dial gauge facing along +`axis` with its back at `at`: the body (in the bezel's material),
        the face and the needle — a regulator's contents gauge, a suction gauge, a thermometer dial."""
        e1, e2, ax = _PLANES[axis]
        c = Vector(at)
        self.cyl(c + ax * (depth / 2), radius, depth, bezel, axis=axis, seg=16)
        self.cyl(c + ax * (depth + 0.0006), radius * 0.86, 0.0012, face, axis=axis, seg=16)
        a = math.radians(angle)
        tip = (e1 * math.cos(a) + e2 * math.sin(a)) * radius * 0.7
        self.tube(c + ax * (depth + 0.002) - tip * 0.15, c + ax * (depth + 0.002) + tip, radius * 0.06, needle, seg=4)

    def screen_bezel(self, part: dict, m: str = "sc-matte-black", border: float = 0.02, depth: float = 0.03, r: float = 0.008) -> None:
        """A display housing behind a voxel `screen` part, its front just behind the part's front
        face, where the world draws the live display."""
        (px, py, pz), (sw, sh, sd) = part["p"], part["s"]
        self.box((px, py, pz + sd / 2 - 0.002 - depth / 2), (sw + 2 * border, sh + 2 * border, depth), m, r=r, rot=(0, part["r"], 0) if part.get("r") else None)

    # ---------------------------------------------------------------- done
    def finish(self, name: str | None = None):
        """The model object: one mesh, smooth-shaded with edges sharper than the kit's angle kept sharp,
        and **one material** for everything opaque (`palette_material`): the colour of each face is a
        vertex colour (glTF COLOR_0) and its roughness, metalness and glow come from a palette texture
        with a texel per palette entry, so a model costs the renderer one draw call (plus one per
        transparent entry, glass), however many shapes and colours it has. Each layer (`layer`) is a
        further object named `layer:<id>`, made the same way with the same materials — a draw call more
        while the world shows it. Returns the model's own object (what is in no layer)."""
        if self.bm is not self.base:
            raise ValueError("finish() inside a layer")
        defs = [self._def(m) for m in self.slots]
        glass = [i for i, d in enumerate(defs) if float(d.get("opacity", 1)) < 1]
        opaque = [i for i in range(len(defs)) if i not in glass]
        texel = {slot: n for n, slot in enumerate(opaque)}
        slot_material = {slot: 0 for slot in opaque} | {slot: 1 + n for n, slot in enumerate(glass)}
        srgb = [_srgb(d["color"]) for d in defs]
        width = max(1, len(opaque))
        materials = [palette_material(f"cc:{self.eq.id}", [defs[i] for i in opaque])]
        materials += [_glass_material(f"cc:{self.eq.id}:{self.slots[slot]}", defs[slot]) for slot in glass]

        def make(bm, title: str):
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            me = bpy.data.meshes.new(title)
            bm.to_mesh(me)
            bm.free()
            me.shade_smooth()
            me.set_sharp_from_angle(angle=self.smooth)
            # per-corner colour and palette coordinate
            indices = [0] * len(me.polygons)
            me.polygons.foreach_get("material_index", indices)
            col = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
            uv = me.uv_layers.new(name="UVMap")
            colours = [0.0] * (len(me.loops) * 4)
            uvs = [0.5] * (len(me.loops) * 2)
            for poly, slot in zip(me.polygons, indices):
                u = (texel.get(slot, 0) + 0.5) / width
                for li in poly.loop_indices:
                    colours[li * 4:li * 4 + 4] = srgb[slot]
                    uvs[li * 2] = u
            col.data.foreach_set("color_srgb", colours)
            uv.data.foreach_set("uv", uvs)
            me.polygons.foreach_set("material_index", [slot_material[i] for i in indices])
            for material in materials:
                me.materials.append(material)
            ob = bpy.data.objects.new(title, me)
            self.col.objects.link(ob)
            return ob

        ob = make(self.base, name or self.eq.id)
        # layers in the order of their names: the same scene gives the same file
        for layer in sorted(self.layers):
            if not self.layers[layer].faces:
                print(f'[clinicalcraft] {self.eq.id}: layer "{layer}" is empty — left out')
                self.layers[layer].free()
                continue
            make(self.layers[layer], f"layer:{layer}")
        self.layers = {}
        return ob

    def triangles(self) -> dict[str, int]:
        """Triangles built so far: of the model's own mesh (`""`) and of each layer."""
        count = lambda bm: sum(len(f.verts) - 2 for f in bm.faces)  # noqa: E731
        return {"": count(self.base)} | {name: count(bm) for name, bm in sorted(self.layers.items())}


def _srgb(hex_color: str) -> list[float]:
    h = hex_color.lstrip("#")
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)] + [1.0]


def _to_srgb(c: float) -> float:
    c = max(0.0, min(1.0, c))
    return c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def _nodes(mat):
    if hasattr(mat, "use_nodes") and not mat.use_nodes:
        mat.use_nodes = True
    nt = mat.node_tree
    return nt, next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")


def palette_material(name: str, entries: list[dict]):
    """One material for a model's opaque palette entries: base colour from the colour attribute "Col",
    roughness (G) and metalness (B) from a non-colour palette texture, glow from an emissive palette
    texture times the largest `emissiveIntensity`; a texel per entry, sampled at texel centres with
    nearest filtering (the export turns mipmaps off: `clinicalcraft_blender._canonical`)."""
    width = max(1, len(entries))
    orm = bpy.data.images.new(f"{name}:orm", width=width, height=1, alpha=False)
    orm.colorspace_settings.name = "Non-Color"
    glow = bpy.data.images.new(f"{name}:emissive", width=width, height=1, alpha=False)
    strength = max([float(d.get("emissiveIntensity", 0.3)) for d in entries if d.get("emissive")] or [1.0])
    orm_px, glow_px = [], []
    for d in entries or [{"color": "#000000"}]:
        orm_px += [1.0, float(d.get("roughness", 0.93)), float(d.get("metalness", 0)), 1.0]
        if d.get("emissive"):
            k = float(d.get("emissiveIntensity", 0.3)) / strength
            glow_px += [_to_srgb(c * k) for c in cc._linear(d["emissive"])] + [1.0]
        else:
            glow_px += [0.0, 0.0, 0.0, 1.0]
    orm.pixels = orm_px
    glow.pixels = glow_px
    orm.pack()
    glow.pack()
    mat = bpy.data.materials.new(name)
    mat.use_backface_culling = True
    nt, bsdf = _nodes(mat)
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    t_orm = nt.nodes.new("ShaderNodeTexImage")
    t_orm.image, t_orm.interpolation = orm, "Closest"
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(t_orm.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    if any(d.get("emissive") for d in entries):
        t_glow = nt.nodes.new("ShaderNodeTexImage")
        t_glow.image, t_glow.interpolation = glow, "Closest"
        emit = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        nt.links.new(t_glow.outputs["Color"], bsdf.inputs[emit])
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def _glass_material(name: str, d: dict):
    """A transparent palette entry (glass, acrylic): colour from the colour attribute, its own opacity."""
    mat = bpy.data.materials.new(name)
    mat.use_backface_culling = True
    nt, bsdf = _nodes(mat)
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = float(d.get("roughness", 0.93))
    bsdf.inputs["Metallic"].default_value = float(d.get("metalness", 0))
    bsdf.inputs["Alpha"].default_value = float(d.get("opacity", 1))
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "BLENDED"
    elif hasattr(mat, "blend_method"):
        mat.blend_method = "BLEND"
    return mat
