import { describe, expect, it } from "vitest";
import { createLimiter, mapLimit } from "./concurrency.js";

const tick = () => new Promise((r) => setTimeout(r, 1));

describe("createLimiter / mapLimit", () => {
  it("never runs more than `max` tasks at once and keeps the input order", async () => {
    let running = 0;
    let peak = 0;
    const out = await mapLimit([...Array(40).keys()], 4, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await tick();
      running--;
      return n * 2;
    });
    expect(peak).toBe(4);
    expect(out).toEqual([...Array(40).keys()].map((n) => n * 2));
  });

  it("a failing task rejects only its own promise; queued tasks still run", async () => {
    const limit = createLimiter(1);
    const results = await Promise.allSettled([
      limit(async () => {
        throw new Error("boom");
      }),
      limit(() => {
        throw new Error("sync boom");
      }),
      limit(async () => "ok"),
    ]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected", "fulfilled"]);
    expect(limit.active).toBe(0);
    expect(limit.pending).toBe(0);
  });

  it("treats a nonsensical limit as 1", async () => {
    const limit = createLimiter(0);
    let peak = 0;
    let running = 0;
    await Promise.all(
      [1, 2, 3].map(() =>
        limit(async () => {
          running++;
          peak = Math.max(peak, running);
          await tick();
          running--;
        }),
      ),
    );
    expect(peak).toBe(1);
  });
});
