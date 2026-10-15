/**
 * Pure logic of the web app layer (no DOM): addressing, settings
 * sanitising/merging, provider choice, save import validation and the
 * spatial station rules on the real clinic-v4 facility.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCatalog, parseFacility, PERSONAL_KIT } from "@clinicalcraft/core";
import { parseAddress } from "../ui/address.js";
import { runtimeChoice, type ServerInfo } from "./llm.js";
import { DEFAULT_INVENTORY, EXPORT_FORMAT, SaveStore } from "./persistence.js";
import { defaultSettings, resolveAgentSettings, sanitizeSettings } from "./settings.js";
import { missingCaps, Stations } from "./stations.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const content = path.resolve(here, "../../../content");
const readJson = (rel: string): unknown => JSON.parse(fs.readFileSync(path.join(content, rel), "utf8"));

describe("parseAddress", () => {
  const agents = ["patient", "nurse", "attending", "radiologist"];
  it("routes @role text and Chinese aliases", () => {
    expect(parseAddress("@nurse what are the vitals?", agents)).toEqual({ to: "nurse", text: "what are the vitals?" });
    expect(parseAddress("＠护士，现在血压多少", agents)).toEqual({ to: "nurse", text: "现在血压多少" });
    expect(parseAddress("@护士现在血压多少", agents)).toEqual({ to: "nurse", text: "现在血压多少" });
    expect(parseAddress("@上级医师 我的思路对吗", agents)).toEqual({ to: "attending", text: "我的思路对吗" });
  });
  it("keeps unknown or unavailable roles as plain text", () => {
    expect(parseAddress("@pharmacist hello", agents)).toEqual({ to: null, text: "@pharmacist hello" });
    expect(parseAddress("@家属 他平时怎样", agents)).toEqual({ to: null, text: "@家属 他平时怎样" });
    expect(parseAddress("where does it hurt?", agents)).toEqual({ to: null, text: "where does it hurt?" });
  });
});

describe("settings", () => {
  it("sanitises invalid values and never keeps secrets in the agent layer", () => {
    const s = sanitizeSettings({
      ui: { sound: "yes", sensitivity: 99, quality: "ultra", locale: "fr" },
      agent: { provider: "anthropic", model: "x", approvalMode: "auto", providers: { anthropic: { apiKey: "sk-ant-secret", baseUrl: "https://example.org" } }, hooks: { Stop: [] } },
      llm: { mode: "telepathy", rememberKey: "true" },
    });
    expect(s.ui.sound).toBe(defaultSettings().ui.sound);
    expect(s.ui.sensitivity).toBe(1);
    expect(s.ui.quality).toBe(defaultSettings().ui.quality);
    expect(s.ui.locale).toBeNull();
    expect(s.llm.mode).toBe("offline");
    expect(s.llm.rememberKey).toBe(false);
    expect(JSON.stringify(s)).not.toContain("sk-ant-secret");
    expect(s.agent.provider).toBeUndefined();
    expect(s.agent.hooks).toBeUndefined();
    expect(s.agent.providers?.anthropic?.baseUrl).toBe("https://example.org");
  });

  it("merges the stored layer with the runtime choice through the agent's merge helpers", () => {
    const stored = sanitizeSettings({ agent: { approvalMode: "strict", practiceScope: "workup", patient: { pipeline: "tool" } } });
    const { settings } = resolveAgentSettings(stored, { provider: "offline", model: null, locale: "en" });
    expect(settings.provider).toBe("offline");
    expect(settings.locale).toBe("en");
    expect(settings.approvalMode).toBe("strict");
    expect(settings.practiceScope).toBe("workup");
    expect(settings.patient.pipeline).toBe("tool");
    expect(settings.hooks).toEqual({});
  });
});

describe("runtimeChoice", () => {
  const llm = defaultSettings().llm;
  const served: ServerInfo = { served: true, health: { ok: true }, providers: [] };
  it("is offline by default", () => {
    expect(runtimeChoice(llm, null)).toEqual({ provider: "offline", model: null, mode: "offline", fellBack: false });
  });
  it("uses the proxy only when served by clinicalcraft serve", () => {
    expect(runtimeChoice({ ...llm, mode: "proxy" }, null)).toMatchObject({ provider: "offline", fellBack: true });
    expect(runtimeChoice({ ...llm, mode: "proxy", proxyProvider: "zhipu", proxyModel: "glm-4.6" }, served)).toEqual({ provider: "proxy:zhipu", model: "glm-4.6", mode: "proxy", fellBack: false });
    expect(runtimeChoice({ ...llm, mode: "proxy" }, served).provider).toBe("proxy");
  });
  it("falls back to offline in direct mode without a key, except for key-less local servers", () => {
    expect(runtimeChoice({ ...llm, mode: "direct", directProvider: "anthropic" }, null)).toMatchObject({ mode: "offline", fellBack: true });
    expect(runtimeChoice({ ...llm, mode: "direct", directProvider: "ollama" }, null)).toMatchObject({ mode: "direct", provider: "ollama" });
  });
});

describe("SaveStore.parseImport", () => {
  const known = { cases: new Set(["smzl-lung-adeno"]), facilities: new Set(["clinic-v4"]) };
  const session = { format: "clinicalcraft-session@1", sessionId: "s1", caseId: "smzl-lung-adeno", caseVersion: "1.0.0", facilityId: "clinic-v4", locale: "zh-CN", actions: [{ type: "start" }, { type: "ask", itemId: "pain" }, { type: "bogus" }], messages: {}, plan: [], createdAt: "2026-01-01T00:00:00Z" };
  const file = { format: EXPORT_FORMAT, version: 1, session, facilityId: "clinic-v4", world: null, inventory: { ...DEFAULT_INVENTORY }, settings: {} };

  it("accepts a valid V5 save and drops malformed actions", () => {
    const r = SaveStore.parseImport(JSON.stringify(file), known);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.file.session.actions).toEqual([{ type: "start" }, { type: "ask", itemId: "pain" }]);
  });
  it("rejects invalid files like V4 did", () => {
    expect(SaveStore.parseImport("{", known)).toMatchObject({ ok: false, error: "save.invalid" });
    expect(SaveStore.parseImport(JSON.stringify({ ...file, format: "clinical-craft-v4" }), known)).toMatchObject({ ok: false, error: "save.invalid" });
    expect(SaveStore.parseImport(JSON.stringify({ ...file, session: { ...session, caseId: "nope" } }), known)).toMatchObject({ ok: false, error: "save.unknownCase" });
    expect(SaveStore.parseImport(JSON.stringify({ ...file, facilityId: "mars" }), known)).toMatchObject({ ok: false, error: "save.unknownFacility" });
    expect(SaveStore.parseImport(JSON.stringify({ ...file, inventory: { ...DEFAULT_INVENTORY, wood: -1 } }), known)).toMatchObject({ ok: false, error: "save.badInventory" });
    expect(SaveStore.parseImport("x".repeat(2_000_001), known)).toMatchObject({ ok: false, error: "save.tooLarge" });
  });
});

describe("Stations (clinic-v4)", () => {
  const catalogs = ["materials", "core-furniture", "core-clinical", "core-diagnostics"].map((id) => {
    const r = parseCatalog(readJson(`catalogs/${id}.json`));
    if (!r.ok) throw new Error(`catalog ${id} invalid`);
    return r.value;
  });
  const fr = parseFacility(readJson("facilities/clinic-v4.json"));
  if (!fr.ok) throw new Error("clinic-v4 invalid");
  const st = new Stations(fr.value, catalogs);

  it("finds the V4 lab workstation for a CBC and the imaging station for CT", () => {
    const lab = st.providersOf(["lab-hematology"]).filter((p) => st.kindOf(p) === "workstation");
    expect(lab.length).toBeGreaterThan(0);
    expect(st.caps(lab[0].id)).toEqual(expect.arrayContaining(["lab-hematology", "flow-cytometry"]));
    const ct = st.nearestProvider(["ct"], { x: 0, z: 19 }, "zh-CN");
    expect(ct?.label).toBeTruthy();
    expect(st.providersOf([])).toEqual([]);
  });

  it("always includes the personal kit at the bedside", () => {
    const caps = st.bedsideCaps(fr.value.patientSlots[0].id);
    for (const k of PERSONAL_KIT) expect(caps.has(k)).toBe(true);
    expect(missingCaps(["stethoscope", "ct"], caps)).toEqual(["ct"]);
  });
});
