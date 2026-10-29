/**
 * Interactive case picker (play without a case): numbered list with
 * locale-aware, spoiler-free titles (never the ids, which name the
 * diagnosis); accepts a number, an id or a unique id prefix.
 */
import { createInterface } from "node:readline";
import { t, type CaseDefinition, type LocalizedText } from "@clinicalcraft/core";
import { libraryOrder, sanitizeTerminal } from "@clinicalcraft/agent";
import { CaseLibrary, type LoadedContent } from "@clinicalcraft/agent/node";
import { CliError, EXIT, type CliContext } from "./context.js";
import { caseChoiceMeta, reviewTag } from "./labels.js";

export { caseChoiceMeta, reviewTag, stars } from "./labels.js";

/**
 * Cases in library order — published cases first, then by difficulty, then
 * by id (code-unit order) — the same order as the web library, independent
 * of the UI language and of load order, so `cases list` and the picker's
 * numbers are stable (`libraryOrder`, shared with MCP `list_cases`). `locale`
 * is accepted for API compatibility only.
 */
export function sortedCases(content: LoadedContent, _locale?: string): CaseDefinition[] {
  return libraryOrder([...content.cases.values()].map((e) => e.def));
}

/** What the picker shows of a case: a full case or a case index entry (its review status, when one is recorded). */
export type PickerCase = Pick<CaseDefinition, "id" | "difficulty"> & {
  title: LocalizedText;
  setting: string;
  review?: { status: string; reviewedAt?: string | null } | null;
};

/**
 * One picker line: number, spoiler-free title, difficulty, setting and — where a case is offered, the review status
 * is stated (docs/GLOSSARY.md §4) — its review tag. Never the id, which names the diagnosis.
 */
export function pickerLine(ctx: Pick<CliContext, "t" | "out" | "locale">, c: PickerCase, index: number): string {
  const p = ctx.out;
  const num = String(index + 1).padStart(2, " ");
  const review = c.review ? ` · ${reviewTag(ctx, c.review)}` : "";
  return `${p.dim(num)}. ${sanitizeTerminal(t(c.title, ctx.locale))} ${p.dim(`${caseChoiceMeta(ctx, c)}${review}`)}`;
}

/** Resolve a picker answer (1-based number, id or unique prefix) against a list. */
export function resolveChoice<T extends { id: string }>(answer: string, cases: readonly T[]): T | null {
  const a = answer.trim();
  if (!a) return null;
  if (/^\d+$/.test(a)) return cases[Number(a) - 1] ?? null;
  const exact = cases.find((c) => c.id === a);
  if (exact) return exact;
  const prefixed = cases.filter((c) => c.id.startsWith(a));
  return prefixed.length === 1 ? prefixed[0]! : null;
}

/**
 * Ask the learner to choose a case. Non-TTY stdin → usage error listing the ids.
 * Lists the case index (library order, no validation): only the chosen case is validated when it starts.
 */
export async function pickCase(ctx: CliContext, source: readonly string[] | CaseLibrary): Promise<string> {
  const library = source instanceof CaseLibrary ? source : await CaseLibrary.open({ dirs: source });
  const cases: PickerCase[] = await library.entries();
  if (cases.length === 0) throw new CliError(ctx.t("picker.none"), EXIT.error);
  if (!ctx.io.stdin.isTTY) {
    throw new CliError(ctx.t("picker.needCase"), EXIT.usage, cases.map((c) => c.id).join(", "));
  }
  const p = ctx.out;
  ctx.print(p.bold(ctx.t("picker.title")));
  // Titles are spoiler-free; ids name the diagnosis (stemi-inferior-rv…), so the list never shows them
  // (typing an id still works, for those who know it).
  cases.forEach((c, i) => ctx.print(pickerLine(ctx, c, i)));
  // What "editorial review" means, once, whenever one is offered (never claim more than the case records).
  if (cases.some((c) => c.review?.status === "editorial")) ctx.print(p.dim(ctx.t("picker.reviewLegend")));
  const rl = createInterface({ input: ctx.io.stdin, output: ctx.io.stdout, terminal: true });
  let closed = false;
  let waiting: ((answer: string | null) => void) | null = null;
  rl.on("close", () => {
    closed = true;
    waiting?.(null);
  });
  try {
    for (;;) {
      const answer = closed
        ? null
        : await new Promise<string | null>((resolve) => {
            waiting = resolve;
            rl.question(`${p.cyan("›")} ${ctx.t("picker.prompt", { n: cases.length })} `, (a) => resolve(a));
          });
      waiting = null;
      if (answer === null) throw new CliError(ctx.t("picker.cancelled"), EXIT.usage);
      const chosen = resolveChoice(answer, cases);
      if (chosen) return chosen.id;
      // No "did you mean <id>": that would show a diagnosis-bearing id.
      ctx.print(p.yellow(ctx.t("picker.invalid", { answer: answer.trim() })));
    }
  } finally {
    rl.close();
  }
}
