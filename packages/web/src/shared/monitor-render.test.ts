import { describe, expect, it } from "vitest";
import { ecgValue } from "./ecg.js";
import { monitorRenderer, sweepColumn } from "./monitor-render.js";

type Snapshot = Parameters<typeof monitorRenderer.draw>[3];

/** Minimal CanvasRenderingContext2D stand-in that records fillText calls. */
function mockCtx() {
  const texts: string[] = [];
  const fills: string[] = [];
  const target: Record<string, unknown> = {
    fillText: (t: string) => texts.push(String(t)),
    fillRect: () => fills.push(String(target.fillStyle)),
  };
  const ctx = new Proxy(target, {
    get(t, k: string) {
      if (k in t) return t[k];
      return () => undefined;
    },
    set(t, k: string, v) {
      t[k] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, fills };
}

type Live = NonNullable<Snapshot>;
const VITALS: Live["vitals"] = { hr: 132, sbp: 88, dbp: 52, rr: 26, spo2: 89, temp: 38.4, rhythm: "sinus-tachycardia", ecg: "normal", map: 64 };
const snap = (o: Partial<Live> = {}): Live => ({
  minute: 12,
  vitals: VITALS,
  alarms: [{ vital: "hr", level: "critical", value: 132 }],
  trend: {},
  ...o,
});

describe("monitorRenderer", () => {
  it("draws live numerics and flashes the alarm header", () => {
    const { ctx, texts, fills } = mockCtx();
    monitorRenderer.draw(ctx, 640, 400, snap(), 0, "en");
    expect(texts).toContain("132");
    expect(texts).toContain("88/52");
    expect(texts).toContain("38.4");
    expect(texts.some((t) => t.startsWith("!!! HR 132"))).toBe(true);
    expect(fills).toContain("#7a1410"); // critical box background
  });
  it("greys out baseline-only snapshots", () => {
    const { ctx, texts } = mockCtx();
    monitorRenderer.draw(ctx, 320, 200, snap({ baselineOnly: true, alarms: [] }), 0, "zh-CN");
    expect(texts.some((t) => t.includes("仅基线"))).toBe(true);
    expect(texts).not.toContain("132");
    expect(texts).toContain("--");
  });
  it("handles a missing patient and lethal rhythms", () => {
    const a = mockCtx();
    monitorRenderer.draw(a.ctx, 256, 160, null, 0, "en");
    expect(a.texts.some((t) => t.includes("NO PATIENT"))).toBe(true);
    const b = mockCtx();
    monitorRenderer.draw(b.ctx, 256, 160, snap({ alarms: [], vitals: { ...VITALS, rhythm: "ventricular-fibrillation" } }), 0, "en");
    expect(b.texts).toContain("!!! VF");
    expect(b.texts).toContain("---");
  });
});

describe("sweep sampling", () => {
  it("keeps every R peak of a regular rhythm at full height (no aliasing)", () => {
    // 6 s sweep drawn with ~200 columns (panel / in-world screens): ≈ 30 ms per column
    const colDt = 6 / 200;
    const sample = (t: number) => ecgValue(t, "sinus", "normal", 84);
    const peaks: number[] = [];
    const point: number[] = [];
    for (let beat = 0; beat < 8; beat++) {
      let best = -Infinity, bestPoint = -Infinity;
      const r = beat * (60 / 84);
      // a fixed column grid (not phase-locked to the beats), columns ending within ±0.1 s of the R wave
      for (let k = Math.floor((r - 0.1) / colDt); k <= Math.ceil((r + 0.1) / colDt); k++) {
        const tEnd = k * colDt + 0.0137;
        best = Math.max(best, ...sweepColumn(sample, tEnd, colDt, 0.004));
        bestPoint = Math.max(bestPoint, sample(tEnd));
      }
      peaks.push(best);
      point.push(bestPoint);
    }
    expect(Math.min(...peaks)).toBeGreaterThan(0.93);
    expect(Math.max(...peaks) - Math.min(...peaks)).toBeLessThan(0.08);
    // one-point-per-column sampling (the old renderer) misses peaks by far more
    expect(Math.max(...point) - Math.min(...point)).toBeGreaterThan(0.1);
  });
  it("returns the extremes in time order", () => {
    const up = sweepColumn((t) => t, 1, 1, 0.1);
    expect(up[0]).toBeLessThan(up[1]);
    const down = sweepColumn((t) => -t, 1, 1, 0.1);
    expect(down[0]).toBeGreaterThan(down[1]);
  });
});
