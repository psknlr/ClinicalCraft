import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadProjectAgents, loadProjectCommands } from "./definitions.js";
import { clinicalcraftHome, findProjectRoot, localAssetDirs } from "./home.js";
import { loadMemory } from "./memory.js";
import { resolveNodeProviderConfig } from "./providers.js";
import { loadSettings, saveUserSettings } from "./settings.js";

let root: string;
let home: string;
let proj: string;
let cwd: string;
let env: Record<string, string | undefined>;

function write(path: string, content: string | object) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "cc-node-"));
  home = join(root, "home", ".clinicalcraft");
  proj = join(root, "work", "course");
  cwd = join(proj, "week1", "day2");
  mkdirSync(cwd, { recursive: true });
  mkdirSync(join(proj, ".git"));
  env = { CLINICALCRAFT_HOME: home, HOME: join(root, "home"), ANTHROPIC_API_KEY: "sk-ant-node" };

  write(join(home, "settings.json"), {
    provider: "anthropic",
    model: "claude-opus-5-5",
    permissions: { allow: ["examine"] },
    contentDirs: ["./my-cases"],
    providers: { openai: { apiKey: "user-openai-key" } },
    profiles: { osce: { approvalMode: "strict", practiceScope: "history-only" } },
  });
  write(join(proj, ".clinicalcraft", "settings.json"), {
    approvalMode: "auto",
    permissions: { allow: ["read_result"], deny: ["intervene(thrombolysis*)"] },
    contentDirs: ["../content"],
    transcripts: { dir: "~/transcripts" },
    providers: { deepseek: { apiKey: "should-be-dropped" } },
    nonsense: 1,
  });
  write(join(proj, ".clinicalcraft", "settings.local.json"), { locale: "en", maxToolRounds: 20 });

  // memory
  write(join(home, "CLINICALCRAFT.md"), "User memory.\n<!-- private note -->");
  write(join(proj, "CLINICALCRAFT.md"), "Course rules.\n@docs/rubric.md");
  write(join(proj, "docs", "rubric.md"), "Rubric: SOCRATES.");
  write(join(proj, "week1", "AGENTS.md"), "Week 1 agents fallback.");
  write(join(proj, "week1", "day2", "CLINICALCRAFT.md"), "Day 2 focus: chest pain.");
  write(join(proj, ".clinicalcraft", "CLINICALCRAFT.md"), "Hidden project memory.");

  // agents & commands
  write(join(home, "agents", "tutor.md"), "---\nname: tutor\nrole: assistant\n---\nUser tutor.");
  write(join(home, "agents", "porter.md"), "---\nrole: npc\n---\nPorter.");
  write(join(proj, ".clinicalcraft", "agents", "tutor.md"), "---\nname: tutor\nrole: assistant\ntools: [give_hint]\n---\nProject tutor.");
  write(join(proj, ".clinicalcraft", "agents", "broken.md"), "---\nname: broken\nrole: wizard\n---\n");
  write(join(home, "commands", "recap.md"), "---\ndescription: User recap\n---\nRecap $ARGUMENTS");
  write(join(proj, ".clinicalcraft", "commands", "recap.md"), "---\ndescription: Project recap\n---\nRecap!");
  write(join(proj, ".clinicalcraft", "commands", "osce", "start.md"), "---\nargument-hint: <case>\n---\nStart $1");
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("home & project discovery", () => {
  it("resolves home, project root and asset dirs", () => {
    expect(clinicalcraftHome(env)).toBe(home);
    expect(clinicalcraftHome({ HOME: "/h" })).toBe("/h/.clinicalcraft");
    expect(findProjectRoot(cwd, env)).toBe(proj);
    expect(localAssetDirs(cwd, env)).toEqual([join(proj, "assets", "local"), join(home, "assets")]);
    // the home config dir is never a project marker
    expect(findProjectRoot(join(root, "home"), env)).toBeNull();
    const marked = join(root, "other");
    mkdirSync(join(marked, ".clinicalcraft", "x"), { recursive: true });
    expect(findProjectRoot(join(marked, ".clinicalcraft", "x"), env)).toBe(marked);
  });
});

describe("loadSettings", () => {
  it("layers user < project < local < env < flags with relative paths resolved", async () => {
    const s = await loadSettings({ cwd, env: { ...env, CLINICALCRAFT_MODEL: "claude-sonnet-5-5" }, flags: { approvalMode: "bypass", contentDirs: ["flag-cases"] } });
    expect(s.files).toEqual([join(home, "settings.json"), join(proj, ".clinicalcraft", "settings.json"), join(proj, ".clinicalcraft", "settings.local.json")]);
    expect(s.projectRoot).toBe(proj);
    expect(s).toMatchObject({ provider: "anthropic", model: "claude-sonnet-5-5", approvalMode: "bypass", locale: "en", maxToolRounds: 20 });
    expect(s.permissions).toEqual({ allow: ["examine", "read_result"], ask: [], deny: ["intervene(thrombolysis*)"] });
    expect(s.contentDirs).toEqual([join(home, "my-cases"), join(proj, "content"), join(cwd, "flag-cases")]);
    expect(s.transcripts.dir).toBe(join(root, "home", "transcripts"));
    expect(s.providers.openai?.apiKey).toBe("user-openai-key");
    expect(s.providers.deepseek).toEqual({});
    expect(s.sources).toMatchObject({ provider: "user", approvalMode: "flag", model: "env", locale: "local" });
    expect(s.issues.map((i) => i.path)).toEqual(expect.arrayContaining(["nonsense", "providers.deepseek.apiKey"]));
  });

  it("applies profiles (option or CLINICALCRAFT_PROFILE) and rejects unknown ones", async () => {
    expect(await loadSettings({ cwd, env, profile: "osce" })).toMatchObject({ approvalMode: "strict", practiceScope: "history-only" });
    expect(await loadSettings({ cwd, env: { ...env, CLINICALCRAFT_PROFILE: "osce" } })).toMatchObject({ approvalMode: "strict" });
    await expect(loadSettings({ cwd, env, profile: "exam-day" })).rejects.toThrow(/Unknown settings profile "exam-day" \(known: osce\)/);
  });

  it("reports invalid JSON files without failing", async () => {
    const other = mkdtempSync(join(tmpdir(), "cc-bad-"));
    try {
      mkdirSync(join(other, ".git"));
      write(join(other, ".clinicalcraft", "settings.json"), "{ not json");
      const s = await loadSettings({ cwd: other, env: { CLINICALCRAFT_HOME: join(other, "nohome") } });
      expect(s.provider).toBe("offline");
      expect(s.issues[0]).toMatchObject({ source: "project", severity: "error", message: expect.stringMatching(/invalid JSON/) });
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  });
});

describe("saveUserSettings", () => {
  it("deep-merges, deletes with null, writes 0600 and validates", async () => {
    const isolatedHome = join(root, "save-home");
    const e = { CLINICALCRAFT_HOME: isolatedHome };
    const file = await saveUserSettings({ provider: "zhipu", providers: { zhipu: { apiKeyEnv: ["MY_ZP"] } } }, e);
    expect(file).toBe(join(isolatedHome, "settings.json"));
    await saveUserSettings({ model: "glm-4.6", providers: { zhipu: { defaultModel: "glm-5" } } }, e);
    await saveUserSettings({ provider: null } as never, e);
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ model: "glm-4.6", providers: { zhipu: { apiKeyEnv: ["MY_ZP"], defaultModel: "glm-5" } } });
    if (process.platform !== "win32") expect(statSync(file).mode & 0o777).toBe(0o600);
    await expect(saveUserSettings({ approvalMode: "yolo" }, e)).rejects.toThrow(/approvalMode/);
  });
});

describe("loadMemory", () => {
  it("loads home + root→cwd memory (AGENTS.md fallback), resolving imports and stripping comments", async () => {
    const m = await loadMemory(cwd, env);
    expect(m.files).toEqual([
      join(home, "CLINICALCRAFT.md"),
      join(proj, ".clinicalcraft", "CLINICALCRAFT.md"),
      join(proj, "CLINICALCRAFT.md"),
      join(proj, "week1", "AGENTS.md"),
      join(cwd, "CLINICALCRAFT.md"),
      join(proj, "docs", "rubric.md"),
    ]);
    const order = ["User memory.", "Hidden project memory.", "Course rules.", "Rubric: SOCRATES.", "Week 1 agents fallback.", "Day 2 focus: chest pain."].map((t) => m.text.indexOf(t));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(m.text).not.toContain("private note");
  });
});

describe("agents & commands", () => {
  it("loads user + project agents, project overriding by name, reporting invalid files", async () => {
    const issues: string[] = [];
    const agents = await loadProjectAgents(cwd, env, { onIssue: (i) => issues.push(i.file) });
    const byName = Object.fromEntries(agents.map((a) => [a.name, a]));
    expect(Object.keys(byName).sort()).toEqual(["porter", "tutor"]);
    expect(byName.tutor).toMatchObject({ source: "project", prompt: "Project tutor.", tools: ["give_hint"] });
    expect(byName.porter).toMatchObject({ source: "user", role: "npc" });
    expect(issues).toEqual([join(proj, ".clinicalcraft", "agents", "broken.md")]);
  });

  it("loads commands with dir:name for nested files", async () => {
    const commands = await loadProjectCommands(cwd, env);
    const byName = Object.fromEntries(commands.map((c) => [c.name, c]));
    expect(Object.keys(byName).sort()).toEqual(["osce:start", "recap"]);
    expect(byName.recap).toMatchObject({ source: "project", description: "Project recap", template: "Recap!" });
    expect(byName["osce:start"]).toMatchObject({ argumentHint: "<case>", template: "Start $1" });
  });
});

describe("resolveNodeProviderConfig", () => {
  it("reads keys from env and defaults to the active provider", async () => {
    const s = await loadSettings({ cwd, env });
    expect(resolveNodeProviderConfig(s, null, null, env)).toMatchObject({ id: "anthropic", apiKey: "sk-ant-node", model: "claude-opus-5-5" });
    expect(resolveNodeProviderConfig(s, "openai", "gpt-5", env)).toMatchObject({ id: "openai", apiKey: "user-openai-key", model: "gpt-5" });
  });
});
