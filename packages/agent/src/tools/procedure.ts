/**
 * Operative-field tools (docs/PROCEDURE.md §7): `observe_field` shows what a surgeon at the laparoscopic
 * screen could see — ducts and vessels as handles, never their names; `operate` carries out one step
 * through the session (the only way to change the field). No safety-view verdict, hidden injury,
 * unsafe-act record or score reaches the agent: those are the debrief's.
 */
import { observeField, portReport, ProcedureOpSchema, createProcedureState, t, type FieldView, type ProcedureOp } from "@clinicalcraft/core";
import { joinList, rt } from "../session/i18n.js";
import { procedureLabel } from "../session/i18n-procedure.js";
import { actorFor, rejectedOutput, type ToolArgs } from "./clinical-resolve.js";
import type { ToolContext, ToolDefinition } from "./types.js";

function fieldText(ctx: ToolContext): string {
  const c = ctx.caseDef;
  const L = ctx.locale;
  const def = c.procedure;
  if (!def) return rt(L, "field.none");
  const s = ctx.state().procedure ?? createProcedureState();
  const v: FieldView = observeField(def, s);
  const lab = (x: string) => procedureLabel(L, x);
  if (!v.plan) {
    const plans = def.portPlans.map((p) => {
      const r = portReport(def, p);
      return `${p.id} — ${t(p.name, L)} [${rt(L, "field.ports.report", { plan: p.id, side: lab(p.surgeonSide), angle: r.manipulationAngle == null ? "—" : `${Math.round(r.manipulationAngle)}°`, warnings: r.warnings.length ? r.warnings.join(", ") : "—" })}]`;
    });
    return rt(L, "field.notStarted", { plans: plans.join("; ") });
  }
  const lines = [
    rt(L, "field.plan", {
      plan: v.plan,
      pressure: v.insufflated ? `${v.pressure} mmHg` : lab("off"),
      scope: v.ports.some((p) => p.instrument === "laparoscope") ? lab("in") : lab("out"),
    }),
    ...v.ports.map((p) => rt(L, "field.port", { port: p.port, role: lab(p.role), size: p.sizeMm, hand: p.hand ? `, ${lab(p.hand)}` : "", instrument: p.instrument ?? lab("empty") })),
  ];
  if (!v.inView) lines.push(rt(L, "field.notInView"));
  else {
    lines.push(rt(L, "field.organs", { organs: joinList(L, v.organs.map((o) => `${t(o.name, L)} (${o.id})`)) }));
    for (const tube of v.tubes) {
      const state = [
        tube.isolated ? lab("isolated") : "",
        tube.clips ? `${tube.clips} ${lab("clips")}` : "",
        tube.divided ? lab("divided") : "",
        tube.namedAs ? `${lab("named")} ${tube.namedAs}` : "",
        tube.imaging ? `${lab("imaging")}: ${t(tube.imaging, L)}` : "",
      ].filter(Boolean);
      lines.push(rt(L, "field.tube", { handle: tube.handle, appears: tube.appears ? t(tube.appears, L) : "—", state: state.length ? ` [${state.join("; ")}]` : "" }));
    }
    for (const r of v.regions) lines.push(rt(L, "field.region", { name: `${t(r.name, L)} (${r.id})`, dissection: lab(r.dissection), exposure: lab(r.exposure) }));
    for (const r of v.retractions) lines.push(rt(L, "field.retraction", { structure: r.structure, port: r.port, direction: r.direction.join(" + "), force: lab(r.force) }));
  }
  if (v.findings.length) lines.push(rt(L, "field.findings", { findings: joinList(L, v.findings.map(lab)) }));
  lines.push(rt(L, "field.specimen", { specimen: lab(v.specimen), bailouts: v.bailouts.length ? ` (${v.bailouts.join(", ")})` : "", pauses: v.pauses }));
  return lines.join("\n");
}

const observe: ToolDefinition<ToolArgs> = {
  name: "observe_field",
  description:
    "Look at the operative field on the laparoscopic screen: the port plan and instruments, the organs in view, the ducts and vessels in view as handles (T1, T2…) with what each looks like, how far each region is dissected and exposed, retractions, and findings (bleeding, bile, stones). Ducts and vessels are never named for you: identify them yourself.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  readOnly: true,
  sideEffect: "none",
  scope: "full",
  risk: () => "none",
  summarize: (_args, ctx) => rt(ctx.locale, "sum.observe_field"),
  async run(_args, ctx) {
    return { ok: true, output: fieldText(ctx) };
  },
};

const OP_NAMES = ProcedureOpSchema.options.map((o) => o.shape.op.value);

/** The op a tool call describes: `{ op: {...} }`, or the op's fields at the top level. */
function opFrom(args: ToolArgs): unknown {
  const nested = (args as Record<string, unknown>).step;
  return nested && typeof nested === "object" ? nested : args;
}

function opLabel(op: unknown): string {
  return op && typeof op === "object" && "op" in op ? String((op as { op: unknown }).op) : "?";
}

/** Irreversible or energy-delivering steps are high risk (the approval gate asks in supervised modes). */
function opRisk(args: ToolArgs): "low" | "high" {
  const op = opLabel(opFrom(args));
  return op === "clip" || op === "divide" || op === "coagulate" || op === "bailout" ? "high" : "low";
}

const operateTool: ToolDefinition<ToolArgs> = {
  name: "operate",
  description:
    "Carry out one step of the operation, e.g. {op:'plan-ports', plan:'…'}, {op:'insufflate', pressure:12}, {op:'insert', port:'A', instrument:'laparoscope'}, " +
    "{op:'retract', port:'B', structure:'gallbladder-fundus', direction:['cephalad','patient-left']}, {op:'dissect', port:'C', region:'…', energy:true}, " +
    "{op:'isolate', port:'C', handle:'T1'}, {op:'identify', handle:'T1', as:'cystic-duct'}, {op:'safety-pause', view:'cvs', claims:{…}}, " +
    "{op:'clip', port:'C', handle:'T1', count:2}, {op:'divide', port:'C', handle:'T1'}, {op:'image', modality:'ioc', port:'C'}, " +
    "{op:'bailout', strategy:'subtotal-fenestrating'}, {op:'inspect'}, {op:'recognise', injury:'bleeding'}, {op:'bag'|'extract', port}, {op:'close'}. " +
    "Directions are in the patient's terms (patient-left is the patient's left). Look with observe_field first. Steps: " +
    OP_NAMES.join(", ") +
    ".",
  inputSchema: {
    type: "object",
    properties: {
      op: { type: "string", enum: OP_NAMES },
      plan: { type: "string" },
      pressure: { type: "number" },
      port: { type: "string" },
      instrument: { type: "string" },
      structure: { type: "string" },
      direction: { type: "array", items: { type: "string" } },
      force: { type: "string", enum: ["gentle", "firm", "excessive"] },
      region: { type: "string" },
      energy: { type: "boolean" },
      handle: { type: "string" },
      as: { type: "string" },
      view: { type: "string" },
      claims: { type: "object", additionalProperties: { type: "boolean" } },
      count: { type: "integer", minimum: 1, maximum: 3 },
      modality: { type: "string", enum: ["ioc", "lap-us"] },
      injury: { type: "string" },
      strategy: { type: "string" },
    },
    required: ["op"],
    additionalProperties: false,
  },
  readOnly: false,
  sideEffect: "patient",
  scope: "full",
  risk: opRisk,
  summarize: (args, ctx) => rt(ctx.locale, "sum.operate", { op: opLabel(opFrom(args)) }),
  specifier: (args) => opLabel(opFrom(args)),
  async run(args, ctx) {
    const L = ctx.locale;
    const parsed = ProcedureOpSchema.safeParse(opFrom(args));
    if (!parsed.success) return { ok: false, output: rt(L, "op.invalid", { message: parsed.error.issues[0]?.message ?? "" }) };
    const op: ProcedureOp = parsed.data;
    const result = ctx.dispatch({ type: "operate", op, by: actorFor(ctx) });
    if (result.rejected) return rejectedOutput(L, result);
    const step = result.events.find((e) => e.type === "procedure.step");
    const signals = step && step.type === "procedure.step" ? step.signals : [];
    const lines = [rt(L, "op.done", { op: op.op })];
    if (signals.length) lines.push(rt(L, "op.signals", { signals: joinList(L, signals.map((x) => procedureLabel(L, x))) }));
    return { ok: true, output: lines.join("\n"), data: { op: op.op, signals } };
  },
};

/** The operative-field tools (registered for every case; they answer "no operation" elsewhere). */
export function procedureTools(): ToolDefinition<ToolArgs>[] {
  return [observe, operateTool];
}
