"""
The built-in catalogs' equipment models (docs/BLENDER.md): the builders that are more than
`refine` (the type's own voxel parts, refined); every other type is refined. `build.py` runs them.
"""
from __future__ import annotations

import math
from collections import defaultdict

from clinicalcraft_refine import refine
from clinicalcraft_shapes import Kit, rrect

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


def moved(outline, dx: float = 0.0, dy: float = 0.0):
    """An outline shifted by (dx, dy)."""
    return [(x + dx, y + dy) for x, y in outline]


# ------------------------------------------------------------------------------------------------
# beds and seats
# ------------------------------------------------------------------------------------------------

@builder("hospital-bed")
def hospital_bed(k: Kit, eq):
    """Electric ward bed: braked castors, the undercarriage and its two lift columns, the mattress
    platform, a mattress with pillow, turned-down sheet and blanket (the lying height of the voxel
    parts), moulded head and foot boards with grip rails — the foot board carrying the nurse
    control panel —, split side rails with their controls, corner bumpers, the brake bar at the
    foot end and the red CPR release under the head end."""
    for x in (-0.38, 0.38):
        for z in (-0.9, 0.9):
            k.caster(x, z, r=0.055, stem=0.04, lite=True)
    k.slab(rrect(0.84, 1.9, 0.1, 3), 0.18, 0.12, "plastic", r=0.03)
    k.box((0, 0.172, 0), (0.6, 0.03, 1.4), "coal")
    k.tube((-0.3, 0.1, 1.0), (0.3, 0.1, 1.0), 0.011, "steel", seg=6)
    for x, m in ((-0.33, "ambulance-red"), (0.33, "green")):
        k.box((x, 0.1, 1.03), (0.08, 0.016, 0.07), m, r=0.006, seg=1)
    for z in (-0.55, 0.55):
        k.box((0, 0.345, z), (0.26, 0.11, 0.2), "steel", r=0.02, seg=1)
        k.box((0, 0.42, z), (0.2, 0.08, 0.15), "chrome", r=0.012, seg=1)
    # platform, mattress, bedding
    k.slab(rrect(0.9, 2.0, 0.06, 2), 0.45, 0.05, "steel")
    k.slab(rrect(0.88, 1.92, 0.07, 3), 0.5, 0.12, "mattress", r=0.035)
    k.box((0, 0.67, -0.77), (0.6, 0.1, 0.3), "white", r=0.042, seg=2)
    k.box((0, 0.64, 0.32), (0.91, 0.04, 1.24), "blue", r=0.016, seg=1)
    for x in (-0.4475, 0.4475):
        k.box((x, 0.575, 0.32), (0.015, 0.11, 1.24), "blue")
    k.box((0, 0.575, 0.9475), (0.91, 0.11, 0.015), "blue")
    k.box((0, 0.645, -0.33), (0.91, 0.05, 0.1), "white", r=0.02, seg=1)
    # head board (behind the pillow) and foot board, each with a grip rail along its top
    k.panel(moved(rrect(0.96, 0.7, 0.1, 3), 0, 0.65), -1.09, 0.06, "plastic", r=0.02, seg=1)
    k.pipe([(-0.44, 0.86, -1.06), (-0.44, 1.0, -1.06), (0.44, 1.0, -1.06), (0.44, 0.86, -1.06)], 0.02, "teal", bend=0.09, seg=6, step=30)
    k.panel(moved(rrect(0.72, 0.3, 0.04, 2), 0, 0.7), -1.032, 0.006, "mint")
    k.panel(moved(rrect(0.96, 0.6, 0.1, 3), 0, 0.6), 1.02, 0.06, "plastic", r=0.02, seg=1)
    k.pipe([(-0.44, 0.76, 1.05), (-0.44, 0.9, 1.05), (0.44, 0.9, 1.05), (0.44, 0.76, 1.05)], 0.02, "teal", bend=0.09, seg=6, step=30)
    k.box((0, 0.69, 1.084), (0.36, 0.18, 0.012), "coal", r=0.012, seg=1)
    k.box((-0.04, 0.715, 1.0915), (0.16, 0.07, 0.004), "screen-dark")
    k.box((0.1, 0.715, 1.0915), (0.04, 0.03, 0.004), "led-green")
    for i in range(5):
        k.box((-0.12 + 0.06 * i, 0.645, 1.0915), (0.036, 0.024, 0.004), "plastic")
    # split side rails on their posts; the head-end pair carries the patient controls
    for sx in (-1, 1):
        x0 = 0.4525 if sx > 0 else -0.4875
        for zc, length in ((-0.525, 0.65), (0.45, 0.6)):
            k.side(moved(rrect(length, 0.24, 0.07, 3), zc, 0.76), x0, 0.035, "plastic", r=0.012, seg=1)
            k.box((sx * 0.47, 0.872, zc), (0.045, 0.026, length - 0.16), "teal", r=0.011, seg=1)
            for dz in (-0.3, 0.3):
                k.tube((sx * 0.46, 0.49, zc + dz * length), (sx * 0.46, 0.66, zc + dz * length), 0.014, "chrome", seg=6)
        k.box((sx * 0.4915, 0.76, -0.46), (0.008, 0.08, 0.12), "coal")
        k.box((sx * 0.4925, 0.755, -0.58), (0.006, 0.03, 0.04), "led-green")
        k.box((sx * 0.43, 0.425, -0.62), (0.035, 0.03, 0.11), "ambulance-red", r=0.008, seg=1)
        for z in (-1.0, 1.0):
            k.cyl((sx * 0.452, 0.475, z), 0.036, 0.04, "coal", seg=10)


@builder("stool")
def stool(k: Kit, eq):
    """Clinic stool: a five-star base on twin castors, the gas-lift column with its height lever, a
    round foot ring on spokes and a round padded seat."""
    for i in range(5):
        a = math.radians(90 + 72 * i)
        x, z = 0.205 * math.cos(a), 0.205 * math.sin(a)
        k.caster(x, z, r=0.024, stem=0.012, lite=True)
        k.tube((0, 0.1, 0), (x, 0.068, z), 0.024, "chrome", seg=8, r2=0.016)
    k.cyl((0, 0.1, 0), 0.045, 0.05, "chrome", seg=14, bevel=0.01)
    k.cyl((0, 0.21, 0), 0.034, 0.2, "coal", seg=12)
    k.cyl((0, 0.4, 0), 0.02, 0.24, "chrome", seg=10)
    k.torus((0, 0.25, 0), 0.15, 0.011, "chrome", seg=24, ring=6)
    for i in range(4):
        a = math.radians(45 + 90 * i)
        k.tube((0.03 * math.cos(a), 0.25, 0.03 * math.sin(a)), (0.15 * math.cos(a), 0.25, 0.15 * math.sin(a)), 0.007, "chrome", seg=5)
    k.cyl((0, 0.512, 0), 0.1, 0.03, "coal", seg=14)
    k.tube((0.04, 0.5, 0.0), (0.17, 0.49, 0.0), 0.006, "chrome", seg=5)
    k.ball((0.175, 0.49, 0.0), 0.012, "coal", seg=8)
    k.lathe([(0.0, 0.528), (0.2, 0.528), (0.218, 0.545), (0.22, 0.575), (0.205, 0.596), (0.15, 0.6), (0.0, 0.6)], (0, 0, 0), "navy", seg=24)


@builder("wheelchair")
def wheelchair(k: Kit, eq):
    """Manual wheelchair: spoked drive wheels with tyres and hand rims, front castors in their forks,
    the folding tubular frame with its cross-brace, a sling seat and backrest, push handles with
    grips, padded armrests and footrests on their hangers."""
    for sx in (-1, 1):
        x = sx * 0.235
        k.wheel((sx * 0.285, 0.3, -0.15), 0.3, 0.032, hub="chrome", axis="x", spokes=6, tread=0.1, seg=24)
        k.torus((sx * 0.318, 0.3, -0.15), 0.262, 0.008, "chrome", axis="x", seg=24, ring=5)
        for a in (30, 150, 270):
            r = math.radians(a)
            k.tube((sx * 0.3, 0.3 + 0.262 * math.sin(r), -0.15 + 0.262 * math.cos(r)), (sx * 0.318, 0.3 + 0.262 * math.sin(r), -0.15 + 0.262 * math.cos(r)), 0.005, "chrome", seg=4)
        k.cyl((sx * 0.262, 0.3, -0.15), 0.022, 0.04, "steel", axis="x", seg=8)
        # side frame: seat rail, lower rail, back post bent into the push handle, front post
        k.pipe([(x, 0.2, -0.285), (x, 0.895, -0.285), (x, 0.895, -0.36)], 0.0125, "chrome", bend=0.04, seg=6, step=30)
        k.cyl((x, 0.895, -0.395), 0.019, 0.075, "rubber", axis="z", seg=8)
        k.tube((x, 0.435, -0.285), (x, 0.435, 0.345), 0.0125, "chrome", seg=6)
        k.pipe([(x, 0.435, 0.345), (x, 0.215, 0.345), (x, 0.215, -0.2), (x, 0.3, -0.2)], 0.0125, "chrome", bend=0.04, seg=6, step=30)
        k.tube((x, 0.3, -0.2), (x, 0.435, -0.2), 0.0125, "chrome", seg=6)
        # armrest on two posts
        for z in (0.07, -0.21):
            k.tube((sx * 0.24, 0.435, z), (sx * 0.24, 0.685, z), 0.009, "chrome", seg=5)
        k.box((sx * 0.25, 0.695, -0.075), (0.055, 0.03, 0.35), "coal", r=0.012, seg=1)
        # castor: stem, fork and wheel
        k.tube((sx * 0.22, 0.2, 0.3), (sx * 0.22, 0.42, 0.3), 0.013, "chrome", seg=6)
        k.wheel((sx * 0.22, 0.07, 0.3), 0.07, 0.03, hub="steel", axis="x", seg=12)
        for dx in (-0.022, 0.022):
            k.box((sx * 0.22 + dx, 0.135, 0.3), (0.005, 0.15, 0.03), "chrome")
        k.box((sx * 0.22, 0.205, 0.3), (0.05, 0.016, 0.04), "chrome")
        k.tube((sx * 0.22, 0.42, 0.3), (x, 0.435, 0.32), 0.011, "chrome", seg=5)
        # footrest: hanger and plate
        k.pipe([(x, 0.4, 0.345), (sx * 0.19, 0.2, 0.4), (sx * 0.19, 0.125, 0.41)], 0.011, "chrome", bend=0.05, seg=6, step=30)
        k.box((sx * 0.115, 0.115, 0.44), (0.17, 0.022, 0.16), "coal", r=0.008, seg=1)
    # folding cross-brace under the seat
    k.tube((-0.235, 0.215, -0.03), (0.235, 0.435, -0.03), 0.01, "chrome", seg=5)
    k.tube((0.235, 0.215, -0.045), (-0.235, 0.435, -0.045), 0.01, "chrome", seg=5)
    k.box((0, 0.465, -0.025), (0.44, 0.05, 0.49), "navy", r=0.02, seg=2)
    k.panel(moved(rrect(0.44, 0.39, 0.035, 3), 0, 0.685), -0.3, 0.036, "navy", r=0.012, seg=1)


# ------------------------------------------------------------------------------------------------
# oxygen, infusion
# ------------------------------------------------------------------------------------------------

@builder("oxygen-cylinder")
def oxygen_cylinder(k: Kit, eq):
    """Oxygen cylinder on its two-wheel trolley: the toe plate, wheels, feet and tubular back frame
    with its grip; the cylinder — a round white body and domed shoulder (white is the ISO 32 colour
    of oxygen), a retaining strap and its label —, and on the neck the valve with its handwheel,
    the pressure regulator with a contents gauge, the flow selector and the outlet."""
    k.slab(rrect(0.36, 0.42, 0.03, 2), 0.06, 0.035, "steel", at=(0, 0, -0.01), r=0.006, seg=1)
    for x in (-0.215, 0.215):
        k.wheel((x, 0.08, -0.12), 0.08, 0.045, hub="steel", axis="x", seg=14)
    k.cyl((0, 0.08, -0.12), 0.011, 0.41, "steel", axis="x", seg=6)
    for x in (-0.12, 0.12):
        k.cyl((x, 0.03, 0.17), 0.028, 0.06, "rubber", seg=10)
    k.pipe([(-0.1, 0.07, -0.215), (-0.1, 1.13, -0.215), (0.1, 1.13, -0.215), (0.1, 0.07, -0.215)], 0.013, "steel", bend=0.06, seg=8)
    k.cyl((0, 1.13, -0.215), 0.019, 0.11, "rubber", axis="x", seg=10)
    k.box((0, 0.45, -0.168), (0.2, 0.03, 0.09), "steel", r=0.004, seg=1)
    k.revolve([(0.121, -0.022), (0.129, -0.022), (0.129, 0.022), (0.121, 0.022)], (0, 0.875, 0), "coal", seg=20)
    k.box((0, 0.875, -0.168), (0.07, 0.044, 0.09), "coal", r=0.006, seg=1)
    # the cylinder
    k.lathe([(0.0, 0.1), (0.108, 0.1), (0.12, 0.114), (0.12, 1.2), (0.118, 1.235), (0.104, 1.28), (0.078, 1.312), (0.05, 1.328), (0.042, 1.345)],
            (0, 0, 0), "gas-oxygen", seg=20)
    k.revolve([(0.1205, -0.125), (0.1225, -0.125), (0.1225, 0.125), (0.1205, 0.125)], (0, 0.675, 0), "paper", a0=62, a1=118, seg=40)
    k.revolve([(0.1215, -0.03), (0.1235, -0.03), (0.1235, 0.03), (0.1215, 0.03)], (0, 0.74, 0), "coal", a0=72, a1=108, seg=40)
    # valve, regulator, gauge, flow selector
    k.cyl((0, 1.354, 0), 0.044, 0.022, "chrome", seg=12)
    k.cyl((0, 1.42, 0), 0.03, 0.11, "chrome", seg=10)
    k.cyl((0, 1.488, 0), 0.058, 0.018, "coal", seg=14, bevel=0.006)
    k.cyl((0, 1.501, 0), 0.016, 0.012, "chrome", seg=8)
    k.cyl((0.06, 1.435, 0), 0.03, 0.08, "chrome", axis="x", seg=10)
    k.cyl((0.09, 1.472, 0), 0.011, 0.04, "chrome", seg=6)
    k.gauge((0.09, 1.52, -0.004), 0.045, axis="z", depth=0.026, bezel="coal")
    k.cyl((0.118, 1.435, 0), 0.027, 0.036, "gas-oxygen", axis="x", seg=12, bevel=0.005)
    k.tube((0.085, 1.405, 0.0), (0.085, 1.368, 0.0), 0.008, "chrome", seg=6, r2=0.005)


def drip_stand(k: Kit, hooks=(0, 90, 180, 270)):
    """An IV pole (the voxel parts' sizes): four tapered legs on castors, the lower tube with its
    height clamp, the telescopic upper tube and a crown of ram's-horn hooks at the given angles
    (degrees from +x towards +z)."""
    for a in (0, 90, 180, 270):
        r = math.radians(a)
        x, z = 0.24 * math.cos(r), 0.24 * math.sin(r)
        k.caster(x, z, r=0.024, stem=0.012, lite=True)
        k.tube((0, 0.1, 0), (x, 0.068, z), 0.022, "coal", seg=8, r2=0.015)
    k.cyl((0, 0.115, 0), 0.05, 0.07, "steel", seg=12, bevel=0.012)
    k.cyl((0, 0.73, 0), 0.022, 1.16, "steel", seg=10)
    k.cyl((0, 1.314, 0), 0.036, 0.06, "plastic", seg=10)
    k.cyl((0.05, 1.31, 0), 0.008, 0.04, "steel", axis="x", seg=5)
    k.ball((0.075, 1.31, 0), 0.016, "coal", seg=8)
    k.cyl((0, 1.66, 0), 0.015, 0.64, "chrome", seg=8)
    k.cyl((0, 1.98, 0), 0.026, 0.028, "chrome", seg=10)
    for a in hooks:
        r = math.radians(a)
        c, s_ = math.cos(r), math.sin(r)
        k.hose([(0.02 * c, 1.98, 0.02 * s_), (0.13 * c, 1.985, 0.13 * s_), (0.178 * c, 1.972, 0.178 * s_), (0.196 * c, 1.99, 0.196 * s_), (0.185 * c, 2.014, 0.185 * s_)],
               0.007, "chrome", seg=6, steps=3)


def fluid_bag(k: Kit, x: float, z: float, top: float, width: float, height: float, label: str = "paper", face: tuple[float, float] = (0, 1)):
    """A soft infusion bag hanging from a hook at (x, top, z): the hanger tab, the bag, its label
    and port; `face` is the horizontal direction (x, z) the label faces. Returns the port's bottom."""
    fx, fz = face
    yaw = math.degrees(math.atan2(fx, fz))
    k.box((x, top - 0.02, z), (0.018, 0.045, 0.006), "plastic", rot=(0, yaw, 0))
    k.box((x, top - 0.04 - height / 2, z), (width, height, 0.045), "mattress", r=0.02, seg=2, rot=(0, yaw, 0))
    k.box((x + fx * 0.0235, top - 0.04 - height * 0.45, z + fz * 0.0235), (width * 0.66, height * 0.45, 0.003), label, rot=(0, yaw, 0))
    k.box((x + fx * 0.0255, top - 0.04 - height * 0.38, z + fz * 0.0255), (width * 0.5, height * 0.1, 0.002), "blue", rot=(0, yaw, 0))
    k.cyl((x, top - 0.04 - height - 0.012, z), 0.011, 0.03, "plastic", seg=8)
    return top - 0.04 - height - 0.027


def giving_set(k: Kit, x: float, z: float, top: float, bottom: float, sway: tuple[float, float] = (0.012, 0.0), clamp: float | None = None):
    """A giving set from a bag's port at (x, top, z): the spike and drip chamber, then the line
    falling to `bottom` with a slight sway, a roller clamp at height `clamp`."""
    k.cyl((x, top - 0.03, z), 0.016, 0.07, "lead-glass", seg=10)
    k.cyl((x, top - 0.068, z), 0.009, 0.012, "plastic", seg=8)
    sx, sz = sway
    k.hose([(x, top - 0.07, z), (x + sx, top - (top - bottom) * 0.35, z + sz), (x - sx * 0.5, top - (top - bottom) * 0.7, z - sz * 0.5), (x, bottom, z)], 0.004, "plastic", seg=6, steps=3)
    if clamp is not None:
        k.box((x + sx * 0.6, clamp, z + sz * 0.6), (0.022, 0.04, 0.018), "blue", r=0.004, seg=1)


@builder("iv-pole")
def iv_pole(k: Kit, eq):
    """IV pole: the stand with its four-hook crown, a litre bag on one hook with its giving set and
    roller clamp, and a small piggyback bag on another."""
    drip_stand(k)
    port = fluid_bag(k, 0.185, 0.0, 2.0, 0.12, 0.22, face=(0, 1))
    giving_set(k, 0.185, 0.0, port, 1.06, clamp=1.44)
    port = fluid_bag(k, 0.0, -0.185, 2.0, 0.08, 0.14, label="yellow", face=(0, 1))
    giving_set(k, 0.0, -0.185, port, 1.3)


@builder("infusion-pump")
def infusion_pump(k: Kit, eq):
    """Two volumetric infusion pumps clamped to an IV pole under a bag: each pump a rounded housing
    with its carry handle, door, keypad and run light; the upper pump's display is the world's
    live screen, the line running from the bag through both."""
    drip_stand(k)
    port = fluid_bag(k, 0.0, 0.185, 2.0, 0.12, 0.22, face=(0, 1))
    k.cyl((0.0, port - 0.03, 0.185), 0.016, 0.07, "lead-glass", seg=10)
    k.hose([(0.0, port - 0.07, 0.185), (-0.02, 1.42, 0.17), (-0.035, 1.3, 0.15)], 0.004, "plastic", seg=6, steps=3)
    screens = eq.screens()
    for i, y in enumerate((1.19, 0.95)):
        k.box((0, y + 0.01, -0.007), (0.08, 0.08, 0.066), "steel", r=0.008, seg=1)
        k.box((0, y, 0.108), (0.26, 0.18, 0.164), "plastic", r=0.022, seg=3)
        k.box((0, y + 0.092, 0.108), (0.2, 0.014, 0.1), "teal", r=0.006, seg=2)
        k.box((-0.035, y - 0.035, 0.192), (0.15, 0.07, 0.008), "mint", r=0.004, seg=1)
        k.box((0.085, y - 0.01, 0.191), (0.05, 0.12, 0.006), "coal", r=0.004, seg=1)
        k.box((0.085, y + 0.067, 0.192), (0.03, 0.015, 0.005), "led-green", r=0.002, seg=1)
        if i == 0 and screens:
            k.screen_bezel(screens[0], "coal", border=0.006, depth=0.006, r=0.003)
        else:
            k.box((-0.035, y + 0.045, 0.1915), (0.162, 0.082, 0.004), "coal", r=0.003, seg=1)
            k.box((-0.035, y + 0.045, 0.1935), (0.15, 0.07, 0.002), "screen-dark", r=0.001, seg=1)
    k.hose([(-0.035, 1.1, 0.196), (-0.045, 1.07, 0.2), (-0.035, 1.04, 0.196)], 0.004, "plastic", seg=6, steps=3)
    k.hose([(-0.035, 0.86, 0.19), (-0.05, 0.7, 0.17), (-0.03, 0.55, 0.16), (-0.045, 0.45, 0.155)], 0.004, "plastic", seg=6, steps=3)


# ------------------------------------------------------------------------------------------------
# imaging
# ------------------------------------------------------------------------------------------------

@builder("c-arm")
def c_arm(k: Kit, eq):
    """Mobile C-arm: the chassis on castors with its console, push handle and side monitor (the
    world's display), the column and horizontal arm, and the C itself — one arc turned about the
    isocentre, the flat-panel detector at its upper end and the X-ray tube with its collimator at
    the lower, facing each other across the gap the patient lies in."""
    for x in (-0.27, 0.27):
        for z in (-0.765, -0.325):
            k.caster(x, z, r=0.05, stem=0.0)
    k.box((0, 0.15, -0.545), (0.74, 0.1, 0.62), "navy", r=0.025, seg=2)
    k.box((0, 0.47, -0.545), (0.72, 0.66, 0.6), "plastic", r=0.045, seg=3)
    k.box((0, 0.5, -0.545), (0.73, 0.4, 0.5), "mint", r=0.02, seg=2)
    k.box((0, 0.815, -0.745), (0.6, 0.05, 0.14), "black", r=0.012, seg=2, rot=(-12, 0, 0))
    k.box((0.225, 0.848, -0.75), (0.05, 0.006, 0.05), "led-green", r=0.002, seg=1, rot=(-12, 0, 0))
    k.pipe([(-0.28, 0.78, -0.84), (-0.28, 0.97, -0.875), (0.28, 0.97, -0.875), (0.28, 0.78, -0.84)], 0.018, "chrome", bend=0.05, seg=10)
    # column, monitor, arm, holder
    k.box((0, 1.01, -0.52), (0.28, 0.42, 0.25), "plastic", r=0.035, seg=3)
    k.box((0, 1.232, -0.52), (0.26, 0.025, 0.23), "steel", r=0.008, seg=1)
    for part in eq.screens():
        k.box((0.146, 1.08, -0.52), (0.016, 0.2, 0.23), "black", r=0.006, seg=1)
        k.screen_bezel(part, "black", border=0.012, depth=0.014, r=0.004)
    k.box((0, 1.01, -0.245), (0.2, 0.18, 0.3), "plastic", r=0.04, seg=3)
    k.box((0, 1.0, -0.045), (0.24, 0.3, 0.14), "black", r=0.03, seg=2)
    # the C: centre (the isocentre) and radius from the voxel arc
    centre, radius = (0, 1.0, 0.655), 0.588
    half, thick, c = 0.07, 0.045, 0.014
    k.revolve([(radius - thick, -half + c), (radius - thick + c, -half), (radius + thick - c, -half), (radius + thick, -half + c),
               (radius + thick, half - c), (radius + thick - c, half), (radius - thick + c, half), (radius - thick, half - c)],
              centre, "steel", axis="x", a0=84, a1=276, seg=64)
    k.revolve([(radius + thick - 0.002, -0.022), (radius + thick + 0.004, -0.022), (radius + thick + 0.004, 0.022), (radius + thick - 0.002, 0.022)],
              centre, "coal", axis="x", a0=92, a1=268, seg=64)
    # detector above, tube and collimator below
    k.box((0, 1.455, 0.655), (0.4, 0.17, 0.4), "plastic", r=0.035, seg=3)
    k.box((0, 1.36, 0.655), (0.36, 0.02, 0.36), "coal", r=0.006, seg=1)
    k.pipe([(-0.12, 1.46, 0.85), (-0.12, 1.46, 0.885), (0.12, 1.46, 0.885), (0.12, 1.46, 0.85)], 0.012, "chrome", bend=0.025, seg=8)
    k.box((0, 1.39, 0.857), (0.06, 0.03, 0.006), "led-red", r=0.002, seg=1)
    k.box((0, 0.49, 0.655), (0.26, 0.22, 0.26), "plastic", r=0.045, seg=3)
    k.box((0, 0.46, 0.655), (0.268, 0.04, 0.268), "teal", r=0.012, seg=2)
    k.cyl((0, 0.62, 0.655), 0.095, 0.045, "coal", seg=24, bevel=0.008)
    k.cyl((0, 0.646, 0.655), 0.06, 0.006, "lead-glass", seg=20)


# ------------------------------------------------------------------------------------------------
# resuscitation, ventilation, suction
# ------------------------------------------------------------------------------------------------

@builder("suction-unit")
def suction_unit(k: Kit, eq):
    """Mobile suction unit: the pump housing on castors with its vents and run light, two round
    collection canisters under their lids (one part-filled), the vacuum gauge and regulator on the
    post with the push handle over them, the vacuum line to the canisters, the link between them
    and the patient line ending in a Yankauer tip parked in its holder."""
    for x in (-0.19, 0.19):
        for z in (-0.15, 0.15):
            k.caster(x, z, r=0.026, stem=0.008)
    k.box((0, 0.08, 0), (0.44, 0.04, 0.38), "coal", r=0.012, seg=2)
    k.box((0, 0.26, -0.01), (0.4, 0.32, 0.34), "plastic", r=0.03, seg=3)
    k.box((0, 0.395, 0.161), (0.38, 0.02, 0.006), "teal", r=0.003, seg=1)
    for y in (0.19, 0.24, 0.29):
        k.box((0, y, 0.161), (0.28, 0.018, 0.006), "coal", r=0.003, seg=1)
    k.box((0.14, 0.355, 0.162), (0.04, 0.03, 0.006), "led-green", r=0.002, seg=1)
    for x, fill in ((-0.1, 0.0), (0.1, 0.075)):
        k.cyl((x, 0.53, 0), 0.07, 0.22, "lead-glass", seg=20)
        if fill:
            k.cyl((x, 0.425 + fill / 2, 0), 0.063, fill, "beige", seg=16)
        k.cyl((x, 0.655, 0), 0.076, 0.03, "blue", seg=20, bevel=0.008)
        for dx, dz in ((-0.03, 0.02), (0.03, -0.02)):
            k.cyl((x + dx, 0.68, dz), 0.01, 0.025, "plastic", seg=8)
    k.cyl((0, 0.62, -0.14), 0.028, 0.4, "steel", seg=12)
    k.box((0, 0.89, -0.115), (0.24, 0.18, 0.07), "black", r=0.018, seg=2)
    k.gauge((0, 0.89, -0.081), 0.062, axis="z", depth=0.012, needle="coal", angle=20)
    k.cyl((0.1, 0.84, -0.071), 0.018, 0.02, "coal", axis="z", seg=12, bevel=0.004)
    k.pipe([(-0.105, 0.975, -0.115), (-0.105, 1.022, -0.115), (0.105, 1.022, -0.115), (0.105, 0.975, -0.115)], 0.013, "chrome", bend=0.025, seg=8)
    k.hose([(-0.13, 0.69, 0.02), (-0.128, 0.78, -0.02), (-0.118, 0.85, -0.06), (-0.105, 0.87, -0.082)], 0.007, "plastic", seg=6, steps=3)
    k.hose([(-0.07, 0.69, -0.02), (0.0, 0.73, -0.03), (0.07, 0.69, 0.02)], 0.007, "plastic", seg=6, steps=3)
    k.hose([(0.13, 0.69, -0.02), (0.19, 0.715, 0.02), (0.214, 0.6, 0.05), (0.212, 0.37, 0.053)], 0.007, "plastic", seg=6, steps=4)
    k.tube((0.212, 0.37, 0.053), (0.212, 0.2, 0.053), 0.011, "lead-glass", seg=8, r2=0.006)
    k.torus((0.212, 0.31, 0.053), 0.015, 0.004, "steel", seg=12, ring=5)
    k.box((0.203, 0.31, 0.053), (0.012, 0.012, 0.012), "steel", r=0.002, seg=1)


@builder("ventilator")
def ventilator(k: Kit, eq):
    """ICU ventilator on its trolley: the breathing unit with its control knob and the inspiratory
    and expiratory ports, the touchscreen above (the world's live display) with its alarm lamp, the
    heated humidifier at the side, and the circuit as it is assembled — a dry line from the
    inspiratory port to the humidifier, the inspiratory limb from the humidifier and the expiratory
    limb back to its filtered port, meeting at the Y-piece held on the support arm, clear of the
    screen."""
    for x in (-0.26, 0.26):
        for z in (-0.27, 0.25):
            k.caster(x, z, r=0.03, stem=0.01)
    k.slab(rrect(0.6, 0.6, 0.08), 0.07, 0.07, "plastic", at=(0, 0, -0.01), r=0.02)
    k.cyl((0, 0.37, -0.08), 0.05, 0.46, "steel", seg=16)
    k.slab(rrect(0.44, 0.4, 0.04), 0.34, 0.03, "plastic", at=(0, 0, -0.04), r=0.01)
    k.box((-0.04, 0.41, -0.04), (0.24, 0.08, 0.28), "paper", r=0.012, seg=2)
    k.box((0, 0.81, -0.03), (0.48, 0.42, 0.38), "plastic", r=0.04, seg=3)
    k.box((0, 0.81, 0.162), (0.44, 0.38, 0.008), "mint", r=0.02, seg=2)
    k.box((0, 0.97, 0.1665), (0.4, 0.02, 0.005), "teal", r=0.002, seg=1)
    k.cyl((-0.14, 0.88, 0.18), 0.04, 0.03, "black", axis="z", seg=18, bevel=0.006)
    k.box((-0.14, 0.76, 0.167), (0.12, 0.05, 0.004), "coal", r=0.004, seg=1)
    k.cyl((0.14, 0.9, 0.19), 0.03, 0.05, "chrome", axis="z", seg=14)
    k.cyl((0.14, 0.72, 0.19), 0.03, 0.05, "chrome", axis="z", seg=14)
    k.cyl((0.14, 0.72, 0.23), 0.038, 0.034, "plastic", axis="z", seg=14, bevel=0.006)
    k.pipe([(-0.145, 0.915, -0.22), (-0.145, 0.915, -0.265), (0.145, 0.915, -0.265), (0.145, 0.915, -0.22)], 0.014, "chrome", bend=0.03, seg=8)
    # screen on its neck
    k.box((0, 1.05, -0.07), (0.08, 0.06, 0.06), "steel", r=0.01, seg=1)
    k.box((0, 1.28, -0.08), (0.46, 0.4, 0.08), "plastic", r=0.025, seg=3)
    k.screen_bezel(eq.screens()[0], "black", border=0.015, depth=0.006, r=0.004)
    k.box((0, 1.492, -0.08), (0.1, 0.026, 0.04), "led-green", r=0.01, seg=2)
    # humidifier: heater base, water chamber, cap
    k.box((-0.29, 0.685, 0.08), (0.1, 0.05, 0.12), "black", r=0.012, seg=2)
    k.box((-0.246, 0.72, 0.03), (0.02, 0.1, 0.04), "steel", r=0.004, seg=1)
    k.cyl((-0.29, 0.775, 0.08), 0.048, 0.13, "water", seg=18)
    k.cyl((-0.29, 0.85, 0.08), 0.044, 0.02, "plastic", seg=16, bevel=0.005)
    # support arm and the circuit
    k.pipe([(0.255, 0.95, -0.015), (0.255, 1.37, -0.015), (0.285, 1.37, 0.3)], 0.012, "chrome", bend=0.05, seg=8)
    k.tube((0.288, 1.37, 0.3), (0.296, 1.275, 0.3), 0.006, "chrome", seg=6)
    k.box((0.3, 1.235, 0.3), (0.07, 0.07, 0.12), "black", r=0.02, seg=2)
    k.cyl((0.3, 1.295, 0.28), 0.022, 0.05, "blue", seg=12, bevel=0.004)
    k.hose([(0.14, 0.9, 0.215), (0.06, 0.935, 0.29), (-0.17, 0.95, 0.25), (-0.3, 0.9, 0.13), (-0.31, 0.862, 0.095)], 0.02, "clin-hose-blue", seg=8, steps=4)
    k.hose([(-0.27, 0.862, 0.07), (-0.3, 0.99, 0.2), (-0.05, 1.0, 0.33), (0.24, 1.02, 0.34), (0.315, 1.13, 0.325), (0.31, 1.205, 0.325)], 0.02, "clin-hose-blue", seg=8, steps=4)
    k.hose([(0.29, 1.205, 0.275), (0.33, 1.02, 0.29), (0.31, 0.8, 0.335), (0.2, 0.71, 0.31), (0.14, 0.72, 0.25)], 0.02, "mattress", seg=8, steps=4)


@builder("defibrillator")
def defibrillator(k: Kit, eq):
    """Defibrillator-monitor on its cart: the cart with the pads on its lower shelf; the unit with
    its ECG display (the world's screen), a round energy selector, the charge and shock buttons and
    a carry handle; the two paddles in their wells on top, each with its discharge button, their
    cables falling down the sides."""
    for x in (-0.22, 0.22):
        for z in (-0.18, 0.18):
            k.caster(x, z, r=0.026, stem=0.008)
    k.box((0, 0.085, 0), (0.52, 0.05, 0.44), "black", r=0.014, seg=2)
    for x in (-0.24, 0.24):
        for z in (-0.2, 0.2):
            k.cyl((x, 0.465, z), 0.014, 0.71, "chrome", seg=10)
    k.slab(rrect(0.5, 0.42, 0.03), 0.34, 0.03, "plastic", r=0.008)
    k.box((-0.07, 0.39, -0.01), (0.2, 0.04, 0.22), "orange", r=0.01, seg=2)
    k.box((-0.05, 0.425, -0.01), (0.2, 0.03, 0.18), "orange", r=0.01, seg=2, rot=(0, 8, 0))
    k.slab(rrect(0.54, 0.48, 0.035), 0.82, 0.04, "plastic", r=0.01)
    k.pipe([(-0.185, 0.86, -0.24), (-0.185, 1.015, -0.24), (0.185, 1.015, -0.24), (0.185, 0.86, -0.24)], 0.014, "chrome", bend=0.04, seg=8)
    # the unit
    k.box((0, 1.01, -0.035), (0.42, 0.3, 0.27), "plastic", r=0.035, seg=3)
    k.box((0, 1.01, 0.103), (0.4, 0.27, 0.008), "black", r=0.022, seg=2)
    k.screen_bezel(eq.screens()[0], "black", border=0.006, depth=0.004, r=0.003)
    k.cyl((0.1, 1.07, 0.12), 0.032, 0.024, "yellow", axis="z", seg=18, bevel=0.005)
    k.box((0.1, 1.085, 0.1335), (0.006, 0.024, 0.003), "coal", r=0.001, seg=1)
    k.cyl((0.07, 0.918, 0.114), 0.02, 0.012, "led-amber", axis="z", seg=14, bevel=0.003)
    k.cyl((0.15, 0.918, 0.114), 0.022, 0.012, "led-red", axis="z", seg=14, bevel=0.003)
    k.box((0.167, 1.123, 0.109), (0.025, 0.015, 0.004), "led-green", r=0.002, seg=1)
    k.pipe([(-0.115, 1.16, -0.13), (-0.115, 1.222, -0.13), (0.115, 1.222, -0.13), (0.115, 1.16, -0.13)], 0.014, "plastic", bend=0.03, seg=8)
    # paddles and cables
    for sx in (-1, 1):
        x = sx * 0.12
        k.box((x, 1.17, 0.015), (0.11, 0.02, 0.15), "steel", r=0.008, seg=2)
        k.box((x, 1.208, 0.015), (0.062, 0.058, 0.12), "coal", r=0.022, seg=3)
        k.cyl((x, 1.24, 0.045), 0.013, 0.01, "ambulance-red", seg=10, bevel=0.002)
        k.hose([(sx * 0.15, 1.2, -0.035), (sx * 0.2, 1.19, -0.02), (sx * 0.226, 1.08, 0.01), (sx * 0.222, 0.95, 0.02), (sx * 0.213, 0.9, -0.01)], 0.008, "coal", seg=6, steps=3)


@builder("crash-cart")
def crash_cart(k: Kit, eq):
    """Crash cart: its voxel parts refined, with the oxygen cylinder at the side round — body, domed
    shoulder, valve and regulator — and the portable suction jar on top a round canister."""
    cylinder = next(p for p in eq.parts if p["m"] == "gas-oxygen")
    (cx, cy, cz), (_, ch, _) = cylinder["p"], cylinder["s"]
    valve = next(p for p in eq.parts if p["m"] == "chrome" and abs(p["p"][0] - cx) < 1e-6 and p["p"][1] > cy)
    jar = next(p for p in eq.parts if p["m"] == "lead-glass" and p["p"][0] < 0)
    lid = next(p for p in eq.parts if p["m"] == "blue" and abs(p["p"][0] - jar["p"][0]) < 1e-6)
    replaced = [cylinder, valve, jar, lid]
    refine(k, eq, skip=lambda _, p: any(p is q for q in replaced))
    y0 = cy - ch / 2
    k.lathe([(0.0, y0), (0.036, y0), (0.04, y0 + 0.006), (0.04, y0 + ch - 0.04), (0.034, y0 + ch - 0.014), (0.018, y0 + ch), (0.016, y0 + ch + 0.01)],
            (cx, 0, cz), "gas-oxygen", seg=14)
    k.cyl((cx, y0 + ch + 0.035, cz), 0.014, 0.06, "chrome", seg=8)
    k.cyl((cx, y0 + ch + 0.07, cz), 0.026, 0.012, "coal", seg=10)
    k.cyl((cx, y0 + ch + 0.04, cz + 0.03), 0.016, 0.05, "chrome", axis="z", seg=8)
    k.gauge((cx, y0 + ch + 0.04, cz + 0.055), 0.022, axis="z", depth=0.01, bezel="coal")
    (jx, jy, jz), (jw, jh, _) = jar["p"], jar["s"]
    k.cyl((jx, jy, jz), jw / 2, jh, "lead-glass", seg=16)
    k.cyl((jx, lid["p"][1], jz), jw / 2 + 0.006, lid["s"][1], "blue", seg=16)


def coiled(k: Kit, line, radius: float, wire: float, turns: float, m: str, per_turn: int = 5, seg: int = 5):
    """A coiled cord along `line(t)` (t 0…1, a point in the plane z = const): `turns` turns of
    radius `radius`, the wire `wire` thick — a handset's cord, a cuff's coiled tube."""
    pts = []
    n = max(2, int(turns * per_turn))
    for i in range(n + 1):
        t = i / n
        x, y, z = line(t)
        x2, y2, _ = line(min(1.0, t + 1e-3))
        x1, y1, _ = line(max(0.0, t - 1e-3))
        dx, dy = x2 - x1, y2 - y1
        d = math.hypot(dx, dy) or 1.0
        a = 2 * math.pi * turns * t
        # across the cord in the wall's plane, and out of it
        pts.append((x - dy / d * radius * math.cos(a), y + dx / d * radius * math.cos(a), z + radius * math.sin(a)))
    k.hose(pts, wire / 2, m, seg=seg, steps=1)


def stethoscope(k: Kit, yoke: tuple[float, float, float], chest: tuple[float, float, float], tube: str = "black", steel: str = "chrome", tips: str = "plastic"):
    """A stethoscope hanging in the plane z = const from its headset: the yoke at `yoke`, the two
    sprung ear tubes rising from it and closing to their ear tips (they sit on a peg), the tubing
    down to the two-sided chest piece at `chest` — the diaphragm in its rim facing out, the bell behind."""
    x, y, z = yoke
    for s in (-1, 1):
        k.hose([(x, y + 0.004, z), (x + s * 0.016, y + 0.055, z), (x + s * 0.03, y + 0.12, z + 0.002), (x + s * 0.026, y + 0.18, z + 0.006), (x + s * 0.011, y + 0.225, z + 0.008)],
               0.0028, steel, seg=5, steps=2)
        k.ball((x + s * 0.0085, y + 0.232, z + 0.008), 0.0066, tips, seg=6)
    k.ball((x, y, z), 0.0062, tube, seg=8, squash=(1, 1.5, 1))
    cx, cy, cz = chest
    k.hose([(x, y - 0.004, z), (x + 0.005, y - 0.06, z + 0.002), (x - 0.004, (y + cy) / 2, z + 0.003), (cx + 0.002, cy + 0.085, cz - 0.001), (cx, cy + 0.04, cz - 0.0026)],
           0.0046, tube, seg=6, steps=4)
    k.tube((cx, cy + 0.004, cz - 0.0028), (cx, cy + 0.043, cz - 0.0026), 0.0042, steel, seg=8)
    at = (cx, cy, cz)
    k.lathe([(0.0145, -0.0148), (0.0162, -0.0159), (0.0177, -0.0148), (0.0165, -0.0128), (0.0115, -0.009), (0.0082, -0.0056), (0.0076, -0.003),
             (0.0105, -0.0008), (0.019, 0.0032), (0.0218, 0.006)], at, steel, axis="z", seg=16)
    k.lathe([(0.0218, 0.006), (0.0222, 0.0064), (0.0222, 0.0098), (0.0213, 0.0113), (0.0197, 0.0117)], at, "black", axis="z", seg=16)
    k.cyl((cx, cy, cz + 0.0113), 0.0196, 0.0012, tips, axis="z", seg=16)


@builder("diagnostic-wall-set")
def diagnostic_wall_set(k: Kit, eq):
    """Wall diagnostic set: the board; the wall transformer with the otoscope and the
    ophthalmoscope standing in its cradles, their coiled cords hanging below, and the specula
    dispenser between them; the aneroid gauge over the cuff basket, its coiled tube down to the
    rolled cuff and the inflation bulb; and a stethoscope hung by its headset on a peg."""
    k.box((0, 1.42, -0.092), (0.84, 0.6, 0.015), "mint", r=0.005, seg=2)
    k.box((0, 1.71, -0.0815), (0.84, 0.02, 0.006), "teal", r=0.002, seg=1)
    # the transformer and the two instruments in its cradles
    k.box((-0.16, 1.42, -0.06), (0.32, 0.12, 0.05), "plastic", r=0.014, seg=3)
    k.cyl((-0.16, 1.42, -0.0338), 0.007, 0.003, "led-green", axis="z", seg=10)
    for x, scope in ((-0.267, "otoscope"), (-0.053, "ophthalmoscope")):
        k.cyl((x, 1.484, -0.058), 0.0235, 0.012, "black", seg=12)
        k.cyl((x, 1.552, -0.058), 0.0142, 0.126, "coal", seg=12, bevel=0.003)
        k.cyl((x, 1.619, -0.058), 0.0155, 0.008, "chrome", seg=12)
        if scope == "otoscope":
            # the head, the speculum pointing out of it, the lens window on top
            k.box((x, 1.647, -0.058), (0.034, 0.046, 0.034), "coal", r=0.01, seg=2)
            k.lathe([(0.0125, 0.0), (0.0105, 0.012), (0.0048, 0.032), (0.0034, 0.034)], (x, 1.65, -0.042), "black", axis="z", seg=12)
            k.cyl((x, 1.672, -0.058), 0.012, 0.004, "chrome", seg=12)
        else:
            # the flat head with its lens wheel and the brow rest
            k.box((x, 1.656, -0.06), (0.04, 0.064, 0.02), "coal", r=0.008, seg=2)
            k.cyl((x, 1.664, -0.049), 0.0115, 0.004, "chrome", axis="z", seg=14)
            k.cyl((x, 1.664, -0.0465), 0.0062, 0.002, "black", axis="z", seg=10)
            k.box((x, 1.692, -0.054), (0.032, 0.008, 0.014), "black", r=0.003, seg=1)
        # the coiled cord: down from under the transformer and back up
        coiled(k, lambda t, x=x: (x - 0.016 * math.cos(math.pi * t), 1.358 - 0.15 * math.sin(math.pi * t), -0.058), 0.0062, 0.0036, 9, "black", per_turn=5, seg=4)
    # the specula dispenser
    k.box((-0.16, 1.262, -0.065), (0.08, 0.116, 0.04), "plastic", r=0.008, seg=2)
    k.box((-0.16, 1.21, -0.0445), (0.06, 0.016, 0.004), "black", r=0.002, seg=1)
    for i in range(3):
        k.lathe([(0.0062, 0.0), (0.0028, 0.012)], (-0.176 + 0.016 * i, 1.212, -0.044), "coal", axis="z", seg=6)
    # the aneroid gauge on its bracket
    k.box((0.21, 1.49, -0.071), (0.18, 0.18, 0.026), "coal", r=0.02, seg=3)
    k.gauge((0.21, 1.49, -0.058), 0.075, axis="z", face="paper", bezel="chrome", needle="coal", depth=0.006, angle=235)
    for a in range(-30, 211, 30):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        k.box((0.21 + ca * 0.054, 1.49 + sa * 0.054, -0.0505), (0.002, 0.009, 0.001), "coal", r=0.0, seg=1, rot=(0, 0, a - 90))
    # the cuff basket: the rolled cuff, the bulb, and the coiled tube from the gauge
    k.box((0.21, 1.205, -0.047), (0.19, 0.06, 0.078), "steel", r=0.01, seg=2)
    for x in (0.118, 0.302):
        k.box((x, 1.25, -0.047), (0.006, 0.08, 0.078), "steel", r=0.002, seg=1)
    k.box((0.21, 1.25, -0.0085), (0.19, 0.08, 0.004), "steel", r=0.001, seg=1)
    k.cyl((0.195, 1.277, -0.05), 0.036, 0.13, "navy", axis="x", seg=16, bevel=0.006)
    k.ball((0.283, 1.262, -0.03), 0.02, "black", seg=10, squash=(0.85, 1.25, 0.85))
    coiled(k, lambda t: (0.262 + 0.02 * t, 1.398 - 0.1 * t, -0.056), 0.0056, 0.0034, 6, "black", per_turn=5, seg=4)
    # the stethoscope on its peg
    k.box((0.365, 1.625, -0.081), (0.046, 0.034, 0.007), "chrome", r=0.003, seg=1)
    k.cyl((0.365, 1.625, -0.061), 0.0058, 0.034, "chrome", axis="z", seg=10)
    k.ball((0.365, 1.625, -0.043), 0.0078, "chrome", seg=8)
    stethoscope(k, (0.365, 1.398, -0.062), (0.365, 1.172, -0.062))


# ------------------------------------------------------------------------------------------------
# handheld items kept in custody (audit 2026-11-12 P2-12)
# ------------------------------------------------------------------------------------------------

@builder("specimen-tube")
def specimen_tube(k: Kit, eq):
    """Blood specimen tube lying on its side: the clear tube with its round bottom and the red
    screw cap (serum, the ISO 6710 colour code; the tube rests on the cap's rim). Layers for its
    looks: `sample` — the blood in it, `label` — the patient label wrapped round it, with its
    barcode (drawn once it is filled and labelled at the bedside)."""
    r, y = 0.0065, 0.0082
    # the tube: clear, round-bottomed, open end under the cap
    k.lathe([(0.0, -0.0665), (0.0038, -0.0655), (0.0058, -0.0628), (r, -0.0592), (r, 0.041)], (0, y, 0), "glass", axis="x", seg=16)
    # the cap: its grip ribs and the flat top
    k.lathe([(0.0068, 0.0385), (0.0082, 0.0395), (0.0082, 0.0605), (0.0076, 0.0622), (0.0, 0.0624)], (0, y, 0), "ambulance-red", axis="x", seg=16)
    for i in range(8):
        a = 2 * math.pi * i / 8
        k.box((0.05, y + 0.0083 * math.sin(a), 0.0083 * math.cos(a)), (0.018, 0.0012, 0.0012), "ambulance-red", rot=(math.degrees(a), 0, 0))
    with k.layer("sample"):
        k.lathe([(0.0, -0.0645), (0.0034, -0.0636), (0.0052, -0.061), (0.0056, -0.0585), (0.0056, 0.0335), (0.0, 0.0337)], (0, y, 0), "clin-blood-bag", axis="x", seg=12)
    with k.layer("label"):
        # wrapped over the top and the front, a window left underneath to see the blood
        k.revolve([(0.0067, -0.043), (0.0071, -0.043), (0.0071, 0.033), (0.0067, 0.033)], (0, y, 0), "paper", axis="x", a0=-30, a1=200, seg=24)
        for i in range(11):
            k.box((-0.036 + 0.0024 * i + (0.0007 if i % 3 == 0 else 0), y + 0.0072, -0.0012), (0.0008 if i % 2 else 0.0014, 0.0004, 0.0062), "black")
        k.box((0.008, y + 0.0072, 0.0004), (0.022, 0.0004, 0.0016), "coal")
        k.box((0.006, y + 0.0072, -0.0026), (0.018, 0.0004, 0.0012), "coal")


@builder("medication-box")
def medication_box(k: Kit, eq):
    """Medication box lying flat: the white carton with its end flaps and the maker's blue band,
    and the pharmacy label on the lid (patient, drug, dose)."""
    k.box((0, 0.0225, 0), (0.12, 0.045, 0.07), "white", r=0.0018, seg=1)
    for x in (-0.0605, 0.0605):
        k.box((x, 0.0225, 0), (0.0012, 0.041, 0.066), "plastic", r=0.0004, seg=1)
    k.box((0.038, 0.0226, 0), (0.022, 0.0454, 0.0704), "blue")
    k.box((-0.015, 0.0454, 0), (0.06, 0.0009, 0.046), "paper")
    for i, (w, z) in enumerate(((0.044, -0.014), (0.036, -0.005), (0.04, 0.004), (0.026, 0.013))):
        k.box((-0.019 + (0.004 if i else 0), 0.046, z), (w, 0.0004, 0.0024 if i == 0 else 0.0016), "coal" if i else "ambulance-red")
