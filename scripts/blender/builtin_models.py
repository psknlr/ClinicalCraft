"""
The built-in catalogs' equipment models (docs/BLENDER.md): which types have one, and the
builders that are more than `refine` (the type's own voxel parts, refined). `build.py` runs them.
"""
from __future__ import annotations

from clinicalcraft_refine import refine
from clinicalcraft_shapes import Kit

#: Built-in types drawn with a model (those the IMPF Surgery Hospital places; the others stay voxels).
MODELLED = sorted("""
anatomy-atlas-kiosk biosafety-cabinet blood-bank-fridge blood-gas-analyzer bookshelf c-arm cabinet
centrifuge chair chemistry-analyzer crash-cart cytogenetics-workstation defibrillator desk
diagnostic-wall-set evidence-board flow-cytometer glove-dispenser glucometer-station hand-sanitizer
hematology-analyzer hospital-bed infusion-pump instrument-table iv-pole lab-bench lab-fridge locker
medication-cabinet medication-fridge microscope nurse-station-desk office-chair operating-table
oxygen-outlet patient-monitor pharmacy-shelves pneumatic-tube-station potted-plant privacy-curtain
projector-screen radiology-console reception-desk records-terminal sink slide-scanner stool
stretcher surgical-light trash-bin treatment-cart treatment-plinth ultrasound-machine
urinalysis-analyzer vending-machine ventilator waiting-chairs wall-clock water-dispenser
weighing-scale whiteboard workstation
""".split())

#: type id -> builder(kit, equipment); the rest are refined
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
