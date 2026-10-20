/**
 * V4 canvas signs (`q()`): cream panel (#eef0d9) with coloured bars top and
 * bottom and bold centred text; 768×160 canvas on a plane of width `w`.
 */
import { CanvasTexture, DoubleSide, FrontSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type BufferGeometry, type Texture } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const SIGN_DEFAULT_COLOR = "#2f574d";

export class SignFactory {
  private readonly textures = new Map<string, Texture>();
  private readonly materials = new Map<string, MeshBasicMaterial>();
  private readonly geoms = new Map<number, PlaneGeometry>();
  private readonly geoms2 = new Map<number, BufferGeometry>();

  texture(text: string, color = SIGN_DEFAULT_COLOR): Texture {
    const key = `${color}|${text}`;
    let tex = this.textures.get(key);
    if (tex) return tex;
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#eef0d9";
    ctx.fillRect(0, 0, 768, 160);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 768, 10);
    ctx.fillRect(0, 150, 768, 10);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 58px sans-serif"; // V4 font stack (keeps the V4 look)
    // long (English) labels: shrink the font first (down to 34px) instead of squeezing glyphs
    const w = ctx.measureText(text).width;
    if (w > 718) ctx.font = `bold ${Math.max(34, Math.floor((58 * 718) / w))}px sans-serif`;
    ctx.fillText(text, 384, 82, 718);
    tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    this.textures.set(key, tex);
    return tex;
  }

  private material(text: string, color: string, doubleSided: boolean): MeshBasicMaterial {
    const key = `${color}|${text}|${doubleSided}`;
    let m = this.materials.get(key);
    if (!m) {
      m = new MeshBasicMaterial({ map: this.texture(text, color), side: doubleSided ? DoubleSide : FrontSide });
      this.materials.set(key, m);
    }
    return m;
  }

  private geometry(width: number): PlaneGeometry {
    const k = Math.round(width * 1000);
    let g = this.geoms.get(k);
    if (!g) {
      g = new PlaneGeometry(width, (width * 160) / 768);
      this.geoms.set(k, g);
    }
    return g;
  }

  /** Front quad + a back quad turned π (own UVs, so the text reads correctly from behind) in ONE geometry. */
  private geometry2(width: number): BufferGeometry {
    const k = Math.round(width * 1000);
    let g = this.geoms2.get(k);
    if (!g) {
      const front = new PlaneGeometry(width, (width * 160) / 768);
      const back = new PlaneGeometry(width, (width * 160) / 768).rotateY(Math.PI).translate(0, 0, -0.004);
      g = mergeGeometries([front, back], false) ?? front;
      if (g !== front) front.dispose();
      back.dispose();
      this.geoms2.set(k, g);
    }
    return g;
  }

  /**
   * A sign facing +Z. `twoSided` adds a back face (rotated π) so free
   * standing signs read correctly from both sides (V4 used DoubleSide,
   * which mirrors the text from behind) — one mesh, one draw call.
   */
  make(text: string, width = 3, color = SIGN_DEFAULT_COLOR, twoSided = false): Group | Mesh {
    const mesh = new Mesh(twoSided ? this.geometry2(width) : this.geometry(width), this.material(text, color, false));
    mesh.name = "sign";
    return mesh;
  }

  dispose(): void {
    for (const t of this.textures.values()) t.dispose();
    for (const m of this.materials.values()) m.dispose();
    for (const g of this.geoms.values()) g.dispose();
    for (const g of this.geoms2.values()) g.dispose();
    this.geoms2.clear();
    this.textures.clear();
    this.materials.clear();
    this.geoms.clear();
  }
}
