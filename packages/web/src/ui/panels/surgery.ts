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
 *
 * By place (docs/PROCEDURE.md §7): holding a place in the care team, the window offers what that place may do —
 * core's offers (`surgery-controls.ts`: `portsForPlace`, `controlsForPlace`, `cameraOffer`, `tableOffer`): who holds
 * each port ("you", a colleague by name and position), Take / Hand back / Hand to by the controls, an insert (or, in the
 * scrub nurse's place, a request for the pass), the actions through the ports the place holds, the camera block (aim at
 * a region, closer / wider — the camera holder's) and the instrument table (passing, for the place that holds it). The
 * operator's own steps (the plan, the pneumoperitoneum, identification, the safety pause, bail-outs and closing) stay in
 * view, read-only. Saying an injury aloud is anyone's.
 */
import { bodyControls, LEARNER_BODY, observeField, portReport, POSITION_TITLES, procedureFor, procedureStateOf, t, type FieldView, type InstrumentId, type ProcedureDefinition, type ProcedureOp, type ProcedureState, type SessionState } from "@clinicalcraft/core";
import type { FieldContext } from "@clinicalcraft/agent";
import { assetExists, caseAssetUrl } from "../../app/assets.js";
import type { App, Game } from "../../app/context.js";
import type { LaparoscopeApi } from "../../contracts.js";
import { createLaparoscope } from "../../laparoscopy/index.js";
import { ct, getLocale, joinList, tr } from "../../i18n/index.js";
import { h, mount, prefersReducedMotion, type Child } from "../dom.js";
import { focusKey, type PanelView } from "../panel.js";
import {
  activePort,
  cameraOffer,
  controlsForPlace,
  DIRECTION_NAMES,
  holderOf,
  directionText,
  dissectOp,
  ENERGY_INSTRUMENTS,
  FORCES,
  handleOp,
  identifyChoices,
  isCounting,
  imageOp,
  imagingFor,
  label,
  labelList,
  lastStep,
  learnerRef,
  portsForPlace,
  retractOp,
  safetyPauseOp,
  selectedHandle,
  surgeryOffered,
  tableOffer,
  toggleDirection,
  type DirectionName,
  type FieldSeat,
  type Force,
  type HandleControl,
  type Holder,
  type PortOffer,
} from "./surgery-controls.js";
import { lapScene } from "./surgery-scene.js";
import { fieldWordsOf, frameCaption } from "../scope-dock.js";
import { partyName, partyWords, refusalWords } from "../field-names.js";
import { convertedToOpen, openFieldText } from "../open-field.js";

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
  /** Counting criteria: the number entered, per view. */
  counts: Record<string, Record<string, number>>;
  pressure: number;
  injury: (typeof INJURIES)[number];
  orbit: boolean;
  /** A subtotal technique the learner is about to change to (awaiting confirmation). */
  revise: string | null;
  /** The learner's last submission: its id, op and how many steps the field had taken then. */
  sent: { id: string; op: ProcedureOp; steps: number } | null;
  /** Per port: the member chosen to hand it to. */
  handTo: Record<string, string>;
  /** The region chosen for the camera to look at. */
  aimAt: string;
  /** The instrument table: the instrument chosen to pass and to whom ("": the operator). */
  passInstrument: string;
  passTo: string;
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
      const p = procedureStateOf(session());
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
      counts: {},
      pressure: def?.insufflation.usual ?? 12,
      injury: "bleeding",
      orbit: false,
      revise: null,
      sent: null,
      handTo: {},
      aimAt: "",
      passInstrument: "",
      passTo: "",
    };
    /** What the learner's place may do in the field now (core's offers: `surgery-controls.ts`). */
    const seat = (): FieldSeat => ({ c, s: session() as SessionState, facility: game.facility });
    /** The field's people in the learner's words ("you"; anyone else by name). */
    const words: FieldContext = fieldWordsOf(game);

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
      // the frame the one playback shows (the scope dock shows the same): a step, or a refusal with its reason
      const frame = app.playback.frame().item;
      const caption = frameCaption(frame, (sid) => partyName(words, sid), (r) => refusalWords(words, r));
      if (caption) lines.push(h("div", { class: ["lap-line", caption.status === "rejected" ? "bad" : ""], dataset: { status: caption.status === "rejected" ? "frame-rejected" : "frame", op: caption.op, id: caption.id } }, caption.text));
      if (app.playback.pending()) lines.push(h("div", { class: "lap-line muted" }, tr("scope.queue", { n: app.playback.pending() })));
      if (waiting && failed !== undefined) lines.push(h("div", { class: "lap-line bad", dataset: { status: "rejected" } }, tr("surgery.status.rejected", { message: failed })));
      else if (waiting) lines.push(h("div", { class: "lap-line", dataset: { status: "sent" } }, tr("surgery.status.sent", { op: label("op", waiting.op.op) })));
      else if (step && !caption)
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

    /**
     * The operator's own steps, in view while the learner holds a place in the team: shown, never sent from here (a
     * disabled fieldset — every control in it is inert, the field's state still reads).
     */
    const readOnly = (on: boolean, ...children: Child[]): Child[] => (on ? [h("fieldset", { class: "lap-readonly", disabled: true, dataset: { readonly: "operator" } }, h("p", { class: "small muted" }, tr("surgery.readonly")), children)] : children);

    /** A holder in the learner's words: "you", the operator or a colleague by name and position. */
    const holderText = (holder: Holder): string => partyWords(words, holder.kind === "you" ? (learnerRef(seat()) ?? undefined) : holder.kind === "colleague" ? holder.ref : undefined);

    /** Holding a place: which, the controls it holds in the field, and who operates. */
    const placeHeader = (): HTMLElement | null => {
      const s = session() as SessionState;
      if (!s.seat) return null;
      const controls = bodyControls(c, s, game.facility, LEARNER_BODY, "field");
      const list = controls === "all" ? [] : controls.map((x) => tr(`control.${x}`));
      const place = t(POSITION_TITLES[s.seat], L);
      return h(
        "div",
        { class: "lap-section lap-place", id: "lap-place", dataset: { seat: s.seat } },
        h("p", { class: "small" }, list.length ? tr("surgery.place.you", { place, controls: joinList(list) }) : tr("surgery.place.youNone", { place })),
        h("p", { class: "small muted" }, tr("surgery.place.operator", { name: partyName(words, undefined) })),
      );
    };

    const planSection = (def: ProcedureDefinition, v: FieldView, place: boolean): HTMLElement => {
      if (v.plan) {
        const plan = def.portPlans.find((x) => x.id === v.plan);
        return section(tr("surgery.plan.title"), "lap-plan", h("p", { class: "small" }, tr("surgery.plan.chosen", { name: plan ? ct(plan.name) : v.plan })));
      }
      return section(
        tr("surgery.plan.title"),
        "lap-plan",
        h("p", { class: "small muted" }, tr("surgery.plan.note")),
        readOnly(place, def.portPlans.map((plan) => {
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
        })),
      );
    };

    const pneumoSection = (def: ProcedureDefinition, v: FieldView, place: boolean): HTMLElement => {
      const input = h("input", { type: "number", id: "lap-pressure", min: "1", max: "30", step: "1", value: String(d.pressure), "aria-label": tr("surgery.pneumo.pressure") });
      input.addEventListener("change", () => {
        const n = Number(input.value);
        if (Number.isFinite(n) && n > 0) d.pressure = Math.min(30, n);
      });
      return section(
        tr("surgery.pneumo.title"),
        "lap-pneumo",
        h("p", { class: "small" }, tr("surgery.pneumo.now", { state: v.insufflated ? `${v.pressure} mmHg` : tr("surgery.pneumo.off") }), " · ", h("span", { class: "muted" }, tr("surgery.pneumo.hint", { usual: def.insufflation.usual, max: def.insufflation.max }))),
        place
          ? null
          : h(
              "div",
              { class: "lap-row" },
              h("label", { class: "small", for: "lap-pressure" }, tr("surgery.pneumo.pressure")),
              input,
              button(tr("surgery.pneumo.insufflate"), { dataset: { op: "insufflate" } }, () => send({ op: "insufflate", pressure: d.pressure })),
              button(tr("surgery.pneumo.desufflate"), { dataset: { op: "desufflate" } }, () => send({ op: "desufflate" })),
            ),
      );
    };

    /** Hand a port on: a member of the team whose controls cover its instrument, chosen, then handed over. */
    const handToRow = (offer: PortOffer): HTMLElement | null => {
      if (!offer.handTo.length) return null;
      if (!offer.handTo.some((x) => x.to === d.handTo[offer.port])) d.handTo[offer.port] = offer.handTo[0]!.to;
      const who = h(
        "select",
        { dataset: { handTo: offer.port }, "aria-label": `${tr("surgery.port.name", { site: offer.port })} · ${tr("surgery.port.handTo")}` },
        offer.handTo.map((x) => h("option", { value: x.to, selected: x.to === d.handTo[offer.port] }, partyWords(words, x.to))),
      );
      who.addEventListener("change", () => (d.handTo[offer.port] = who.value));
      return h(
        "div",
        { class: "lap-row" },
        h("span", { class: "small" }, tr("surgery.port.handTo")),
        who,
        button(tr("surgery.port.handToGo"), { dataset: { op: "hand-over", port: offer.port, to: "chosen" } }, () => send(offer.handTo.find((x) => x.to === d.handTo[offer.port])?.op ?? null)),
      );
    };

    /** The operating learner's row of a port: the instrument, what to put in (as always), withdraw — and take back a port a colleague holds. */
    const operatorPortRow = (def: ProcedureDefinition, port: FieldView["ports"][number], offer: PortOffer): HTMLElement => {
      const scope = port.role === "camera" && def.instruments.some((i) => i.id === "laparoscope");
      const chosen = d.instrument[port.port] ?? (scope ? "laparoscope" : (def.instruments.find((i) => i.id !== "laparoscope") ?? def.instruments[0]).id);
      const colleague = offer.holder.kind === "colleague";
      const select = colleague
        ? null
        : h(
            "select",
            { dataset: { portInstrument: port.port }, "aria-label": `${tr("surgery.port.name", { site: port.port })} · ${tr("surgery.port.instrument")}` },
            def.instruments.map((i) => h("option", { value: i.id, selected: i.id === chosen }, label("instrument", i.id))),
          );
      select?.addEventListener("change", () => (d.instrument[port.port] = select.value as InstrumentId));
      return h(
        "div",
        { class: "lap-row" },
        h("span", { class: "lap-inst" }, port.instrument ? label("instrument", port.instrument) : tr("surgery.port.empty")),
        select,
        select ? button(tr("surgery.port.insert"), { dataset: { op: "insert", port: port.port } }, () => send({ op: "insert", port: port.port, instrument: (d.instrument[port.port] ?? chosen) as InstrumentId })) : null,
        offer.withdraw ? button(tr("surgery.port.withdraw"), { dataset: { op: "withdraw", port: port.port } }, () => send(offer.withdraw)) : null,
        offer.take ? button(tr("surgery.port.takeBack"), { dataset: { op: "hand-over", port: port.port, to: "operator" } }, () => send(offer.take)) : null,
      );
    };

    /** A place's row of a port: what the place may put in (or ask to be passed), take, hand back, withdraw. */
    const placePortRow = (port: FieldView["ports"][number], offer: PortOffer): HTMLElement => {
      const chosen = offer.insert.includes(d.instrument[port.port] as InstrumentId) ? (d.instrument[port.port] as InstrumentId) : offer.insert[0];
      const select =
        offer.insert.length > 1
          ? h(
              "select",
              { dataset: { portInstrument: port.port }, "aria-label": `${tr("surgery.port.name", { site: port.port })} · ${tr("surgery.port.instrument")}` },
              offer.insert.map((i) => h("option", { value: i, selected: i === chosen }, label("instrument", i))),
            )
          : null;
      select?.addEventListener("change", () => (d.instrument[port.port] = select.value as InstrumentId));
      return h(
        "div",
        { class: "lap-row" },
        h("span", { class: "lap-inst" }, port.instrument ? label("instrument", port.instrument) : tr("surgery.port.empty")),
        select,
        chosen
          ? button(offer.insert.length > 1 ? tr("surgery.port.insert") : `${tr("surgery.port.insert")} · ${label("instrument", chosen)}`, { dataset: { op: "insert", port: port.port } }, () =>
              send({ op: "insert", port: port.port, instrument: (offer.insert.includes(d.instrument[port.port] as InstrumentId) ? d.instrument[port.port] : chosen) as InstrumentId }),
            )
          : null,
        // every instrument passed first (the scrub nurse's place) and none waiting: asked of whoever passes (the team's ask)
        offer.askFor.map((a) =>
          button(tr("surgery.port.askFor", { instrument: label("instrument", a.instrument) }), { dataset: { op: "ask-pass", port: port.port, instrument: a.instrument }, title: tr("surgery.port.askForTitle", { who: partyName(words, a.to) }) }, () => {
            app.submit({ type: "team", action: "ask", to: a.to, field: { op: "pass", instrument: a.instrument } });
          }),
        ),
        offer.take ? button(tr("surgery.port.take"), { dataset: { op: "hand-over", port: port.port, to: "me" }, title: tr("surgery.port.takeTitle", { port: port.port, instrument: port.instrument ? label("instrument", port.instrument) : "" }) }, () => send(offer.take)) : null,
        offer.handBack ? button(tr("surgery.port.handBack"), { dataset: { op: "hand-over", port: port.port, to: "operator" }, title: tr("surgery.port.handBackTitle", { port: port.port, instrument: port.instrument ? label("instrument", port.instrument) : "" }) }, () => send(offer.handBack)) : null,
        offer.withdraw ? button(tr("surgery.port.withdraw"), { dataset: { op: "withdraw", port: port.port } }, () => send(offer.withdraw)) : null,
      );
    };

    /**
     * The ports (docs/PROCEDURE.md §7): each port's site, role and size, who holds it — in a place always ("you", the
     * operator, a colleague by name and position); operating, a colleague holding one —, and what the learner may do
     * with it: core's offers for their place (`portsForPlace`).
     */
    const portsSection = (def: ProcedureDefinition, v: FieldView): HTMLElement => {
      const f = seat();
      const place = typeof learnerRef(f) === "string";
      const offers = portsForPlace(f, def, v);
      return section(
        tr("surgery.ports.title"),
        "lap-ports",
        v.ports.map((port) => {
          const offer = offers.find((o) => o.port === port.port)!;
          const site = def.portSites.find((s) => s.id === port.port);
          const radio = h("input", { type: "radio", name: "lap-port", checked: d.port === port.port, dataset: { activePort: port.port }, "aria-label": tr("surgery.port.use") });
          radio.addEventListener("change", () => {
            d.port = port.port;
            rerender();
          });
          const showHolder = !!port.instrument && (place || offer.holder.kind === "colleague");
          return h(
            "div",
            { class: ["lap-port", d.port === port.port && "active"], dataset: { port: port.port, holder: port.instrument ? offer.holder.kind : "" } },
            h(
              "label",
              { class: "lap-port-head" },
              radio,
              h("b", null, tr("surgery.port.name", { site: port.port })),
              h("small", null, ` ${site ? ct(site.name) : ""} · ${label("role", port.role)} · ${port.sizeMm} mm${port.hand ? ` · ${label("hand", port.hand)}` : ""}`),
            ),
            showHolder ? h("div", { class: "small lap-holder" }, tr("surgery.port.heldBy", { who: holderText(offer.holder) })) : null,
            place ? placePortRow(port, offer) : operatorPortRow(def, port, offer),
            handToRow(offer),
          );
        }),
      );
    };

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

    /**
     * The camera block (docs/PROCEDURE.md §3, "the camera's view"): where the camera looks and who holds it; aiming at a
     * region of the case, the whole field, following the work, closer and wider — for the camera holder, or the operator
     * while nobody holds the camera port (`cameraOffer`). A close view needs an aim. Orbit and Reset stay the view's own.
     */
    const cameraBlock = (def: ProcedureDefinition, v: FieldView): HTMLElement => {
      const cam = cameraOffer(seat(), v);
      if (!cam) return h("div", { class: "lap-block", id: "lap-camera" }, h("h5", null, tr("surgery.camera.title")), h("p", { class: "small muted" }, tr("surgery.camera.noScope")));
      const regionName = (id: string) => {
        const r = v.regions.find((x) => x.id === id) ?? def.regions.find((x) => x.id === id);
        return r ? ct(r.name) : id;
      };
      const aim = cam.at ? tr("surgery.camera.at", { region: regionName(cam.at) }) : tr("surgery.camera.whole");
      const now = h("p", { class: "small", id: "lap-camera-now", dataset: { at: cam.at ?? "", zoom: cam.zoom, holder: cam.holder.kind } }, tr("surgery.camera.now", { port: cam.port, aim, zoom: tr(`surgery.camera.zoom.${cam.zoom}`), who: holderText(cam.holder) }));
      if (!cam.aims) return h("div", { class: "lap-block", id: "lap-camera" }, h("h5", null, tr("surgery.camera.title")), now, h("p", { class: "small muted" }, tr("surgery.camera.notYours", { who: holderText(cam.holder) })));
      const regions = def.regions.map((r) => r.id);
      if (!regions.includes(d.aimAt)) d.aimAt = cam.at ?? v.working ?? regions[0] ?? "";
      const pick = h("select", { id: "lap-aim-region", "aria-label": tr("surgery.camera.region") }, regions.map((id) => h("option", { value: id, selected: id === d.aimAt }, regionName(id))));
      pick.addEventListener("change", () => (d.aimAt = pick.value));
      const closer = cam.zoom === "wide";
      return h(
        "div",
        { class: "lap-block", id: "lap-camera" },
        h("h5", null, tr("surgery.camera.title")),
        now,
        h(
          "div",
          { class: "lap-row" },
          h("label", { class: "small", for: "lap-aim-region" }, tr("surgery.camera.region")),
          pick,
          button(tr("surgery.camera.aim"), { dataset: { op: "aim", port: cam.port }, disabled: !d.aimAt }, () => send({ op: "aim", port: cam.port, at: d.aimAt })),
        ),
        h(
          "div",
          { class: "lap-row" },
          button(tr("surgery.camera.overview"), { dataset: { op: "aim", port: cam.port, at: "" }, disabled: cam.at === null }, () => send({ op: "aim", port: cam.port })),
          v.working ? button(tr("surgery.camera.follow", { region: regionName(v.working) }), { dataset: { op: "aim", port: cam.port, at: v.working, follow: "true" }, disabled: cam.at === v.working }, () => send({ op: "aim", port: cam.port, at: v.working! })) : null,
          closer
            ? button(tr("surgery.camera.closer"), { dataset: { op: "zoom", port: cam.port, level: "close" }, disabled: cam.at === null, title: cam.at === null ? tr("surgery.camera.aimFirst") : "" }, () => send({ op: "zoom", port: cam.port, level: "close" }))
            : button(tr("surgery.camera.wider"), { dataset: { op: "zoom", port: cam.port, level: "wide" } }, () => send({ op: "zoom", port: cam.port, level: "wide" })),
        ),
      );
    };

    /**
     * What the learner may do through the active port: operating, what its instrument does (as always); in a place, what
     * the place may do through a port it holds (`controlsForPlace`) — the camera's steps in the camera block.
     */
    const actionsSection = (def: ProcedureDefinition, v: FieldView): HTMLElement => {
      const f = seat();
      const place = typeof learnerRef(f) === "string";
      const port = v.ports.find((p) => p.port === d.port) ?? null;
      const instrument = port?.instrument ?? null;
      const title = port ? tr("surgery.actions.title", { port: tr("surgery.port.name", { site: port.port }), instrument: instrument ? label("instrument", instrument) : tr("surgery.port.empty") }) : tr("surgery.actions.none");
      // a port someone else holds offers nothing here: they work it (the operating learner takes it back first)
      const controls = port ? controlsForPlace(f, port) : [];
      const holder = port ? holderOf(f, port.holder) : null;
      const body: Child[] = [];
      if (!port || !instrument) body.push(h("p", { class: "small muted" }, tr("surgery.actions.none")));
      else if (instrument === "laparoscope" && port.role === "camera") body.push(cameraBlock(def, v));
      else if (instrument === "laparoscope") body.push(h("p", { class: "small muted" }, tr("surgery.actions.scope")));
      else if (!controls.length) body.push(h("p", { class: "small muted", dataset: { offer: "none" } }, holder && holder.kind !== "you" ? tr("surgery.port.heldBy", { who: holderText(holder) }) : tr("surgery.actions.none")));
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
      if (port && v.specimen === "bagged" && !place) body.push(h("div", { class: "lap-row" }, button(tr("surgery.port.extract"), { dataset: { op: "extract" } }, () => send({ op: "extract", port: port.port }))));
      // the tractions held: released by the one who holds the port (in a place, the place's own)
      const held = place ? v.retractions.filter((r) => v.ports.find((p) => p.port === r.port)?.holder === learnerRef(f)) : v.retractions;
      if (v.retractions.length)
        body.push(
          h(
            "ul",
            { class: "lap-held small" },
            v.retractions.map((r) => {
              const name = v.organs.find((o) => o.id === r.structure)?.name;
              return h("li", null, tr("surgery.held", { structure: name ? ct(name) : r.structure, port: r.port, direction: directionText(r.direction), force: label("force", r.force) }), " ", held.includes(r) ? button(tr("surgery.release"), { dataset: { op: "release", structure: r.structure } }, () => send({ op: "release", structure: r.structure })) : null);
            }),
          ),
        );
      return section(title, "lap-actions", body);
    };

    /**
     * The instrument table (docs/PROCEDURE.md §7): what is on it, what was passed and waits to go in — and, for the place
     * holding the instrument table (the scrub nurse's), passing an instrument to whoever will put it in (`tableOffer`).
     */
    const tableSection = (def: ProcedureDefinition, v: FieldView): HTMLElement => {
      const table = tableOffer(seat(), def, v);
      const passes = table.passed.map((q) => tr("surgery.table.passItem", { instrument: label("instrument", q.instrument), to: partyName(words, q.to), by: partyName(words, q.by) }));
      const rows: Child[] = [
        h("p", { class: "small" }, tr("surgery.table.on", { list: joinList(table.instruments.map((i) => label("instrument", i))) })),
        h("p", { class: "small", id: "lap-passed", dataset: { passed: String(table.passed.length) } }, passes.length ? tr("surgery.table.passed", { list: joinList(passes) }) : tr("surgery.table.none")),
      ];
      if (table.pass) {
        if (!table.instruments.includes(d.passInstrument as InstrumentId)) d.passInstrument = table.instruments[0] ?? "";
        const recipients = table.pass.to.map((x) => x ?? "");
        if (!recipients.includes(d.passTo)) d.passTo = recipients[0] ?? "";
        const what = h("select", { id: "lap-pass-instrument", "aria-label": tr("surgery.table.instrument") }, table.instruments.map((i) => h("option", { value: i, selected: i === d.passInstrument }, label("instrument", i))));
        what.addEventListener("change", () => (d.passInstrument = what.value));
        const to = h("select", { id: "lap-pass-to", "aria-label": tr("surgery.table.to") }, recipients.map((x) => h("option", { value: x, selected: x === d.passTo }, partyWords(words, x || undefined))));
        to.addEventListener("change", () => (d.passTo = to.value));
        rows.push(
          h(
            "div",
            { class: "lap-row" },
            h("label", { class: "small", for: "lap-pass-instrument" }, tr("surgery.table.instrument")),
            what,
            h("label", { class: "small", for: "lap-pass-to" }, tr("surgery.table.to")),
            to,
            button(tr("surgery.table.pass"), { dataset: { op: "pass" }, disabled: !d.passInstrument }, () => send({ op: "pass", instrument: d.passInstrument as InstrumentId, ...(d.passTo ? { to: d.passTo } : {}) })),
          ),
        );
      }
      return section(tr("surgery.table.title"), "lap-table", rows);
    };

    const structuresSection = (def: ProcedureDefinition, v: FieldView, place: boolean): HTMLElement => {
      const choices = identifyChoices(def, L, tr("surgery.identify.uncertain"));
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
        handle && !place
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

    const pauseSection = (def: ProcedureDefinition, v: FieldView, place: boolean): HTMLElement | null => {
      if (!def.views.length) return null;
      return section(
        tr("surgery.pause.title"),
        "lap-pause",
        h("p", { class: "small notice-inline" }, tr("surgery.pause.note")),
        readOnly(place, def.views.map((view) => {
          const ticked = (d.claims[view.id] ??= new Set());
          const counts = (d.counts[view.id] ??= {});
          return h(
            "div",
            { class: "lap-block", dataset: { view: view.id } },
            h("h5", null, ct(view.name)),
            view.criteria.map((cr) => {
              if (isCounting(cr.test)) {
                // the operator reports how many structures they see entering — never a tick for "two"
                const n = h("input", { type: "number", min: "0", max: "9", step: "1", value: String(counts[cr.id] ?? 0), class: "lap-count", "aria-label": tr("surgery.pause.countLabel"), dataset: { criterion: `${view.id}:${cr.id}` } });
                n.addEventListener("change", () => (counts[cr.id] = Math.max(0, Math.min(9, Math.round(Number(n.value) || 0)))));
                return h("label", { class: "lap-check block" }, ct(cr.name), " · ", tr("surgery.pause.countLabel"), " ", n);
              }
              const box = h("input", { type: "checkbox", checked: ticked.has(cr.id), dataset: { criterion: `${view.id}:${cr.id}` } });
              box.addEventListener("change", () => (box.checked ? ticked.add(cr.id) : ticked.delete(cr.id)));
              return h("label", { class: "lap-check block" }, box, ct(cr.name));
            }),
            button(tr("surgery.pause.go", { view: ct(view.name) }), { dataset: { op: "safety-pause", view: view.id } }, () => send(safetyPauseOp(def, view.id, ticked, counts))),
          );
        })),
        h("p", { class: "small muted" }, tr("surgery.pause.count", { n: v.pauses })),
      );
    };

    /**
     * Bail-outs as the engine sees them (PROCEDURE.md §5): one under way is not offered again; a committed subtotal
     * shows as the current strategy, and changing it is an explicit, confirmed revision (`revise: true`).
     */
    const bailoutControls = (def: ProcedureDefinition, v: FieldView): Child[] => {
      const underWay = new Set(v.bailouts);
      const committed = v.bailouts.find((b) => b.startsWith("subtotal")) ?? null;
      const rows: Child[] = [h("h5", null, tr("surgery.bailout.title"))];
      if (committed) {
        rows.push(h("p", { class: "small", id: "lap-bailout-current", dataset: { strategy: committed } }, tr("surgery.bailout.current", { name: label("bailout", committed) })));
        const others = def.bailouts.filter((b) => b.startsWith("subtotal") && b !== committed);
        const target = others.find((b) => b === d.revise);
        if (target) {
          const to = target;
          rows.push(
            h(
              "div",
              { class: "lap-card", id: "lap-bailout-confirm", role: "alertdialog", "aria-label": tr("surgery.bailout.revise") },
              h("p", { class: "small" }, tr("surgery.bailout.confirm", { from: label("bailout", committed), to: label("bailout", to) })),
              h(
                "div",
                { class: "lap-row" },
                button(tr("surgery.bailout.confirmGo"), { class: "danger", dataset: { op: "bailout", strategy: to, revise: "true" } }, () => {
                  d.revise = null;
                  send({ op: "bailout", strategy: to, revise: true });
                }),
                button(tr("surgery.bailout.keep", { from: label("bailout", committed) }), { dataset: { op: "bailout-keep" } }, () => {
                  d.revise = null;
                  rerender();
                }),
              ),
            ),
          );
        } else if (others.length)
          rows.push(
            h(
              "div",
              { class: "lap-row", id: "lap-bailout-revise" },
              h("span", { class: "small" }, tr("surgery.bailout.revise")),
              others.map((b) =>
                button(label("bailout", b), { dataset: { op: "bailout-revise", strategy: b } }, () => {
                  d.revise = b;
                  rerender();
                }),
              ),
            ),
          );
      }
      const plain = def.bailouts.filter((b) => !(committed && b.startsWith("subtotal")));
      rows.push(h("div", { class: "lap-row" }, plain.map((b) => (underWay.has(b) ? button(tr("surgery.bailout.underWay", { name: label("bailout", b) }), { disabled: true, dataset: { op: "bailout", strategy: b, state: "under-way" } }, () => undefined) : button(label("bailout", b), { dataset: { op: "bailout", strategy: b } }, () => send({ op: "bailout", strategy: b }))))));
      return rows;
    };

    const eventsSection = (def: ProcedureDefinition, v: FieldView, place: boolean): HTMLElement => {
      const injury = h("select", { id: "lap-injury", "aria-label": tr("surgery.recognise.label") }, INJURIES.map((i) => h("option", { value: i, selected: i === d.injury }, label("injury", i))));
      injury.addEventListener("change", () => (d.injury = injury.value as Draft["injury"]));
      return section(
        tr("surgery.events.title"),
        "lap-events",
        // saying an injury aloud is anyone's in the room (no control)
        h("div", { class: "lap-row" }, h("label", { class: "small", for: "lap-injury" }, tr("surgery.recognise.label")), injury, button(tr("surgery.recognise.go"), { dataset: { op: "recognise" } }, () => send({ op: "recognise", injury: d.injury }))),
        readOnly(
          place,
          h("div", { class: "lap-row" }, button(tr("surgery.inspect"), { dataset: { op: "inspect" } }, () => send({ op: "inspect" }))),
          def.bailouts.length ? bailoutControls(def, v) : null,
          h("div", { class: "lap-row" }, button(tr("surgery.close"), { class: "danger", dataset: { op: "close" } }, () => send({ op: "close" }))),
        ),
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
      // holding a place in the team, the port to work with is at first one the place holds
      const me = learnerRef(seat());
      if (d.port === null && typeof me === "string") d.port = v.ports.find((x) => x.holder === me)?.port ?? null;
      d.port = activePort(v, d.port);
      d.handle = selectedHandle(v, d.handle);
      drawFrame();
      lap?.select(d.handle);
      dark.hidden = v.inView;
      // converted: the open-surgery view — the field in words, not "put the laparoscope in"
      if (convertedToOpen(v)) mount(dark, h("div", { class: "open-field", dataset: { view: "open" } }, ...openFieldText(observeField(def, p, "open"), getLocale(), tr, label, (id) => identifyChoices(def, getLocale(), "").find((x) => x.id === id)?.name ?? id).map((line, i) => h(i === 0 ? "strong" : "div", { class: i === 0 ? "" : "open-line" }, line))));
      // the same states as the dock: no picture (the equipment), the abdomen down with the scope in, or not yet begun
      else dark.textContent = !v.supply.image ? tr("scope.noImage") : v.ports.some((x) => x.instrument === "laparoscope") && !v.insufflated ? tr("scope.deflated") : tr("surgery.dark");
      renderStatus(v, p);
      if (!surgeryOffered(c, session().phase)) {
        mount(side, h("p", { class: "notice", id: "surgery-phase" }, tr("surgery.notThisPhase")));
        return;
      }
      // holding a place in the team: what the place may do, the operator's own steps in view, read-only
      const place = typeof me === "string";
      mount(
        side,
        placeHeader(),
        planSection(def, v, place),
        v.plan
          ? [
              pneumoSection(def, v, place),
              portsSection(def, v),
              actionsSection(def, v),
              place || v.passed.length ? tableSection(def, v) : null,
              structuresSection(def, v, place),
              pauseSection(def, v, place),
              eventsSection(def, v, place),
            ]
          : null,
      );
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

    /**
     * The picture is the one playback's frame (`App.playback`): the same frame as the scope dock — opened on step 38
     * it goes on from step 38, a fast burst is shown step by step, a refusal stays with its reason. The controls work on
     * the session's own field.
     */
    function drawFrame(): void {
      if (!def) return;
      const shown = app.playback.frame().state ?? field()?.p ?? null;
      if (shown) lap?.update(lapScene(def, shown, observeField(def, shown)));
    }
    const offPlayback = app.playback.subscribe(() => {
      if (disposed) return;
      drawFrame();
      const f = field();
      if (f) renderStatus(f.v, f.p);
    });

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
        offPlayback();
        lap?.dispose();
        lap = null;
      },
    };
  };
}
