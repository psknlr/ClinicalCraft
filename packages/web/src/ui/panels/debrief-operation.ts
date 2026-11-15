/**
 * The debrief's "Operation" section (cases with a `procedure`, once it has begun): what the operation
 * really did — the safety verdict and the gates reached, injuries (and whether they were said aloud),
 * unsafe acts, each safety pause's claims against what the field showed, and the counters. Shown only
 * once the case is finished: during the case it would tell the operator what the field hides. In a place
 * in the team (`report.seat`) the operation is the team's — the stand-in operated —: its pauses and counters
 * are worded as the operating surgeon's, said to be the team's outcome, never the learner's own judgement.
 */
import { t, vocabularyStructures, type AssessmentReport, type CaseDefinition } from "@clinicalcraft/core";
import { ct, getLocale, tr, trMaybe } from "../../i18n/index.js";
import { h } from "../dom.js";
import { label } from "./surgery-controls.js";

/** A structure's name for the debrief (the anatomy may be named once the case is over). */
function structureName(c: CaseDefinition, id: string | undefined): string {
  if (!id) return "";
  const st = c.procedure ? vocabularyStructures(c.procedure).find((s) => s.id === id) : undefined;
  return st ? t(st.name, getLocale()) : id;
}

/** The section, or null when the report has no operation; before the case is finished a one-line note. */
export function operationSection(c: CaseDefinition, r: AssessmentReport, finished: boolean): HTMLElement | null {
  const op = r.procedure;
  if (!op) return null;
  if (!finished) return h("p", { class: "small muted", id: "debrief-operation-locked" }, tr("debrief.op.afterFinish"));
  const verdict = r.safety.verdict ?? "clear";
  const gates = (r.safety.gates ?? []).map((g) => ({ ...g, label: ct(c.safetyGates.find((x) => x.id === g.id)?.label) || g.id }));
  const minute = (at: number) => Math.round(at);
  const viewName = (id: string) => ct(c.procedure?.views.find((v) => v.id === id)?.name) || id;
  // in a place the operator was the stand-in: the pauses' judgement and the counters are the team's, not the learner's
  const team = !!r.seat;
  return h(
    "section",
    { class: "assess-card operation", id: "debrief-operation", dataset: { verdict, ...(team ? { team: "true" } : {}) } },
    h("h4", null, tr("debrief.op.title")),
    team ? h("p", { class: "small muted", id: "debrief-operation-team" }, tr("debrief.op.teamLead")) : null,
    h("p", { class: verdict === "clear" ? "ok" : verdict === "complication" ? "warn" : "bad", id: "debrief-operation-verdict" }, tr("debrief.op.verdict", { verdict: trMaybe(`debrief.op.verdict.${verdict}`, verdict) })),
    gates.length
      ? [h("h5", null, tr("debrief.op.gates")), h("ul", { class: "check-list" }, gates.map((g) => h("li", { class: g.verdict === "safety-critical" ? "no" : "partial", dataset: { gate: g.id } }, h("span", { class: "mark" }, "⚠"), `${g.label} · ${trMaybe(`debrief.op.verdict.${g.verdict}`, g.verdict)}`)))]
      : null,
    h("h5", null, tr("debrief.op.injuries")),
    op.injuries.length
      ? h(
          "ul",
          { class: "check-list" },
          op.injuries.map((i) =>
            h(
              "li",
              { class: i.recognised ? "partial" : "no", dataset: { injury: i.kind } },
              h("span", { class: "mark" }, i.severity === "major" ? "!" : "·"),
              tr("debrief.op.injury", { kind: label("injury", i.kind), structure: structureName(c, i.structure), severity: tr(i.severity === "major" ? "debrief.op.severity.major" : "debrief.op.severity.minor") }),
              h("small", null, tr(i.recognised ? "debrief.op.recognised" : "debrief.op.unrecognised")),
            ),
          ),
        )
      : h("p", { class: "small muted" }, tr("debrief.op.noInjuries")),
    h("h5", null, tr("debrief.op.unsafe")),
    op.unsafe.length
      ? h(
          "ul",
          { class: "check-list" },
          op.unsafe.map((u) => h("li", { class: "no", dataset: { unsafe: u.code } }, h("span", { class: "mark" }, "⚠"), tr("debrief.op.unsafeAt", { what: `${label("unsafe", u.code)}${u.structure ? ` · ${structureName(c, u.structure)}` : ""}`, min: minute(u.at) }))),
        )
      : h("p", { class: "small muted" }, tr("debrief.op.noUnsafe")),
    h("h5", null, tr(team ? "debrief.op.pausesTeam" : "debrief.op.pauses")),
    op.pauses.length
      ? h(
          "ul",
          { class: "check-list" },
          op.pauses.map((p) =>
            h(
              "li",
              { class: p.achieved && p.claimsMatchField ? "ok" : p.claimsMatchField ? "partial" : "no", dataset: { pause: p.view } },
              h("span", { class: "mark" }, p.achieved && p.claimsMatchField ? "✓" : "·"),
              tr(team ? "debrief.op.pauseTeam" : "debrief.op.pause", { view: viewName(p.view), min: minute(p.at), field: tr(p.achieved ? "debrief.op.fieldMet" : "debrief.op.fieldUnmet"), claims: tr(p.claimsMatchField ? "debrief.op.claimsMatch" : "debrief.op.claimsDiffer") }),
            ),
          ),
        )
      : h("p", { class: "small muted" }, tr("debrief.op.noPauses")),
    h("p", { class: "small muted", id: "debrief-operation-counters" }, team ? tr("debrief.op.countersTeam", { counters: tr("debrief.op.counters", { ...op.counters }) }) : tr("debrief.op.counters", { ...op.counters })),
  );
}
