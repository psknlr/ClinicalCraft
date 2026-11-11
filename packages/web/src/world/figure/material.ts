/**
 * The one material of the people of the world and of what they hold (`Sculpt` geometry): the vertex colour is
 * the surface colour, and the per-vertex `finish` is its gloss (it lowers the roughness: cloth stays matt, an
 * eye, a shoe or a steel chest piece catch the light) and its glow (skin gives a little of its own colour back
 * in shade, as living skin does). Shared by every figure.
 */
import { MeshStandardMaterial } from "three";

/** Roughness of a surface with no gloss (cloth, skin, hair). */
const MATT = 0.82;
/** Roughness a full gloss takes off. */
const POLISH = 0.66;

let shared: MeshStandardMaterial | null = null;

/** The shared figure material (see the module doc). */
export function figureMaterial(): MeshStandardMaterial {
  if (shared) return shared;
  const m = new MeshStandardMaterial({ vertexColors: true, roughness: MATT, metalness: 0 });
  m.name = "__figure";
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 finish;\nvarying vec2 vFinish;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFinish = finish;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vFinish;")
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\nroughnessFactor = clamp( roughnessFactor - vFinish.x * ${POLISH.toFixed(2)}, 0.05, 1.0 );`)
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vFinish.y;");
  };
  m.customProgramCacheKey = () => "cc-figure";
  shared = m;
  return m;
}
