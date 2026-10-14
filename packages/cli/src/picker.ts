/**
 * Interactive case picker (play without a case): numbered list with
 * locale-aware titles; accepts a number, an id or a unique id prefix.
 */
import { createInterface } from "node:readline";
import { t, type CaseDefinition } from "@clinicalcraft/core";
import { loadContent, type LoadedContent } from "@clinicalcraft/agent/node";
import { suggest } from "./argv.js";
import { CliError, EXIT, type CliContext } from "./context.js";

/** Difficulty as stars (★★☆☆☆). */
export function stars(difficulty: number): string {
  const n = Math.max(0, Math.min(5, Math.round(difficulty)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

/** Cases sorted by title in the given locale. */
export function sortedCases(content: LoadedContent, locale: string): CaseDefinition[] {
  return [...content.cases.values()].map((e) => e.def).sort((a, b) => t(a.title, locale).localeCompare(t(b.title, locale), locale));
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
    ctx.print(`${p.dim(num)}. ${t(c.title, ctx.locale)} ${p.dim(`(${c.id}) ${stars(c.difficulty)} · ${c.setting}`)}`);
  });
  const rl = createInterface({ input: ctx.io.stdin, output: ctx.io.stdout, terminal: true });
  try {
    for (;;) {
      const answer = await new Promise<string | null>((resolve) => {
        rl.question(`${p.cyan("›")} ${ctx.t("picker.prompt", { n: cases.length })} `, resolve);
        rl.once("close", () => resolve(null));
      });
      if (answer === null) throw new CliError(ctx.t("picker.cancelled"), EXIT.usage);
      const chosen = resolveChoice(answer, cases);
      if (chosen) return chosen.id;
      const hint = suggest(answer.trim(), cases.map((c) => c.id));
      ctx.print(p.yellow(ctx.t("picker.invalid", { answer: answer.trim() })) + (hint ? p.dim(` ${ctx.t("argv.didYouMean", { value: hint })}`) : ""));
    }
  } finally {
    rl.close();
  }
}
