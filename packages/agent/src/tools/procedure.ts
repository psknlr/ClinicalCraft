/**
 * Operative-field tools (docs/PROCEDURE.md §7): `observe_field` shows what a surgeon at the laparoscopic
 * screen could see — ducts and vessels as handles, never their names; `operate` carries out one step
 * through the session (the only way to change the field). No safety-view verdict, hidden injury,
 * unsafe-act record or score reaches the agent: those are the debrief's.
 *
 * Who takes a step is the acting body's member (core `refOfBody`; a body-less call — the learner, the CLI, MCP, the
 * external clinician — is the learner's body): the operator, or while the learner holds a place in the team that
 * place's member. A step outside the body's controls is refused before the approval gate (`placeRefusal`), and a
 * refusal of the field keeps the engine's English message word for word after the reason said in the caller's
 * language (`reasonText`).
 */
import { LEARNER_BODY, observeField, portReport, procedureFor, procedureStateOf, ProcedureOpSchema, refOfBody, t, type FieldView, type ProcedureOp } from "@clinicalcraft/core";
import { joinList, rt } from "../session/i18n.js";
import { procedureLabel } from "../session/i18n-procedure.js";
import { actorFor, rejectedOutput, type ToolArgs } from "./clinical-resolve.js";
import { visiblePhases } from "./clinical.js";
import { fieldPlaceLines, heldByText, placeRefusal, reasonText } from "./field-words.js";
import { equipmentLines, operationPrerequisiteLines, operationUnderWay } from "./requirements.js";
import type { ToolContext, ToolDefinition } from "./types.js";

function fieldText(ctx: ToolContext): string {
  const c = ctx.caseDef;
  const L = ctx.locale;
  const state = ctx.state();
  const def = procedureFor(c, state);
  if (!def) return rt(L, "field.none");
  const s = procedureStateOf(state);
  const v: FieldView = observeField(def, s);
  const lab = (x: string) => procedureLabel(L, x);
  if (!v.plan) {
    const plans = def.portPlans.map((p) => {
      const r = portReport(def, p);
      return `${p.id} — ${t(p.name, L)} [${rt(L, "field.ports.report", { plan: p.id, side: lab(p.surgeonSide), angle: r.manipulationAngle == null ? "—" : `${Math.round(r.manipulationAngle)}°`, warnings: r.warnings.length ? r.warnings.join(", ") : "—" })}]`;
    });
    return [rt(L, "field.notStarted", { plans: plans.join("; ") }), ...equipmentLines(state, L)].join("\n");
  }
  const lines = [
    rt(L, "field.plan", {
      plan: v.plan,
      pressure: v.insufflated ? `${v.pressure} mmHg` : lab("off"),
      scope: v.ports.some((p) => p.instrument === "laparoscope") ? lab("in") : lab("out"),
    }),
    ...v.ports.map((p) => {
      const line = rt(L, "field.port", { port: p.port, role: lab(p.role), size: p.sizeMm, hand: p.hand ? `, ${lab(p.hand)}` : "", instrument: p.instrument ?? lab("empty") });
      // a colleague holds it (the assistant keeping traction): named, as the operator sees them at the table — the
      // learner holding it in a place: "held by you"
      return p.holder ? line + heldByText(ctx, p.holder) : line;
    }),
    // the acting body's place and controls (not the operator's), where the camera looks and who holds it, the passes waiting
    ...fieldPlaceLines(ctx, v),
  ];
  if (!v.inView) lines.push(rt(L, !v.supply.image ? "field.noImage" : "field.notInView"));
  if (!v.supply.gas) lines.push(rt(L, "field.noGas"));
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
    for (const r of v.regions) lines.push(rt(L, "field.region", { name: `${t(r.name, L)} (${r.id})`, dissection: lab(r.dissection), exposure: lab(r.exposure), finding: r.finding ? ` — ${t(r.finding, L)}` : "" }));
    for (const r of v.retractions) lines.push(rt(L, "field.retraction", { structure: r.structure, port: r.port, direction: r.direction.join(" + "), force: lab(r.force) }));
  }
  if (v.findings.length) lines.push(rt(L, "field.findings", { findings: joinList(L, v.findings.map(lab)) }));
  if (v.inView && v.names.length) lines.push(rt(L, "field.names", { names: v.names.join(", ") }));
  // the safety views to pause on, by criterion id (a counting criterion asks how many structures are seen entering)
  for (const view of def.views) {
    const criteria = view.criteria.map((c) => ("onlyEntering" in c.test && c.test.count != null ? rt(L, "field.view.count", { id: c.id, name: t(c.name, L) }) : `${c.id} (${t(c.name, L)})`));
    lines.push(rt(L, "field.view", { view: view.id, name: t(view.name, L), criteria: criteria.join("; ") }));
  }
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
    // the picture is what the equipment supplies now
    ctx.syncProcedureSupply?.();
    const c = ctx.caseDef;
    const s = ctx.state();
    // before the operation is under way there is no field to look at: say what still opens it
    if (procedureFor(c, s) && !operationUnderWay(c, s) && !s.procedure) {
      const L = ctx.locale;
      return { ok: false, output: [rt(L, "status.op.locked"), ...operationPrerequisiteLines(c, s, L, visiblePhases(c, s)), ...equipmentLines(s, L)].join("\n"), data: { underWay: false } };
    }
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
    "{op:'isolate', port:'C', handle:'T1'}, {op:'identify', handle:'T1', as:'cystic-duct'} (as:'uncertain' when you cannot tell), " +
    "{op:'safety-pause', view:'cvs', claims:{criterion: true|false, or for a counting criterion the number of structures you see}}, " +
    "{op:'clip', port:'C', handle:'T1', count:2}, {op:'divide', port:'C', handle:'T1'}, {op:'image', modality:'ioc', port:'C'}, " +
    "{op:'bailout', strategy:'subtotal-fenestrating'} (changing a committed subtotal technique: revise:true), {op:'hand-over', port:'B'} (take back what a colleague holds; to:'<staff id>' hands it to that colleague), {op:'inspect'}, {op:'recognise', injury:'bleeding'}, {op:'bag'|'extract', port}, {op:'close'}. " +
    "The camera: {op:'aim', port:'A', at:'<region>'} (no at: the whole field), {op:'zoom', port:'A', level:'close'|'wide'} (close needs an aim) — the camera holder's, or yours while nobody holds the camera port. " +
    "{op:'pass', instrument:'maryland', to:'<staff id>'} puts an instrument from the table into the hand of the one who will insert it (a scrub nurse's step; no to: the operator). " +
    "You work the field as your place in the team: the operating surgeon does every step; holding another place, only what your controls cover (observe_field says which). " +
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
      // per criterion: true/false, or for a counting criterion the number of structures seen entering
      claims: { type: "object", additionalProperties: { anyOf: [{ type: "boolean" }, { type: "integer", minimum: 0, maximum: 9 }] } },
      count: { type: "integer", minimum: 1, maximum: 3 },
      modality: { type: "string", enum: ["ioc", "lap-us"] },
      injury: { type: "string" },
      strategy: { type: "string" },
      // bailout: an explicit change of a committed subtotal technique
      revise: { type: "boolean" },
      // hand-over: the colleague who takes the port's instrument; pass: the one who will insert it (a staff id); absent: the operator
      to: { type: "string", maxLength: 80 },
      // aim: the region the camera looks at (absent: the whole field)
      at: { type: "string" },
      // zoom: how close the camera looks
      level: { type: "string", enum: ["wide", "close"] },
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
  // a step outside the acting body's controls is refused before anyone is asked to approve it
  precheck(args, ctx) {
    const parsed = ProcedureOpSchema.safeParse(opFrom(args));
    return parsed.success ? placeRefusal(ctx, parsed.data) : null;
  },
  async run(args, ctx) {
    const L = ctx.locale;
    const parsed = ProcedureOpSchema.safeParse(opFrom(args));
    if (!parsed.success) return { ok: false, output: rt(L, "op.invalid", { message: parsed.error.issues[0]?.message ?? "" }) };
    const op: ProcedureOp = parsed.data;
    // whose step: the acting body's member — a colleague's body (an assistant at the table) their staff id, the
    // learner's body (a body-less call too) the learner's place's member, the operator no actor
    const refused = placeRefusal(ctx, op);
    if (refused) return refused;
    const actor = refOfBody(ctx.caseDef, ctx.state(), ctx.actorId ?? LEARNER_BODY) ?? undefined;
    const result = ctx.dispatch({ type: "operate", op, by: actorFor(ctx), ...(actor ? { actor } : {}), ...(ctx.stepRef ? { ref: ctx.stepRef } : {}) });
    if (result.rejected) {
      // the engine's own reason ("Insufflate before inserting instruments."), word for word after the reason said in
      // the caller's language, and before the operation is under way, what still opens it — never a bare "not available"
      const c = ctx.caseDef;
      const s = ctx.state();
      const open = result.rejected.code === "phase-locked" ? operationPrerequisiteLines(c, s, L, visiblePhases(c, s)) : [];
      const out = rejectedOutput(L, result, result.rejected.message, reasonText(ctx, result.rejected.reason));
      return open.length > 0 ? { ...out, output: [out.output, rt(L, "intervene.opLocked"), ...open].join("\n") } : out;
    }
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
