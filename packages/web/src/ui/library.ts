/** Spoiler-free presentation helpers for the case library; never read the full case. */
import { SUPPORTED_LOCALES, specialtyLabel } from "@clinicalcraft/core";
import type { CaseCard } from "../app/content.js";
import { tr, trEvery } from "../i18n/index.js";

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

/**
 * Comparable search text: NFKC (full-width letters), case folded independently of the browser's locale (a Turkish
 * browser would fold "ICU" to "ıcu"), punctuation and spaces as one space.
 */
function searchable(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]+/gu, " ").trim();
}

/**
 * A card's searchable text, made once per index entry (an entry never changes; a new one is a new object): the same
 * whatever the interface language, so a search over 135 cards compares strings only.
 */
const haystacks = new WeakMap<CaseCard, string>();

function haystack(card: CaseCard): string {
  let text = haystacks.get(card);
  if (text === undefined) {
    const localised = (value: CaseCard["title"]): string[] => typeof value === "string" ? [value] : Object.values(value);
    text = searchable([
      ...localised(card.title), ...localised(card.summary),
      ...card.specialty, ...SUPPORTED_LOCALES.flatMap((locale) => card.specialty.map((id) => specialtyLabel(id, locale))),
      ...card.tags,
      card.setting, ...trEvery(`setting.${card.setting}`),
    ].join(" "));
    haystacks.set(card, text);
  }
  return text;
}

/**
 * Search both languages of the public index, excluding diagnosis-bearing ids and source details: the titles and
 * summaries, the specialty and setting ids with their labels in both languages (so "ICU" finds the ICU cases in the
 * Chinese interface and "急诊" the emergency ones in the English interface), and the tags.
 */
export function matchesLibraryQuery(card: CaseCard, query: string): boolean {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = haystack(card);
  return words.every((word) => text.includes(word));
}
