/**
 * A published or adapted case's source — `provenance.citation`, `doi`, `authors`, `notes` and the debrief's
 * `references` — names the diagnosis more often than not (a case report's title says what the patient had).
 * Every front-end keeps it back until the case is complete (docs/GLOSSARY.md §4): the web's sources panel and
 * debrief, the CLI (`cases show`, `cases list --details`; `--spoilers` shows it), MCP (listings, resources;
 * `get_debrief` once complete) and the server content API (`?spoilers=1`). A synthetic case has no source to
 * spoil: its references are the guidance checked, which the debrief lists anyway.
 */
import type { CaseDefinition } from "@clinicalcraft/core";

/** What the source of a case is made of. */
export interface CaseSource {
  citation: string | null;
  doi: string | null;
  authors: string[];
  notes: CaseDefinition["provenance"]["notes"] | null;
  references: string[];
}

/** Does the case cite a source that may name the diagnosis (a published or adapted case)? */
export function citesSource(c: { provenance: { kind: string } }): boolean {
  return c.provenance.kind === "published-case" || c.provenance.kind === "adapted";
}

/** The case's source (null for a synthetic case). */
export function caseSource(c: Pick<CaseDefinition, "provenance" | "debrief">): CaseSource | null {
  if (!citesSource(c)) return null;
  const p = c.provenance;
  return { citation: p.citation ?? null, doi: p.doi ?? null, authors: [...(p.authors ?? [])], notes: p.notes ?? null, references: [...(c.debrief.references ?? [])] };
}

/**
 * The case as offered before it is complete: a published or adapted case without its source — no citation,
 * DOI or notes, no authors, no debrief references (the other fields as they are). A synthetic case is returned
 * unchanged. Never mutates its input.
 */
export function withoutSource<T extends Pick<CaseDefinition, "provenance" | "debrief">>(c: T): T {
  if (!citesSource(c)) return c;
  const { citation: _citation, doi: _doi, notes: _notes, ...provenance } = c.provenance;
  return { ...c, provenance: { ...provenance, authors: [] }, debrief: { ...c.debrief, references: [] } };
}
