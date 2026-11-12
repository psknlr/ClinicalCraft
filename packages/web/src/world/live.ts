/**
 * Equipment whose look follows its state (a behaviour state's `look`: docs/FACILITIES.md "A look for each
 * state"): the layers of its model that show, the picture on its screens, its manikin — covered differently,
 * its chest moving or still. One record per such placement; `applyLook` draws the look of a state.
 *
 * The state is the world model's (`WorldRuntime.stateOf`): whoever changed it — a learner at the device, a
 * colleague, an agent — the scene follows through `WorldApi.setEquipmentState`, and nothing here decides
 * anything. Without a world model a placement keeps the look of the state it starts in.
 */
import { MeshBasicMaterial, type Mesh, type Object3D, type Texture } from "three";
import { lookOf, sameFigure, type DrawnManikin, type EquipmentType, type ResolvedLook } from "@clinicalcraft/core";
import { breathOf, buildManikin } from "./manikin.js";
import { showLayers } from "./layers.js";
import { disposeRig, setBreath, type PersonRig } from "./npc.js";
import { createScreenTexture, type ScreenKind } from "./screens.js";

/** A screen of a live placement: its display quad, and what its picture is made from. */
export interface LiveScreen {
  mesh: Mesh;
  /** The display's size (m), the seed of its picture and the colour of the part behind it. */
  w: number;
  h: number;
  seed: string;
  bg?: string;
  kind: ScreenKind;
  texture: Texture | null;
}

/** What paints a screen's picture (`createScreenTexture`; tests give their own — a canvas needs a browser). */
export type ScreenPainter = (kind: ScreenKind, w: number, h: number, seed: string, bg?: string) => { texture: Texture };

export interface LivePlacement {
  id: string;
  type: Pick<EquipmentType, "behavior" | "screen" | "manikin">;
  /** The placement's origin in the world (its level's floor + its own y) and its turn (degrees). */
  at: { x: number; y: number; z: number; rot: number };
  /** Where what is drawn of it goes: its level's group, or a portable placement's own. */
  parent: Object3D;
  state: string | null;
  look: ResolvedLook;
  /** The placed model, once it is in: its `layer:<id>` nodes are shown as the look says. */
  model: Object3D | null;
  manikin: { rig: PersonRig; drawn: DrawnManikin } | null;
  screens: LiveScreen[];
}

/**
 * The record of a live placement in the state it starts in. Nothing is drawn yet: the builder adds its screens,
 * then `applyLook` draws it (its manikin too); its model's layers follow once the model is in (`setLiveModel`).
 */
export function createLive(id: string, type: LivePlacement["type"], at: LivePlacement["at"], parent: Object3D, state: string | null): LivePlacement {
  return { id, type, at, parent, state, look: lookOf(type, state), model: null, manikin: null, screens: [] };
}

/** The model of a live placement is in: its layers follow the look from now on. */
export function setLiveModel(rec: LivePlacement, model: Object3D): void {
  rec.model = model;
  showLayers(model, rec.look.layers);
}

function drawManikin(rec: LivePlacement): void {
  const want = rec.look.manikin;
  if (rec.manikin && want && sameFigure(rec.manikin.drawn, want)) {
    // the same figure: only how its chest moves may have changed
    rec.manikin.drawn = want;
    return;
  }
  if (rec.manikin) {
    disposeRig(rec.manikin.rig);
    rec.manikin = null;
  }
  if (!want) return;
  const rig = buildManikin(want, rec.at, rec.id);
  rec.parent.add(rig.root);
  rec.manikin = { rig, drawn: want };
}

/**
 * Paint a live screen's picture for a kind (`none`: dark — no quad is drawn, the housing behind it stays).
 * Returns the texture it replaced, to dispose.
 */
export function showScreen(screen: LiveScreen, kind: ScreenKind, paint: ScreenPainter = createScreenTexture): Texture | null {
  if (kind === screen.kind && (screen.texture !== null || kind === "none")) return null;
  const old = screen.texture;
  screen.kind = kind;
  if (kind === "none") {
    screen.texture = null;
    screen.mesh.visible = false;
    (screen.mesh.material as MeshBasicMaterial).map = null;
    return old;
  }
  const made = paint(kind, screen.w, screen.h, screen.seed, screen.bg);
  screen.texture = made.texture;
  const material = screen.mesh.material as MeshBasicMaterial;
  material.map = made.texture;
  material.needsUpdate = true;
  screen.mesh.visible = true;
  return old;
}

/**
 * Draw a live placement as it is in `state`: the model's layers, the screens' picture, the manikin (rebuilt
 * when the figure itself differs). Returns the textures it replaced — the caller owns and disposes them.
 */
export function applyLook(rec: LivePlacement, state: string | null, paint: ScreenPainter = createScreenTexture): Texture[] {
  rec.state = state;
  rec.look = lookOf(rec.type, state);
  if (rec.model) showLayers(rec.model, rec.look.layers);
  const replaced: Texture[] = [];
  for (const s of rec.screens) {
    const old = showScreen(s, rec.look.screen as ScreenKind, paint);
    if (old) replaced.push(old);
  }
  drawManikin(rec);
  return replaced;
}

/** Every frame: the chests of the manikins that breathe. */
export function animateLive(records: Iterable<LivePlacement>, now: number): void {
  for (const rec of records) {
    const m = rec.manikin;
    if (!m || m.drawn.breathing === "none") {
      if (m && (m.rig.torso.scale.z !== 1 || m.rig.torso.scale.x !== 1)) setBreath(m.rig, 0, 0);
      continue;
    }
    const [depth, rise] = breathOf(m.drawn, now, m.rig.phase);
    setBreath(m.rig, depth, rise);
  }
}

/** A quad's material for a live screen (self-lit, drawn just proud of its housing). */
export function liveScreenMaterial(texture: Texture | null): MeshBasicMaterial {
  return new MeshBasicMaterial({ map: texture, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
}
