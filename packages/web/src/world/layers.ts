/**
 * The layers of an equipment model (docs/BLENDER.md "Layers"): nodes named `layer:<id>` in the file — parts drawn
 * only in the states whose look names them (`live.ts`), never for a placement whose look does not follow its state
 * (`models.ts`).
 */
import type { Object3D } from "three";
import { LAYER_NODE } from "@clinicalcraft/core";

/**
 * The layer a node of a model is (null: none). three's loader strips ":" from a node's name and keeps the file's
 * own in `userData.name`; a node built in code may carry the name itself.
 */
export function layerOf(o: Object3D): string | null {
  const name = typeof o.userData?.name === "string" ? o.userData.name : o.name;
  return LAYER_NODE.exec(name)?.[1] ?? null;
}

/**
 * Show the layers of a placed model that a look names and hide the others (each as a whole: its node); what is
 * in no layer is not touched. Returns the layers the model has, sorted.
 */
export function showLayers(model: Object3D, layers: readonly string[]): string[] {
  const want = new Set(layers), found = new Set<string>();
  model.traverse((o) => {
    const layer = layerOf(o);
    if (layer === null) return;
    found.add(layer);
    o.visible = want.has(layer);
  });
  return [...found].sort();
}
