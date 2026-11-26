/**
 * The case list's mechanics (the library in src/ui/intro.ts): one element per case, reused by every search, filter
 * and selection, so a change attaches, detaches or moves only what changed — the cards that stay keep their layout,
 * the keyboard focus and their place under the finger. Off-screen cards skip layout and paint (`content-visibility:
 * auto`, styles/app.css) and stand in at their last rendered height, or an estimate before they have been rendered;
 * a scroll that puts a card at a given place renders the cards that will be in view first (`cv-render`), so it lands
 * exactly there.
 */

/** How a parent's children become `desired`: the children to detach, then each insertion (`before`: null appends). */
export interface ChildrenPlan<T> {
  remove: T[];
  insert: { item: T; before: T | null }[];
}

/**
 * How `current` children become `desired`: the children not wanted are detached, the new ones inserted in place, and
 * a child that stays is moved only when the order changed (a search or a filter keeps the library order: it moves none).
 */
export function planChildren<T>(current: readonly T[], desired: readonly T[]): ChildrenPlan<T> {
  const wanted = new Set(desired);
  const remove = current.filter((item) => !wanted.has(item));
  const live = current.filter((item) => wanted.has(item));
  const insert: ChildrenPlan<T>["insert"] = [];
  desired.forEach((item, at) => {
    if (live[at] === item) return;
    const from = live.indexOf(item, at);
    if (from >= 0) live.splice(from, 1);
    insert.push({ item, before: live[at] ?? null });
    live.splice(at, 0, item);
  });
  return { remove, insert };
}

/** Make `parent`'s children exactly `desired`, in order (`planChildren`). */
export function placeChildren(parent: Element, desired: readonly Element[]): void {
  const plan = planChildren([...parent.children], desired);
  for (const item of plan.remove) item.remove();
  for (const { item, before } of plan.insert) parent.insertBefore(item, before);
}

/**
 * Where a card `height` px tall, now `offset` px below the top of a list's visible part (`view` px), goes so that all
 * of it is in view, moving no further than it takes: nowhere when it is in view; else `edge` px inside the edge it was
 * beyond (the top edge when it is taller than the view).
 */
export function revealOffset(offset: number, height: number, view: number, edge = 8): number {
  if (offset < 0) return edge;
  if (offset + height > view) return Math.max(view - height - edge, edge);
  return offset;
}

/** A card's top below the top of the list's visible part (px; negative above it). */
export function cardOffset(list: HTMLElement, card: HTMLElement): number {
  return card.getBoundingClientRect().top - list.getBoundingClientRect().top;
}

/** Less than any card takes with its gap (px; real cards take 136 or more): what counts the cards a stretch of the list can show. */
const MIN_CARD_PX = 120;

/**
 * Render `card` and the cards within `above` px before it and `below` px after it, until a frame has rendered them
 * (they keep that height while off-screen afterwards). A card brought into view by a jump would otherwise take its
 * real height a frame late; rendered first, what is measured now is what is painted, and the browser's scroll
 * anchoring holds a rendered card in view in place while cards further up take their real height.
 */
export function renderAround(card: HTMLElement, above: number, below: number): void {
  const cards: Element[] = [card];
  let el = card.previousElementSibling;
  for (let n = Math.ceil(Math.max(0, above) / MIN_CARD_PX); el && n > 0; n--, el = el.previousElementSibling) cards.push(el);
  el = card.nextElementSibling;
  for (let n = Math.ceil(Math.max(0, below) / MIN_CARD_PX); el && n > 0; n--, el = el.nextElementSibling) cards.push(el);
  for (const c of cards) c.classList.add("cv-render");
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      for (const c of cards) c.classList.remove("cv-render");
    }),
  );
}

/** Scroll the list so that `card`'s top is `offset` px below the top of its visible part, exactly (`renderAround`). */
export function scrollCardTo(list: HTMLElement, card: HTMLElement, offset: number): void {
  renderAround(card, offset, list.clientHeight - offset);
  list.scrollTop += cardOffset(list, card) - offset;
}

/** A card the list keeps in place (by case id), and its offset from the top of the list's visible part. */
export interface ListAnchor {
  caseId: string;
  offset: number;
}

/** The card to keep in place when the intro is rendered again: the selected card when it is in view, else the first card in view; none at the top. */
export function listAnchor(list: HTMLElement): ListAnchor | null {
  if (!list.isConnected || list.scrollTop <= 0) return null;
  const top = list.getBoundingClientRect().top;
  const bottom = top + list.clientHeight;
  const cards = [...list.querySelectorAll<HTMLElement>(".case-card")];
  const inView = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.bottom > top && r.top < bottom;
  };
  const card = cards.find((el) => el.classList.contains("active") && inView(el)) ?? cards.find(inView);
  return card?.dataset.case ? { caseId: card.dataset.case, offset: cardOffset(list, card) } : null;
}
