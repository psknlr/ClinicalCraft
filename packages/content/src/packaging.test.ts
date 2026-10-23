/**
 * The published package ships every data directory the loaders read
 * (`files`) and exposes it by subpath (`exports`): cases, facilities,
 * catalogs, JSON Schemas, benchmark scenarios, grounding sets and room
 * templates (facilities that place templates cannot be compiled without them).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8")) as { files: string[]; exports: Record<string, unknown> };
const DATA_DIRS = ["cases", "facilities", "catalogs", "schemas", "bench", "grounding", "templates"];

describe("@clinicalcraft/content packaging", () => {
  it("every data directory exists and is published and exported", () => {
    for (const dir of DATA_DIRS) {
      expect(statSync(new URL(`${dir}/`, root)).isDirectory(), dir).toBe(true);
      expect(pkg.files, dir).toContain(dir);
      expect(pkg.exports[`./${dir}/*`], dir).toBe(`./${dir}/*`);
    }
  });

  it("no top-level data directory is left out", () => {
    const skip = new Set(["src", "dist", "node_modules"]);
    const dirs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && !skip.has(d.name) && !d.name.startsWith(".")).map((d) => d.name);
    for (const dir of dirs) expect(DATA_DIRS, `${dir} is not published`).toContain(dir);
  });
});
