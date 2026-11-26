/**
 * Evidence as the front end shows it (docs/CASE_AUTHORING.md §5.2, docs/STUDIES.md §8): a picture the engine drew from
 * data — a tongue as captured — with the caption that says so, and a result's or a finding's provenance (its source,
 * who captured it, when, its quality check), in the same words the agents' tools use.
 */
import { provenanceLines } from "@clinicalcraft/agent";
import { drawPicture, type Picture, type Provenance } from "@clinicalcraft/core";
import { getLocale, tr } from "../../i18n/index.js";
import { h } from "../dom.js";

/** A drawn picture with its caption (`seed`: what tells two captures of one tongue apart — the same seed as the tools'). */
export function drawnPicture(picture: Picture, seed: string): HTMLElement {
  const drawn = drawPicture(picture, seed);
  return h(
    "figure",
    { class: "drawn-picture", dataset: { picture: picture.kind } },
    h("img", { src: `data:${drawn.mediaType};base64,${drawn.base64}`, width: String(drawn.width), height: String(drawn.height), alt: tr("evidence.alt") }),
    h("figcaption", { class: "small muted" }, tr("evidence.caption")),
  );
}

/** A provenance as a small list (null: none recorded). */
export function provenanceBlock(p: Provenance | null | undefined): HTMLElement | null {
  const lines = provenanceLines(p, getLocale());
  if (!lines.length) return null;
  return h("ul", { class: ["provenance", p?.quality?.status === "failed" ? "failed" : ""], dataset: { source: p!.source } }, lines.map((line) => h("li", { class: "small" }, line)));
}
