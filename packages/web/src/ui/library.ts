/** Spoiler-free presentation helpers for the case library; never read the full case. */
import { specialtyLabel } from "@clinicalcraft/core";
import type { CaseCard } from "../app/content.js";
import { getLocale, tr, trMaybe } from "../i18n/index.js";

const COLLECTIONS = [
  { id: "cmcr-105", label: "library.cmcr105Collection", badge: "library.cmcr105Badge" },
  { id: "cmcr-20", label: "library.cmcrCollection", badge: "library.cmcr20Badge" },
] as const;

/** Only offer collections that are present, using the actual indexed count. */
export function caseCollections(cards: readonly CaseCard[]): { id: string; label: string }[] {
  return COLLECTIONS.flatMap((collection) => {
    const n = cards.filter((card) => card.tags.includes(collection.id)).length;
    return n ? [{ id: collection.id, label: tr(collection.label, { n }) }] : [];
  });
}

/** A short collection label distinguishes otherwise similar presenting complaints. */
export function caseCollectionBadge(card: Pick<CaseCard, "tags">): string | null {
  const collection = COLLECTIONS.find((item) => card.tags.includes(item.id));
  return collection ? tr(collection.badge) : null;
}

function searchable(text: string): string {
  return text.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]+/gu, " ").trim();
}

/** Search both languages of the public index, excluding diagnosis-bearing ids and source details. */
export function matchesLibraryQuery(card: CaseCard, query: string): boolean {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const localised = (value: CaseCard["title"]): string[] => typeof value === "string" ? [value] : Object.values(value);
  const haystack = searchable([
    ...localised(card.title), ...localised(card.summary),
    ...card.specialty, ...card.specialty.map((id) => specialtyLabel(id, getLocale())), ...card.tags,
    trMaybe(`setting.${card.setting}`, card.setting),
  ].join(" "));
  return words.every((word) => haystack.includes(word));
}
