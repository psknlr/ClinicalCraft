/**
 * The prescription tools (docs/PRESCRIPTIONS.md): **sign** a formulation as the next version (`prescribe`), **read**
 * the record — versions, the dispensary's review, what was supplied (`read_prescription`, which also records that the
 * prescriber has read the latest review) — and the **dispensing steps** at the device (`dispense`:
 * select the version, pick, check the label, supply), which the dispensary's own staff take with their bodies and a
 * learner only where the case makes the learner the dispenser. Every step is the engine's `prescription` action:
 * the tools never decide what a review finds or what a supply got wrong.
 */
import {
  currentVersion,
  formulationOf,
  medicinalProduct,
  openPreparation,
  preparationDiscrepancies,
  prescriptionDef,
  prescriptionVersions,
  t,
  unreadVersion,
  versionStatus,
  type CaseDefinition,
  type DispensingStep,
  type FacilityDefinition,
  type Formulation,
  type PrescriptionDefinition,
  type PrescriptionOp,
  type PrescriptionRefusal,
  type PrescriptionVersion,
  type SessionState,
} from "@clinicalcraft/core";
import { DISPENSING_STEPS } from "@clinicalcraft/core";
import { isZh, rt, type RuntimeKey } from "../session/i18n.js";
import { actorFor, rejectedOutput, strArg, type ToolArgs } from "./clinical-resolve.js";
import { clockTime } from "./format.js";
import type { ToolContext, ToolDefinition, ToolOutput } from "./types.js";

const sep = (L: string) => (isZh(L) ? "；" : "; ");
const lang = (L: string): "en" | "zh-CN" => (isZh(L) ? "zh-CN" : "en");

/** Who a record names, as the facility names them (a staff id), else as written. */
function person(facility: FacilityDefinition | null | undefined, id: string, L: string): string {
  if (id === "learner" || id === "clinician") return rt(L, "speaker.clinician");
  const staff = facility?.staff.find((x) => x.id === id);
  return staff ? t(staff.name, L) : id;
}

const formulationChoices = (def: PrescriptionDefinition, L: string) => def.formulations.map((f) => `${t(f.name, L)} [${f.id}]`).join(sep(L));
const prescriptionChoices = (c: CaseDefinition, L: string) => (c.prescriptions ?? []).map((p) => `${t(p.name, L)} [${p.id}]`).join(sep(L)) || "—";

/** The case's prescription a call names (`prescription`), or its only one. */
function resolveDef(c: CaseDefinition, args: ToolArgs): PrescriptionDefinition | null {
  const id = strArg(args, "prescription");
  const defs = c.prescriptions ?? [];
  if (id) return prescriptionDef(c, id) ?? defs.find((d) => d.id.toLowerCase() === id.toLowerCase()) ?? null;
  return defs.length === 1 ? defs[0]! : null;
}

/**
 * The formulation a request names — its id, its name or an alias in either language — in the named prescription, or
 * in any of the case's: one match, several (named, nothing signed) or none.
 */
export function resolveFormulation(c: CaseDefinition, query: string, prescription?: PrescriptionDefinition | null): { def: PrescriptionDefinition; formulation: Formulation }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const defs = prescription ? [prescription] : (c.prescriptions ?? []);
  const all = defs.flatMap((def) => def.formulations.map((formulation) => ({ def, formulation })));
  const exact = all.filter((x) => x.formulation.id.toLowerCase() === q);
  if (exact.length) return exact;
  const names = (f: Formulation) => [...Object.values(typeof f.name === "string" ? { x: f.name } : f.name), ...(Array.isArray(f.aliases) ? f.aliases : Object.values(f.aliases ?? {}).flat())].map((x) => String(x).toLowerCase());
  const same = all.filter((x) => names(x.formulation).some((n) => n === q));
  if (same.length) return same;
  return all.filter((x) => names(x.formulation).some((n) => n.length >= 2 && (n.includes(q) || q.includes(n))));
}

const productName = (def: PrescriptionDefinition, id: string, L: string) => t(medicinalProduct(def, id)?.name ?? id, L);

function linesText(def: PrescriptionDefinition, f: Formulation, L: string): string {
  return f.lines.map((l) => rt(L, "rx.line", { name: productName(def, l.product, L), dose: l.dose, unit: l.unit })).join(sep(L));
}

/** A formulation as a prescriber reads it before signing: its lines, then how it is taken and for how long. */
export function formulationText(def: PrescriptionDefinition, f: Formulation, L: string): string {
  return [rt(L, "rx.lines", { lines: linesText(def, f, L) }), rt(L, "rx.take", { frequency: t(f.frequency, L), days: f.days })].join("\n");
}

/** Every version of a prescription in one line each (what it signs, where it stands) — nothing of a review or a supply. */
export function prescriptionHeads(c: CaseDefinition, s: SessionState, prescription: string, L: string): string[] {
  const def = prescriptionDef(c, prescription);
  if (!def) return [];
  return prescriptionVersions(s, def.id).flatMap((v) => versionLines(c, s, def, v, L).slice(0, 1));
}

function refusalReason(def: PrescriptionDefinition, refusal: Pick<PrescriptionRefusal, "code" | "formulation" | "version">, L: string): string {
  if (refusal.code === "not-signable") {
    const f = refusal.formulation ? formulationOf(def, refusal.formulation) : undefined;
    return f?.refusal ? t(f.refusal, L) : rt(L, "rx.refused.generic", { name: f ? t(f.name, L) : (refusal.formulation ?? "") });
  }
  return rt(L, `rx.code.${refusal.code}` as RuntimeKey, { n: refusal.version ?? "" });
}

/** One version of a prescription, in words: what it is, where it stands, its review, what was supplied. */
function versionLines(c: CaseDefinition, s: SessionState, def: PrescriptionDefinition, v: PrescriptionVersion, L: string, facility?: FacilityDefinition | null): string[] {
  const f = formulationOf(def, v.formulation);
  if (!f) return [];
  const status = versionStatus(s, v);
  const lines = [rt(L, "rx.version", { prescription: t(def.name, L), n: v.n, name: t(f.name, L), status: rt(L, `rx.status.${status}` as RuntimeKey, { by: v.supersededBy ?? "" }) })];
  lines.push(rt(L, "rx.lines", { lines: linesText(def, f, L) }), rt(L, "rx.take", { frequency: t(f.frequency, L), days: f.days }));
  const review = v.reviews.at(-1);
  if (review) {
    const who = person(facility, review.by, L);
    const at = clockTime(c, review.at, L);
    if (review.findings.length) {
      lines.push(rt(L, "rx.review.query", { who, at }), ...review.findings.map((x) => rt(L, "rx.review.finding", { text: x.text[lang(L)] })));
    } else lines.push(rt(L, "rx.review.confirmed", { who, at }));
    if (!(v.acknowledged && v.acknowledged.seq > review.seq)) lines.push(rt(L, "rx.review.unread"));
  }
  for (const d of (s.prescriptions?.dispensings ?? []).filter((x) => x.prescription === def.id && x.version === v.n)) {
    const supplied = d.lines.map((x) => rt(L, "rx.supply.line", { name: productName(def, x.product, L), quantity: x.quantity, unit: x.unit, batch: x.batch ? rt(L, "rx.supply.batch", { batch: x.batch }) : "" })).join(sep(L));
    const device = d.device ? facility?.placements.find((p) => `eq:${p.id}` === d.device || p.id === d.device) : undefined;
    lines.push(rt(L, "rx.supply", { at: clockTime(c, d.at, L), who: person(facility, d.by, L), device: device?.label ? rt(L, "rx.supply.device", { device: t(device.label, L) }) : "", lines: supplied }));
    lines.push(rt(L, "rx.supply.label", { frequency: d.label.frequency[lang(L)], dosesPerDay: d.label.dosesPerDay, days: d.label.days, checked: rt(L, d.labelChecked ? "rx.supply.checked" : "rx.supply.unchecked") }));
  }
  return lines;
}

/**
 * A prescription's record in words: every version (the current one last), then the attempts that were refused. With
 * `supply`, how each supply differs from its version is shown too — what a check of the supply against the
 * prescription finds (the dispensing record read with the version beside it).
 */
export function prescriptionText(c: CaseDefinition, s: SessionState, prescription: string, L: string, facility?: FacilityDefinition | null, supply = true): string | null {
  const def = prescriptionDef(c, prescription);
  if (!def) return null;
  const versions = prescriptionVersions(s, def.id);
  const lines: string[] = [];
  if (!versions.length) lines.push(rt(L, "rx.nothingSigned", { prescription: t(def.name, L), choices: formulationChoices(def, L) }));
  for (const v of versions) {
    lines.push(...versionLines(c, s, def, v, L, facility));
    if (!supply) continue;
    for (const d of (s.prescriptions?.dispensings ?? []).filter((x) => x.prescription === def.id && x.version === v.n)) {
      lines.push(...d.discrepancies.map((x) => rt(L, "rx.supply.discrepancy", { text: x.detail[lang(L)] })));
    }
  }
  const refusals = (s.prescriptions?.refusals ?? []).filter((x) => x.prescription === def.id);
  if (refusals.length) {
    const what = (x: PrescriptionRefusal) => (x.op === "submit" ? t(formulationOf(def, x.formulation ?? "")?.name ?? x.formulation ?? "", L) : String(x.version ?? ""));
    lines.push(rt(L, "rx.refusals", { list: refusals.map((x) => `${rt(L, `rx.refusal.${x.op}` as RuntimeKey, { what: what(x) })} — ${refusalReason(def, x, L)}`).join(sep(L)) }));
  }
  return lines.join("\n");
}

/** The status lines of the encounter's prescriptions (`case_status`): each prescription's current version. */
export function prescriptionLines(c: CaseDefinition, s: SessionState, L: string, facility?: FacilityDefinition | null): string[] {
  const defs = (c.prescriptions ?? []).filter((def) => prescriptionVersions(s, def.id).length > 0);
  if (!defs.length) return [];
  return [rt(L, "rx.header"), ...defs.flatMap((def) => versionLines(c, s, def, currentVersion(s, def.id)!, L, facility).slice(0, 1).map((x) => `  ${x}`))];
}

const prescribe: ToolDefinition<ToolArgs> = {
  name: "prescribe",
  description:
    "Sign a prescription: one of the case's formulations becomes the next version of its prescription and goes to the dispensary for review. A revision is a new version (it supersedes the one before); only the current version, once the dispensary has confirmed it, is supplied. " +
    "Name the formulation by id or in words. A formulation that may not be signed yet is refused, and the refusal is recorded.",
  inputSchema: {
    type: "object",
    properties: {
      formulation: { type: "string", description: "The formulation's id (read_prescription lists them)." },
      query: { type: "string", maxLength: 300, description: "Free text when the id is unknown." },
      prescription: { type: "string", description: "The prescription's id, when the case has more than one." },
      request_key: { type: "string", maxLength: 120, description: "Your request's key: the same key again is the same version (a retry)." },
    },
    additionalProperties: false,
  },
  readOnly: false,
  sideEffect: "record",
  scope: "full",
  risk: () => "low",
  summarize: (args, ctx) => {
    const hit = resolveFormulation(ctx.caseDef, strArg(args, "formulation") || strArg(args, "query"), resolveDef(ctx.caseDef, args));
    return rt(ctx.locale, "sum.prescribe", { name: hit.length === 1 ? t(hit[0]!.formulation.name, ctx.locale) : strArg(args, "formulation") || strArg(args, "query") });
  },
  specifier: (args, ctx) => {
    const hit = resolveFormulation(ctx.caseDef, strArg(args, "formulation") || strArg(args, "query"), resolveDef(ctx.caseDef, args));
    return hit.length === 1 ? hit[0]!.formulation.id : strArg(args, "formulation") || strArg(args, "query");
  },
  async run(args, ctx): Promise<ToolOutput> {
    const c = ctx.caseDef;
    const L = ctx.locale;
    if (!(c.prescriptions ?? []).length) return { ok: false, output: rt(L, "rx.none") };
    const named = strArg(args, "prescription");
    const scope = resolveDef(c, args);
    if (named && !scope) return { ok: false, output: rt(L, "rx.unknownPrescription", { query: named, choices: prescriptionChoices(c, L) }) };
    const query = strArg(args, "formulation") || strArg(args, "query");
    const hits = resolveFormulation(c, query, scope);
    const choices = (scope ? [scope] : (c.prescriptions ?? [])).map((d) => formulationChoices(d, L)).join(sep(L));
    if (!hits.length) return { ok: false, output: rt(L, "rx.unknown", { query, choices }), data: { unresolved: "none", query } };
    if (hits.length > 1) return { ok: false, output: rt(L, "rx.ambiguous", { query, choices: hits.map((x) => `${t(x.formulation.name, L)} [${x.formulation.id}]`).join(sep(L)) }), data: { unresolved: "ambiguous", candidates: hits.map((x) => x.formulation.id) } };
    const { def, formulation } = hits[0]!;
    const before = ctx.state();
    const n = prescriptionVersions(before, def.id).length + 1;
    const key = strArg(args, "request_key") || `${def.id}:${formulation.id}:${n}`;
    const result = ctx.dispatch({ type: "prescription", prescription: { op: "submit", prescription: def.id, formulation: formulation.id, key, by: ctx.agent === "learner" || ctx.agent === "clinician" ? "learner" : String(ctx.agent) }, by: actorFor(ctx) });
    if (result.rejected) return rejectedOutput(L, result, result.rejected.message);
    const s = ctx.state();
    const name = t(formulation.name, L);
    const refused = s.prescriptions?.refusals.at(-1);
    if (refused && refused.seq === s.seq && refused.op === "submit") {
      const reason = refusalReason(def, refused, L);
      return { ok: false, output: rt(L, "rx.refused", { reason }), data: { refused, message: reason } };
    }
    const version = (s.prescriptions?.versions ?? []).find((v) => v.key === key);
    if (!version) return { ok: false, output: rt(L, "rx.read.none", { prescription: t(def.name, L) }) };
    if ((before.prescriptions?.versions ?? []).some((v) => v.key === key)) return { ok: true, output: rt(L, "rx.again", { name, n: version.n, prescription: t(def.name, L) }), data: { version } };
    const superseded = version.n > 1 ? rt(L, "rx.signed.superseded", { n: version.n - 1 }) : "";
    const dispensary = person(ctx.facility, dispensaryStaff(def, ctx.facility) ?? "", L) || rt(L, "rx.notify.title");
    return { ok: true, output: rt(L, "rx.signed", { name, n: version.n, prescription: t(def.name, L), superseded, dispensary }), data: { version } };
  },
};

/** The staff member of a prescription's dispensary: the staff id it names, else the first of the role it names (null: nobody). */
export function dispensaryStaff(def: PrescriptionDefinition, facility: FacilityDefinition | null | undefined): string | null {
  const staff = facility?.staff ?? [];
  return (staff.find((x) => x.id === def.dispensary) ?? staff.find((x) => x.role === def.dispensary))?.id ?? null;
}

const readPrescription: ToolDefinition<ToolArgs> = {
  name: "read_prescription",
  description:
    "Read a prescription's record: its versions and which one is current, each version's lines (product, daily dose, unit), the dispensary's review — a query to resolve, or confirmed — what was supplied with its label and how the supply differs from its version, and the attempts that were refused. Reading it also records that you have read the dispensary's latest review and the record of what was supplied.",
  inputSchema: { type: "object", properties: { prescription: { type: "string", description: "The prescription's id, when the case has more than one." } }, additionalProperties: false },
  readOnly: false,
  sideEffect: "record",
  scope: "workup",
  risk: () => "none",
  summarize: (args, ctx) => rt(ctx.locale, "sum.read_prescription", { name: strArg(args, "prescription") || t(resolveDef(ctx.caseDef, args)?.name ?? "", ctx.locale) || "*" }),
  specifier: (args) => strArg(args, "prescription"),
  async run(args, ctx) {
    const c = ctx.caseDef;
    const L = ctx.locale;
    const defs = c.prescriptions ?? [];
    if (!defs.length) return { ok: false, output: rt(L, "rx.none") };
    const named = strArg(args, "prescription");
    const one = resolveDef(c, args);
    if (named && !one) return { ok: false, output: rt(L, "rx.unknownPrescription", { query: named, choices: prescriptionChoices(c, L) }) };
    const wanted = one ? [one] : defs;
    // the prescriber has read the record as it stands — the current version's latest review, every supply made so far
    // (the dispensary's own staff read nothing here)
    if (ctx.agent === "learner" || ctx.agent === "clinician") {
      for (const def of wanted) {
        const v = unreadVersion(ctx.state(), def.id);
        if (v) ctx.dispatch({ type: "prescription", prescription: { op: "acknowledge", prescription: def.id, version: v.n, by: "learner" }, by: actorFor(ctx) });
      }
    }
    const s = ctx.state();
    const text = wanted.map((def) => prescriptionText(c, s, def.id, L, ctx.facility)).filter(Boolean).join("\n");
    return { ok: true, output: text, data: { prescriptions: wanted.map((def) => ({ id: def.id, versions: prescriptionVersions(s, def.id), dispensings: (s.prescriptions?.dispensings ?? []).filter((d) => d.prescription === def.id) })) } };
  },
};

const isStep = (x: string): x is DispensingStep => (DISPENSING_STEPS as readonly string[]).includes(x);

/**
 * The engine op of one dispensing step, from a call's arguments (`version`, `line`, `product`, `request_key`,
 * `device`) and who takes it — the same for the tool and for the dispensary's own staff at the device.
 */
export function dispensingOp(def: PrescriptionDefinition, s: SessionState, step: DispensingStep, args: ToolArgs, by: string): PrescriptionOp {
  const version = Number.isInteger(args.version) ? (args.version as number) : undefined;
  const device = strArg(args, "device") || undefined;
  if (step === "prepare") return { op: "prepare", prescription: def.id, by, ...(version ? { version } : {}), ...(device ? { device } : {}) };
  if (step === "pick") return { op: "pick", prescription: def.id, by, ...(strArg(args, "line") ? { line: strArg(args, "line") } : {}), ...(strArg(args, "product") ? { product: strArg(args, "product") } : {}) };
  if (step === "check-label") return { op: "check-label", prescription: def.id, by };
  const target = version ?? openPreparation(s, def.id)?.version ?? currentVersion(s, def.id)?.n ?? 0;
  return { op: "dispense", prescription: def.id, by, key: strArg(args, "request_key") || `${def.id}:supply:${target}:${by}`, ...(version ? { version } : {}), ...(device ? { device } : {}) };
}

/** The prescription a dispensing step is for: the one named, the one being put together, else the one waiting to be supplied. */
export function dispensingTarget(c: CaseDefinition, s: SessionState, args: ToolArgs): PrescriptionDefinition | null {
  const defs = c.prescriptions ?? [];
  return resolveDef(c, args) ?? defs.find((d) => openPreparation(s, d.id)) ?? defs.find((d) => currentVersion(s, d.id) && versionStatus(s, currentVersion(s, d.id)!) === "confirmed") ?? null;
}

/** What a dispensing step did, in words — from the record as it stands after it (`before`: the state it was taken in). */
export function dispensingOutput(c: CaseDefinition, def: PrescriptionDefinition, step: DispensingStep, args: ToolArgs, before: SessionState, s: SessionState, L: string): ToolOutput {
  const refused = s.prescriptions?.refusals.at(-1);
  if (refused && refused.seq === s.seq && s !== before) {
    const reason = refusalReason(def, refused, L);
    return { ok: false, output: rt(L, "rx.step.refused", { reason }), data: { refused, rejected: { code: refused.code }, message: reason } };
  }
  const prescription = t(def.name, L);
  if (step === "prepare") {
    const prep = openPreparation(s, def.id);
    const v = prep ? prescriptionVersions(s, def.id).find((x) => x.n === prep.version) : undefined;
    const f = v ? formulationOf(def, v.formulation) : undefined;
    return { ok: true, output: rt(L, "rx.step.prepared", { n: prep?.version ?? "", prescription, name: f ? t(f.name, L) : "", lines: f ? linesText(def, f, L) : "" }), data: { preparation: prep ?? null } };
  }
  if (step === "pick") {
    const line = strArg(args, "line");
    if (!line) return { ok: true, output: rt(L, s === before ? "rx.step.nothingToPick" : "rx.step.pickedAll"), data: { preparation: openPreparation(s, def.id) ?? null } };
    return { ok: true, output: rt(L, "rx.step.picked", { product: productName(def, strArg(args, "product") || line, L), line: productName(def, line, L) }), data: { preparation: openPreparation(s, def.id) ?? null } };
  }
  if (step === "check-label") {
    const prep = openPreparation(s, def.id);
    const differs = preparationDiscrepancies(c, s, def.id);
    const output = differs.length ? rt(L, "rx.step.label.differs", { n: prep?.version ?? "", list: differs.map((x) => x.detail[lang(L)]).join(" ") }) : rt(L, "rx.step.label.matches", { n: prep?.version ?? "" });
    return { ok: true, output, data: { matches: differs.length === 0, discrepancies: differs } };
  }
  if (s === before) return { ok: true, output: rt(L, "rx.step.again"), data: { dispensing: s.prescriptions?.dispensings.at(-1) ?? null } };
  const d = s.prescriptions!.dispensings.at(-1)!;
  const supplied = d.lines.map((x) => rt(L, "rx.supply.line", { name: productName(def, x.product, L), quantity: x.quantity, unit: x.unit, batch: x.batch ? rt(L, "rx.supply.batch", { batch: x.batch }) : "" })).join(sep(L));
  return { ok: true, output: rt(L, "rx.step.dispensed", { n: d.version, prescription, lines: supplied || "—" }), data: { dispensing: d } };
}

const dispensePrescription: ToolDefinition<ToolArgs> = {
  name: "dispense",
  description:
    "A dispensing step at the dispensing device, for whoever works it — the dispensary's staff, or you where the case makes you the dispenser: `prepare` (select the version: only the current, confirmed one), `pick` (a product for a line: name `line` and the `product` you pick; no line: every remaining line as prescribed), `check-label` (the label and what is picked against the version) and `dispense` (complete the supply). Every refused step and every difference between the supply and its version is recorded.",
  inputSchema: {
    type: "object",
    properties: {
      step: { type: "string", enum: [...DISPENSING_STEPS] },
      prescription: { type: "string", description: "The prescription's id, when the case has more than one." },
      version: { type: "integer", minimum: 1, description: "prepare / dispense: the version (default: the current one)." },
      line: { type: "string", description: "pick: the line, by the product it prescribes." },
      product: { type: "string", description: "pick: the product taken from the shelf (default: the line's own)." },
      request_key: { type: "string", maxLength: 120, description: "dispense: your request's key (the same key again is the same supply)." },
      device: { type: "string", maxLength: 120, description: "The device the step is taken at (set by the device's own operation)." },
    },
    required: ["step"],
    additionalProperties: false,
  },
  readOnly: false,
  sideEffect: "record",
  scope: "full",
  risk: () => "low",
  summarize: (args, ctx) => rt(ctx.locale, "sum.dispense", { step: strArg(args, "step"), name: t(resolveDef(ctx.caseDef, args)?.name ?? "", ctx.locale) || strArg(args, "prescription") }),
  specifier: (args) => strArg(args, "step"),
  precheck(args, ctx) {
    // a prescriber does not work the dispensary's device: refused before anyone is asked to approve it
    const def = resolveDef(ctx.caseDef, args);
    if (def && def.dispensedBy === "staff" && !ctx.actorId?.startsWith("staff:") && ctx.agent !== "pharmacist") return { ok: false, output: rt(ctx.locale, "rx.dispense.notYours", { prescription: t(def.name, ctx.locale) }), data: { code: "NOT_AUTHORIZED" } };
    return null;
  },
  async run(args, ctx): Promise<ToolOutput> {
    const c = ctx.caseDef;
    const L = ctx.locale;
    if (!(c.prescriptions ?? []).length) return { ok: false, output: rt(L, "rx.none") };
    const def = dispensingTarget(c, ctx.state(), args);
    if (!def) return { ok: false, output: rt(L, "rx.unknownPrescription", { query: strArg(args, "prescription") || "—", choices: prescriptionChoices(c, L) }) };
    const step = strArg(args, "step");
    if (!isStep(step)) return { ok: false, output: rt(L, "rx.dispense.unknownStep", { step }) };
    const staffBody = ctx.actorId?.startsWith("staff:") ? ctx.actorId.slice("staff:".length) : null;
    if (def.dispensedBy === "staff" && !staffBody && ctx.agent !== "pharmacist") return { ok: false, output: rt(L, "rx.dispense.notYours", { prescription: t(def.name, L) }), data: { code: "NOT_AUTHORIZED" } };
    const by = staffBody ?? (ctx.agent === "learner" || ctx.agent === "clinician" ? "learner" : String(ctx.agent));
    const before = ctx.state();
    const result = ctx.dispatch({ type: "prescription", prescription: dispensingOp(def, before, step, args, by), by: actorFor(ctx) });
    if (result.rejected) return rejectedOutput(L, result, result.rejected.message);
    return dispensingOutput(c, def, step, args, before, ctx.state(), L);
  },
};

/** The prescription tools of a case with prescriptions (registered always; hidden without any). */
export function prescriptionTools(): ToolDefinition<ToolArgs>[] {
  return [prescribe, readPrescription, dispensePrescription];
}

/** Names of the prescription tools. */
export const PRESCRIPTION_TOOL_NAMES: readonly string[] = ["prescribe", "read_prescription", "dispense"];
