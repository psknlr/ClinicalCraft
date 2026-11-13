/**
 * `verify_site` (docs/TEAM.md §4.5): the caller's own step of the operative site's verification, done with their own
 * body where it stands — a look at the skin mark, a document read, the patient asked, a discrepancy raised from what
 * they saw, the pause on the step the site names and its release, the site marked, a wrong document corrected, the
 * site confirmed — and a report to the colleague who asked them to verify. It is the agent's way to what a learner
 * does from the Team panel (the `team` op's `site` action): one writer, the session's site record
 * (`SiteVerification`). Offered only in a case whose team verifies a site; it acts only in in-world mode.
 */
import { t } from "@clinicalcraft/core";
import { rt } from "../session/i18n.js";
import type { SiteOutcome, SiteStep } from "../session/site.js";
import { strArg, type ToolArgs } from "./clinical-resolve.js";
import type { ToolContext, ToolDefinition } from "./types.js";

export const SITE_TOOL = "verify_site";

const STEPS = ["read", "raise", "mark", "amend", "confirm", "escalate", "pause", "resume", "report"] as const;

/** What `verify_site` needs from an in-world session. */
export interface SiteToolHost {
  /** The body acting for a call. */
  actorOf(ctx: ToolContext): string;
  /** The step, by that body, as the site record keeps it. */
  perform(actorId: string, step: SiteStep): SiteOutcome;
  /** Tell whoever asked this body to verify the site that it is done (their pending request), in these words. */
  report(actorId: string, text: string | null): { ok: boolean; output: string };
}

/** The step a call asks for, or null: not one, or what it is about is missing. */
function stepOf(args: ToolArgs): SiteStep | null {
  const source = strArg(args, "source");
  const side = strArg(args, "side");
  const reason = strArg(args, "reason");
  switch (strArg(args, "step")) {
    case "read":
      return source ? { step: "read", source } : null;
    case "raise": {
      const sources = Array.isArray(args.sources) ? (args.sources as unknown[]).filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim()) : [];
      return sources.length === 2 ? { step: "raise", sources: [sources[0]!, sources[1]!] } : null;
    }
    case "mark":
      return side ? { step: "mark", side } : null;
    case "amend":
      return source && side ? { step: "amend", source, to: side } : null;
    case "confirm":
      return { step: "confirm" };
    case "escalate":
      return { step: "escalate", ...(reason ? { reason } : {}) };
    case "pause":
      return { step: "pause", ...(reason ? { reason } : {}) };
    case "resume":
      return { step: "resume", ...(reason ? { reassessment: reason } : {}) };
    default:
      return null;
  }
}

/** What can be looked at and which sides there are, by id with their names (said with a call that names neither rightly). */
function vocabulary(ctx: ToolContext): string {
  const site = ctx.caseDef.team?.site;
  if (!site) return "";
  const L = ctx.locale;
  const sources = [`mark (${rt(L, "site.source.mark")})`, ...site.evidence.map((e) => `${e.id} (${t(e.name, L)})`)].join(", ");
  const sides = Object.entries(site.sides).map(([id, name]) => `${id} (${t(name, L)})`).join(", ");
  return rt(L, "site.tool.vocabulary", { sources, sides });
}

function definition(host: SiteToolHost | null): ToolDefinition<ToolArgs> {
  return {
    name: SITE_TOOL,
    description:
      "Verify the operative site with your own body, before the patient is anaesthetised (in-world mode; a case whose team verifies a site). Nothing is known of the skin mark or a document until someone looks. " +
      "step `read`: look at a `source` — `mark` (the skin mark: stand at the patient's side) or a piece of the site's evidence by id (a document or the imaging: in the patient's room; the patient: within talking distance, while they can speak) — and learn what it says. " +
      "`raise`: a discrepancy between two `sources` you have looked at yourself. `pause`: hold the step the site names, in your name (`reason` optional); `resume`: release your own hold. " +
      "`mark`: mark the site on a `side` (the operating surgeon only; at the patient's side). `amend`: correct a wrong document (`source`) to a `side` — never the evidence a discrepancy is verified against. " +
      "`confirm`: once you have looked at the mark and the evidence yourself and they agree (on a discrepancy: after the primary evidence was read again). `escalate`: it cannot be settled in the room (`reason`). " +
      "`report`: tell the colleague who asked you to verify that it is done (`text`: your words). case_status shows where the verification stands; a call that names an unknown source or side lists them.",
    inputSchema: {
      type: "object",
      properties: {
        step: { type: "string", enum: [...STEPS] },
        source: { type: "string", maxLength: 80, description: "`mark`, or the id of a piece of the site's evidence." },
        sources: { type: "array", items: { type: "string", maxLength: 80 }, minItems: 2, maxItems: 2, description: "`raise`: the two things that disagree." },
        side: { type: "string", maxLength: 80, description: "`mark` / `amend`: a side id." },
        reason: { type: "string", maxLength: 500 },
        text: { type: "string", maxLength: 500, description: "`report`: what you say." },
      },
      required: ["step"],
      additionalProperties: false,
    },
    readOnly: false,
    sideEffect: "record",
    scope: "history-only",
    risk: () => "none",
    summarize: (args, ctx) => rt(ctx.locale, "sum.verify_site", { step: strArg(args, "step"), what: strArg(args, "source") || strArg(args, "side") || (Array.isArray(args.sources) ? args.sources.join(" / ") : "") }).trim(),
    specifier: (args) => strArg(args, "step"),
    async run(args, ctx) {
      const L = ctx.locale;
      if (!ctx.caseDef.team?.site) return { ok: false, output: rt(L, "site.none") };
      if (!host) return { ok: false, output: rt(L, "site.noWorld") };
      const actor = host.actorOf(ctx);
      if (strArg(args, "step") === "report") {
        const r = host.report(actor, strArg(args, "text") || null);
        return { ok: r.ok, output: r.output, data: { step: "report" } };
      }
      const step = stepOf(args);
      if (!step) return { ok: false, output: `${rt(L, "site.tool.usage")} ${vocabulary(ctx)}`.trim() };
      const r = host.perform(actor, step);
      const unknown = r.data.rejected?.code === "unknown-id";
      return {
        ok: r.ok,
        output: unknown ? `${r.output} ${vocabulary(ctx)}`.trim() : r.output,
        data: { ...r.data, ...(r.code ? { code: r.code } : {}), ...(r.goal ? { hint: { goal: r.goal } } : {}), ...(r.seconds ? { seconds: r.seconds } : {}) },
      };
    },
  };
}

/** The site tool: bound to an in-world session's site record (`host`), or — without one — saying that it needs in-world mode. */
export function siteTools(host: SiteToolHost | null = null): ToolDefinition<ToolArgs>[] {
  return [definition(host)];
}
