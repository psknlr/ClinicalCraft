/**
 * Package-relative locations. `src/paths.ts` and `dist/paths.js` are both one
 * level below `packages/cli/`, so the same relative URLs work from source
 * (tsx, vitest) and from the build.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** `packages/cli/` (the installed package root). */
export function cliPackageDir(): string {
  return fileURLToPath(new URL("../", import.meta.url));
}

let versionCache: string | null = null;

/** Version from `packages/cli/package.json`. */
export function cliVersion(): string {
  if (versionCache) return versionCache;
  try {
    const pkg = JSON.parse(readFileSync(join(cliPackageDir(), "package.json"), "utf8")) as { version?: unknown };
    versionCache = typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    versionCache = "0.0.0";
  }
  return versionCache;
}

/** Built web client (`packages/web/dist` with an index.html), or null when not built. */
export function webDistDir(): string | null {
  const candidates = [fileURLToPath(new URL("../../web/dist/", import.meta.url))];
  try {
    const resolveFn = (import.meta as unknown as { resolve?: (s: string) => string }).resolve;
    if (typeof resolveFn === "function") candidates.push(join(fileURLToPath(resolveFn("@clinicalcraft/web/package.json")), "..", "dist"));
  } catch {
    /* web package not resolvable (not installed / no exports) */
  }
  for (const dir of candidates) if (existsSync(join(dir, "index.html"))) return dir;
  return null;
}
