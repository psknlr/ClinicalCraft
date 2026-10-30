/**
 * Action feedback (embodied mode, docs/EMBODIED.md §6): when the learner's
 * body cannot do what they asked from where it stands — and walking there
 * is more than a step — the localised refusal with a "Go there" button that
 * walks the avatar to the place the world model names (`hint.goal`); when no
 * walk fixes it but an act does (a clinical prerequisite: the IV access
 * before an IV drug), a button for that act. Shown inside the open window
 * (the HUD is inert under it), else in the HUD. A refusal with a way forward
 * ("Go there", the act to do first) is action-required: it stays until the
 * learner takes it, dismisses it (×) or does something that can be done —
 * a busy encounter must not wash it away. Everything else (a short step being
 * taken, a refusal nothing fixes) leaves by itself after `FEEDBACK_MS`.
 */
import type { ActionHint, NavGoal } from "@clinicalcraft/world";
import { tr } from "../i18n/index.js";
import { clear, h } from "./dom.js";

export interface FeedbackItem {
  text: string;
  /** Where to go (null: nowhere fixes it). */
  goal: NavGoal | null;
  /** The place, as the world names it. */
  label: string | null;
  tone: "refused" | "info";
  /** An act that fixes it where no walk does ("Peripheral IV access first"). */
  action?: { label: string; run: () => void };
  /** A fetch: what "Go there" does on arrival (wheel the cart to the patient). */
  then?: ActionHint["then"];
}

/** How long feedback without a way forward stays (ms). */
export const FEEDBACK_MS = 15_000;

/** Does this feedback ask the learner to act (a refusal with "Go there" or an act to do first)? It then stays until handled. */
export function actionRequired(item: FeedbackItem): boolean {
  return item.tone === "refused" && (!!item.goal || !!item.action);
}

export class ActionFeedback {
  private item: FeedbackItem | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    /** HUD slot (outside any window). */
    private readonly hud: () => HTMLElement | null,
    /** The open window's slot, or null when no window is open. */
    private readonly panel: () => HTMLElement | null,
    private readonly go: (goal: NavGoal, label: string | null, then?: ActionHint["then"]) => void,
  ) {}

  get current(): FeedbackItem | null {
    return this.item;
  }

  show(item: FeedbackItem): void {
    this.item = item;
    if (this.timer) clearTimeout(this.timer);
    this.timer = actionRequired(item) ? null : setTimeout(() => this.clear(), FEEDBACK_MS);
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
        { id: "action-feedback", class: ["action-feedback", `tone-${item.tone}`, actionRequired(item) ? "action-required" : ""], role: "status", "aria-live": "polite" },
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
                  title: tr("emb.goThere"),
                  onclick: () => {
                    this.clear();
                    this.go(go, item.label, item.then);
                  },
                },
                // the world's hint label is already an instruction ("Go to …", "Get a clear view of …")
                item.label || tr("emb.goThere"),
              )
            : null,
          item.action
            ? h(
                "button",
                {
                  type: "button",
                  id: "do-first",
                  class: "primary",
                  onclick: () => {
                    const run = item.action!.run;
                    this.clear();
                    run();
                  },
                },
                item.action.label,
              )
            : null,
          h("button", { type: "button", class: "close-feedback", "aria-label": tr("panel.close"), onclick: () => this.clear() }, "×"),
        ),
      ),
    );
  }
}
