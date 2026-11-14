/**
 * Whose vitals a live screen in the 3D world shows (audit 2026-11-12 P2-13, EMBODIED §6): the world model's answer
 * where the device stands now (`WorldRuntime.screenPatient`, asked through `EmbodiedLink.screenSlot`), never the bed
 * the screen was built beside. The audit's retest, headless: the ECG cart of resus 2 wheeled to the STEMI patient in
 * resus 1 and connected shows her; the cart of her own bed, connected and wheeled to resus 2, no longer does. Only
 * without a world model (clinical mode) is the bed space it was built beside used.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { compileFacility, parseCase, parseCatalog, parseFacility, type EquipmentCatalog, type FacilityDefinition } from "@clinicalcraft/core";
import { setLocale } from "../i18n/index.js";
import { ActionFeedback } from "../ui/feedback.js";
import { screenSource } from "../world/screen-source.js";
import { BrowserMover } from "./embodied.js";
import { EmbodiedLink } from "./embodied-link.js";
import { startAppSession, type AppSession } from "./session.js";
import { defaultSettings } from "./settings.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const content = path.resolve(here, "../../../content");
const json = (p: string) => JSON.parse(fs.readFileSync(path.join(content, p), "utf8"));
const parsed = parseFacility(json("facilities/general-hospital.json"));
if (!parsed.ok) throw new Error("general-hospital does not parse");
const compiled = compileFacility(parsed.value, []);
if (!compiled.ok) throw new Error("general-hospital does not compile");
const facility: FacilityDefinition = compiled.facility;
const catalogs: EquipmentCatalog[] = fs
  .readdirSync(path.join(content, "catalogs"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => parseCatalog(json(`catalogs/${f}`)))
  .flatMap((r) => (r.ok ? [r.value] : []));

let open: { app: AppSession; link: EmbodiedLink }[] = [];
afterEach(async () => {
  for (const o of open) {
    o.link.dispose();
    await o.app.close();
  }
  open = [];
  setLocale("zh-CN");
});

async function stemi(): Promise<{ app: AppSession; link: EmbodiedLink }> {
  setLocale("en");
  const r = parseCase(json("cases/stemi-inferior-rv/case.json"));
  if (!r.ok) throw new Error("stemi does not parse");
  const stored = defaultSettings();
  stored.agent.approvalMode = "bypass";
  const app = await startAppSession({ caseDef: r.value, facility, catalogs, stored, choice: { provider: "offline", model: null, mode: "offline", fellBack: false }, locale: "en", served: false, embodiment: "embodied" });
  app.submit({ type: "configure", patch: { approvalMode: "bypass" } });
  app.session.dispatch({ type: "start" });
  const link = new EmbodiedLink({ app, renderer: () => null, mover: new BrowserMover({ renderer: () => null }), facility, caseDef: r.value, slotId: "resus-1", feedback: new ActionFeedback(() => null, () => null, () => undefined), toast: () => undefined, locale: () => "en" });
  open.push({ app, link });
  return { app, link };
}

describe("screenSource: the slot a live screen shows when it is drawn", () => {
  const drawn = (slot: string) => slot === "resus-1";
  it("asks first: the world model's answer, whatever bed the screen was built beside", () => {
    expect(screenSource({ placementId: "resus2-ecg", slotId: "resus-2" }, () => "resus-1", drawn)).toBe("resus-1");
    expect(screenSource({ placementId: "resus1-ecg", slotId: "resus-1" }, () => null, drawn)).toBeNull();
  });
  it("without a world model to ask (clinical mode, the harness): the bed space it was built beside", () => {
    expect(screenSource({ placementId: "resus1-monitor", slotId: "resus-1" }, () => undefined, drawn)).toBe("resus-1");
    expect(screenSource({ placementId: "resus1-monitor", slotId: "resus-1" }, undefined, drawn)).toBe("resus-1");
    expect(screenSource({ placementId: "cub2-ecg", slotId: null }, undefined, drawn)).toBeNull();
  });
  it("only a patient this scene draws", () => {
    expect(screenSource({ placementId: "resus2-monitor", slotId: "resus-2" }, undefined, drawn)).toBeNull();
    expect(screenSource({ placementId: "resus2-ecg", slotId: "resus-2" }, () => "resus-2", drawn)).toBeNull();
  });
});

describe("the live screens of moved carts follow the world (the audit's retest)", () => {
  it("a cart from the other bed wheeled to the patient and connected shows her; the one from her bed wheeled away does not", async () => {
    const { link } = await stemi();
    const ask = (id: string) => link.screenSlot(id);
    const built = (id: string, slotId: string | null) => screenSource({ placementId: id, slotId }, ask, (s) => s === "resus-1");
    // as built: her monitor and her bed's defibrillator show her; the next bed's equipment and the idle carts do not
    expect(built("resus1-monitor", "resus-1")).toBe("resus-1");
    expect(built("resus1-defibrillator", "resus-1")).toBe("resus-1");
    expect(built("resus2-defibrillator", "resus-2")).toBeNull();
    expect(built("resus1-ecg", "resus-1")).toBeNull();
    expect(built("resus2-ecg", "resus-2")).toBeNull();

    // resus 2's cart, wheeled to her and connected: it shows her, though it was built beside resus 2
    expect((await link.worldAction({ operation: "approach", targetId: "eq:resus2-ecg" }))?.status).toBe("completed");
    const brought = await link.worldAction({ operation: "move_to", targetId: "eq:resus2-ecg", goal: { kind: "interact", id: "patient:resus-1" } });
    expect(brought?.status, brought?.message).toBe("completed");
    expect(built("resus2-ecg", "resus-2")).toBeNull(); // by her bed, idle: nothing on her yet
    for (const op of ["prepare", "connect"]) {
      const r = await link.worldAction({ operation: op, targetId: "eq:resus2-ecg" });
      expect(r?.status, `${op}: ${r?.message}`).toBe("completed");
    }
    expect(link.deviceState("eq:resus2-ecg")).toBe("connected");
    expect(built("resus2-ecg", "resus-2")).toBe("resus-1");

    // her own bed's cart, connected, then wheeled to resus 2: it no longer shows her, though built beside her bed
    for (const op of ["prepare", "connect"]) {
      const r = await link.worldAction({ operation: op, targetId: "eq:resus1-ecg" });
      expect(r?.status, `${op}: ${r?.message}`).toBe("completed");
    }
    expect(built("resus1-ecg", "resus-1")).toBe("resus-1");
    const away = await link.worldAction({ operation: "move_to", targetId: "eq:resus1-ecg", goal: { kind: "interact", id: "eq:resus2-monitor" } });
    expect(away?.status, away?.message).toBe("completed");
    // wheeled away, its leads come off (the world unplugs it: back to "prepared")
    expect(link.deviceState("eq:resus1-ecg")).toBe("prepared");
    expect(built("resus1-ecg", "resus-1")).toBeNull();
    // and resus 2's cart still shows her
    expect(built("resus2-ecg", "resus-2")).toBe("resus-1");
  });
});
