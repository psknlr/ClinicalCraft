import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { msgsOf } from "../../__fixtures__/harness.js";
import { theatreSession, kernelOf } from "../__fixtures__/theatre.js";

describe("scratch", () => {
  it("observer mode in the first assistant's place", async () => {
    const t = await theatreSession({ start: { type: "start", seat: "first-assistant" }, settingsPatch: { approvalMode: "bypass" } });
    await t.session.run({ type: "team", action: "surgeon", surgeon: "simulated" });
    const lines: string[] = [];
    for (let i = 0; i < 30 && !t.session.state.procedure?.closed; i++) {
      const ev = await t.session.run({ type: "team", action: "run", rounds: 10 });
      for (const m of msgsOf(ev, "team_event")) {
        const e = m.event;
        if (e.kind === "message") lines.push(`r${e.message.round} MSG ${e.message.from} -> ${e.message.to} [${e.message.kind}] ${e.message.text.en}`);
        if (e.kind === "receipt") lines.push(`r${e.receipt.round} ACT ${e.receipt.actor} ${e.receipt.operation}${e.receipt.step ? ":" + e.receipt.step : ""} ${e.receipt.outcome} ${e.receipt.code ?? ""} ${e.receipt.message.slice(0, 120)}`);
      }
      for (const m of msgsOf(ev, "error")) lines.push(`ERR ${m.message}`);
    }
    (await import("node:fs")).writeFileSync("/tmp/claude-0/-home-user/650af4ac-5c11-5dd6-baac-53dab986607e/scratchpad/wp5b/out.txt", [lines.join("\n"), JSON.stringify(t.session.state.procedure?.refs), JSON.stringify({ closed: t.session.state.procedure?.closed, unsafe: t.session.state.procedure?.unsafe, counters: t.session.state.procedure?.counters, camera: t.session.state.procedure?.camera }), JSON.stringify(t.session.team()!.state.tasks.filter((x) => x.kind === "operate"))].join("\n"));
    console.log(JSON.stringify(t.session.state.procedure?.refs));
    console.log(JSON.stringify({ closed: t.session.state.procedure?.closed, unsafe: t.session.state.procedure?.unsafe, counters: t.session.state.procedure?.counters, camera: t.session.state.procedure?.camera }));
    console.log(JSON.stringify(t.session.team()!.state.tasks.filter((x) => x.kind === "operate")));
    await t.session.close();
  }, 120000);
});
