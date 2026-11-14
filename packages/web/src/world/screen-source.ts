/**
 * Whose vitals a live screen (`vitals` / `ecg`) shows when it is drawn (EMBODIED §6, audit 2026-11-12 P2-13): the
 * app's answer — in embodied mode the world model's (THE screen rule, `WorldRuntime.screenPatient`: what the device
 * is connected to where it stands now, wherever it was wheeled) — never a bed the screen was bound to when the scene
 * was built. Only without a world model to ask (clinical mode, the harness: nothing moves) is that bed space used.
 */
import type { ScreenRecord } from "./context.js";

/**
 * The patient slot a live screen shows now, or null (nobody: "no patient"): `ask(placementId)` — a slot, null, or
 * `undefined` when there is no world model — else the bed space it was built beside; only a patient this scene draws.
 */
export function screenSource(sc: Pick<ScreenRecord, "placementId" | "slotId">, ask: ((placementId: string) => string | null | undefined) | undefined, drawn: (slotId: string) => boolean): string | null {
  const asked = ask?.(sc.placementId);
  const slot = asked === undefined ? sc.slotId : asked;
  return slot && drawn(slot) ? slot : null;
}
