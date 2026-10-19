/**
 * Conversation panel (patient, companion or a staff NPC): V4 pixel portrait
 * and tags, a streaming chat log with speaker names, suggested questions
 * (the case's canonical history questions not yet asked, grouped by topic),
 * free text (Enter sends, `@nurse` addressing), the offline badge, the
 * grounding indicator and — for the patient — Examine / Treat / Notes tabs.
 * Embodied mode: a nurse (or paramedic) can be delegated a task — she walks
 * there with her own body (`/delegate staff:<id> <task>`, the session's
 * `delegate_task`), the outcome shows in this conversation.
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
import type { App, Game } from "../../app/context.js";
import { statusLabel } from "../../app/llm.js";
import { trTask } from "../../app/embodied-link.js";
import { missingCaps } from "../../app/stations.js";
import type { ChatItem } from "../../app/store.js";
import { ageText, sexText } from "../../app/world-bridge.js";
import { ct, getLocale, tr, trList, trMaybe } from "../../i18n/index.js";
import { clear, h, mount } from "../dom.js";
import type { PanelView } from "../panel.js";
import { portrait, STAFF_COLOURS } from "../portrait.js";
import { parseAddress } from "../address.js";
import { capList, riskBadge } from "./common.js";

export { parseAddress };

export interface ConversationArgs {
  agent: string;
  staffId?: string;
  staffRole?: string;
  name?: string;
  tab?: "talk" | "exam" | "treat" | "notes";
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
    const staffName = args.name ?? roleLabel(args.staffRole ?? args.agent);
    let tab: NonNullable<ConversationArgs["tab"]> = isPatient ? args.tab ?? "talk" : "talk";
    if (args.staffId) game.activeStaff = args.staffId;

    /* ---------------- talk tab ---------------- */
    const log = h("div", { class: "chat-log", role: "log", "aria-live": "polite", "aria-label": tr("conv.tab.talk") });
    const typing = h("div", { class: "typing", hidden: true });
    const input = h("input", {
      class: "chat-input",
      type: "text",
      autocomplete: "off",
      maxlength: "800",
      placeholder: isPatient ? tr("conv.placeholder") : tr("conv.placeholderStaff", { name: staffName }),
      "aria-label": isPatient ? tr("conv.placeholder") : tr("conv.placeholderStaff", { name: staffName }),
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
        if (game.embodied && args.staffId && DELEGATE_ROLES.has(args.staffRole ?? "")) {
          suggestions.append(
            h("div", { class: "eyebrow delegate-head" }, tr("conv.delegate")),
            h("p", { class: "small muted" }, tr("conv.delegateHint")),
            h(
              "div",
              { class: "chips delegate-chips", id: "delegate-chips" },
              DELEGATE_TASKS.map((task) => h("button", { type: "button", dataset: { task }, onclick: () => app.submit({ type: "user_message", text: `/delegate staff:${args.staffId} ${task}` }, args.agent) }, trTask(task))),
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
      if (!items.length) log.append(h("div", { class: "chat-empty" }, isPatient ? tr("conv.empty") : tr("conv.emptyStaff", { name: staffName })));
      for (const m of items) log.append(chatBubble(m, c));
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
        : `${roleLabel(args.staffRole ?? args.agent)} · ${staffName}`;
      const look = isPatient ? (args.agent === "companion" && companion?.appearance ? { ...c.patient.appearance, ...companion.appearance } : c.patient.appearance) : { ...(STAFF_COLOURS[args.staffRole ?? args.agent] ?? { shirt: "#6d9fba" }), hair: "#3b3027" };
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
      const caps = (game.embodied?.bedsideCaps() ?? game.stations.bedsideCaps(game.slotId));
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
      const perform = (f: ExamFinding) => {
        const missing = missingCaps(f.requires, caps);
        if (missing.length) {
          app.toast(ct(f.maneuver), tr("exam.needs", { caps: capList(missing) }), "warning");
          return;
        }
        app.act({ type: "examine", findingId: f.id });
      };
      wrap.append(h("p", { class: "small muted" }, tr("exam.lead")), h("form", { class: "exam-search", onsubmit: doSearch }, q, h("button", { class: "primary" }, tr("exam.do"))), result);
      const items = c.exam.filter((f) => availableInPhase(f, state));
      if (!items.length) {
        wrap.append(h("div", { class: "notice" }, ct(c.examNotRecorded) || tr("exam.none")));
        return wrap;
      }
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
              const missing = missingCaps(f.requires, caps);
              return h(
                "div",
                { class: ["exam-row", done ? "done" : "", f.abnormal && done ? "abnormal" : ""] },
                h(
                  "button",
                  { type: "button", class: "question", disabled: missing.length > 0 && !done, dataset: { finding: f.id }, onclick: () => perform(f) },
                  h("span", null, ct(f.maneuver)),
                  h("span", { class: "tick" }, done ? tr("exam.done") : missing.length ? tr("exam.needs", { caps: capList(missing) }) : tr("exam.do") + " →"),
                ),
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
      const caps = (game.embodied?.bedsideCaps() ?? game.stations.bedsideCaps(game.slotId));
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
      const groups = new Map<string, Intervention[]>();
      for (const iv of c.interventions) groups.set(iv.kind, [...(groups.get(iv.kind) ?? []), iv]);
      for (const [kind, list] of groups) {
        wrap.append(h("h4", { class: "group-title" }, trMaybe(`kind.${kind}`, kind)), h("div", { class: "treat-list" }, list.map((iv) => treatRow(app, game, iv, caps, scope !== "full"))));
      }
      return wrap;
    };

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
    const tabs = isPatient ? (["talk", "exam", "treat", "notes"] as const) : (["talk"] as const);
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
      } else tabBody.append(id === "exam" ? examine() : id === "treat" ? treat() : notes());
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
        if (game.activeStaff === args.staffId) game.activeStaff = null;
      },
    };
  };
}

function chatBubble(m: ChatItem, c: CaseDefinition): HTMLElement {
  if (m.role === "system") {
    return h("div", { class: ["msg", "system", `tone-${m.tone}`], role: m.tone === "error" ? "note" : null }, m.speaker ? h("b", null, m.speaker) : null, m.text ? h("span", null, m.text) : null);
  }
  const learner = m.role === "learner";
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

export function treatRow(app: App, game: Game, iv: Intervention, caps: Set<string>, scopeLocked: boolean): HTMLElement {
  const store = game.session.store;
  const outcome = store.interventions.get(iv.id);
  const missing = missingCaps(iv.requires, caps);
  const maxed = iv.maxDoses !== undefined && (outcome?.count ?? 0) >= iv.maxDoses;
  let needs = "";
  if (missing.length) {
    const where = game.stations.nearestProvider(missing, app.playerPos(), getLocale());
    needs = where ? tr("treat.needsGo", { caps: capList(missing), place: where.label }) : tr("treat.needs", { caps: capList(missing) });
  }
  return h(
    "div",
    { class: ["treat-row", outcome ? `given-${outcome.appropriateness}` : ""] },
    h(
      "div",
      { class: "treat-info" },
      h("b", null, ct(iv.name)),
      iv.dose ? h("small", null, ct(iv.dose)) : null,
      h(
        "div",
        { class: "badges" },
        riskBadge(iv.risk),
        outcome ? h("span", { class: `outcome ${outcome.appropriateness}` }, tr(`treat.outcome.${outcome.appropriateness}`)) : null,
        outcome ? h("span", { class: "muted small" }, tr("treat.given", { n: outcome.count })) : null,
      ),
      needs ? h("small", { class: "needs" }, needs) : null,
    ),
    h(
      "button",
      {
        type: "button",
        class: iv.risk === "high" ? "danger" : "",
        disabled: missing.length > 0 || maxed || scopeLocked,
        dataset: { intervention: iv.id },
        onclick: () => app.act({ type: "intervene", interventionId: iv.id }),
      },
      maxed ? tr("treat.max") : tr("treat.give"),
    ),
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

