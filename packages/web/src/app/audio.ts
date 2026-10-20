/**
 * V4 sound effects (tiny oscillator blips, no audio files) + monitor alarm
 * tones. Silent unless the learner enables sound.
 */
import type { SoundKind } from "../contracts.js";

let ctx: AudioContext | null = null;
let lastStep = 0;

const FREQ: Record<SoundKind, number> = { tap: 400, step: 90, mine: 130, place: 200, success: 680, door: 170, alarm: 880, beep: 1000 };

export function playSound(kind: SoundKind, enabled: boolean): void {
  if (!enabled) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    void ctx.resume();
    const now = ctx.currentTime;
    if (kind === "step" && now - lastStep < 0.17) return;
    lastStep = now;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = kind === "step" || kind === "mine" || kind === "place" ? "triangle" : kind === "alarm" ? "square" : "sine";
    osc.frequency.value = FREQ[kind] ?? 400;
    const peak = kind === "step" ? 0.035 : kind === "alarm" ? 0.05 : 0.065;
    const length = kind === "alarm" ? 0.32 : 0.1;
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + length);
    osc.start();
    osc.stop(now + length + 0.02);
  } catch {
    /* audio unavailable */
  }
}
