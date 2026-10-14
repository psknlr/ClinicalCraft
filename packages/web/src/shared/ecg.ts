/**
 * Synthetic bedside waveforms (pure, deterministic in time): ECG lead II by
 * rhythm + morphology, SpO₂ plethysmograph, respiration / capnogram.
 * Teaching visuals only — not diagnostic-grade signal models.
 */

export type RhythmName =
  | "sinus"
  | "sinus-tachycardia"
  | "sinus-bradycardia"
  | "atrial-fibrillation"
  | "atrial-flutter"
  | "svt"
  | "ventricular-tachycardia"
  | "ventricular-fibrillation"
  | "asystole"
  | "pea"
  | "paced"
  | (string & {});

export type MorphologyName = "normal" | "st-elevation" | "st-depression" | "peaked-t" | "wide-qrs" | "low-voltage" | (string & {});

const TAU = Math.PI * 2;

function gauss(t: number, mu: number, sigma: number, amp: number): number {
  const x = (t - mu) / sigma;
  return x > 6 || x < -6 ? 0 : amp * Math.exp(-0.5 * x * x);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Deterministic hash → [0, 1) for beat jitter. */
export function beatHash(k: number): number {
  let h = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function isIrregular(rhythm: RhythmName): boolean {
  return rhythm === "atrial-fibrillation";
}

/** True for rhythms without a perfusing pulse (flat pleth). */
export function isPulseless(rhythm: RhythmName): boolean {
  return rhythm === "ventricular-fibrillation" || rhythm === "asystole" || rhythm === "pea";
}

/** Effective ventricular rate to draw (VF/asystole have none). */
export function drawRate(rhythm: RhythmName, hr: number): number {
  if (rhythm === "asystole" || rhythm === "ventricular-fibrillation") return 0;
  return Math.max(20, Math.min(240, hr || 0));
}

/** R-wave time of beat k. Irregular rhythms jitter ±32 % of the period (ordering preserved). */
export function beatTime(k: number, period: number, irregular: boolean): number {
  return k * period + (irregular ? (beatHash(k) - 0.5) * 0.64 * period : 0);
}

/** One PQRST complex at time `t` relative to its R wave. */
export function complexAt(t: number, rr: number, rhythm: RhythmName, morph: MorphologyName): number {
  if (t < -0.35 || t > 0.75) return 0;
  const wide = morph === "wide-qrs" || rhythm === "paced";
  const qrsW = wide ? 2.6 : 1;
  const tPeak = Math.min(0.42, 0.25 * Math.sqrt(rr) + 0.04) + (wide ? 0.04 : 0);
  let v = 0;
  if (rhythm === "ventricular-tachycardia") {
    // broad monomorphic complexes
    v += gauss(t, 0, 0.045, 1.25);
    v += gauss(t, 0.13, 0.06, -0.7);
    v += gauss(t, -0.06, 0.03, -0.15);
    return v;
  }
  // atrial activity
  const hasP = rhythm === "sinus" || rhythm === "sinus-tachycardia" || rhythm === "sinus-bradycardia" || rhythm === "pea" || rhythm === "paced";
  if (hasP) v += gauss(t, -Math.min(0.16, 0.42 * rr), 0.025, 0.12);
  if (rhythm === "paced") v += gauss(t, -0.055, 0.0025, 1.4);
  // QRS
  v += gauss(t, -0.026 * qrsW, 0.008 * qrsW, -0.12);
  v += gauss(t, 0, 0.011 * qrsW, wide ? 0.85 : 1.0);
  v += gauss(t, 0.026 * qrsW, 0.009 * qrsW, wide ? -0.38 : -0.28);
  // ST / T
  let tAmp = rhythm === "paced" ? -0.25 : 0.3;
  let tSig = 0.045;
  if (morph === "peaked-t") {
    tAmp = 0.78;
    tSig = 0.03;
  }
  if (morph === "st-elevation") {
    const st = sigmoid((t - 0.035 * qrsW) / 0.006) * (1 - sigmoid((t - (tPeak + 0.07)) / 0.03));
    v += 0.3 * st;
    tAmp = 0.42;
  } else if (morph === "st-depression") {
    const st = sigmoid((t - 0.035 * qrsW) / 0.006) * (1 - sigmoid((t - (tPeak - 0.02)) / 0.03));
    v -= 0.16 * st;
    tAmp = 0.12;
  }
  v += gauss(t, tPeak, tSig, tAmp);
  return v;
}

/** ECG lead II (mV-ish, baseline 0, R ≈ 1) at absolute time `t` seconds. */
export function ecgValue(t: number, rhythm: RhythmName, morph: MorphologyName, hr: number): number {
  const gain = morph === "low-voltage" ? 0.4 : 1;
  if (rhythm === "asystole") return 0.015 * Math.sin(TAU * 0.3 * t) + 0.006 * Math.sin(TAU * 1.7 * t);
  if (rhythm === "ventricular-fibrillation") {
    const env = 0.65 + 0.35 * Math.sin(TAU * 0.33 * t + 0.4);
    return gain * env * (0.5 * Math.sin(TAU * 4.7 * t) + 0.32 * Math.sin(TAU * 6.1 * t + 1.3) + 0.18 * Math.sin(TAU * 8.3 * t + 0.4));
  }
  const rate = drawRate(rhythm, hr);
  const period = 60 / rate;
  const irregular = isIrregular(rhythm);
  const k0 = Math.floor(t / period);
  let v = 0;
  for (let k = k0 - 1; k <= k0 + 2; k++) {
    const rt = beatTime(k, period, irregular);
    const next = beatTime(k + 1, period, irregular);
    v += complexAt(t - rt, Math.max(0.25, next - rt), rhythm, morph);
  }
  if (rhythm === "atrial-fibrillation") v += 0.035 * Math.sin(TAU * 6.3 * t) + 0.025 * Math.sin(TAU * 8.7 * t + 1) + 0.018 * Math.sin(TAU * 5.1 * t + 2);
  if (rhythm === "atrial-flutter") {
    const f = (t * 5) % 1; // 300 /min sawtooth
    v += 0.16 * (f < 0.8 ? -f / 0.8 : (f - 1) / 0.2 + 0) + 0.08;
  }
  return v * gain;
}

/** SpO₂ plethysmograph (0..1) at time t. Pulseless rhythms → flat. */
export function plethValue(t: number, rhythm: RhythmName, hr: number): number {
  if (isPulseless(rhythm)) return 0.02 * Math.sin(TAU * 0.25 * t);
  const rate = drawRate(rhythm, hr);
  const period = 60 / rate;
  const irregular = isIrregular(rhythm);
  const amp = rhythm === "ventricular-tachycardia" ? 0.35 : 1;
  const k0 = Math.floor(t / period);
  let v = 0;
  for (let k = k0 - 2; k <= k0 + 1; k++) {
    const tb = t - beatTime(k, period, irregular) - 0.18;
    if (tb < -0.2 || tb > 1.2) continue;
    v += amp * (gauss(tb, 0.13, 0.07, 0.9) + gauss(tb, 0.37, 0.1, 0.32));
  }
  return v;
}

/** Respiration: capnogram (0..1 of EtCO₂) when `capno`, else impedance sine. */
export function respValue(t: number, rr: number, capno: boolean): number {
  if (!(rr > 0)) return 0;
  const period = 60 / rr;
  const ph = (t % period) / period;
  if (!capno) return 0.5 + 0.45 * Math.sin(TAU * ph - Math.PI / 2);
  // expiration: rise at 0.05, gentle alveolar slope, fall at 0.58
  const up = sigmoid((ph - 0.06) / 0.012);
  const down = 1 - sigmoid((ph - 0.58) / 0.01);
  return up * down * (0.88 + 0.12 * ph);
}
