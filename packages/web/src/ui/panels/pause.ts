/**
 * Pause menu / settings (V4 `tf` + new sections): resume / help / reset
 * position / library; world (sound, bob, pointer lock, sensitivity,
 * quality); language; language model (offline | proxy | direct with the
 * agent's provider catalogue, model suggestions, base-URL override — checked
 * against the page's `connect-src` (`checkDirectBaseUrl`) —, API key
 * with show/hide, "remember on this device" opt-in with warning, test
 * connection); approval mode, practice scope, patient pipeline, "Embodied
 * agents" (the mode of the next encounter — a running one keeps its own);
 * "External agent (MCP)" — the per-encounter switch “Allow an external agent
 * to control this session” (PROTOCOL §13.6: in a running encounter, only when
 * served by `clinicalcraft serve` with the world bridge; off by default,
 * never saved); save export / import / new game.
 */
import { localizedName, type ApprovalMode, type PracticeScope, type ProviderTemplate } from "@clinicalcraft/agent";
import type { App } from "../../app/context.js";
import { browserResolveProvider, directTemplates, providerName, runtimeChoice, STANDALONE, testConnection } from "../../app/llm.js";
import { KeyStore, resolveAgentSettings, type LlmMode } from "../../app/settings.js";
import { getLocale, joinList, tr } from "../../i18n/index.js";
import { append, clear, h } from "../dom.js";
import type { PanelView } from "../panel.js";

export interface PauseArgs {
  /** Scroll to a section ("llm"). */
  section?: "llm" | "agents" | "external" | "world" | "save";
  /** Show the in-game pause actions (resume, reset position, library, save). */
  menu?: boolean;
}

const APPROVAL_MODES: ApprovalMode[] = ["default", "strict", "auto", "plan", "bypass"];
const SCOPES: PracticeScope[] = ["history-only", "workup", "full"];
const PIPELINES = ["select-voice", "tool"] as const;
const EMBODIMENTS = ["embodied", "clinical"] as const;

function setting(label: string, hint: string | null, control: HTMLElement, id?: string): HTMLElement {
  return h("label", { class: "setting", ...(id ? { for: id } : {}) }, h("div", null, h("b", null, label), hint ? h("small", null, hint) : null), control);
}

function validUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/* ---------------- direct-mode base URL vs the page's connect-src ---------------- */

/** What the page knows about where it may connect (direct mode). */
export interface ConnectPolicy {
  /** Served by `clinicalcraft serve`: its `GET /api/health` lists `connectOrigins` (the CSP `connect-src`). */
  served: boolean;
  /** `connectOrigins` from `/api/health` (served; null/absent = an older server that does not say). */
  connectOrigins?: readonly string[] | null;
  /** The page's own Content-Security-Policy (`<meta http-equiv>`) when not served; null/absent = none. */
  csp?: string | null;
  /** The page origin (`'self'`). */
  pageOrigin?: string | null;
}

/** Why a direct base URL will be blocked by the browser, or `ok`. */
export type DirectUrlCheck = { ok: true } | { ok: false; origin: string; reason: "server" | "csp" };

const DEFAULT_PORT: Record<string, string> = { "http:": "80", "https:": "443" };

/** Source list of the directive governing `fetch` in a policy: `connect-src`, else `default-src`; null = unrestricted. */
export function connectSources(csp: string): string[] | null {
  const directives = new Map<string, string[]>();
  for (const part of csp.split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name && !directives.has(name.toLowerCase())) directives.set(name.toLowerCase(), values);
  }
  return directives.get("connect-src") ?? directives.get("default-src") ?? null;
}

/** Whether one CSP source expression matches `url` (scheme, host with `*.` wildcard, port with `*`; paths ignored). */
function sourceMatches(source: string, url: URL, pageOrigin: string | null): boolean {
  const s = source.trim();
  const lower = s.toLowerCase();
  if (s === "*") return url.protocol === "http:" || url.protocol === "https:";
  if (lower === "'self'") return pageOrigin !== null && url.origin === pageOrigin;
  if (/^[a-z][a-z0-9+.-]*:$/i.test(s)) return url.protocol === lower;
  const m = /^(?:([a-z][a-z0-9+.-]*):\/\/)?(\*|\*\.[^:/]+|[^:/*]+)(?::(\*|\d+))?(?:\/.*)?$/i.exec(s);
  if (!m) return false;
  const [, scheme, host, port] = m;
  const pageScheme = pageOrigin ? `${pageOrigin.split(":")[0]}:` : "https:";
  if (scheme) {
    if (url.protocol !== `${scheme.toLowerCase()}:`) return false;
  } else if (url.protocol !== pageScheme && !(pageScheme === "http:" && url.protocol === "https:")) return false;
  const h = host!.toLowerCase();
  const target = url.hostname.toLowerCase();
  if (h === "*") {
    /* any host */
  } else if (h.startsWith("*.")) {
    if (!target.endsWith(h.slice(1))) return false;
  } else if (target !== h) return false;
  if (port === "*") return true;
  const actual = url.port || DEFAULT_PORT[url.protocol] || "";
  const wanted = port ?? DEFAULT_PORT[url.protocol] ?? "";
  return actual === wanted;
}

/**
 * Will the browser let the page call `baseUrl` directly? Served by
 * `clinicalcraft serve`: only origins its CSP `connect-src` lists (the
 * health check's `connectOrigins`, plus the page itself) — a custom base URL
 * must be configured on the server, or proxy mode used. Not served: the
 * page's own CSP, if it has one. Unknown (no list, no policy, invalid URL)
 * counts as allowed: provider CORS is warned about separately.
 */
export function checkDirectBaseUrl(baseUrl: string, policy: ConnectPolicy): DirectUrlCheck {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return { ok: true };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: true };
  const page = policy.pageOrigin ?? null;
  if (policy.served) {
    if (!Array.isArray(policy.connectOrigins)) return { ok: true };
    const allowed = url.origin === page || policy.connectOrigins.some((o) => o === url.origin);
    return allowed ? { ok: true } : { ok: false, origin: url.origin, reason: "server" };
  }
  const sources = policy.csp ? connectSources(policy.csp) : null;
  if (sources === null) return { ok: true };
  if (sources.some((src) => src.toLowerCase() === "'none'")) return { ok: false, origin: url.origin, reason: "csp" };
  return sources.some((src) => sourceMatches(src, url, page)) ? { ok: true } : { ok: false, origin: url.origin, reason: "csp" };
}

/** The connect policy of this page (served: the health check's list; otherwise its CSP meta tag). */
function pageConnectPolicy(app: App): ConnectPolicy {
  const served = !!app.server?.served;
  const origins = app.server?.health?.connectOrigins;
  const meta = typeof document !== "undefined" ? document.querySelector<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy" i]') : null;
  return {
    served,
    connectOrigins: Array.isArray(origins) ? origins.filter((o): o is string => typeof o === "string") : null,
    csp: meta?.content ?? null,
    pageOrigin: typeof location !== "undefined" ? location.origin : null,
  };
}

/** Bilingual explanation for a blocked base URL (empty when allowed). */
function directUrlNotice(check: DirectUrlCheck, provider: string): string {
  if (check.ok) return "";
  return check.reason === "server" ? tr("llm.baseUrlServer", { origin: check.origin, provider }) : tr("llm.baseUrlCsp", { origin: check.origin });
}

export function pausePanel(app: App, args: PauseArgs): () => PanelView {
  return () => {
    const prefs = app.prefs;
    const game = app.game;
    const ui = prefs.ui;
    const menu = !!args.menu && !!game;
    const sections: HTMLElement[] = [];

    /* ---------------- pause actions ---------------- */
    const resume = h("button", { type: "button", id: "resume", class: "primary", onclick: () => app.close() }, game ? tr("pause.resume") : tr("pause.back"));
    // the autopilot and an external agent both drive the clinician: one at a time
    const autopilotMenu = h("button", { type: "button", id: "autopilot-menu", onclick: () => app.open("autopilot") }, tr("hud.autopilot"));
    const lockAutopilot = () => {
      autopilotMenu.disabled = app.external.on;
      autopilotMenu.title = app.external.on ? tr("ext.autopilotOff") : "";
    };
    lockAutopilot();
    if (menu) {
      sections.push(
        h(
          "div",
          { class: "row wrap pause-actions" },
          resume,
          h("button", { type: "button", id: "help-menu", onclick: () => app.open("help") }, tr("pause.help")),
          h(
            "button",
            {
              type: "button",
              id: "reset-position",
              onclick: () => {
                app.world.api?.reset();
                app.close();
                app.toast(tr("toast.resetPosition"), tr("toast.resetPositionBody"));
              },
            },
            tr("pause.reset"),
          ),
          autopilotMenu,
          h("button", { type: "button", id: "back-library", onclick: () => void app.backToLibrary() }, tr("pause.library")),
        ),
      );
    }

    /* ---------------- world ---------------- */
    const check = (key: "sound" | "bob" | "pointer") => {
      const input = h("input", {
        type: "checkbox",
        id: `setting-${key}`,
        checked: ui[key],
        onchange: (e: Event) => {
          prefs.update((s) => {
            s.ui[key] = (e.target as HTMLInputElement).checked;
          });
          if (key === "sound") app.sound("success");
          app.applySettings();
        },
      });
      return setting(tr(`set.${key}`), tr(`set.${key}.hint`), input, `setting-${key}`);
    };
    const sens = h("input", {
      type: "range",
      id: "sensitivity",
      min: "0.3",
      max: "2",
      step: "0.1",
      value: String(ui.sensitivity),
      oninput: (e: Event) =>
        prefs.update((s) => {
          s.ui.sensitivity = Number((e.target as HTMLInputElement).value);
        }),
    });
    const quality = h(
      "select",
      {
        id: "setting-quality",
        onchange: (e: Event) =>
          prefs.update((s) => {
            s.ui.quality = (e.target as HTMLSelectElement).value as typeof s.ui.quality;
          }),
      },
      (["low", "medium", "high"] as const).map((q) => h("option", { value: q, selected: q === ui.quality }, tr(`set.quality.${q}`))),
    );
    sections.push(
      h(
        "section",
        { class: "settings-section", id: "section-world" },
        h("h3", null, tr("pause.section.world")),
        check("sound"),
        check("bob"),
        check("pointer"),
        setting(tr("set.sensitivity"), null, sens, "sensitivity"),
        setting(tr("set.quality"), tr("set.quality.hint"), quality, "setting-quality"),
      ),
    );

    /* ---------------- language ---------------- */
    const locale = getLocale();
    sections.push(
      h(
        "section",
        { class: "settings-section", id: "section-language" },
        h("h3", null, tr("pause.section.language")),
        h(
          "div",
          { class: "setting" },
          h("div", null, h("b", null, tr("set.language")), h("small", null, tr("set.language.hint"))),
          h(
            "div",
            { class: "segmented", role: "radiogroup", "aria-label": tr("set.language") },
            (["zh-CN", "en"] as const).map((l) =>
              h("button", { type: "button", role: "radio", "aria-checked": String(l === locale), class: l === locale ? "active" : "", dataset: { locale: l }, onclick: () => app.setLocale(l) }, l === "zh-CN" ? "中文" : "English"),
            ),
          ),
        ),
      ),
    );

    /* ---------------- language model ---------------- */
    const llmBox = h("section", { class: "settings-section", id: "section-llm" });
    const renderLlm = (): void => {
      clear(llmBox);
      const llm = prefs.llm;
      const served = !!app.server?.served;
      llmBox.append(h("h3", null, tr("pause.section.llm")));
      if (STANDALONE) {
        llmBox.append(h("p", { class: "notice" }, tr("llm.standalone")));
        return;
      }
      const modes: LlmMode[] = ["offline", "proxy", "direct"];
      llmBox.append(
        h(
          "div",
          { class: "mode-list", role: "radiogroup", "aria-label": tr("llm.mode") },
          modes.map((m) =>
            h(
              "label",
              { class: ["mode-option", llm.mode === m ? "active" : "", m === "proxy" && !served ? "unavailable" : ""] },
              h("input", {
                type: "radio",
                name: "llm-mode",
                value: m,
                id: `llm-mode-${m}`,
                checked: llm.mode === m,
                onchange: () => {
                  prefs.update((s) => {
                    s.llm.mode = m;
                  });
                  app.applySettings();
                  renderLlm();
                },
              }),
              h("span", null, tr(`llm.mode.${m}`)),
            ),
          ),
        ),
        h("p", { class: ["small", served ? "ok-text" : "muted"] }, served ? tr("llm.serverOk") : tr("llm.serverNone")),
      );
      if (llm.mode === "proxy") renderProxy();
      else if (llm.mode === "direct") renderDirect();
      const status = h("span", { class: "small muted", id: "llm-test-result", role: "status" });
      const choice = runtimeChoice(llm, app.server);
      if (choice.fellBack) status.textContent = llm.mode === "direct" ? tr("llm.needKey") : tr("llm.serverNone");
      const testBtn = h(
        "button",
        {
          type: "button",
          id: "llm-test",
          disabled: llm.mode === "offline",
          onclick: async () => {
            const c = runtimeChoice(prefs.llm, app.server);
            if (c.mode === "offline") {
              status.textContent = c.fellBack ? (prefs.llm.mode === "direct" ? tr("llm.needKey") : tr("llm.serverNone")) : "";
              return;
            }
            testBtn.disabled = true;
            status.textContent = tr("llm.testing");
            status.className = "small muted";
            const settings = resolveAgentSettings(prefs.value, { provider: c.provider, model: c.model, locale: getLocale() }).settings;
            try {
              const config = browserResolveProvider(() => settings, () => c.mode)(c.provider, c.model);
              const r = await testConnection(config);
              status.textContent = r.ok ? tr("llm.testOk", { model: config.model }) : tr("llm.testFail", { error: r.message });
              status.className = `small ${r.ok ? "ok-text" : "bad-text"}`;
            } catch (err) {
              status.textContent = tr("llm.testFail", { error: err instanceof Error ? err.message : String(err) });
              status.className = "small bad-text";
            } finally {
              testBtn.disabled = false;
            }
          },
        },
        tr("llm.test"),
      );
      llmBox.append(
        h(
          "div",
          { class: "row wrap", style: "margin-top:12px" },
          h(
            "button",
            {
              type: "button",
              class: "primary",
              id: "llm-apply",
              onclick: () => {
                app.applySettings();
                app.toast(tr("toast.settingsApplied"));
              },
            },
            tr("llm.apply"),
          ),
          testBtn,
          status,
        ),
      );
    };

    const modelField = (id: string, value: string, suggestions: string[], placeholder: string, onChange: (v: string) => void): HTMLElement => {
      const listId = `${id}-list`;
      const input = h("input", { type: "text", id, value, placeholder, list: listId, autocomplete: "off", spellcheck: "false", onchange: (e: Event) => onChange((e.target as HTMLInputElement).value.trim()) });
      input.addEventListener("keydown", (e) => e.stopPropagation());
      return h("div", { class: "field" }, h("label", { for: id }, tr("llm.model"), h("small", null, tr("llm.modelHint"))), input, h("datalist", { id: listId }, suggestions.map((m) => h("option", { value: m }))));
    };

    const renderProxy = (): void => {
      const llm = prefs.llm;
      const providers = app.server?.providers ?? [];
      const sel = h(
        "select",
        {
          id: "proxy-provider",
          onchange: (e: Event) => {
            prefs.update((s) => {
              s.llm.proxyProvider = (e.target as HTMLSelectElement).value;
            });
            app.applySettings();
            renderLlm();
          },
        },
        h("option", { value: "" }, tr("llm.serverDefault")),
        providers
          .filter((p) => p.id !== "proxy" && p.id !== "offline")
          .map((p) => h("option", { value: p.id, selected: p.id === llm.proxyProvider }, `${p.name}${p.configured ? " ✓" : ""}`)),
      );
      const configured = providers.filter((p) => p.configured).map((p) => p.name);
      const current = providers.find((p) => p.id === llm.proxyProvider);
      append(llmBox, [
        h("div", { class: "field" }, h("label", { for: "proxy-provider" }, tr("llm.provider")), sel),
        configured.length ? h("p", { class: "small muted" }, tr("llm.serverProviders", { list: joinList(configured) })) : null,
        modelField("proxy-model", llm.proxyModel, current?.models ?? [], current?.defaultModel ?? "", (v) => {
          prefs.update((s) => {
            s.llm.proxyModel = v;
          });
          app.applySettings();
        }),
      ]);
    };

    const renderDirect = (): void => {
      const llm = prefs.llm;
      const templates = directTemplates();
      const tpl: ProviderTemplate = templates.find((t) => t.id === llm.directProvider) ?? templates[0];
      const L = getLocale();
      const sel = h(
        "select",
        {
          id: "direct-provider",
          onchange: (e: Event) => {
            prefs.update((s) => {
              s.llm.directProvider = (e.target as HTMLSelectElement).value;
              s.llm.directModel = "";
            });
            app.applySettings();
            renderLlm();
          },
        },
        templates.map((t) => h("option", { value: t.id, selected: t.id === tpl.id }, localizedName(t.name, L))),
      );
      const override = prefs.value.agent.providers?.[tpl.id]?.baseUrl ?? "";
      // A custom base URL the page's connect-src does not allow fails in the browser: say why and what to do.
      const baseNotice = h("p", { class: "notice bad-text", id: "direct-base-url-notice", role: "status" });
      const showBaseNotice = (v: string) => {
        const text = v ? directUrlNotice(checkDirectBaseUrl(v, pageConnectPolicy(app)), tpl.id) : "";
        baseNotice.textContent = text;
        baseNotice.hidden = !text;
      };
      showBaseNotice(override);
      const base = h("input", {
        type: "url",
        id: "direct-base-url",
        value: override,
        placeholder: tpl.baseUrl ?? "",
        spellcheck: "false",
        onchange: (e: Event) => {
          const v = (e.target as HTMLInputElement).value.trim();
          if (v && !validUrl(v)) {
            (e.target as HTMLInputElement).setCustomValidity("URL");
            (e.target as HTMLInputElement).reportValidity();
            return;
          }
          (e.target as HTMLInputElement).setCustomValidity("");
          showBaseNotice(v);
          prefs.update((s) => {
            const providers = { ...(s.agent.providers ?? {}) };
            const entry = { ...(providers[tpl.id] ?? {}) };
            if (v) entry.baseUrl = v;
            else delete entry.baseUrl;
            if (Object.keys(entry).length) providers[tpl.id] = entry;
            else delete providers[tpl.id];
            s.agent.providers = providers;
          });
          app.applySettings();
        },
      });
      base.addEventListener("keydown", (e) => e.stopPropagation());
      const key = h("input", {
        type: "password",
        id: "direct-key",
        autocomplete: "off",
        spellcheck: "false",
        value: KeyStore.get(tpl.id) ?? "",
        placeholder: tpl.noKey ? tr("llm.noKey") : "sk-…",
        disabled: !!tpl.noKey,
        onchange: (e: Event) => {
          KeyStore.set(tpl.id, (e.target as HTMLInputElement).value, prefs.llm.rememberKey);
          app.applySettings();
          renderLlm();
        },
      });
      key.addEventListener("keydown", (e) => e.stopPropagation());
      const show = h(
        "button",
        {
          type: "button",
          id: "direct-key-toggle",
          "aria-pressed": "false",
          onclick: () => {
            const visible = key.type === "password";
            key.type = visible ? "text" : "password";
            show.textContent = visible ? tr("llm.hide") : tr("llm.show");
            show.setAttribute("aria-pressed", String(visible));
          },
        },
        tr("llm.show"),
      );
      const remember = h("input", {
        type: "checkbox",
        id: "direct-remember",
        checked: llm.rememberKey,
        onchange: (e: Event) => {
          const on = (e.target as HTMLInputElement).checked;
          prefs.update((s) => {
            s.llm.rememberKey = on;
          });
          for (const t of templates) KeyStore.remember(t.id, on);
          renderLlm();
        },
      });
      llmBox.append(
        h("div", { class: "field" }, h("label", { for: "direct-provider" }, tr("llm.provider")), sel, tpl.notes ? h("small", { class: "muted" }, localizedName(tpl.notes, L)) : null),
        modelField("direct-model", llm.directModel, tpl.models ?? [], tpl.defaultModel ?? "", (v) => {
          prefs.update((s) => {
            s.llm.directModel = v;
          });
          app.applySettings();
        }),
        h("div", { class: "field" }, h("label", { for: "direct-base-url" }, tr("llm.baseUrl")), base, baseNotice),
        h(
          "div",
          { class: "field" },
          h("label", { for: "direct-key" }, tr("llm.apiKey"), tpl.keyUrl ? h("a", { href: tpl.keyUrl, target: "_blank", rel: "noreferrer noopener", class: "key-link" }, tr("llm.getKey")) : null),
          h("div", { class: "key-row" }, key, show, KeyStore.get(tpl.id) ? h("button", { type: "button", id: "direct-key-clear", onclick: () => (KeyStore.clear(tpl.id), app.applySettings(), renderLlm()) }, tr("llm.clearKey")) : null),
          h("small", { class: "muted" }, tr("llm.sessionOnly")),
        ),
        h("label", { class: "setting remember", for: "direct-remember" }, h("div", null, h("b", null, tr("llm.remember")), llm.rememberKey ? h("small", { class: "bad-text" }, tr("llm.rememberWarn")) : null), remember),
        h("p", { class: "notice" }, tr("llm.directWarn"), tpl.browserDirect === false ? ` ${tr("llm.corsWarn", { provider: providerName(tpl.id) })}` : ""),
      );
    };
    renderLlm();
    sections.push(llmBox);

    /* ---------------- agents & permissions ---------------- */
    const agent = prefs.value.agent;
    const selectRow = <T extends string>(id: string, label: string, hint: string, values: readonly T[], current: T, labelOf: (v: T) => string, apply: (v: T) => void) =>
      setting(
        label,
        hint,
        h(
          "select",
          {
            id,
            onchange: (e: Event) => {
              apply((e.target as HTMLSelectElement).value as T);
              app.applySettings();
            },
          },
          values.map((v) => h("option", { value: v, selected: v === current }, labelOf(v))),
        ),
        id,
      );
    sections.push(
      h(
        "section",
        { class: "settings-section", id: "section-agents" },
        h("h3", null, tr("pause.section.agents")),
        selectRow("setting-approval", tr("set.approval"), tr("set.approval.hint"), APPROVAL_MODES, (agent.approvalMode ?? "default") as ApprovalMode, (v) => tr(`set.approval.${v}`), (v) =>
          prefs.update((s) => {
            s.agent.approvalMode = v;
          }),
        ),
        selectRow("setting-scope", tr("set.scope"), tr("set.scope.hint"), SCOPES, (agent.practiceScope ?? "full") as PracticeScope, (v) => tr(`set.scope.${v}`), (v) =>
          prefs.update((s) => {
            s.agent.practiceScope = v;
          }),
        ),
        selectRow("setting-pipeline", tr("set.pipeline"), tr("set.pipeline.hint"), PIPELINES, agent.patient?.pipeline ?? "select-voice", (v) => tr(`set.pipeline.${v}`), (v) =>
          prefs.update((s) => {
            s.agent.patient = { ...(s.agent.patient ?? {}), pipeline: v };
          }),
        ),
        // "Embodied agents" (docs/EMBODIED.md R3): the mode of the next encounter; a running one keeps its own
        selectRow("setting-embodiment", tr("set.embodiment"), tr("set.embodiment.hint"), EMBODIMENTS, agent.embodiment === "clinical" ? "clinical" : "embodied", (v) => tr(v === "embodied" ? "set.embodiment.on" : "set.embodiment.off"), (v) =>
          prefs.update((s) => {
            s.agent.embodiment = v;
          }),
        ),
        game ? h("p", { class: "small muted", id: "embodiment-note" }, tr("set.embodiment.next", { mode: tr(game.embodied ? "emb.mode.embodied" : "emb.mode.clinical") })) : null,
      ),
    );

    /* ---------------- external agent (PROTOCOL §13.6): per encounter, never saved ---------------- */
    const externalBox = h("section", { class: "settings-section", id: "section-external" });
    let externalKey = "";
    const renderExternal = (): void => {
      const offered = !!game && app.externalOffered();
      const st = app.external.status;
      // in bypass mode the bridge refuses every call (nothing would ask the learner): say so
      const bypass = !!game && game.session.settings.approvalMode === "bypass";
      const key = JSON.stringify([offered, app.external.on, st?.liveSessionId ?? null, bypass]);
      if (key === externalKey) return;
      externalKey = key;
      clear(externalBox);
      externalBox.hidden = !offered;
      if (!offered) return;
      const toggle = h("input", {
        type: "checkbox",
        id: "external-toggle",
        role: "switch",
        checked: app.external.on,
        onchange: (e: Event) => void app.setExternalControl((e.target as HTMLInputElement).checked).then(renderExternal),
      });
      append(externalBox, [
        h("h3", null, tr("ext.section")),
        h("label", { class: "setting external-setting", for: "external-toggle" }, h("div", null, h("b", null, tr("ext.toggle")), h("small", null, tr("ext.toggleHint"))), toggle),
        app.external.on
          ? h("p", { class: "small muted external-howto", id: "external-howto" }, tr("ext.howTo"), h("code", null, tr("ext.command", { origin: location.origin, id: st?.liveSessionId ?? "ls_…" })))
          : null,
        bypass ? h("p", { class: "notice bad-text", id: "external-bypass" }, tr("ext.bypassNote")) : null,
      ]);
    };
    renderExternal();
    sections.push(externalBox);

    /* ---------------- save ---------------- */
    if (menu) {
      const file = h("input", {
        id: "save-file",
        type: "file",
        accept: ".json,application/json",
        hidden: true,
        onchange: (e: Event) => {
          const f = (e.target as HTMLInputElement).files?.[0];
          if (f) void app.importSave(f);
        },
      });
      sections.push(
        h(
          "section",
          { class: "settings-section", id: "section-save" },
          h("h3", null, tr("pause.section.save")),
          h(
            "div",
            { class: "row wrap" },
            h("button", { type: "button", id: "export-save", onclick: () => app.exportSave() }, tr("save.export")),
            h("button", { type: "button", id: "import-save", onclick: () => file.click() }, tr("save.import")),
            h("button", { type: "button", id: "new-game", class: "danger", onclick: () => app.open("confirm-reset") }, tr("save.newGame")),
          ),
          file,
          h("p", { class: "small muted" }, tr("save.note")),
        ),
      );
    } else if (!game) {
      sections.push(h("div", { class: "row wrap" }, resume));
    }

    const body = h("div", { class: "settings" }, sections);
    if (args.section) {
      requestAnimationFrame(() => body.querySelector(`#section-${args.section}`)?.scrollIntoView({ block: "start" }));
    }
    return {
      id: "pause",
      kicker: menu ? tr("pause.kicker") : tr("settings.kicker"),
      title: menu ? tr("pause.title") : tr("settings.title"),
      body,
      focus: menu ? resume : null,
      // external control can change under the open menu (the bridge connects, closes, the session ends)
      update() {
        renderExternal();
        lockAutopilot();
      },
    };
  };
}

/** V4 "重新开始" confirmation. */
export function confirmResetPanel(app: App): () => PanelView {
  return () => {
    const confirm = h("button", { type: "button", id: "confirm-reset", class: "danger-solid", onclick: () => void app.resetCase() }, tr("save.resetConfirm"));
    // Destructive confirmation: the initial focus is on "cancel" so a stray Enter never wipes progress.
    const cancel = h("button", { type: "button", id: "cancel-reset", onclick: () => app.open("pause", { menu: true }) }, tr("save.cancel"));
    return {
      id: "confirm",
      kicker: tr("pause.kicker"),
      title: tr("save.resetTitle"),
      variant: "narrow",
      body: [
        h("p", null, tr("save.resetBody")),
        h("div", { class: "row wrap" }, confirm, cancel, h("button", { type: "button", onclick: () => app.exportSave() }, tr("save.export"))),
      ],
      focus: cancel,
    };
  };
}
