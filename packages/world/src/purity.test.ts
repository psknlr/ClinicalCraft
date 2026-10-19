import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** @clinicalcraft/world must stay pure (EMBODIED R1): no DOM, no three.js, no node:*, no wall clock or randomness. */
describe("package purity", () => {
  const root = fileURLToPath(new URL(".", import.meta.url));
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (name !== "__fixtures__") walk(path);
      } else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) files.push(path);
    }
  };
  walk(root);

  it("library sources import nothing impure and read no clock or randomness", () => {
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(code, file).not.toMatch(/from\s+["'](node:|three|fs|path|os)\b/);
      expect(code, file).not.toMatch(/\bDate\.now\(|\bnew Date\(|Math\.random\(|performance\.now\(/);
      expect(code, file).not.toMatch(/\b(document|window|localStorage|requestAnimationFrame)\./);
      expect(code, file).not.toMatch(/from\s+["']@clinicalcraft\/(agent|web|server|cli|mcp|content)/);
    }
  });
});
