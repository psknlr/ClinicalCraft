/**
 * Session bootstrap for front-end commands (play, exec, eval): wraps
 * `createNodeSession` and maps bootstrap problems to CLI exit codes.
 *
 * The common user errors (unknown case or facility, no case, unknown or
 * ambiguous session id, `--resume` of another case's session) are checked
 * here first so they get a localised message and a "did you mean" hint;
 * `BootstrapError`'s own messages are English-only.
 */
import {
  BootstrapError,
  createNodeSession,
  findSessionTranscript,
  listSessions,
  loadContent,
  readTranscript,
  type CreateNodeSessionOptions,
  type LoadedContent,
} from "@clinicalcraft/agent/node";
import type { ClinicalSession } from "@clinicalcraft/agent";
import { suggest } from "./argv.js";
import { CliError, contentDirsHint, EXIT, hints, loadCliSettings, type CliContext } from "./context.js";

export interface OpenSessionOptions {
  caseId?: string;
  flags: Record<string, unknown>;
  resume?: string;
  facilityId?: string;
  transcript?: boolean;
  content?: LoadedContent;
}

/**
 * Resolve `--resume <ref>` (`latest`, a session id or unique prefix, or a
 * `.jsonl` path) to a transcript path; failures are localised usage errors.
 */
export async function resolveSessionRef(ctx: CliContext, ref: string, dir: string | null): Promise<string> {
  try {
    return await findSessionTranscript(ref, ctx.env, dir);
  } catch (err) {
    if (!(err instanceof BootstrapError)) throw err;
    const sessions = await listSessions(ctx.env, { dir });
    if (sessions.length === 0) throw new CliError(ctx.t("sessions.noneToResume"), EXIT.usage);
    const prefixed = sessions.filter((s) => s.id.startsWith(ref)).map((s) => s.id);
    if (prefixed.length > 1) throw new CliError(ctx.t("sessions.ambiguous", { id: ref, list: prefixed.slice(0, 5).join(", ") }), EXIT.usage);
    const hint = suggest(ref, sessions.map((s) => s.id));
    throw new CliError(ctx.t("sessions.unknown", { id: ref }), EXIT.usage, hint ? ctx.t("argv.didYouMean", { value: hint }) : ctx.t("sessions.resumeHint"));
  }
}

/** Case id recorded in a transcript's `session_meta` (null when absent or unreadable). */
async function transcriptCaseId(path: string): Promise<{ sessionId: string; caseId: string } | null> {
  try {
    const items = await readTranscript(path);
    const meta = items.find((i) => i.type === "session_meta");
    return meta && meta.type === "session_meta" ? { sessionId: meta.payload.sessionId, caseId: meta.payload.caseId } : null;
  } catch {
    return null;
  }
}

/** Localised checks of the case, facility and resume reference before bootstrapping. */
async function preflight(ctx: CliContext, o: OpenSessionOptions): Promise<{ content: LoadedContent; resume?: string }> {
  const settings = await loadCliSettings(ctx, o.flags);
  const content = o.content ?? (await loadContent({ dirs: settings.contentDirs }));
  let resume: string | undefined;
  let resumedCase: string | null = null;
  if (o.resume !== undefined) {
    resume = await resolveSessionRef(ctx, o.resume, settings.transcripts.dir);
    const meta = await transcriptCaseId(resume);
    resumedCase = meta?.caseId ?? null;
    if (meta && o.caseId && o.caseId !== meta.caseId) {
      throw new CliError(ctx.t("sessions.caseMismatch", { id: meta.sessionId, caseId: meta.caseId, requested: o.caseId }), EXIT.usage);
    }
  }
  const caseIds = [...content.cases.keys()].sort();
  const caseId = o.caseId ?? resumedCase ?? settings.defaultCase ?? null;
  if (!caseId) throw new CliError(ctx.t("cases.noneSelected"), EXIT.usage, ctx.t("cases.available", { list: caseIds.join(", ") }));
  if (!content.cases.has(caseId)) {
    const hint = suggest(caseId, caseIds);
    throw new CliError(ctx.t("cases.unknown", { id: caseId }), EXIT.usage, hints(hint ? ctx.t("argv.didYouMean", { value: hint }) : ctx.t("cases.available", { list: caseIds.join(", ") }), contentDirsHint(ctx, content)));
  }
  if (o.facilityId && !content.facilities.has(o.facilityId)) {
    const ids = [...content.facilities.keys()].sort();
    const hint = suggest(o.facilityId, ids);
    throw new CliError(ctx.t("facilities.unknown", { id: o.facilityId }), EXIT.usage, hints(hint ? ctx.t("argv.didYouMean", { value: hint }) : ctx.t("facilities.available", { list: ids.join(", ") }), contentDirsHint(ctx, content)));
  }
  return { content, ...(resume !== undefined ? { resume } : {}) };
}

/** Create a node session; unknown case/facility/session → usage error (exit 2). */
export async function openSession(ctx: CliContext, o: OpenSessionOptions): Promise<ClinicalSession> {
  const checked = await preflight(ctx, o);
  const opts: CreateNodeSessionOptions = {
    cwd: ctx.cwd,
    env: ctx.env,
    flags: o.flags,
    ...(ctx.profile ? { profile: ctx.profile } : {}),
    ...(o.caseId ? { caseId: o.caseId } : {}),
    ...(checked.resume !== undefined ? { resume: checked.resume } : {}),
    ...(o.facilityId ? { facilityId: o.facilityId } : {}),
    ...(o.transcript !== undefined ? { transcript: o.transcript } : {}),
    content: checked.content,
  };
  try {
    const session = await createNodeSession(opts);
    ctx.debug(`session ${session.id} · case ${session.caseDef.id} · provider ${session.settings.provider}`);
    return session;
  } catch (err) {
    if (err instanceof BootstrapError) throw new CliError(err.message, EXIT.usage);
    const message = (err as Error).message ?? String(err);
    if (/profile/i.test(message) && /unknown/i.test(message)) throw new CliError(message, EXIT.usage);
    throw new CliError(message, EXIT.error);
  }
}
