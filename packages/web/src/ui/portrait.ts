/**
 * V4 pixel portrait (head + shoulders), now coloured from the case
 * appearance (skin, hair, hair style, shirt/gown, stature, accessory) or a
 * staff uniform.
 */
import type { Appearance } from "@clinicalcraft/core";
import { h } from "./dom.js";

function shade(hex: string, f: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `#${[ch(16), ch(8), ch(0)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export const STAFF_COLOURS: Record<string, { shirt: string; coat?: boolean }> = {
  nurse: { shirt: "#6fa8c7" },
  attending: { shirt: "#6d9fba", coat: true },
  radiologist: { shirt: "#34506b", coat: true },
  pathologist: { shirt: "#a397bc", coat: true },
  "lab-tech": { shirt: "#5f9e6e" },
  pharmacist: { shirt: "#5f9e6e", coat: true },
  receptionist: { shirt: "#aa6854" },
  paramedic: { shirt: "#34506b" },
  porter: { shirt: "#8a8f5a" },
  examiner: { shirt: "#7d8c6a", coat: true },
  clinician: { shirt: "#487c59", coat: true },
};

export function portrait(app: Partial<Appearance> & { coat?: boolean }, caption: string, opts: { small?: boolean } = {}): HTMLElement {
  const skin = app.skin ?? "#cba88a";
  const hairStyle = app.hairStyle ?? "short";
  const hair = hairStyle === "bald" ? shade(skin, 0.92) : app.hair ?? "#3b3027";
  const shirt = app.gown ? "#b9d3dc" : app.shirt ?? "#6d9fba";
  const scale = app.stature === "child" || app.stature === "infant" ? 0.8 : app.stature === "teen" ? 0.92 : 1;
  const head = h("div", {
    class: ["pixel-head", `hair-${hairStyle}`],
    style: `background:${skin};border-top-color:${hair};box-shadow:inset -12px 0 ${shade(skin, 0.86)};--hair:${hair}`,
  });
  if (app.accessory && app.accessory !== "none") head.appendChild(h("span", { class: `pixel-acc acc-${app.accessory}` }));
  const body = h("div", {
    class: ["pixel-body", app.coat ? "coat" : ""],
    style: `background:${shirt};border-color:${app.coat ? "#f1ead5" : shade(shirt, 1.15)};box-shadow:inset -15px 0 ${shade(shirt, 0.85)}`,
  });
  return h(
    "div",
    { class: ["portrait", opts.small ? "portrait-small" : ""], role: "img", "aria-label": caption },
    h("div", { class: "pixel-figure", style: `transform:scale(${scale})` }, head, body),
    h("small", null, caption),
  );
}
