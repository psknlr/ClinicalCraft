/**
 * Prescriptions in the front end (docs/PRESCRIPTIONS.md).
 *
 * - **The prescriber's side** (`prescriptionsSection`, the patient's Treat tab): every prescription of the case with
 *   its versions in a line each, the formulations that can be signed — each with its lines, so nothing is signed
 *   unseen — and the record. Signing is the learner's `prescription submit` through the normal action path; the
 *   dispensary then reviews on its own. What the dispensary wrote — its review, what it supplied and how that differs
 *   from the version — is shown only once it has been **read**: reading is a recorded act (`acknowledge`), the same as
 *   the `read_prescription` tool, so a rubric that asks "was the query read? was the supply checked?" means the same
 *   here as for an agent.
 * - **The dispensing device** (`dispensingSection`, the device's panel in-world; the Treat tab in clinical mode): the
 *   steps of a supply for a case that makes the learner the dispenser — select the version, pick a product for each
 *   line from what the cabinet holds (look-alikes included), check the label, supply. In-world every step is the
 *   device's own operation (a `world_action`: validated and spatially checked by the world); the words are the
 *   engine's record, so a wrong pick shows as picked and is found by the label check, not by this panel.
 */
import { formulationText, prescriptionHeads, prescriptionText } from "@clinicalcraft/agent";
import {
  currentVersion,
  DISPENSING_STEPS,
  formulationOf,
  openPreparation,
  preparationDiscrepancies,
  prescriptionStatus,
  prescriptionVersions,
  t,
  unreadVersion,
  versionStatus,
  type DispensingStep,
  type PrescriptionDefinition,
  type PrescriptionOp,
  type SessionState,
} from "@clinicalcraft/core";
import type { App, Game } from "../../app/context.js";
import { getLocale, tr } from "../../i18n/index.js";
import { h } from "../dom.js";

const stateOf = (game: Game): SessionState => game.session.store.snapshot?.state ?? game.session.session.state;

/** The prescriptions section of the Treat tab (null: the case has none). */
export function prescriptionsSection(app: App, game: Game): HTMLElement | null {
  const defs = game.caseDef.prescriptions ?? [];
  if (!defs.length) return null;
  const L = getLocale();
  const state = stateOf(game);
  const facility = game.session.session.facility;
  const act = (prescription: PrescriptionOp) => void app.act({ type: "prescription", prescription });
  const rows = defs.map((def) => {
    const versions = prescriptionVersions(state, def.id);
    const status = prescriptionStatus(state, def.id);
    const unread = unreadVersion(state, def.id);
    const heads = prescriptionHeads(game.caseDef, state, def.id, L);
    const formulations = def.formulations.map((f) =>
      h(
        "div",
        { class: "rx-formulation", dataset: { formulation: f.id } },
        h("b", null, t(f.name, L)),
        h("pre", { class: "small" }, formulationText(def, f, L)),
        h(
          "button",
          {
            type: "button",
            dataset: { sign: f.id },
            onclick: () => act({ op: "submit", prescription: def.id, formulation: f.id, key: `${def.id}:${f.id}:web:${versions.length + 1}`, by: "learner" }),
          },
          tr("rx.sign", { n: versions.length + 1 }),
        ),
      ),
    );
    return h(
      "div",
      { class: "rx-row", dataset: { prescription: def.id, status, unread: unread ? String(unread.n) : "" } },
      h("b", null, t(def.name, L)),
      versions.length
        ? unread
          ? [
              h("pre", { class: "small", dataset: { rx: "heads" } }, heads.join("\n")),
              h("p", { class: "notice", dataset: { rx: "unread" } }, tr("rx.unread")),
              h("button", { type: "button", class: "primary", dataset: { read: def.id }, onclick: () => act({ op: "acknowledge", prescription: def.id, version: unread.n, by: "learner" }) }, tr("rx.read")),
            ]
          : h("pre", { class: "small", dataset: { rx: "record" } }, prescriptionText(game.caseDef, state, def.id, L, facility) ?? "")
        : h("div", { class: "small", dataset: { status: "none" } }, tr("rx.nothingSigned")),
      h("details", { class: "rx-formulations", open: !versions.length }, h("summary", null, versions.length ? tr("rx.revise") : tr("rx.choose")), formulations),
      // clinical mode has no dispensing device to walk to: the steps of a learner's supply are taken here
      !game.embodied && def.dispensedBy === "learner" ? dispensingSection(game, def, (step, parameters) => act(dispensingOp(def, state, step, parameters))) : null,
    );
  });
  return h("section", { class: "prescriptions", id: "prescriptions" }, h("h4", { class: "group-title" }, tr("rx.title")), h("p", { class: "small muted" }, tr("rx.lead")), rows);
}

/** The engine op of a dispensing step taken by the learner without a device (clinical mode). */
function dispensingOp(def: PrescriptionDefinition, state: SessionState, step: DispensingStep, p: Record<string, unknown>): PrescriptionOp {
  const by = "learner";
  if (step === "prepare") return { op: "prepare", prescription: def.id, by };
  if (step === "pick") return { op: "pick", prescription: def.id, by, ...(typeof p.line === "string" ? { line: p.line } : {}), ...(typeof p.product === "string" ? { product: p.product } : {}) };
  if (step === "check-label") return { op: "check-label", prescription: def.id, by };
  const version = openPreparation(state, def.id)?.version ?? currentVersion(state, def.id)?.n ?? 0;
  return { op: "dispense", prescription: def.id, by, key: `${def.id}:supply:${version}:${by}` };
}

/**
 * The steps of a supply at a dispensing device: the version to select, each line of the version being put together
 * with the product picked for it (a choice among everything the dispensary holds), the label check and the supply.
 * `run(step, parameters)` takes the step — a device operation in-world, the engine act in clinical mode. `offered`
 * says which steps the device offers from its current state (absent: all).
 */
export function dispensingSection(game: Game, def: PrescriptionDefinition, run: (step: DispensingStep, parameters: Record<string, unknown>) => void, offered?: (step: DispensingStep) => boolean): HTMLElement {
  const L = getLocale();
  const state = stateOf(game);
  const can = (step: DispensingStep) => (offered ? offered(step) : true);
  const wrap = h("section", { class: "rx-dispensing", dataset: { prescription: def.id } }, h("h4", { class: "group-title" }, tr("rx.dispensing", { name: t(def.name, L) })));
  if (def.dispensedBy !== "learner") {
    wrap.append(h("p", { class: "small muted", dataset: { rx: "staff" } }, tr("rx.dispensing.staff")));
    return wrap;
  }
  const current = currentVersion(state, def.id);
  const prep = openPreparation(state, def.id);
  const step = (id: DispensingStep, label: string, parameters: Record<string, unknown> = {}, primary = false) =>
    h("button", { type: "button", class: primary ? "primary" : "", disabled: !can(id), dataset: { step: id }, onclick: () => run(id, { prescription: def.id, ...parameters }) }, label);
  if (!prep) {
    const status = current ? versionStatus(state, current) : null;
    wrap.append(
      h("p", { class: "small", dataset: { rx: "idle" } }, current ? tr("rx.dispensing.current", { n: current.n, status: tr(`rx.status.${status}` as "rx.status.confirmed") }) : tr("rx.nothingSigned")),
      // every version can be selected: an earlier or unreviewed one is refused by the engine, and the attempt recorded
      h("div", { class: "row wrap" }, prescriptionVersions(state, def.id).map((v) => step("prepare", tr("rx.dispensing.select", { n: v.n }), { version: v.n }, v.n === current?.n))),
    );
    return wrap;
  }
  const version = prescriptionVersions(state, def.id).find((v) => v.n === prep.version);
  const formulation = version ? formulationOf(def, version.formulation) : undefined;
  wrap.append(h("p", { class: "small", dataset: { rx: "preparing" } }, tr("rx.dispensing.preparing", { n: prep.version, name: formulation ? t(formulation.name, L) : "" })));
  for (const line of formulation?.lines ?? []) {
    const picked = prep.picks[line.product];
    const select = h(
      "select",
      { "aria-label": tr("rx.dispensing.pickFor", { line: t(def.products.find((p) => p.id === line.product)?.name ?? line.product, L) }), dataset: { line: line.product } },
      // everything the dispensary holds, in its own order: the shelf does not say which drawer is the right one
      def.products.map((p) => h("option", { value: p.id, selected: p.id === picked }, [t(p.name, L), p.processing ? ` · ${t(p.processing, L)}` : "", p.stock?.batch ? ` · ${p.stock.batch}` : ""].join(""))),
    );
    if (!picked) select.selectedIndex = -1;
    wrap.append(
      h(
        "div",
        { class: "row wrap rx-line", dataset: { line: line.product, picked: picked ?? "" } },
        h("span", null, `${t(def.products.find((p) => p.id === line.product)?.name ?? line.product, L)} ${line.dose} ${line.unit}`),
        select,
        h("button", { type: "button", disabled: !can("pick"), dataset: { step: "pick", line: line.product }, onclick: () => select.value && run("pick", { prescription: def.id, line: line.product, product: select.value }) }, tr("rx.dispensing.pick")),
        picked ? h("span", { class: "small muted" }, tr("rx.dispensing.picked", { product: t(def.products.find((p) => p.id === picked)?.name ?? picked, L) })) : null,
      ),
    );
  }
  const checked = prep.labelChecked;
  const differs = checked ? preparationDiscrepancies(game.caseDef, state, def.id) : [];
  wrap.append(
    checked
      ? h("p", { class: checked.matches ? "small" : "notice", dataset: { rx: "label", matches: String(checked.matches) } }, checked.matches ? tr("rx.dispensing.labelMatches") : tr("rx.dispensing.labelDiffers", { list: differs.map((d) => d.detail[L === "zh-CN" ? "zh-CN" : "en"]).join(" ") }))
      : h("p", { class: "small muted", dataset: { rx: "label", matches: "" } }, tr("rx.dispensing.labelUnchecked")),
    h("div", { class: "row wrap" }, step("check-label", tr("rx.dispensing.check")), step("dispense", tr("rx.dispensing.supply"), {}, true)),
  );
  return wrap;
}

/** The dispensing steps, for a device panel to tell them from its other operations. */
export const DISPENSING_STEP_IDS: readonly string[] = DISPENSING_STEPS;
