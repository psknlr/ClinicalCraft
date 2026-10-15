import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCase, type CaseDefinition } from "@clinicalcraft/core";
import { colorEnabled, createPalette, stripAnsi } from "./ansi.js";
import { editDistance, flagBool, flagList, flagNumber, flagPositiveInt, flagString, lookupFlag, parseArgs, suggest, UsageError, type FlagSpec } from "./argv.js";
import { EXEC, ROOT } from "./commands.js";
import { displayPath } from "./context.js";
import { EXEC_FLAGS, GLOBAL_FLAGS, RESUME_FLAGS, SESSION_FLAGS } from "./flags.js";
import { renderHelp } from "./help.js";
import { m, normalizeLang } from "./i18n.js";
import { resolveCommand } from "./main.js";
import { completeLine, parseApprovalAnswer } from "./repl.js";
import { summarizeArgs, truncate } from "./render.js";

const SPECS: FlagSpec[] = [
  { name: "model", type: "string", valueName: "<id>", description: { en: "", zh: "" } },
  { name: "print", short: "p", type: "string", optionalValue: true, description: { en: "", zh: "" } },
  { name: "output-format", type: "string", choices: ["text", "json", "stream-json"], description: { en: "", zh: "" } },
  { name: "max-turns", type: "number", description: { en: "", zh: "" } },
  { name: "verbose", short: "v", type: "boolean", description: { en: "", zh: "" } },
  { name: "cases", type: "list", description: { en: "", zh: "" } },
  { name: "lang", type: "string", aliases: ["language"], description: { en: "", zh: "" } },
];

function usageError(fn: () => unknown): UsageError {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(UsageError);
    return err as UsageError;
  }
  throw new Error("expected a UsageError");
}

describe("parseArgs", () => {
  it("accepts --flag value, --flag=value, -p value, -pvalue and positionals anywhere", () => {
    const a = parseArgs(["play", "--model", "gpt-5", "--output-format=json", "-p", "hello world", "case-1", "-v"], SPECS);
    expect(a.flags).toEqual({ model: "gpt-5", "output-format": "json", print: "hello world", verbose: true });
    expect(a.positionals).toEqual(["play", "case-1"]);
    expect(parseArgs(["-phi"], SPECS).flags.print).toBe("hi");
    expect(parseArgs(["-p=hi"], SPECS).flags.print).toBe("hi");
  });

  it("parses numbers, lists (repeated and comma-separated), aliases and negated booleans", () => {
    const a = parseArgs(["--max-turns", "5", "--cases", "a,b", "--cases=c", "--language", "en", "--no-verbose"], SPECS);
    expect(flagNumber(a, "max-turns")).toBe(5);
    expect(flagList(a, "cases")).toEqual(["a", "b", "c"]);
    expect(flagString(a, "lang")).toBe("en");
    expect(flagBool(a, "verbose", true)).toBe(false);
    expect(parseArgs(["--verbose=false"], SPECS).flags.verbose).toBe(false);
  });

  it("stops at -- and keeps '-' and negative numbers as values", () => {
    const a = parseArgs(["x", "--", "--model", "y"], SPECS);
    expect(a.positionals).toEqual(["x"]);
    expect(a.rest).toEqual(["--model", "y"]);
    expect(parseArgs(["-p", "-"], SPECS).flags.print).toBe("-");
    expect(parseArgs(["-5"], SPECS).positionals).toEqual(["-5"]);
  });

  it("lets an optional-value flag stand alone", () => {
    expect(parseArgs(["-p"], SPECS).flags.print).toBe("");
    const a = parseArgs(["-p", "--model", "m", "question"], SPECS);
    expect(a.flags.print).toBe("");
    expect(a.flags.model).toBe("m");
    expect(a.positionals).toEqual(["question"]);
  });

  it("rejects unknown flags with a typo suggestion", () => {
    const err = usageError(() => parseArgs(["--modle", "x"], SPECS, "en"));
    expect(err.exitCode).toBe(2);
    expect(err.message).toContain("--modle");
    expect(err.hint).toBe(m("en", "argv.didYouMean", { value: "--model" }));
    expect(usageError(() => parseArgs(["--outptu-format=json"], SPECS)).hint).toContain("--output-format");
  });

  it("rejects missing values, bad numbers and invalid choices", () => {
    expect(usageError(() => parseArgs(["--model"], SPECS)).message).toContain("--model");
    expect(usageError(() => parseArgs(["--model", "--verbose"], SPECS)).message).toContain("--model");
    expect(usageError(() => parseArgs(["--max-turns", "lots"], SPECS)).message).toContain("lots");
    const choice = usageError(() => parseArgs(["--output-format", "jsno"], SPECS, "en"));
    expect(choice.message).toContain("text | json | stream-json");
    expect(choice.hint).toContain('"json"');
    expect(usageError(() => parseArgs(["--verbose=maybe"], SPECS)).message).toContain("maybe");
  });

  it("validates positive integers", () => {
    expect(flagPositiveInt(parseArgs(["--max-turns", "3"], SPECS), "max-turns")).toBe(3);
    expect(flagPositiveInt(parseArgs([], SPECS), "max-turns")).toBeUndefined();
    usageError(() => flagPositiveInt(parseArgs(["--max-turns", "0"], SPECS), "max-turns"));
    usageError(() => flagPositiveInt(parseArgs(["--max-turns", "1.5"], SPECS), "max-turns"));
  });

  it("looks up flags without consuming them", () => {
    expect(lookupFlag("--model=x", SPECS)).toMatchObject({ spec: { name: "model" }, inlineValue: "x" });
    expect(lookupFlag("-pfoo", SPECS)).toMatchObject({ spec: { name: "print" }, inlineValue: "foo" });
    expect(lookupFlag("--no-verbose", SPECS)).toMatchObject({ spec: { name: "verbose" } });
    expect(lookupFlag("positional", SPECS)).toBeNull();
    expect(lookupFlag("--nope", SPECS)).toBeNull();
  });
});

describe("suggest / editDistance", () => {
  it("measures transpositions as one edit", () => {
    expect(editDistance("plya", "play")).toBe(1);
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("kitten", "sitting")).toBe(3);
  });

  it("suggests close candidates and prefixes, not unrelated words", () => {
    expect(suggest("plya", ["play", "exec", "cases"])).toBe("play");
    expect(suggest("prov", ["providers", "play"])).toBe("providers");
    expect(suggest("xyzzy", ["play", "exec"])).toBeNull();
    expect(suggest("CASES", ["cases"])).toBe("cases");
  });
});

describe("resolveCommand", () => {
  const names = (argv: string[]) => resolveCommand(argv).path.map((c) => c.name);

  it("walks subcommands with flags anywhere", () => {
    expect(names(["cases", "validate", "--all"])).toEqual(["clinicalcraft", "cases", "validate"]);
    expect(names(["--lang", "en", "cases", "list"])).toEqual(["clinicalcraft", "cases", "list"]);
    expect(names(["case", "ls"])).toEqual(["clinicalcraft", "cases", "list"]);
    expect(resolveCommand(["cases", "show", "smzl", "--json"]).rest).toEqual(["smzl", "--json"]);
  });

  it("does not treat flag values as commands", () => {
    expect(names(["--profile", "cases", "play"])).toEqual(["clinicalcraft", "play"]);
    expect(names(["-p", "cases"])).toEqual(["clinicalcraft"]);
    expect(names(["-p", "--case", "x", "Where is the pain?"])).toEqual(["clinicalcraft"]);
  });

  it("recognises `help <command>`", () => {
    const r = resolveCommand(["help", "exec"]);
    expect(r.help).toBe(true);
    expect(r.path.map((c) => c.name)).toEqual(["clinicalcraft", "exec"]);
  });

  it("stops at the first unknown word (a case id for play)", () => {
    const r = resolveCommand(["smzl-lung-adeno", "--lang", "en"]);
    expect(r.path).toEqual([ROOT]);
    expect(r.rest).toEqual(["smzl-lung-adeno", "--lang", "en"]);
  });
});

describe("normalizeLang", () => {
  it("maps common spellings to zh-CN / en and rejects others", () => {
    for (const v of ["zh", "zh-CN", "zh_cn", "zh-Hans", "cn", "中文"]) expect(normalizeLang(v)).toBe("zh-CN");
    for (const v of ["en", "EN", "en-US", "en_GB", "english"]) expect(normalizeLang(v)).toBe("en");
    expect(normalizeLang("fr")).toBeNull();
  });
});

describe("help", () => {
  it("renders bilingual help from the command tree", () => {
    const p = createPalette(false);
    const en = renderHelp([ROOT, EXEC], "en", p, "5.0.0");
    expect(en).toContain("--output-format");
    expect(en).toContain("headless: approval required");
    expect(en).toContain("Exit codes");
    const zh = renderHelp([ROOT], "zh-CN", p, "5.0.0");
    expect(zh).toContain("用法");
    expect(zh).toContain("import-v4");
  });

  it("has no duplicate flag names within a command", () => {
    for (const flags of [[...GLOBAL_FLAGS, ...EXEC_FLAGS, ...SESSION_FLAGS, ...RESUME_FLAGS]]) {
      const all = flags.flatMap((f) => [f.name, ...(f.aliases ?? [])]);
      expect(new Set(all).size).toBe(all.length);
      const shorts = flags.flatMap((f) => (f.short ? [f.short] : []));
      expect(new Set(shorts).size).toBe(shorts.length);
    }
  });
});

describe("terminal helpers", () => {
  it("respects NO_COLOR, FORCE_COLOR and non-TTY streams", () => {
    expect(colorEnabled({ isTTY: true }, {})).toBe(true);
    expect(colorEnabled({ isTTY: false }, {})).toBe(false);
    expect(colorEnabled({ isTTY: true }, { NO_COLOR: "1" })).toBe(false);
    expect(colorEnabled({ isTTY: true }, { TERM: "dumb" })).toBe(false);
    expect(colorEnabled({ isTTY: false }, { FORCE_COLOR: "1" })).toBe(true);
    expect(colorEnabled({ isTTY: true }, { FORCE_COLOR: "0" })).toBe(false);
    const p = createPalette(true);
    expect(p.red("x")).not.toBe("x");
    expect(stripAnsi(p.bold(p.red("x")))).toBe("x");
    expect(createPalette(false).red("x")).toBe("x");
  });

  it("summarises tool arguments compactly", () => {
    expect(summarizeArgs({ investigation_id: "cbc" })).toBe("cbc");
    expect(summarizeArgs({ decision_id: "diagnosis", option_ids: ["dual"] })).toBe("diagnosis: dual");
    expect(summarizeArgs({ question: "Where does it hurt?" })).toBe('"Where does it hurt?"');
    expect(summarizeArgs({})).toBe("");
    expect(truncate("a  b\nc", 10)).toBe("a b c");
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
  });

  it("shows paths relative to cwd only inside it", () => {
    expect(displayPath("/a/b", "/a/b/c/d.json")).toBe("c/d.json");
    expect(displayPath("/a/b", "/x/y.json")).toBe("/x/y.json");
    expect(displayPath("/a/b", "/a/c.json")).toBe("/a/c.json");
  });
});

describe("REPL helpers", () => {
  const file = fileURLToPath(new URL("../../content/cases/smzl-lung-adeno/case.json", import.meta.url));
  const parsed = parseCase(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.ok) throw new Error("smzl-lung-adeno does not parse");
  const c: CaseDefinition = parsed.value;
  const commands = ["help", "order", "ord-custom", "vitals", "quit"];
  const agents = ["patient", "nurse", "attending"];

  it("completes /commands, their arguments and @roles", () => {
    expect(completeLine("/vi", commands, c, agents)).toEqual([["/vitals"], "/vi"]);
    expect(completeLine("/ord", commands, c, agents)[0]).toEqual(["/order", "/ord-custom"]);
    expect(completeLine("/", commands, c, agents)[0]).toHaveLength(commands.length);
    const [hits, word] = completeLine("/order bio", commands, c, agents);
    expect(word).toBe("bio");
    expect(hits).toContain("biopsy");
    expect(completeLine("@nu", commands, c, agents)).toEqual([["@nurse"], "@nu"]);
    expect(completeLine("hello", commands, c, agents)).toEqual([[], "hello"]);
  });

  it("parses approval answers", () => {
    expect(parseApprovalAnswer("y", true)).toEqual({ decision: "approved" });
    expect(parseApprovalAnswer("Yes.", true)).toEqual({ decision: "approved" });
    expect(parseApprovalAnswer("s", true)).toEqual({ decision: "approved_for_session" });
    expect(parseApprovalAnswer("s", false)).toBeNull();
    expect(parseApprovalAnswer("n (BP too high)", true)).toEqual({ decision: "denied", reason: "BP too high" });
    expect(parseApprovalAnswer("no", true)).toEqual({ decision: "denied" });
    expect(parseApprovalAnswer("a", true)).toEqual({ decision: "abort" });
    expect(parseApprovalAnswer("拒绝 血压太高", true)).toEqual({ decision: "denied", reason: "血压太高" });
    expect(parseApprovalAnswer("maybe", true)).toBeNull();
  });
});
