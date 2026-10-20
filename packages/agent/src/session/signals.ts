/**
 * Abort-signal helpers (isomorphic). `anySignal` aborts when any of its
 * inputs does — `AbortSignal.any` where the runtime has it, else a small
 * fallback — so a call can be cancelled by its caller (a turn, an external
 * call) AND by the world (`cancel(actorId)`, a cancel operation), e.g. to
 * withdraw an approval prompt whose world action was cancelled (review C5).
 */

/** A signal that aborts when any of `signals` does (undefined when none is given). */
export function anySignal(signals: readonly (AbortSignal | undefined | null)[]): AbortSignal | undefined {
  const list = [...new Set(signals.filter((s): s is AbortSignal => !!s))];
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  const any = (AbortSignal as unknown as { any?: (signals: AbortSignal[]) => AbortSignal }).any;
  if (typeof any === "function") return any.call(AbortSignal, list);
  const controller = new AbortController();
  const aborted = list.find((s) => s.aborted);
  if (aborted) {
    controller.abort(aborted.reason);
    return controller.signal;
  }
  const onAbort = (event: Event) => {
    for (const s of list) s.removeEventListener("abort", onAbort);
    controller.abort((event.target as AbortSignal | null)?.reason);
  };
  for (const s of list) s.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}
