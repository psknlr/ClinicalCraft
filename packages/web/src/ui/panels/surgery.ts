/**
 * Laparoscopic surgery window (docs/PROCEDURE.md): the laparoscopic screen on the left (three.js,
 * `laparoscopy/index.ts`, drawn from `surgery-scene.ts`), the operator's controls on the right. What the
 * window shows of the operation is the operator's `FieldView` (`observeField`) and nothing else: ducts and
 * vessels are handles ("T1"…) with what they look like, regions are dissection / exposure bins, findings
 * are what the field shows; the port plans come with their ergonomics (`portReport`). Every control
 * submits `{ type: "operate", op }` through `app.act` — the learner's normal action path (approvals, the
 * transcript, the demonstration and the in-world rules apply alike); nothing changes here until the
 * session says so, and a refused step shows the engine's message. The safety verdict, injuries the field
 * does not show and unsafe acts wait for the debrief.
 */
import { createProcedureState, observeField, portReport, procedureFor, t, type FieldView, type InstrumentId, type ProcedureDefinition, type ProcedureOp, type ProcedureState } from "@clinicalcraft/core";
import { assetExists, caseAssetUrl } from "../../app/assets.js";
import type { App, Game } from "../../app/context.js";
import type { LaparoscopeApi } from "../../contracts.js";
import { createLaparoscope } from "../../laparoscopy/index.js";
import { ct, getLocale, joinList, tr } from "../../i18n/index.js";
import { h, mount, prefersReducedMotion, type Child } from "../dom.js";
import { focusKey, type PanelView } from "../panel.js";
import {
  activePort,
  controlsFor,
  DIRECTION_NAMES,
  directionText,
  dissectOp,
  ENERGY_INSTRUMENTS,
  FORCES,
  handleOp,
  identifyChoices,
  imageOp,
  imagingFor,
  label,
  labelList,
  lastStep,
  retractOp,
  safetyPauseOp,
  selectedHandle,
  surgeryOffered,
  toggleDirection,
  type DirectionName,
  type Force,
  type HandleControl,
} from "./surgery-controls.js";
import { lapScene } from "./surgery-scene.js";

/** Injuries the operator can say aloud (the `recognise` op). */
const INJURIES = ["bile-duct-injury", "vascular-injury", "bleeding", "perforation", "thermal-injury", "bile-leak"] as const;

/**
 * The case's anatomy model for the laparoscope, if it lists one: a `model` asset named `anatomy` (or
 * `<…>-anatomy`), else its only model asset when a structure names a mesh. Optional — drawn shapes otherwise.
 */
export function anatomyModelUrl(game: Game): string | null {
  const c = game.caseDef;
  const models = c.assets.filter((a) => a.kind === "model");
  const named = models.find((a) => a.id === "anatomy" || a.id.endsWith("-anatomy"));
  const pick = named ?? (models.length === 1 && c.procedure?.anatomy.some((s) => s.mesh) ? models[0] : undefined);
  return pick ? caseAssetUrl(c, pick.id).url : null;
}

/** What the learner is composing (the field itself always comes from the session). */
interface Draft {
  port: string | null;
  handle: string | null;
  instrument: Record<string, InstrumentId>;
  grasp: string;
  directions: DirectionName[];
  force: Force;
  region: string;
  energy: boolean;
  clips: number;
  identifyAs: string;
  claims: Record<string, Set<string>>;
  pressure: number;
  injury: (typeof INJURIES)[number];
  orbit: boolean;
  /** The learner's last submission: its id, op and how many steps the field had taken then. */
  sent: { id: string; op: ProcedureOp; steps: number } | null;
}

const button = (text: string, attrs: Record<string, unknown>, onclick: () => void): HTMLButtonElement => h("button", { type: "button", ...attrs, onclick }, text);

export function surgeryPanel(app: App): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const c = game.caseDef;
    const store = game.session.store;
    const L = getLocale();
    const session = () => store.snapshot?.state ?? game.session.session.state;
    // the session's anatomy (its variant, chosen at start, is hidden: nothing below names it)
    const def: ProcedureDefinition | undefined = procedureFor(c, session());
    const field = (): { p: ProcedureState; v: FieldView } | null => {
      if (!def) return null;
      const p = session().procedure ?? createProcedureState();
      return { p, v: observeField(def, p) };
    };
    const d: Draft = {
      port: null,
      handle: null,
      instrument: {},
      grasp: "",
      directions: [],
      force: "firm",
      region: "",
      energy: false,
      clips: 2,
      identifyAs: "",
      claims: {},
      pressure: def?.insufflation.usual ?? 12,
      injury: "bleeding",
      orbit: false,
      sent: null,
    };

    const canvas = h("canvas", { class: "lap-canvas", id: "lap-canvas", "aria-label": tr("surgery.screen") });
    const labels = h("div", { class: "lap-labels" });
    const dark = h("div", { class: "lap-dark", role: "status" }, tr("surgery.dark"));
    const status = h("div", { class: "lap-status", id: "lap-status", role: "status", "aria-live": "polite" });
    const side = h("div", { class: "surgery-side", id: "surgery-side" });
    const orbitBtn = h("button", { type: "button", id: "lap-orbit", "aria-pressed": "false", title: tr("surgery.orbitTitle"), onclick: () => orbitBtn.setAttribute("aria-pressed", String((d.orbit = !!lap?.setOrbit(!d.orbit)))) }, tr("surgery.orbit"));
    const resetBtn = h("button", { type: "button", id: "lap-reset", onclick: () => lap?.resetView() }, tr("surgery.resetView"));
    let lap: LaparoscopeApi | null = null;
    let disposed = false;
    let modelFailed = false;

    /** Submit one operative step through the learner's action path. */
    const send = (op: ProcedureOp | null): void => {
      if (!op) return;
      const steps = field()?.p.counters.steps ?? 0;
      const id = app.act({ type: "operate", op });
      d.sent = id ? { id, op, steps } : null;
      rerender();
    };

    /* ---------------- status ---------------- */

    const renderStatus = (v: FieldView, p: ProcedureState): void => {
      const lines: Child[] = [];
      // the learner's last submission until the field moves on: refused (the engine's words) or still on its way
      const waiting = d.sent && p.counters.steps <= d.sent.steps ? d.sent : null;
      const failed = waiting ? store.failureOf(waiting.id) : undefined;
      const step = lastStep(store.domainEvents("procedure.step"));
      if (waiting && failed !== undefined) lines.push(h("div", { class: "lap-line bad", dataset: { status: "rejected" } }, tr("surgery.status.rejected", { message: failed })));
      else if (waiting) lines.push(h("div", { class: "lap-line", dataset: { status: "sent" } }, tr("surgery.status.sent", { op: label("op", waiting.op.op) })));
      else if (step)
        lines.push(
          h(
            "div",
            { class: "lap-line", dataset: { status: "step" } },
            tr("surgery.status.last", { op: label("op", step.op) }),
            " · ",
            step.signals.length ? tr("surgery.status.signals", { signals: labelList("signal", step.signals) }) : tr("surgery.status.quiet"),
          ),
        );
      if (v.findings.length) lines.push(h("div", { class: "lap-line warn" }, tr("surgery.findings", { list: labelList("finding", v.findings) })));
      if (v.plan) lines.push(h("div", { class: "lap-line muted" }, tr("surgery.specimen", { state: label("specimen", v.specimen) }), v.bailouts.length ? ` · ${tr("surgery.bailoutsChosen", { list: labelList("bailout", v.bailouts) })}` : ""));
      if (v.closed) lines.push(h("div", { class: "lap-line" }, tr("surgery.closedNote")));
      if (modelFailed) lines.push(h("div", { class: "lap-line muted" }, tr("surgery.modelFailed")));
      mount(status, lines);
      status.hidden = !lines.length;
    };

    /* ---------------- sections ---------------- */

    const section = (title: string, id: string, ...children: Child[]) => h("section", { class: "lap-section", id }, h("h4", null, title), children);

    const planSection = (def: ProcedureDefinition, v: FieldView): HTMLElement => {
      if (v.plan) {
        const plan = def.portPlans.find((x) => x.id === v.plan);
        return section(tr("surgery.plan.title"), "lap-plan", h("p", { class: "small" }, tr("surgery.plan.chosen", { name: plan ? ct(plan.name) : v.plan })));
      }
      return section(
        tr("surgery.plan.title"),
        "lap-plan",
        h("p", { class: "small muted" }, tr("surgery.plan.note")),
        def.portPlans.map((plan) => {
          const r = portReport(def, plan);
          return h(
            "div",
            { class: "lap-card", dataset: { plan: plan.id } },
            h("b", null, ct(plan.name)),
            h("div", { class: "small" }, tr("surgery.plan.side", { side: label("side", plan.surgeonSide) }), " · ", r.manipulationAngle == null ? tr("surgery.plan.noAngle") : tr("surgery.plan.angle", { angle: `${Math.round(r.manipulationAngle)}°` })),
            h(
              "ul",
              { class: "lap-ports small" },
              r.ports.map((m) => {
                const site = def.portSites.find((s) => s.id === m.site);
                const size = plan.ports.find((x) => x.site === m.site)?.sizeMm ?? 0;
                return h(
                  "li",
                  { class: m.reachable ? undefined : "bad" },
                  tr("surgery.plan.port", {
                    site: m.site,
                    name: site ? ct(site.name) : m.site,
                    role: label("role", m.role),
                    size,
                    hand: m.hand ? ` · ${label("hand", m.hand)}` : "",
                    cm: Number.isFinite(m.distance) ? (m.distance * 100).toFixed(1) : "—",
                    wall: Number.isFinite(m.wallAngle) ? Math.round(m.wallAngle) : "—",
                    reach: m.reachable ? "" : tr("surgery.plan.unreachable"),
                  }),
                );
              }),
            ),
            h("p", { class: r.warnings.length ? "small warn" : "small muted" }, r.warnings.length ? labelList("warn", r.warnings) : tr("surgery.plan.noWarnings")),
            button(tr("surgery.plan.choose"), { dataset: { op: "plan-ports", plan: plan.id } }, () => send({ op: "plan-ports", plan: plan.id })),
          );
        }),
      );
    };

    const pneumoSection = (def: ProcedureDefinition, v: FieldView): HTMLElement => {
      const input = h("input", { type: "number", id: "lap-pressure", min: "1", max: "30", step: "1", value: String(d.pressure), "aria-label": tr("surgery.pneumo.pressure") });
      input.addEventListener("change", () => {
        const n = Number(input.value);
        if (Number.isFinite(n) && n > 0) d.pressure = Math.min(30, n);
      });
      return section(
        tr("surgery.pneumo.title"),
        "lap-pneumo",
        h("p", { class: "small" }, tr("surgery.pneumo.now", { state: v.insufflated ? `${v.pressure} mmHg` : tr("surgery.pneumo.off") }), " · ", h("span", { class: "muted" }, tr("surgery.pneumo.hint", { usual: def.insufflation.usual, max: def.insufflation.max }))),
        h(
          "div",
          { class: "lap-row" },
          h("label", { class: "small", for: "lap-pressure" }, tr("surgery.pneumo.pressure")),
          input,
          button(tr("surgery.pneumo.insufflate"), { dataset: { op: "insufflate" } }, () => send({ op: "insufflate", pressure: d.pressure })),
          button(tr("surgery.pneumo.desufflate"), { dataset: { op: "desufflate" } }, () => send({ op: "desufflate" })),
        ),
      );
    };

    const portsSection = (def: ProcedureDefinition, v: FieldView): HTMLElement =>
      section(
        tr("surgery.ports.title"),
        "lap-ports",
        v.ports.map((port) => {
          const site = def.portSites.find((s) => s.id === port.port);
          const scope = port.role === "camera" && def.instruments.some((i) => i.id === "laparoscope");
          const chosen = d.instrument[port.port] ?? (scope ? "laparoscope" : (def.instruments.find((i) => i.id !== "laparoscope") ?? def.instruments[0]).id);
          const select = h(
            "select",
            { dataset: { portInstrument: port.port }, "aria-label": `${tr("surgery.port.name", { site: port.port })} · ${tr("surgery.port.instrument")}` },
            def.instruments.map((i) => h("option", { value: i.id, selected: i.id === chosen }, label("instrument", i.id))),
          );
          select.addEventListener("change", () => (d.instrument[port.port] = select.value as InstrumentId));
          const radio = h("input", { type: "radio", name: "lap-port", checked: d.port === port.port, dataset: { activePort: port.port }, "aria-label": tr("surgery.port.use") });
          radio.addEventListener("change", () => {
            d.port = port.port;
            rerender();
          });
          return h(
            "div",
            { class: ["lap-port", d.port === port.port && "active"], dataset: { port: port.port } },
            h(
              "label",
              { class: "lap-port-head" },
              radio,
              h("b", null, tr("surgery.port.name", { site: port.port })),
              h("small", null, ` ${site ? ct(site.name) : ""} · ${label("role", port.role)} · ${port.sizeMm} mm${port.hand ? ` · ${label("hand", port.hand)}` : ""}`),
            ),
            h("div", { class: "lap-row" }, h("span", { class: "lap-inst" }, port.instrument ? label("instrument", port.instrument) : tr("surgery.port.empty")), select, button(tr("surgery.port.insert"), { dataset: { op: "insert", port: port.port } }, () => send({ op: "insert", port: port.port, instrument: (d.instrument[port.port] ?? chosen) as InstrumentId })), port.instrument ? button(tr("surgery.port.withdraw"), { dataset: { op: "withdraw", port: port.port } }, () => send({ op: "withdraw", port: port.port })) : null),
          );
        }),
      );

    const retractBlock = (port: string, v: FieldView): HTMLElement => {
      if (!v.organs.length) return h("p", { class: "small muted" }, tr("surgery.retract.noneInView"));
      if (!v.organs.some((o) => o.id === d.grasp)) d.grasp = v.organs[0].id;
      const grasp = h("select", { id: "lap-grasp", "aria-label": tr("surgery.retract.structure") }, v.organs.map((o) => h("option", { value: o.id, selected: o.id === d.grasp }, ct(o.name))));
      grasp.addEventListener("change", () => (d.grasp = grasp.value));
      const force = h("select", { id: "lap-force", "aria-label": tr("surgery.retract.force") }, FORCES.map((f) => h("option", { value: f, selected: f === d.force }, label("force", f))));
      force.addEventListener("change", () => (d.force = force.value as Force));
      const op = retractOp(port, d.grasp, d.directions, d.force);
      return h(
        "div",
        { class: "lap-block", id: "lap-retract" },
        h("h5", null, tr("surgery.retract.title")),
        h("div", { class: "lap-row" }, h("label", { class: "small", for: "lap-grasp" }, tr("surgery.retract.structure")), grasp),
        h("div", { class: "small" }, tr("surgery.retract.direction")),
        h(
          "div",
          { class: "lap-dirs" },
          DIRECTION_NAMES.map((name) => {
            const box = h("input", { type: "checkbox", checked: d.directions.includes(name), dataset: { direction: name } });
            box.addEventListener("change", () => {
              d.directions = toggleDirection(d.directions, name, box.checked);
              rerender();
            });
            return h("label", { class: "lap-check" }, box, label("dir", name));
          }),
        ),
        h("div", { class: "lap-row" }, h("label", { class: "small", for: "lap-force" }, tr("surgery.retract.force")), force, button(tr("surgery.retract.go"), { dataset: { op: "retract" }, disabled: !op, title: op ? "" : tr("surgery.retract.needDirection") }, () => send(retractOp(port, d.grasp, d.directions, d.force)))),
      );
    };

    const dissectBlock = (port: string, instrument: InstrumentId, v: FieldView): HTMLElement => {
      if (!v.regions.some((r) => r.id === d.region)) d.region = v.regions[0]?.id ?? "";
      const region = h(
        "select",
        { id: "lap-region", "aria-label": tr("surgery.dissect.region") },
        v.regions.map((r) => h("option", { value: r.id, selected: r.id === d.region }, `${ct(r.name)} · ${label("dissection", r.dissection)}`)),
      );
      region.addEventListener("change", () => (d.region = region.value));
      const energyOk = ENERGY_INSTRUMENTS.has(instrument);
      const energy = h("input", { type: "checkbox", id: "lap-energy", checked: energyOk && d.energy });
      energy.addEventListener("change", () => (d.energy = energy.checked));
      return h(
        "div",
        { class: "lap-block", id: "lap-dissect" },
        h("h5", null, tr("surgery.dissect.title")),
        h("div", { class: "lap-row" }, h("label", { class: "small", for: "lap-region" }, tr("surgery.dissect.region")), region),
        h("div", { class: "lap-row" }, energyOk ? h("label", { class: "lap-check" }, energy, tr("surgery.dissect.energy")) : null, button(tr("surgery.dissect.go"), { dataset: { op: "dissect" }, disabled: !d.region }, () => send(dissectOp(port, d.region, d.energy, instrument)))),
      );
    };

    const handleBlock = (port: string, controls: readonly HandleControl[]): HTMLElement => {
      const clips = h("select", { id: "lap-clips", "aria-label": tr("surgery.clipCount") }, [1, 2, 3].map((n) => h("option", { value: String(n), selected: n === d.clips }, String(n))));
      clips.addEventListener("change", () => (d.clips = Number(clips.value)));
      const handle = d.handle;
      return h(
        "div",
        { class: "lap-block", id: "lap-handle-actions" },
        h("h5", null, handle ? tr("surgery.handle.title", { handle }) : tr("surgery.handle.none")),
        handle
          ? h(
              "div",
              { class: "lap-row" },
              controls.map((k) => [
                k === "clip" ? [h("label", { class: "small", for: "lap-clips" }, tr("surgery.clipCount")), clips] : null,
                button(tr(`surgery.${k}`), { dataset: { op: k } }, () => send(handleOp(k, port, handle, d.clips))),
              ]),
            )
          : null,
      );
    };

    const actionsSection = (v: FieldView): HTMLElement => {
      const port = v.ports.find((p) => p.port === d.port) ?? null;
      const instrument = port?.instrument ?? null;
      const title = port ? tr("surgery.actions.title", { port: tr("surgery.port.name", { site: port.port }), instrument: instrument ? label("instrument", instrument) : tr("surgery.port.empty") }) : tr("surgery.actions.none");
      const controls = controlsFor(instrument);
      const body: Child[] = [];
      if (!port || !instrument) body.push(h("p", { class: "small muted" }, tr("surgery.actions.none")));
      else if (instrument === "laparoscope") body.push(h("p", { class: "small muted" }, tr("surgery.actions.scope")));
      else {
        if (controls.includes("retract")) body.push(retractBlock(port.port, v));
        if (controls.includes("dissect")) body.push(dissectBlock(port.port, instrument, v));
        const onHandle = controls.filter((k): k is HandleControl => k === "isolate" || k === "clip" || k === "divide" || k === "coagulate");
        if (onHandle.length) body.push(handleBlock(port.port, onHandle));
        const simple: Child[] = [];
        if (controls.includes("suction")) simple.push(button(tr("surgery.suction"), { dataset: { op: "suction" } }, () => send({ op: "suction", port: port.port })));
        if (controls.includes("irrigate")) simple.push(button(tr("surgery.irrigate"), { dataset: { op: "irrigate" } }, () => send({ op: "irrigate", port: port.port })));
        const modality = imagingFor(instrument);
        if (controls.includes("image") && modality) simple.push(button(label("image", modality), { dataset: { op: "image" } }, () => send(imageOp(port.port, instrument))));
        if (controls.includes("bag")) simple.push(button(tr("surgery.bag"), { dataset: { op: "bag" } }, () => send({ op: "bag", port: port.port })));
        if (simple.length) body.push(h("div", { class: "lap-row" }, simple));
      }
      if (port && v.specimen === "bagged") body.push(h("div", { class: "lap-row" }, button(tr("surgery.port.extract"), { dataset: { op: "extract" } }, () => send({ op: "extract", port: port.port }))));
      if (v.retractions.length)
        body.push(
          h(
            "ul",
            { class: "lap-held small" },
            v.retractions.map((r) => {
              const name = v.organs.find((o) => o.id === r.structure)?.name;
              return h("li", null, tr("surgery.held", { structure: name ? ct(name) : r.structure, port: r.port, direction: directionText(r.direction), force: label("force", r.force) }), " ", button(tr("surgery.release"), { dataset: { op: "release", structure: r.structure } }, () => send({ op: "release", structure: r.structure })));
            }),
          ),
        );
      return section(title, "lap-actions", body);
    };

    const structuresSection = (def: ProcedureDefinition, v: FieldView): HTMLElement => {
      const choices = identifyChoices(def, L);
      if (!choices.some((x) => x.id === d.identifyAs)) d.identifyAs = choices[0]?.id ?? "";
      const nameOf = (id: string) => choices.find((x) => x.id === id)?.name ?? id;
      const identify = h("select", { id: "lap-identify", "aria-label": d.handle ? tr("surgery.identify.label", { handle: d.handle }) : "" }, choices.map((x) => h("option", { value: x.id, selected: x.id === d.identifyAs }, x.name)));
      identify.addEventListener("change", () => (d.identifyAs = identify.value));
      const handle = d.handle;
      return section(
        tr("surgery.tubes.title"),
        "lap-tubes",
        v.tubes.length
          ? h(
              "ul",
              { class: "lap-tube-list" },
              v.tubes.map((x) => {
                const state = [x.isolated ? tr("surgery.tube.isolated") : "", x.clips ? tr("surgery.tube.clips", { n: x.clips }) : "", x.divided ? tr("surgery.tube.divided") : "", x.namedAs ? tr("surgery.tube.named", { name: nameOf(x.namedAs) }) : "", x.imaging ? tr("surgery.tube.imaging", { name: ct(x.imaging) }) : ""].filter(Boolean);
                return h(
                  "li",
                  null,
                  h(
                    "button",
                    { type: "button", class: ["lap-tube", x.handle === d.handle && "selected"], dataset: { tube: x.handle }, "aria-pressed": String(x.handle === d.handle), "aria-label": tr("surgery.tube.select", { handle: x.handle }), onclick: () => select(x.handle) },
                    h("b", null, x.handle),
                    h("span", null, x.appears ? ct(x.appears) : tr("surgery.tube.appearsUnknown")),
                    state.length ? h("small", null, state.join(" · ")) : null,
                  ),
                );
              }),
            )
          : h("p", { class: "small muted" }, tr("surgery.tubes.none")),
        handle
          ? h(
              "div",
              { class: "lap-block", id: "lap-identify-block" },
              h("div", { class: "lap-row" }, h("label", { class: "small", for: "lap-identify" }, tr("surgery.identify.label", { handle })), identify, button(tr("surgery.identify.go"), { dataset: { op: "identify" } }, () => send({ op: "identify", handle, as: d.identifyAs }))),
              h("p", { class: "small muted" }, tr("surgery.identify.note")),
            )
          : null,
        v.organs.length ? h("p", { class: "small" }, tr("surgery.organs", { list: joinList(v.organs.map((o) => ct(o.name))) })) : null,
        v.regions.length
          ? [h("h5", null, tr("surgery.regions.title")), h("ul", { class: "lap-regions small" }, v.regions.map((r) => h("li", { dataset: { region: r.id } }, tr("surgery.region.row", { name: ct(r.name), dissection: label("dissection", r.dissection), exposure: label("exposure", r.exposure) }), r.finding ? h("small", { class: "lap-finding" }, ` — ${ct(r.finding)}`) : null)))]
          : null,
      );
    };

    const pauseSection = (def: ProcedureDefinition, v: FieldView): HTMLElement | null => {
      if (!def.views.length) return null;
      return section(
        tr("surgery.pause.title"),
        "lap-pause",
        h("p", { class: "small notice-inline" }, tr("surgery.pause.note")),
        def.views.map((view) => {
          const ticked = (d.claims[view.id] ??= new Set());
          return h(
            "div",
            { class: "lap-block", dataset: { view: view.id } },
            h("h5", null, ct(view.name)),
            view.criteria.map((cr) => {
              const box = h("input", { type: "checkbox", checked: ticked.has(cr.id), dataset: { criterion: `${view.id}:${cr.id}` } });
              box.addEventListener("change", () => (box.checked ? ticked.add(cr.id) : ticked.delete(cr.id)));
              return h("label", { class: "lap-check block" }, box, ct(cr.name));
            }),
            button(tr("surgery.pause.go", { view: ct(view.name) }), { dataset: { op: "safety-pause", view: view.id } }, () => send(safetyPauseOp(def, view.id, ticked))),
          );
        }),
        h("p", { class: "small muted" }, tr("surgery.pause.count", { n: v.pauses })),
      );
    };

    const eventsSection = (def: ProcedureDefinition): HTMLElement => {
      const injury = h("select", { id: "lap-injury", "aria-label": tr("surgery.recognise.label") }, INJURIES.map((i) => h("option", { value: i, selected: i === d.injury }, label("injury", i))));
      injury.addEventListener("change", () => (d.injury = injury.value as Draft["injury"]));
      return section(
        tr("surgery.events.title"),
        "lap-events",
        h("div", { class: "lap-row" }, h("label", { class: "small", for: "lap-injury" }, tr("surgery.recognise.label")), injury, button(tr("surgery.recognise.go"), { dataset: { op: "recognise" } }, () => send({ op: "recognise", injury: d.injury }))),
        h("div", { class: "lap-row" }, button(tr("surgery.inspect"), { dataset: { op: "inspect" } }, () => send({ op: "inspect" }))),
        def.bailouts.length ? [h("h5", null, tr("surgery.bailout.title")), h("div", { class: "lap-row" }, def.bailouts.map((b) => button(label("bailout", b), { dataset: { op: "bailout", strategy: b } }, () => send({ op: "bailout", strategy: b }))))] : null,
        h("div", { class: "lap-row" }, button(tr("surgery.close"), { class: "danger", dataset: { op: "close" } }, () => send({ op: "close" }))),
      );
    };

    /* ---------------- render ---------------- */

    const select = (handle: string | null): void => {
      d.handle = handle;
      lap?.select(handle);
      rerender();
    };

    const render = (): void => {
      const f = field();
      if (!def || !f) {
        mount(side, h("p", { class: "notice" }, tr("surgery.noProcedure")));
        dark.hidden = false;
        status.hidden = true;
        return;
      }
      const { p, v } = f;
      d.port = activePort(v, d.port);
      d.handle = selectedHandle(v, d.handle);
      lap?.update(lapScene(def, p, v));
      lap?.select(d.handle);
      dark.hidden = v.inView;
      renderStatus(v, p);
      if (!surgeryOffered(c, session().phase)) {
        mount(side, h("p", { class: "notice", id: "surgery-phase" }, tr("surgery.notThisPhase")));
        return;
      }
      mount(side, planSection(def, v), v.plan ? [pneumoSection(def, v), portsSection(def, v), actionsSection(v), structuresSection(def, v), pauseSection(def, v), eventsSection(def)] : null);
    };

    /** Re-render after a local change, keeping the keyboard focus on "the same" control. */
    function rerender(): void {
      const active = document.activeElement instanceof HTMLElement && side.contains(document.activeElement) ? document.activeElement : null;
      const key = active ? focusKey(active) : null;
      const scroll = side.scrollTop;
      render();
      side.scrollTop = scroll;
      if (key) side.querySelector<HTMLElement>(key)?.focus({ preventScroll: true });
    }

    render();
    /** Start the view (after the window is in the document) — with the case's anatomy model when it is there. */
    const start = (modelUrl: string | null): void => {
      if (disposed || !def) return;
      try {
        lap = createLaparoscope({
          canvas,
          labels,
          modelUrl,
          onModel: (ok) => {
            modelFailed = !ok;
            if (!ok) rerender();
          },
          reducedMotion: () => !app.prefs.ui.bob || prefersReducedMotion(),
          onPick: (pick) => {
            if (pick.kind === "tube") select(pick.handle === d.handle ? null : pick.handle);
            else if (field()?.v.organs.some((o) => o.id === pick.id)) {
              d.grasp = pick.id;
              rerender();
            }
          },
          labelTitle: (handle) => tr("surgery.tube.select", { handle }),
        });
        render();
      } catch (err) {
        console.error(err);
        dark.textContent = tr("atlas.failed");
        dark.hidden = false;
      }
    };
    const modelUrl = def ? anatomyModelUrl(game) : null;
    if (modelUrl) void assetExists(modelUrl).then((ok) => start(ok ? modelUrl : null));
    else queueMicrotask(() => start(null));

    let last = store.version;
    return {
      id: "surgery",
      kicker: tr("surgery.kicker"),
      title: def ? `${tr("surgery.title")} · ${t(def.name, L)}` : tr("surgery.title"),
      variant: "surgery",
      body: h(
        "div",
        { class: "surgery" },
        h("div", { class: "lap-stage-wrap" }, h("div", { class: "lap-top" }, orbitBtn, resetBtn), h("div", { class: "lap-stage" }, canvas, labels, dark), status, h("div", { class: "lap-note" }, tr("surgery.note"))),
        side,
      ),
      foot: tr("surgery.foot"),
      update() {
        if (store.version === last) return;
        last = store.version;
        const scroll = side.scrollTop;
        render();
        side.scrollTop = scroll;
      },
      dispose() {
        disposed = true;
        lap?.dispose();
        lap = null;
      },
    };
  };
}
