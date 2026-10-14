/**
 * Session bootstrap for front-end commands (play, exec, eval): wraps
 * `createNodeSession` and maps bootstrap problems to CLI exit codes.
 */
import { BootstrapError, createNodeSession, type CreateNodeSessionOptions, type LoadedContent } from "@clinicalcraft/agent/node";
import type { ClinicalSession } from "@clinicalcraft/agent";
import { CliError, EXIT, type CliContext } from "./context.js";

export interface OpenSessionOptions {
  caseId?: string;
  flags: Record<string, unknown>;
  resume?: string;
  facilityId?: string;
  transcript?: boolean;
  content?: LoadedContent;
}

/** Create a node session; unknown case/facility/session → usage error (exit 2). */
export async function openSession(ctx: CliContext, o: OpenSessionOptions): Promise<ClinicalSession> {
  const opts: CreateNodeSessionOptions = {
    cwd: ctx.cwd,
    env: ctx.env,
    flags: o.flags,
    ...(ctx.profile ? { profile: ctx.profile } : {}),
    ...(o.caseId ? { caseId: o.caseId } : {}),
    ...(o.resume ? { resume: o.resume } : {}),
    ...(o.facilityId ? { facilityId: o.facilityId } : {}),
    ...(o.transcript !== undefined ? { transcript: o.transcript } : {}),
    ...(o.content ? { content: o.content } : {}),
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
