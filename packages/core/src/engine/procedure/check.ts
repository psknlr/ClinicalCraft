/**
 * Static checks of a case's procedure (docs/PROCEDURE.md §2), run by `checkCaseIntegrity`: every id a
 * structure, region, plan or view names exists; port plans reach the target; procedure conditions
 * name things the procedure has.
 */
import type { CaseDefinition } from "../../schema/case.js";
import type { ProcedurePredicate } from "../../schema/common.js";
import { BASE_VARIANT, ProcedureDefinitionSchema, TUBULAR_KINDS, type ProcedureDefinition } from "../../schema/procedure.js";
import { formatPath } from "../parse.js";
import type { Issue } from "../types.js";
import { portReport } from "./geometry.js";
import { nameVocabulary, resolveProcedure } from "./variant.js";

type PathPart = string | number;
const err = (path: readonly PathPart[], message: string): Issue => ({ path: formatPath(path), message, severity: "error" });
const warn = (path: readonly PathPart[], message: string): Issue => ({ path: formatPath(path), message, severity: "warning" });

/**
 * The definition's internal references and geometry, then each variant: its own references (removed
 * structures and patched regions exist in the base) and the resolved definition checked like the base
 * (issues the base already has are not repeated).
 */
export function checkProcedureDefinition(c: CaseDefinition): Issue[] {
  const def = c.procedure;
  if (!def) return [];
  const issues = checkResolved(c, def, ["procedure"]);
  const seen = new Set(issues.map((i) => `${i.path}|${i.message}`));
  const structures = new Set(def.anatomy.map((s) => s.id));
  const regions = new Set(def.regions.map((r) => r.id));
  const ids = new Set<string>();
  def.variants.forEach((v, i) => {
    const at = ["procedure", "variants", i];
    if (v.id === BASE_VARIANT) issues.push(err([...at, "id"], `"${BASE_VARIANT}" names the base definition; a variant needs another id`));
    if (ids.has(v.id)) issues.push(err([...at, "id"], `duplicate variant "${v.id}"`));
    ids.add(v.id);
    v.remove.forEach((id, k) => {
      if (!structures.has(id)) issues.push(err([...at, "remove", k], `unknown structure "${id}"`));
      if (id === def.specimen) issues.push(err([...at, "remove", k], "a variant cannot remove the specimen"));
    });
    v.regions.forEach((r, k) => {
      if (!regions.has(r.id)) issues.push(err([...at, "regions", k, "id"], `unknown region "${r.id}" (a variant patches the base regions; it cannot add one)`));
    });
    const resolved = resolveProcedure(def, v.id);
    const parsed = ProcedureDefinitionSchema.safeParse(resolved);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 5)) issues.push(err([...at, ...issue.path], `resolved variant: ${issue.message}`));
      return;
    }
    for (const issue of checkResolved(c, resolved, ["procedure"])) {
      if (seen.has(`${issue.path}|${issue.message}`)) continue;
      issues.push({ ...issue, path: formatPath(at), message: `variant "${v.id}": ${issue.path}: ${issue.message}` });
    }
  });
  return issues;
}

function checkResolved(c: CaseDefinition, def: ProcedureDefinition, base: PathPart[]): Issue[] {
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
    if (s.crosses != null && !regions.has(s.crosses)) issues.push(err([...at, "crosses"], `unknown region "${s.crosses}"`));
    if (s.crosses != null && !TUBULAR_KINDS.includes(s.kind)) issues.push(err([...at, "crosses"], "only a duct or vessel crosses a plane"));
    s.appearsAs?.when.forEach((w, k) => {
      const region = w.cleared ?? w.exposure!;
      if (!regions.has(region)) issues.push(err([...at, "appearsAs", "when", k, w.cleared != null ? "cleared" : "exposure"], `unknown region "${region}"`));
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
    if (r.fibrosis) {
      const torn = r.fibrosis.injures ?? r.hazards[0];
      if (torn == null) issues.push(err([...at, "fibrosis"], "dense fibrosis needs a structure it tears (`injures`, or a hazard of the region)"));
      else if (!structures.has(torn)) issues.push(err([...at, "fibrosis", "injures"], `unknown structure "${torn}"`));
    }
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
  // a condition may name a structure of any variant (it is simply false in the others)
  const names = new Set(nameVocabulary(def));
  const structure = (id: string, key: string) => (names.has(id) ? [] : [err([...path, key], `unknown structure "${id}"`)]);
  if ("variant" in p) return p.variant === BASE_VARIANT || def.variants.some((v) => v.id === p.variant) ? [] : [err([...path, "variant"], `unknown procedure variant "${p.variant}"`)];
  const view = (id: string, key: string) => (def.views.some((v) => v.id === id) ? [] : [err([...path, key], `unknown safety view "${id}"`)]);
  if ("view" in p) return view(p.view, "view");
  if ("documented" in p) return view(p.documented, "documented");
  if ("criterion" in p)
    return def.views.some((v) => v.criteria.some((cr) => cr.id === p.criterion)) ? [] : [err([...path, "criterion"], `unknown criterion "${p.criterion}"`)];
  if ("clipped" in p) return structure(p.clipped, "clipped");
  if ("divided" in p) return structure(p.divided, "divided");
  if ("isolated" in p) return structure(p.isolated, "isolated");
  if ("identified" in p) return [...structure(p.identified, "identified"), ...(p.as ? structure(p.as, "as") : [])];
  if ("dissectedExposed" in p)
    return def.regions.some((r) => r.id === p.dissectedExposed) ? [] : [err([...path, "dissectedExposed"], `unknown region "${p.dissectedExposed}"`)];
  if ("plan" in p) return def.portPlans.some((x) => x.id === p.plan) ? [] : [err([...path, "plan"], `unknown port plan "${p.plan}"`)];
  if ("bailout" in p && p.bailout !== "any" && !def.bailouts.includes(p.bailout))
    return [warn([...path, "bailout"], `bail-out "${p.bailout}" is not offered by this procedure, so this can never become true`)];
  return [];
}
