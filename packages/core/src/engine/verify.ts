/**
 * `verifyCase` — proves a case is winnable by replaying its reference
 * solution (`clinicalcraft case verify`, test-suite).
 */
import type { CaseDefinition } from "../schema/case.js";
import { ClinicalActionSchema, type ClinicalAction } from "../schema/session.js";
import { assess } from "./assessment.js";
import { formatPath, issuesFromZodError } from "./parse.js";
import { progress } from "./queries.js";
import { replay } from "./reducer.js";
import type { Issue, VerifyResult } from "./types.js";

function parseSolution(c: CaseDefinition): { actions: ClinicalAction[]; sourceIndex: number[]; issues: Issue[] } {
  const actions: ClinicalAction[] = [];
  const sourceIndex: number[] = [];
  const issues: Issue[] = [];
  c.solution.forEach((raw, i) => {
    const parsed = ClinicalActionSchema.safeParse(raw);
    if (parsed.success) {
      actions.push(parsed.data);
      sourceIndex.push(i);
    } else {
      for (const issue of issuesFromZodError(parsed.error, raw)) {
        issues.push({ ...issue, path: formatPath(["solution", i, ...(issue.path ? issue.path.split(".") : [])]) });
      }
    }
  });
  if (actions[0]?.type !== "start") {
    actions.unshift({ type: "start" });
    sourceIndex.unshift(-1);
  }
  return { actions, sourceIndex, issues };
}

/**
 * Replay `c.solution` from a fresh session (a leading `start` is added when
 * missing). `ok` iff every action parses and is accepted, every objective is
 * done and every decision is decided. The assessment of the final state is
 * included.
 */
export function verifyCase(c: CaseDefinition): VerifyResult {
  const { actions, sourceIndex, issues } = parseSolution(c);
  const { state, rejections } = replay(c, actions);
  for (const r of rejections) {
    const index = sourceIndex[r.index];
    issues.push({
      path: index >= 0 ? formatPath(["solution", index]) : "solution",
      message: `${r.action.type} rejected (${r.code}): ${r.message}`,
      severity: "error",
    });
  }
  for (const objective of progress(c, state).objectives) {
    if (!objective.done) issues.push({ path: "solution", message: `objective "${objective.id}" is not completed by the solution`, severity: "error" });
  }
  for (const decision of c.decisions) {
    if (!Object.prototype.hasOwnProperty.call(state.decisions, decision.id)) {
      issues.push({ path: "solution", message: `decision "${decision.id}" is not answered correctly by the solution`, severity: "error" });
    }
  }
  return { ok: issues.every((i) => i.severity !== "error"), issues, finalState: state, assessment: assess(c, state) };
}
