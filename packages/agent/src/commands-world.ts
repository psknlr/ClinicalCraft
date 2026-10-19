/**
 * Slash commands of embodied mode (docs/EMBODIED.md): `/look`, `/where`,
 * `/find <query>`, `/go <target>`, `/inspect <target>`,
 * `/use <target> <operation> [key=value…]`, `/map`, `/skill [id] [key=value…]`,
 * `/delegate <role> <task> [target]`. Each runs its world tool as the
 * learner — validation, PreToolUse hooks, the approval gate (and, for an
 * operation with a clinical effect, the clinical tool's own gate) — exactly
 * like `/order` runs `order_test`. Registered only in embodied sessions; in
 * a clinical session they answer that they need embodied mode.
 */
import { splitArgs } from "./agents/markdown.js";
import type { SlashCommand } from "./agents/types.js";
import type { CommandHost } from "./commands.js";
import { rt, type RuntimeKey } from "./session/i18n.js";

const NAMES = [
  ["look", ""],
  ["where", ""],
  ["find", "<query>"],
  ["go", "<target>"],
  ["inspect", "<target>"],
  ["use", "<target> <operation> [key=value…]"],
  ["map", ""],
  ["skill", "[id] [key=value…]"],
  ["delegate", "<role> <task> [target]"],
] as const;

/** Names of the embodied slash commands. */
export const EMBODIED_COMMAND_NAMES: readonly string[] = NAMES.map(([name]) => name);

/** The embodied slash commands (descriptions in English; `/help` localises them). */
export const EMBODIED_COMMANDS: readonly SlashCommand[] = NAMES.map(([name, hint]) => ({
  name,
  description: rt("en", `cmd.${name}` as RuntimeKey),
  ...(hint ? { argumentHint: hint } : {}),
  source: "builtin" as const,
}));

/** `key=value` tokens → an object (numbers, booleans and JSON parsed; `goal=<target>` → an interact goal). */
export function keyValues(tokens: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const tok of tokens) {
    const eq = tok.indexOf("=");
    if (eq <= 0) continue;
    const key = tok.slice(0, eq).trim();
    const raw = tok.slice(eq + 1).trim();
    let value: unknown = raw;
    if (/^-?\d+(\.\d+)?$/.test(raw)) value = Number(raw);
    else if (raw === "true" || raw === "false") value = raw === "true";
    else if (/^[{[]/.test(raw)) {
      try {
        value = JSON.parse(raw);
      } catch {
        value = raw;
      }
    }
    if (key === "goal" && typeof value === "string") value = { kind: "interact", id: value };
    out[key] = value;
  }
  return out;
}

function usage(host: CommandHost, name: string, hint: string): void {
  host.output(rt(host.locale, "cmd.usage", { name, hint }), { error: "usage" });
}

/**
 * Run an embodied command. Returns false when `name` is not one (the caller
 * goes on with its own commands).
 */
export async function executeEmbodiedCommand(host: CommandHost, name: string, args: string): Promise<boolean> {
  if (!EMBODIED_COMMAND_NAMES.includes(name)) return false;
  const L = host.locale;
  if (!host.embodied?.()) {
    host.output(rt(L, "cmd.embodiedOnly", { name }), { error: "not-embodied" });
    return true;
  }
  const run = async (tool: string, toolArgs: Record<string, unknown>, header?: string) => {
    const out = await host.runTool(tool, toolArgs);
    host.output(header && out.ok ? `${header}\n${out.output}` : out.output, { ok: out.ok, data: out.data ?? null });
  };
  const tokens = splitArgs(args);
  switch (name) {
    case "look":
      await run("observe_world", {});
      return true;
    case "where":
      await run("get_agent_state", {});
      return true;
    case "find":
      if (!args) usage(host, name, "<query>");
      else await run("find_entities", { name: args, limit: 15 });
      return true;
    case "go":
      if (!args) usage(host, name, "<target>");
      else await run("navigate_to", { target: args });
      return true;
    case "inspect":
      if (!args) usage(host, name, "<target>");
      else await run("inspect_object", { target: args });
      return true;
    case "use": {
      const [target, operation, ...rest] = tokens;
      if (!target || !operation) usage(host, name, "<target> <operation> [key=value…]");
      else {
        const parameters = keyValues(rest);
        await run("interact_object", { target, operation, ...(Object.keys(parameters).length ? { parameters } : {}) });
      }
      return true;
    }
    case "map":
      await run("find_entities", { kind: "room", limit: 50 }, rt(L, "cmd.map.header"));
      return true;
    case "skill": {
      const [id, ...rest] = tokens;
      if (!id) {
        const skills = host.skills?.() ?? [];
        host.output([rt(L, "cmd.skills.list"), ...skills.map((s) => `  ${s.id} — ${s.name}`)].join("\n"), { skills });
        return true;
      }
      const params = keyValues(rest);
      await run("execute_skill", { skill_id: id, ...(Object.keys(params).length ? { params } : {}) });
      return true;
    }
    case "delegate": {
      const [role, task, target] = tokens;
      if (!role || !task) usage(host, name, "<role> <task> [target]");
      else await run("delegate_task", { role, task, ...(target ? { target } : {}) });
      return true;
    }
    default:
      return false;
  }
}
