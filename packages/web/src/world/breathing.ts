import type { VitalsSnapshot } from "@clinicalcraft/core";

/** A current respiratory reading that the bedside can show. A spot check is a past observation. */
export function breathingRate(snapshot: VitalsSnapshot): number | null {
  const rr = snapshot.vitals.rr;
  if (snapshot.baselineOnly || snapshot.monitorAttached === false || snapshot.spotChecks?.includes("rr") || snapshot.unmeasurable?.includes("rr")) return null;
  return rr !== undefined && Number.isFinite(rr) && rr >= 0 ? rr : null;
}

/** Phase belongs to the patient across changes of rate, clothing, and posture. */
export class PatientBreathing {
  rate: number | null = null;

  constructor(private phase: number) {}

  /** Fractional chest expansion over real seconds. Null leaves the renderer's subtle idle movement in place. */
  step(seconds: number): number | null {
    if (this.rate === null) return null;
    if (this.rate === 0) {
      this.phase = 0;
      return 0;
    }
    this.phase = (this.phase + seconds * this.rate / 60) % 1;
    // Inspiration occupies the first third; expiration returns smoothly to resting volume.
    const filling = this.phase < 1 / 3 ? 3 * this.phase : (1 - this.phase) * 1.5;
    return 0.014 * (1 - Math.cos(Math.PI * filling));
  }
}
