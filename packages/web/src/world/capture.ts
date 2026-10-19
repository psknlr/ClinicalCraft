/**
 * Camera frames for vision models (`get_camera_frame`, EMBODIED §4): the
 * avatar's view of the 3D world — the WebGL viewport only, never the HUD or
 * a window — redrawn, downscaled to at most `maxWidth` (≤ 768) px and
 * encoded as JPEG. The drawing buffer is not preserved between frames, so
 * the copy is made right after a render in the same task.
 */
import type { Camera, Scene, WebGLRenderer } from "three";

/** Largest frame width (px) ever handed to a model. */
export const MAX_FRAME_WIDTH = 768;

/** Output size of a frame: the viewport scaled down (never up) to fit `maxWidth` (capped at 768). */
export function frameSize(width: number, height: number, maxWidth: number): { width: number; height: number } {
  const cap = Math.max(16, Math.min(MAX_FRAME_WIDTH, Math.floor(maxWidth) || MAX_FRAME_WIDTH));
  const k = Math.min(1, cap / Math.max(1, width));
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

/** Render the scene and copy the canvas into a JPEG (base64 without the `data:` prefix); null when it cannot be read. */
export function captureJpeg(renderer: WebGLRenderer, scene: Scene, camera: Camera, maxWidth: number, quality: number): { data: string; width: number; height: number } | null {
  const src = renderer.domElement;
  if (!src.width || !src.height) return null;
  const size = frameSize(src.width, src.height, maxWidth);
  renderer.render(scene, camera);
  const out = document.createElement("canvas");
  out.width = size.width;
  out.height = size.height;
  const c2d = out.getContext("2d");
  if (!c2d) return null;
  c2d.drawImage(src, 0, 0, size.width, size.height);
  let url: string;
  try {
    url = out.toDataURL("image/jpeg", Math.max(0.3, Math.min(0.95, quality)));
  } catch {
    return null;
  }
  const comma = url.indexOf(",");
  if (!url.startsWith("data:image/jpeg") || comma < 0) return null;
  return { data: url.slice(comma + 1), width: size.width, height: size.height };
}
