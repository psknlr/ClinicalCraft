import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseCase, t, type CaseDefinition } from "@clinicalcraft/core";
import { it } from "vitest";
import { makeSession } from "./__fixtures__/harness.js";
import { textScript, toolCallScript } from "./providers/scripted.js";
import type { ChatRequest, StreamEvent } from "./providers/types.js";

function loadSmzl(): CaseDefinition {
  const path = fileURLToPath(new URL("../../content/cases/smzl-lung-adeno/case.json", import.meta.url));
  if (!existsSync(path)) throw new Error("no smzl");
  const parsed = parseCase(JSON.parse(readFileSync(path, "utf8")) as unknown);
  if (!parsed.ok) throw new Error("bad");
  return parsed.value;
}

it("explore scripted", async () => {
  const c = loadSmzl();
  const plan: { name: string; args: Record<string, unknown> }[] = [
    { name: "ask_patient", args: { question: "Where does it hurt, and when did it start?" } },
    { name: "order_test", args: { investigation_id: "biopsy" } },
    { name: "consult", args: { role: "pathologist", question: "What does the biopsy show?" } },
  ];
  let step = 0;
  const router = (req: ChatRequest): StreamEvent[] => {
    const rf = req.responseFormat?.name;
    if (rf === "patient_reply") {
      const state = req.system.find((s) => s.id === "patient-state")?.text ?? "";
      const ids = [...state.matchAll(/\[([\w-]+)\] \(answer_now\)/g)].map((m) => m[1]!);
      const say = ids.map((id) => t(c.history.find((h) => h.id === id)!.answer, "en")).join(" ") || "I'm not sure.";
      return textScript(JSON.stringify({ say, nonverbal: null, usedFactIds: ids, affectHint: "same" }));
    }
    if (rf) return textScript("{}");
    const sys = req.system.map((s) => s.id).join(",");
    if (req.tools?.some((x) => x.name === "get_results") && !req.tools.some((x) => x.name === "order_test")) {
      const last = req.messages.at(-1)!;
      if (last.content.some((p) => p.type === "tool_result")) return textScript("The report says what it says.");
      return toolCallScript([{ id: `gr${step}`, name: "get_results", args: {} }]);
    }
    void sys;
    const next = plan[step++];
    if (!next) return textScript("Done.");
    return toolCallScript([{ id: `c${step}`, name: next.name, args: next.args }]);
  };
  const t0 = await makeSession({ caseDef: c, scripts: Array.from({ length: 50 }, () => router) });
  t0.session.subscribe((e) => {
    if (e.msg.type === "approval_request") t0.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
  });
  const evs = await t0.session.run({ type: "autopilot", maxTurns: 2 });
  for (const e of evs) {
    const m = e.msg as Record<string, unknown>;
    const brief = m.type === "state_snapshot" ? `seq=${(m.state as { seq: number }).seq}` : JSON.stringify(m).slice(0, 200);
    console.log(e.seq, e.id, m.type, brief);
  }
  console.log("ALL", t0.events.filter((e) => !evs.includes(e)).map((e) => `${e.seq} ${e.id} ${e.msg.type}`).join("\n"));
  for (const r of t0.provider!.requests) console.log("REQ", r.responseFormat?.name ?? "-", r.system.map((s) => s.id).join(","), "\n", r.system.map((s) => s.text).join("\n----\n").slice(0, 3000), "\nMSGS", JSON.stringify(r.messages).slice(0, 600));
});
