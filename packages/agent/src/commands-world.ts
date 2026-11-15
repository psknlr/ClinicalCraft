/**
 * Slash commands of embodied mode (docs/EMBODIED.md): `/look`, `/where`,
 * `/find <query>`, `/go <target>`, `/inspect <target>`,
 * `/use <target> <operation> [key=value…]`, `/map`, `/skill [id] [key=value…]`,
 * `/delegate <who> <task> [target]`, `/transport <destination|home>`. Each runs its world tool as the
 * learner — validation, PreToolUse hooks, the approval gate (and, for an
 * operation with a clinical effect, the clinical tool's own gate) — exactly
 * like `/order` runs `order_test`. And the care team's (docs/TEAM.md §5): `/seat` (the learner's place, its controls,
 * who works where) and `/team [status|step|run|reply|ask|need|count|play|observe|pause|resume]` — each a `team` op of
 * the session, its refusals and warnings as the session says them. Registered only in embodied sessions; in a
 * clinical session they answer that they need embodied mode.
 */
import { POSITION_TITLES, t } from "@clinicalcraft/core";
import { splitArgs } from "./agents/markdown.js";
import type { SlashCommand } from "./agents/types.js";
import type { CommandHost } from "./commands.js";
import { rt, type RuntimeKey } from "./session/i18n.js";
import { owedByLearner } from "./session/team/awaits.js";
import { defaultReplyTarget, seatLines, teamLines, type AnswerWords, type TeamTextContext } from "./team-text.js";
import type { TeamOp } from "./team-tool.js";
import { ownPlaceWord } from "./tools/position-words.js";
import { DELEGATION_TASKS } from "./tools/world.js";

const NAMES = [
  ["look", ""],
  ["where", ""],
  ["find", "<query>"],
  ["go", "<target>"],
  ["inspect", "<target>"],
  ["use", "<target> <operation> [key=value…]"],
  ["map", ""],
  ["skill", "[id] [key=value…]"],
  ["delegate", "<who> <task> [port|region|instrument|item|destination]"],
  ["transport", "<destination|home>"],
  ["seat", ""],
  ["team", "[status|step|run|reply|ask|need|count|play|observe|pause|resume]"],
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
    case "transport":
      if (!args) usage(host, name, "<destination|home>");
      else await run("transport_patient", { destination: args });
      return true;
    case "delegate": {
      // whom: everything before the task — a role, a staff id or a position in words ("first assistant", "camera holder")
      const at = tokens.findIndex((tok, i) => i > 0 && (DELEGATION_TASKS as readonly string[]).includes(tok));
      const [role, task, target] = at > 0 ? [tokens.slice(0, at).join(" "), tokens[at], tokens[at + 1]] : tokens;
      if (!role || !task) {
        usage(host, name, "<who> <task> [port|region|instrument|item|destination]");
        return true;
      }
      // a position word naming the learner's own place names nobody else (the colleague standing by is named by name)
      const own = ownPlaceWord({ caseDef: host.caseDef, state: host.state() }, role);
      if (own) host.output(ownPlaceText(L, own), { error: "own-place", place: own });
      else await run("delegate_task", { role, task, ...(target ? { target } : {}) });
      return true;
    }
    case "seat": {
      const ctx = textContext(host);
      host.output(seatLines(ctx).join("\n"), { seat: host.state().seat ?? null, lineup: host.state().lineup ?? null });
      return true;
    }
    case "team":
      await teamCommand(host, args);
      return true;
    default:
      return false;
  }
}

/** "First assistant is your own place in the team: name a colleague." (docs/GLOSSARY.md "surgeon"). */
export function ownPlaceText(locale: string, place: keyof typeof POSITION_TITLES): string {
  const words = t(POSITION_TITLES[place], locale);
  return rt(locale, "staff.ownPlace", { place: words.charAt(0).toUpperCase() + words.slice(1) });
}

/** What the team's words are read from in a command. */
function textContext(host: CommandHost): TeamTextContext {
  return { caseDef: host.caseDef, facility: host.facility?.() ?? null, state: host.state(), locale: host.locale };
}

/** How the `/team` command tells the learner to answer. */
const COMMAND_WORDS: AnswerWords = {
  reply: (message, kind) => `/team reply ${message} ${kind}`,
  count: () => "/team count",
};

const REPLY_KINDS = ["readback", "confirm", "decline", "report"] as const;
/** What can be asked of a colleague in the field, as `/team ask` words it. */
const ASK_WORDS = ["traction", "release", "camera", "aim", "zoom", "closer", "wider", "pass"] as const;

/**
 * `/team ask <who> <request…>` → the `ask` op's `to` and `field` (the session checks both): whom — everything before the
 * request's word —, then traction `port structure direction[,direction] [force]`, release `[port]`, camera `[port]`,
 * aim `region [close|wide]`, zoom `close|wide`, closer, wider, pass `instrument`. Null: no request word after a name.
 */
export function teamAskArgs(tokens: readonly string[]): { to: string; field: Record<string, unknown> } | null {
  const at = tokens.findIndex((tok, i) => i > 0 && (ASK_WORDS as readonly string[]).includes(tok.toLowerCase()));
  if (at <= 0) return null;
  const to = tokens.slice(0, at).join(" ");
  const word = tokens[at]!.toLowerCase();
  const [a, b, c, d] = tokens.slice(at + 1);
  switch (word) {
    case "traction":
      return { to, field: { op: "traction", ...(a ? { port: a } : {}), ...(b ? { structure: b } : {}), ...(c ? { direction: c.split(",").filter(Boolean) } : {}), ...(d ? { force: d } : {}) } };
    case "release":
    case "camera":
      return { to, field: { op: word, ...(a ? { port: a } : {}) } };
    case "aim":
      return { to, field: { op: "aim", ...(a ? { region: a } : {}), ...(b ? { zoom: b } : {}) } };
    case "zoom":
      return { to, field: { op: "zoom", ...(a ? { zoom: a } : {}) } };
    case "closer":
    case "wider":
      return { to, field: { op: "zoom", zoom: word === "closer" ? "close" : "wide" } };
    default:
      return { to, field: { op: "pass", ...(a ? { instrument: a } : {}) } };
  }
}

/**
 * `/team …`: the care team from a text front-end (docs/TEAM.md §5) — every action a `team` op of the session, in this
 * command's turn, its refusals and warnings said by the session (an observer refusal naming `/team play`); then the team
 * now and what waits on the learner, with how to answer (`teamLines`). `status` (the default) only reads; `play` /
 * `observe` choose who plays the learner's part; a `reply` without a message answers the line the surgeon waits on the
 * learner for (else the one line said to them that waits for an answer).
 */
async function teamCommand(host: CommandHost, args: string): Promise<void> {
  const L = host.locale;
  const status = (action: string) => {
    const { lines, report } = teamLines(textContext(host), host.team?.() ?? null, COMMAND_WORDS);
    host.output(lines.join("\n"), { action, team: report });
  };
  if (!host.caseDef.team || !host.teamOp) {
    host.output(rt(L, "teamText.noTeam"), { error: "no-team" });
    return;
  }
  const tokens = splitArgs(args);
  const action = (tokens[0] ?? "status").toLowerCase();
  const rest = tokens.slice(1);
  const op = async (patch: Omit<TeamOp, "type">) => {
    await host.teamOp!({ type: "team", ...patch } as TeamOp);
    status(action);
  };
  switch (action) {
    case "status":
      return status(action);
    case "step":
    case "count":
    case "pause":
    case "resume":
      return op({ action });
    case "play":
      return op({ action: "surgeon", surgeon: "learner" });
    case "observe":
      return op({ action: "surgeon", surgeon: "simulated" });
    case "run": {
      const rounds = rest[0] !== undefined ? Number(rest[0]) : undefined;
      if (rounds !== undefined && !(Number.isInteger(rounds) && rounds > 0)) return host.output(rt(L, "cmd.usage", { name: "team", hint: rt(L, "teamCmd.usage.run").replace(/^\/team /u, "") }), { error: "usage" });
      // a run stops where the stand-in waits on the learner (`awaitedLine`): while their answer or their count is still
      // owed it does not start — the team now, and how to answer
      const cp = host.team?.() ?? null;
      if (cp && owedByLearner(cp.state, cp.surgeon)) return status(action);
      return op({ action: "run", ...(rounds !== undefined ? { rounds } : {}) });
    }
    case "need": {
      const [item, forRef] = rest;
      if (!item) return host.output(rt(L, "cmd.usage", { name: "team", hint: rt(L, "teamCmd.usage.need").replace(/^\/team /u, "") }), { error: "usage" });
      return op({ action: "need", item, ...(forRef ? { for: forRef } : {}) });
    }
    case "ask": {
      const asked = teamAskArgs(rest);
      if (!asked) return host.output(rt(L, "cmd.usage", { name: "team", hint: rt(L, "teamCmd.usage.ask").replace(/^\/team /u, "") }), { error: "usage" });
      return op({ action: "ask", to: asked.to, field: asked.field as unknown as TeamOp["field"] });
    }
    case "reply": {
      // reply [message] <kind> [words…] — the words as typed (spaces kept)
      const m = /^\s*\S+\s+(?:(\S+)\s+)?(readback|confirm|decline|report)(?:\s+([\s\S]*))?$/iu.exec(args);
      const lone = /^\s*\S+\s+(readback|confirm|decline|report)(?:\s+([\s\S]*))?$/iu.exec(args);
      const kindOf = (k: string) => k.toLowerCase() as (typeof REPLY_KINDS)[number];
      const parsed = lone ? { message: null, kind: kindOf(lone[1]!), text: lone[2] } : m ? { message: m[1] ?? null, kind: kindOf(m[2]!), text: m[3] } : null;
      if (!parsed) return host.output(rt(L, "cmd.usage", { name: "team", hint: rt(L, "teamCmd.usage.reply").replace(/^\/team /u, "") }), { error: "usage" });
      const cp = host.team?.() ?? null;
      const message = parsed.message ?? (cp ? defaultReplyTarget(cp) : null);
      if (!message) return host.output(rt(L, "teamCmd.noAwaited"), { error: "no-message" });
      return op({ action: "reply", message, kind: parsed.kind, ...(parsed.text?.trim() ? { text: parsed.text.trim() } : {}) });
    }
    default:
      return host.output(rt(L, "teamCmd.unknown", { action }), { error: "usage" });
  }
}
