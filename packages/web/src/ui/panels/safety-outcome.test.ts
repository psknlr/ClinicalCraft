/**
 * The safety outcome in the web world (audit 2026-11-12 P0-1..P0-3, docs/PROTOCOL.md §3.2): the debrief shows it
 * beside the score — a "Not passed" tile and the critical safety failures named, never "Passed" for a run with a
 * critical failure, whatever its percentage —, the learning record exports it, and a dose error (an order not given)
 * is read back in the conversation. Vitest has no DOM: a minimal document stands in for the browser's.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assess, parseCase, replay, type AssessmentReport, type CaseDefinition, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { App, Game } from "../../app/context.js";
import type { RuntimeChoice } from "../../app/llm.js";
import { buildLearningRecord } from "../../app/record.js";
import { SessionStore } from "../../app/store.js";
import { setLocale } from "../../i18n/index.js";
import { lapCholeCase } from "./__fixtures__/lap-chole-sit.js";
import { debriefPanel } from "./debrief.js";
import { searchOrder, treatRow } from "./treat-row.js";

/* ---------------- a minimal document ---------------- */

class FakeNode {
  childNodes: FakeNode[] = [];
  parentElement: FakeNode | null = null;
  appendChild(node: FakeNode): FakeNode {
    this.childNodes.push(node);
    node.parentElement = this;
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
  innerHTML = "";
  disabled = false;
  readonly dataset: Record<string, string> = {};
  readonly style = { cssText: "" };
  readonly attributes = new Map<string, string>();
  constructor(readonly tagName: string) {
    super();
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  readonly listeners = new Map<string, ((e: unknown) => void)[]>();
  addEventListener(type: string, fn: (e: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  click(): void {
    for (const fn of this.listeners.get("click") ?? []) fn({ preventDefault: () => undefined });
  }
  /** The first descendant element with this tag. */
  find(tag: string): FakeElement | null {
    for (const n of this.childNodes) {
      if (!(n instanceof FakeElement)) continue;
      if (n.tagName === tag) return n;
      const inner = n.find(tag);
      if (inner) return inner;
    }
    return null;
  }
  /** The descendant element with this id. */
  byId(id: string): FakeElement | null {
    for (const n of this.childNodes) {
      if (!(n instanceof FakeElement)) continue;
      if (n.getAttribute("id") === id) return n;
      const inner = n.byId(id);
      if (inner) return inner;
    }
    return null;
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

/* ---------------- the stroke case, the audit's replay ---------------- */

const here = path.dirname(fileURLToPath(import.meta.url));
const parsed = parseCase(JSON.parse(fs.readFileSync(path.resolve(here, "../../../../content/cases/acute-ischemic-stroke/case.json"), "utf8")));
if (!parsed.ok) throw new Error("acute-ischemic-stroke does not parse");
/** The built-in stroke case: alteplase is critical (its authors' decision: a second thrombolytic is the dangerous error). */
const stroke: CaseDefinition = parsed.value;

/** The reference path, and the audit's variant with alteplase right after tenecteplase (P0-1). */
const reference = replay(stroke, stroke.solution).state;
const secondLysis = replay(stroke, stroke.solution.flatMap((a): ClinicalAction[] => (a.type === "intervene" && a.interventionId === "tenecteplase" ? [a, { type: "intervene", interventionId: "alteplase" }] : [a]))).state;

function debrief(state: SessionState, report: AssessmentReport): FakeElement {
  const store = { assessment: { report, narrative: null, judged: [] }, assessing: false, snapshot: null, offline: true, version: 1 };
  const app = { game: { caseDef: stroke, session: { store, session: { state } } }, submit: () => undefined } as unknown as App;
  return debriefPanel(app)().body as unknown as FakeElement;
}

describe("the debrief shows the safety outcome beside the score", () => {
  it("the stroke case marks alteplase critical", () => {
    expect(stroke.interventions.find((i) => i.id === "alteplase")?.critical).toBe(true);
  });

  it("a second thrombolytic: “Not passed” beside the score, the critical safety failure named — whatever the percentage (en + zh-CN)", () => {
    const report = assess(stroke, secondLysis);
    expect(report.safety.passed).toBe(false);
    setLocale("en");
    const en = debrief(secondLysis, report);
    expect(en.byId("debrief-safety-metric")?.textContent).toBe("Not passedSafety");
    expect(en.byId("debrief-safety-metric")?.className).toBe("safety-bad");
    const block = en.byId("debrief-safety")!;
    expect(block.textContent).toContain("⚠ Safety: not passed — critical safety failures: 1");
    expect(block.textContent).toMatch(/Critical safety failure: .*[Aa]lteplase.* given while contraindicated \(minute \d+\)/);
    expect(en.textContent).not.toContain("Passed");
    setLocale("zh-CN");
    const zh = debrief(secondLysis, report);
    expect(zh.byId("debrief-safety-metric")?.textContent).toBe("未通过安全性");
    expect(zh.byId("debrief-safety")!.textContent).toContain("安全性：未通过——严重安全失误 1 次");
  });

  it("the reference path: “Passed”, no safety alert", () => {
    setLocale("en");
    const el = debrief(reference, assess(stroke, reference));
    expect(el.byId("debrief-safety-metric")?.textContent).toBe("PassedSafety");
    expect(el.byId("debrief-safety")).toBeNull();
  });
});

describe("a case with an operation: no hidden gate mid-case (docs/PROCEDURE.md §7)", () => {
  const op = lapCholeCase();
  const started = replay(op, [{ type: "start" }]).state;
  /** The started session's report, with a safety-critical gate holding (an injury the field does not show). */
  const gated = (): AssessmentReport => {
    const r = assess(op, started);
    return { ...r, safety: { ...r.safety, gates: [{ id: "bdi", verdict: "safety-critical" }], verdict: "safety-critical", passed: false } };
  };
  function render(state: SessionState, report: AssessmentReport): FakeElement {
    const store = { assessment: { report, narrative: null, judged: [] }, assessing: false, snapshot: null, offline: true, version: 1 };
    const app = { game: { caseDef: op, session: { store, session: { state } } }, submit: () => undefined } as unknown as App;
    return debriefPanel(app)().body as unknown as FakeElement;
  }

  it("mid-case the tile and the alert leave the operation's gate out, as the score is held back", () => {
    setLocale("en");
    const mid = render(started, gated());
    expect(mid.byId("debrief-safety-metric")?.textContent).toBe("PassedSafety");
    expect(mid.byId("debrief-safety")).toBeNull();
    expect(mid.textContent).not.toContain("operation");
  });

  it("once the case is finished the gate shows: not passed, a safety-critical event in the operation", () => {
    setLocale("en");
    const done = render({ ...started, finished: true }, gated());
    expect(done.byId("debrief-safety-metric")?.textContent).toBe("Not passedSafety");
    expect(done.byId("debrief-safety")?.textContent).toContain("Safety: not passed — a safety-critical event in the operation");
  });

  it("what the learner did is shown mid-case all the same: a critical dose error fails the tile", () => {
    setLocale("en");
    const r = gated();
    const error = { interventionId: "x", at: 1, text: "drug 50 mg", ordered: { amount: 50, unit: "mg" as const }, preset: { amount: 5, unit: "mg" as const }, ratio: 10, conflicts: ["amount" as const], severity: "critical" as const };
    const mid = render(started, { ...r, safety: { ...r.safety, doseErrors: [error] } });
    expect(mid.byId("debrief-safety-metric")?.textContent).toBe("Not passedSafety");
    expect(mid.byId("debrief-safety")?.textContent).toContain("Safety: not passed — critical dose errors: 1");
    expect(mid.byId("debrief-safety")?.textContent).not.toContain("operation");
  });
});

describe("the learning record exports the safety outcome", () => {
  it("passed false with the critical failure, beside the score; the dose errors kept", () => {
    const store = { chat: [], plan: null, assessment: null, config: null };
    const game = { caseDef: stroke, facility: { id: "general-hospital" }, session: { session: { state: secondLysis, id: "test", snapshot: () => ({ actions: [] }) }, store } } as unknown as Game;
    const record = buildLearningRecord(game, "en", { mode: "offline" } as RuntimeChoice) as { outcome: { score: { percent: number }; safety: { passed: boolean; headline: string; criticalFailures: { interventionId: string }[] } }; doseErrors: unknown[] };
    expect(record.outcome.score.percent).toBe(assess(stroke, secondLysis).score.percent);
    expect(record.outcome.safety).toMatchObject({ passed: false, headline: "Safety: not passed — critical safety failures: 1", criticalFailures: [{ interventionId: "alteplase" }] });
    expect(record.doseErrors).toEqual([]);
  });

  it("an order written in words keeps, apart, its text and the dose read from it, and the dose given (the preset)", () => {
    const ordered = { text: "tenecteplase 20 mg IV", dose: { amount: 20, unit: "mg" as const, route: "IV" as const } };
    const state = replay(stroke, stroke.solution.map((a): ClinicalAction => (a.type === "intervene" && a.interventionId === "tenecteplase" ? { ...a, ordered } : a))).state;
    const store = { chat: [], plan: null, assessment: null, config: null };
    const game = { caseDef: stroke, facility: { id: "general-hospital" }, session: { session: { state, id: "test", snapshot: () => ({ actions: [] }) }, store } } as unknown as Game;
    const record = buildLearningRecord(game, "en", { mode: "offline" } as RuntimeChoice) as { interventions: { interventionId: string; ordered?: unknown; administered?: unknown }[] };
    // 20 mg for his 80 kg is the 0.25 mg/kg preset: given, the three kept apart
    const tnk = record.interventions.find((r) => r.interventionId === "tenecteplase")!;
    expect(tnk.ordered).toEqual(ordered);
    expect(tnk.administered).toEqual({ dose: { amount: 0.25, upTo: 0.28, unit: "mg/kg", route: "IV" }, text: expect.stringMatching(/^Tenecteplase 0\.25 mg\/kg/) });
    // a treatment chosen from a list writes no order: nothing to keep apart
    expect(record.interventions.find((r) => r.interventionId === "iv-access")).not.toHaveProperty("administered");
  });
});

describe("a dose error in the conversation", () => {
  it("the nurse's read-back stands where the treatment would have been: not given", () => {
    setLocale("en");
    const store = new SessionStore(stroke);
    store.event({ id: "s1", seq: 1, msg: { type: "session_configured", locale: "en" } as never });
    store.event({
      id: "s1",
      seq: 2,
      msg: { type: "clinical_event", event: { type: "dose.error", interventionId: "alteplase", text: "alteplase 90 mg IV", ordered: { amount: 90, unit: "mg", route: "IV" }, preset: { amount: 0.9, unit: "mg/kg", route: "IV" }, ratio: 1.43, conflicts: ["amount"], severity: "critical" } } as never,
    });
    const line = store.chat.at(-1)!;
    expect(line.tone).toBe("harm");
    // the nurse's words — the dose per kg with what it comes to for him (80 kg) — then that nothing was given
    expect(line.text).toMatch(/^Nurse: “Before I give .*you ordered 90 mg IV; what I have prepared is 0\.9 mg\/kg IV \(72 mg\)\. Can you confirm the dose\?”\nNot given: /);
  });

  it("a critical safety failure as it happens: a harm card that says so, never one in the colours of a treatment given", () => {
    const store = new SessionStore(stroke);
    store.event({ id: "s1", seq: 1, msg: { type: "session_configured", locale: "en" } as never });
    store.event({ id: "s1", seq: 2, msg: { type: "clinical_event", event: { type: "intervention.applied", interventionId: "alteplase", appropriateness: "contraindicated", critical: true } } as never });
    const card = store.chat.at(-1)!;
    expect(card.tone).toBe("harm");
    expect(card.text).toMatch(/^⚠ Critical safety failure: given while contraindicated\. /);
    // the same intervention given while indicated: a treatment card, nothing about safety
    store.event({ id: "s1", seq: 3, msg: { type: "clinical_event", event: { type: "intervention.applied", interventionId: "alteplase", appropriateness: "indicated" } } as never });
    expect(store.chat.at(-1)).toMatchObject({ tone: "treat" });
    expect(store.chat.at(-1)!.text).not.toContain("Critical safety failure");
  });
});

describe("the treatment search: words that state a dose are an order", () => {
  const tnk = (text: string, id = "tenecteplase", locale = "en") => searchOrder(stroke, text, id, locale);

  it("reads an order when the words state an amount, or a dose that cannot be read (the nurse asks — never the preset instead)", () => {
    expect(tnk("tenecteplase 20 mg IV")).toEqual({ text: "tenecteplase 20 mg IV", dose: { amount: 20, unit: "mg", route: "IV" } });
    expect(tnk("替奈普酶 20毫克 静推", "tenecteplase", "zh-CN")).toEqual({ text: "替奈普酶 20毫克 静推", dose: { amount: 20, unit: "mg", route: "IV" } });
    expect(tnk("替奈普酶二十毫克静推", "tenecteplase", "zh-CN")).toEqual({ text: "替奈普酶二十毫克静推", dose: { amount: 20, unit: "mg", route: "IV" } });
    expect(tnk("tenecteplase 0。5 mg IV")).toEqual({ text: "tenecteplase 0。5 mg IV", dose: { route: "IV" } });
    expect(tnk("tenecteplase 20 IV")).toEqual({ text: "tenecteplase 20 IV", dose: { route: "IV" } });
    expect(tnk("tenecteplase IV")).toBeUndefined();
    expect(tnk("oxygen")).toBeUndefined();
    expect(tnk("oxygen 15 L/min")).toBeUndefined();
  });

  it("an order that names several treatments gives each row its own clause (re-review: every row got the whole order)", () => {
    expect(tnk("tenecteplase 20 mg IV and aspirin 300 mg PO")).toEqual({ text: "tenecteplase 20 mg IV", dose: { amount: 20, unit: "mg", route: "IV" } });
    expect(tnk("tenecteplase 20 mg IV and aspirin 300 mg PO", "aspirin")).toEqual({ text: "aspirin 300 mg PO", dose: { amount: 300, unit: "mg", route: "PO" } });
    expect(tnk("替奈普酶20毫克静推，阿司匹林300毫克口服", "aspirin", "zh-CN")).toMatchObject({ text: "阿司匹林300毫克口服" });
  });

  it("a row found by an order whose dose is not clear says so, and gives the words for the nurse to ask about", () => {
    setLocale("en");
    const iv = stroke.interventions.find((i) => i.id === "tenecteplase")!;
    const acts: ClinicalAction[] = [];
    const app = { act: (a: ClinicalAction) => (acts.push(a), null) } as unknown as App;
    const game = { session: { store: { interventions: new Map() } }, embodied: null } as unknown as Game;
    const ordered = searchOrder(stroke, "tenecteplase 0。5 mg IV", "tenecteplase", "en")!;
    const row = treatRow(app, game, iv, new Set(iv.requires), false, ordered) as unknown as FakeElement;
    expect(row.textContent).toContain("The dose in your order is not clear (“0。5 mg”) — the nurse will ask before giving anything");
    row.find("button")!.click();
    expect(acts).toEqual([{ type: "intervene", interventionId: "tenecteplase", ordered }]);
    // a treatment without a preset dose: its dose is not checked, and the row says so (nobody asks about an unclear one)
    const nifedipine = stroke.interventions.find((i) => i.id === "nifedipine-sl")!;
    expect(nifedipine.doseSpec).toBeUndefined();
    const unchecked = treatRow(app, game, nifedipine, new Set(nifedipine.requires), false, searchOrder(stroke, "nifedipine 10 mg SL", "nifedipine-sl", "en")) as unknown as FakeElement;
    expect(unchecked.textContent).toContain("Dose read from your order: 10 mg SL — this treatment has no preset dose to check it against");
    const unclear = treatRow(app, game, nifedipine, new Set(nifedipine.requires), false, searchOrder(stroke, "nifedipine 0。5 mg SL", "nifedipine-sl", "en")) as unknown as FakeElement;
    expect(unclear.textContent).not.toContain("not clear");
  });

  it("a row found by an order shows the dose read and gives the words; a row chosen from the list gives the preset", () => {
    setLocale("en");
    const iv = stroke.interventions.find((i) => i.id === "tenecteplase")!;
    const acts: ClinicalAction[] = [];
    const app = { act: (a: ClinicalAction) => (acts.push(a), null) } as unknown as App;
    const game = { session: { store: { interventions: new Map() } }, embodied: null } as unknown as Game;
    const ordered = searchOrder(stroke, "tenecteplase 2 mg IV", "tenecteplase", "en")!;
    const row = treatRow(app, game, iv, new Set(iv.requires), false, ordered) as unknown as FakeElement;
    expect(row.textContent).toContain("Dose read from your order: 2 mg IV — checked against the preset dose when given");
    row.find("button")!.click();
    // the engine checks the words' dose against the 0.25 mg/kg preset: 2 mg for 80 kg is not given, the nurse reads it back
    expect(acts).toEqual([{ type: "intervene", interventionId: "tenecteplase", ordered }]);
    const plain = treatRow(app, game, iv, new Set(iv.requires), false) as unknown as FakeElement;
    expect(plain.textContent).not.toContain("Dose read from your order");
    plain.find("button")!.click();
    expect(acts.at(-1)).toEqual({ type: "intervene", interventionId: "tenecteplase" });
  });
});
