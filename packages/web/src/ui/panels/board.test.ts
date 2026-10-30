/**
 * The case board names decisions and options as every other surface does (docs/PROTOCOL.md §3): each option carries
 * the letter `list_options(decisions)`, `/board` and `answer_decision` use (A, B, C… in presentation order) as a
 * badge, an open or decided decision its number ("Decision 2"), with bilingual accessible names; `data-option` and
 * the checkbox value keep the authored id the board answers with (the e2e tests click by it). Vitest has no DOM: a
 * minimal document stands in for the browser's.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listOptionsText } from "@clinicalcraft/agent";
import { createSession, parseCase, reduce, t, type CaseDefinition, type ClinicalAction, type Decision, type SessionState } from "@clinicalcraft/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { App, Game } from "../../app/context.js";
import type { AnswerRecord } from "../../app/store.js";
import { setLocale, type UiLocale } from "../../i18n/index.js";
import { decisionCard } from "./board.js";

/* ---------------- a minimal document ---------------- */

class FakeNode {
  childNodes: FakeNode[] = [];
  appendChild(node: FakeNode): FakeNode {
    this.childNodes.push(node);
    return node;
  }
  removeChild(node: FakeNode): FakeNode {
    this.childNodes = this.childNodes.filter((n) => n !== node);
    return node;
  }
  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null;
  }
  get textContent(): string {
    return this.childNodes.map((n) => n.textContent).join("");
  }
}

class FakeText extends FakeNode {
  constructor(readonly data: string) {
    super();
  }
  override get textContent(): string {
    return this.data;
  }
}

class FakeElement extends FakeNode {
  className = "";
  value = "";
  disabled = false;
  checked = false;
  readonly dataset: Record<string, string> = {};
  readonly style = { cssText: "" };
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, ((e: unknown) => void)[]>();
  constructor(readonly tagName: string) {
    super();
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  addEventListener(type: string, fn: (e: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  append(...nodes: FakeNode[]): void {
    for (const n of nodes) this.appendChild(n);
  }
  /** Descendant elements matching `test`, in document order. */
  all(test: (e: FakeElement) => boolean): FakeElement[] {
    return this.childNodes.flatMap((n) => (n instanceof FakeElement ? [...(test(n) ? [n] : []), ...n.all(test)] : []));
  }
  hasClass(name: string): boolean {
    return this.className.split(/\s+/).includes(name);
  }
  click(): void {
    for (const fn of this.listeners.get("click") ?? []) fn({ target: this });
  }
}

const globals = globalThis as unknown as Record<string, unknown>;
const saved = { document: globals.document, Node: globals.Node };
beforeAll(() => {
  Object.assign(globalThis, {
    Node: FakeNode,
    document: { createElement: (tag: string) => new FakeElement(tag), createTextNode: (text: string) => new FakeText(text), documentElement: { lang: "" } },
  });
});
afterAll(() => {
  Object.assign(globalThis, saved);
  setLocale("zh-CN");
});

/* ---------------- the case and the board ---------------- */

const here = path.dirname(fileURLToPath(import.meta.url));
const parsed = parseCase(JSON.parse(fs.readFileSync(path.resolve(here, "../../../../content/cases/stemi-inferior-rv/case.json"), "utf8")));
if (!parsed.ok) throw new Error("stemi-inferior-rv does not parse");
const stemi: CaseDefinition = parsed.value;

/** The reference solution up to (not including) `finish`: every decision decided. */
function solved(c: CaseDefinition): SessionState {
  let s = createSession(c);
  for (const action of c.solution as ClinicalAction[]) if (action.type !== "finish") s = reduce(c, s, action).state;
  return s;
}

/** A card as the board renders it, and the answers it sends. */
function render(d: Decision, unlocked: boolean, decided: boolean, answers: AnswerRecord[] = []) {
  const acted: unknown[] = [];
  const app = { act: (action: unknown) => void acted.push(action) } as unknown as App;
  const game = { caseDef: stemi, session: { store: { answers: new Map([[d.id, answers]]) } } } as unknown as Game;
  const card = decisionCard(app, game, d, unlocked, decided) as unknown as FakeElement;
  return { card, acted };
}

/** The letters and texts `list_options(decisions)` gives a decision (agent tools, CLI `/board`, MCP). */
function listed(c: CaseDefinition, s: SessionState, locale: UiLocale, n: number): { label: string; text: string }[] {
  const items = listOptionsText({ caseDef: c, locale, state: () => s }, "decisions").data as { number: number; options: { label: string; text: string }[] }[];
  return items.find((d) => d.number === n)!.options;
}

describe("case board: options lettered as the tools letter them, decisions numbered", () => {
  it("every option button carries list_options' letter, in its order, with its id kept in data-option (en + zh-CN)", () => {
    const s = solved(stemi);
    for (const locale of ["en", "zh-CN"] as const) {
      setLocale(locale);
      stemi.decisions.forEach((d, i) => {
        const { card } = render(d, true, true);
        const buttons = card.all((e) => e.tagName === "button" && e.hasClass("decision-option"));
        const letters = buttons.map((b) => b.all((e) => e.hasClass("option-letter"))[0]!.textContent);
        const texts = buttons.map((b) => b.all((e) => e.hasClass("option-text"))[0]!.textContent.replace(/^✓ /, ""));
        expect(letters.map((label, k) => ({ label, text: texts[k] })), d.id).toEqual(listed(stemi, s, locale, i + 1));
        // The badge is decorative: the accessible name says "Option B: …" in the learner's language.
        for (const [k, b] of buttons.entries()) {
          expect(b.all((e) => e.hasClass("option-letter"))[0]!.getAttribute("aria-hidden")).toBe("true");
          const option = d.options.find((o) => o.id === b.dataset.option)!;
          expect(t(option.text, locale)).toBe(texts[k]);
          const name = b.getAttribute("aria-label")!;
          expect(name.startsWith(locale === "en" ? `Option ${letters[k]}: ${texts[k]}` : `选项 ${letters[k]}：${texts[k]}`), name).toBe(true);
          if (option.correct) expect(name).toMatch(locale === "en" ? /\(correct answer\)$/ : /（正确答案）$/);
          expect(b.disabled).toBe(true);
        }
        expect(card.all((e) => e.hasClass("eyebrow"))[0]!.textContent).toBe(locale === "en" ? `Decision ${i + 1} · ✓ Done` : `决策 ${i + 1} · ✓ 已完成`);
      });
    }
  });

  it("an open single-answer decision answers with the authored id of the lettered option; a wrong last answer is named as such", () => {
    setLocale("en");
    const d = stemi.decisions.find((x) => x.kind === "single")!;
    const n = stemi.decisions.indexOf(d) + 1;
    const wrongId = d.options.find((o) => !o.correct)!.id;
    const { card, acted } = render(d, true, false, [{ optionIds: [wrongId], correct: false, firstTry: true }]);
    expect(card.all((e) => e.hasClass("eyebrow"))[0]!.textContent).toBe(`Decision ${n} · Ready to decide`);
    const buttons = card.all((e) => e.tagName === "button" && e.hasClass("decision-option"));
    expect(buttons.map((b) => b.all((e) => e.hasClass("option-letter"))[0]!.textContent)).toEqual(buttons.map((_, k) => String.fromCharCode(65 + k)));
    const wrong = buttons.find((b) => b.dataset.option === wrongId)!;
    expect(wrong.hasClass("wrong")).toBe(true);
    expect(wrong.getAttribute("aria-label")).toMatch(/\(your answer, not correct\)$/);
    buttons[1]!.click();
    expect(acted).toEqual([{ type: "answer", decisionId: d.id, optionIds: [buttons[1]!.dataset.option] }]);
  });

  it("an open select-all decision letters its checkboxes; their value stays the authored id", () => {
    setLocale("zh-CN");
    const d = stemi.decisions.find((x) => x.kind === "multiple")!;
    const { card } = render(d, true, false);
    const labels = card.all((e) => e.tagName === "label" && e.hasClass("decision-option"));
    const boxes = card.all((e) => e.tagName === "input");
    expect(labels.map((l) => l.all((e) => e.hasClass("option-letter"))[0]!.textContent)).toEqual(labels.map((_, k) => String.fromCharCode(65 + k)));
    expect(boxes.map((b) => b.value).sort()).toEqual(d.options.map((o) => o.id).sort());
    for (const [k, b] of boxes.entries()) expect(b.getAttribute("aria-label")).toBe(`选项 ${String.fromCharCode(65 + k)}：${t(d.options.find((o) => o.id === b.value)!.text, "zh-CN")}`);
  });

  it("a locked decision shows only its number and what it needs — no option, no letter", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      setLocale(locale);
      const d = stemi.decisions[stemi.decisions.length - 1]!;
      const { card } = render(d, false, false);
      expect(card.all((e) => e.hasClass("decision-option") || e.hasClass("option-letter"))).toEqual([]);
      expect(card.all((e) => e.tagName === "h3")[0]!.textContent).toBe(locale === "en" ? `Decision ${stemi.decisions.length} — locked` : `决策 ${stemi.decisions.length} · 尚未解锁`);
      expect(card.textContent).not.toContain(t(d.prompt, locale));
    }
  });
});
