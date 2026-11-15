/**
 * Pure logic of the web app layer (no DOM): addressing (a role, or a colleague by name or by the position they hold in
 * the team — the agent's own resolver), settings
 * sanitising/merging, provider choice, save import validation and the
 * spatial station rules on the real clinic-v4 facility.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encounterRoom, lookupStaff } from "@clinicalcraft/agent";
import { createSession, parseCatalog, parseFacility, PERSONAL_KIT, reduce } from "@clinicalcraft/core";
import { theatreCase, theatreFacility } from "../../../world/src/__fixtures__/theatre.js";
import { parseAddress, staffAddress } from "../ui/address.js";
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

describe("staffAddress: a colleague named in an @ mention, by the session's own resolver", () => {
  const caseDef = theatreCase();
  const facility = theatreFacility();
  const agents = ["patient", "nurse", "attending", "radiologist"];
  const stateOf = (start: Record<string, unknown>) => reduce(caseDef, createSession(caseDef), { type: "start", ...start } as never).state;
  /** What the agent's one resolver answers for the words (the position tier: the team as it is in this encounter). */
  const resolver = (state: ReturnType<typeof stateOf>, words: string) => lookupStaff(facility, words, encounterRoom(caseDef, facility), { caseDef, state });

  it("@一助, @二助, @扶镜手, @first assistant, @camera holder route to whoever holds the position in this encounter — the agent's lookupStaff, never a table of the web's own", () => {
    const three = { facility, caseDef, state: stateOf({ lineup: "three-surgeons" }) };
    expect(staffAddress("@一助 请拉一下胆囊", three, agents)).toEqual({ kind: "one", staffId: "doc-1", role: "attending", agent: "attending", text: "请拉一下胆囊" });
    expect(staffAddress("@一助请拉一下胆囊", three, agents)).toMatchObject({ kind: "one", staffId: "doc-1", text: "请拉一下胆囊" });
    expect(staffAddress("@二助 镜头近一点", three, agents)).toMatchObject({ kind: "one", staffId: "doc-2", text: "镜头近一点" });
    // with three surgeons the second assistant holds the camera; with two, the first assistant does
    expect(staffAddress("@扶镜手 镜头近一点", three, agents)).toMatchObject({ kind: "one", staffId: "doc-2" });
    const two = { facility, caseDef, state: stateOf({}) };
    expect(staffAddress("@扶镜手 镜头近一点", two, agents)).toMatchObject({ kind: "one", staffId: "doc-1" });
    expect(staffAddress("@camera holder closer, please", two, agents)).toMatchObject({ kind: "one", staffId: "doc-1", text: "closer, please" });
    expect(staffAddress("@first assistant hold the gallbladder", two, agents)).toEqual({ kind: "one", staffId: "doc-1", role: "attending", agent: "attending", text: "hold the gallbladder" });
    // each is exactly what the agent's resolver says
    for (const [words, state] of [["一助", three.state], ["二助", three.state], ["扶镜手", three.state], ["扶镜手", two.state], ["first assistant", two.state]] as const) {
      const found = resolver(state, words);
      expect(found.kind, words).toBe("one");
      expect(staffAddress(`@${words} …`, { facility, caseDef, state }, agents), words).toMatchObject({ staffId: found.kind === "one" ? found.staff.id : "" });
    }
  });

  it("@术者 / @主刀 is whoever operates: the stand-in while the learner holds a place; operating themselves, nobody else answers to it", () => {
    const placed = { facility, caseDef, state: stateOf({ seat: "first-assistant" }) };
    expect(staffAddress("@术者 我看到胆囊管了", placed, agents)).toMatchObject({ kind: "one", staffId: "doc-0", agent: "attending", text: "我看到胆囊管了" });
    expect(staffAddress("@主刀 可以夹闭了", placed, agents)).toMatchObject({ kind: "one", staffId: "doc-0" });
    const operating = { facility, caseDef, state: stateOf({}) };
    expect(staffAddress("@术者 我看到胆囊管了", operating, agents)).toBeNull();
    expect(resolver(operating.state, "术者").kind).toBe("none");
    // an agent's own words are left to parseAddress, and plain text is no mention
    expect(staffAddress("@nurse what are the vitals?", operating, agents)).toBeNull();
    expect(staffAddress("@护士 血压多少", operating, agents)).toBeNull();
    expect(staffAddress("where does it hurt?", operating, agents)).toBeNull();
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
  it("takes the server's default model of the chosen upstream when none is set (vision, tools follow the model)", () => {
    const withDefaults: ServerInfo = { served: true, health: { ok: true }, providers: [{ id: "anthropic", configured: true, name: "Anthropic", defaultModel: "claude-opus-5-5", models: ["claude-opus-5-5"] }] };
    expect(runtimeChoice({ ...llm, mode: "proxy", proxyProvider: "anthropic" }, withDefaults).model).toBe("claude-opus-5-5");
    expect(runtimeChoice({ ...llm, mode: "proxy", proxyProvider: "anthropic", proxyModel: "claude-sonnet-5-5" }, withDefaults).model).toBe("claude-sonnet-5-5");
    expect(runtimeChoice({ ...llm, mode: "proxy" }, withDefaults).model).toBeNull();
    expect(runtimeChoice({ ...llm, mode: "proxy", proxyProvider: "zhipu" }, withDefaults).model).toBeNull();
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
    if (r.ok) expect(r.file.session.nextOrdinal).toBeUndefined();
  });
  it("keeps the transcript's next ordinal so a resume continues the same file's sequence", () => {
    const ok = SaveStore.parseImport(JSON.stringify({ ...file, session: { ...session, nextOrdinal: 77 } }), known);
    expect(ok.ok && ok.file.session.nextOrdinal).toBe(77);
    const bad = SaveStore.parseImport(JSON.stringify({ ...file, session: { ...session, nextOrdinal: -3 } }), known);
    expect(bad.ok && bad.file.session.nextOrdinal).toBeUndefined();
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
