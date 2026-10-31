"""
Shapes in the ClinicalCraft frame for building equipment models in Blender (docs/BLENDER.md):
metres, x right, y up, z front, the origin at the footprint centre on the floor — the frame of
the voxel parts, so a model can be written straight from a type's parts. Every shape goes into
one mesh in the model collection (`cc-model`); palette entries that differ only in colour share a
material (the colour is a vertex colour), so a model costs the renderer a draw call per shading
class (`shading_class`), however many shapes and colours it has.

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
Needs Blender 4.1 or newer.
"""
from __future__ import annotations

import math
from typing import Iterable, Sequence

import bmesh
import bpy
from mathutils import Matrix, Vector

import clinicalcraft_blender as cc

Vec = Sequence[float]
#: Local axis turns: shapes are made along Blender +Z (the frame's y) and turned to x or z.
_AXIS = {"y": None, "x": (0, 0, -90), "z": (90, 0, 0)}


def B(v: Vec) -> Vector:
    """A point or direction of the ClinicalCraft frame in Blender's."""
    return Vector(cc.to_blender(v))


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
        self.bm = bmesh.new()
        self.slots: list[str] = []
        self.paints: dict[str, tuple[str, dict]] = {}
        self.smooth = math.radians(smooth_angle)

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

    # ---------------------------------------------------------------- assemblies
    def caster(self, x: float, z: float, r: float = 0.04, wheel: str = "rubber", fork: str = "chrome", stem: float = 0.03) -> None:
        """A swivel caster standing on the floor at (x, z): wheel, hub, fork and stem up to y = 2r + stem."""
        w = r * 0.55
        self.cyl((x, r, z), r, w, wheel, axis="x", seg=20, bevel=r * 0.25)
        self.cyl((x, r, z), r * 0.45, w * 1.2, fork, axis="x", seg=12)
        self.box((x, r * 1.6, z - r * 0.2), (w * 1.5, r * 0.6, r * 1.2), fork, r=r * 0.12, seg=2)
        self.cyl((x, 2 * r + stem / 2, z), r * 0.28, stem + r * 0.2, fork, seg=12)

    def screen_bezel(self, part: dict, m: str = "sc-matte-black", border: float = 0.02, depth: float = 0.03, r: float = 0.008) -> None:
        """A display housing behind a voxel `screen` part, its front just behind the part's front
        face, where the world draws the live display."""
        (px, py, pz), (sw, sh, sd) = part["p"], part["s"]
        self.box((px, py, pz + sd / 2 - 0.002 - depth / 2), (sw + 2 * border, sh + 2 * border, depth), m, r=r, rot=(0, part["r"], 0) if part.get("r") else None)

    # ---------------------------------------------------------------- done
    def finish(self, name: str | None = None):
        """The model object: one mesh, smooth-shaded with edges sharper than the kit's angle kept sharp.
        Materials that differ only in colour share one (`shading_class`): the colour goes to a colour
        attribute (glTF COLOR_0), so the model costs one draw call per class, not per colour; emissive
        and transparent materials keep their own."""
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(name or self.eq.id)
        self.bm.to_mesh(me)
        self.bm.free()
        me.shade_smooth()
        me.set_sharp_from_angle(angle=self.smooth)
        classes: list[tuple] = []
        slot_class: list[int] = []
        for m in self.slots:
            key = shading_class(self._def(m), m)
            if key not in classes:
                classes.append(key)
            slot_class.append(classes.index(key))
        col = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
        srgb = [_srgb(self._def(m)["color"]) for m in self.slots]
        loop_colours = [0.0] * (len(me.loops) * 4)
        indices = [0] * len(me.polygons)
        me.polygons.foreach_get("material_index", indices)
        for poly, slot in zip(me.polygons, indices):
            for li in poly.loop_indices:
                loop_colours[li * 4:li * 4 + 4] = srgb[slot]
        col.data.foreach_set("color_srgb", loop_colours)
        me.polygons.foreach_set("material_index", [slot_class[i] for i in indices])
        for key in classes:
            if key[0] == "own":
                me.materials.append(self._material(key[1]))
            else:
                me.materials.append(_class_material(key))
        ob = bpy.data.objects.new(name or self.eq.id, me)
        self.col.objects.link(ob)
        return ob


def shading_class(d: dict, m: str) -> tuple:
    """Materials of one class render alike but for their colour: roughness to the nearest of 0.35 /
    0.6 / 0.9, metalness 0 or 0.5. Emissive or transparent palette entries are their own class."""
    if d.get("emissive") or float(d.get("opacity", 1)) < 1:
        return ("own", m)
    r = min((0.35, 0.6, 0.9), key=lambda v: abs(v - float(d.get("roughness", 0.93))))
    return ("pbr", r, 0.5 if float(d.get("metalness", 0)) >= 0.25 else 0.0)


def _srgb(hex_color: str) -> list[float]:
    h = hex_color.lstrip("#")
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)] + [1.0]


def _class_material(key: tuple):
    """A shading class's material: base colour from the colour attribute, the class's roughness and metalness."""
    _, rough, metal = key
    name = f"cc:class:r{rough}:m{metal}"
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    if hasattr(mat, "use_nodes") and not mat.use_nodes:
        mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return mat
