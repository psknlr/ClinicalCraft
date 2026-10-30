/**
 * The live episode trace (docs/EMBODIED.md §10) in the autopilot window:
 * each step of an agent — a `plan` span (an autopilot step, a skill, a
 * delegated task) — with what it did, in order: observation → navigation →
 * interaction → clinical action → state change → verification, failures
 * with their error code and the place a hint names. A step still running
 * (its plan span is recorded when it ends) shows what it did so far. Names,
 * error codes and actors are shown in the learner's language
 * (`trace-labels.ts`); the identifiers stay on the elements (`data-name`,
 * `data-code`, tooltips) for teachers and tests.
 */
import type { TraceSpan } from "@clinicalcraft/world";
import { tr, trMaybe } from "../../i18n/index.js";
import { h } from "../dom.js";
import { itemLabel, traceActorLabel, traceCodeLabel, traceLabel, type TraceLabelContext } from "./trace-labels.js";

export interface TraceStepView {
  id: string;
  kind: TraceSpan["kind"];
  name: string;
  ok: boolean;
  depth: number;
  errorCode?: string;
  /** The place a failed world action's hint names. */
  hint?: string;
  /** The case item a clinical act was about (its arguments: an investigation, intervention, finding…). */
  item?: string;
  /** The argument that named `item` (`decision_id`: a decision by its number or id — `itemLabel` reads it so). */
  itemArg?: string;
}

export interface TraceGroupView {
  /** The plan span id (or the span id of a lone action). */
  id: string;
  /** Kind of the span that names the group (a plan, or the lone action itself). */
  kind: TraceSpan["kind"];
  name: string;
  /** true / false when finished; null while running. */
  ok: boolean | null;
  actorId: string | null;
  steps: TraceStepView[];
  /** A lone clinical act: the case item it was about. */
  item?: string;
  /** The argument that named `item`. */
  itemArg?: string;
}

/** Arguments of a clinical tool that name a case item. */
const ITEM_ARGS = ["investigation_id", "intervention_id", "finding_id", "item_id", "decision_id"] as const;

/**
 * The case item a span's clinical tool call was about (`data.args`) and the argument that named it, if any: a
 * `decision_id` may give the decision's number ("2", as agents answer) rather than its id.
 */
function spanItem(s: TraceSpan): { item: string; itemArg: string } | undefined {
  const args = s.kind === "clinical_action" ? (s.data as { args?: Record<string, unknown> } | undefined)?.args : undefined;
  if (!args || typeof args !== "object") return undefined;
  for (const k of ITEM_ARGS) if (typeof args[k] === "string" && args[k]) return { item: args[k] as string, itemArg: k };
  return undefined;
}

/**
 * Group spans into steps: each top-level span with its descendants, in
 * recording order; children whose plan span is not recorded yet form a
 * running step. Lone observations (a panel looking at a device) are left
 * out. The last `limit` steps.
 */
export function traceGroups(spans: readonly TraceSpan[], hintOf: (actionId: string) => string | null = () => null, limit = 8): TraceGroupView[] {
  const byId = new Map(spans.map((s) => [s.id, s]));
  const top = (s: TraceSpan): { key: string; root: TraceSpan | null } => {
    let cur = s;
    const seen = new Set<string>();
    while (cur.parentId && !seen.has(cur.id)) {
      seen.add(cur.id);
      const parent = byId.get(cur.parentId);
      if (!parent) return { key: cur.parentId, root: null };
      cur = parent;
    }
    return { key: cur.id, root: cur };
  };
  const groups = new Map<string, { root: TraceSpan | null; members: TraceSpan[]; first: number }>();
  spans.forEach((s, i) => {
    const { key, root } = top(s);
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { root, members: [], first: i }));
    if (s !== root) g.members.push(s);
    g.root = root ?? g.root;
  });
  const depthOf = (s: TraceSpan, rootId: string | null): number => {
    let d = 0;
    let cur: TraceSpan | undefined = s;
    while (cur?.parentId && cur.parentId !== rootId && d < 8) {
      cur = byId.get(cur.parentId);
      d++;
    }
    return d;
  };
  const out: TraceGroupView[] = [];
  for (const [key, g] of [...groups].sort((a, b) => a[1].first - b[1].first)) {
    const root = g.root;
    if (root && root.kind === "observation" && !g.members.length) continue;
    const steps: TraceStepView[] = [];
    // a lone action (no plan): the action itself is the first step
    const items = root && root.kind !== "plan" ? [root, ...g.members] : g.members;
    for (const s of items) {
      // under a plan its own spans start at depth 0; under a lone action they sit one level below it
      const depth = s === root ? 0 : depthOf(s, root?.id ?? key) + (root && root.kind !== "plan" ? 1 : 0);
      const step: TraceStepView = { id: s.id, kind: s.kind, name: s.name, ok: s.ok, depth };
      const item = spanItem(s);
      if (item) Object.assign(step, item);
      if (s.refs.errorCode) step.errorCode = s.refs.errorCode;
      if (!s.ok && s.refs.actionId) {
        const hint = hintOf(s.refs.actionId);
        if (hint) step.hint = hint;
      }
      steps.push(step);
    }
    const item = root ? spanItem(root) : undefined;
    out.push({ id: key, kind: root?.kind ?? (steps[0] && steps[0].depth === 0 ? steps[0].kind : "plan"), name: root?.name ?? steps[0]?.name ?? key, ok: root ? root.ok : null, actorId: root?.actorId ?? g.members[0]?.actorId ?? null, steps, ...item });
  }
  return out.slice(-limit);
}

const KIND_ICON: Record<string, string> = {
  observation: "◉",
  plan: "▸",
  navigation: "➜",
  interaction: "✋",
  clinical_action: "✚",
  state_change: "◆",
  verification: "✓",
  assessment: "★",
};

/** "Order a test · Full blood count": a label with the case item it was about (`itemArg`: the argument naming it). */
function withItem(label: string, view: { item?: string; itemArg?: string }, ctx: TraceLabelContext): string {
  return view.item ? tr("trace.plan.item", { action: label, item: itemLabel(ctx.caseDef, view.item, view.itemArg, ctx.state) }) : label;
}

/** The trace as a list (newest step last), labelled in the learner's language. */
export function traceList(groups: readonly TraceGroupView[], ctx: TraceLabelContext = { caseDef: null }): HTMLElement {
  const list = h("ol", { class: "trace", id: "autopilot-trace" });
  if (!groups.length) {
    list.append(h("li", { class: "empty" }, tr("auto.traceEmpty")));
    return list;
  }
  for (const g of groups) {
    const status = g.ok === null ? "running" : g.ok ? "ok" : "failed";
    list.append(
      h(
        "li",
        { class: ["trace-group", status], dataset: { group: g.id } },
        h(
          "div",
          { class: "trace-head" },
          h("span", { class: "trace-status", "aria-label": status === "ok" ? tr("auto.ok") : status === "failed" ? tr("auto.fail") : tr("auto.traceRunning") }, status === "ok" ? "✓" : status === "failed" ? "✕" : "…"),
          h("b", { title: g.name, dataset: { name: g.name } }, withItem(traceLabel(g.kind, g.name, ctx), g, ctx)),
          g.actorId ? h("small", { class: "trace-actor", dataset: { actor: g.actorId } }, traceActorLabel(g.actorId, ctx)) : null,
        ),
        h(
          "ol",
          { class: "trace-steps" },
          g.steps.map((s) =>
            h(
              "li",
              { class: ["trace-step", `kind-${s.kind}`, s.ok ? "ok" : "failed"], dataset: { kind: s.kind, depth: String(s.depth), name: s.name } },
              h("span", { class: "trace-kind", title: trMaybe(`trace.kind.${s.kind}`, s.kind) }, KIND_ICON[s.kind] ?? "·", " ", trMaybe(`trace.kind.${s.kind}`, s.kind)),
              h("span", { class: "trace-name", title: s.name }, withItem(traceLabel(s.kind, s.name, ctx), s, ctx)),
              s.errorCode ? h("small", { class: "trace-error", title: s.errorCode, dataset: { code: s.errorCode } }, traceCodeLabel(s.errorCode)) : null,
              s.hint ? h("small", { class: "trace-hint" }, tr("auto.traceHint", { label: s.hint })) : null,
            ),
          ),
        ),
      ),
    );
  }
  return list;
}
