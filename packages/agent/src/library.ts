/**
 * Case library order shared by every front-end that lists cases (CLI
 * `cases list` and picker, MCP `list_cases` and `clinicalcraft://cases`):
 * published cases first, then by difficulty, then by id (code-unit order).
 * Independent of the UI language and of load order, so numbers and listings
 * are stable. Front-ends that must not show ids (MCP) still sort by them and
 * print opaque handles.
 */
import type { CaseDefinition } from "@clinicalcraft/core";

/** Comparator for `libraryOrder` (published first, difficulty, id). */
export function compareLibraryOrder(a: CaseDefinition, b: CaseDefinition): number {
  const published = (c: CaseDefinition) => Number(c.provenance.kind === "published-case");
  return published(b) - published(a) || a.difficulty - b.difficulty || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** The cases in library order (a new array). */
export function libraryOrder<T extends CaseDefinition>(cases: Iterable<T>): T[] {
  return [...cases].sort(compareLibraryOrder);
}
