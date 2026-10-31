"""
Build the built-in catalogs' equipment models (docs/BLENDER.md): every type in
builtin_models.MODELLED is built in an empty Blender scene, in its own frame (a builder from
builtin_models.BUILDERS, else `refine` of its voxel parts), exported to
packages/content/assets/models/<type>.glb, and its catalog reference is written into the
catalog that defines the type (one `"model"` line after its parts; the rest of the file is kept).

    blender -b -P scripts/blender/build.py [-- <type id> …]
    python3 scripts/blender/build.py [<type id> …]        # a Python with the `bpy` module (Blender 4.1+)

Builds are reproducible: the same code and Blender version give the same bytes.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import bpy  # noqa: E402

import clinicalcraft_blender as cc  # noqa: E402
from builtin_models import BUILDERS, MODELLED  # noqa: E402
from clinicalcraft_refine import refine  # noqa: E402
from clinicalcraft_shapes import Kit  # noqa: E402

CONTENT = cc.CORE_CONTENT
OUT = CONTENT / "assets" / "models"
LICENSE = "MIT"
ATTRIBUTION = {
    "zh-CN": "ClinicalCraft 贡献者，依据该设备类型的体素部件在 Blender 中建模（scripts/blender）",
    "en": "ClinicalCraft contributors, modelled in Blender from the type's voxel parts (scripts/blender)",
}


def build(type_id: str) -> dict:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    eq = cc.load_type(type_id)
    k = Kit(eq)
    (BUILDERS.get(type_id) or refine)(k, eq)
    ob = k.finish()
    ref = cc.export_model(
        eq, OUT / f"{type_id}.glb", license=LICENSE, use="cleared", attribution=ATTRIBUTION,
        source={"name": "ClinicalCraft scripts/blender", "url": "https://github.com/psknlr/ClinicalCraft",
                "version": f"Blender {bpy.app.version_string}",
                "changes": "modelled procedurally from the type's voxel parts and footprint"},
    )
    tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
    print(f"{type_id}: {tris} triangles, {len(ob.data.materials)} material(s), {(OUT / f'{type_id}.glb').stat().st_size} B")
    return ref


def set_model(text: str, type_id: str, ref: dict) -> str:
    """The catalog text with `ref` as the `"model"` line of `type_id`'s entry (added after its parts, or replaced)."""
    start = text.index(f'"id": "{type_id}"')
    end = text.index("\n    }", start)
    line = '      "model": ' + json.dumps(ref, ensure_ascii=False, separators=(",", ":"))
    entry = text[start:end]
    at = entry.find('\n      "model": ')
    if at >= 0:
        stop = entry.find("\n", at + 1)
        stop = len(entry) if stop < 0 else stop
        entry = entry[:at] + "\n" + line + entry[stop:]
    else:
        entry = entry + ",\n" + line
    return text[:start] + entry + text[end:]


def main(argv: list[str]) -> None:
    ids = argv or MODELLED
    unknown = [i for i in ids if i not in MODELLED]
    if unknown:
        raise SystemExit(f"not in builtin_models.MODELLED: {', '.join(unknown)}")
    catalogs = {f: f.read_text(encoding="utf-8") for f in sorted((CONTENT / "catalogs").glob("*.json"))}
    for type_id in ids:
        ref = build(type_id)
        path = next(f for f, t in catalogs.items() if f'"id": "{type_id}"' in t)
        catalogs[path] = set_model(catalogs[path], type_id, ref)
    for path, text in catalogs.items():
        json.loads(text)  # still valid
        if path.read_text(encoding="utf-8") != text:
            path.write_text(text, encoding="utf-8")
    print(f"built {len(ids)} model(s) into {OUT}")


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ([] if Path(sys.argv[0]).name.startswith("blender") else sys.argv[1:]))
