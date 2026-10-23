/**
 * Grounding benchmark runs and reports (docs/GROUNDING.md §4–§5): the run
 * over loaded content (`runGrounding`), the JSON report
 * (`clinicalcraft-grounding-report@1`: environment, split digests, metrics,
 * every item), its Markdown in either language, and the comparison of two
 * reports (metric deltas, items fixed and broken).
 */
import type { LoadedContent } from "@clinicalcraft/agent/node";
import type { BenchEnvironment } from "../environment.js";
import { commitLabel } from "../environment.js";
import { bm, isZh, type BenchMessageKey } from "../i18n.js";
import { type Proportion } from "../stats.js";
import { evaluateGroundingItems, groundingMetrics, LOWER_IS_BETTER, type GroundingFilter, type GroundingItemResult, type GroundingMetrics } from "./evaluate.js";
import { frozenStatus, splitDigest, type LoadedGroundingSuite } from "./load.js";
import { GROUNDING_SPLITS, type GroundingSplit, type GroundingTrack } from "./schema.js";

export const GROUNDING_REPORT_FORMAT = "clinicalcraft-grounding-report@1" as const;

export interface GroundingReport {
  format: typeof GROUNDING_REPORT_FORMAT;
  suite: string;
  splits: GroundingSplit[];
  /** ISO time of the run. */
  createdAt: string;
  environment: BenchEnvironment | null;
  /** Digest of each evaluated split (all of its files, whatever the filters). */
  digests: Partial<Record<GroundingSplit, string>>;
  filter: GroundingFilter;
  metrics: GroundingMetrics;
  /** Every evaluated item, in file then track order. */
  items: GroundingItemResult[];
}

export interface RunGroundingOptions {
  suite: LoadedGroundingSuite;
  splits: readonly GroundingSplit[];
  content: Pick<LoadedContent, "cases">;
  filter?: GroundingFilter;
  environment?: BenchEnvironment | null;
  /** ISO time stamp (tests pass a fixed one). */
  now?: string;
}

/** Evaluate a loaded suite's splits against the content and build the report. */
export function runGrounding(options: RunGroundingOptions): GroundingReport {
  const files = options.suite.files.filter((f) => options.splits.includes(f.split));
  const inputs = files.map((f) => ({ split: f.split, path: f.path, set: f.set, caseDef: f.set.caseId ? (options.content.cases.get(f.set.caseId)?.def ?? null) : null }));
  const items = evaluateGroundingItems(inputs, options.filter ?? {});
  const digests: Partial<Record<GroundingSplit, string>> = {};
  for (const split of GROUNDING_SPLITS) {
    if (!options.splits.includes(split)) continue;
    digests[split] = splitDigest(options.suite.files.filter((f) => f.split === split));
  }
  return {
    format: GROUNDING_REPORT_FORMAT,
    suite: options.suite.suite,
    splits: GROUNDING_SPLITS.filter((s) => options.splits.includes(s)),
    createdAt: options.now ?? new Date().toISOString(),
    environment: options.environment ?? null,
    digests,
    filter: options.filter ?? {},
    metrics: groundingMetrics(items),
    items,
  };
}

/* ------------------------------------------------------------------ */
/* Markdown                                                            */
/* ------------------------------------------------------------------ */

/** "87.5 %" (or "—" without trials). */
export function pct(p: Proportion | undefined, digits = 1): string {
  return p && p.rate !== null ? `${(p.rate * 100).toFixed(digits)} %` : "—";
}

function ci(p: Proportion | undefined): string {
  return p?.ci ? `${(p.ci[0] * 100).toFixed(1)}–${(p.ci[1] * 100).toFixed(1)} %` : "—";
}

function cell(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, " ").replace(/\|/g, "\\|");
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function splitsLabel(locale: string, splits: readonly GroundingSplit[]): string {
  return splits.map((s) => bm(locale, `grounding.split.${s}` as BenchMessageKey)).join(isZh(locale) ? " + " : " + ");
}

/** The Markdown report, in the CLI language. `failures` caps the failure list (default 200). */
export function groundingMarkdown(report: GroundingReport, locale: string, options: { failures?: number } = {}): string {
  const L = locale;
  const m = report.metrics;
  const lines: string[] = [];
  lines.push(`# ${bm(L, "grounding.title", { suite: report.suite, splits: splitsLabel(L, report.splits) })}`, "");
  lines.push(`> ${bm(L, "grounding.disclaimer")}`, "");
  lines.push(`| | |`, `|---|---|`);
  if (report.environment) {
    lines.push(`| ${bm(L, "report.commit")} | ${commitLabel(report.environment, bm(L, "report.dirty"))} |`);
    lines.push(`| ${bm(L, "report.node")} | ${report.environment.node} · ${report.environment.platform} |`);
  }
  lines.push(`| ${bm(L, "report.date")} | ${report.createdAt} |`);
  for (const [split, digest] of Object.entries(report.digests)) {
    const status = frozenStatus(report.suite, split as GroundingSplit, digest);
    const note = status === "unpinned" ? "" : ` (${bm(L, status === "frozen" ? "grounding.frozen" : "grounding.modified")})`;
    lines.push(`| ${bm(L, "grounding.digest", { split })} | \`${digest}\`${note} |`);
  }
  lines.push("");

  lines.push(`## ${bm(L, "grounding.overall")}`, "");
  lines.push(`| ${bm(L, "grounding.track")} | ${bm(L, "grounding.items")} | ${bm(L, "grounding.accuracy")} | ${bm(L, "report.ci")} |`, "|---|---:|---:|---|");
  for (const t of m.tracks) lines.push(`| ${bm(L, `grounding.track.${t.track}` as BenchMessageKey)} | ${t.accuracy.n} | ${pct(t.accuracy)} | ${ci(t.accuracy)} |`);
  lines.push(`| **${bm(L, "grounding.overall")}** | **${m.overall.n}** | **${pct(m.overall)}** | ${ci(m.overall)} |`, "");

  lines.push(`## ${bm(L, "grounding.byTrack")}`, "");
  lines.push(`| ${bm(L, "grounding.track")} | ${bm(L, "grounding.rate")} | ${bm(L, "report.trials")} | ${bm(L, "report.value")} | ${bm(L, "report.ci")} |`, "|---|---|---:|---:|---|");
  for (const t of m.tracks) {
    for (const [name, p] of Object.entries(t.rates)) {
      if (!p || p.n === 0) continue;
      lines.push(`| ${t.track} | ${bm(L, `grounding.rate.${name}` as BenchMessageKey)} | ${p.k} / ${p.n} | ${pct(p)} | ${ci(p)} |`);
    }
  }
  lines.push("");

  lines.push(`## ${bm(L, "grounding.byLocale")}`, "");
  lines.push(`| | ${bm(L, "report.trials")} | ${bm(L, "grounding.accuracy")} | ${bm(L, "report.ci")} |`, "|---|---:|---:|---|");
  for (const [k, p] of Object.entries(m.byLocale)) lines.push(`| ${k} | ${p.k} / ${p.n} | ${pct(p)} | ${ci(p)} |`);
  lines.push("");
  lines.push(`## ${bm(L, "grounding.byCase")}`, "");
  lines.push(`| ${bm(L, "report.case")} | ${bm(L, "report.trials")} | ${bm(L, "grounding.accuracy")} | ${bm(L, "report.ci")} |`, "|---|---:|---:|---|");
  for (const [k, p] of Object.entries(m.byCase)) lines.push(`| \`${k}\` | ${p.k} / ${p.n} | ${pct(p)} | ${ci(p)} |`);
  lines.push("");
  if (m.byTag?.length) {
    lines.push(`## ${bm(L, "grounding.byTag")}`, "");
    lines.push(`| ${bm(L, "grounding.tag")} | ${bm(L, "grounding.track")} | ${bm(L, "report.trials")} | ${bm(L, "grounding.accuracy")} | ${bm(L, "report.ci")} | ${bm(L, "grounding.failureKinds")} |`, "|---|---|---:|---:|---|---|");
    for (const tag of m.byTag) {
      for (const t of tag.tracks) {
        const failures = Object.entries(t.failures).map(([outcome, n]) => `${outcome} ${n}`).join(", ") || "—";
        lines.push(`| ${tag.tag} | ${t.track} | ${t.accuracy.k} / ${t.accuracy.n} | ${pct(t.accuracy)} | ${ci(t.accuracy)} | ${failures} |`);
      }
      lines.push(`| **${tag.tag}** | **${bm(L, "grounding.allTracks")}** | **${tag.accuracy.k} / ${tag.accuracy.n}** | **${pct(tag.accuracy)}** | ${ci(tag.accuracy)} | |`);
    }
    lines.push("");
  }

  const failed = report.items.filter((r) => !r.ok);
  const cap = options.failures ?? 200;
  lines.push(`## ${bm(L, "grounding.failures")}`, "");
  if (!failed.length) lines.push(bm(L, "grounding.noFailures"));
  else {
    lines.push(
      `| ${bm(L, "grounding.item")} | ${bm(L, "grounding.track")} | ${bm(L, "grounding.input")} | ${bm(L, "grounding.expected")} | ${bm(L, "grounding.got")} | ${bm(L, "grounding.outcome")} |`,
      "|---|---|---|---|---|---|",
    );
    for (const r of failed.slice(0, cap)) {
      lines.push(`| \`${r.split}/${r.caseId ?? "-"}#${r.itemId}\` | ${r.track} | ${cell(r.input)} | ${cell(r.expected, 60)} | ${cell(r.got, 80)} | ${r.outcome} |`);
    }
    if (failed.length > cap) lines.push("", bm(L, "grounding.moreFailures", { n: failed.length - cap }));
  }
  lines.push("");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Comparison                                                          */
/* ------------------------------------------------------------------ */

export interface GroundingDelta {
  /** `overall`, `<track>` (accuracy) or `<track>.<rate>`. */
  metric: string;
  before: Proportion | null;
  after: Proportion | null;
  /** after − before in percentage points (null when either is missing). */
  deltaPoints: number | null;
  /** True when the change is an improvement (accounting for lower-is-better rates). */
  better: boolean | null;
}

export interface GroundingComparison {
  /** True when both reports evaluated the same split digests. */
  sameItems: boolean;
  deltas: GroundingDelta[];
  fixed: GroundingItemResult[];
  broken: GroundingItemResult[];
}

const itemKey = (r: Pick<GroundingItemResult, "file" | "track" | "itemId">) => `${r.file}#${r.track}#${r.itemId}`;

function delta(metric: string, before: Proportion | undefined, after: Proportion | undefined): GroundingDelta {
  const b = before && before.n > 0 ? before : null;
  const a = after && after.n > 0 ? after : null;
  const d = a && b && a.rate !== null && b.rate !== null ? Math.round((a.rate - b.rate) * 10000) / 100 : null;
  const rate = metric.includes(".") ? metric.slice(metric.indexOf(".") + 1) : "";
  const better = d === null || d === 0 ? null : LOWER_IS_BETTER.has(rate) ? d < 0 : d > 0;
  return { metric, before: b, after: a, deltaPoints: d, better };
}

/** Compare two reports: metric deltas (overall, per track and rate) and the items whose verdict changed. */
export function compareGroundingReports(before: GroundingReport, after: GroundingReport): GroundingComparison {
  const deltas: GroundingDelta[] = [delta("overall", before.metrics.overall, after.metrics.overall)];
  const tracks = new Set<GroundingTrack>([...before.metrics.tracks.map((t) => t.track), ...after.metrics.tracks.map((t) => t.track)]);
  for (const track of tracks) {
    const b = before.metrics.tracks.find((t) => t.track === track);
    const a = after.metrics.tracks.find((t) => t.track === track);
    deltas.push(delta(track, b?.accuracy, a?.accuracy));
    const rates = new Set([...Object.keys(b?.rates ?? {}), ...Object.keys(a?.rates ?? {})]);
    for (const rate of rates) deltas.push(delta(`${track}.${rate}`, (b?.rates as Record<string, Proportion> | undefined)?.[rate], (a?.rates as Record<string, Proportion> | undefined)?.[rate]));
  }
  // Reports written before tags existed have no byTag.
  const tags = [...new Set([...(before.metrics.byTag ?? []), ...(after.metrics.byTag ?? [])].map((t) => t.tag))].sort();
  for (const tag of tags) deltas.push(delta(`tag:${tag}`, before.metrics.byTag?.find((t) => t.tag === tag)?.accuracy, after.metrics.byTag?.find((t) => t.tag === tag)?.accuracy));
  const old = new Map(before.items.map((r) => [itemKey(r), r]));
  const fixed: GroundingItemResult[] = [];
  const broken: GroundingItemResult[] = [];
  for (const r of after.items) {
    const prev = old.get(itemKey(r));
    if (!prev) continue;
    if (!prev.ok && r.ok) fixed.push(r);
    if (prev.ok && !r.ok) broken.push(r);
  }
  const sameItems = JSON.stringify(before.digests) === JSON.stringify(after.digests);
  return { sameItems, deltas, fixed, broken };
}

/** The comparison as Markdown. */
export function groundingCompareMarkdown(cmp: GroundingComparison, locale: string, beforeLabel: string): string {
  const L = locale;
  const lines: string[] = [`## ${bm(L, "grounding.compare.title", { before: beforeLabel })}`, ""];
  if (!cmp.sameItems) lines.push(`> ${bm(L, "grounding.compare.mismatch")}`, "");
  lines.push(`| ${bm(L, "grounding.compare.metric")} | ${bm(L, "grounding.compare.before")} | ${bm(L, "grounding.compare.after")} | ${bm(L, "grounding.compare.delta")} |`, "|---|---:|---:|---:|");
  for (const d of cmp.deltas) {
    if (!d.before && !d.after) continue;
    const sign = d.deltaPoints === null ? "—" : `${d.deltaPoints > 0 ? "+" : ""}${d.deltaPoints.toFixed(1)} pp${d.better === true ? " ✓" : d.better === false ? " ✗" : ""}`;
    lines.push(`| ${d.metric} | ${pct(d.before ?? undefined)} | ${pct(d.after ?? undefined)} | ${sign} |`);
  }
  lines.push("");
  for (const [key, list] of [
    ["grounding.compare.fixed", cmp.fixed],
    ["grounding.compare.broken", cmp.broken],
  ] as const) {
    lines.push(`### ${bm(L, key, { n: list.length })}`, "");
    for (const r of list.slice(0, 100)) lines.push(`- \`${r.split}/${r.caseId ?? "-"}#${r.itemId}\` (${r.track}) ${cell(r.input, 100)} → ${cell(r.got, 60)}`);
    if (list.length > 100) lines.push(`- … ${list.length - 100}`);
    lines.push("");
  }
  return lines.join("\n");
}
