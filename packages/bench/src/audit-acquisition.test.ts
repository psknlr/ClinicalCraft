/**
 * The spatial audit covers acquisitions (EMBODIED §8.7, audit 2026-11-12 P1-7): a study done on the patient at a
 * device is recorded by the session (`order.acquired`), and the audit judges it on the world as it was at the commit —
 * the patient on the device —, not on a body. An acquisition recorded with the patient elsewhere is a violation.
 */
import { describe, expect, it } from "vitest";
import { createSession, mergeSettings, type ClinicalSession } from "@clinicalcraft/agent";
import { catalogsFor, chooseFacility, loadContent } from "@clinicalcraft/agent/node";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { Auditor } from "./audit.js";

const content = await loadContent({ dirs: [] });

async function peSession(): Promise<ClinicalSession> {
  const caseDef = content.cases.get("pulmonary-embolism-postop")!.def;
  const facility = chooseFacility(content, caseDef, undefined, null)!;
  const settings = mergeSettings([{ source: "flag", settings: { provider: "offline", locale: "en", embodiment: "embodied", approvalMode: "bypass", transcripts: { enabled: false } } }]);
  return createSession({ caseDef, facility, catalogs: catalogsFor(content, facility), settings });
}

/** Start, walk to the patient and order a CTPA from her bedside (recorded with its device, not done yet). */
async function orderedOnTheWard(s: ClinicalSession): Promise<void> {
  await s.run({ type: "clinical_action", action: { type: "start" } });
  await s.run({ type: "world_action", request: { actionId: "walk", actorId: PRIMARY_ACTOR, operation: "navigate", goal: { kind: "interact", id: "patient:ward-1" } } });
  await s.run({ type: "clinical_action", action: { type: "order", investigationId: "ctpa" } });
  const order = s.state.orders.find((o) => o.investigationId === "ctpa");
  expect(order).toMatchObject({ modality: ["ct"] });
  expect(order?.acquired).toBeUndefined();
}

describe("spatial audit: acquisitions", () => {
  it("a CTPA acquired on arrival at the scanner is audited and passes", async () => {
    const s = await peSession();
    const auditor = new Auditor(s);
    auditor.attach();
    await orderedOnTheWard(s);
    await s.run({ type: "world_action", request: { actionId: "there", actorId: PRIMARY_ACTOR, operation: "transport_patient", targetId: "patient:ward-1", parameters: { destination: "eq:ct-scanner" } } });
    expect(s.state.orders.find((o) => o.investigationId === "ctpa")?.acquired).toMatchObject({ where: "eq:ct-scanner" });
    const audit = auditor.finish(s.trace());
    auditor.detach();
    await s.close();
    expect(audit.spatial.violations).toEqual([]);
    // the order (at the bedside) and the acquisition (the patient on the scanner) were both audited
    expect(audit.spatial.audited).toBe(2);
  });

  it("an acquisition recorded while the patient is still on the ward is a violation", async () => {
    const s = await peSession();
    const auditor = new Auditor(s);
    auditor.attach();
    await orderedOnTheWard(s);
    // bypassing the session's rule (it records an acquisition only with the patient on the device)
    s.dispatch({ type: "acquire", investigationId: "ctpa", collector: "radiographer", where: "eq:ct-scanner", by: "system" });
    expect(s.state.orders.find((o) => o.investigationId === "ctpa")?.acquired).toBeDefined();
    const audit = auditor.finish(s.trace());
    auditor.detach();
    await s.close();
    expect(audit.spatial.violations).toEqual([expect.objectContaining({ type: "order.acquired", requirement: "patient-at-provider", system: { ok: false, reason: "patient-not-at-provider" }, violation: true })]);
  });
});
