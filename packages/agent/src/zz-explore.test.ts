import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseCase, type CaseDefinition } from "@clinicalcraft/core";
import { it } from "vitest";
import { makeSession } from "./__fixtures__/harness.js";

function loadSmzl(): CaseDefinition {
  const path = fileURLToPath(new URL("../../content/cases/smzl-lung-adeno/case.json", import.meta.url));
  if (!existsSync(path)) throw new Error("no smzl");
  const parsed = parseCase(JSON.parse(readFileSync(path, "utf8")) as unknown);
  if (!parsed.ok) throw new Error("bad");
  return parsed.value;
}

it("explore offline learner", async () => {
  const t = await makeSession({ caseDef: loadSmzl(), settingsPatch: { locale: "en" } });
  t.session.subscribe((e) => {
    if (e.msg.type === "approval_request") t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
  });
  const show = (label: string, evs: { seq: number; id: string; msg: { type: string } }[]) => {
    console.log(`--- ${label}`);
    for (const e of evs) {
      const m = e.msg as Record<string, unknown>;
      const brief = m.type === "state_snapshot" ? `seq=${(m.state as { seq: number }).seq}` : JSON.stringify(m).slice(0, 220);
      console.log(e.seq, e.id, m.type, brief);
    }
  };
  show("approach", await t.session.run({ type: "user_message", text: "" }));
  show("pain", await t.session.run({ type: "user_message", text: "Where does it hurt, and when did it start?" }));
  show("spleen btn", await t.session.run({ type: "clinical_action", action: { type: "ask", itemId: "spleen", via: "button" } }));
  show("order biopsy", await t.session.run({ type: "clinical_action", action: { type: "order", investigationId: "biopsy" } }));
  show("/order cbc", await t.session.run({ type: "slash_command", name: "order", args: "cbc" }));
  show("finish early", await t.session.run({ type: "clinical_action", action: { type: "finish" } }));
  show("flag", await t.session.run({ type: "clinical_action", action: { type: "flag", flag: "x" } }));
  show("@radiologist", await t.session.run({ type: "user_message", text: "@radiologist anything?" }));
  show("assess", await t.session.run({ type: "assess" }));
});
