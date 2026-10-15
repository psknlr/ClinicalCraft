/**
 * `clinicalcraft trust [--revoke | --list]`: the user-only trust decision for
 * the project containing `--cwd` (docs/PROTOCOL.md §7). Until a project is
 * trusted, the command hooks, provider headers and secret-bearing keys of its
 * `.clinicalcraft/settings.json` / `settings.local.json` are ignored; the
 * trust is pinned to a digest of both files, so editing either one needs a
 * fresh `clinicalcraft trust`.
 */
import { listTrustedProjects, readProjectSettingsTexts, revokeProjectTrust, trustProject, trustRootFor } from "@clinicalcraft/agent/node";
import { flagBool, type ParsedArgs } from "./argv.js";
import { EXIT, type CliContext } from "./context.js";

/** Hook commands declared in a settings JSON text (for review before trusting). */
export function hookCommandsIn(text: string | null): string[] {
  if (!text) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    return [];
  }
  const out: string[] = [];
  const visit = (hooks: unknown, prefix: string) => {
    if (!hooks || typeof hooks !== "object" || Array.isArray(hooks)) return;
    for (const [event, matchers] of Object.entries(hooks as Record<string, unknown>)) {
      if (!Array.isArray(matchers)) continue;
      for (const matcher of matchers) {
        const list = (matcher as { hooks?: unknown })?.hooks;
        if (!Array.isArray(list)) continue;
        for (const h of list) {
          const command = (h as { command?: unknown })?.command;
          if (typeof command === "string") out.push(`${prefix}${event}: ${command}`);
        }
      }
    }
  };
  const obj = parsed as { hooks?: unknown; profiles?: Record<string, { hooks?: unknown }> } | null;
  visit(obj?.hooks, "");
  if (obj?.profiles && typeof obj.profiles === "object") {
    for (const [name, profile] of Object.entries(obj.profiles)) visit(profile?.hooks, `[profile ${name}] `);
  }
  return out;
}

export async function runTrust(ctx: CliContext, args: ParsedArgs): Promise<number> {
  if (flagBool(args, "list")) {
    const projects = await listTrustedProjects(ctx.env);
    if (flagBool(args, "json")) ctx.print(JSON.stringify(projects, null, 2));
    else if (projects.length === 0) ctx.print(ctx.t("trust.none"));
    else for (const p of projects) ctx.print(ctx.t("trust.listLine", { root: p.root, at: p.trustedAt }));
    return EXIT.ok;
  }
  if (flagBool(args, "revoke")) {
    const result = await revokeProjectTrust(ctx.cwd, ctx.env);
    ctx.print(ctx.t(result.removed ? "trust.revoked" : "trust.notTrusted", { root: result.root }));
    return EXIT.ok;
  }
  const root = trustRootFor(ctx.cwd, ctx.env);
  const texts = await readProjectSettingsTexts(root);
  const commands = [...hookCommandsIn(texts.project), ...hookCommandsIn(texts.local)];
  // Pinned to the texts whose hook commands are listed below — not to a second read of the files.
  const trusted = await trustProject(ctx.cwd, ctx.env, undefined, texts);
  ctx.print(ctx.t("trust.trusted", { root: trusted.root }));
  if (commands.length > 0) {
    ctx.print(ctx.t("trust.hooks"));
    for (const c of commands) ctx.print(`  ${c}`);
  }
  ctx.print(ctx.out.dim(ctx.t("trust.pinned")));
  return EXIT.ok;
}
