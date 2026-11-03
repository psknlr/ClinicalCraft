/**
 * The chart's two commands for investigations (docs/STUDIES.md): **retrieve an existing report** (`retrieve_report`:
 * the published case's record — or that it has none) and **order a new investigation** (`order_study`: one of the
 * case's test profiles, acquired and reported by the simulated hospital); and `read_study`, the released report of a
 * new investigation, labelled simulated. An operative study is never ordered here: it is acquired at the table.
 */
import { recordAvailability, studyProfile, t, type CaseDefinition, type FacilityDefinition, type SessionState, type StudyProfile } from "@clinicalcraft/core";
import { rt } from "../session/i18n.js";
import { asksOperativeStudy, resolveStudy } from "../session/studies.js";
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
  async run(args, ctx): Promise<ToolOutput> {
    const L = ctx.locale;
    const c = ctx.caseDef;
    const query = strArg(args, "code") || strArg(args, "query");
    if (asksOperativeStudy(query)) return { ok: false, output: rt(L, "study.operative", { query }), data: { code: "OPERATIVE_STUDY" } };
    if (!(c.studies ?? []).length) return { ok: false, output: rt(L, "study.none") };
    const p = studyProfile(c, strArg(args, "code")) ?? resolveStudy(c.studies ?? [], query);
    if (!p) return { ok: false, output: rt(L, "study.unknown", { query, choices: choices(c, L) }) };
    const s = ctx.state();
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

/** A study's status or released report, in words. */
export function studyText(c: CaseDefinition, s: SessionState, code: string, L: string, facility?: FacilityDefinition | null): string | null {
  const r = s.studies;
  const person = (id: string) => {
    const staff = facility?.staff.find((x) => x.id === id);
    return staff ? t(staff.name, L) : id;
  };
  const p = studyProfile(c, code);
  if (!r || !p) return null;
  const orders = r.orders.filter((o) => o.code === code);
  if (!orders.length) return null;
  const name = t(p.name, L);
  const accessions = r.accessions.filter((a) => a.code === code);
  const a = accessions.at(-1);
  if (!a) {
    const o = orders.at(-1)!;
    return o.waiting ? rt(L, "study.status.waiting", { name, order: o.id, reason: o.waiting.reason }) : rt(L, "study.status.ordered", { name, order: o.id });
  }
  const report = r.reports.filter((x) => x.accession === a.id).at(-1);
  if (!report) return rt(L, "study.status.acquired", { name, accession: a.id, who: person(a.collector), at: clockTime(c, a.at, L), due: clockTime(c, a.dueAt, L, "ceil") });
  const lang = L === "zh-CN" ? "zh-CN" : "en";
  const reviewed = r.reviews.filter((x) => x.accession === a.id).map((x) => person(x.by));
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

const readStudy: ToolDefinition<ToolArgs> = {
  name: "read_study",
  description: "Read a new investigation you ordered in this encounter (order_study): its status, or its released report — labelled a simulated investigation.",
  inputSchema: {
    type: "object",
    properties: { code: { type: "string" }, query: { type: "string", maxLength: 200 } },
    additionalProperties: false,
  },
  readOnly: true,
  sideEffect: "none",
  scope: "workup",
  risk: () => "none",
  summarize: (args) => strArg(args, "code") || strArg(args, "query"),
  async run(args, ctx) {
    const L = ctx.locale;
    const c = ctx.caseDef;
    const query = strArg(args, "code") || strArg(args, "query");
    const p = studyProfile(c, strArg(args, "code")) ?? resolveStudy(c.studies ?? [], query);
    const text = p ? studyText(c, ctx.state(), p.code, L, ctx.facility) : null;
    return text ? { ok: true, output: text, data: { studies: ctx.state().studies?.orders.filter((o) => o.code === p!.code) ?? [] } } : { ok: false, output: rt(L, "study.read.none", { query }) };
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
  return [retrieveReport, orderStudy, readStudy];
}

/** The status lines of the encounter's new investigations (`case_status`). */
export function studyLines(c: CaseDefinition, s: SessionState, L: string, facility?: FacilityDefinition | null): string[] {
  const codes = [...new Set((s.studies?.orders ?? []).map((o) => o.code))];
  if (!codes.length) return [];
  return [rt(L, "study.header"), ...codes.map((code) => `  ${(studyText(c, s, code, L, facility) ?? "").split("\n")[0]}`)];
}
