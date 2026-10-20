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

/** Parsed JSON of an embedded local asset (standalone build only; null elsewhere). */
export function embeddedJson<T>(rel: string): T | null {
  const hit = embeddedTable()?.[rel];
  if (!hit) return null;
  try {
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(hit.data), (ch) => ch.charCodeAt(0)))) as T;
  } catch {
    return null;
  }
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

const contentTypes = new Map<string, Promise<string | null>>();

/**
 * Media type of a local asset URL (HEAD; cached), lower-case without
 * parameters, or null when it does not answer. Embedded (standalone) assets
 * report the type recorded at build time.
 */
export function assetContentType(url: string | null): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    const rel = [...blobs.entries()].find(([, u]) => u === url)?.[0];
    const type = rel ? embeddedTable()?.[rel]?.type : undefined;
    return Promise.resolve((type ?? "application/octet-stream").split(";")[0]!.trim().toLowerCase());
  }
  let p = contentTypes.get(url);
  if (!p) {
    p = fetch(url, { method: "HEAD" })
      .then((r) => (r.ok ? (r.headers.get("content-type") ?? "application/octet-stream").split(";")[0]!.trim().toLowerCase() : null))
      .catch(() => null);
    contentTypes.set(url, p);
  }
  return p;
}

/** Whether a local asset URL answers with something other than an HTML page (HEAD; cached). */
export function assetExists(url: string | null): Promise<boolean> {
  return assetContentType(url).then((type) => type !== null && type !== "text/html");
}
