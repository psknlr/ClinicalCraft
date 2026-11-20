/**
 * `clinicalcraft cases safety-review` — the library's safety-review worksheet (docs/CASE_AUTHORING.md §9.5): every
 * critical intervention and high-risk drug of the cases (the case's `critical` interventions; medicines marked
 * `risk: "high"`; the ISMP high-alert medicines, `isHighAlert`), each with the dose preset, the contraindication the
 * engine applies (in words) and the harm the case states — and empty columns for two independent verdicts, a
 * clinician of the case's specialty and a nurse, and their disagreement. The worksheet is for reviewers; it records no
 * verdict itself, and says plainly that no such review has been recorded yet.
 *
 *   cases safety-review [--case ids] [--format md|json] [--out file]
 */
import { writeFile } from "node:fs/promises";
import { isHighAlert, t, type CaseDefinition, type Condition, type Intervention } from "@clinicalcraft/core";
import { loadContent } from "@clinicalcraft/agent/node";
import { flagList, flagString, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, type CliContext } from "./context.js";
import { m } from "./i18n.js";

/** Why an intervention is on the worksheet. */
export type SafetyReviewReason = "critical" | "high-risk" | "high-alert";

/** One line of the worksheet: an intervention, what the engine does with it, and the verdicts still to record. */
export interface SafetyReviewItem {
  caseId: string;
  caseVersion: string;
  specialty: string[];
  /** The case's own review status (`provenance.review.status`). */
  caseReview: string;
  interventionId: string;
  name: string;
  kind: string;
  risk: string;
  reasons: SafetyReviewReason[];
  /** The dose as the case writes it, and its preset (`doseSpec`) in words; null when none. */
  dose: string | null;
  preset: string | null;
  /** When the engine judges it contraindicated, in words; null: the case states no contraindication. */
  contraindication: string | null;
  /** The harm the case states; null when it states none. */
  harm: string | null;
  /** The independent verdicts: none recorded (null) until a reviewer fills them in. */
  review: { clinician: null; nurse: null; disagreement: null };
}

export interface SafetyReviewWorksheet {
  format: "clinicalcraft-safety-review@1";
  /** No independent review has been recorded: every verdict is empty. */
  reviewed: false;
  cases: number;
  items: SafetyReviewItem[];
}

const OPS: Record<string, string> = { lt: "<", lte: "≤", gt: ">", gte: "≥", eq: "=" };

type Text = Parameters<typeof t>[0];

/** What a case item is called: its name, label, question, manoeuvre, title or prompt (the id when it has none). */
function nameOf(list: readonly { id: string }[], id: string, L: string): string {
  const x = list.find((y) => y.id === id) as { name?: Text; label?: Text; question?: Text; maneuver?: Text; title?: Text; prompt?: Text } | undefined;
  const text = x?.name ?? x?.label ?? x?.question ?? x?.maneuver ?? x?.title ?? x?.prompt;
  return text ? t(text, L) : id;
}

/**
 * A condition in words, for a reviewer: every leaf named from the case (an id where the case has no name); a group
 * inside another is bracketed, so "NOT glucose AND NOT chemistry" never reads as part of the alternatives around it.
 */
export function conditionWords(c: CaseDefinition, cond: Condition, L: string, nested = false): string {
  const words = (x: Condition): string => conditionWords(c, x, L, true);
  const say = (key: Parameters<typeof m>[1], item: string) => m(L, key, { item });
  if ("all" in cond) {
    const text = cond.all.map(words).join(m(L, "safety.cond.and"));
    return nested && cond.all.length > 1 ? `[${text}]` : text;
  }
  if ("any" in cond) {
    const text = cond.any.map(words).join(m(L, "safety.cond.or"));
    return nested && cond.any.length > 1 ? `(${text})` : text;
  }
  if ("not" in cond) return m(L, "safety.cond.not", { cond: conditionWords(c, cond.not, L) });
  if ("vital" in cond) return `${cond.vital.toUpperCase()} ${OPS[cond.op] ?? cond.op} ${cond.value}`;
  if ("asked" in cond) return say("safety.cond.asked", nameOf(c.history, cond.asked, L));
  if ("examined" in cond) return say("safety.cond.examined", nameOf(c.exam, cond.examined, L));
  if ("ordered" in cond) return say("safety.cond.ordered", nameOf(c.investigations, cond.ordered, L));
  if ("read" in cond) return say("safety.cond.read", `${nameOf(c.investigations, cond.read, L)}${cond.phase ? ` (${cond.phase})` : ""}`);
  if ("resultReady" in cond) return say("safety.cond.ready", nameOf(c.investigations, cond.resultReady, L));
  if ("intervened" in cond) return say("safety.cond.given", `${nameOf(c.interventions, cond.intervened, L)}${cond.minCount ? ` ×${cond.minCount}` : ""}`);
  if ("inOrder" in cond) return m(L, "safety.cond.inOrder", { items: cond.inOrder.map((id) => nameOf(c.interventions, id, L)).join(" → ") });
  if ("held" in cond) return say("safety.cond.held", nameOf(c.interventions, cond.held, L));
  if ("decided" in cond || "decidedFirstTry" in cond || "attempted" in cond) {
    const id = "decided" in cond ? cond.decided : "decidedFirstTry" in cond ? cond.decidedFirstTry : cond.attempted;
    return say("safety.cond.decided", nameOf(c.decisions, id, L));
  }
  if ("phase" in cond) return say("safety.cond.phase", nameOf(c.phases, cond.phase, L));
  if ("flag" in cond) return say("safety.cond.flag", cond.flag);
  if ("objective" in cond) return say("safety.cond.objective", nameOf(c.objectives, cond.objective, L));
  if ("elapsed" in cond) return `${m(L, "safety.cond.elapsed")} ${cond.elapsed.gte !== undefined ? `≥ ${cond.elapsed.gte}` : ""}${cond.elapsed.lte !== undefined ? ` ≤ ${cond.elapsed.lte}` : ""}`.trim();
  if ("elapsedSince" in cond) {
    const e = cond.elapsedSince;
    return `${say("safety.cond.since", nameOf(c.interventions, e.intervened, L))}${e.gte !== undefined ? ` ≥ ${e.gte}` : ""}${e.lte !== undefined ? ` ≤ ${e.lte}` : ""}`;
  }
  if ("always" in cond) return m(L, cond.always ? "safety.cond.always" : "safety.cond.never");
  return JSON.stringify(cond);
}

/** A dose preset in words, in `L` ("0.25–0.28 mg/kg IV; bolus 0.09 mg/kg, then 0.81 mg/kg/h"). */
function presetWords(iv: Intervention, L: string): string | null {
  const d = iv.doseSpec as (Record<string, unknown> & { amount?: number; upTo?: number; unit?: string; route?: string; max?: number }) | undefined;
  if (!d) return null;
  const part = (p: { amount?: number; upTo?: number; unit?: string } | undefined) => (p && p.amount !== undefined ? `${p.amount}${p.upTo !== undefined ? `–${p.upTo}` : ""} ${p.unit ?? ""}`.trim() : "");
  const parts = [part(d), d.route ?? ""].filter(Boolean).join(" ");
  const bolus = part(d.bolus as { amount?: number; upTo?: number; unit?: string } | undefined);
  const maintenance = part(d.maintenance as { amount?: number; upTo?: number; unit?: string } | undefined);
  const split = [bolus ? m(L, "safety.preset.bolus", { dose: bolus }) : "", maintenance ? m(L, "safety.preset.then", { dose: maintenance }) : ""].filter(Boolean).join(", ");
  return [parts, split].filter(Boolean).join("; ") || JSON.stringify(d);
}

/** Why an intervention belongs on the worksheet (empty: it does not). */
export function reviewReasons(iv: Intervention): SafetyReviewReason[] {
  const out: SafetyReviewReason[] = [];
  if (iv.critical) out.push("critical");
  if (iv.kind === "medication" && iv.risk === "high") out.push("high-risk");
  if (isHighAlert(iv)) out.push("high-alert");
  return out;
}

/** The worksheet of these cases (sorted by id), in `L`. */
export function safetyReviewWorksheet(cases: readonly CaseDefinition[], L: string): SafetyReviewWorksheet {
  const items: SafetyReviewItem[] = [];
  for (const c of [...cases].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    for (const iv of c.interventions) {
      const reasons = reviewReasons(iv);
      if (!reasons.length) continue;
      items.push({
        caseId: c.id,
        caseVersion: c.version,
        specialty: [...c.specialty],
        caseReview: c.provenance.review?.status ?? "unreviewed",
        interventionId: iv.id,
        name: t(iv.name, L),
        kind: iv.kind,
        risk: iv.risk,
        reasons,
        dose: iv.dose ? t(iv.dose, L) : null,
        preset: presetWords(iv, L),
        contraindication: iv.contraindicatedWhen ? conditionWords(c, iv.contraindicatedWhen, L) : null,
        harm: iv.harm ? t(iv.harm, L) : null,
        review: { clinician: null, nurse: null, disagreement: null },
      });
    }
  }
  return { format: "clinicalcraft-safety-review@1", reviewed: false, cases: new Set(items.map((i) => i.caseId)).size, items };
}

const cell = (s: string | null, none: string) => (s ? s.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ") : none);

/** The worksheet as Markdown in `L`. */
export function safetyReviewMarkdown(w: SafetyReviewWorksheet, L: string): string {
  const n = (r: SafetyReviewReason) => w.items.filter((i) => i.reasons.includes(r)).length;
  const notStated = m(L, "safety.notStated");
  const cols = m(L, "safety.cols").split(" | ");
  const lines = [`# ${m(L, "safety.title")}`, "", m(L, "safety.none"), "", m(L, "safety.how"), "", m(L, "safety.counts", { items: w.items.length, cases: w.cases, critical: n("critical"), highRisk: n("high-risk"), highAlert: n("high-alert") }), ""];
  let current = "";
  for (const i of w.items) {
    if (i.caseId !== current) {
      current = i.caseId;
      lines.push(`## ${m(L, "safety.case", { id: i.caseId, version: i.caseVersion, specialty: i.specialty.join(", "), review: i.caseReview })}`, "", `| ${cols.join(" | ")} |`, `|${cols.map(() => "---").join("|")}|`);
    }
    const dose = [i.dose, i.preset ? `(${i.preset})` : null].filter(Boolean).join(" ");
    lines.push(
      `| \`${i.interventionId}\` ${cell(i.name, "")} | ${i.reasons.map((r) => m(L, `safety.reason.${r}`)).join(", ")} | ${cell(dose || null, notStated)} | ${cell(i.contraindication, notStated)} | ${cell(i.harm, notStated)} |  |  |  |`,
    );
    const next = w.items[w.items.indexOf(i) + 1];
    if (!next || next.caseId !== current) lines.push("");
  }
  return lines.join("\n") + "\n";
}

/** `cases safety-review` */
export async function casesSafetyReview(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const L = ctx.locale;
  const format = flagString(args, "format") ?? "md";
  if (format !== "md" && format !== "json") throw new UsageError(ctx.t("argv.choice", { flag: "--format", value: format, choices: "md | json" }));
  const settings = await loadCliSettings(ctx);
  const content = await loadContent({ dirs: settings.contentDirs });
  const ids = flagList(args, "case");
  for (const id of ids) if (!content.cases.has(id)) throw new CliError(ctx.t("cases.unknown", { id }), EXIT.usage);
  const cases = [...content.cases.values()].map((e) => e.def).filter((c) => !ids.length || ids.includes(c.id));
  const sheet = safetyReviewWorksheet(cases, L);
  const text = format === "json" ? `${JSON.stringify(sheet, null, 2)}\n` : safetyReviewMarkdown(sheet, L);
  const out = flagString(args, "out");
  if (!out) {
    ctx.print(text.replace(/\n$/, ""));
    return EXIT.ok;
  }
  await writeFile(ctx.path(out), text, "utf8");
  ctx.print(m(L, "safety.written", { file: ctx.show(ctx.path(out)) }));
  return EXIT.ok;
}
