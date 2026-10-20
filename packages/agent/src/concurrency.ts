/**
 * Bounded concurrency for I/O-heavy fan-out (reading a large content
 * directory, fetching many cases): at most `max` tasks run at once, the rest
 * wait in FIFO order. Isomorphic (no timers, no node:*).
 */

/** Runs tasks with at most `max` in flight; `active`/`pending` for diagnostics and tests. */
export interface Limiter {
  <T>(task: () => Promise<T> | T): Promise<T>;
  readonly active: number;
  readonly pending: number;
}

/** A limiter allowing `max` (≥ 1) concurrent tasks. A task's rejection rejects only its own promise. */
export function createLimiter(max: number): Limiter {
  const limit = Math.max(1, Math.floor(Number.isFinite(max) ? max : 1));
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    if (active >= limit) return;
    const start = queue.shift();
    if (start) start();
  };
  const run = <T>(task: () => Promise<T> | T): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        active++;
        let result: Promise<T>;
        try {
          result = Promise.resolve(task());
        } catch (err) {
          result = Promise.reject(err);
        }
        result.then(resolve, reject).finally(() => {
          active--;
          next();
        });
      });
      next();
    });
  Object.defineProperties(run, {
    active: { get: () => active },
    pending: { get: () => queue.length },
  });
  return run as Limiter;
}

/** Map `items` through `fn` with at most `max` calls in flight; results keep the input order. */
export async function mapLimit<T, R>(items: readonly T[], max: number, fn: (item: T, index: number) => Promise<R> | R): Promise<R[]> {
  const limiter = createLimiter(max);
  return Promise.all(items.map((item, index) => limiter(() => fn(item, index))));
}
