/**
 * Static checks of a case's procedure (docs/PROCEDURE.md §2), run by `checkCaseIntegrity`: every id a
 * structure, region, plan or view names exists; port plans reach the target; procedure conditions
 * name things the procedure has.
 */
import type { CaseDefinition } from "../../schema/case.js";
import type { ProcedurePredicate } from "../../schema/common.js";
import { TUBULAR_KINDS } from "../../schema/procedure.js";
import { formatPath } from "../parse.js";
import type { Issue } from "../types.js";
import { portReport } from "./geometry.js";

type PathPart = string | number;
const err = (path: readonly PathPart[], message: string): Issue => ({ path: formatPath(path), message, severity: "error" });
const warn = (path: readonly PathPart[], message: string): Issue => ({ path: formatPath(path), message, severity: "warning" });

/** The definition's internal references and geometry. */
export function checkProcedureDefinition(c: CaseDefinition): Issue[] {
  const def = c.procedure;
  if (!def) return [];
  const base = ["procedure"];
  const issues: Issue[] = [];
  const structures = new Set(def.anatomy.map((s) => s.id));
  const regions = new Set(def.regions.map((r) => r.id));
  const sites = new Set(def.portSites.map((p) => p.id));
  const phases = new Set(c.phases.map((p) => p.id));
  const dup = (list: { id: string }[], what: string, path: PathPart[]) => {
    const seen = new Set<string>();
    list.forEach((x, i) => {
      if (seen.has(x.id)) issues.push(err([...path, i, "id"], `duplicate ${what} "${x.id}"`));
      seen.add(x.id);
    });
  };
  dup(def.anatomy, "structure", [...base, "anatomy"]);
  dup(def.regions, "region", [...base, "regions"]);
  dup(def.portSites, "port site", [...base, "portSites"]);
  dup(def.portPlans, "port plan", [...base, "portPlans"]);
  dup(def.views, "safety view", [...base, "views"]);
  def.phases.forEach((p, i) => {
    if (!phases.has(p)) issues.push(err([...base, "phases", i], `unknown phase "${p}"`));
  });
  if (!structures.has(def.specimen)) issues.push(err([...base, "specimen"], `unknown structure "${def.specimen}"`));
  def.anatomy.forEach((s, i) => {
    const at = [...base, "anatomy", i];
    for (const [key, id] of [["parent", s.parent], ["enters", s.enters]] as const)
      if (id != null && !structures.has(id)) issues.push(err([...at, key], `unknown structure "${id}"`));
    s.joins.forEach((j, k) => {
      if (!structures.has(j)) issues.push(err([...at, "joins", k], `unknown structure "${j}"`));
    });
    if (s.in != null && !regions.has(s.in)) issues.push(err([...at, "in"], `unknown region "${s.in}"`));
    if (TUBULAR_KINDS.includes(s.kind) && s.points.length < 2) issues.push(err([...at, "points"], "a duct or vessel needs a centreline of at least two points"));
    if (TUBULAR_KINDS.includes(s.kind) && !s.appearsAs) issues.push(warn([...at, "appearsAs"], "a duct or vessel should say what it looks like (operators see handles, not names)"));
    s.appearsAs?.when.forEach((w, k) => {
      if (!regions.has(w.exposure)) issues.push(err([...at, "appearsAs", "when", k, "exposure"], `unknown region "${w.exposure}"`));
      if (w.appearsToEnter != null && !structures.has(w.appearsToEnter)) issues.push(err([...at, "appearsAs", "when", k, "appearsToEnter"], `unknown structure "${w.appearsToEnter}"`));
    });
    if (s.role === "target" && !TUBULAR_KINDS.includes(s.kind)) issues.push(err([...at, "role"], "only ducts and vessels can be targets"));
  });
  def.regions.forEach((r, i) => {
    const at = [...base, "regions", i];
    r.after.forEach((a, k) => {
      if (!regions.has(a)) issues.push(err([...at, "after", k], `unknown region "${a}"`));
    });
    r.exposure.forEach((e, k) => {
      if (!structures.has(e.structure)) issues.push(err([...at, "exposure", k, "structure"], `unknown structure "${e.structure}"`));
    });
    r.hazards.forEach((h, k) => {
      if (!structures.has(h)) issues.push(err([...at, "hazards", k], `unknown structure "${h}"`));
    });
  });
  def.portPlans.forEach((plan, i) => {
    const at = [...base, "portPlans", i];
    plan.ports.forEach((p, k) => {
      if (!sites.has(p.site)) issues.push(err([...at, "ports", k, "site"], `unknown port site "${p.site}"`));
    });
    if (!plan.ports.some((p) => p.role === "camera")) issues.push(err([...at, "ports"], "a port plan needs a camera port"));
    if (plan.ports.every((p) => sites.has(p.site)) && portReport(def, plan).warnings.includes("out-of-reach"))
      issues.push(warn([...at, "ports"], "a port of this plan cannot reach the operative target with a standard shaft"));
  });
  def.views.forEach((v, i) =>
    v.criteria.forEach((cr, k) => {
      const t = cr.test;
      const at = [...base, "views", i, "criteria", k, "test"];
      if ("cleared" in t && !regions.has(t.cleared)) issues.push(err(at, `unknown region "${t.cleared}"`));
      if ("exposure" in t && !regions.has(t.exposure)) issues.push(err(at, `unknown region "${t.exposure}"`));
      if ("onlyEntering" in t && !structures.has(t.onlyEntering)) issues.push(err(at, `unknown structure "${t.onlyEntering}"`));
    }),
  );
  return issues;
}

/** A `procedure` condition leaf against the case's procedure. */
export function checkProcedureRef(c: CaseDefinition, p: ProcedurePredicate, path: PathPart[]): Issue[] {
  const def = c.procedure;
  if (!def) return [err(path, "procedure condition but the case has no procedure")];
  const structure = (id: string, key: string) => (def.anatomy.some((s) => s.id === id) ? [] : [err([...path, key], `unknown structure "${id}"`)]);
  const view = (id: string, key: string) => (def.views.some((v) => v.id === id) ? [] : [err([...path, key], `unknown safety view "${id}"`)]);
  if ("view" in p) return view(p.view, "view");
  if ("documented" in p) return view(p.documented, "documented");
  if ("criterion" in p)
    return def.views.some((v) => v.criteria.some((cr) => cr.id === p.criterion)) ? [] : [err([...path, "criterion"], `unknown criterion "${p.criterion}"`)];
  if ("clipped" in p) return structure(p.clipped, "clipped");
  if ("divided" in p) return structure(p.divided, "divided");
  if ("isolated" in p) return structure(p.isolated, "isolated");
  if ("identified" in p) return [...structure(p.identified, "identified"), ...(p.as ? structure(p.as, "as") : [])];
  if ("plan" in p) return def.portPlans.some((x) => x.id === p.plan) ? [] : [err([...path, "plan"], `unknown port plan "${p.plan}"`)];
  if ("bailout" in p && p.bailout !== "any" && !def.bailouts.includes(p.bailout))
    return [warn([...path, "bailout"], `bail-out "${p.bailout}" is not offered by this procedure, so this can never become true`)];
  return [];
}
