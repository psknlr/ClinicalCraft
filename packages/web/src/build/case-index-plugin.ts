/**
 * Vite plugin (build and dev, also loaded by vitest): the bundled case index
 * (docs/EMBODIED.md §11). It indexes `<contentDir>/cases/<folder>/case.json`
 * with the shared builder (`caseIndexEntry` via `CaseIndexer`, the same as
 * `clinicalcraft serve` and `clinicalcraft cases index`) and serves the
 * result as the virtual module `virtual:clinicalcraft/case-index`:
 *
 *   CASE_INDEX         CaseIndexEntry[] in library order (cards, filters, facility choice)
 *   CASE_FOLDERS       id → case folder (which lazy chunk holds the full case)
 *   CASE_INDEX_ISSUES  string[] (unreadable files, invalid JSON, duplicate ids)
 *
 * so the initial bundle carries only the index; every full case is its own
 * lazy chunk (app/content.ts). Nothing is generated into the repository.
 *
 * Imports the indexer by relative path: the Vite config bundles it (Node
 * builtins and isomorphic agent code only — no workspace package at runtime).
 */
import path from "node:path";
import type { Plugin } from "vite";
import { buildCaseIndex } from "../../../agent/src/node/case-index.js";

/** The virtual module's id. */
export const CASE_INDEX_MODULE = "virtual:clinicalcraft/case-index";
const RESOLVED_ID = `\0${CASE_INDEX_MODULE}`;

/** The virtual module's source for a content directory, and the case files it depends on. */
export async function caseIndexModule(contentDir: string): Promise<{ code: string; files: string[] }> {
  const index = await buildCaseIndex({ dirs: [contentDir] });
  const folders = Object.fromEntries([...index.files].map(([id, f]) => [id, f.folder]));
  const issues = index.issues.map((i) => `${path.relative(contentDir, i.file).split(path.sep).join("/")}: ${i.message.split(contentDir).join(".")}`);
  const code = [
    `export const CASE_INDEX = ${JSON.stringify(index.entries)};`,
    `export const CASE_FOLDERS = ${JSON.stringify(folders)};`,
    `export const CASE_INDEX_ISSUES = ${JSON.stringify(issues)};`,
    "",
  ].join("\n");
  return { code, files: [...index.files.values()].map((f) => f.file) };
}

/** Serve `virtual:clinicalcraft/case-index` for `contentDir` (packages/content). */
export function caseIndexPlugin(opts: { contentDir: string }): Plugin {
  const casesDir = path.join(path.resolve(opts.contentDir), "cases");
  let serving = false;
  return {
    name: "clinicalcraft-case-index",
    configResolved(config) {
      serving = config.command === "serve";
    },
    resolveId(id) {
      return id === CASE_INDEX_MODULE ? RESOLVED_ID : undefined;
    },
    async load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const { code, files } = await caseIndexModule(opts.contentDir);
      // `vite build --watch` rebuilds when a case changes (the dev server reloads below).
      if (!serving) for (const file of files) this.addWatchFile(file);
      return code;
    },
    configureServer(server) {
      // A case file added, changed or removed: rebuild the index and reload the page.
      const changed = (file: string) => {
        if (!file.startsWith(casesDir + path.sep) || !file.endsWith("case.json")) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher?.on("add", changed);
      server.watcher?.on("change", changed);
      server.watcher?.on("unlink", changed);
    },
  };
}
