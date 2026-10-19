/** The bundled case index, served by the Vite plugin in src/build/case-index-plugin.ts. */
declare module "virtual:clinicalcraft/case-index" {
  import type { CaseIndexEntry } from "@clinicalcraft/agent";
  /** Every bundled case's index entry, in library order. */
  export const CASE_INDEX: CaseIndexEntry[];
  /** Case id → its folder under packages/content/cases (the lazy chunk that holds the full case). */
  export const CASE_FOLDERS: Record<string, string>;
  /** Problems found while indexing (unreadable files, invalid JSON, duplicate ids). */
  export const CASE_INDEX_ISSUES: string[];
}
