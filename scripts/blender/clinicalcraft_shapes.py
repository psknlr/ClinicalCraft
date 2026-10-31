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
Needs Blender 4.1 or newer.
"""
from __future__ import annotations

import math
from typing import Iterable, Sequence

import bpy  # first: with the `bpy` module, bmesh is importable only once bpy is
import bmesh
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

    # ---------------------------------------------------------------- assemblies
    def caster(self, x: float, z: float, r: float = 0.04, wheel: str = "rubber", fork: str = "chrome", stem: float = 0.03) -> None:
        """A swivel caster standing on the floor at (x, z): wheel, hub, fork and stem up to y = 2r + stem."""
        w = r * 0.55
        self.cyl((x, r, z), r, w, wheel, axis="x", seg=14, bevel=r * 0.25)
        self.cyl((x, r, z), r * 0.45, w * 1.2, fork, axis="x", seg=8)
        self.box((x, r * 1.6, z - r * 0.2), (w * 1.5, r * 0.6, r * 1.2), fork, r=r * 0.12, seg=1)
        self.cyl((x, 2 * r + stem / 2, z), r * 0.28, stem + r * 0.2, fork, seg=8)

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
        transparent entry, glass), however many shapes and colours it has."""
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(name or self.eq.id)
        self.bm.to_mesh(me)
        self.bm.free()
        me.shade_smooth()
        me.set_sharp_from_angle(angle=self.smooth)
        defs = [self._def(m) for m in self.slots]
        glass = [i for i, d in enumerate(defs) if float(d.get("opacity", 1)) < 1]
        opaque = [i for i in range(len(defs)) if i not in glass]
        texel = {slot: n for n, slot in enumerate(opaque)}
        slot_material = {slot: 0 for slot in opaque} | {slot: 1 + n for n, slot in enumerate(glass)}
        # per-corner colour and palette coordinate
        indices = [0] * len(me.polygons)
        me.polygons.foreach_get("material_index", indices)
        col = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
        uv = me.uv_layers.new(name="UVMap")
        srgb = [_srgb(d["color"]) for d in defs]
        width = max(1, len(opaque))
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
        me.materials.append(palette_material(f"cc:{self.eq.id}", [defs[i] for i in opaque]))
        for slot in glass:
            me.materials.append(_glass_material(f"cc:{self.eq.id}:{self.slots[slot]}", defs[slot]))
        ob = bpy.data.objects.new(name or self.eq.id, me)
        self.col.objects.link(ob)
        return ob


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
