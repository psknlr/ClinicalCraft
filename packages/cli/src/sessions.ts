/**
 * `clinicalcraft sessions list|show <id>` — recorded JSONL transcripts.
 */
import { basename } from "node:path";
import type { CaseDefinition } from "@clinicalcraft/core";
import { CaseLibrary, listSessions, readTranscript } from "@clinicalcraft/agent/node";
import { objectiveTitle, replayTranscript, table, type Op, type TranscriptItem } from "@clinicalcraft/agent";
import { flagBool, flagPositiveInt, UsageError, type ParsedArgs } from "./argv.js";
import { EXIT, loadCliSettings, type CliContext } from "./context.js";
import { sanitizeTerminal, truncate } from "./render.js";
import { resolveSessionRef } from "./session.js";

/** Recorded text for the terminal: transcripts (web uploads above all) are untrusted (`sanitizeTerminal`). */
function safe(value: unknown): string {
  return sanitizeTerminal(String(value ?? ""));
}

export async function sessionsList(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const settings = await loadCliSettings(ctx);
  const limit = flagPositiveInt(args, "limit", 10_000, ctx.locale) ?? 20;
  // Web uploads (`serve`'s POST /api/transcripts) are untrusted input: listed only on request.
  const web = flagBool(args, "web");
  const sessions = await listSessions(ctx.env, { dir: settings.transcripts.dir, limit, web });
  if (flagBool(args, "json")) {
    ctx.print(JSON.stringify(sessions, null, 2));
    return EXIT.ok;
  }
  if (sessions.length === 0) {
    ctx.print(ctx.out.dim(ctx.t("sessions.none")));
    return EXIT.ok;
  }
  const rows = [[ctx.t("col.id"), ctx.t("col.case"), ctx.t("col.started"), ctx.t("col.file")]];
  // A transcript without session_meta (e.g. a partial web upload) has its path as id: show the file name instead.
  // Every cell is terminal-sanitised: a web upload's session_meta (case id…) is untrusted text.
  for (const s of sessions) {
    rows.push([
      safe(`${s.id === s.path ? basename(s.path, ".jsonl") : s.id}${s.origin === "web" ? " (web)" : ""}`),
      safe(s.caseId || "-"),
      safe(s.startedAt.replace("T", " ").replace(/\.\d+Z$/, "Z")),
      safe(ctx.show(s.path)),
    ]);
  }
  ctx.print(table(rows, { header: true, maxCell: 80 }));
  ctx.print(ctx.out.dim(ctx.t("sessions.resumeHint")));
  return EXIT.ok;
}

export async function sessionsShow(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const ref = args.positionals[0];
  if (!ref) throw new UsageError(ctx.t("sessions.needId"));
  const settings = await loadCliSettings(ctx);
  const path = await resolveSessionRef(ctx, ref, settings.transcripts.dir);
  const items: TranscriptItem[] = await readTranscript(path);
  if (flagBool(args, "json")) {
    for (const item of items) ctx.print(JSON.stringify(item));
    return EXIT.ok;
  }
  const replayed = replayTranscript(items);
  const p = ctx.out;
  const meta = replayed.sessionMeta;
  // Objectives are named by their titles when the recorded case is installed (else by id).
  let caseDef: CaseDefinition | null = null;
  if (meta?.caseId) {
    try {
      // Only the recorded case is parsed and validated (not the whole library).
      const loaded = await (await CaseLibrary.open({ dirs: settings.contentDirs })).load(meta.caseId);
      caseDef = loaded.status === "ok" ? loaded.entry.def : null;
    } catch {
      caseDef = null;
    }
  }
  const objective = (id: string) => safe(caseDef ? objectiveTitle(caseDef, id, ctx.locale) : id);
  ctx.print(p.bold(safe(meta?.sessionId ?? ref)));
  if (meta) ctx.print(p.dim(ctx.t("sessions.meta", { caseId: safe(meta.caseId), version: safe(meta.caseVersion), provider: safe(meta.provider), model: safe(meta.model || "-"), locale: safe(meta.locale) })));
  ctx.print(p.dim(safe(path)));
  ctx.print();
  const printOp = (op: Op) => {
    if (op.type === "user_message" && op.text.trim()) ctx.print(`${p.bold(ctx.t("sessions.learner"))}${op.to ? p.dim(` → ${safe(op.to)}`) : ""}: ${safe(op.text)}`);
    else if (op.type === "slash_command") ctx.print(p.dim(`/${safe(op.name)} ${safe(op.args)}`));
    else if (op.type === "autopilot") ctx.print(p.dim(`/autopilot ${safe(op.goal ?? "")}`));
  };
  // Ops are recorded when submitted, which can be long before they run (queued
  // stream-json input): print each one just before the first event it caused.
  const queued = new Map<string, Op>();
  for (const item of items) {
    switch (item.type) {
      case "session_meta":
        break;
      case "op":
        queued.set(item.payload.id, item.payload.op);
        break;
      case "event": {
        const op = queued.get(item.payload.id);
        if (op) {
          queued.delete(item.payload.id);
          printOp(op);
        }
        const msg = item.payload.msg;
        if (msg.type === "agent_message" && String(msg.text ?? "").trim()) ctx.print(`${p.cyan(`${safe(msg.speaker || String(msg.agent))}:`)} ${safe(msg.text)}`);
        else if (msg.type === "tool_call_end") ctx.print(p.dim(`  ⏺ ${safe(msg.tool)} ${msg.ok ? "✓" : "✗"} ${truncate(safe(String(msg.output ?? "").split("\n")[0] ?? ""), 90)}`));
        else if (msg.type === "command_output" && String(msg.text ?? "").trim()) ctx.print(p.dim(`  ${truncate(safe(String(msg.text).trim().split("\n")[0] ?? ""), 100)}`));
        else if (msg.type === "clinical_event" && msg.event.type === "objective.completed") ctx.print(p.green(`  ✓ ${objective(msg.event.objectiveId)}`));
        else if (msg.type === "assessment") ctx.print(p.bold(ctx.t("sessions.score", { percent: safe(msg.report?.score?.percent) })));
        break;
      }
      default:
        break;
    }
  }
  for (const op of queued.values()) printOp(op);
  ctx.print();
  ctx.print(p.dim(ctx.t("sessions.summary", { actions: replayed.actions.length, items: items.length })));
  return EXIT.ok;
}
