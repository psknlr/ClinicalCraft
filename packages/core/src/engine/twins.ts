/**
 * History phase twins (`history[].supersedes`, docs/CASE_AUTHORING.md §3).
 *
 * A history item X that lists Y in `supersedes` replaces Y's answer in every
 * phase where X is available (Y's present-tense answer no longer holds there):
 *
 * * **Selection** — in such a phase a question that would select Y selects X
 *   (`matchHistory` with `phase`), and Y itself cannot be asked (the reducer
 *   rejects `ask` of Y as `phase-locked`). The chain is followed
 *   transitively (Z supersedes X supersedes Y).
 * * **Credit** — asking X credits Y (and, transitively, what Y supersedes)
 *   for `asked` conditions and the assessment's required history, but Y is
 *   never added to `asked`: its answer was not heard, so it stays out of the
 *   revealed ledger, the journal and the transcript. Credit flows from the
 *   twin to the original only — asking the original never credits the twin
 *   (a re-assessment question has to be asked in its own phase).
 */
import type { CaseDefinition, HistoryItem } from "../schema/case.js";
import type { SessionState } from "../schema/session.js";

interface TwinIndex {
  byId: Map<string, HistoryItem>;
  /** Item id → every id it supersedes, transitively (itself excluded). */
  closure: Map<string, Set<string>>;
}

const cache = new WeakMap<readonly HistoryItem[], TwinIndex>();

function twinIndex(c: CaseDefinition): TwinIndex {
  let index = cache.get(c.history);
  if (index) return index;
  const byId = new Map(c.history.map((h) => [h.id, h]));
  const closure = new Map<string, Set<string>>();
  for (const h of c.history) {
    if (!h.supersedes?.length) continue;
    const out = new Set<string>();
    const stack = [...h.supersedes];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (id === h.id || out.has(id)) continue;
      out.add(id);
      stack.push(...(byId.get(id)?.supersedes ?? []));
    }
    closure.set(h.id, out);
  }
  index = { byId, closure };
  cache.set(c.history, index);
  return index;
}

function inPhase(item: { phases?: string[] }, phase: string): boolean {
  return !item.phases || item.phases.includes(phase);
}

/** True when the case declares any `supersedes` link (fast path for callers). */
export function hasHistoryTwins(c: CaseDefinition): boolean {
  return twinIndex(c).closure.size > 0;
}

/**
 * The item that supersedes history item `id` in `phase`, or null when `id` is
 * not superseded there: among the items available in `phase` that supersede
 * it directly or transitively (C supersedes B supersedes A answers for A even
 * where B is not available), the deepest one — not itself superseded by
 * another of them —, first in declaration order.
 */
export function supersededIn(c: CaseDefinition, id: string, phase: string): string | null {
  const { closure } = twinIndex(c);
  if (closure.size === 0) return null;
  const candidates = c.history.filter((h) => h.id !== id && inPhase(h, phase) && closure.get(h.id)?.has(id) === true);
  if (candidates.length === 0) return null;
  const deepest = candidates.find((h) => !candidates.some((o) => o !== h && closure.get(o.id)?.has(h.id) === true));
  return (deepest ?? candidates[0]!).id;
}

/**
 * The history item that answers for `id` in `phase`: `id` itself when it is
 * available there and not superseded; its superseding twin (followed
 * transitively, cycles stopped) when one is available there; otherwise null
 * (the item is restricted to other phases and has no twin in this one).
 */
export function historyTwin(c: CaseDefinition, id: string, phase: string): string | null {
  const item = twinIndex(c).byId.get(id);
  if (!item) return null;
  let current = id;
  const seen = new Set([id]);
  for (;;) {
    const next = supersededIn(c, current, phase);
    if (next === null || seen.has(next)) break;
    seen.add(next);
    current = next;
  }
  // A twin is available in `phase` by construction; the item itself only if listed for it.
  return current !== id || inPhase(item, phase) ? current : null;
}

/** True when history item `id` can be asked in `phase`: listed for it and not superseded there. */
export function historyAvailable(c: CaseDefinition, id: string, phase: string): boolean {
  const item = twinIndex(c).byId.get(id);
  return item !== undefined && inPhase(item, phase) && supersededIn(c, id, phase) === null;
}

/** Ids history item `id` supersedes, transitively (empty for an unknown id or none). */
export function supersededItems(c: CaseDefinition, id: string): string[] {
  return [...(twinIndex(c).closure.get(id) ?? [])];
}

/**
 * True when history item `id` counts as asked: it was asked, or an item that
 * supersedes it (directly or transitively) was asked. Used by `asked`
 * conditions and `assess()`; `state.asked` keeps only what was really asked.
 */
export function historyCredited(c: CaseDefinition, s: SessionState, id: string): boolean {
  if (s.asked.includes(id)) return true;
  const { closure } = twinIndex(c);
  if (closure.size === 0) return false;
  return s.asked.some((asked) => closure.get(asked)?.has(id) === true);
}

/** Every credited history id: the asked ones (in order), then those credited through a twin (declaration order). */
export function creditedHistory(c: CaseDefinition, s: SessionState): string[] {
  const out = [...new Set(s.asked)];
  const { closure } = twinIndex(c);
  if (closure.size === 0) return out;
  const credited = new Set(s.asked.flatMap((id) => [...(closure.get(id) ?? [])]));
  for (const h of c.history) if (credited.has(h.id) && !out.includes(h.id)) out.push(h.id);
  return out;
}
