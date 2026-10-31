"""
The built-in catalogs' equipment models (docs/BLENDER.md): the builders that are more than
`refine` (the type's own voxel parts, refined); every other type is refined. `build.py` runs them.
"""
from __future__ import annotations

import math
from collections import defaultdict

from clinicalcraft_refine import refine
from clinicalcraft_shapes import Kit

#: type id -> builder(kit, equipment); every other built-in type is refined (build.py)
BUILDERS = {}


def builder(type_id):
    def register(fn):
        BUILDERS[type_id] = fn
        return fn
    return register


@builder("surgical-light")
def surgical_light(k: Kit, eq):
    """Ceiling surgical light: the refined mount, column and arms; two domed light heads, each with
    its glowing lens and the sterile handle in the middle."""
    heads = sorted({round(p["p"][0], 3) for p in eq.parts if p["m"] == "lightbox"})

    def head_part(_: int, p: dict) -> bool:
        return round(p["p"][0], 3) in heads and p["m"] in ("plastic", "lightbox", "teal") and p["p"][1] < 2.45

    refine(k, eq, skip=head_part)
    for x in heads:
        lens = min(p["p"][1] for p in eq.parts if p["m"] == "lightbox" and round(p["p"][0], 3) == x)
        yb = lens + 0.005
        k.lathe([(0.3, yb), (0.35, yb + 0.006), (0.355, yb + 0.04), (0.32, yb + 0.085), (0.22, yb + 0.13),
                 (0.1, yb + 0.16), (0.085, yb + 0.2), (0.0, yb + 0.205)], (x, 0, 0), "plastic", seg=48)
        k.cyl((x, yb - 0.003, 0), 0.29, 0.006, "lightbox", seg=48)
        k.torus((x, yb - 0.002, 0), 0.305, 0.008, "steel", seg=48, ring=8)
        k.cyl((x, yb - 0.065, 0), 0.028, 0.12, "teal", seg=20, bevel=0.01)
        k.torus((x, yb - 0.11, 0), 0.03, 0.008, "teal", seg=20, ring=8)


def scanner(k: Kit, eq):
    """A CT, MRI or PET-CT scanner: its gantry rings — each group of ten or more parts of one
    material at one depth, a housing when deep, the trim round the bore when 5 cm or thinner —
    revolved round the bore (centred on the trim), the rest of its parts refined (plinth, panels,
    screens, couch)."""
    groups: dict[tuple, list[int]] = defaultdict(list)
    for i, p in enumerate(eq.parts):
        groups[(round(p["p"][2], 3), round(p["s"][2], 3), p["m"])].append(i)
    rings = {key: idx for key, idx in groups.items() if len(idx) >= 10}
    trims = [key for key in rings if key[1] <= 0.05]
    ref = trims[0] if trims else max(rings, key=lambda key: len(rings[key]))
    ys = [y for i in rings[ref] for y in (eq.parts[i]["p"][1] - eq.parts[i]["s"][1] / 2, eq.parts[i]["p"][1] + eq.parts[i]["s"][1] / 2)]
    cy = (min(ys) + max(ys)) / 2
    for (z, depth, m), idx in rings.items():
        ps = [eq.parts[i] for i in idx]
        inner = min(math.hypot(max(abs(p["p"][0]) - p["s"][0] / 2, 0), max(abs(cy - p["p"][1]) - p["s"][1] / 2, 0)) for p in ps)
        half_w = max(abs(p["p"][0]) + p["s"][0] / 2 for p in ps)
        top = max(p["p"][1] + p["s"][1] / 2 for p in ps) - cy
        bottom = cy - min(p["p"][1] - p["s"][1] / 2 for p in ps)
        trim = depth <= 0.05
        k.gantry((0, cy), z - depth / 2, z + depth / 2, inner, half_w, top, bottom, m,
                 seg=64, power=2.0 if trim else 4.0, chamfer=0.004 if trim else 0.04)
    used = {i for idx in rings.values() for i in idx}
    refine(k, eq, skip=lambda i, _: i in used)


for _scanner in ("ct-scanner", "mri-scanner", "pet-ct-scanner"):
    BUILDERS[_scanner] = scanner


@builder("garden-bench")
def garden_bench(k: Kit, eq):
    """Garden bench: the cast side frames refined; the wooden seat and back as slats with gaps,
    the seat on cross rails, the back on posts."""
    seat, back = (p for p in eq.parts if p["m"] == "wood")
    refine(k, eq, skip=lambda _, p: p["m"] == "wood")
    (sx, sy, sz), (w, h, d) = seat["p"], seat["s"]
    top = sy + h / 2
    n, gap = 6, 0.025
    slat = (d - gap * (n - 1)) / n
    for i in range(n):
        z = sz - d / 2 + slat / 2 + i * (slat + gap)
        k.box((sx, top - 0.03, z), (w, 0.06, slat), "wood", r=0.012, seg=2)
    for x in (-w / 2 + 0.25, w / 2 - 0.25):
        k.box((x, top - 0.1, sz), (0.08, 0.08, d - 0.06), "darkwood", r=0.01, seg=1)
    (bx, by, bz), (bw, bh, bd) = back["p"], back["s"]
    n, gap = 4, 0.04
    slat = (bh - 0.12 - gap * (n - 1)) / n
    for i in range(n):
        y = by + bh / 2 - slat / 2 - i * (slat + gap)
        k.box((bx, y, bz), (bw, slat, 0.05), "wood", r=0.012, seg=2)
    for x in (-bw / 2 + 0.25, bw / 2 - 0.25):
        k.box((x, by - 0.02, bz - 0.04), (0.08, bh + 0.04, 0.06), "darkwood", r=0.01, seg=1)
