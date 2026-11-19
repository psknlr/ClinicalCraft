/** Conversation headshots use the authored figure and uniform, independently of the bedside camera and clinical state. */
import { Color, DirectionalLight, HemisphereLight, OrthographicCamera, Scene, SRGBColorSpace, WebGLRenderTarget, type WebGLRenderer } from "three";
import type { WorldApi, WorldOptions } from "../contracts.js";
import { buildPerson, buildStaffPerson, disposeRig, PATIENT_WEAR, type PersonRig } from "./npc.js";

const WIDTH = 320, HEIGHT = 240;

/** Render a bust on a transparent background in a temporary target on the world's existing GPU context. */
function headshot(renderer: WebGLRenderer, rig: PersonRig): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx || renderer.getContext().isContextLost()) return null;

  const scene = new Scene();
  const key = new DirectionalLight(0xfff4e2, 2.1);
  key.position.set(-2, 3, 4);
  scene.add(rig.root, key, new HemisphereLight(0xfffaf4, 0xb7c5be, 1.8));

  const half = 0.35 * rig.scale;
  const wide = half * WIDTH / HEIGHT;
  const camera = new OrthographicCamera(-wide, wide, half, -half, 0.05, 8);
  const centre = rig.tagY - 0.3 - half * 0.84;
  camera.position.set(0.36, centre + 0.08, 2);
  camera.lookAt(0, centre, 0);

  const previous = renderer.getRenderTarget();
  const colour = renderer.getClearColor(new Color());
  const alpha = renderer.getClearAlpha();
  const target = new WebGLRenderTarget(WIDTH, HEIGHT, { colorSpace: SRGBColorSpace });
  try {
    renderer.setRenderTarget(target);
    renderer.setClearColor(0, 0);
    renderer.render(scene, camera);
    const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
    renderer.readRenderTargetPixels(target, 0, 0, WIDTH, HEIGHT, pixels);
    const frame = ctx.createImageData(WIDTH, HEIGHT);
    const row = WIDTH * 4;
    for (let y = 0; y < HEIGHT; y++) {
      frame.data.set(pixels.subarray(y * row, (y + 1) * row), (HEIGHT - 1 - y) * row);
    }
    ctx.putImageData(frame, 0, 0);
    return canvas.toDataURL("image/png");
  } finally {
    renderer.setRenderTarget(previous);
    renderer.setClearColor(colour, alpha);
    target.dispose();
  }
}

/** Cache one still per person for this world. Clinical observations and live camera frames use their own paths. */
export function conversationPortraits(opts: WorldOptions, renderer: WebGLRenderer): WorldApi["portrait"] {
  const images = new Map<string, string>();
  return (kind, id) => {
    const key = `${kind}:${id}`;
    const cached = images.get(key);
    if (cached) return cached;
    let rig: PersonRig;
    if (kind === "staff") {
      const staff = opts.facility.staff?.find((s) => s.id === id);
      if (!staff) return null;
      rig = buildStaffPerson(staff);
    } else {
      const patient = opts.patients.find((p) => p.slotId === id);
      const appearance = kind === "companion" ? patient?.companion?.appearance : patient?.appearance;
      if (!appearance) return null;
      rig = buildPerson(appearance, { posture: "standing", seed: key, wear: kind === "patient" ? PATIENT_WEAR : undefined });
    }
    try {
      const image = headshot(renderer, rig);
      if (image) images.set(key, image);
      return image;
    } finally {
      disposeRig(rig);
    }
  };
}
