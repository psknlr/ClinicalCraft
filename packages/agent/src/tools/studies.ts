/**
 * The chart's two commands for investigations (docs/STUDIES.md): **retrieve an existing report** (`retrieve_report`:
 * the published case's record — or that it has none) and **order a new investigation** (`order_study`: one of the
 * case's test profiles, acquired and reported by the simulated hospital); and `read_study`, the released report of a
 * new investigation, labelled simulated. An operative study is never ordered here: it is acquired at the table.
 */
import { OPERATIVE_IMAGING, operativeImagingAsked, recordAvailability, studyOrderBlock, studyProfile, t, type CaseDefinition, type FacilityDefinition, type SessionState, type StudyProfile } from "@clinicalcraft/core";
import { rt } from "../session/i18n.js";
import { resolveStudy } from "../session/studies.js";
import { actorFor, rejectedOutput, strArg, type ToolArgs } from "./clinical-resolve.js";
import { clockTime, formatResult, investigationName } from "./format.js";
import type { ToolContext, ToolDefinition, ToolOutput } from "./types.js";

const label = (key: "simulated" | "source" | "unavailable" | "notYet", L: string) => rt(L, `study.label.${key}`);
const choices = (c: CaseDefinition, L: string) => (c.studies ?? []).map((p) => `${t(p.name, L)} [${p.code}]`).join(L === "zh-CN" ? "；" : "; ") || "—";

/** The device or room that provides a profile, as the facility names it (for the order's next step). */
function providerName(p: StudyProfile, ctx: Pick<ToolContext, "catalogs" | "locale" | "facility">): string {
  for (const cat of ctx.catalogs)
    for (const e of cat.equipment) {
      if (!p.requires.length || !p.requires.every((r) => (e.capabilities ?? []).includes(r))) continue;
      // the facility's own name for it ("Mobile ECG machine"), else the type's
      const placed = ctx.facility?.placements.find((x) => x.type === e.id && x.label);
      return t(placed?.label ?? e.name, ctx.locale).replace(/\s*[（(][^）)]*[）)]\s*$/u, "");
    }
  return p.requires.join(", ");
}

/** Does the facility have a device providing every capability the profile requires? (Null without a facility.) */
function facilityProvides(p: StudyProfile, ctx: Pick<ToolContext, "facility" | "catalogs">): boolean | null {
  if (!ctx.facility) return null;
  if (!p.requires.length) return true;
  const types = new Set(ctx.catalogs.flatMap((cat) => cat.equipment.filter((e) => p.requires.every((r) => (e.capabilities ?? []).includes(r))).map((e) => e.id)));
  return ctx.facility.placements.some((x) => types.has(x.type));
}

function who(c: CaseDefinition, ctx: Pick<ToolContext, "facility" | "locale">): string {
  const circulating = c.team?.members.find((m) => m.duties.includes("circulate"))?.staff;
  const s = circulating ? ctx.facility?.staff.find((x) => x.id === circulating) : undefined;
  return s ? t(s.name, ctx.locale) : rt(ctx.locale, "speaker.nurse");
}

const orderStudy: ToolDefinition<ToolArgs> = {
  name: "order_study",
  description:
    "Order a NEW investigation in this encounter (a 12-lead ECG, a blood panel, a chest radiograph…): one of the case's simulated test profiles, acquired by the hospital's staff and reported later — labelled a simulated investigation, never the published case's record. " +
    "To look up what the published case recorded, use retrieve_report instead. An operative cholangiogram is not ordered here: it is acquired at the table (operate).",
  inputSchema: {
    type: "object",
    properties: {
      code: { type: "string", description: "The study's code (list_options kind \"investigations\" names them)." },
      query: { type: "string", maxLength: 200, description: "Free text when the code is unknown (\"ECG\", \"心电图\")." },
      indication: { type: "string", maxLength: 500, description: "The clinical question." },
      priority: { type: "string", enum: ["routine", "urgent"] },
      lead_placement: { type: "string", enum: ["standard", "mirror"], description: "ECG only: standard positions, or mirrored (right-sided chest leads, arm leads reversed) for dextrocardia." },
      reviewer: { type: "string", maxLength: 80, description: "Who reviews the report (a colleague's name, title or staff id; default: the study's reviewer, else you)." },
      request_key: { type: "string", maxLength: 120, description: "Your request's key: the same key again returns the same order (a retry)." },
    },
    additionalProperties: false,
  },
  readOnly: false,
  sideEffect: "record",
  scope: "workup",
  risk: () => "none",
  summarize: (args, ctx) => rt(ctx.locale, "sum.order_study", { name: strArg(args, "code") || strArg(args, "query") }),
  specifier: (args) => strArg(args, "code") || strArg(args, "query"),
  // Rules match the study the request resolves to (its code, PROTOCOL §6), then the spelling: `order_study(cbc-new)`
  // also covers `{query: "FBC"}`.
  specifiers: (args, ctx) => {
    const query = strArg(args, "code") || strArg(args, "query");
    const p = studyProfile(ctx.caseDef, strArg(args, "code")) ?? resolveStudy(ctx.caseDef.studies ?? [], query);
    return [[...new Set([...(p ? [p.code] : []), query])]];
  },
  async run(args, ctx): Promise<ToolOutput> {
    const L = ctx.locale;
    const c = ctx.caseDef;
    const query = strArg(args, "code") || strArg(args, "query");
    const operative = operativeImagingAsked(query);
    if (operative) return { ok: false, output: rt(L, "study.operative", { query, name: t(OPERATIVE_IMAGING[operative].name, L), modality: operative }), data: { code: "OPERATIVE_STUDY", modality: operative } };
    if (!(c.studies ?? []).length) return { ok: false, output: rt(L, "study.none") };
    const p = studyProfile(c, strArg(args, "code")) ?? resolveStudy(c.studies ?? [], query);
    if (!p) return { ok: false, output: rt(L, "study.unknown", { query, choices: choices(c, L) }) };
    const s = ctx.state();
    // when it may be ordered, and what makes it unsafe now: the profile's (the reducer refuses such an order too)
    const block = studyOrderBlock(c, s, p);
    if (block?.kind === "not-yet") return { ok: false, output: rt(L, "study.notOrderable", { name: t(p.name, L) }), data: { code: "NOT_ORDERABLE_NOW" } };
    if (block) return { ok: false, output: rt(L, "study.restricted", { name: t(p.name, L), reason: t(block.reason, L) }), data: { code: "STUDY_RESTRICTED" } };
    const key = strArg(args, "request_key") || `${p.code}:${(s.studies?.orders.filter((o) => o.code === p.code).length ?? 0) + 1}`;
    const placement = strArg(args, "lead_placement");
    const priority = strArg(args, "priority") === "urgent" ? "urgent" : "routine";
    const result = ctx.dispatch({
      type: "study",
      study: { op: "order", code: p.code, key, requester: ctx.agent, priority, ...(strArg(args, "indication") ? { indication: strArg(args, "indication") } : {}), ...(strArg(args, "reviewer") ? { reviewer: strArg(args, "reviewer") } : {}), ...(placement ? { configuration: placement } : {}) },
      by: actorFor(ctx),
    });
    if (result.rejected) return rejectedOutput(L, result, result.rejected.message);
    const order = (ctx.state().studies?.orders ?? []).find((o) => o.key === key)!;
    const repeated = (s.studies?.orders ?? []).some((o) => o.key === key);
    if (repeated) return { ok: true, output: rt(L, "study.again", { label: label("simulated", L), name: t(p.name, L), order: order.id }), data: { order } };
    const minutes = p.turnaroundMinutes;
    const provides = facilityProvides(p, ctx);
    const next =
      provides === false
        ? rt(L, "study.status.waiting", { name: t(p.name, L), order: order.id, reason: rt(L, "study.wait.noDevice", { caps: p.requires.join(", ") }) })
        : !ctx.facility
          ? rt(L, "study.next.text", { minutes })
          : p.acquisition === "bedside-device"
            ? rt(L, "study.next.device", { who: who(c, ctx), device: providerName(p, ctx), minutes })
            : p.acquisition === "sample"
              ? rt(L, "study.next.sample", { who: who(c, ctx), minutes })
              : rt(L, "study.next.department", { device: providerName(p, ctx) });
    return { ok: true, output: rt(L, "study.ordered", { label: label("simulated", L), name: t(p.name, L), order: order.id, next }), data: { order } };
  },
};

/** The status of one order, or the released report of its latest accession, in words (null: no such order). */
export function orderText(c: CaseDefinition, s: SessionState, orderId: string, L: string, facility?: FacilityDefinition | null): string | null {
  const r = s.studies;
  const o = r?.orders.find((x) => x.id === orderId);
  const p = o ? studyProfile(c, o.code) : undefined;
  if (!r || !o || !p) return null;
  const person = (id: string) => {
    const staff = facility?.staff.find((x) => x.id === id);
    return staff ? t(staff.name, L) : id;
  };
  const name = t(p.name, L);
  const a = r.accessions.filter((x) => x.order === o.id).at(-1);
  if (!a) {
    if (o.waiting) return rt(L, "study.status.waiting", { name, order: o.id, reason: o.waiting.reason });
    const who = o.assignee ? person(o.assignee) : "";
    if (o.stage === "assigned") return rt(L, "study.status.assigned", { name, order: o.id, who });
    if (o.stage === "en-route") return rt(L, "study.status.enRoute", { name, order: o.id, who });
    if (o.stage === "at-patient" || o.stage === "acquisition-started") return rt(L, "study.status.atPatient", { name, order: o.id, who });
    return rt(L, "study.status.ordered", { name, order: o.id });
  }
  const report = r.reports.filter((x) => x.accession === a.id).at(-1);
  if (!report) return rt(L, "study.status.acquired", { name, accession: a.id, who: person(a.collector), at: clockTime(c, a.at, L), due: clockTime(c, a.dueAt, L, "ceil") });
  const lang = L === "zh-CN" ? "zh-CN" : "en";
  // who reviewed it, and why them when it explains something: the reviewer the order named, or — once
  // responsibility has been handed over — the anaesthetist responsible now
  const handedOver = (s.anaesthesia?.handovers.length ?? 0) > 0;
  const basisText = (basis: string | undefined) => (basis === "named" ? ` ${rt(L, "study.basis.named")}` : basis === "responsible" && handedOver ? ` ${rt(L, "study.basis.responsible")}` : "");
  const reviewed = r.reviews.filter((x) => x.accession === a.id).map((x) => `${person(x.by)}${basisText(x.basis)}`);
  const text = rt(L, "study.report", {
    label: label("simulated", L),
    name,
    accession: a.id,
    at: clockTime(c, a.at, L),
    who: person(a.collector),
    config: a.configuration === "mirror" ? rt(L, "study.config.mirror") : "",
    released: clockTime(c, report.at, L),
    generator: report.generator,
    findings: report.findings[lang],
    impression: report.impression[lang],
    limitations: report.limitations?.[lang] ?? rt(L, "study.limitations"),
  });
  return reviewed.length ? `${text}\n${rt(L, "study.reviewed", { who: reviewed.join(", "), name, accession: a.id, impression: report.impression[lang] })}` : text;
}

/** One line per order of a study: its order, accession, time and where it stands — every instance apart. */
function instanceLines(c: CaseDefinition, s: SessionState, code: string, L: string, facility?: FacilityDefinition | null): string[] {
  return (s.studies?.orders ?? []).filter((o) => o.code === code).map((o) => `  ${o.id} · ${clockTime(c, o.at, L)} · ${(orderText(c, s, o.id, L, facility) ?? "").split("\n")[0]}`);
}

/**
 * A study's status or released report, in words: one order — its text; several — each instance on its own line (a
 * reviewed first ECG never hides a second one waiting), and how to read one.
 */
export function studyText(c: CaseDefinition, s: SessionState, code: string, L: string, facility?: FacilityDefinition | null): string | null {
  const p = studyProfile(c, code);
  const orders = (s.studies?.orders ?? []).filter((o) => o.code === code);
  if (!p || !orders.length) return null;
  if (orders.length === 1) return orderText(c, s, orders[0]!.id, L, facility);
  return [rt(L, "study.instances", { name: t(p.name, L), n: orders.length }), ...instanceLines(c, s, code, L, facility), rt(L, "study.instancesHint")].join("\n");
}

const readStudy: ToolDefinition<ToolArgs> = {
  name: "read_study",
  description:
    "Read a new investigation you ordered in this encounter (order_study): one instance by accession (\"ecg-12lead-1\") or order (\"ord-2\"), or a study by code or name — with several orders of it, each instance is listed apart. The report is labelled a simulated investigation.",
  inputSchema: {
    type: "object",
    properties: { accession: { type: "string", maxLength: 80 }, order: { type: "string", maxLength: 80 }, code: { type: "string" }, query: { type: "string", maxLength: 200 } },
    additionalProperties: false,
  },
  readOnly: true,
  sideEffect: "none",
  scope: "workup",
  risk: () => "none",
  summarize: (args) => strArg(args, "accession") || strArg(args, "order") || strArg(args, "code") || strArg(args, "query"),
  async run(args, ctx) {
    const L = ctx.locale;
    const c = ctx.caseDef;
    const s = ctx.state();
    // one instance, by its accession or its order
    const accession = strArg(args, "accession");
    const orderId = strArg(args, "order") || (accession ? (s.studies?.orders.find((o) => o.accessions.includes(accession))?.id ?? "") : "");
    if (accession || strArg(args, "order")) {
      const text = orderId ? orderText(c, s, orderId, L, ctx.facility) : null;
      const o = s.studies?.orders.find((x) => x.id === orderId);
      // an accession reads that accession's report, not the order's latest
      if (text && o && accession && o.accessions.at(-1) !== accession) return { ok: true, output: accessionText(c, s, accession, L, ctx.facility) ?? text, data: { order: o } };
      return text && o ? { ok: true, output: text, data: { order: o } } : { ok: false, output: rt(L, "study.read.none", { query: accession || orderId }) };
    }
    const query = strArg(args, "code") || strArg(args, "query");
    const p = studyProfile(c, strArg(args, "code")) ?? resolveStudy(c.studies ?? [], query);
    const text = p ? studyText(c, s, p.code, L, ctx.facility) : null;
    return text ? { ok: true, output: text, data: { studies: s.studies?.orders.filter((o) => o.code === p!.code) ?? [] } } : { ok: false, output: rt(L, "study.read.none", { query }) };
  },
};

/** The released report of one accession (an earlier one of an order), in words. */
function accessionText(c: CaseDefinition, s: SessionState, accession: string, L: string, facility?: FacilityDefinition | null): string | null {
  const a = s.studies?.accessions.find((x) => x.id === accession);
  if (!a) return null;
  // the order's text as if this were its latest accession
  const only: SessionState = { ...s, studies: { ...s.studies!, accessions: s.studies!.accessions.filter((x) => x.order !== a.order || x.id === a.id) } };
  return orderText(c, only, a.order, L, facility);
}

const listStudies: ToolDefinition<ToolArgs> = {
  name: "list_studies",
  description: "List the new investigations ordered in this encounter, every order apart (order, accession, time, status) — all of them, or one study by code or name.",
  inputSchema: { type: "object", properties: { code: { type: "string" }, query: { type: "string", maxLength: 200 } }, additionalProperties: false },
  readOnly: true,
  sideEffect: "none",
  scope: "workup",
  risk: () => "none",
  summarize: (args) => strArg(args, "code") || strArg(args, "query") || "*",
  async run(args, ctx) {
    const L = ctx.locale;
    const c = ctx.caseDef;
    const s = ctx.state();
    const query = strArg(args, "code") || strArg(args, "query");
    const p = query ? (studyProfile(c, strArg(args, "code")) ?? resolveStudy(c.studies ?? [], query)) : null;
    const codes = p ? [p.code] : [...new Set((s.studies?.orders ?? []).map((o) => o.code))];
    const lines = codes.flatMap((code) => [t(studyProfile(c, code)!.name, L), ...instanceLines(c, s, code, L, ctx.facility)]);
    return lines.length ? { ok: true, output: [rt(L, "study.header"), ...lines].join("\n"), data: { orders: (s.studies?.orders ?? []).filter((o) => codes.includes(o.code)) } } : { ok: false, output: rt(L, "study.read.none", { query: query || "*" }) };
  },
};

const retrieveReport: ToolDefinition<ToolArgs> = {
  name: "retrieve_report",
  description:
    "Retrieve an EXISTING report from the published case's records (the ultrasound, the CT, a laboratory summary, an ECG if there is one). It says when the source has no such report — then order a new investigation with order_study if the hospital offers one.",
  inputSchema: { type: "object", properties: { query: { type: "string", minLength: 1, maxLength: 200 } }, required: ["query"], additionalProperties: false },
  readOnly: false,
  sideEffect: "record",
  scope: "workup",
  risk: () => "none",
  summarize: (args) => strArg(args, "query"),
  async run(args, ctx) {
    const L = ctx.locale;
    const c = ctx.caseDef;
    const query = strArg(args, "query");
    // the source's record of this kind: a study's historical record, else a record review by name
    const q = query.toLowerCase();
    const viaStudy = resolveStudy(c.studies ?? [], query)?.historical;
    const records = c.investigations.filter((i) => i.performedAt === "records");
    // every word of the request in the record's id, name (either language) or an alias ("operation record" ~ operation-record)
    const norm = (x: string) => x.toLowerCase().replace(/[-_/·.,]+/gu, " ").replace(/\s+/gu, " ").trim();
    const words = norm(q).split(" ").filter((w) => w.length > 1 || /[\u3400-\u9fff]/u.test(w));
    const texts = (i: (typeof records)[number]) => [i.id, investigationName(c, i.id, "en"), investigationName(c, i.id, "zh-CN"), ...Object.values(i.aliases ?? {}).flat().map(String)].map(norm);
    // whole words in Latin script ("ct" is not in "electrocardiogram"); a substring in Chinese
    const has = (x: string, w: string) => (/[\u3400-\u9fff]/u.test(w) ? x.includes(w) : ` ${x} `.includes(` ${w} `));
    const matches = (i: (typeof records)[number]) => texts(i).some((x) => has(x, norm(q))) || (words.length > 0 && words.every((w) => texts(i).some((x) => has(x, w))));
    const inv = records.find((i) => i.id === viaStudy) ?? records.find(matches);
    if (!inv) return { ok: true, output: rt(L, "study.retrieve.none", { label: label("unavailable", L), query }), data: { source: "none" } };
    const s = ctx.state();
    const name = investigationName(c, inv.id, L);
    // when the document exists in the simulated timeline: never another phase's text (core `recordAvailability`)
    const st = recordAvailability(c, s, inv.id);
    if (st.kind === "none") return { ok: true, output: rt(L, "study.retrieve.none", { label: label("unavailable", L), query }), data: { source: "none" } };
    if (st.kind === "not-yet") return { ok: true, output: rt(L, "study.retrieve.notYet", { label: label("notYet", L), name }), data: { source: "not-yet", investigationId: inv.id } };
    const phase = st.phase;
    const result = st.result;
    if (phase === s.phase) {
      // the record retrieved through the chart, as an order and a read of it
      if (!s.orders.some((o) => o.investigationId === inv.id && o.phase === s.phase)) {
        const r = ctx.dispatch({ type: "order", investigationId: inv.id, by: actorFor(ctx) });
        if (r.rejected) return rejectedOutput(L, r, r.rejected.message);
      }
      const read = ctx.dispatch({ type: "read", investigationId: inv.id, by: actorFor(ctx) });
      if (read.rejected && read.rejected.code !== "not-ready") return rejectedOutput(L, read, read.rejected.message);
    }
    if (st.kind === "not-present") return { ok: true, output: rt(L, "study.retrieve.unavailable", { label: label("unavailable", L), name, text: t(result.text, L) }), data: { source: "unavailable", investigationId: inv.id } };
    return { ok: true, output: rt(L, "study.retrieve.source", { label: label("source", L), name, text: formatResult(c, inv.id, phase, L).text }), data: { source: "record", investigationId: inv.id } };
  },
};

/** The investigation tools of a case with test profiles (registered always; hidden without profiles). */
export function studyTools(): ToolDefinition<ToolArgs>[] {
  return [retrieveReport, orderStudy, readStudy, listStudies];
}

/** The status lines of the encounter's new investigations (`case_status`): every order apart. */
export function studyLines(c: CaseDefinition, s: SessionState, L: string, facility?: FacilityDefinition | null): string[] {
  const codes = [...new Set((s.studies?.orders ?? []).map((o) => o.code))];
  if (!codes.length) return [];
  return [rt(L, "study.header"), ...codes.flatMap((code) => instanceLines(c, s, code, L, facility))];
}
