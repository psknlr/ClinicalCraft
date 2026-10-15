/**
 * `clinicalcraft sessions list|show <id>` — recorded JSONL transcripts.
 */
import { basename } from "node:path";
import { listSessions, readTranscript } from "@clinicalcraft/agent/node";
import { replayTranscript, table, type Op, type TranscriptItem } from "@clinicalcraft/agent";
import { flagBool, flagPositiveInt, UsageError, type ParsedArgs } from "./argv.js";
import { EXIT, loadCliSettings, type CliContext } from "./context.js";
import { truncate } from "./render.js";
import { resolveSessionRef } from "./session.js";

export async function sessionsList(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const settings = await loadCliSettings(ctx);
  const limit = flagPositiveInt(args, "limit", 10_000, ctx.locale) ?? 20;
  const sessions = await listSessions(ctx.env, { dir: settings.transcripts.dir, limit });
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
  for (const s of sessions) rows.push([s.id === s.path ? basename(s.path, ".jsonl") : s.id, s.caseId || "-", s.startedAt.replace("T", " ").replace(/\.\d+Z$/, "Z"), ctx.show(s.path)]);
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
  ctx.print(p.bold(`${meta?.sessionId ?? ref}`));
  if (meta) ctx.print(p.dim(ctx.t("sessions.meta", { caseId: meta.caseId, version: meta.caseVersion, provider: meta.provider, model: meta.model || "-", locale: meta.locale })));
  ctx.print(p.dim(path));
  ctx.print();
  const printOp = (op: Op) => {
    if (op.type === "user_message" && op.text.trim()) ctx.print(`${p.bold(ctx.t("sessions.learner"))}${op.to ? p.dim(` → ${op.to}`) : ""}: ${op.text}`);
    else if (op.type === "slash_command") ctx.print(p.dim(`/${op.name} ${op.args}`));
    else if (op.type === "autopilot") ctx.print(p.dim(`/autopilot ${op.goal ?? ""}`));
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
        if (msg.type === "agent_message" && msg.text.trim()) ctx.print(`${p.cyan(`${msg.speaker || String(msg.agent)}:`)} ${msg.text}`);
        else if (msg.type === "tool_call_end") ctx.print(p.dim(`  ⏺ ${msg.tool} ${msg.ok ? "✓" : "✗"} ${truncate(msg.output.split("\n")[0] ?? "", 90)}`));
        else if (msg.type === "clinical_event" && msg.event.type === "objective.completed") ctx.print(p.green(`  ✓ ${msg.event.objectiveId}`));
        else if (msg.type === "assessment") ctx.print(p.bold(ctx.t("sessions.score", { percent: msg.report.score.percent })));
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
