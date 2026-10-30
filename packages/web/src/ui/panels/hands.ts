/**
 * Embodied mode: what the learner carries (docs/EMBODIED.md §5, §8.1) — the carry row of a handheld item's device
 * panel (Pick up; held: Put down, Equip, Hand to a person within reach) and "In your hands" in the inventory panel
 * (each carried item, worn ones apart, with the same buttons and its own operations). Every button is a
 * `world_action` of the learner's — the world decides (hands full, worn items, arm's reach), as for an agent.
 */
import { t } from "@clinicalcraft/core";
import { MAX_HELD, PRIMARY_ACTOR, type ActorState, type WorldRuntime } from "@clinicalcraft/world";
import type { App, Game } from "../../app/context.js";
import { placementIdOf } from "../../app/embodied.js";
import { staffLabel } from "../../app/embodied-link.js";
import { getLocale, tr } from "../../i18n/index.js";
import { h } from "../dom.js";

/** How far (m, same level) a person may stand to be offered "Hand to …" (the world walks the last steps). */
const HAND_TO_RANGE = 5;

/** People the learner could hand something to now: actors on the same level within `HAND_TO_RANGE`, nearest first. */
function people(world: WorldRuntime, me: ActorState): { id: string; label: string }[] {
  const L = getLocale();
  return world
    .actors()
    .filter((a) => a.id !== me.id && a.pose.level === me.pose.level)
    .map((a) => ({ a, d: Math.hypot(a.pose.x - me.pose.x, a.pose.z - me.pose.z) }))
    .filter((x) => x.d <= HAND_TO_RANGE)
    .sort((x, y) => x.d - y.d)
    .map(({ a }) => {
      const ent = world.entity(a.id);
      const name = ent ? t(ent.name, L) : a.id;
      return { id: a.id, label: a.id.startsWith("staff:") ? staffLabel(a.role, name) : name };
    });
}

/** Is a carried item worn (equipped: it does not fill a hand)? */
function worn(world: WorldRuntime, id: string): boolean {
  return !!world.snapshot().entities[id]?.data?.equipped;
}

/** The buttons for an item the learner carries: put down (take off), equip, hand to each person near. */
function carriedButtons(game: Game, world: WorldRuntime, me: ActorState, id: string): HTMLElement[] {
  const emb = game.embodied!;
  const run = (operation: string, parameters?: Record<string, unknown>) => () => void emb.worldAction({ operation, targetId: id, ...(parameters ? { parameters } : {}) });
  const isWorn = worn(world, id);
  const out = [h("button", { type: "button", class: "hand-op", dataset: { op: "put_down", item: id }, onclick: run("put_down") }, tr(isWorn ? "hands.takeOff" : "hands.putDown"))];
  if (isWorn) return out;
  out.push(h("button", { type: "button", class: "hand-op", dataset: { op: "equip", item: id }, onclick: run("equip") }, tr("hands.equip")));
  for (const p of people(world, me)) out.push(h("button", { type: "button", class: "hand-op", dataset: { op: "hand_over", item: id, to: p.id }, onclick: run("hand_over", { to: p.id }) }, tr("hands.handTo", { who: p.label })));
  return out;
}

/**
 * A handheld item's carry row in its device panel: "Pick up" (with a free hand), else — in the learner's hands — the
 * carried buttons; in someone else's hands, who has it. Null for anything not handheld (or clinical mode).
 */
export function carryRow(game: Game, placementId: string): HTMLElement | null {
  const world = game.session.world();
  const placement = game.stations.placement(placementId);
  const type = placement ? game.stations.type(placement) : undefined;
  const me = world?.actor(PRIMARY_ACTOR);
  if (!game.embodied || !world || !me || type?.portable !== "handheld") return null;
  const id = `eq:${placementId}`;
  const holder = world.actors().find((a) => a.holding.includes(id));
  const row = h("div", { class: "row wrap carry-row", id: "device-carry" });
  if (holder?.id === me.id) row.append(h("span", { class: "small muted" }, tr(worn(world, id) ? "hands.wearing" : "hands.holding")), ...carriedButtons(game, world, me, id));
  else if (holder) {
    const ent = world.entity(holder.id);
    row.append(h("span", { class: "small muted" }, tr("hands.heldBy", { who: ent ? t(ent.name, getLocale()) : holder.id })));
  } else {
    const full = me.holding.filter((x) => !worn(world, x)).length >= MAX_HELD;
    row.append(h("button", { type: "button", class: "hand-op", id: "device-pick-up", dataset: { op: "pick_up" }, title: full ? tr("hands.full", { max: MAX_HELD }) : "", onclick: () => void game.embodied!.worldAction({ operation: "pick_up", targetId: id }) }, tr("hands.pickUp")));
  }
  return row;
}

/** "In your hands" (inventory panel, embodied mode): each carried item, worn ones apart, with its buttons. Null in clinical mode. */
export function handsSection(app: App): HTMLElement | null {
  const game = app.game;
  const world = game?.session.world();
  const me = world?.actor(PRIMARY_ACTOR);
  if (!game?.embodied || !world || !me) return null;
  const L = getLocale();
  const wrap = h("section", { class: "hands", id: "hands" }, h("h3", null, tr("hands.title")), h("p", { class: "small muted" }, tr("hands.lead", { max: MAX_HELD })));
  if (!me.holding.length) {
    wrap.append(h("div", { class: "empty", id: "hands-empty" }, tr("hands.empty")));
    return wrap;
  }
  const ordered = [...me.holding].sort((a, b) => Number(worn(world, a)) - Number(worn(world, b)));
  for (const id of ordered) {
    const ent = world.entity(id);
    const pid = placementIdOf(id);
    const name = ent ? t(ent.name, L) : id;
    wrap.append(
      h(
        "div",
        { class: "hand-item", dataset: { item: id, worn: String(worn(world, id)) } },
        h("b", null, name),
        h("small", { class: "muted" }, tr(worn(world, id) ? "hands.wearing" : "hands.holding")),
        h(
          "div",
          { class: "row wrap" },
          pid ? h("button", { type: "button", class: "hand-op", dataset: { op: "use", item: id }, onclick: () => app.open("device", { placementId: pid }) }, tr("hands.use")) : null,
          ...carriedButtons(game, world, me, id),
        ),
      ),
    );
  }
  return wrap;
}
