/**
 * Action feedback (embodied mode, docs/EMBODIED.md §6): when the learner's
 * body cannot do what they asked from where it stands — and walking there
 * is more than a step — the localised refusal with a "Go there" button that
 * walks the avatar to the place the world model names (`hint.goal`). Shown
 * inside the open window (the HUD is inert under it), else in the HUD; it
 * leaves by itself after a while, or with ×.
 */
import type { NavGoal } from "@clinicalcraft/world";
import { tr } from "../i18n/index.js";
import { clear, h } from "./dom.js";

export interface FeedbackItem {
  text: string;
  /** Where to go (null: nowhere fixes it). */
  goal: NavGoal | null;
  /** The place, as the world names it. */
  label: string | null;
  tone: "refused" | "info";
}

/** How long a refusal stays (ms). */
export const FEEDBACK_MS = 15_000;

export class ActionFeedback {
  private item: FeedbackItem | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    /** HUD slot (outside any window). */
    private readonly hud: () => HTMLElement | null,
    /** The open window's slot, or null when no window is open. */
    private readonly panel: () => HTMLElement | null,
    private readonly go: (goal: NavGoal, label: string | null) => void,
  ) {}

  get current(): FeedbackItem | null {
    return this.item;
  }

  show(item: FeedbackItem): void {
    this.item = item;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.clear(), FEEDBACK_MS);
    this.render();
  }

  clear(): void {
    this.item = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.render();
  }

  /** Re-render into the right slot (a window opened or closed, the language changed). */
  render(): void {
    const panel = this.panel();
    const hud = this.hud();
    for (const slot of [panel, hud]) if (slot) clear(slot);
    if (hud) hud.hidden = true;
    const item = this.item;
    const slot = panel ?? hud;
    if (!item || !slot) return;
    slot.hidden = false;
    const go = item.goal;
    slot.append(
      h(
        "div",
        { id: "action-feedback", class: ["action-feedback", `tone-${item.tone}`], role: "status", "aria-live": "polite" },
        h("p", null, item.text),
        h(
          "div",
          { class: "row" },
          go
            ? h(
                "button",
                {
                  type: "button",
                  id: "go-there",
                  class: "primary",
                  onclick: () => {
                    this.clear();
                    this.go(go, item.label);
                  },
                },
                item.label ? tr("emb.goThereTo", { place: item.label }) : tr("emb.goThere"),
              )
            : null,
          h("button", { type: "button", class: "close-feedback", "aria-label": tr("panel.close"), onclick: () => this.clear() }, "×"),
        ),
      ),
    );
  }
}
