/**
 * Review C15: `exec --embodied` / `play --embodied` of a case the chosen facility has no place for (the garden
 * anaphylaxis case in the teaching hospital) is refused before the session starts — a usage error with the
 * localised reason, no transcript written.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";
import type { CliIO } from "./context.js";
import { EXIT } from "./context.js";
import { main } from "./main.js";

const root = mkdtempSync(join(tmpdir(), "cc-cli-c15-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const T = 120_000;

function sandbox(): { env: Record<string, string>; cwd: string; home: string } {
  const dir = mkdtempSync(join(root, "s-"));
  const home = join(dir, "home");
  const cwd = join(dir, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(join(cwd, ".clinicalcraft"), { recursive: true });
  return { env: { CLINICALCRAFT_HOME: home, HOME: home, NO_COLOR: "1" }, cwd, home };
}

async function run(argv: string[], box: { env: Record<string, string>; cwd: string }): Promise<{ code: number; stdout: string; stderr: string }> {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();
  let out = "";
  let err = "";
  stdout.on("data", (d: Buffer) => (out += d.toString("utf8")));
  stderr.on("data", (d: Buffer) => (err += d.toString("utf8")));
  stdin.end("");
  const code = await main(argv, { io: { stdout, stderr, stdin } as unknown as CliIO, env: box.env, cwd: box.cwd });
  return { code, stdout: out, stderr: err };
}

describe("C15: no place for the case in the facility", () => {
  for (const [command, locale, pattern] of [
    ["exec", "en", /no place/i],
    ["play", "zh-CN", /位置/],
  ] as const) {
    it(`${command} --embodied refuses it before the session starts (${locale})`, { timeout: T }, async () => {
      const box = sandbox();
      const which = command === "exec" ? ["--case", "anaphylaxis-garden", "--autopilot", "--approval", "bypass"] : ["anaphylaxis-garden"];
      const argv = [command, ...which, "--facility", "teaching-hospital", "--embodied", "--provider", "offline", "--lang", locale];
      const r = await run(argv, box);
      expect(r.code, r.stderr + r.stdout).toBe(EXIT.usage);
      expect(r.stderr).toMatch(pattern);
      // Nothing was started: no transcript.
      const sessions = join(box.home, "sessions");
      expect(existsSync(sessions) ? readdirSync(sessions, { recursive: true }).filter((f) => String(f).endsWith(".jsonl")) : []).toEqual([]);
    });
  }
});

describe("G11: the REPL status line shows the vitals only where the learner's body can see them", () => {
  it("an embodied session away from the bedside: 'vitals: not in view' (both languages); at the patient with the monitor on: the values", { timeout: T }, async () => {
    const { createSession, mergeSettings } = await import("@clinicalcraft/agent");
    const { catalogsFor, chooseFacility, loadContent } = await import("@clinicalcraft/agent/node");
    const { createPalette } = await import("./ansi.js");
    const { EventRenderer } = await import("./render.js");
    const content = await loadContent({ dirs: [] });
    const caseDef = content.cases.get("stemi-inferior-rv")!.def;
    const facility = chooseFacility(content, caseDef, undefined, null)!;
    const session = await createSession({ caseDef, facility, catalogs: catalogsFor(content, facility), settings: mergeSettings([{ source: "flag", settings: { provider: "offline", locale: "en", embodiment: "embodied", approvalMode: "bypass", transcripts: { enabled: false } } }]) });
    const line = (locale: string) =>
      new EventRenderer({ out: { write: () => true }, palette: createPalette(false), caseDef, locale: () => locale, interactive: false, vitals: () => session.vitalsView(), place: () => session.placeLabel() }).statusLine(session.state);
    expect(line("en")).toContain("vitals: not in view");
    expect(line("zh-CN")).toContain("生命体征：不在视野内");
    await session.run({ type: "slash_command", name: "go", args: "patient" });
    await session.run({ type: "slash_command", name: "use", args: "patient-monitor attach" });
    expect(line("en")).not.toContain("not in view");
    expect(line("en")).toMatch(/HR \d+/);
    await session.close();
  });
});
