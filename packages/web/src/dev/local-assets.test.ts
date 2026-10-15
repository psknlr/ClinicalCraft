import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { resolveLocalAsset } from "../../vite.config.js";

const dir = mkdtempSync(join(tmpdir(), "cc-vite-assets-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("Vite dev /local-assets (F10)", () => {
  const root = join(dir, "assets");
  mkdirSync(join(root, "figs"), { recursive: true });
  writeFileSync(join(root, "figs", "a.json"), "{}");
  writeFileSync(join(dir, "outside.json"), '{"secret":true}');
  symlinkSync(join(dir, "outside.json"), join(root, "evil.json"));
  symlinkSync(join(root, "figs", "a.json"), join(root, "alias.json"));

  it("serves files under the root", () => {
    expect(resolveLocalAsset("/local-assets/figs/a.json", [root])).toBe(realpathSync(join(root, "figs", "a.json")));
  });

  it("never follows a symlink out of the root (as clinicalcraft serve)", () => {
    expect(resolveLocalAsset("/local-assets/evil.json", [root])).toBeNull();
    expect(resolveLocalAsset("/local-assets/..%2Foutside.json", [root])).toBeNull();
  });

  it("a symlink that stays inside the root still resolves", () => {
    expect(resolveLocalAsset("/local-assets/alias.json", [root])).toBe(realpathSync(join(root, "figs", "a.json")));
  });
});
