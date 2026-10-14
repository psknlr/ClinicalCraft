/**
 * Help text generated from the command tree (bilingual).
 */
import { displayWidth } from "@clinicalcraft/agent";
import type { Palette } from "./ansi.js";
import type { FlagSpec, Localized } from "./argv.js";
import type { CommandSpec } from "./commands.js";
import { GLOBAL_FLAGS } from "./flags.js";
import { m } from "./i18n.js";

function loc(text: Localized, L: string): string {
  return L.toLowerCase().startsWith("zh") ? text.zh : text.en;
}

function pad(text: string, width: number): string {
  return text + " ".repeat(Math.max(1, width - displayWidth(text)));
}

function flagLabel(f: FlagSpec): string {
  const names = [f.short ? `-${f.short}` : null, `--${f.name}`].filter(Boolean).join(", ");
  return f.type === "boolean" ? names : `${names} ${f.valueName ?? "<value>"}`;
}

function flagLines(flags: readonly FlagSpec[], L: string): string[] {
  const visible = flags.filter((f) => !f.hidden);
  const width = Math.min(34, Math.max(...visible.map((f) => displayWidth(flagLabel(f)) + 4), 12));
  return visible.map((f) => `  ${pad(flagLabel(f), width)}${loc(f.description, L)}`);
}

/** Help for the command at `path` (root first). */
export function renderHelp(path: readonly CommandSpec[], L: string, p: Palette, version: string): string {
  const node = path[path.length - 1]!;
  const isRoot = path.length === 1;
  const names = path.slice(1).map((c) => c.name);
  const lines: string[] = [];
  if (isRoot) lines.push(`${p.bold("clinicalcraft")} ${version} — ${loc(node.summary, L)}`, "");
  else lines.push(loc(node.summary, L), "");

  const usageTail = node.subcommands ? "<command>" : node.usage ?? "";
  lines.push(`${p.bold(m(L, "help.usage"))} clinicalcraft ${[...names, usageTail].filter(Boolean).join(" ")} [${m(L, "help.optionsWord")}]`);
  if (isRoot) {
    lines.push(`       clinicalcraft [case]                ${p.dim(m(L, "help.shortPlay"))}`);
    lines.push(`       clinicalcraft -p <prompt> [options] ${p.dim(m(L, "help.shortExec"))}`);
    lines.push(`       clinicalcraft --continue | --resume <id>`);
  }
  lines.push("");

  if (node.subcommands) {
    lines.push(p.bold(m(L, "help.commands")));
    const labels = node.subcommands.map((c) => `${c.name}${c.usage ? ` ${c.usage}` : ""}`);
    const width = Math.min(40, Math.max(...labels.map((l) => displayWidth(l))) + 3);
    node.subcommands.forEach((c, i) => {
      const alias = c.aliases?.length ? p.dim(` (${c.aliases.join(", ")})`) : "";
      const def = node.defaultSubcommand === c.name ? p.dim(` [${m(L, "help.default")}]`) : "";
      lines.push(`  ${pad(labels[i]!, width)}${loc(c.summary, L)}${alias}${def}`);
    });
    lines.push("");
  }

  const own = [...path.slice(1, -1).flatMap((c) => c.flags ?? []), ...(node.flags ?? [])];
  if (own.length > 0) {
    lines.push(p.bold(m(L, "help.options")));
    lines.push(...flagLines(own, L));
    lines.push("");
  }
  lines.push(p.bold(m(L, "help.globalOptions")));
  lines.push(...flagLines(GLOBAL_FLAGS, L));

  if (node.examples?.length) {
    lines.push("", p.bold(m(L, "help.examples")));
    for (const ex of node.examples) lines.push(`  ${ex}`);
  }
  if (isRoot) {
    lines.push("", p.dim(m(L, "help.more")));
    lines.push(p.dim(m(L, "help.exitCodes")));
  } else if (node.name === "exec") {
    lines.push("", p.dim(m(L, "help.headlessApprovals")));
    lines.push(p.dim(m(L, "help.exitCodes")));
  }
  return lines.join("\n");
}
