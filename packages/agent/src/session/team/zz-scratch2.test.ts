import { describe, expect, it } from "vitest";
import { PRIMARY_ACTOR } from "@clinicalcraft/world";
import { refOfBody, type ProcedureOp } from "@clinicalcraft/core";
import { msgsOf, type TestSession } from "../../__fixtures__/harness.js";
import { theatreSession, theatreCase, WHOLE_OPERATION } from "../__fixtures__/theatre.js";
import type { TeamMessage } from "./types.js";
import { writeFileSync } from "node:fs";

async function play(t: TestSession, lines: string[]): Promise<void> {
  const seen = new Set<string>();
  const asked = new Map<string, TeamMessage>();
  const me = refOfBody(t.session.caseDef, t.session.state, PRIMARY_ACTOR) as string;
  const act = async (op: ProcedureOp) => {
    const ev = await t.session.run({ type: "clinical_action", action: { type: "operate", op } });
    lines.push(`LEARNER operate ${JSON.stringify(op)} ${msgsOf(ev, "error").map((e) => e.message).join(" | ")}`);
  };
  const reply = async (m: TeamMessage, kind: "readback" | "confirm" | "report", text?: string) => {
    const ev = await t.session.run({ type: "team", action: "reply", message: m.id, kind, ...(text ? { text } : {}) });
    lines.push(`LEARNER reply ${kind} to ${m.id} ${msgsOf(ev, "error").map((e) => e.message).join(" | ")}`);
  };
  for (let i = 0; i < 300 && !t.session.state.procedure?.closed; i++) {
    const team = t.session.team()!;
    const fresh = team.state.messages.filter((m) => m.to === PRIMARY_ACTOR && !seen.has(m.id));
    for (const m of fresh) seen.add(m.id);
    let did = false;
    for (const m of fresh) {
      lines.push(`  heard ${m.id} ${m.kind}: ${m.text.en}`);
      if (m.kind === "request" && m.about.field) {
        asked.set(m.thread, m);
        await reply(m, "readback");
        did = true;
      } else if (m.kind === "request" && m.about.callout) {
        await reply(m, "confirm", "Clips on the cystic duct, clear of the common duct: go on.");
        did = true;
      } else if (m.kind === "confirm") {
        const req = asked.get(m.thread);
        const f = req?.about.field;
        if (!f) continue;
        const camera = t.session.state.procedure!.ports.find((p) => p.role === "camera")!.site;
        if (f.op === "camera") await act({ op: "hand-over", port: f.port ?? camera, to: me });
        if (f.op === "aim") {
          await act({ op: "aim", port: camera, at: f.region! });
          if (f.zoom) await act({ op: "zoom", port: camera, level: f.zoom });
        }
        if (f.op === "zoom") await act({ op: "zoom", port: camera, level: f.zoom! });
        if (f.op === "pass") await act({ op: "pass", instrument: f.instrument! });
        if (f.op === "traction") {
          await act({ op: "hand-over", port: f.port!, to: me });
        }
        await reply(m, "report", "Done.");
        did = true;
      }
    }
    if (!did) {
      const ev = await t.session.run({ type: "team", action: "step" });
      for (const m of msgsOf(ev, "team_event")) {
        const e = m.event;
        if (e.kind === "message") lines.push(`r${e.message.round} MSG ${e.message.from} -> ${e.message.to} [${e.message.kind}] ${e.message.text.en}`);
        if (e.kind === "receipt") lines.push(`r${e.receipt.round} ACT ${e.receipt.actor} ${e.receipt.operation}${e.receipt.step ? ":" + e.receipt.step : ""} ${e.receipt.outcome} ${e.receipt.code ?? ""} ${e.receipt.message.slice(0, 160)}`);
      }
    }
  }
}

const FOUR = [
  { op: "plan-ports", plan: "mirror-four-port" },
  { op: "insufflate", pressure: 12 },
  { op: "insert", port: "A", instrument: "laparoscope" },
  { op: "insert", port: "D", instrument: "grasper" },
  { op: "retract", port: "D", structure: "gallbladder-fundus", direction: ["cephalad"], force: "firm" },
  ...WHOLE_OPERATION.slice(3),
];
const fourPortCase = () => theatreCase({ solution: [{ type: "start" }, { type: "set-phase", phase: "theatre" }, ...FOUR.map((op) => ({ type: "operate", op })), { type: "finish" }] });

describe("scratch", () => {
  for (const [name, start, caseDef] of [["second", { type: "start", seat: "second-assistant", lineup: "three-surgeons" }, fourPortCase()], ["break", { type: "start", seat: "first-assistant", team: "scrub-break" }, undefined]] as const) {
    it(`place ${name}`, async () => {
      const t = await theatreSession({ settingsPatch: { approvalMode: "bypass" }, ...(caseDef ? { caseDef } : {}) });
      const lines: string[] = [];
      const started = await t.session.run({ type: "clinical_action", action: start as never });
      lines.push(`start errors: ${JSON.stringify(msgsOf(started, "error"))} seat=${t.session.state.seat}`);
      try {
        await play(t, lines);
      } finally {
        lines.push(JSON.stringify(t.session.state.procedure?.refs));
        lines.push(JSON.stringify({ closed: t.session.state.procedure?.closed, unsafe: t.session.state.procedure?.unsafe, counters: t.session.state.procedure?.counters, ports: t.session.state.procedure?.ports.map((p) => [p.site, p.instrument, p.holder]) }));
        writeFileSync(`/tmp/claude-0/-home-user/650af4ac-5c11-5dd6-baac-53dab986607e/scratchpad/wp5b/${name}.txt`, lines.join("\n"));
      }
      await t.session.close();
    }, 120000);
  }

  it("denied call-out", async () => {
    const t = await theatreSession({ settingsPatch: { approvalMode: "default" } });
    const lines: string[] = [];
    let denied = 0;
    t.session.subscribe((e) => {
      if (e.msg.type !== "approval_request") return;
      const decision = e.msg.callout && denied === 0 ? "denied" : "approved";
      if (decision === "denied") denied++;
      lines.push(`APPROVAL ${e.msg.agent} ${e.msg.actorId ?? ""} ${e.msg.callout ?? e.msg.tool} -> ${decision}`);
      t.session.submit({ type: "approval_response", requestId: e.msg.requestId, decision });
    });
    const started = await t.session.run({ type: "clinical_action", action: { type: "start", seat: "first-assistant" } });
    lines.push(`start errors: ${JSON.stringify(msgsOf(started, "error"))}`);
    try {
      await play(t, lines);
    } finally {
      lines.push(JSON.stringify(t.session.state.procedure?.refs));
      lines.push(JSON.stringify({ closed: t.session.state.procedure?.closed, unsafe: t.session.state.procedure?.unsafe, clips: t.session.state.procedure?.clips }));
      writeFileSync(`/tmp/claude-0/-home-user/650af4ac-5c11-5dd6-baac-53dab986607e/scratchpad/wp5b/denied.txt`, lines.join("\n"));
    }
    await t.session.close();
  }, 120000);

  for (const seat of ["first-assistant", "scrub-nurse"] as const) {
    it(`scripted learner in the ${seat}'s place`, async () => {
      const t = await theatreSession({ settingsPatch: { approvalMode: "bypass" } });
      const lines: string[] = [];
      const started = await t.session.run({ type: "clinical_action", action: { type: "start", seat } });
      lines.push(`start errors: ${JSON.stringify(msgsOf(started, "error"))} seat=${t.session.state.seat} phase=${t.session.state.phase}`);
      try {
        await play(t, lines);
      } finally {
        lines.push(JSON.stringify(t.session.state.procedure?.refs));
        lines.push(JSON.stringify({ closed: t.session.state.procedure?.closed, unsafe: t.session.state.procedure?.unsafe, counters: t.session.state.procedure?.counters }));
        lines.push(JSON.stringify(t.session.team()!.state.tasks.filter((x) => x.kind === "operate")));
        writeFileSync(`/tmp/claude-0/-home-user/650af4ac-5c11-5dd6-baac-53dab986607e/scratchpad/wp5b/${seat}.txt`, lines.join("\n"));
      }
      await t.session.close();
    }, 120000);
  }
});
