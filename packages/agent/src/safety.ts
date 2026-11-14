/**
 * The safety outcome (core `AssessmentReport.safety`: `passed`, `criticalFailures`, `doseErrors`; docs/PROTOCOL.md
 * §3.2) in words. Every debrief and export — the web's debrief and learning record, the CLI's (`/assess`, `/debrief`,
 * `exec`, `eval`, `sessions show`), MCP's `get_debrief` and transcript resource, the benchmark's reports — shows it
 * beside the score, lists the critical safety failures and the dose errors, and never presents a run whose `passed`
 * is false as passed, whatever its percentage. It never changes the score. Unlike the critical items missed
 * (`critical.ts`) it names only what the learner did, so it may show mid-case too.
 */
import { safetyPassed, t, type AssessedDoseError, type AssessmentReport, type CaseDefinition, type LocalizedText } from "@clinicalcraft/core";
import { isZh, rt } from "./session/i18n.js";
import { doseRatioText, doseText, interventionNameText, isRange } from "./tools/dose-order.js";

/**
 * The safety part of a report, as saved transcripts and exports may hold it: reports written before the safety
 * outcome lack its fields, and an export says null for a run that left nothing to assess.
 */
export interface SafetyOfReport {
  passed?: boolean | null;
  criticalFailures?: readonly { interventionId: string; at: number; harm?: LocalizedText }[];
  doseErrors?: readonly AssessedDoseError[];
  verdict?: AssessmentReport["safety"]["verdict"];
}

/** A critical safety failure in words. */
export interface SafetyFailureItem {
  interventionId: string;
  at: number;
  /** The intervention's name. */
  name: string;
  /** What it did (the intervention's `harm`), or null. */
  harm: string | null;
  /** The debrief line ("⚠ Critical safety failure: …"). */
  text: string;
}

/** A dose error in words. */
export interface SafetyDoseErrorItem {
  interventionId: string;
  at: number;
  name: string;
  severity: "warning" | "critical";
  /** The order as written. */
  ordered: string;
  /** The dose read from it, in words. */
  readAs: string;
  /** The preset dose, in words. */
  preset: string;
  /** How far apart ("10 times the preset dose"), or null. */
  ratio: string | null;
  /** The debrief line ("⚠ Critical dose error: …"). */
  text: string;
}

/** The safety outcome in words (`safetySummary`). */
export interface SafetySummary {
  /** `AssessmentReport.safety.passed`; null for a report saved without it. */
  passed: boolean | null;
  /** "Safety: passed" / "Safety: not passed — critical safety failures: 1" (empty for a report saved without it). */
  headline: string;
  criticalFailures: SafetyFailureItem[];
  doseErrors: SafetyDoseErrorItem[];
}

/**
 * "Safety: passed", "Safety: passed (dose errors: 1 to review)", "Safety: not passed — critical safety failures: 1;
 * critical dose errors: 1" (zh-CN "安全性：未通过——严重安全失误 1 次、严重剂量错误 1 次"); "" for a report saved
 * before the safety outcome existed.
 */
export function safetyHeadline(safety: SafetyOfReport | undefined, locale: string): string {
  if (!safety || typeof safety.passed !== "boolean") return "";
  // a saved transcript is data: read only what has the report's shape
  const doseErrors = Array.isArray(safety.doseErrors) ? safety.doseErrors : [];
  const failures = Array.isArray(safety.criticalFailures) ? safety.criticalFailures.length : 0;
  const criticalDose = doseErrors.filter((e) => e?.severity === "critical").length;
  const otherDose = doseErrors.length - criticalDose;
  const reasons = [
    failures ? rt(locale, "safety.reason.critical", { n: failures }) : "",
    criticalDose ? rt(locale, "safety.reason.criticalDose", { n: criticalDose }) : "",
    otherDose ? rt(locale, "safety.reason.dose", { n: otherDose }) : "",
    safety.verdict === "safety-critical" ? rt(locale, "safety.reason.gate") : "",
  ]
    .filter(Boolean)
    .join(isZh(locale) ? "、" : "; ");
  if (!safety.passed) return reasons ? rt(locale, "safety.notPassed", { reasons }) : rt(locale, "safety.notPassedBare");
  return reasons ? rt(locale, "safety.passedReview", { reasons }) : rt(locale, "safety.passed");
}

/** How a safety outcome is shown (`safetySummary`). */
export interface SafetyViewOptions {
  /**
   * False: leave the operation's safety gates out (`verdict`, and `passed` asked again without it — core
   * `safetyPassed`), for a case with an operation before its debrief is unlocked: a gate's verdict mid-case would tell
   * the operator that a hidden view or injury holds (docs/PROCEDURE.md §7). Critical failures and dose errors — what
   * the learner did — stay. Default true.
   */
  gates?: boolean;
}

/**
 * The safety part of a report without the operation's gates (`SafetyViewOptions.gates`): `passed` as it would be
 * without them, and no `verdict`. A report saved without the safety outcome stays as it is.
 */
function withoutGates(safety: SafetyOfReport | undefined): SafetyOfReport | undefined {
  if (!safety || typeof safety.passed !== "boolean") return safety;
  const { verdict: _verdict, ...rest } = safety;
  const criticalFailures = Array.isArray(rest.criticalFailures) ? rest.criticalFailures : [];
  const doseErrors = Array.isArray(rest.doseErrors) ? rest.doseErrors : [];
  return { ...rest, passed: safetyPassed({ criticalFailures, doseErrors }) };
}

/** The safety outcome of a report in words: the headline, each critical safety failure and each dose error. */
export function safetySummary(c: Pick<CaseDefinition, "interventions">, report: { safety?: SafetyOfReport }, locale: string, options: SafetyViewOptions = {}): SafetySummary {
  const safety = options.gates === false ? withoutGates(report.safety) : report.safety;
  const L = locale;
  const criticalFailures = (safety?.criticalFailures ?? []).map((f): SafetyFailureItem => {
    const name = interventionNameText(c, f.interventionId, L);
    const harm = f.harm != null ? t(f.harm, L) || null : null;
    return {
      interventionId: f.interventionId,
      at: f.at,
      name,
      harm,
      text: rt(L, "safety.criticalFailure", { name, min: Math.round(f.at), harm: harm ? rt(L, "safety.harm", { text: harm.replace(/[。.]$/u, "") }) : "" }),
    };
  });
  const doseErrors = (safety?.doseErrors ?? []).map((e): SafetyDoseErrorItem => {
    const name = interventionNameText(c, e.interventionId, L);
    const readAs = doseText(e.ordered, L);
    const preset = doseText(e.preset, L);
    const ratio = doseRatioText(e.ratio, L, isRange(e.preset));
    const key = e.severity === "critical" ? "safety.doseError.critical" : "safety.doseError.warning";
    return {
      interventionId: e.interventionId,
      at: e.at,
      name,
      severity: e.severity,
      ordered: e.text,
      readAs,
      preset,
      ratio,
      text: rt(L, key, { name, text: e.text, ordered: readAs, preset, ratio: ratio ? rt(L, "safety.ratio", { phrase: ratio }) : "", min: Math.round(e.at) }),
    };
  });
  return { passed: typeof safety?.passed === "boolean" ? safety.passed : null, headline: safetyHeadline(safety, L), criticalFailures, doseErrors };
}

/** The safety outcome as debrief lines: the headline, then each critical safety failure and each dose error (none for an old report). */
export function safetyLines(c: Pick<CaseDefinition, "interventions">, report: { safety?: SafetyOfReport }, locale: string): string[] {
  const s = safetySummary(c, report, locale);
  if (!s.headline) return [];
  return [s.headline, ...s.criticalFailures.map((f) => f.text), ...s.doseErrors.map((e) => e.text)];
}
