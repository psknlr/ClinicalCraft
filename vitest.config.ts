import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { caseIndexPlugin } from "./packages/web/src/build/case-index-plugin.js";

const src = (pkg: string, entry = "index.ts") => fileURLToPath(new URL(`./packages/${pkg}/src/${entry}`, import.meta.url));

export default defineConfig({
  // The web's bundled case index (`virtual:clinicalcraft/case-index`), as in packages/web/vite.config.ts.
  plugins: [caseIndexPlugin({ contentDir: fileURLToPath(new URL("./packages/content", import.meta.url)) })],
  resolve: {
    alias: [
      { find: /^@clinicalcraft\/agent\/node$/, replacement: src("agent", "node/index.ts") },
      { find: /^@clinicalcraft\/agent$/, replacement: src("agent") },
      { find: /^@clinicalcraft\/bench$/, replacement: src("bench") },
      { find: /^@clinicalcraft\/core$/, replacement: src("core") },
      { find: /^@clinicalcraft\/world$/, replacement: src("world") },
      { find: /^@clinicalcraft\/content$/, replacement: src("content") },
      { find: /^@clinicalcraft\/server$/, replacement: src("server") },
      { find: /^@clinicalcraft\/mcp$/, replacement: src("mcp") },
    ],
  },
  test: {
    include: ["packages/*/src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "packages/web/e2e/**"],
    environment: "node",
    testTimeout: 30000,
    pool: "threads",
  },
});
