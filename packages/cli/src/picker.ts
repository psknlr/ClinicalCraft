/**
 * Interactive case picker (play without a case): numbered list with
 * locale-aware, spoiler-free titles (never the ids, which name the
 * diagnosis); accepts a number, an id or a unique id prefix.
 */
import { createInterface } from "node:readline";
import { t, type CaseDefinition } from "@clinicalcraft/core";
import { loadContent, type LoadedContent } from "@clinicalcraft/agent/node";
import { CliError, EXIT, type CliContext } from "./context.js";
import { caseChoiceMeta } from "./labels.js";

export { caseChoiceMeta, stars } from "./labels.js";

/**
 * Cases in library order — published cases first, then by difficulty, then
 * by id (code-unit order) — the same order as the web library, independent
 * of the UI language and of load order, so `cases list` and the picker's
 * numbers are stable. `locale` is accepted for API compatibility only.
 */
export function sortedCases(content: LoadedContent, _locale?: string): CaseDefinition[] {
  const published = (c: CaseDefinition) => Number(c.provenance.kind === "published-case");
  return [...content.cases.values()]
    .map((e) => e.def)
    .sort((a, b) => published(b) - published(a) || a.difficulty - b.difficulty || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Resolve a picker answer (1-based number, id or unique prefix) against a list. */
export function resolveChoice(answer: string, cases: readonly CaseDefinition[]): CaseDefinition | null {
  const a = answer.trim();
  if (!a) return null;
  if (/^\d+$/.test(a)) return cases[Number(a) - 1] ?? null;
  const exact = cases.find((c) => c.id === a);
  if (exact) return exact;
  const prefixed = cases.filter((c) => c.id.startsWith(a));
  return prefixed.length === 1 ? prefixed[0]! : null;
}

/** Ask the learner to choose a case. Non-TTY stdin → usage error listing the ids. */
export async function pickCase(ctx: CliContext, contentDirs: readonly string[]): Promise<string> {
  const content = await loadContent({ dirs: contentDirs });
  const cases = sortedCases(content, ctx.locale);
  if (cases.length === 0) throw new CliError(ctx.t("picker.none"), EXIT.error);
  if (!ctx.io.stdin.isTTY) {
    throw new CliError(ctx.t("picker.needCase"), EXIT.usage, cases.map((c) => c.id).join(", "));
  }
  const p = ctx.out;
  ctx.print(p.bold(ctx.t("picker.title")));
  cases.forEach((c, i) => {
    const num = String(i + 1).padStart(2, " ");
    // Titles are spoiler-free; ids name the diagnosis (stemi-inferior-rv…), so the list never shows them
    // (typing an id still works, for those who know it).
    ctx.print(`${p.dim(num)}. ${t(c.title, ctx.locale)} ${p.dim(caseChoiceMeta(ctx, c))}`);
  });
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
