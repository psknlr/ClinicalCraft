/**
 * The live trace's labels (no DOM): span names are runtime identifiers
 * (`navigate`, `attach`, `entity.state`, `order_test ecg-12lead`,
 * `delegate:attach_monitor`, `MOVEMENT_INTERRUPTED` …) — the autopilot window
 * shows them in the learner's language, case items by their names, staff by
 * name. Checked on the names a real embodied run records (offline autopilot
 * and a delegated nurse, headless), in both languages.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compileFacility, parseCase, parseCatalog, parseFacility, type CaseDefinition, type EquipmentCatalog, type FacilityDefinition } from "@clinicalcraft/core";
import type { TraceSpan } from "@clinicalcraft/world";
import { setLocale } from "../../i18n/index.js";
import { startAppSession, type AppSession } from "../../app/session.js";
import { defaultSettings } from "../../app/settings.js";
import { traceActorLabel, traceCodeLabel, traceLabel, type TraceLabelContext } from "./trace-labels.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const content = path.resolve(here, "../../../../content");
const json = (p: string) => JSON.parse(fs.readFileSync(path.join(content, p), "utf8"));
const parsedCase = parseCase(json("cases/stemi-inferior-rv/case.json"));
if (!parsedCase.ok) throw new Error("stemi-inferior-rv does not parse");
const stemi: CaseDefinition = parsedCase.value;
const parsedFacility = parseFacility(json("facilities/general-hospital.json"));
if (!parsedFacility.ok) throw new Error("general-hospital does not parse");
const compiled = compileFacility(parsedFacility.value, []);
if (!compiled.ok) throw new Error("general-hospital does not compile");
const facility: FacilityDefinition = compiled.facility;
const catalogs: EquipmentCatalog[] = fs
  .readdirSync(path.join(content, "catalogs"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => parseCatalog(json(`catalogs/${f}`)))
  .flatMap((r) => (r.ok ? [r.value] : []));

const ctx: TraceLabelContext = { caseDef: stemi, name: (id) => (id === "staff:ed-nurse" ? "林晓" : null) };

describe("trace labels", () => {
  afterAll(() => setLocale("zh-CN"));

  it("names operations, observations, clinical tools and state changes in both languages", () => {
    setLocale("zh-CN");
    expect(traceLabel("observation", "inspect", ctx)).toBe("查看对象");
    expect(traceLabel("navigation", "navigate", ctx)).toBe("步行前往");
    expect(traceLabel("interaction", "attach", ctx)).toBe("连接床旁监护");
    expect(traceLabel("clinical_action", "intervene", ctx)).toBe("处置");
    expect(traceLabel("state_change", "entity.state", ctx)).toBe("设备状态改变");
    expect(traceLabel("state_change", "intervention.applied,flag.changed,time.advanced", ctx)).toBe("已处置、状态标记改变、时间推进");
    setLocale("en");
    expect(traceLabel("observation", "inspect", ctx)).toBe("Inspect");
    expect(traceLabel("navigation", "navigate", ctx)).toBe("Walk");
    expect(traceLabel("interaction", "attach", ctx)).toBe("Attach the bedside monitor");
    expect(traceLabel("clinical_action", "intervene", ctx)).toBe("Treat");
    expect(traceLabel("state_change", "actor.moved,entity.state", ctx)).toBe("Moved, Device state changed");
  });

  it("names a step by its tool and the case item, a delegation by its task, a skill by its own name", () => {
    setLocale("zh-CN");
    expect(traceLabel("plan", "order_test ecg-12lead", ctx)).toBe("开检查 · 12导联心电图");
    expect(traceLabel("plan", "intervene cardiac-monitoring", ctx)).toBe(`处置 · ${(stemi.interventions.find((i) => i.id === "cardiac-monitoring")!.name as Record<string, string>)["zh-CN"]}`);
    expect(traceLabel("plan", "delegate:attach_monitor", ctx)).toBe("委派：连接监护仪");
    expect(traceLabel("plan", "skill:perform_ecg", ctx)).toMatch(/^技能：.*心电图/);
    expect(traceLabel("verification", "monitor attached", ctx)).toBe("监护仪已连接");
    expect(traceLabel("verification", "ordered ecg-12lead", ctx)).toBe("已开具 · 12导联心电图");
    setLocale("en");
    expect(traceLabel("plan", "order_test ecg-12lead", ctx)).toBe("Order a test · 12-lead ECG");
    expect(traceLabel("plan", "delegate:attach_monitor", ctx)).toBe("Delegate: Attach the monitor");
    expect(traceLabel("verification", "order", ctx)).toBe("Order a test");
  });

  it("keeps a name it does not know as it is", () => {
    setLocale("zh-CN");
    expect(traceLabel("interaction", "juggle", ctx)).toBe("juggle");
    expect(traceLabel("plan", "frobnicate thing-1", ctx)).toBe("frobnicate · thing-1");
  });

  it("names actors (staff by name) and error codes", () => {
    setLocale("zh-CN");
    expect(traceActorLabel("staff:ed-nurse", ctx)).toBe("林晓");
    expect(traceActorLabel("actor:clinician", ctx)).toBe("临床医生");
    expect(traceActorLabel("staff:unknown", ctx)).toBe("unknown");
    expect(traceCodeLabel("MOVEMENT_INTERRUPTED")).toBe("行走被打断");
    expect(traceCodeLabel("NOT_IN_RANGE")).toBe("距离不够");
    expect(traceCodeLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
    setLocale("en");
    expect(traceActorLabel("actor:clinician", ctx)).toBe("Clinician");
    expect(traceCodeLabel("NOT_VISIBLE")).toBe("no line of sight");
  });
});

describe("every name a real embodied run records is localised", () => {
  let app: AppSession | null = null;
  let spans: TraceSpan[] = [];

  beforeAll(async () => {
    const stored = defaultSettings();
    stored.agent.approvalMode = "bypass";
    app = await startAppSession({ caseDef: stemi, facility, catalogs, stored, choice: { provider: "offline", model: null, mode: "offline", fellBack: false }, locale: "zh-CN", served: false, embodiment: "embodied" });
    app.submit({ type: "configure", patch: { approvalMode: "bypass" } });
    // a delegated nurse, then the clinician agent through the whole case (headless: bodies arrive at once)
    app.submit({ type: "user_message", text: "/delegate staff:ed-nurse attach_monitor" });
    const t0 = Date.now();
    while (!app.session.state.monitorAttachedAt && Date.now() - t0 < 20_000) await new Promise((r) => setTimeout(r, 20));
    await app.autopilot();
    spans = app.session.trace().spans;
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    setLocale("zh-CN");
  });

  it("records the kinds the window shows", () => {
    const kinds = new Set(spans.map((s) => s.kind));
    for (const k of ["plan", "navigation", "interaction", "clinical_action", "state_change", "verification", "observation"]) expect(kinds.has(k as TraceSpan["kind"]), k).toBe(true);
    expect(app?.session.state.finished).toBe(true);
    expect(spans.map((s) => `${s.kind}:${s.name}`)).toEqual(expect.arrayContaining(["plan:order_test ecg-12lead", "plan:delegate:attach_monitor", "interaction:record", "verification:monitor attached"]));
  });

  it("zh-CN: no runtime identifier is left in a label", () => {
    setLocale("zh-CN");
    const runCtx: TraceLabelContext = { caseDef: stemi, name: (id) => (app?.world()?.entity(id) ? (app.world()!.entity(id)!.name as Record<string, string>)["zh-CN"] ?? null : null) };
    const leaks: string[] = [];
    for (const s of spans) {
      const label = traceLabel(s.kind, s.name, runCtx);
      // every token of the raw name with a Latin letter (tool, operation, event type, item id) must be gone
      const tokens = s.name.split(/[\s,:]+/).filter((t) => /[a-z]/i.test(t));
      if (tokens.some((t) => label.includes(t))) leaks.push(`${s.kind}:${s.name} → ${label}`);
      if (s.refs.errorCode && /^[A-Z_]+$/.test(traceCodeLabel(s.refs.errorCode))) leaks.push(`code ${s.refs.errorCode}`);
    }
    expect([...new Set(leaks)]).toEqual([]);
    expect(spans.some((s) => s.actorId?.startsWith("staff:"))).toBe(true);
    for (const s of spans) if (s.actorId) expect(traceActorLabel(s.actorId, runCtx)).not.toMatch(/^(actor|staff):/);
  });

  it("en: labels are words, not identifiers", () => {
    setLocale("en");
    const leaks = spans.map((s) => [s.name, traceLabel(s.kind, s.name, ctx)] as const).filter(([raw, label]) => label === raw || /[a-z]+[._][a-z]+/.test(label));
    expect([...new Set(leaks.map(([raw, label]) => `${raw} → ${label}`))]).toEqual([]);
  });
});
