/**
 * A Treat row shows what the engine recorded as given, counted as the engine counts it against `maxDoses`
 * (`dosesGiven`), not a count of the UI's own (audit 2026-11-16): a checklist step attempted out of order gave
 * nothing, so its row still offers the attempt in order — which the engine accepts —, and a resumed encounter, whose
 * store has folded no event of the doses given before the reload, still shows them and offers no dose past
 * `maxDoses`. Vitest has no DOM: a minimal document stands in for the browser's (as in orders-not-done.test.ts).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentEvent, EventMsg } from "@clinicalcraft/agent";
import { createSession, currentWaypoint, parseCase, progress, reduce, vitalsAt, type CaseDefinition, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { App, Game } from "../../app/context.js";
import { SessionStore } from "../../app/store.js";
import { setLocale } from "../../i18n/index.js";
import { treatRow } from "./treat-row.js";

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

/* ---------------- the STEMI case, with a checklist step added for the test ---------------- */

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(fs.readFileSync(path.resolve(here, "../../../../content/cases/stemi-inferior-rv/case.json"), "utf8")) as Record<string, any>;
// a WHO-style step (`checklist: true`, one dose): out of order until aspirin was given
raw.interventions.push({ id: "test-sign-in", name: { en: "Test Sign In", "zh-CN": "测试签到" }, kind: "monitoring", risk: "none", checklist: true, maxDoses: 1, contraindicatedWhen: { not: { intervened: "aspirin" } } });
const parsed = parseCase(raw);
if (!parsed.ok) throw new Error("stemi-inferior-rv (with a checklist step) does not parse");
const c: CaseDefinition = parsed.value;
const iv = (id: string) => c.interventions.find((i) => i.id === id)!;
const act = (id: string): ClinicalAction => ({ type: "intervene", interventionId: id });

let seq = 0;
const ev = (msg: EventMsg): AgentEvent => ({ id: "s1", seq: ++seq, msg });

/** The engine's state after `actions`, and a store fed the session's events for them (its clinical events, then its snapshot). */
function live(actions: ClinicalAction[], from: { s: SessionState; store: SessionStore } = { s: createSession(c), store: new SessionStore(c) }) {
  let s = from.s;
  for (const a of actions) {
    const r = reduce(c, s, a);
    if (r.rejected) throw new Error(`${a.type}: ${r.rejected.message}`);
    s = r.state;
    for (const event of r.events) from.store.event(ev({ type: "clinical_event", event }));
    from.store.event(ev({ type: "state_snapshot", state: s, progress: progress(c, s), vitals: vitalsAt(c, s), waypoint: currentWaypoint(c, s) }));
  }
  return { s, store: from.store };
}

/** The row of `id` in clinical mode, every capability at the bedside; the actions its "Give" sends. */
function row(s: SessionState, store: SessionStore, id: string) {
  const acted: ClinicalAction[] = [];
  const app = { act: (a: ClinicalAction) => (acted.push(a), "sub-1"), playerPos: () => ({ x: 0, z: 0 }) } as unknown as App;
  const game = { caseDef: c, session: { store, session: { state: s } }, stations: { nearestProvider: () => null } } as unknown as Game;
  const caps = new Set(c.interventions.flatMap((i) => i.requires));
  const el = treatRow(app, game, iv(id), caps, false) as unknown as FakeElement;
  const button = el.all((e) => e.tagName === "button")[0]!;
  return { el, button, acted };
}

describe("web: a Treat row counts the doses the engine counts (maxDoses)", () => {
  it("a checklist step attempted out of order gave nothing: the row offers it again, the engine accepts it, then it is done (en + zh-CN)", () => {
    for (const [locale, give, max, given] of [
      ["en", "Give", "Maximum doses reached", "Given 1×"],
      ["zh-CN", "执行", "已达最大次数", "已执行 1 次"],
    ] as const) {
      setLocale(locale);
      const early = live([{ type: "start" }, act("test-sign-in")]);
      expect(early.s.interventions).toMatchObject([{ interventionId: "test-sign-in", invalid: true }]);
      const before = row(early.s, early.store, "test-sign-in");
      expect(before.button.disabled).toBe(false);
      expect(before.button.textContent).toBe(give);
      expect(before.el.textContent).not.toContain(given);
      before.button.click();
      expect(before.acted).toEqual([act("test-sign-in")]);
      // in order: the engine accepts the attempt the row offered, and the row is done
      const inOrder = live([act("aspirin"), act("test-sign-in")], early);
      expect(inOrder.s.interventions.filter((r) => r.interventionId === "test-sign-in").map((r) => r.invalid ?? false)).toEqual([true, false]);
      const after = row(inOrder.s, inOrder.store, "test-sign-in");
      expect(after.button.disabled).toBe(true);
      expect(after.button.textContent).toBe(max);
      expect(after.el.textContent).toContain(given);
    }
  });

  it("a resumed encounter (no event of the earlier doses in its store) shows them and offers no dose past maxDoses", () => {
    setLocale("en");
    const played = live([{ type: "start" }, act("aspirin")]);
    // after a reload the session replays its actions; the store starts empty (only restored conversation lines),
    // then holds the next snapshot of the engine's state
    const snapshotted = new SessionStore(c);
    snapshotted.event(ev({ type: "state_snapshot", state: played.s, progress: progress(c, played.s), vitals: vitalsAt(c, played.s), waypoint: currentWaypoint(c, played.s) }));
    for (const store of [new SessionStore(c), snapshotted]) {
      const r = row(played.s, store, "aspirin");
      expect(r.button.disabled).toBe(true);
      expect(r.button.textContent).toBe("Maximum doses reached");
      expect(r.el.textContent).toContain("Given 1×");
    }
    // nothing given: offered
    expect(row(played.s, new SessionStore(c), "atorvastatin").button.disabled).toBe(false);
  });
});
