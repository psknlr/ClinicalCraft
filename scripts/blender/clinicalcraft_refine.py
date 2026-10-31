"""
A model from an equipment type's own voxel parts (docs/BLENDER.md): every part where it is, but
made like a product rather than a voxel — boxes with rounded edges, round bars and poles, casters
or glides at the floor, a dark housing behind each `screen` part (the world draws the display on
it), soft blobs for foliage. The quick, faithful start for any type; a builder then adds or
replaces what the boxes cannot say.

    import clinicalcraft_blender as cc
    from clinicalcraft_shapes import Kit
    from clinicalcraft_refine import refine
    eq = cc.load_type("records-terminal")
    k = Kit(eq)
    refine(k, eq)                                  # all parts; `skip=` leaves some to the builder
    k.finish()

Rules (sizes in metres, a part's dims sorted a ≤ b ≤ c):
* `screen` parts — a dark box of the part's size: the live display is drawn on its front face;
* voxel discs — a cross of two fat parts (w × d and d × w) of one material at one centre, with any
  square inside it: a cylinder (`discs`);
* casters — a small dark cube standing on the floor: a swivel caster on portable types, beds and
  types that have three or more of them, else a round glide;
* bars — b ≤ 0.06 m, c ≥ 3 b, a ≥ 0.6 b: a cylinder along the long side (legs, poles, rails);
* foliage (leaf, shrub, grass) — an ellipsoid filling the part;
* fabric (curtain, mattress, drape, scrubs) — softly rounded;
* everything else — a box with edges rounded by 15 % of its smallest side (0.0015–0.03 m): a chamfer
  on small parts, two or three segments on larger ones (triangles where they show).
"""
from __future__ import annotations

from typing import Callable

import clinicalcraft_blender as cc
from clinicalcraft_shapes import Kit

FOLIAGE = ("leaf", "shrub", "grass", "hedge", "foliage")
FABRIC = ("curtain", "mattress", "drape", "scrubs")
WHEEL = ("rubber", "black", "coal", "sc-matte-black")


def _has(mid: str, words) -> bool:
    return any(w in mid for w in words)


def wheeled(eq: cc.Equipment) -> bool:
    """Whether the type's floor cubes are casters (it rolls) rather than glides."""
    t = eq.type
    if t.get("portable") or t.get("interaction", {}).get("kind") == "bed":
        return True
    tags = " ".join(t.get("tags", []))
    return any(w in tags or w in t["id"] for w in ("cart", "trolley", "stretcher", "bed", "wheel", "mobile"))


def _floor_cube(p: dict) -> bool:
    (_, py, _), s = p["p"], p["s"]
    return p["m"] in WHEEL and max(s) <= 0.1 and min(s) >= 0.6 * max(s) and py - s[1] / 2 <= 0.005


def discs(parts: list[dict]) -> tuple[list[tuple[tuple, float, float, str, str]], set[int]]:
    """Voxel discs: two parts of one material at one centre, a cross of fat arms (w × d and d × w across
    the same thin axis, the short side at least 35 % of the long: thin arms are a star base's legs),
    plus any square of that material and centre that fits inside — the voxel way of
    drawing something round (a lamp head, a clock face, a stool seat). Returns the discs as
    (centre, radius, thickness, axis, material) and the indices of the parts they replace."""
    groups: dict[tuple, list[int]] = {}
    for i, p in enumerate(parts):
        if p.get("name") == "screen" or p.get("r"):
            continue
        groups.setdefault((tuple(round(v, 4) for v in p["p"]), p["m"]), []).append(i)
    out, used = [], set()
    for (centre, m), idx in groups.items():
        if len(idx) < 2:
            continue
        for a in idx:
            sa = parts[a]["s"]
            t = sa.index(min(sa))
            u, v = [x for x in range(3) if x != t]
            cross = [b for b in idx if b != a and parts[b]["s"].index(min(parts[b]["s"])) == t
                     and abs(parts[b]["s"][u] - sa[v]) < 1e-3 and abs(parts[b]["s"][v] - sa[u]) < 1e-3 and abs(sa[u] - sa[v]) > 1e-3
                     and min(sa[u], sa[v]) >= 0.35 * max(sa[u], sa[v])]  # fat arms: thin ones are a star base's legs
            if not cross:
                continue
            radius = max(sa[u], sa[v]) / 2
            members = [i for i in idx if i not in used and parts[i]["s"].index(min(parts[i]["s"])) == t
                       and max(parts[i]["s"][u], parts[i]["s"][v]) <= 2 * radius + 1e-3]
            out.append((centre, radius, max(parts[i]["s"][t] for i in members), "xyz"[t], m))
            used.update(members)
            break
    return out, used


def refine(k: Kit, eq: cc.Equipment, skip: Callable[[int, dict], bool] | None = None) -> None:
    """Add every part of `eq` (except those `skip(index, part)` is true for) to the kit as a refined
    shape; voxel discs (`discs`) become cylinders."""
    parts = eq.parts
    cubes = [p for p in parts if _floor_cube(p)]
    rolls = wheeled(eq) or len(cubes) >= 3
    round_parts, used = discs([p for i, p in enumerate(parts) if not (skip and skip(i, p))])
    kept = [p for i, p in enumerate(parts) if not (skip and skip(i, p))]
    for centre, radius, thick, axis, m in round_parts:
        k.cyl(centre, radius, thick, m, axis=axis, seg=32 if radius > 0.15 else 20, bevel=min(0.3 * thick, 0.012))
    for i, p in enumerate(kept):
        if i not in used:
            part(k, p, rolls)


def part(k: Kit, p: dict, rolls: bool = False) -> None:
    """One voxel part as a refined shape (the rules above)."""
    (px, py, pz), s, m = p["p"], p["s"], p["m"]
    yaw = p.get("r") or 0
    rot = (0, yaw, 0) if yaw else None
    a, b, c = sorted(s)
    if p.get("name") == "screen":
        k.box((px, py, pz), s, "black", r=min(0.004, 0.3 * a), seg=1, rot=rot)
        return
    if _floor_cube(p):
        if rolls:
            r = s[1] * 0.36
            k.caster(px, pz, r=r, wheel=m if m != "coal" else "rubber", stem=s[1] - 2 * r)
        else:
            k.cyl((px, py, pz), min(s[0], s[2]) / 2, s[1], m, seg=12, bevel=0.2 * s[1])
        return
    if _has(m, FOLIAGE) and a >= 0.08:
        k.ball((px, py, pz), 0.5, m, seg=10, squash=(s[0], s[1], s[2]))
        return
    if b <= 0.06 and c >= 3 * b and a >= 0.6 * b:
        axis = "xyz"[list(s).index(c)]
        k.cyl((px, py, pz), (a + b) / 4, c, m, axis=axis, seg=12 if b > 0.03 else 8, rot=rot)
        return
    if _has(m, FABRIC):
        k.box((px, py, pz), s, m, r=min(0.35 * a, 0.04), seg=2, rot=rot)
        return
    r = max(0.0015, min(0.03, 0.15 * a))
    # detail where it shows: a chamfer on small parts, a rounding on large ones
    seg = 1 if a < 0.03 or c < 0.15 else 2 if a < 0.15 or c < 0.8 else 3
    k.box((px, py, pz), s, m, r=r, seg=seg, rot=rot)


def refined(k: Kit, eq: cc.Equipment) -> None:
    """A builder that is just `refine` (for a registry of builders)."""
    refine(k, eq)
