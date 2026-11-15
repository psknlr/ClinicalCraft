/**
 * A place in the care team from the command line (docs/TEAM.md §1, docs/PROTOCOL.md §3.1, §9): `play` and `exec` take
 * `--seat` (core's seat list, bilingual descriptions; a bad value refused with the choices), `--lineup` and `--team`, and
 * the encounter's first action is that start; the session's refusal of a place is printed as it words it (not in-world,
 * settings that would stop the stand-in, a member away, no stand-in) and a resumed place whose settings would stop the
 * stand-in is refused before it goes on. On the agent's theatre fixture (core's lap-chole team in general-hospital's
 * theatre), a headless exec in the first assistant's place answers the stand-in surgeon's requests with `/team reply`
 * and does its own steps with `/operate`, the call-outs approved by its stream-json client in the default approval mode,
 * until the operation is closed; `/seat` prints the place; the REPL marks the team's lines said to the learner "→ you"
 * and asks a call-out with its own keys (No objection / Stop).
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import { LAP_CHOLE_SIT } from "../../core/src/engine/procedure/__fixtures__/lap-chole-sit.js";
import { LAP_CHOLE_SOLUTION, LAP_CHOLE_TEAM } from "../../core/src/engine/procedure/__fixtures__/lap-chole-team.js";
import { THEATRE, theatreFacility } from "../../world/src/__fixtures__/theatre.js";
import { parseArgs, UsageError } from "./argv.js";
import { EXEC, PLAY } from "./commands.js";
import type { CliIO } from "./context.js";
import { GLOBAL_FLAGS } from "./flags.js";
import { main } from "./main.js";
import { placeStart } from "./place.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-place-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const T = 240_000;

const CASE = "cli-lap-chole-team";
const FACILITY = "cli-theatre-hospital";

/** A project whose content holds the theatre case (core's lap-chole team) and a hospital whose theatre has its staff. */
function sandbox(): { env: Record<string, string>; cwd: string; home: string } {
  const dir = mkdtempSync(join(root, "s-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  const content = join(cwd, "content");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  mkdirSync(join(content, "cases", CASE), { recursive: true });
  mkdirSync(join(content, "facilities"), { recursive: true });
  const raw = { ...structuredClone(LAP_CHOLE_SIT), id: CASE, facility: FACILITY, team: { ...structuredClone(LAP_CHOLE_TEAM), room: THEATRE }, solution: structuredClone(LAP_CHOLE_SOLUTION) };
  writeFileSync(join(content, "cases", CASE, "case.json"), JSON.stringify(raw));
  // general-hospital's theatre with the team's staff (the test devices of the world's fixture left out)
  const facility = theatreFacility();
  facility.id = FACILITY;
  facility.placements = facility.placements.filter((p) => !p.type.startsWith("test-"));
  writeFileSync(join(content, "facilities", `${FACILITY}.json`), JSON.stringify(facility));
  writeFileSync(join(cwd, ".clinicalcraft", "settings.json"), JSON.stringify({ contentDirs: [content] }));
  return { env: { CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1" }, cwd, home };
}

async function run(argv: string[], box: { env: Record<string, string>; cwd: string }, input = ""): Promise<{ code: number; stdout: string; stderr: string }> {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();
  let out = "";
  let err = "";
  stdout.on("data", (d: Buffer) => (out += d.toString("utf8")));
  stderr.on("data", (d: Buffer) => (err += d.toString("utf8")));
  stdin.end(input);
  const code = await main(argv, { io: { stdout, stderr, stdin } as unknown as CliIO, env: box.env, cwd: box.cwd });
  return { code, stdout: out, stderr: err };
}

const THEATRE_ARGS = ["--case", CASE, "--facility", FACILITY, "--provider", "offline", "--lang", "en"];

describe("--seat, --lineup and --team: play and exec take them, and the first action is that start", () => {
  it("both commands parse the three flags into one start; no flag, no start", () => {
    for (const spec of [PLAY, EXEC]) {
      const args = parseArgs(["--seat", "first-assistant", "--lineup", "three-surgeons", "--team", "scrub-break"], [...GLOBAL_FLAGS, ...(spec.flags ?? [])]);
      expect(placeStart(args), spec.name).toEqual({ type: "start", seat: "first-assistant", lineup: "three-surgeons", team: "scrub-break" });
      expect(placeStart(parseArgs(["--team", "second-away"], [...GLOBAL_FLAGS, ...(spec.flags ?? [])]))).toEqual({ type: "start", team: "second-away" });
      expect(placeStart(parseArgs([], [...GLOBAL_FLAGS, ...(spec.flags ?? [])]))).toBeNull();
    }
  });

  it("a place not in core's seat list is refused with the choices listed (and the closest one), in both languages; --help describes each place", { timeout: T }, async () => {
    const specs = [...GLOBAL_FLAGS, ...(PLAY.flags ?? [])];
    expect(() => parseArgs(["--seat", "first-asistant"], specs)).toThrow(UsageError);
    try {
      parseArgs(["--seat", "first-asistant"], specs);
    } catch (err) {
      expect((err as UsageError).message).toBe('Invalid value "first-asistant" for --seat (expected surgeon | first-assistant | second-assistant | scrub-nurse)');
      expect((err as UsageError).hint).toBe('Did you mean "first-assistant"?');
    }
    const box = sandbox();
    const bad = await run(["play", CASE, "--seat", "anaesthetist", "--lang", "zh-CN"], box);
    expect(bad.code).toBe(2);
    expect(bad.stderr).toMatch(/--seat.*surgeon \| first-assistant \| second-assistant \| scrub-nurse/u);
    const help = await run(["exec", "--help", "--lang", "en"], box);
    expect(help.stdout).toMatch(/--seat <place>[\s\S]*first-assistant — first assistant[\s\S]*scrub-nurse — scrub nurse/u);
    expect(help.stdout).toMatch(/--lineup <id>/u);
    expect(help.stdout).toMatch(/--team <scenario>/u);
    const zh = await run(["play", "--help", "--lang", "zh-CN"], box);
    expect(zh.stdout).toMatch(/first-assistant——第一助手[\s\S]*scrub-nurse——洗手护士/u);
  });

  it("exec: the transcript's first action is the start with the place, the line-up and the team scenario", { timeout: T }, async () => {
    const box = sandbox();
    const r = await run(["exec", "/seat", ...THEATRE_ARGS, "--embodied", "--seat", "first-assistant", "--lineup", "three-surgeons", "--team", "second-away", "--approval", "bypass", "--output-format", "json"], box);
    expect(r.code, r.stderr).toBe(0);
    const result = JSON.parse(r.stdout.trim().split("\n").at(-1)!) as { session_id: string; result: string };
    expect(result.result).toMatch(/^Your place in the team: first assistant \(id doc-1\) — fixed for this encounter\./u);
    expect(result.result).toMatch(/Line-up: Three surgeons\./u);
    // the second assistant is away in this team scenario: the first assistant holds the camera
    expect(result.result).toMatch(/Your controls: Camera, Traction, Suction\./u);
    expect(result.result).toMatch(/Second assistant: Dr Sato \(away in this encounter\)/u);
    const files = (function walk(dir: string): string[] {
      return readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));
    })(box.home).filter((f) => f.endsWith(".jsonl") && f.includes(result.session_id));
    expect(files).toHaveLength(1);
    const ops = readFileSync(files[0]!, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { type: string; payload: { op?: Record<string, unknown> } }).filter((i) => i.type === "op");
    expect(ops[0]!.payload.op).toEqual({ type: "clinical_action", action: { type: "start", seat: "first-assistant", lineup: "three-surgeons", team: "second-away" } });
  });
});

describe("a place the session refuses is printed as it words it (exit 2)", () => {
  it("not in-world, settings that would stop the stand-in, a member away, a case without a stand-in; --seat with --resume", { timeout: T }, async () => {
    const box = sandbox();
    const refused = async (extra: string[]) => {
      const r = await run(["exec", "hello", ...THEATRE_ARGS, ...extra], box);
      expect(r.code, `${extra.join(" ")}: ${r.stdout}`).toBe(2);
      return r.stderr;
    };
    expect(await refused(["--seat", "first-assistant"])).toMatch(/^error: Action not permitted: the first assistant's place in the team needs in-world mode: the team works at the table with their own hands\./mu);
    expect(await refused(["--seat", "scrub-nurse", "--embodied", "--approval", "plan"])).toMatch(/while you hold the scrub nurse's place the stand-in surgeon operates, and this session's settings would stop them \(.*plan.*\)/iu);
    expect(await refused(["--seat", "scrub-nurse", "--embodied", "--team", "scrub-break"])).toMatch(/Not possible: Chen Yu is not here in this encounter: they take no part in the operation\./u);
    expect(await refused(["--seat", "second-assistant", "--embodied"])).toMatch(/this case's team has no second-assistant: there is no such place/u);
    // a built-in case without a care team
    const stemi = await run(["exec", "hello", "--case", "stemi-inferior-rv", "--embodied", "--seat", "first-assistant", "--provider", "offline", "--lang", "en", "--ephemeral"], box);
    expect(stemi.code).toBe(2);
    expect(stemi.stderr).toMatch(/^error: Not possible: /mu);
    // the place is chosen at a new encounter's start
    const resumed = await run(["exec", "hello", "--continue", "--seat", "first-assistant", "--lang", "en"], box);
    expect(resumed.code).toBe(2);
    expect(resumed.stderr).toMatch(/--seat, --lineup and --team choose a new encounter's start: a resumed encounter keeps its own\./u);
  });

  it("a line-up, a team scenario or a place the case does not offer: refused naming it, with the case's places, line-ups and team scenarios — play and exec", { timeout: T }, async () => {
    const box = sandbox();
    const offers = [
      "Places in the team this case offers: first-assistant, scrub-nurse; first-assistant, second-assistant, scrub-nurse (line-up three-surgeons).",
      "Line-ups: three-surgeons (Three surgeons).",
      "Team scenarios: scrub-break, second-away.",
    ].join("\n");
    for (const command of [
      ["exec", "hello", ...THEATRE_ARGS],
      ["play", CASE, ...THEATRE_ARGS.slice(2)],
    ]) {
      for (const [extra, said] of [
        [["--lineup", "bogus"], /this case's team has no line-up "bogus"/u],
        [["--team", "bogus"], /this case has no team scenario "bogus"/u],
        [["--seat", "first-assistant", "--lineup", "bogus"], /this case's team has no line-up "bogus"/u],
        [["--seat", "second-assistant"], /this case's team has no second-assistant: there is no such place/u],
      ] as const) {
        const r = await run([...command, "--embodied", "--ephemeral", ...extra], box);
        expect(r.code, `${command[0]} ${extra.join(" ")}: ${r.stderr}`).toBe(2);
        const [first, ...rest] = r.stderr.trim().split("\n");
        expect(first).toMatch(said);
        expect(rest.join("\n")).toBe(offers);
      }
    }
    // in Chinese
    const zh = await run(["exec", "hello", ...THEATRE_ARGS.slice(0, -2), "--lang", "zh-CN", "--embodied", "--ephemeral", "--lineup", "bogus"], box);
    expect(zh.code).toBe(2);
    expect(zh.stderr).toMatch(/本病例提供的团队岗位：first-assistant、scrub-nurse；first-assistant、second-assistant、scrub-nurse（团队配置 three-surgeons）。\n团队配置：three-surgeons（Three surgeons）。\n团队情境：scrub-break、second-away。/u);
  });

  it("--output-format json or stream-json: a refused start still ends with the final result — an error, the refusal in its errors", { timeout: T }, async () => {
    const box = sandbox();
    for (const format of ["stream-json", "json"]) {
      const r = await run(["exec", "hello", ...THEATRE_ARGS, "--seat", "first-assistant", "--ephemeral", "--output-format", format], box);
      expect(r.code, format).toBe(2);
      const result = JSON.parse(r.stdout.trim().split("\n").at(-1)!) as Record<string, any>;
      expect(result, format).toMatchObject({ type: "result", subtype: "error_during_execution", is_error: true, errors: [expect.stringMatching(/needs in-world mode/u)] });
      expect(r.stderr, format).toMatch(/^error: Action not permitted: the first assistant's place in the team needs in-world mode/mu);
    }
  });

  it("a saved encounter in a place resumed with settings that would stop the stand-in is refused before it goes on", { timeout: T }, async () => {
    const box = sandbox();
    const first = await run(["exec", "/seat", ...THEATRE_ARGS, "--embodied", "--seat", "first-assistant", "--approval", "bypass", "--output-format", "json"], box);
    expect(first.code, first.stderr).toBe(0);
    const id = (JSON.parse(first.stdout.trim().split("\n").at(-1)!) as { session_id: string }).session_id;
    const plan = await run(["exec", "/seat", "--resume", id, "--approval", "plan", "--provider", "offline", "--lang", "en"], box);
    expect(plan.code).toBe(2);
    expect(plan.stderr).toMatch(/^error: Action not permitted: while you hold the first assistant's place the stand-in surgeon operates, and this session's settings would stop them \(.*\)\. Change the approval mode, the practice scope or the deny rules to go on with this encounter\./mu);
    // with settings that let the stand-in work, it goes on in its place
    const ok = await run(["exec", "/seat", "--resume", id, "--approval", "bypass", "--provider", "offline", "--lang", "en", "--output-format", "json"], box);
    expect(ok.code, ok.stderr).toBe(0);
    expect((JSON.parse(ok.stdout.trim().split("\n").at(-1)!) as { result: string }).result).toMatch(/^Your place in the team: first assistant/u);
  });
});

type Line = { type?: string; msg?: Record<string, any>; [key: string]: any };

/**
 * A stream-json client of `exec` (stream-json in and out): it sends ops on stdin, reads the events on stdout, and waits
 * for each command's own output before it decides the next — as a script driving the terminal learner would.
 */
class Client {
  readonly stdin = new PassThrough();
  readonly events: Line[] = [];
  readonly done: Promise<number>;
  private readonly waiters: { pred: () => boolean; resolve: () => void }[] = [];
  private buffer = "";

  constructor(argv: string[], box: { env: Record<string, string>; cwd: string }, onEvent: (e: Line) => void) {
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    stdout.on("data", (d: Buffer) => {
      this.buffer += d.toString("utf8");
      let nl = this.buffer.indexOf("\n");
      while (nl >= 0) {
        const line = this.buffer.slice(0, nl).trim();
        this.buffer = this.buffer.slice(nl + 1);
        nl = this.buffer.indexOf("\n");
        if (!line) continue;
        const e = JSON.parse(line) as Line;
        this.events.push(e);
        onEvent(e);
        for (const w of [...this.waiters]) {
          if (!w.pred()) continue;
          this.waiters.splice(this.waiters.indexOf(w), 1);
          w.resolve();
        }
      }
    });
    stderr.resume();
    this.done = main(argv, { io: { stdout, stderr, stdin: this.stdin } as unknown as CliIO, env: box.env, cwd: box.cwd });
  }

  send(op: Record<string, unknown>): void {
    this.stdin.write(`${JSON.stringify(op)}\n`);
  }

  /** Outputs of a command so far. */
  outputs(name: string): Line[] {
    return this.events.filter((e) => e.msg?.type === "command_output" && e.msg.name === name);
  }

  /** Run a slash command and wait for its own output. */
  async command(name: string, args = ""): Promise<string> {
    const before = this.outputs(name).length;
    this.send({ type: "slash_command", name, args });
    await this.until(() => this.outputs(name).length > before);
    return this.outputs(name).at(-1)!.msg!.text as string;
  }

  until(pred: () => boolean, timeoutMs = 60_000): Promise<void> {
    if (pred()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timed out waiting")), timeoutMs);
      this.waiters.push({ pred, resolve: () => (clearTimeout(timer), resolve()) });
    });
  }
}

describe("a headless exec in the first assistant's place: the stand-in's requests answered with /team reply, the operation to its close", () => {
  it("reads back, does its own camera steps with /operate, reports; the call-outs approved by the client in the default approval mode", { timeout: T }, async () => {
    const box = sandbox();
    const ME = "doc-1";
    let state: Record<string, any> | null = null;
    const calloutLines: string[] = [];
    const c = new Client(["exec", ...THEATRE_ARGS, "--embodied", "--seat", "first-assistant", "--approval", "default", "--input-format", "stream-json", "--output-format", "stream-json", "--ephemeral"], box, (e) => {
      if (e.msg?.type === "state_snapshot") state = e.msg.state;
      // the stand-in's call-out: the client answers it (No objection) — the stream-json client's approval_response
      if (e.msg?.type === "approval_request") {
        if (e.msg.callout) calloutLines.push(e.msg.callout);
        c.send({ type: "approval_response", requestId: e.msg.requestId, decision: "approved" });
      }
    });
    const seat = await c.command("seat");
    expect(seat).toMatch(/^Your place in the team: first assistant \(id doc-1\)/u);
    const messages = () => c.events.flatMap((e) => (e.msg?.type === "team_event" && e.msg.event.kind === "message" ? [e.msg.event.message] : []));
    const seen = new Set<string>();
    const asked = new Map<string, Record<string, any>>();
    const replies: string[] = [];
    const steps: string[] = [];
    for (let i = 0; i < 300 && !state?.procedure?.closed; i++) {
      const fresh = messages().filter((m) => m.to === "actor:clinician" && !seen.has(m.id));
      for (const m of fresh) seen.add(m.id);
      let acted = false;
      for (const m of fresh) {
        if (m.kind === "request" && m.about.field) {
          asked.set(m.thread, m);
          // no message named: the line the surgeon waits on the learner for
          replies.push(await c.command("team", "reply readback"));
          acted = true;
        } else if (m.kind === "request" && m.about.callout) {
          replies.push(await c.command("team", `reply ${m.id} confirm`));
          acted = true;
        } else if (m.kind === "confirm" && asked.has(m.thread)) {
          const f = asked.get(m.thread)!.about.field;
          const ports = state!.procedure.ports as { site: string; role: string; instrument?: string }[];
          const camera = ports.find((p) => p.role === "camera")!.site;
          const port = f.port ?? camera;
          const step = async (args: string) => {
            steps.push(args);
            const out = await c.command("operate", args);
            expect(out, args).toMatch(/^Done/u);
          };
          if (f.op === "camera") await step(ports.find((p) => p.site === port)?.instrument ? `hand-over port=${port} to=${ME}` : `insert port=${port} instrument=laparoscope`);
          if (f.op === "aim") await step(`aim port=${camera} at=${f.region}`);
          if (f.op === "aim" && f.zoom) await step(`zoom port=${camera} level=${f.zoom}`);
          if (f.op === "zoom") await step(`zoom port=${camera} level=${f.zoom}`);
          replies.push(await c.command("team", `reply ${m.id} report Done.`));
          acted = true;
        }
      }
      if (!acted) await c.command("team", "run");
    }
    c.stdin.end();
    const code = await c.done;
    expect(code).toBe(0);
    expect(state!.procedure).toMatchObject({ closed: true, specimen: "extracted", unsafe: [], injuries: [] });
    // the learner's own steps were the camera's, as the first assistant
    expect(steps[0]).toBe("hand-over port=A to=doc-1");
    expect(new Set(steps.map((s) => s.split(" ")[0]))).toEqual(new Set(["hand-over", "aim", "zoom"]));
    // what the stand-in asked and called out, as the record has it
    expect(messages().filter((m) => m.to === "actor:clinician" && m.kind === "request").map((m) => m.text.en)).toEqual([
      "The first assistant (you), take the camera, please.",
      "The first assistant (you), camera on the hepatocystic triangle, close up, please.",
      "The first assistant (you), wider, please.",
      "The first assistant (you), camera on the gallbladder bed, please.",
    ]);
    expect(calloutLines).toEqual(["Clipping the cystic duct.", "Clipping the cystic artery.", "Dividing the cystic duct.", "Dividing the cystic artery."]);
    // no reply refused, and each told the learner what waits for them now
    for (const r of replies) expect(r, r).toMatch(/^Team: round \d+ · pace auto · you play your place \(first assistant\)/u);
    expect(c.events.filter((e) => e.msg?.type === "error")).toEqual([]);
    const result = c.events.at(-1)!;
    expect(result).toMatchObject({ type: "result", subtype: "success", completed: true });
  });
});

describe("the REPL in a place", () => {
  it("prints the place at the start and with /seat; the team's lines to the learner are marked; a call-out is asked with its own keys", { timeout: T }, async () => {
    const box = sandbox();
    const input = ["/seat", "/team run", "/team observe", "/team run 200", "y", "y", "y", "y", "/quit", ""].join("\n");
    const r = await run(["play", CASE, "--facility", FACILITY, "--embodied", "--seat", "first-assistant", "--approval", "default", "--provider", "offline", "--ephemeral", "--lang", "en"], box, input);
    expect(r.code, r.stderr).toBe(0);
    // the banner and /seat
    expect(r.stdout.match(/Your place in the team: first assistant \(id doc-1\) — fixed for this encounter\./gu)?.length).toBe(2);
    expect(r.stdout).toMatch(/Dr Ito, the stand-in surgeon, operates; Dr Abe stands by — you hold their place\./u);
    // the patient's opening is not said: the learner joined the team at the table
    expect(r.stdout).not.toMatch(/Test patient: Hello\./u);
    // the stand-in's request to the learner: marked, with the id a reply names
    expect(r.stdout).toMatch(/Dr Ito → you: The first assistant \(you\), take the camera, please\. \[msg-\d+\]/u);
    expect(r.stdout).toMatch(/The surgeon waits for you — Dr Ito: “The first assistant \(you\), take the camera, please\.” \[msg-\d+\]\n {2}answer: \/team reply msg-\d+ readback \(or \/team reply msg-\d+ decline\)/u);
    // observing: the place's own policy plays it; the call-out asked with its own keys and answered from the input
    expect(r.stdout).toMatch(/\? Dr Ito: Clipping the cystic duct\. \(call-out before a critical step · team\.callout\)\n {2}\[y\] No objection \/ \[n\] Stop/u);
    for (const line of ["Clipping the cystic artery.", "Dividing the cystic duct.", "Dividing the cystic artery."]) expect(r.stdout).toContain(`? Dr Ito: ${line}`);
    expect(r.stdout.match(/\? › y\n {2}→ approved/gu)?.length).toBe(4);
    // the operation seen through, the place played by its own policy
    expect(r.stdout).toMatch(/✓ Objective completed: Operate/u);
  });
});

describe("bench team --seat", () => {
  it("runs each scenario that offers the place in it, the operation closed; a place no case offers is a usage error", { timeout: T }, async () => {
    const box = sandbox();
    const out = join(box.cwd, "team-out");
    const r = await run(["bench", "team", "--seat", "first-assistant", "--case", CASE, "--out", out, "--lang", "en"], box);
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/2 of 2 team scenarios passed\./u);
    expect(r.stderr).toMatch(/By place: the first assistant's, played by its own policy while the stand-in surgeon operates\./u);
    const report = JSON.parse(readFileSync(join(out, "team-report.json"), "utf8")) as Record<string, any>;
    expect(report).toMatchObject({ seat: "first-assistant", passed: 2, total: 2, skipped: [] });
    for (const run of report.runs) expect(run.operation).toEqual({ closed: true });
    // no second assistant without the line-up that brings one
    const none = await run(["bench", "team", "--seat", "second-assistant", "--case", CASE, "--out", out, "--lang", "en"], box);
    expect(none.code).toBe(2);
    expect(none.stderr).toMatch(/No case with team scenarios offers the second assistant's place \(a case team whose surgeon names a stand-in/u);
    const three = await run(["bench", "team", "--seat", "second-assistant", "--lineup", "three-surgeons", "--case", CASE, "--out", out, "--lang", "en"], box);
    expect(three.code, three.stderr).toBe(0);
    expect(three.stdout).toMatch(/1 of 1 team scenarios passed\./u);
    expect(three.stderr).toMatch(/– cli-lap-chole-team · second-away: the second assistant's place is not offered in this scenario/u);
    // the operating surgeon's place is the default run's
    const surgeon = await run(["bench", "team", "--seat", "surgeon", "--out", out, "--lang", "en"], box);
    expect(surgeon.code).toBe(2);
    expect(surgeon.stderr).toMatch(/expected first-assistant \| second-assistant \| scrub-nurse/u);
    // a line-up belongs to a run by place: alone it is a usage error, never ignored
    const lineupAlone = await run(["bench", "team", "--lineup", "three-surgeons", "--case", CASE, "--out", out, "--lang", "en"], box);
    expect(lineupAlone.code).toBe(2);
    expect(lineupAlone.stderr).toMatch(/--lineup chooses the line-up of a run by place: give --seat <place> with it/u);
  });
});
