/**
 * Evidence in the tools (docs/CASE_AUTHORING.md §5.2, docs/STUDIES.md §8): `read_result`, `examine` and `read_study`
 * say where a result or a finding comes from and how good it is, and return a picture drawn from data as an image —
 * which reaches a model only when it can look at images; the text always says it is drawn, not photographed.
 */
import type { CaseDefinition } from "@clinicalcraft/core";
import { describe, expect, it } from "vitest";
import { loadMiniCase, makeSession, msgsOf, type TestSession } from "../__fixtures__/harness.js";
import { ScriptedProvider, textScript, toolCallScript } from "../providers/scripted.js";
import type { ProviderConfig } from "../providers/types.js";

const L = (zh: string, en: string) => ({ "zh-CN": zh, en });
const KIOSK = { kind: "tongue", appearance: { body: "pale", coating: { color: "brown", thickness: "thick", texture: "greasy", distribution: "root" } }, capture: { light: "warm", colorCard: false } };

/** The mini case with a kiosk tongue photo in the records, a tongue inspection, and a tongue capture study. */
function evidenceCase(): CaseDefinition {
  return loadMiniCase((input) => {
    const raw = input as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    raw.investigations.push({
      id: "tongue-photo",
      name: L("自助机舌象照片", "Kiosk tongue photo"),
      category: "record",
      performedAt: "records",
      requires: ["records"],
      results: {
        ed: {
          text: L("暖光下舌苔黄褐厚腻。", "Under warm light the coating looks thick and yellow-brown."),
          picture: KIOSK,
          provenance: {
            source: "patient-captured",
            by: L("候诊区自助问诊机", "the waiting-area intake kiosk"),
            capturedAt: L("今日 08:40", "Today 08:40"),
            quality: { status: "failed", reasons: [L("无比色卡", "No colour card in the frame."), L("暖色室内光", "Warm room light.")] },
            basis: "authored",
          },
        },
      },
    });
    raw.exam.push({
      id: "tongue",
      system: "heent",
      maneuver: L("漱口后自然光下望舌", "Inspect the tongue in daylight after a rinse"),
      keywords: { "zh-CN": ["舌"], en: ["tongue"] },
      finding: L("舌淡胖，苔薄白腻。", "Pale, enlarged tongue with a thin white greasy coating."),
      picture: { kind: "tongue", appearance: { body: "pale", shape: ["enlarged"], coating: { color: "white", thickness: "thin", texture: "greasy" } }, capture: { light: "daylight", colorCard: false } },
      provenance: { source: "direct-observation" },
    });
    raw.studies = [
      {
        code: "tongue-capture",
        name: L("舌象采集", "Tongue image at the station"),
        aliases: { "zh-CN": ["舌象"], en: ["tongue image"] },
        acquisition: "sample",
        category: "bedside",
        model: { kind: "tongue", appearance: { body: "pale", shape: ["enlarged", "teeth-marked"], coating: { color: "white", thickness: "thin", texture: "greasy" } } },
      },
    ];
  });
}

let seq = 0;
async function tool(t: TestSession, name: string, args: Record<string, unknown> = {}) {
  const events = await t.session.run({ type: "external_tool_call", callId: `c-${++seq}`, tool: name, args, allowBypass: true });
  return msgsOf(events, "tool_call_end").at(-1) as { ok: boolean; output: string; data?: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe("evidence in the tools", () => {
  it("read_result says where a result comes from and its quality check, and that its picture is drawn", async () => {
    const t = await makeSession({ caseDef: evidenceCase(), settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await tool(t, "order_test", { investigation_id: "tongue-photo" });
    const r = await tool(t, "read_result", { investigation_id: "tongue-photo" });
    expect(r.ok).toBe(true);
    expect(r.output).toContain("Source: captured by the patient (the waiting-area intake kiosk)");
    expect(r.output).toContain("Captured: Today 08:40");
    expect(r.output).toContain("Quality check: failed — No colour card in the frame; Warm room light");
    expect(r.output).toContain("Picture: drawn by the simulation from the recorded description — not a photograph of the patient.");
    expect(r.data.picture).toMatchObject({ kind: "tongue", capture: { light: "warm", colorCard: false } });
    expect(r.data.provenance).toMatchObject({ source: "patient-captured" });
  });

  it("examine gives the finding with its source and picture", async () => {
    const t = await makeSession({ caseDef: evidenceCase(), settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    const r = await tool(t, "examine", { finding_id: "tongue" });
    expect(r.output.split("\n")).toEqual([
      expect.stringContaining("Pale, enlarged tongue with a thin white greasy coating."),
      "Source: direct observation",
      "Picture: drawn by the simulation from the recorded description — not a photograph of the patient.",
    ]);
    expect(r.data.picture.kind).toBe("tongue");
  });

  it("a tongue capture is reported from what it showed, with its picture", async () => {
    const t = await makeSession({ caseDef: evidenceCase(), settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "clinical_action", action: { type: "start" } });
    await tool(t, "order_study", { code: "tongue-capture" });
    await t.session.run({ type: "staff_step" });
    const r = await tool(t, "read_study", { code: "tongue-capture" });
    expect(r.ok).toBe(true);
    expect(r.output).toContain("Tongue body: pale");
    expect(r.output).toContain("Coating: thin white, greasy, over the whole surface");
    expect(r.output).toContain("Quality check: passed");
    expect(r.output).toContain("Picture: drawn by the simulation");
    const accession = t.session.state.studies!.accessions.at(-1)!;
    expect(accession.picture?.kind).toBe("tongue");
  });
});

describe("a picture reaches a model only when it can look at images", () => {
  const providerFor = (vision: boolean) => {
    const provider = new ScriptedProvider(
      [toolCallScript([{ id: "c1", name: "order_test", args: { investigation_id: "tongue-photo" } }]), toolCallScript([{ id: "c2", name: "read_result", args: { investigation_id: "tongue-photo" } }]), textScript("The kiosk photo is not reliable.")],
      { capabilities: { vision, supportsImages: vision } },
    );
    return {
      provider,
      opts: {
        caseDef: evidenceCase(),
        settingsPatch: { provider: "openai", approvalMode: "bypass" },
        resolveProvider: (id: string, model: string | null): ProviderConfig => ({ id, wire: "openai-chat-completions", model: model ?? "scripted", apiKey: "test-key" }),
        providerFactory: () => provider,
      },
    };
  };
  const resultPart = (provider: ScriptedProvider) => provider.requests[2]!.messages.flatMap((m) => m.content).filter((p) => p.type === "tool_result").at(-1) as { content: string; images?: { mediaType: string; data: string }[] };

  it("a model with vision gets the drawn PNG with the text; one without gets the text only", async () => {
    for (const vision of [true, false]) {
      const { provider, opts } = providerFor(vision);
      const t = await makeSession(opts);
      await t.session.run({ type: "clinical_action", action: { type: "start" } });
      await t.session.run({ type: "user_message", text: "Read the kiosk photo.", to: "clinician" });
      const part = resultPart(provider);
      expect(part.content).toContain("Picture: drawn by the simulation");
      if (vision) {
        expect(part.images).toHaveLength(1);
        expect(part.images![0]!.mediaType).toBe("image/png");
        expect(part.images![0]!.data.startsWith("iVBORw0KGgo")).toBe(true);
      } else expect(part.images).toBeUndefined();
      await t.session.close();
    }
  });
});
