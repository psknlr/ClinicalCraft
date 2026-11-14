/**
 * A study ordered in the world and not done yet (docs/EMBODIED.md §8.7, audit 2026-11-12 P1-7) is its own state in the
 * web, as in the tools: "ordered — the patient must go to a CT scanner" / "已开单——患者需要去CT扫描" on its test button
 * (whose click shows the world's way there, never a report) and its evidence card (no countdown, no critical flag: no
 * result exists yet); once the patient was on the scanner, the card counts down to the release. Vitest has no DOM: a
 * minimal document stands in for the browser's.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSession, parseCase, reduce, type CaseDefinition, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { App, Game } from "../../app/context.js";
import type { Verdict } from "../../app/embodied-link.js";
import { setLocale } from "../../i18n/index.js";
import { evidenceGrid, minutesLeft } from "./common.js";
import { testButton, testVerdict } from "./orders.js";

/* ---------------- a minimal document ---------------- */

class FakeNode {
  childNodes: FakeNode[] = [];
  appendChild(node: FakeNode): FakeNode {
    this.childNodes.push(node);
    return node;
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
  disabled = false;
  readonly dataset: Record<string, string> = {};
  readonly style = { cssText: "" };
  readonly listeners = new Map<string, ((e: unknown) => void)[]>();
  constructor(readonly tagName: string) {
    super();
  }
  setAttribute(): void {}
  addEventListener(type: string, fn: (e: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
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

/* ---------------- the PE case: a CTPA ordered from the ward ---------------- */

const here = path.dirname(fileURLToPath(import.meta.url));
const parsed = parseCase(JSON.parse(fs.readFileSync(path.resolve(here, "../../../../content/cases/pulmonary-embolism-postop/case.json"), "utf8")));
if (!parsed.ok) throw new Error("pulmonary-embolism-postop does not parse");
const pe: CaseDefinition = parsed.value;
const ctpa = pe.investigations.find((i) => i.id === "ctpa")!;

function play(actions: ClinicalAction[], from: SessionState = createSession(pe)): SessionState {
  let s = from;
  for (const a of actions) {
    const r = reduce(pe, s, a);
    if (r.rejected) throw new Error(`${a.type}: ${r.rejected.message}`);
    s = r.state;
  }
  return s;
}

/** In the world the session records the CTPA with its device (`modality`): ordered, waiting for the patient. */
const ordered = play([{ type: "start" }, { type: "advance-time", minutes: 1 }, { type: "order", investigationId: "ctpa", modality: ["ct"], by: "learner" }]);

/** The world's verdict on the acquisition from the ward: the patient is not on the scanner — take her there. */
const refused: Verdict = { kind: "refused", reason: "patient-not-at-provider", message: "The patient must be on a CT scanner.", hint: null, prerequisite: null };

function setup(s: SessionState) {
  const explained: Verdict[] = [];
  const acted: unknown[] = [];
  const opened: unknown[] = [];
  const asked: ClinicalAction[] = [];
  const app = { act: (a: unknown) => (acted.push(a), "sub-1"), open: (panel: string, args: unknown) => void opened.push({ panel, args }), toast: () => undefined } as unknown as App;
  const game = {
    caseDef: pe,
    session: { store: { snapshot: { state: s } }, session: { state: s } },
    embodied: {
      verdict: (a: ClinicalAction) => (asked.push(a), a.type === "acquire" ? refused : { kind: "ok" }),
      explain: (v: Verdict) => void explained.push(v),
    },
  } as unknown as Game;
  return { app, game, explained, acted, opened, asked };
}

const back = { panel: "conversation" as const, tab: "tests" as const };

describe("web: a study ordered and not done yet (EMBODIED §8.7)", () => {
  it("its button says so and shows the way to the scanner; its card has no countdown and no critical flag (en + zh-CN)", () => {
    for (const [locale, words, name] of [
      ["en", "ordered — the patient must go to a CT scanner", "CT pulmonary angiography (CTPA)"],
      ["zh-CN", "已开单——患者需要去CT扫描", "CT肺动脉造影（CTPA）"],
    ] as const) {
      setLocale(locale);
      const { app, game, explained, acted, opened, asked } = setup(ordered);
      // nothing to do here: the order is placed — the button carries the state
      expect(testVerdict(game, ctpa)).toEqual({ kind: "ok" });
      const button = testButton(app, game, ctpa, null, "", back) as unknown as FakeElement;
      expect(button.textContent).toBe(`${name} · ${words}`);
      expect(button.dataset.stage).toBe("ordered");
      button.click();
      expect(asked.at(-1)).toMatchObject({ type: "acquire", investigationId: "ctpa", phase: "ward" });
      expect(explained).toEqual([refused]);
      expect(acted).toEqual([]);
      expect(opened).toEqual([]);
      // the evidence card: ordered, not pending a result, never flagged critical before its release
      expect(minutesLeft(pe, ordered, ordered.orders[0]!)).toBe(0);
      const grid = evidenceGrid(game, () => true, () => undefined) as unknown as FakeElement;
      const card = grid.all((e) => e.hasClass("evidence-card"))[0]!;
      expect(card.dataset).toMatchObject({ order: "ctpa@ward", stage: "ordered" });
      expect(card.textContent).toContain(words);
      expect(card.hasClass("pending")).toBe(true);
      expect(card.hasClass("critical")).toBe(false);
    }
  });

  it("acquired on the scanner: the card counts down to the release, the button no longer says it", () => {
    setLocale("en");
    const acquired = play([{ type: "advance-time", minutes: 4, reason: "travel" }, { type: "acquire", investigationId: "ctpa", collector: "radiographer", where: "eq:ct-scanner", by: "system" }], ordered);
    const { app, game } = setup(acquired);
    const order = acquired.orders[0]!;
    expect(minutesLeft(pe, acquired, order)).toBe(Math.ceil(order.readyAt! - acquired.clock));
    const card = (evidenceGrid(game, () => true, () => undefined) as unknown as FakeElement).all((e) => e.hasClass("evidence-card"))[0]!;
    expect(card.textContent).toMatch(/Pending · about 30 min/);
    expect(card.dataset.stage).toBeUndefined();
    expect(card.hasClass("critical")).toBe(false);
    const button = testButton(app, game, ctpa, null, "", back) as unknown as FakeElement;
    expect(button.textContent).toMatch(/sent, result in about 30 min/);
  });
});
