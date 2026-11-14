/**
 * Where the player is, in the HUD (audit 2026-11-12 P2-15): the place beside the map and the in-world badge are
 * written from ONE place — the world's region lookup at the avatar's position, as the renderer last reported it
 * (`MoveInfo`) — so they cannot disagree, at the CT / MRI wall or anywhere else.
 */
import type { MoveInfo } from "../contracts.js";
import { tr } from "../i18n/index.js";

/** The place as last reported: its name (the world's region lookup) and, indoors in a multi-level facility, the level. */
export type Where = Pick<MoveInfo, "region" | "levelName">;

/**
 * The texts of the place beside the map (`region`: the place, and the level indoors) and of the embodiment badge
 * (`badge`): in-world, the same place — "walking…" while the world moves the body; clinical mode says so.
 */
export function placeTexts(where: Where | null, embodied: { walking: boolean } | null): { region: string; badge: string } {
  const region = where ? (where.levelName ? `${where.region} · ${where.levelName}` : where.region) : "";
  const badge = !embodied ? tr("emb.badgeClinical") : embodied.walking ? tr("emb.badgeWalking") : tr("emb.badge", { place: where?.region ?? tr("emb.outside") });
  return { region, badge };
}
