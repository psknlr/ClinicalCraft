import { describe, expect, it } from "vitest";
import { Group, Mesh, Object3D, Texture, type MeshBasicMaterial } from "three";
import { EquipmentTypeSchema, type EquipmentType } from "@clinicalcraft/core";
import { animateLive, applyLook, createLive, liveScreenMaterial, setLiveModel, showScreen, type LivePlacement, type LiveScreen, type ScreenPainter } from "./live.js";
import { layerOf, showLayers } from "./layers.js";
import { UNIT_PLANE } from "./voxels.js";

/** A training station: a body on its side, a monitor, a model in layers — an operation in a few states. */
const STATION: EquipmentType = EquipmentTypeSchema.parse({
  id: "station",
  name: { "zh-CN": "训练台", en: "Training station" },
  category: "teaching",
  description: { "zh-CN": "胸腔镜训练台", en: "A thoracoscopy training station" },
  footprint: { w: 2.1, d: 1.1, h: 1.8 },
  parts: [{ name: "screen", m: "screen", p: [-0.7, 1.5, -0.4], s: [0.5, 0.3, 0.04] }],
  interaction: { kind: "device" },
  screen: "thoracoscopy",
  model: { uri: "models/station.glb", license: "CC0-1.0" },
  manikin: { posture: "lateral", sideUp: "left", cover: "blanket", breathing: "both", flex: 9, asleep: true, y: 0.93, x: -0.27, rot: 90 },
  behavior: {
    initial: "ready",
    states: {
      ready: { look: { screen: "none" } },
      "lung-down": { look: { screen: "none", manikin: { cover: "drapes", breathing: "one-lung" } } },
      explored: { look: { layers: ["camera-port", "scope"], manikin: { cover: "drapes", breathing: "one-lung" } } },
      drained: { look: { layers: ["chest-tube"], screen: "lab", manikin: { cover: "drapes", breathing: "none" } } },
      parked: {},
    },
    operations: { reset: { name: { "zh-CN": "复位", en: "Reset" }, from: "*", to: "ready" } },
  },
});

/** A model as three's loader hands it over: ":" stripped from a node's name, the file's own kept in `userData`. */
function loadedNode(name: string, ...children: Object3D[]): Object3D {
  const o = children.length ? new Group() : new Mesh();
  o.name = name.replace(/[[\].:/]/g, "");
  o.userData.name = name;
  for (const c of children) o.add(c);
  return o;
}

function stationModel(): { model: Group; node: (name: string) => Object3D } {
  const model = new Group();
  model.add(loadedNode("table"), loadedNode("layer:camera-port"), loadedNode("layer:scope", loadedNode("shaft"), loadedNode("camera head")), loadedNode("layer:chest-tube.001"), loadedNode("monitor"));
  const node = (name: string) => {
    let found: Object3D | null = null;
    model.traverse((o) => {
      if (o.userData.name === name) found = o;
    });
    if (!found) throw new Error(name);
    return found;
  };
  return { model, node };
}

const painted: string[] = [];
const paint: ScreenPainter = (kind, w, h, seed) => {
  painted.push(`${kind} ${w}x${h} ${seed}`);
  const texture = new Texture();
  texture.name = kind;
  return { texture };
};

function liveStation(state: string | null = "ready"): { rec: LivePlacement; parent: Group; screen: LiveScreen } {
  const parent = new Group();
  const rec = createLive("st-1", STATION, { x: 4, y: 0, z: -2, rot: 90 }, parent, state);
  const mesh = new Mesh(UNIT_PLANE, liveScreenMaterial(null));
  mesh.visible = false;
  const screen: LiveScreen = { mesh, w: 0.5, h: 0.3, seed: "st-1", kind: "none", texture: null };
  rec.screens.push(screen);
  applyLook(rec, rec.state, paint);
  return { rec, parent, screen };
}

describe("the layers of a placed model (layers.ts)", () => {
  it("a layer is a node named layer:<id> in the file — read from what the loader kept of the name", () => {
    expect(layerOf(loadedNode("layer:scope"))).toBe("scope");
    expect(layerOf(loadedNode("layer:chest-tube.001"))).toBe("chest-tube");
    expect(layerOf(loadedNode("table"))).toBeNull();
    // the loader's own spelling alone says nothing ("layerscope"): only the file's name counts
    const sanitized = new Object3D();
    sanitized.name = "layerscope";
    expect(layerOf(sanitized)).toBeNull();
    // a node built in code (no loader) may carry the name itself; and a copy keeps what it is
    const own = new Object3D();
    own.name = "layer:scope";
    expect(layerOf(own)).toBe("scope");
    expect(layerOf(loadedNode("layer:scope").clone())).toBe("scope");
  });

  it("showLayers shows the layers a look names and hides the others; what is in no layer is never touched", () => {
    const { model, node } = stationModel();
    expect(showLayers(model, ["scope", "camera-port"])).toEqual(["camera-port", "chest-tube", "scope"]);
    expect(node("layer:scope").visible).toBe(true);
    expect(node("layer:camera-port").visible).toBe(true);
    expect(node("layer:chest-tube.001").visible).toBe(false);
    for (const always of ["table", "monitor", "shaft", "camera head"]) expect(node(always).visible).toBe(true);
    showLayers(model, []);
    for (const layer of ["layer:scope", "layer:camera-port", "layer:chest-tube.001"]) expect(node(layer).visible).toBe(false);
    // a layer is hidden as a whole: its own children are left as they are
    expect(node("shaft").visible).toBe(true);
    // a layer the model does not have: nothing to show, nothing breaks
    expect(showLayers(model, ["no-such-layer"])).toEqual(["camera-port", "chest-tube", "scope"]);
  });
});

describe("a placement whose look follows its state (live.ts)", () => {
  it("is drawn as its state is at the start: its manikin where the type puts it, its screens' picture, its layers once the model is in", () => {
    const { rec, parent, screen } = liveStation("ready");
    expect(rec.look).toMatchObject({ layers: [], screen: "none", manikin: { cover: "blanket", breathing: "both" } });
    expect(rec.manikin!.rig.root.parent).toBe(parent);
    expect(rec.manikin!.rig.root.name).toBe("manikin");
    expect(rec.manikin!.drawn.cover).toBe("blanket");
    expect(screen.mesh.visible).toBe(false);
    expect(screen.texture).toBeNull();
    // the model arrives later (it is loaded after the build): its layers are shown as the state is then
    const { model, node } = stationModel();
    setLiveModel(rec, model);
    expect(rec.model).toBe(model);
    for (const layer of ["layer:scope", "layer:camera-port", "layer:chest-tube.001"]) expect(node(layer).visible).toBe(false);
    // a placement that starts further on (its own `state`) is built that way
    const later = liveStation("explored");
    expect(later.rec.manikin!.drawn).toMatchObject({ cover: "drapes", breathing: "one-lung" });
    expect(later.screen.mesh.visible).toBe(true);
    expect(later.screen.texture!.name).toBe("thoracoscopy");
    const m2 = stationModel();
    setLiveModel(later.rec, m2.model);
    expect(m2.node("layer:scope").visible).toBe(true);
    expect(m2.node("layer:chest-tube.001").visible).toBe(false);
  });

  it("applyLook draws the next state: layers, the screens' picture (the old texture handed back), the manikin rebuilt only when the figure differs", () => {
    const { rec, parent, screen } = liveStation("ready");
    const { model, node } = stationModel();
    setLiveModel(rec, model);
    const blanket = rec.manikin!.rig;
    painted.length = 0;

    // the lung is let down: draped now — another figure; still no picture, no layer
    expect(applyLook(rec, "lung-down", paint)).toEqual([]);
    expect(rec.state).toBe("lung-down");
    const draped = rec.manikin!.rig;
    expect(draped).not.toBe(blanket);
    expect(blanket.root.parent).toBeNull();
    expect(draped.root.parent).toBe(parent);
    expect(parent.children.filter((c) => c.name === "manikin")).toHaveLength(1);
    expect(rec.manikin!.drawn).toMatchObject({ cover: "drapes", breathing: "one-lung" });
    expect(painted).toEqual([]);

    // the scope goes in: the same figure stays, the port and the scope show, the monitor has the picture
    expect(applyLook(rec, "explored", paint)).toEqual([]);
    expect(rec.manikin!.rig).toBe(draped);
    expect(node("layer:camera-port").visible).toBe(true);
    expect(node("layer:scope").visible).toBe(true);
    expect(node("layer:chest-tube.001").visible).toBe(false);
    expect(screen.mesh.visible).toBe(true);
    expect(painted).toEqual(["thoracoscopy 0.5x0.3 st-1"]);
    const scopePicture = screen.texture!;
    expect((screen.mesh.material as MeshBasicMaterial).map).toBe(scopePicture);

    // the same state again changes nothing and paints nothing
    expect(applyLook(rec, "explored", paint)).toEqual([]);
    expect(painted).toHaveLength(1);
    expect(screen.texture).toBe(scopePicture);

    // drained: another picture — the one it replaces is handed back to be disposed; only how the chest moves changed
    expect(applyLook(rec, "drained", paint)).toEqual([scopePicture]);
    expect(screen.texture!.name).toBe("lab");
    expect(rec.manikin!.rig).toBe(draped);
    expect(rec.manikin!.drawn.breathing).toBe("none");
    expect(node("layer:scope").visible).toBe(false);
    expect(node("layer:chest-tube.001").visible).toBe(true);

    // back to the start: dark again (the quad is not drawn), under the blanket again
    const lab = screen.texture!;
    expect(applyLook(rec, "ready", paint)).toEqual([lab]);
    expect(screen.mesh.visible).toBe(false);
    expect(screen.texture).toBeNull();
    expect(rec.manikin!.rig).not.toBe(draped);
    expect(draped.root.parent).toBeNull();
    for (const layer of ["layer:scope", "layer:camera-port", "layer:chest-tube.001"]) expect(node(layer).visible).toBe(false);

    // a state without a look, or one the type does not have: the type as it is (its own screen, none of its layers)
    applyLook(rec, "parked", paint);
    expect(rec.look).toMatchObject({ layers: [], screen: "thoracoscopy" });
    expect(screen.mesh.visible).toBe(true);
    applyLook(rec, "no-such-state", paint);
    expect(rec.look.layers).toEqual([]);
    applyLook(rec, null, paint);
    expect(rec.manikin!.drawn.cover).toBe("blanket");
  });

  it("showScreen paints a picture once per change", () => {
    const mesh = new Mesh(UNIT_PLANE, liveScreenMaterial(null));
    const screen: LiveScreen = { mesh, w: 1, h: 0.5, seed: "s", bg: "#123456", kind: "none", texture: null };
    painted.length = 0;
    expect(showScreen(screen, "none", paint)).toBeNull();
    expect(showScreen(screen, "xray", paint)).toBeNull(); // nothing was shown before
    const xray = screen.texture;
    expect(showScreen(screen, "xray", paint)).toBeNull();
    expect(painted).toEqual(["xray 1x0.5 s"]);
    expect(showScreen(screen, "none", paint)).toBe(xray);
    expect((mesh.material as MeshBasicMaterial).map).toBeNull();
  });

  it("a type with a manikin and no looks is live too: its manikin is drawn, and breathes if the type says so", () => {
    const type = EquipmentTypeSchema.parse({ ...STATION, behavior: undefined, manikin: { posture: "lying", y: 0.7, breathing: "both" } });
    const parent = new Group();
    const rec = createLive("bed-1", type, { x: 0, y: 0, z: 0, rot: 0 }, parent, null);
    expect(applyLook(rec, null, paint)).toEqual([]);
    expect(rec.manikin!.drawn).toMatchObject({ posture: "lying", cover: "clothes", breathing: "both" });
    const torso = rec.manikin!.rig.torso;
    animateLive([rec], 5000 / 3 - rec.manikin!.rig.phase * 5000);
    expect(torso.scale.z).toBeCloseTo(1.024, 3);
    expect(torso.scale.x).toBe(1); // on its back: the chest comes forwards, it does not widen
  });

  it("animateLive moves the chests that breathe, and stills one whose state says it no longer does", () => {
    const { rec } = liveStation("ready");
    const torso = () => rec.manikin!.rig.torso;
    const peak = (r: LivePlacement) => 5000 / 3 - r.manikin!.rig.phase * 5000;
    animateLive([rec], peak(rec));
    expect(torso().scale.z).toBeCloseTo(1.024, 3);
    expect(torso().scale.x).toBeCloseTo(1.006, 4); // on its side: the chest wall that is up rises a little
    applyLook(rec, "lung-down", paint);
    animateLive([rec], peak(rec));
    expect(torso().scale.z).toBeCloseTo(1.012, 3);
    expect(torso().scale.x).toBeLessThan(1.002); // the lung on the side that is up is down
    // over a whole breath the chest never goes in past its rest, never out past its depth
    for (let t = 0; t < 5000; t += 100) {
      animateLive([rec], t);
      expect(torso().scale.z).toBeGreaterThanOrEqual(1);
      expect(torso().scale.z).toBeLessThanOrEqual(1.0121);
    }
    // the same figure, no longer breathing (the state changed mid-breath): its chest goes back to rest and stays
    animateLive([rec], peak(rec));
    applyLook(rec, "drained", paint);
    animateLive([rec], peak(rec) + 300);
    expect(torso().scale.toArray()).toEqual([1, 1, 1]);
    animateLive([rec], peak(rec) + 900);
    expect(torso().scale.toArray()).toEqual([1, 1, 1]);
  });
});
