import { describe, expect, it } from "vitest";
import { DefinitionError, expandCommandTemplate, parseAgentMarkdown, parseCommandMarkdown, parseFrontmatter, parseScalar, splitArgs } from "./markdown.js";

describe("parseFrontmatter", () => {
  it("parses the YAML subset", () => {
    const { data, body } = parseFrontmatter(
      [
        "---",
        "name: nurse   # trailing comment",
        'description: "Charge nurse: ED"',
        "tools: [get_vitals, 'get_results', \"a, b\"]",
        "temperature: 0.6",
        "maxToolRounds: 3",
        "injectMemory: false",
        "model: ~",
        "tags:",
        "  - triage",
        "  - 'vitals'",
        "empty:",
        "url: https://x.test/#frag",
        "---",
        "Body line 1",
        "",
        "Body line 2",
      ].join("\r\n"),
    );
    expect(data).toEqual({
      name: "nurse",
      description: "Charge nurse: ED",
      tools: ["get_vitals", "get_results", "a, b"],
      temperature: 0.6,
      maxToolRounds: 3,
      injectMemory: false,
      model: null,
      tags: ["triage", "vitals"],
      empty: "",
      url: "https://x.test/#frag",
    });
    expect(body).toBe("Body line 1\n\nBody line 2");
  });

  it("returns the whole text as body without frontmatter (or when unterminated)", () => {
    expect(parseFrontmatter("just text")).toEqual({ data: {}, body: "just text" });
    expect(parseFrontmatter("---\nname: x\nno end")).toEqual({ data: {}, body: "---\nname: x\nno end" });
    expect(parseFrontmatter("﻿---\nname: x\n---\nhi").data).toEqual({ name: "x" });
  });

  it("parses scalars", () => {
    expect(parseScalar("42")).toBe(42);
    expect(parseScalar("-1.5e2")).toBe(-150);
    expect(parseScalar("true")).toBe(true);
    expect(parseScalar("'it''s'")).toBe("it's");
    expect(parseScalar('"tab\\t"')).toBe("tab\t");
    expect(parseScalar("[]")).toEqual([]);
    expect(parseScalar("1.2.3")).toBe("1.2.3");
  });
});

describe("parseAgentMarkdown", () => {
  it("applies defaults (npc, inherit, 4 rounds, no memory for npc)", () => {
    const p = parseAgentMarkdown("---\nname: porter\ndescription: Hospital porter\n---\nYou move patients.", "project");
    expect(p).toEqual({
      name: "porter",
      description: "Hospital porter",
      role: "npc",
      tools: [],
      model: "inherit",
      provider: "inherit",
      maxToolRounds: 4,
      prompt: "You move patients.",
      source: "project",
      injectMemory: false,
    });
  });

  it("reads every field; assistants inject memory by default; comma-separated tools", () => {
    const p = parseAgentMarkdown(
      "---\nname: tutor\nrole: assistant\ntools: get_progress, give_hint\nmodel: glm-4.6\nprovider: zhipu\neffort: high\ntemperature: 0.2\nmaxToolRounds: 6\n---\nBe Socratic.",
      "user",
    );
    expect(p).toMatchObject({ role: "assistant", tools: ["get_progress", "give_hint"], model: "glm-4.6", provider: "zhipu", effort: "high", temperature: 0.2, maxToolRounds: 6, injectMemory: true });
    expect(parseAgentMarkdown("---\nrole: examiner\ninjectMemory: false\n---\nJudge.", "user", "osce-examiner")).toMatchObject({ name: "osce-examiner", injectMemory: false });
  });

  it("rejects invalid definitions", () => {
    expect(() => parseAgentMarkdown("no frontmatter", "user")).toThrow(DefinitionError);
    expect(() => parseAgentMarkdown("---\nname: x\nrole: god\n---\n", "user")).toThrow(/role/);
    expect(() => parseAgentMarkdown("---\nname: x\neffort: extreme\n---\n", "user")).toThrow(/effort/);
    expect(() => parseAgentMarkdown("---\nname: x\ntemperature: 9\n---\n", "user")).toThrow(/temperature/);
    expect(() => parseAgentMarkdown("---\nname: x\nmaxToolRounds: 1.5\n---\n", "user")).toThrow(/maxToolRounds/);
    expect(() => parseAgentMarkdown("---\nname: ../evil\n---\n", "user")).toThrow(/name/);
  });
});

describe("slash commands", () => {
  it("parses command markdown", () => {
    expect(parseCommandMarkdown("osce:start", "---\ndescription: Start an OSCE station\nargument-hint: <case-id> [minutes]\nagent: attending\n---\nStart $1 for $2 minutes.", "project")).toEqual({
      name: "osce:start",
      description: "Start an OSCE station",
      argumentHint: "<case-id> [minutes]",
      source: "project",
      template: "Start $1 for $2 minutes.",
      agent: "attending",
    });
    expect(parseCommandMarkdown("review", "# Review my workup\nCheck: $ARGUMENTS", "user").description).toBe("Review my workup");
  });

  it("expands $ARGUMENTS and $1..$9 with quote-aware splitting", () => {
    expect(splitArgs(`ct-head "chest pain" 'two words' x\\"y`)).toEqual(["ct-head", "chest pain", "two words", 'x\\"y']);
    expect(expandCommandTemplate("Order $1 because $2; all: $ARGUMENTS; missing: [$3]", `ct-head "stroke symptoms"`)).toBe(
      `Order ct-head because stroke symptoms; all: ct-head "stroke symptoms"; missing: []`,
    );
    expect(expandCommandTemplate("$1-$2", ["a", "b"])).toBe("a-b");
    expect(expandCommandTemplate("no placeholders", "x")).toBe("no placeholders");
  });
});
