import { describe, expect, it } from "vitest";
import { applyEnv, applyProfile, applySettingsPatch, DEFAULT_SETTINGS, envLayer, mergeSettings, mergeSettingsDetailed } from "./merge.js";

describe("DEFAULT_SETTINGS", () => {
  it("matches the documented defaults and is frozen", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      provider: "offline",
      model: null,
      locale: "zh-CN",
      approvalMode: "default",
      practiceScope: "full",
      maxToolRounds: 12,
      autoCompact: { enabled: true, thresholdTokens: 120000 },
      transcripts: { enabled: true, dir: null },
      patient: { pipeline: "select-voice", strictGrounding: true, offlineFallback: true },
      server: { host: "127.0.0.1", port: 5178, token: null },
    });
    expect(Object.isFrozen(DEFAULT_SETTINGS)).toBe(true);
    expect(Object.isFrozen(DEFAULT_SETTINGS.permissions.allow)).toBe(true);
  });

  it("mergeSettings([]) returns a fresh mutable copy with default sources", () => {
    const s = mergeSettings([]);
    s.permissions.allow.push("x");
    expect(DEFAULT_SETTINGS.permissions.allow).toEqual([]);
    expect(s.sources.provider).toBe("default");
    expect(s.sources.server).toBe("default");
  });
});

describe("mergeSettings", () => {
  it("layers scalars (last wins), deep-merges objects and concatenates permission/hook lists", () => {
    const s = mergeSettings([
      {
        source: "user",
        settings: {
          provider: "anthropic",
          model: "claude-opus-5-5",
          permissions: { allow: ["examine", "order_test(*)"], deny: ["intervene(thrombolysis*)"] },
          hooks: { PostToolUse: [{ matcher: "order_test", hooks: [{ type: "command", command: "log.sh" }] }] },
          agents: { patient: { model: "glm-4.6", temperature: 0.7 } },
          providers: { zhipu: { baseUrl: "https://a.test/v4", headers: { A: "1" } } },
          server: { host: "0.0.0.0", token: "t" },
          contentDirs: ["/u/cases"],
        },
      },
      {
        source: "project",
        settings: {
          model: "claude-sonnet-5-5",
          approvalMode: "strict",
          permissions: { allow: ["examine", "read_result"], ask: ["intervene"] },
          hooks: {
            PostToolUse: [
              { matcher: "order_test", hooks: [{ type: "command", command: "log.sh" }] },
              { matcher: "intervene", hooks: [{ type: "command", command: "audit.sh" }] },
            ],
          },
          agents: { patient: { effort: "low" } },
          providers: { zhipu: { headers: { B: "2" } } },
          server: { port: 8080 },
          contentDirs: ["/p/cases", "/u/cases"],
        },
      },
      { source: "local", settings: { locale: "en" } },
    ]);
    expect(s.provider).toBe("anthropic");
    expect(s.model).toBe("claude-sonnet-5-5");
    expect(s.locale).toBe("en");
    expect(s.approvalMode).toBe("strict");
    expect(s.permissions).toEqual({ allow: ["examine", "order_test(*)", "read_result"], ask: ["intervene"], deny: ["intervene(thrombolysis*)"] });
    expect(s.hooks.PostToolUse).toHaveLength(2);
    expect(s.agents.patient).toEqual({ model: "glm-4.6", temperature: 0.7, effort: "low" });
    expect(s.providers.zhipu).toEqual({ baseUrl: "https://a.test/v4", headers: { A: "1", B: "2" } });
    // schema defaults inside a layer never clobber earlier layers
    expect(s.server).toEqual({ host: "0.0.0.0", port: 8080, token: "t" });
    expect(s.contentDirs).toEqual(["/u/cases", "/p/cases"]);
    expect(s.sources).toMatchObject({ provider: "user", model: "project", locale: "local", approvalMode: "project", maxToolRounds: "default" });
  });

  it("skips invalid keys with issues instead of crashing", () => {
    const { settings, issues } = mergeSettingsDetailed([
      {
        source: "user",
        file: "/u/settings.json",
        settings: {
          approvalMode: "yolo",
          maxToolRounds: 0,
          locale: "en",
          bogus: true,
          agents: { patient: { model: "x", unknownKey: 1 }, nurse: { model: "y" } },
          providers: { bad: { baseUrl: "not a url" }, good: { baseUrl: "https://ok.test" } },
        },
      },
      { source: "project", settings: "not an object" },
    ]);
    expect(settings.approvalMode).toBe("default");
    expect(settings.maxToolRounds).toBe(12);
    expect(settings.locale).toBe("en");
    expect(settings.agents).toEqual({ nurse: { model: "y" } });
    expect(settings.providers).toEqual({ good: { baseUrl: "https://ok.test" } });
    const paths = issues.map((i) => i.path);
    expect(paths).toEqual(expect.arrayContaining(["approvalMode", "maxToolRounds", "bogus", "providers.bad.baseUrl", ""]));
    expect(issues.find((i) => i.path === "bogus")).toMatchObject({ severity: "warning", file: "/u/settings.json", source: "user" });
    expect(issues.some((i) => i.path.startsWith("agents.patient"))).toBe(true);
  });

  it("drops API keys from project settings (but honours user/local ones)", () => {
    const { settings, issues } = mergeSettingsDetailed([
      { source: "user", settings: { providers: { openai: { apiKey: "user-key" } } } },
      { source: "project", settings: { providers: { deepseek: { apiKey: "leaked", baseUrl: "https://d.test" } } } },
      { source: "local", settings: { providers: { qwen: { apiKey: "local-key" } } } },
    ]);
    expect(settings.providers.openai!.apiKey).toBe("user-key");
    expect(settings.providers.deepseek).toEqual({ baseUrl: "https://d.test" });
    expect(settings.providers.qwen!.apiKey).toBe("local-key");
    expect(issues.find((i) => i.path === "providers.deepseek.apiKey")?.severity).toBe("warning");
  });

  it("applies a named profile last and reports unknown profiles", () => {
    const layers = [
      { source: "user" as const, settings: { approvalMode: "auto", profiles: { osce: { approvalMode: "strict", practiceScope: "history-only", permissions: { deny: ["consult"] } } } } },
      { source: "flag" as const, settings: { approvalMode: "bypass", permissions: { deny: ["finish_case"] } } },
    ];
    const s = mergeSettings(layers, { profile: "osce" });
    expect(s.approvalMode).toBe("strict");
    expect(s.practiceScope).toBe("history-only");
    expect(s.permissions.deny).toEqual(["finish_case", "consult"]);
    expect(s.sources.approvalMode).toBe("profile");
    const missing = mergeSettingsDetailed(layers, { profile: "nope" });
    expect(missing.settings.approvalMode).toBe("bypass");
    expect(missing.issues.at(-1)).toMatchObject({ path: "profiles.nope", severity: "error" });
    expect(missing.profiles.osce).toBeDefined();
  });
});

describe("env, profile and patch helpers", () => {
  it("envLayer reads CLINICALCRAFT_* and ignores invalid enum values", () => {
    expect(
      envLayer({
        CLINICALCRAFT_PROVIDER: "zhipu",
        CLINICALCRAFT_MODEL: "glm-4.6",
        CLINICALCRAFT_LOCALE: "en",
        CLINICALCRAFT_APPROVAL: "plan",
        CLINICALCRAFT_SCOPE: "omniscient",
      }).settings,
    ).toEqual({ provider: "zhipu", model: "glm-4.6", locale: "en", approvalMode: "plan" });
  });

  it("applyEnv / applyProfile / applySettingsPatch return new objects with sources", () => {
    const base = mergeSettings([{ source: "user", settings: { provider: "anthropic" } }]);
    const env = applyEnv(base, { CLINICALCRAFT_SCOPE: "workup", CLINICALCRAFT_MODEL: "claude-haiku-5-5" });
    expect(env).not.toBe(base);
    expect(base.practiceScope).toBe("full");
    expect(env).toMatchObject({ practiceScope: "workup", model: "claude-haiku-5-5", provider: "anthropic" });
    expect(env.sources).toMatchObject({ practiceScope: "env", model: "env", provider: "user" });

    const prof = applyProfile(env, { approvalMode: "bypass", maxToolRounds: 40 });
    expect(prof).toMatchObject({ approvalMode: "bypass", maxToolRounds: 40 });
    expect(prof.sources.maxToolRounds).toBe("profile");

    const { settings, issues } = applySettingsPatch(prof, { locale: "en", approvalMode: "nope" });
    expect(settings.locale).toBe("en");
    expect(settings.approvalMode).toBe("bypass");
    expect(issues).toHaveLength(1);
    expect(settings.sources.locale).toBe("flag");
  });
});
