/**
 * ClinicalCraft V5 web entry: styles, the app shell from index.html, boot.
 */
import "./styles/v4.css";
import "./styles/app.css";
import "./styles/surgery.css";
import { ClinicalCraftApp } from "./app/app.js";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`index.html is missing #${id}`);
  return node as T;
}

const app = new ClinicalCraftApp({
  canvas: el<HTMLCanvasElement>("world"),
  intro: el("intro"),
  hud: el("hud"),
  panel: el("panel"),
  approval: el("approval"),
  toast: el("toast-root"),
});
app.boot();
