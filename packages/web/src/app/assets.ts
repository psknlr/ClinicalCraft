/**
 * Local-only assets (docs/ASSETS.md): `/local-assets/cases/<caseId>/<file>`
 * and `/local-assets/anatomy/*`, served by `clinicalcraft serve` or the Vite
 * plugin. The standalone build embeds whatever was installed at build time in
 * a `<script type="application/json" id="cc-local-assets">` block
 * ({path: base64}); those become blob URLs on demand.
 */
import type { AssetRef, CaseDefinition } from "@clinicalcraft/core";
import { STANDALONE } from "./llm.js";

let embedded: Record<string, { type: string; data: string }> | null | undefined;
const blobs = new Map<string, string>();

function embeddedTable(): Record<string, { type: string; data: string }> | null {
  if (embedded !== undefined) return embedded;
  embedded = null;
  try {
    const el = document.getElementById("cc-local-assets");
    if (el?.textContent) embedded = JSON.parse(el.textContent) as Record<string, { type: string; data: string }>;
  } catch {
    embedded = null;
  }
  return embedded;
}

/** URL for a local asset path relative to the local-assets root, or null when it cannot exist. */
export function localAssetUrl(rel: string): string | null {
  const table = embeddedTable();
  if (table) {
    const hit = table[rel];
    if (!hit) return null;
    let url = blobs.get(rel);
    if (!url) {
      const bin = atob(hit.data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      url = URL.createObjectURL(new Blob([bytes], { type: hit.type }));
      blobs.set(rel, url);
    }
    return url;
  }
  if (STANDALONE || location.protocol === "file:") return null;
  return `/local-assets/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

/** The file name of a case asset (`assets/fig1.png` → `fig1.png`). */
export function assetFile(asset: AssetRef): string {
  const parts = asset.path.split(/[\\/]/);
  return parts[parts.length - 1] || asset.id;
}

/** URL of a case asset (local-only assets resolve under /local-assets/cases/<caseId>/). */
export function caseAssetUrl(c: CaseDefinition, assetId: string): { asset: AssetRef | null; url: string | null } {
  const asset = c.assets.find((a) => a.id === assetId) ?? null;
  if (!asset) return { asset: null, url: null };
  if (/^https?:\/\//.test(asset.path)) return { asset, url: asset.path };
  return { asset, url: localAssetUrl(`cases/${c.id}/${assetFile(asset)}`) };
}

const existence = new Map<string, Promise<boolean>>();

/** Whether a local asset URL answers (HEAD; cached). */
export function assetExists(url: string | null): Promise<boolean> {
  if (!url) return Promise.resolve(false);
  if (url.startsWith("blob:") || url.startsWith("data:")) return Promise.resolve(true);
  let p = existence.get(url);
  if (!p) {
    p = fetch(url, { method: "HEAD" })
      .then((r) => r.ok && !(r.headers.get("content-type") ?? "").includes("text/html"))
      .catch(() => false);
    existence.set(url, p);
  }
  return p;
}
