/**
 * Evidence as the tools give it (docs/CASE_AUTHORING.md §5.2): a result's or a finding's provenance in words — its
 * source, who captured it, when, its quality check — and a picture the engine drew from data as an image a model can
 * look at (`ToolOutput.images`), always labelled as drawn from the record.
 */
import { drawPicture, t, type Picture, type Provenance } from "@clinicalcraft/core";
import { isZh, rt, type RuntimeKey } from "../session/i18n.js";
import type { ToolOutput } from "./types.js";

/** The provenance in words, one line each (empty: none recorded). */
export function provenanceLines(p: Provenance | null | undefined, L: string): string[] {
  if (!p) return [];
  const lines = [rt(L, "evidence.source", { source: rt(L, `evidence.source.${p.source}` as RuntimeKey), by: p.by ? rt(L, "evidence.by", { by: t(p.by, L) }) : "" })];
  if (p.capturedAt) lines.push(rt(L, "evidence.capturedAt", { when: t(p.capturedAt, L) }));
  if (p.quality) {
    const reasons = p.quality.reasons.map((r) => t(r, L).replace(/[.。]\s*$/u, "")).join(isZh(L) ? "；" : "; ");
    lines.push(p.quality.status === "failed" ? rt(L, "evidence.quality.failed", { reasons: reasons || "—" }) : rt(L, `evidence.quality.${p.quality.status}` as RuntimeKey));
  }
  return lines;
}

/** Pictures drawn from data, as images a tool returns (`seed`: what tells two captures of one tongue apart). */
export function pictureImages(pictures: readonly { picture: Picture; seed: string }[]): NonNullable<ToolOutput["images"]> {
  return pictures.map(({ picture, seed }) => {
    const drawn = drawPicture(picture, seed);
    return { mediaType: drawn.mediaType, data: drawn.base64 };
  });
}
