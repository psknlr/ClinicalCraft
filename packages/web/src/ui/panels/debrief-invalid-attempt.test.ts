/**
 * Web debrief renders blocked out-of-order checklist attempts (`safety.invalidAttempts`)
 * separately from actually applied contraindicated interventions (`safety.contraindicated`).
 */
import { assess, parseCase, replay, type AssessmentReport, type ClinicalAction, type SessionState } from "@clinicalcraft/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { App } from "../../app/context.js";
import { setLocale } from "../../i18n/index.js";
import { lapCholeCase } from "./__fixtures__/lap-chole-sit.js";
import { debriefPanel } from "./debrief.js";

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
  addEventListener(): void {}
  findAll(pred: (el: FakeElement) => boolean): FakeElement[] {
    const out: FakeElement[] = [];
    if (pred(this)) out.push(this);
    for (const n of this.childNodes) if (n instanceof FakeElement) out.push(...n.findAll(pred));
    return out;
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

const L = (en: string, zh = en) => ({ en, "zh-CN": zh });

function checklistOpCase() {
  const raw = structuredClone(lapCholeCase()) as unknown as Record<string, any>;
  raw.phases = [
    { id: "theatre", label: L("Theatre", "手术间") },
    { id: "operation", label: L("Operation", "手术中"), enterWhen: { intervened: "time-out", valid: true } },
  ];
  raw.procedure.phases = ["operation"];
  raw.interventions = [
    { id: "sign-in", name: L("WHO Sign In", "WHO 麻醉前核查"), kind: "monitoring", checklist: true, maxDoses: 1, indicatedWhen: { phase: "theatre" } },
    { id: "induction", name: L("Induction", "麻醉诱导"), kind: "airway", risk: "high", maxDoses: 1, contraindicatedWhen: { not: { intervened: "sign-in", valid: true } } },
    { id: "time-out", name: L("WHO Time Out", "WHO 切皮前核查"), kind: "consult", checklist: true, maxDoses: 1, contraindicatedWhen: { not: { intervened: "induction", valid: true } } },
  ];
  const parsed = parseCase(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues.slice(0, 3)));
  return parsed.value;
}

describe("debrief distinguishes blocked invalid checklist attempts from applied contraindicated interventions", () => {
  const c = checklistOpCase();

  function renderDebrief(state: SessionState, report: AssessmentReport): FakeElement {
    const store = { assessment: { report, narrative: null, judged: [] }, assessing: false, snapshot: null, offline: true, version: 1 };
    const app = { game: { caseDef: c, session: { store, session: { state } } }, submit: () => undefined } as unknown as App;
    return debriefPanel(app)().body as unknown as FakeElement;
  }

  it("early Time Out only: shown as out-of-order (not applied), never as Contraindicated (en + zh-CN)", () => {
    const state = replay(c, [{ type: "start" }, { type: "intervene", interventionId: "time-out" }]).state;
    const report = assess(c, state);

    setLocale("en");
    const en = renderDebrief(state, report);
    const itemsEn = en.findAll((el) => el.dataset.invalidAttempt === "time-out");
    expect(itemsEn).toHaveLength(1);
    expect(itemsEn[0]!.textContent).toContain("Out-of-order attempt (not applied): WHO Time Out");
    expect(en.textContent).not.toContain("Contraindicated: WHO Time Out");

    setLocale("zh-CN");
    const zh = renderDebrief(state, report);
    const itemsZh = zh.findAll((el) => el.dataset.invalidAttempt === "time-out");
    expect(itemsZh).toHaveLength(1);
    expect(itemsZh[0]!.textContent).toContain("顺序不符（未执行）：WHO 切皮前核查");
    expect(zh.textContent).not.toContain("禁忌处置：WHO 切皮前核查");
  });

  it("mixed path renders applied contraindicated induction and blocked invalid time-out separately", () => {
    const actions: ClinicalAction[] = [
      { type: "start" },
      { type: "intervene", interventionId: "time-out" },
      { type: "intervene", interventionId: "induction" },
    ];
    const state = replay(c, actions).state;
    const report = assess(c, state);

    setLocale("en");
    const en = renderDebrief(state, report);
    expect(en.textContent).toContain("Contraindicated: Induction");
    expect(en.textContent).toContain("Out-of-order attempt (not applied): WHO Time Out");
    expect(en.textContent).not.toContain("Contraindicated: WHO Time Out");
  });
});
