/**
 * `clinicalcraft sessions list|show <id>` — recorded JSONL transcripts.
 */
import { BootstrapError, findSessionTranscript, listSessions, readTranscript } from "@clinicalcraft/agent/node";
import { replayTranscript, table, type TranscriptItem } from "@clinicalcraft/agent";
import { flagBool, flagPositiveInt, UsageError, type ParsedArgs } from "./argv.js";
import { CliError, EXIT, loadCliSettings, type CliContext } from "./context.js";
import { truncate } from "./render.js";

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
  for (const s of sessions) rows.push([s.id, s.caseId || "-", s.startedAt.replace("T", " ").replace(/\.\d+Z$/, "Z"), ctx.show(s.path)]);
  ctx.print(table(rows, { header: true, maxCell: 80 }));
  ctx.print(ctx.out.dim(ctx.t("sessions.resumeHint")));
  return EXIT.ok;
}

export async function sessionsShow(ctx: CliContext, args: ParsedArgs): Promise<number> {
  const ref = args.positionals[0];
  if (!ref) throw new UsageError(ctx.t("sessions.needId"));
  const settings = await loadCliSettings(ctx);
  let path: string;
  try {
    path = await findSessionTranscript(ref === "latest" ? "latest" : ref, ctx.env, settings.transcripts.dir);
  } catch (err) {
    if (err instanceof BootstrapError) throw new CliError(err.message, EXIT.usage);
    throw err;
  }
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
  for (const item of items) {
    switch (item.type) {
      case "session_meta":
        break;
      case "op": {
        const op = item.payload.op;
        if (op.type === "user_message" && op.text.trim()) ctx.print(`${p.bold(ctx.t("sessions.learner"))}${op.to ? p.dim(` → ${op.to}`) : ""}: ${op.text}`);
        else if (op.type === "slash_command") ctx.print(p.dim(`/${op.name} ${op.args}`));
        else if (op.type === "autopilot") ctx.print(p.dim(`/autopilot ${op.goal ?? ""}`));
        break;
      }
      case "event": {
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
  ctx.print();
  ctx.print(p.dim(ctx.t("sessions.summary", { actions: replayed.actions.length, items: items.length })));
  return EXIT.ok;
}
