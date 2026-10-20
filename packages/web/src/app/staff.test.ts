/**
 * Who a conversation with a colleague is with (no DOM): `@nurse` is the nurse
 * the world would send to this patient (the agent's own `pickStaff`: of that
 * role, the one nearest the patient) — by name, in both modes; and the
 * learner's delegation reads as a sentence.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { compileFacility, parseCase, parseCatalog, parseFacility, type EquipmentCatalog, type FacilityDefinition } from "@clinicalcraft/core";
import { setLocale } from "../i18n/index.js";
import { startAppSession } from "./session.js";
import { defaultSettings } from "./settings.js";
import { delegateLine, delegationSummary, staffById, staffForAgent } from "./staff.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const content = path.resolve(here, "../../../content");
const json = (p: string) => JSON.parse(fs.readFileSync(path.join(content, p), "utf8"));
const facilityOf = (id: string): FacilityDefinition => {
  const parsed = parseFacility(json(`facilities/${id}.json`));
  if (!parsed.ok) throw new Error(`${id} does not parse`);
  const compiled = compileFacility(parsed.value, []);
  if (!compiled.ok) throw new Error(`${id} does not compile`);
  return compiled.facility;
};
const hospital = facilityOf("general-hospital");
const clinic = facilityOf("clinic-v4");
const catalogs: EquipmentCatalog[] = fs
  .readdirSync(path.join(content, "catalogs"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => parseCatalog(json(`catalogs/${f}`)))
  .flatMap((r) => (r.ok ? [r.value] : []));

afterAll(() => setLocale("zh-CN"));

describe("the colleague behind a session agent", () => {
  it("clinical mode: the facility's staff of that role nearest the patient's bed, by name", () => {
    setLocale("en");
    const ctx = { facility: hospital, slotId: "resus-1", world: null };
    expect(staffForAgent("nurse", ctx)).toEqual({ staffId: "ed-nurse", role: "nurse", name: "Lin Xiao" });
    expect(staffForAgent("pathologist", ctx)?.role).toMatch(/^(pathologist|lab-tech)$/);
    expect(staffForAgent("attending", ctx)).toEqual({ staffId: "attending", role: "attending", name: "Dr Xu Ming" });
    setLocale("zh-CN");
    expect(staffForAgent("nurse", ctx)?.name).toBe("林晓");
    // nobody of that kind on duty (the V4 clinic has no staff): null — the window names the role instead
    expect(staffForAgent("nurse", { facility: clinic, slotId: clinic.patientSlots[0]!.id, world: null })).toBeNull();
    expect(staffForAgent("examiner", ctx)).toBeNull();
  });

  it("embodied mode: the world's own choice (the nurse a delegation would send)", async () => {
    setLocale("en");
    const r = parseCase(json("cases/stemi-inferior-rv/case.json"));
    if (!r.ok) throw new Error("case");
    const app = await startAppSession({ caseDef: r.value, facility: hospital, catalogs, stored: defaultSettings(), choice: { provider: "offline", model: null, mode: "offline", fellBack: false }, locale: "en", served: false, embodiment: "embodied" });
    try {
      const ctx = { facility: hospital, slotId: "resus-1", world: app.world() };
      expect(staffForAgent("nurse", ctx)).toEqual({ staffId: "ed-nurse", role: "nurse", name: "Lin Xiao" });
      expect(staffById("triage-nurse", ctx)).toEqual({ staffId: "triage-nurse", role: "nurse", name: "Yang Jie" });
      expect(staffById("nobody", ctx)).toBeNull();
    } finally {
      await app.close();
    }
  });
});

describe("a delegation as the learner reads it", () => {
  it("names the colleague and the task in both languages; other lines are left alone", () => {
    const nameOf = (id: string) => (id === "ed-nurse" ? "Lin Xiao" : null);
    setLocale("en");
    expect(delegateLine("/delegate staff:ed-nurse attach_monitor", nameOf)).toBe("Lin Xiao, please: Attach the monitor");
    expect(delegateLine("/delegate staff:ed-nurse record_ecg", nameOf)).toBe("Lin Xiao, please: Record a 12-lead ECG");
    setLocale("zh-CN");
    expect(delegateLine("/delegate staff:ed-nurse obtain_iv_access", (id) => (id === "ed-nurse" ? "林晓" : null))).toBe("林晓，请：建立静脉通路");
    expect(delegateLine("/delegate nurse attach_monitor", nameOf)).toBe("护士，请：连接监护仪");
    expect(delegateLine("/vitals", nameOf)).toBeNull();
    expect(delegateLine("/delegate", nameOf)).toBeNull();
  });
});

describe("a delegation's outcome as the learner reads it", () => {
  const steps = [
    { operation: "navigate", target: "patient:resus-1", status: "completed", message: "Arrived" },
    { operation: "attach", target: "eq:resus1-monitor", status: "completed", message: "Done" },
  ];
  const data = { ok: true, data: { delegation: { staffId: "staff:ed-nurse", role: "nurse", task: "attach_monitor", status: "completed", steps, elapsedSeconds: 3.2, clockMinutes: 1, distance: 12 } } };
  const names: Record<string, string> = { "staff:ed-nurse": "林晓", "patient:resus-1": "刘振华（化名）", "eq:resus1-monitor": "抢救监护仪 1" };
  const nameOf = (id: string) => names[id] ?? null;

  it("names the colleague, the task, each step's operation and target — never their ids", () => {
    setLocale("zh-CN");
    const s = delegationSummary(data, nameOf)!;
    expect(s.head).toBe("林晓——连接监护仪：完成（2 步，模拟用时 3 秒）");
    expect(s.steps).toEqual(["1. 步行前往 · 刘振华（化名）：完成", "2. 连接床旁监护 · 抢救监护仪 1：完成"]);
    setLocale("en");
    const en = delegationSummary(data, (id) => ({ "staff:ed-nurse": "Lin Xiao", "patient:resus-1": "Liu Zhenhua", "eq:resus1-monitor": "Resus Monitor 1" })[id] ?? null)!;
    expect(en.head).toBe("Lin Xiao — Attach the monitor: done (2 steps, 3 s simulated)");
    expect(en.steps[1]).toBe("2. Attach the bedside monitor · Resus Monitor 1: done");
  });

  it("says why a step failed, in words, and returns null for anything that is not a delegation", () => {
    setLocale("en");
    const failed = { ok: false, data: { delegation: { staffId: "staff:ed-nurse", role: "nurse", task: "record_ecg", status: "failed", steps: [{ operation: "move_to", target: "eq:cub2-ecg", status: "failed", code: "PATH_BLOCKED", message: "The way is blocked (move_to).\nnavigate_to {}" }], elapsedSeconds: 0 } } };
    const s = delegationSummary(failed, () => null)!;
    expect(s.head).toContain("failed");
    expect(s.steps).toEqual(["1. Wheel it there · cub2-ecg: failed — The way is blocked."]);
    expect(delegationSummary({ ok: true, data: null }, nameOf)).toBeNull();
    expect(delegationSummary(undefined, nameOf)).toBeNull();
  });
});
