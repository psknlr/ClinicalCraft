/**
 * Anatomy model loading: gzip-compressed GLB fetched from the local asset
 * store (/local-assets/anatomy/anatomy.glb.gz, docs/ASSETS.md) and
 * decompressed with DecompressionStream. Servers that already applied
 * Content-Encoding (browser transparently inflated) are detected by the GLB
 * magic and used as-is.
 */

export type AtlasCatalogEntry = { id: string; kind: string; label: string; region: string; thorax: boolean; center: [number, number, number] };

export class ModelNotInstalledError extends Error {
  constructor(public readonly url: string | null, public readonly status?: number) {
    super(url ? `anatomy model not installed (${status ?? "missing"}): ${url}` : "anatomy model not configured");
    this.name = "ModelNotInstalledError";
  }
}

/** True when bytes start with the glTF binary magic "glTF". */
export function isGlb(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46;
}

/** True when bytes start with the gzip magic 1f 8b. */
export function isGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

export async function gunzip(bytes: Uint8Array): Promise<ArrayBuffer> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).arrayBuffer();
}

export async function fetchModel(url: string | null, onProgress?: (loaded: number, total: number) => void): Promise<ArrayBuffer> {
  if (!url) throw new ModelNotInstalledError(null);
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ModelNotInstalledError(url);
  }
  if (!res.ok) throw new ModelNotInstalledError(url, res.status);
  const total = Number(res.headers.get("content-length") || 0);
  let bytes: Uint8Array;
  if (res.body && onProgress) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress(loaded, total);
    }
    bytes = new Uint8Array(loaded);
    let o = 0;
    for (const c of chunks) {
      bytes.set(c, o);
      o += c.length;
    }
  } else bytes = new Uint8Array(await res.arrayBuffer());
  if (isGlb(bytes)) return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  if (isGzip(bytes)) return gunzip(bytes);
  // an HTML fallback page (SPA dev servers) means "not installed"
  throw new ModelNotInstalledError(url, res.status);
}

/** Catalog next to the model (anatomy.glb.gz → catalog.json); null when absent. */
export async function fetchCatalog(modelUrl: string | null): Promise<AtlasCatalogEntry[] | null> {
  if (!modelUrl) return null;
  const url = modelUrl.replace(/[^/]*$/, "catalog.json");
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    return Array.isArray(json) ? (json as AtlasCatalogEntry[]) : null;
  } catch {
    return null;
  }
}
