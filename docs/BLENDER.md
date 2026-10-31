# Equipment models in Blender

ClinicalCraft draws equipment from voxel parts; an equipment type may also name a
GLB model that replaces them in the web world (ASSETS.md, FACILITIES.md). This page
is how such models are made in Blender — by a person, by an agent driving Blender
through [blender-mcp](https://github.com/hsaigroup/blender-mcp), or headless — so
that they fit the model contract the first time: the right frame and size, screens
left clear, a provenance record and a use status.

The parts:

| piece | where | what it does |
|---|---|---|
| Blender bridge | `scripts/blender/clinicalcraft_blender.py` | finds an equipment type in the catalogs, describes it, builds its voxel parts as a blockout, makes palette materials, exports the model and returns its catalog `model` reference |
| Shape kit | `scripts/blender/clinicalcraft_shapes.py` | boxes, cylinders, tubes, bars, rings, lathes and flat profiles in the type's own frame, into one mesh with one material per shading class |
| blender-mcp | `.mcp.json` (Claude Code project server) | lets Claude Code inspect and change a running Blender (`execute_blender_code`, viewport screenshots, Poly Haven / Sketchfab / generated assets) |
| Inspector | `clinicalcraft assets inspect <file.glb> --type <id>` | checks the file the way the renderer will load it (ASSETS.md) |

SurgeryCraft's operating-department models (19 types, `tools/blender/` in that
repository) are built with these and are the worked example.

## blender-mcp: set-up and privacy

`.mcp.json` registers blender-mcp **1.8.7** for Claude Code, run by `uvx` on Python
3.11, with **telemetry off**. 1.8.7 is the version in hsaigroup/blender-mcp (PyPI has 2.x since); its PyPI
build has the same code plus the telemetry endpoint (`config.py`, git-ignored in the
repository). Claude Code asks once before it starts a project server.

1. Install [uv](https://docs.astral.sh/uv/) and Blender (4.1 or newer for the shape kit).
2. Install the matching add-on: `uvx --python 3.11 blender-mcp==1.8.7 install-addon`, then
   in Blender *Edit → Preferences → Add-ons* enable **Interface: Blender MCP**.
3. In the same preferences **untick "Allow Telemetry"** (it is on by default).
4. In the 3D viewport press `N` → **BlenderMCP** → **Start MCP Server**.

Why telemetry stays off: blender-mcp's terms (TERMS_AND_CONDITIONS.md, August 2026)
say that with consent it collects prompts, generated code, viewport screenshots,
scene metadata and your manual edits, keeps them indefinitely and may use them to
train models or release them as datasets. `DISABLE_TELEMETRY=true` in `.mcp.json`
turns off every upload path in the server (events, screenshots, trajectories);
unticking the add-on's consent also stops it recording manual edits. Even so, **never put case text, patient data or anything
from `assets/local/` into a Blender prompt** — model geometry needs none of it.

`execute_blender_code` runs any Python inside Blender: save the `.blend` first.
Only one MCP client should talk to one Blender at a time.

## The bridge

From Blender's Python console, from `execute_blender_code`, or a script:

```python
import sys; sys.path.insert(0, "/path/to/ClinicalCraft/scripts/blender")
import clinicalcraft_blender as cc
from clinicalcraft_shapes import Kit, rrect

eq = cc.load_type("sc-mayo-stand", content=["/path/to/SurgeryCraft/content"])
print(cc.describe(eq))   # footprint, parts by material, screens to keep clear
cc.blockout(eq)          # collection cc-blockout: the voxel parts in their colours, the footprint as a wire box
```

Model in collection `cc-model` (by hand, or with the kit), then:

```python
ref = cc.export_model(eq, "/path/to/pack/content/assets/models/sc-mayo-stand.glb",
                      license="CC0-1.0", use="cleared",
                      source={"name": "…", "url": "…", "retrieved": "2026-10-31"})
print(ref)               # {"uri": "models/sc-mayo-stand.glb", "sha256": …, "scale": 1, "offset": …, …}
```

and check it: `clinicalcraft assets inspect content/assets/models/sc-mayo-stand.glb --type sc-mayo-stand`.

| operation | does |
|---|---|
| `load_type(id, content)` | the type and the world's palette (built-in catalogs + `content` dirs) |
| `describe(eq)` | what to model, as text (an agent's first call) |
| `blockout(eq)` | the voxel parts as boxes, screens bright cyan, the footprint as a wire box; never exported |
| `material(eq, id, **over)` | a Principled material from palette entry `id` (colour, roughness, metalness, emissive, opacity) |
| `Kit(eq)` | `box`, `cyl`, `tube`, `path`, `ball`, `torus`, `lathe`, `slab` (+ `rrect`), `caster`, `screen_bezel`; `finish()` makes the mesh |
| `export_model(eq, path, license=, use=, source=, attribution=)` | the GLB and its catalog reference; warns when it does not fill the footprint |

### With Claude Code

With Blender running and the add-on's server started, ask in plain words and let
Claude use the bridge through `execute_blender_code`, e.g.:

> Load `sc-anaesthesia-workstation` from ../SurgeryCraft/content with the ClinicalCraft
> Blender bridge, describe it and build the blockout. Model it over the blockout with
> the shape kit — keep the screen part clear — then show me a viewport screenshot.

> Export it to ../SurgeryCraft/content/assets/models/ as `cleared` with our own source
> record, then run `clinicalcraft assets inspect … --type sc-anaesthesia-workstation`.

Claude sees the result through `get_viewport_screenshot` and can correct it; the
inspector is the authority on whether the file fits.

### Headless

The same code runs without a window: `blender -b -P build.py`, or with the `bpy`
module (`pip install bpy`, Python 3.11) — SurgeryCraft's `tools/blender/build.py`
rebuilds every model that way and writes the references its catalog generator reads.

## Model rules

* **Frame.** Metres, the origin at the footprint centre on the floor, the front
  facing glTF +Z (Blender −Y: the Front view). Build in place over the blockout;
  `export_model` records `scale: 1` and the `offset` that keeps the model where it
  was built (a pendant stays at the ceiling).
* **Fill the footprint** — it is the collider and the aim box. The inspector warns
  past 25 % and fails past 2× / ½, except on footprint axes under 5 cm (an instrument
  lying flat), where a thinner model is fine.
* **Screens.** Named `screen` parts are live displays the world draws (vitals, PACS,
  checklists); they keep drawing over the model. Leave their front faces clear —
  `Kit.screen_bezel(part)` builds a housing just behind one.
* **Surfaces things stand on keep their height** (a set-up table's drape top at
  0.90 m carries the instruments placed on it).
* **Draw calls.** Each primitive of a model is a draw call. The kit merges every
  shape into one mesh and puts palette colours that share roughness and metalness
  into one material (a vertex colour each); emissive and transparent materials keep
  their own. Static placements of one model are drawn as instances; portable ones
  (carts, handheld items) cost their primitives each. Items under 0.3 m on every
  side cast no shadow. Aim for ≤ 10 000 triangles and ≤ 6 materials per model.
* **Single-file GLB**, no DRACO/meshopt (they fall back to voxels under `serve`'s CSP).

## Third-party assets and the use status

blender-mcp can pull Poly Haven assets (CC0), Sketchfab models (each with its own
licence) and generated models (Hyper3D Rodin, Hunyuan3D — the providers' terms).
Whatever comes in, record `source` and set `use` (ASSETS.md): **`cleared`** only when
the licence allows redistribution and this use, **`research-only`** for
non-commercial or research terms (keep it in `assets/local/`, never in a commit or a
content pack), **`pending`** until checked (the inspector fails). Keep the original
download untouched next to the derived model, and note the changes in `source.changes`.

### Sources surveyed (2026-10-30)

A survey of 3D sources for hospital, instrument and anatomy work, with the status a
model taken from each **starts** from here. They come from that survey's reading of
each project's licence page, not from a legal review: check the exact release you
download before you clear anything.

| source | what it offers | starts as | note |
|---|---|---|---|
| Poly Haven, ambientCG | HDRIs, PBR materials, props | cleared (CC0-1.0) | materials and lighting for renders; the voxel world uses palette colours |
| BodyParts3D | named organ meshes | cleared (CC-BY-4.0) | attribution; the bundled atlas already uses Z-Anatomy / BodyParts3D (CC BY-SA 4.0) |
| Human Reference Atlas 3D library | organ GLBs | cleared (CC-BY-4.0) | attribution |
| Open Anatomy SPL atlases (e.g. knee) | MRI-derived structures | cleared per atlas | the knee atlas: 3D Slicer licence section B (notices, attribution); check each atlas |
| NLM Visible Human | CT/MRI/cryosections | cleared | acknowledge the source, no implied endorsement |
| MakeHuman / MPFB core | parametric people | cleared (CC0-1.0) | third-party clothes and hair differ |
| 100STYLE | locomotion BVH | cleared (CC-BY-4.0) | one retargeted bundle's mesh is non-commercial |
| C3VDv2; EndoSLAM | colon / GI geometry and camera paths | cleared (CC-BY-4.0) | the original C3VD is CC BY-NC-SA |
| CMU motion capture | general mocap | cleared, with a condition | usable in products; the raw data may not be resold |
| Manufacturer CAD (Baxter/Hillrom, Getinge) | beds, tables, lights, booms | pending | no open redistribution licence found; reference geometry only |
| NVIDIA Isaac Sim hospital; Isaac for Healthcare | USD scenes and assets | pending | asset terms vary; Lightwheel SimReady is non-commercial R&D |
| TotalSegmentator v3; MedShapeNet | CT segmentations; 100 000+ shapes | pending | v3 licence not readable; MedShapeNet inherits each source's terms |
| CORE4D; OphNet-3D; Open Knee(s) | interaction / hand data; knee models | pending | SMPL-X terms; partial release; release-specific licences |
| Sketchfab; Hyper3D; Hunyuan3D (via blender-mcp) | downloaded or generated models | pending | per-model licence; provider terms |
| 3D-COSI | 103 scanned instruments | research-only | an earlier release is CC BY-NC 4.0 |
| Edinburgh simulated tools; AMASS; GRAB; BEHAVE; MVOR; 4D-OR; MM-OR | tools, motion, OR recordings | research-only | research or non-commercial terms, or access by application |
| Vascular Model Repository | vessel geometry | research-only | research and development licence |

The OR recordings and motion datasets inform staff movement and timing; nothing in
the embodied world plays them back. They have no place in a content pack.
