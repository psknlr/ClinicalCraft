"""
ClinicalCraft <-> Blender: the equipment-model contract (docs/ASSETS.md, docs/BLENDER.md)
as a few bounded operations, for a person at Blender's Python console, for an agent
through blender-mcp's `execute_blender_code`, or headless (`blender -b -P …` or the
`bpy` module):

    import sys; sys.path.insert(0, "<ClinicalCraft>/scripts/blender")
    import clinicalcraft_blender as cc
    eq = cc.load_type("sc-mayo-stand", content=["<SurgeryCraft>/content"])
    print(cc.describe(eq))      # footprint, parts, screens, palette — what to model
    cc.blockout(eq)             # the voxel parts as boxes (collection "cc-blockout"), the footprint as a wire box
    # … model in collection "cc-model", over the blockout, with cc.material(eq, "steel") …
    ref = cc.export_model(eq, "<pack>/content/assets/models/sc-mayo-stand.glb",
                          license="CC0-1.0", use="cleared", source={"name": "…", "retrieved": "2026-10-30"})
    print(ref)                  # the catalog `model` reference: uri, sha256, scale, offset, licence, use, source

Then check it the way the renderer will load it:
`clinicalcraft assets inspect <file.glb> --type <id>`.

Frames. ClinicalCraft and glTF: metres, +Y up, the front facing +Z, the origin at the
footprint centre on the floor; a voxel part's `p` is its box centre. Blender is +Z up,
so a part at (x, y, z) sits at Blender (x, -z, y) and the front faces Blender -Y
(the Front view, numpad 1). A model built in place over the blockout is exported with
`scale: 1` and the `offset` that puts it back where it was built (the renderer centres a
model on the footprint and stands it on the floor before the offset).

Screens. Parts named "screen" are where the world draws live displays (vitals, PACS,
checklists); they keep drawing over a model, so leave their front faces clear.

Only `load_type`, `describe` and the frame helpers work without Blender.
"""
from __future__ import annotations

import hashlib
import json
import os
import struct
from pathlib import Path
from typing import Any, Iterable

try:  # inside Blender (or with the `bpy` module installed)
    import bmesh
    import bpy
    from mathutils import Vector
except ImportError:  # plain Python: catalog lookup and descriptions only
    bpy = None

#: Built-in content of the ClinicalCraft checkout this file belongs to.
CORE_CONTENT = Path(__file__).resolve().parents[2] / "packages" / "content"
#: Values of a model reference's `use` (core `MODEL_USE`).
MODEL_USE = ("cleared", "research-only", "pending")
#: Footprint axes under this (m) are aim allowances: a smaller model fits (core `MIN_FIT_AXIS`).
MIN_FIT_AXIS = 0.05
BLOCKOUT = "cc-blockout"
MODEL = "cc-model"


# --------------------------------------------------------------------------------------
# Catalogs (no Blender needed)
# --------------------------------------------------------------------------------------

class Equipment:
    """An equipment type and the palette (material id -> definition) it is drawn with."""

    def __init__(self, type_: dict, palette: dict[str, dict], catalog: str):
        self.type = type_
        self.palette = palette
        self.catalog = catalog

    @property
    def id(self) -> str:
        return self.type["id"]

    @property
    def footprint(self) -> dict:
        return self.type["footprint"]

    @property
    def parts(self) -> list[dict]:
        return self.type["parts"]

    def screens(self) -> list[dict]:
        return [p for p in self.parts if p.get("name") == "screen"]


def _catalog_files(content: Iterable[str | os.PathLike]) -> list[Path]:
    dirs = [CORE_CONTENT, *(Path(d) for d in content)]
    return [f for d in dirs for f in sorted((Path(d) / "catalogs").glob("*.json"))]


def load_type(type_id: str, content: Iterable[str | os.PathLike] = ()) -> Equipment:
    """The equipment type `type_id` from the built-in catalogs and those of `content` dirs."""
    palette: dict[str, dict] = {}
    found: tuple[dict, str] | None = None
    for f in _catalog_files(content):
        cat = json.loads(f.read_text(encoding="utf-8"))
        for m in cat.get("materials", []):
            palette[m["id"]] = m
        for e in cat.get("equipment", []):
            if e["id"] == type_id:
                found = (e, cat["id"])
    if not found:
        raise KeyError(f'unknown equipment type "{type_id}" (catalogs: {", ".join(str(f) for f in _catalog_files(content))})')
    return Equipment(found[0], palette, found[1])


def to_blender(v) -> tuple[float, float, float]:
    """ClinicalCraft / glTF (x, y up, z front) -> Blender (x, y back, z up)."""
    return (v[0], -v[2], v[1])


def to_gltf(v) -> tuple[float, float, float]:
    """Blender (x, y, z up) -> ClinicalCraft / glTF (x, y up, z front)."""
    return (v[0], v[2], -v[1])


def describe(eq: Equipment) -> str:
    """What to model: the footprint, the voxel parts by material, the screens to keep clear."""
    fp = eq.footprint
    name = eq.type.get("name", {}).get("en", eq.id)
    lines = [
        f"{eq.id} ({eq.catalog}) — {name}",
        f"footprint w {fp['w']} × d {fp['d']} × h {fp['h']} m (collider; the model should fill it)",
        "frame: origin = footprint centre on the floor; front = Blender -Y (glTF +Z); metres",
    ]
    by_mat: dict[str, int] = {}
    for p in eq.parts:
        by_mat[p["m"]] = by_mat.get(p["m"], 0) + 1
    lines.append("parts: " + ", ".join(f"{m} ×{n}" for m, n in sorted(by_mat.items())))
    for i, p in enumerate(eq.screens()):
        c, s = to_blender(p["p"]), p["s"]
        lines.append(f"screen {i}: centre {tuple(round(x, 3) for x in c)} (Blender), {s[0]} × {s[1]} m — keep its front face clear")
    if eq.type.get("portable"):
        lines.append(f"portable ({eq.type['portable']}): carried and handed over — keep it light")
    return "\n".join(lines)


# --------------------------------------------------------------------------------------
# Blender
# --------------------------------------------------------------------------------------

def _need_bpy() -> None:
    if bpy is None:
        raise RuntimeError("this operation runs inside Blender (or with the `bpy` module)")


def _linear(hex_color: str) -> tuple[float, float, float]:
    """sRGB hex -> linear RGB (Blender's colour inputs and glTF factors are linear)."""
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def collection(name: str, clear: bool = False):
    """The scene collection `name` (created if missing; emptied with `clear`)."""
    _need_bpy()
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    if clear:
        for o in list(col.all_objects):
            bpy.data.objects.remove(o, do_unlink=True)
    return col


def material(eq: Equipment | dict[str, dict], mid: str, *, name: str | None = None, **over: Any):
    """A Principled material from the world's palette entry `mid` (colour, roughness, metalness,
    emissive, opacity), so a model sits in its room like the voxel parts; `over` overrides
    (`color="#rrggbb"`, `roughness=…`, `metalness=…`, `emissive=…`, `emissiveIntensity=…`)."""
    _need_bpy()
    palette = eq.palette if isinstance(eq, Equipment) else eq
    d = {**palette.get(mid, {"color": "#c8c8c8"}), **over}
    key = name or f"cc:{mid}"
    mat = bpy.data.materials.get(key) or bpy.data.materials.new(key)
    if hasattr(mat, "use_nodes") and not mat.use_nodes:
        mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    rgb = _linear(d["color"])
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = float(d.get("roughness", 0.93))
    bsdf.inputs["Metallic"].default_value = float(d.get("metalness", 0))
    mat.diffuse_color = (*rgb, 1)  # viewport (solid mode)
    if d.get("emissive"):
        emit = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[emit].default_value = (*_linear(d["emissive"]), 1)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = float(d.get("emissiveIntensity", 0.3))
    alpha = float(d.get("opacity", 1))
    bsdf.inputs["Alpha"].default_value = alpha
    if alpha < 1 and hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "BLENDED"
    elif alpha < 1 and hasattr(mat, "blend_method"):
        mat.blend_method = "BLEND"
    return mat


def _box(name: str, centre, size, col, mat=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = centre
    if mat is not None:
        me.materials.append(mat)
    col.objects.link(ob)
    return ob


def blockout(eq: Equipment, name: str = BLOCKOUT):
    """The type's voxel parts as boxes in their palette colours (screens bright cyan: keep clear) and
    the footprint as a wire box, in collection `name` (replaced); never exported. Also makes the
    (empty) model collection `cc-model` to build in."""
    _need_bpy()
    col = collection(name, clear=True)
    for i, p in enumerate(eq.parts):
        screen = p.get("name") == "screen"
        mat = material({"screen": {"color": "#00e5ff", "emissive": "#00e5ff", "emissiveIntensity": 1}}, "screen", name="cc-blockout:screen") if screen else material(eq, p["m"])
        sx, sy, sz = p["s"]
        ob = _box(f"blk.{i:02d}.{'screen' if screen else p['m']}", to_blender(p["p"]), (sx, sz, sy), col, mat)
        if p.get("r"):
            import math
            ob.rotation_euler[2] = math.radians(p["r"])
        ob["cc_part"] = i
    fp = eq.footprint
    frame = _box("cc-footprint", (0, 0, fp["h"] / 2), (fp["w"], fp["d"], fp["h"]), col)
    frame.display_type = "WIRE"
    frame.hide_render = True
    collection(MODEL)
    return col


def _evaluated_bounds(objs) -> tuple[list[float], list[float]] | None:
    """World-space bounds of the meshes as exported (modifiers applied), in glTF axes."""
    deps = bpy.context.evaluated_depsgraph_get()
    lo = [float("inf")] * 3
    hi = [float("-inf")] * 3
    for ob in objs:
        if ob.type not in {"MESH", "CURVE", "SURFACE", "META", "FONT"}:
            continue
        ev = ob.evaluated_get(deps)
        me = ev.to_mesh()
        try:
            for v in me.vertices:
                g = to_gltf(ev.matrix_world @ v.co)
                for k in range(3):
                    lo[k] = min(lo[k], g[k])
                    hi[k] = max(hi[k], g[k])
        finally:
            ev.to_mesh_clear()
    return None if lo[0] == float("inf") else (lo, hi)


def _uri(path: Path) -> str:
    """The `uri` of a file under an `assets/` directory (served at /local-assets/), else models/<file>."""
    parts = path.resolve().parts
    if "assets" in parts:
        i = len(parts) - 1 - parts[::-1].index("assets")
        return "/".join(parts[i + 1:])
    return f"models/{path.name}"


def _canonical(glb: bytes) -> bytes:
    """The GLB as the renderer should get it, the same bytes for the same scene:

    * every indexed triangle list in a canonical order — each triangle turned to start at its
      smallest index (winding kept), the triangles sorted (Blender's exporter orders some by hash
      iteration, so one scene gave different files, and SHA-256 pins, run to run);
    * nearest-filtered textures (the palette texture of `clinicalcraft_shapes`) sampled without
      mipmaps, which would average neighbouring palette entries at a distance."""
    json_len = struct.unpack_from("<I", glb, 12)[0]
    doc = json.loads(glb[20:20 + json_len])
    bin_chunk = glb[20 + json_len:]
    body = bytearray(bin_chunk[8:])
    fmt = {5121: "B", 5123: "H", 5125: "I"}
    for mesh in doc.get("meshes", []):
        for prim in mesh.get("primitives", []):
            if prim.get("mode", 4) != 4 or "indices" not in prim:
                continue
            acc = doc["accessors"][prim["indices"]]
            view = doc["bufferViews"][acc["bufferView"]]
            code = fmt[acc["componentType"]]
            at = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
            n = acc["count"] - acc["count"] % 3
            idx = struct.unpack_from(f"<{n}{code}", body, at)
            tris = []
            for t in range(0, n, 3):
                tri = idx[t:t + 3]
                k = tri.index(min(tri))
                tris.append(tri[k:] + tri[:k])
            tris.sort()
            struct.pack_into(f"<{n}{code}", body, at, *[v for tri in tris for v in tri])
    for sampler in doc.get("samplers", []):
        if sampler.get("magFilter") == 9728:  # NEAREST
            sampler["minFilter"] = 9728
    text = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    text += b" " * (-len(text) % 4)
    out = bytearray(glb[:12]) + struct.pack("<I", len(text)) + b"JSON" + text + bin_chunk[:8] + body
    struct.pack_into("<I", out, 8, len(out))
    return bytes(out)


def export_model(
    eq: Equipment,
    path: str | os.PathLike,
    *,
    license: str,
    use: str,
    source: dict | None = None,
    attribution: dict | None = None,
    name: str = MODEL,
) -> dict:
    """Export collection `name` as a single-file GLB the renderer loads (metres, +Y up, modifiers
    applied; no animation, camera, light, extras or compression) and return its catalog `model`
    reference: `uri`, `sha256`, `scale: 1` and the `offset` that keeps it where it was built,
    then `license`, `attribution`, `source`, `use`. Warns when it does not fill the footprint."""
    _need_bpy()
    if use not in MODEL_USE:
        raise ValueError(f"use must be one of {MODEL_USE}")
    col = bpy.data.collections.get(name)
    objs = list(col.all_objects) if col else []
    if not objs:
        raise ValueError(f'collection "{name}" is empty: build the model there')
    bounds = _evaluated_bounds(objs)
    if bounds is None:
        raise ValueError(f'collection "{name}" has no geometry')
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    # select exactly the model (the blockout and anything else stay out)
    view = bpy.context.view_layer
    for ob in view.objects:
        ob.select_set(False)
    for ob in objs:
        if ob.name in view.objects:
            ob.select_set(True)
    credit = (attribution or {}).get("en") or (source or {}).get("name") or ""
    opts = dict(
        filepath=str(out), export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
        export_animations=False, export_cameras=False, export_lights=False, export_extras=False,
        export_draco_mesh_compression_enable=False, export_materials="EXPORT", export_image_format="AUTO",
        export_texcoords=True, export_normals=True, export_tangents=False,
        export_copyright=f"{credit} · {license}" if credit else license,
    )
    known = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    bpy.ops.export_scene.gltf(**{k: v for k, v in opts.items() if k == "filepath" or k in known})
    data = _canonical(out.read_bytes())
    out.write_bytes(data)
    lo, hi = bounds
    size = [hi[k] - lo[k] for k in range(3)]
    offset = [round((lo[0] + hi[0]) / 2, 4), round(lo[1], 4), round((lo[2] + hi[2]) / 2, 4)]
    ref: dict[str, Any] = {"uri": _uri(out), "sha256": hashlib.sha256(data).hexdigest(), "scale": 1}
    if any(abs(v) > 1e-4 for v in offset):
        ref["offset"] = [0.0 if abs(v) <= 1e-4 else v for v in offset]
    ref["license"] = license
    if attribution:
        ref["attribution"] = attribution
    if source:
        ref["source"] = source
    ref["use"] = use
    fp = eq.footprint
    # as the inspector measures it (core checkModelReference): vertically the top as placed
    placed = (size[0], lo[1] + size[1], size[2])
    for axis, got, want in zip(("w", "h (top)", "d"), placed, (fp["w"], fp["h"], fp["d"])):
        r = got / want if want else 1
        if want < MIN_FIT_AXIS and got < want:
            continue  # an aim allowance (core MIN_FIT_AXIS): a thinner model fits
        if r > 1.25 or r < 0.8:
            print(f"[clinicalcraft] {eq.id}: {axis} {got:.3f} m against the footprint's {want} m ({r:.0%})")
    return ref
