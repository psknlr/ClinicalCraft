/**
 * Conversation panel (patient, companion or a staff NPC): V4 pixel portrait
 * and tags, a streaming chat log with speaker names, suggested questions
 * (the case's canonical history questions not yet asked, grouped by topic),
 * free text (Enter sends, `@nurse` addressing), the offline badge, the
 * grounding indicator and — for the patient — Examine / Treat / Notes tabs.
 * Embodied mode: a nurse (or paramedic) can be delegated a task — she walks
 * there with her own body (`/delegate staff:<id> <task>`, the session's
 * `delegate_task`), the outcome shows in this conversation. A colleague is
 * always a named staff member (`app/staff.ts`: the one the world would send
 * to this patient when the window was opened for a role, e.g. `@nurse`).
 */
import { availableInPhase, RESOLVE_THRESHOLD, resolveHits, type Resolution } from "@clinicalcraft/agent";
import {
  historyAvailable,
  matchExam,
  matchInterventions,
  matchSpecificity,
  type CaseDefinition,
  type ExamFinding,
  type HistoryItem,
  type Intervention,
  type SessionState,
} from "@clinicalcraft/core";
import type { App } from "../../app/context.js";
import { statusLabel } from "../../app/llm.js";
import { trTask } from "../../app/embodied-link.js";
import { missingCaps } from "../../app/stations.js";
import { delegateLine, delegationSummary, staffById, staffForAgent, type StaffRef } from "../../app/staff.js";
import type { ChatItem } from "../../app/store.js";
import { ageText, sexText } from "../../app/world-bridge.js";
import { ct, getLocale, tr, trList, trMaybe } from "../../i18n/index.js";
import { clear, h, mount } from "../dom.js";
import type { PanelView } from "../panel.js";
import { portrait, STAFF_COLOURS } from "../portrait.js";
import { parseAddress } from "../address.js";
import { capList } from "./common.js";
import { bedsideTests } from "./tests-tab.js";
import { treatRow } from "./treat-row.js";
import { distanceNotice, offered, onlyDistance, refusalNote } from "./verdicts.js";

export { treatRow };

export { parseAddress };

export interface ConversationArgs {
  agent: string;
  staffId?: string;
  staffRole?: string;
  name?: string;
  tab?: "talk" | "exam" | "treat" | "tests" | "notes";
  focusInput?: boolean;
}

/**
 * The history questions the panel suggests in the session's phase: those that
 * can be asked there (`historyAvailable` — an item superseded by a phase twin
 * is left out even when it is listed for the phase, as in `/ask` and
 * `list_options`).
 */
export function suggestedHistory(c: CaseDefinition, state: Pick<SessionState, "phase">): HistoryItem[] {
  return c.history.filter((hi) => historyAvailable(c, hi.id, state.phase));
}

/**
 * The exam search: findings of the phase matched against `text`, resolved as
 * the examine tool does (`resolveFinding`): a clear winner, else a tie broken
 * by the more specific phrase (`matchSpecificity`), else ambiguous.
 */
export function resolveExamSearch(c: CaseDefinition, text: string, locale: string, phase: string): { hits: ReturnType<typeof matchExam>; resolution: Resolution } {
  const hits = matchExam(c, text, locale, { phase });
  return { hits, resolution: resolveHits(hits, text, (id) => matchSpecificity(c, "exam", text, locale, id)) };
}

function roleLabel(agent: string): string {
  return trMaybe(`role.${agent}`, agent);
}

/** Staff roles a learner may delegate bedside tasks to (embodied mode) and the tasks offered. */
export const DELEGATE_ROLES: ReadonlySet<string> = new Set(["nurse", "paramedic"]);
export const DELEGATE_TASKS = ["attach_monitor", "record_ecg", "obtain_iv_access"] as const;

export function conversationPanel(app: App, args: ConversationArgs): () => PanelView {
  return () => {
    const game = app.game;
    if (!game) throw new Error("no game");
    const c = game.caseDef;
    const store = game.session.store;
    const isPatient = args.agent === "patient" || args.agent === "companion";
    const companion = c.patient.persona.companion;
    const agents = new Set<string>(isPatient ? ["patient", "companion"] : [args.agent]);
    // the colleague by name: the staff member aimed at, else the one this agent stands for here (`@nurse`)
    const staffCtx = { facility: game.facility, slotId: game.slotId, world: game.session.world() };
    const staff: StaffRef | null = isPatient ? null : args.staffId ? (staffById(args.staffId, staffCtx) ?? { staffId: args.staffId, role: args.staffRole ?? "", name: args.name ?? args.staffId }) : staffForAgent(args.agent, staffCtx);
    const staffRole = staff?.role || args.staffRole || args.agent;
    const staffName = staff?.name ?? roleLabel(staffRole);
    let tab: NonNullable<ConversationArgs["tab"]> = isPatient ? (args.tab === "tests" && !game.embodied ? "talk" : args.tab ?? "talk") : "talk";
    if (staff) game.activeStaff = staff.staffId;

    /* ---------------- talk tab ---------------- */
    const log = h("div", { class: "chat-log", role: "log", "aria-live": "polite", "aria-label": tr("conv.tab.talk") });
    const typing = h("div", { class: "typing", hidden: true });
    const input = h("input", {
      class: "chat-input",
      type: "text",
      autocomplete: "off",
      maxlength: "800",
      placeholder: isPatient ? tr("conv.placeholder") : staff ? tr("conv.placeholderStaff", { name: staffName }) : tr("conv.placeholderRole", { role: staffName }),
      "aria-label": isPatient ? tr("conv.placeholder") : staff ? tr("conv.placeholderStaff", { name: staffName }) : tr("conv.placeholderRole", { role: staffName }),
    });
    const sendBtn = h("button", { class: "primary", type: "submit" }, tr("conv.send"));
    const stopBtn = h("button", { type: "button", hidden: true, onclick: () => game.session.interrupt() }, tr("conv.stop"));
    const form = h("form", { class: "chat-form", onsubmit: (e: Event) => (e.preventDefault(), send()) }, input, sendBtn, stopBtn);
    const suggestions = h("div", { class: "suggestions" });
    const badge = h("div", { class: "llm-badge" });
    const grounded = h("div", { class: "grounded" });

    const send = (): void => {
      const raw = input.value.trim();
      if (!raw) return;
      input.value = "";
      if (/^[/／]/.test(raw)) {
        // Commands the web handles through its own UI (language, settings, export, leaving the case)
        // never reach the session: there they would change the session behind the UI's back.
        if (webCommand(app, raw)) return;
        // Other slash commands (/help, /vitals, /results…): the output is shown in this conversation.
        app.submit({ type: "user_message", text: raw }, isPatient ? "patient" : args.agent);
        return;
      }
      const addressed = parseAddress(raw, game.session.session.availableAgents());
      const to = addressed.to ?? (isPatient ? "patient" : args.agent);
      if (!addressed.text && !addressed.to) return;
      if (addressed.to && !addressed.text) {
        // "@nurse" alone: switch to that person's window instead of sending an empty line.
        if (!agents.has(addressed.to)) app.open("conversation", { agent: addressed.to, focusInput: true });
        return;
      }
      // Someone addressed from this window (`@nurse …`) answers here too.
      if (!agents.has(to)) {
        agents.add(to);
        renderedVersion = -1;
      }
      app.submit({ type: "user_message", text: addressed.text, to });
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        send();
      }
      e.stopPropagation();
    });

    const renderBadge = (): void => {
      clear(badge);
      const offline = store.offline;
      const label = statusLabel(app.choice());
      badge.className = `llm-badge ${offline ? "offline" : "online"}`;
      badge.append(
        h("b", null, offline ? tr("conv.offlineBadge") : tr("conv.onlineBadge", { provider: label.provider, model: store.config?.model || label.model })),
        h("small", null, offline ? tr("conv.offlineExplain") : tr("conv.onlineExplain")),
      );
    };

    const renderGrounded = (): void => {
      clear(grounded);
      if (!isPatient) return;
      const last = [...store.chat].reverse().find((m) => m.role === "agent" && (m.agent === "patient" || m.agent === "companion") && !m.streaming);
      if (!last) return;
      grounded.append(h("div", { class: "eyebrow" }, tr("conv.grounded")));
      if (!last.grounded.length) {
        grounded.append(h("small", { class: "muted" }, tr("conv.groundedNone")));
        return;
      }
      const chips = h("div", { class: "fact-chips" });
      for (const id of last.grounded) {
        const item = c.history.find((x) => x.id === id);
        chips.append(h("span", { class: ["fact-chip", item?.disclosure === "unknown" ? "unknown" : ""], title: item ? ct(item.source) : id }, item ? ct(item.question) : id));
      }
      grounded.append(chips);
    };

    const renderSuggestions = (): void => {
      clear(suggestions);
      if (!isPatient) {
        const prompts = trList(
          (args.agent === "nurse" || args.agent === "radiologist" || args.agent === "pathologist" || args.agent === "attending" ? `prompt.${args.agent}` : "prompt.default") as "prompt.nurse",
        );
        suggestions.append(
          h("div", { class: "eyebrow" }, tr("conv.quick")),
          h(
            "div",
            { class: "chips" },
            prompts.map((p) => h("button", { type: "button", onclick: () => app.submit({ type: "user_message", text: p, to: args.agent }) }, p)),
          ),
        );
        // embodied: delegate a bedside task to this staff member (she walks there herself)
        if (game.embodied && staff && DELEGATE_ROLES.has(staff.role)) {
          suggestions.append(
            h("div", { class: "eyebrow delegate-head" }, tr("conv.delegate")),
            h("p", { class: "small muted" }, tr("conv.delegateHint")),
            h(
              "div",
              { class: "chips delegate-chips", id: "delegate-chips" },
              DELEGATE_TASKS.map((task) => h("button", { type: "button", dataset: { task }, onclick: () => app.submit({ type: "user_message", text: `/delegate staff:${staff.staffId} ${task}` }, args.agent) }, trTask(task))),
            ),
          );
        }
        return;
      }
      const state = store.snapshot?.state ?? game.session.session.state;
      const items = suggestedHistory(c, state);
      const open = items.filter((hi) => !state.asked.includes(hi.id));
      suggestions.append(
        h("div", { class: "suggest-head" }, h("h3", null, tr("conv.suggested")), h("span", { class: "muted small" }, tr("conv.askedCount", { n: items.length - open.length, total: items.length }))),
        h("p", { class: "small muted" }, tr("conv.suggestedHint")),
      );
      if (!open.length) {
        suggestions.append(h("div", { class: "empty" }, tr("conv.allAsked")));
        return;
      }
      const groups = new Map<string, HistoryItem[]>();
      for (const hi of open) groups.set(hi.topic, [...(groups.get(hi.topic) ?? []), hi]);
      let first = true;
      for (const [topic, list] of groups) {
        const details = h(
          "details",
          { class: "topic", open: first || groups.size <= 3 },
          h("summary", null, trMaybe(`topic.${topic}`, topic), h("span", { class: "count" }, String(list.length))),
          list.map((hi) =>
            h(
              "button",
              { type: "button", class: "question", dataset: { item: hi.id }, onclick: () => app.act({ type: "ask", itemId: hi.id, via: "button" }) },
              h("span", null, ct(hi.question)),
              h("span", { class: "tick" }, tr("conv.ask")),
            ),
          ),
        );
        first = false;
        suggestions.append(details);
      }
    };

    let renderedVersion = -1;
    const renderLog = (): void => {
      if (renderedVersion === store.version) return;
      renderedVersion = store.version;
      const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
      clear(log);
      const items = store.chatFor(agents);
      if (!items.length) log.append(h("div", { class: "chat-empty" }, isPatient ? tr("conv.empty") : staff ? tr("conv.emptyStaff", { name: staffName }) : tr("conv.emptyRole", { role: staffName })));
      const nameOf = (id: string) => staffById(id, staffCtx)?.name ?? null;
      // world entities and actors by name (a delegation's steps)
      const entityName = (id: string) => {
        const e = staffCtx.world?.entity(id);
        return e ? ct(e.name) : null;
      };
      for (const m of items) log.append(chatBubble(m, c, nameOf, entityName));
      const busy = store.busyAmong(agents);
      typing.hidden = !busy;
      if (busy) {
        const who = busy.agent === "patient" ? ct(c.patient.displayName) : busy.agent === "companion" && companion ? ct(companion.name) : isPatient ? roleLabel(busy.agent) : staffName;
        const text = busy.phase === "awaiting_approval" ? tr("turn.approval") : busy.phase === "executing_tools" ? tr("turn.tools", { name: who }) : busy.phase === "streaming" ? tr("turn.speaking", { name: who }) : tr("turn.thinking", { name: who });
        mount(typing, h("span", { class: "dots", "aria-hidden": "true" }, h("i"), h("i"), h("i")), text);
        log.append(typing);
      }
      stopBtn.hidden = !busy;
      if (nearBottom || items.length < 3) log.scrollTop = log.scrollHeight;
      renderGrounded();
    };

    const talk = (): HTMLElement => {
      const caption = isPatient
        ? args.agent === "companion" && companion
          ? `${ct(companion.name)} · ${roleLabel("companion")}`
          : tr("conv.portraitCaption", { sex: sexText(c), age: ageText(c) })
        : staff
          ? // "Nurse · Lin Xiao"; a name that already says the role ("Nurse Feng (triage)") alone
            staffName.toLowerCase().includes(roleLabel(staffRole).toLowerCase())
            ? staffName
            : `${roleLabel(staffRole)} · ${staffName}`
          : roleLabel(staffRole);
      const look = isPatient ? (args.agent === "companion" && companion?.appearance ? { ...c.patient.appearance, ...companion.appearance } : c.patient.appearance) : { ...(STAFF_COLOURS[staffRole] ?? { shirt: "#6d9fba" }), hair: "#3b3027" };
      const tags = isPatient ? c.patient.tags.map((x) => h("span", { class: "tag" }, ct(x))) : [];
      const side = h(
        "div",
        { class: "convo-side" },
        portrait(look, caption),
        tags.length ? h("div", { class: "tags" }, tags) : null,
        isPatient ? h("p", { class: "small muted" }, ct((c.extensions?.v4 as { patientPanel?: { note?: never } } | undefined)?.patientPanel?.note) || tr("conv.note")) : null,
        badge,
        grounded,
      );
      const main = h(
        "div",
        { class: "convo-main" },
        log,
        form,
        h("p", { class: "small muted address-hint" }, tr("conv.addressHint")),
        suggestions,
      );
      return h("div", { class: "split convo" }, side, main);
    };

    /* ---------------- examine tab ---------------- */
    const examine = (): HTMLElement => {
      const wrap = h("div", { class: "exam-tab" });
      const state = store.snapshot?.state ?? game.session.session.state;
      // clinical mode: the facility's bedside capabilities (embodied rows follow the world's verdict)
      const caps = game.embodied ? new Set<string>() : game.stations.bedsideCaps(game.slotId);
      const result = h("div", { class: "exam-result" });
      const q = h("input", { type: "text", placeholder: tr("exam.search"), "aria-label": tr("exam.search"), autocomplete: "off" });
      q.addEventListener("keydown", (e) => e.stopPropagation());
      const doSearch = (e?: Event) => {
        e?.preventDefault();
        const text = q.value.trim();
        if (!text) return;
        // Same resolution as the examine tool: perform only a clear winner (≥ 0.55 and ahead of the
        // runner-up). A weak or tied match ("examine the eyes" ~ "palpate the abdomen" at 0.5) is not
        // that manoeuvre: say it is not recorded and offer the closest recorded ones to choose from.
        const { hits, resolution } = resolveExamSearch(c, text, getLocale(), state.phase);
        mount(result);
        if (resolution.kind === "id") {
          const f = c.exam.find((x) => x.id === resolution.id);
          if (f) perform(f);
          return;
        }
        // Two strong, close matches: ask which; only weak matches: not recorded, closest offered.
        const strong = resolution.kind === "ambiguous" && (hits[0]?.score ?? 0) >= RESOLVE_THRESHOLD;
        if (!strong) result.append(h("div", { class: "notice", id: "exam-not-recorded" }, ct(c.examNotRecorded) || tr("exam.notRecorded")));
        if (resolution.kind === "ambiguous") {
          const options = resolution.ids.map((id) => c.exam.find((x) => x.id === id)).filter((f): f is ExamFinding => !!f);
          result.append(
            h("p", { class: "small muted" }, tr(strong ? "exam.which" : "exam.closest")),
            h(
              "div",
              { class: "row wrap exam-candidates" },
              options.map((f) => h("button", { type: "button", class: "candidate", dataset: { finding: f.id }, onclick: () => perform(f) }, ct(f.maneuver))),
            ),
          );
        }
      };
      // embodied: the world's verdict from where the learner stands (the click itself goes through act: a short
      // step, or the refusal with the way there)
      const emb = game.embodied;
      const verdictOf = (f: ExamFinding) => emb?.verdict({ type: "examine", findingId: f.id }) ?? null;
      const perform = (f: ExamFinding) => {
        if (!emb) {
          const missing = missingCaps(f.requires, caps);
          if (missing.length) {
            app.toast(ct(f.maneuver), tr("exam.needs", { caps: capList(missing) }), "warning");
            return;
          }
        }
        app.act({ type: "examine", findingId: f.id });
      };
      wrap.append(h("p", { class: "small muted" }, tr("exam.lead")), h("form", { class: "exam-search", onsubmit: doSearch }, q, h("button", { class: "primary" }, tr("exam.do"))), result);
      const items = c.exam.filter((f) => availableInPhase(f, state));
      if (!items.length) {
        wrap.append(h("div", { class: "notice" }, ct(c.examNotRecorded) || tr("exam.none")));
        return wrap;
      }
      const verdicts = new Map(items.map((f) => [f.id, verdictOf(f)] as const));
      const away = emb ? distanceNotice(game, [...verdicts.values()].filter((v) => !!v)) : null;
      if (away) wrap.append(away);
      const groups = new Map<string, ExamFinding[]>();
      for (const f of items) groups.set(f.system, [...(groups.get(f.system) ?? []), f]);
      for (const [system, list] of groups) {
        wrap.append(
          h("h4", { class: "group-title" }, trMaybe(`system.${system}`, system)),
          h(
            "div",
            { class: "exam-list" },
            list.map((f) => {
              const done = state.examined.includes(f.id);
              const v = verdicts.get(f.id) ?? null;
              // clinical mode: the facility's bedside capabilities; embodied: the world's verdict
              const missing = v ? [] : missingCaps(f.requires, caps);
              const refusedHere = !!v && v.kind === "refused" && !onlyDistance(v);
              const disabled = !done && (v ? !offered(v) : missing.length > 0);
              return h(
                "div",
                { class: ["exam-row", done ? "done" : "", f.abnormal && done ? "abnormal" : ""] },
                h(
                  "button",
                  { type: "button", class: "question", disabled, dataset: { finding: f.id }, onclick: () => perform(f) },
                  h("span", null, ct(f.maneuver)),
                  h("span", { class: "tick" }, done ? tr("exam.done") : missing.length ? tr("exam.needs", { caps: capList(missing) }) : refusedHere ? tr("exam.notHere") : tr("exam.do") + " →"),
                ),
                !done && v ? refusalNote(v) : null,
                done ? h("div", { class: "finding" }, ct(f.finding)) : null,
              );
            }),
          ),
        );
      }
      return wrap;
    };

    /* ---------------- treat tab ---------------- */
    const treat = (): HTMLElement => {
      const wrap = h("div", { class: "treat-tab" });
      const scope = store.config?.practiceScope ?? game.session.settings.practiceScope;
      wrap.append(h("p", { class: "small muted" }, tr("treat.lead")));
      if (scope !== "full") wrap.append(h("p", { class: "notice" }, tr("treat.scopeLocked")));
      if (!c.interventions.length) {
        wrap.append(h("div", { class: "empty" }, tr("treat.empty")));
        return wrap;
      }
      // clinical mode: the facility's bedside capabilities (embodied rows follow the world's verdict)
      const caps = game.embodied ? new Set<string>() : game.stations.bedsideCaps(game.slotId);
      const result = h("div");
      const q = h("input", { type: "text", placeholder: tr("treat.search"), "aria-label": tr("treat.search"), autocomplete: "off" });
      q.addEventListener("keydown", (e) => e.stopPropagation());
      const search = (e?: Event) => {
        e?.preventDefault();
        const hits = q.value.trim() ? matchInterventions(c, q.value.trim(), getLocale()) : [];
        mount(result);
        if (!hits.length) {
          result.append(h("div", { class: "empty" }, tr("treat.noMatch")));
          return;
        }
        for (const hit of hits.slice(0, 4)) {
          const iv = c.interventions.find((x) => x.id === hit.id);
          if (iv) result.append(treatRow(app, game, iv, caps, scope !== "full"));
        }
      };
      wrap.append(h("form", { class: "exam-search", onsubmit: search }, q, h("button", { class: "primary" }, tr("treat.find"))), result);
      // embodied: away from the patient, one notice with the way there (the rows keep only their own reasons)
      const emb = game.embodied;
      const away = emb ? distanceNotice(game, c.interventions.map((iv) => emb.verdict({ type: "intervene", interventionId: iv.id }))) : null;
      if (away) wrap.insertBefore(away, wrap.children[1] ?? null);
      const groups = new Map<string, Intervention[]>();
      for (const iv of c.interventions) groups.set(iv.kind, [...(groups.get(iv.kind) ?? []), iv]);
      for (const [kind, list] of groups) {
        wrap.append(h("h4", { class: "group-title" }, trMaybe(`kind.${kind}`, kind)), h("div", { class: "treat-list" }, list.map((iv) => treatRow(app, game, iv, caps, scope !== "full"))));
      }
      return wrap;
    };

    /* ---------------- tests tab (embodied: order at the patient's side) ---------------- */
    const tests = (): HTMLElement => bedsideTests(app, game);

    /* ---------------- notes tab ---------------- */
    const notes = (): HTMLElement => {
      const state = store.snapshot?.state ?? game.session.session.state;
      const area = h("textarea", { rows: "4", placeholder: tr("notes.placeholder"), "aria-label": tr("notes.placeholder"), maxlength: "4000" });
      area.addEventListener("keydown", (e) => e.stopPropagation());
      return h(
        "div",
        { class: "notes-tab" },
        h("p", { class: "small muted" }, tr("notes.lead")),
        area,
        h(
          "div",
          { class: "row wrap", style: "margin:10px 0 18px" },
          h(
            "button",
            {
              class: "primary",
              type: "button",
              onclick: () => {
                const text = area.value.trim();
                if (!text) return;
                app.act({ type: "note", text });
                area.value = "";
              },
            },
            tr("notes.add"),
          ),
        ),
        state.notes.length
          ? h(
              "div",
              { class: "note-list" },
              [...state.notes].reverse().map((n) => h("div", { class: "note-item" }, h("small", null, tr("notes.at", { min: Math.round(n.at) })), h("p", null, n.text))),
            )
          : h("div", { class: "empty" }, tr("notes.empty")),
      );
    };

    /* ---------------- tabs ---------------- */
    const tabBody = h("div", { class: "tab-body" });
    // the bedside tests tab in embodied mode (clinical mode orders at the workstations, as V4 does)
    const tabs = isPatient ? (game.embodied ? (["talk", "exam", "treat", "tests", "notes"] as const) : (["talk", "exam", "treat", "notes"] as const)) : (["talk"] as const);
    const tabBar = h("div", { class: "tabs", role: "tablist" });
    const tabButtons = new Map<string, HTMLButtonElement>();
    for (const id of tabs) {
      const b = h("button", { type: "button", role: "tab", class: "tab", id: `tab-${id}`, "aria-selected": String(id === tab), dataset: { tab: id }, onclick: () => select(id) }, tr(`conv.tab.${id}`));
      tabButtons.set(id, b);
      tabBar.append(b);
    }
    let talkEl: HTMLElement | null = null;
    const select = (id: typeof tab): void => {
      tab = id;
      for (const [k, b] of tabButtons) {
        b.setAttribute("aria-selected", String(k === id));
        b.classList.toggle("active", k === id);
      }
      clear(tabBody);
      if (id === "talk") {
        talkEl ??= talk();
        tabBody.append(talkEl);
        renderedVersion = -1;
        renderLog();
        renderSuggestions();
        renderBadge();
        requestAnimationFrame(() => (log.scrollTop = log.scrollHeight));
      } else tabBody.append(id === "exam" ? examine() : id === "treat" ? treat() : id === "tests" ? tests() : notes());
    };
    select(tab);

    let lastState = store.snapshot?.state;
    return {
      id: "conversation",
      kicker: isPatient ? tr("conv.kicker") : tr("conv.kickerStaff"),
      title: isPatient ? tr("conv.titlePatient") : tr("conv.titleStaff", { name: staffName }),
      variant: "wide",
      body: [tabs.length > 1 ? tabBar : null, tabBody],
      focus: args.focusInput || !isPatient ? input : null,
      update() {
        const state = store.snapshot?.state;
        const stateChanged = state !== lastState;
        lastState = state;
        if (tab === "talk") {
          renderLog();
          if (stateChanged) renderSuggestions();
          renderBadge();
        } else if (stateChanged) {
          const scroll = tabBody.parentElement?.scrollTop ?? 0;
          select(tab);
          if (tabBody.parentElement) tabBody.parentElement.scrollTop = scroll;
        }
      },
      dispose() {
        if (staff && game.activeStaff === staff.staffId) game.activeStaff = null;
      },
    };
  };
}

function chatBubble(m: ChatItem, c: CaseDefinition, nameOf: (staffId: string) => string | null = () => null, entityName: (id: string) => string | null = () => null): HTMLElement {
  // a delegation's outcome in words (the session's text names operations and entities by id)
  const delegation = m.role === "system" && m.speaker === "/delegate" ? delegationSummary(m.data, entityName) : null;
  if (delegation) {
    return h(
      "div",
      { class: ["msg", "system", `tone-${m.tone}`, "delegation-result"], title: m.text },
      h("b", null, tr("conv.delegateTitle")),
      h("span", null, [delegation.head, ...delegation.steps].join("\n")),
    );
  }
  if (m.role === "system") {
    return h("div", { class: ["msg", "system", `tone-${m.tone}`], role: m.tone === "error" ? "note" : null }, m.speaker ? h("b", null, m.speaker) : null, m.text ? h("span", null, m.text) : null);
  }
  const learner = m.role === "learner";
  // the learner's delegation (the delegate chips) as a sentence, the command itself in the tooltip
  const delegated = learner && m.tone === "command" ? delegateLine(m.text, nameOf) : null;
  if (delegated) {
    return h(
      "div",
      { class: ["msg", "learner", `agent-${m.agent}`, "delegation"], dataset: { agent: m.agent } },
      h("div", { class: "who" }, tr("role.learner")),
      h("div", { class: "bubble", title: m.text }, delegated),
    );
  }
  const name = learner ? (m.agent !== "patient" && m.agent !== "companion" ? `${tr("role.learner")} → ${trMaybe(`role.${m.agent}`, m.agent)}` : tr("role.learner")) : m.speaker === "monitor" ? tr("role.monitor") : m.speaker;
  const meta: (HTMLElement | null)[] = [];
  if (!learner && m.nonverbal) meta.push(h("i", { class: "nonverbal" }, m.nonverbal));
  if (!learner && m.grounding === "template") meta.push(h("small", { class: "grounding-note" }, tr("conv.groundingTemplate")));
  const factIds = !learner ? m.grounded.filter((id) => c.history.some((x) => x.id === id)) : [];
  return h(
    "div",
    { class: ["msg", learner ? "learner" : "agent", `agent-${m.agent}`, m.streaming ? "streaming" : "", m.tone === "command" ? "tone-command" : ""], dataset: { agent: m.agent } },
    h("div", { class: "who" }, name),
    h("div", { class: "bubble" }, m.text || (m.streaming ? "…" : ""), meta),
    factIds.length ? h("div", { class: "facts", title: tr("conv.grounded") }, "◆ ".repeat(Math.min(factIds.length, 5)).trim()) : null,
  );
}

/**
 * Handle a slash command the web owns: `/lang` switches the whole UI (and the
 * session) like the settings panel; provider/model/approval/scope open the
 * settings; `/export` downloads the learning record; `/quit` and `/clear`
 * point to the pause menu; `/assess` runs and says where the result is.
 * Returns false for every other command (the session runs it).
 */
export function webCommand(app: App, raw: string): boolean {
  const m = /^[/／]\s*(\S+)\s*([\s\S]*)$/.exec(raw.trim());
  if (!m) return false;
  const name = m[1]!.toLowerCase();
  const arg = m[2]!.trim();
  switch (name) {
    case "lang": {
      const v = arg.toLowerCase();
      const locale = /^(zh|zh-cn|cn|中文)$/.test(v) ? "zh-CN" : /^(en|english|英文)$/.test(v) ? "en" : null;
      if (locale) app.setLocale(locale);
      else app.toast(tr("conv.cmd.langUsage"), tr("conv.cmd.langCurrent", { locale: getLocale() }));
      return true;
    }
    case "provider":
    case "model":
    case "approval":
    case "scope":
      app.toast(tr("conv.cmd.settings", { name }));
      app.open("settings");
      return true;
    case "export":
      app.exportRecord();
      return true;
    case "quit":
    case "exit":
    case "clear":
      app.toast(tr("conv.cmd.menu", { name }));
      return true;
    case "assess":
      app.submit({ type: "assess" });
      app.toast(tr("conv.cmd.assess"));
      return true;
    default:
      return false;
  }
}

