import { describe, expect, it } from "vitest";
import { assembleMemory, byteLength, MEMORY_MAX_BYTES, MEMORY_TRUNCATION_MARKER, stripHtmlComments, truncateBytes, type MemoryFile } from "./memory.js";

function fsResolver(files: Record<string, string>) {
  const calls: string[] = [];
  const resolve = (importPath: string, fromPath: string): MemoryFile | null => {
    const dir = fromPath.slice(0, fromPath.lastIndexOf("/"));
    const parts = (importPath.startsWith("/") ? importPath : `${dir}/${importPath}`).split("/");
    const stack: string[] = [];
    for (const p of parts) {
      if (p === "..") stack.pop();
      else if (p !== "." && p !== "") stack.push(p);
    }
    const path = `/${stack.join("/")}`;
    calls.push(path);
    return path in files ? { path, text: files[path]! } : null;
  };
  return { resolve, calls };
}

describe("stripHtmlComments", () => {
  it("removes single and multi-line comments but not inside code fences", () => {
    const text = "a <!-- x --> b\n<!--\nhidden\n-->\nc\n```\n<!-- kept -->\n```";
    expect(stripHtmlComments(text)).toBe("a  b\nc\n```\n<!-- kept -->\n```");
  });
});

describe("assembleMemory", () => {
  it("expands whole-line and inline @imports relative to the importing file", () => {
    const { resolve } = fsResolver({
      "/proj/docs/rubric.md": "Rubric: SOCRATES pain history.\n@nested/extra.md",
      "/proj/docs/nested/extra.md": "Extra guidance.",
      "/proj/style.md": "Answer in English.",
    });
    const text = assembleMemory([{ path: "/proj/CLINICALCRAFT.md", text: "# Course\n@docs/rubric.md\nSee @style.md for tone. Ask @nurse for vitals." }], resolve);
    expect(text).toBe(
      "Contents of /proj/CLINICALCRAFT.md:\n\n# Course\nRubric: SOCRATES pain history.\nExtra guidance.\nSee @style.md for tone. Ask @nurse for vitals.\nAnswer in English.",
    );
  });

  it("ignores imports in code spans and fences, and unresolvable imports stay literal", () => {
    const { resolve, calls } = fsResolver({ "/p/a.md": "A" });
    const text = assembleMemory([{ path: "/p/M.md", text: "use `@a.md` literally\n```\n@a.md\n```\n@missing.md" }], resolve);
    expect(text).toContain("use `@a.md` literally");
    expect(text).toContain("```\n@a.md\n```");
    expect(text).toContain("@missing.md");
    expect(calls).toEqual(["/p/missing.md"]);
  });

  it("detects cycles, skips duplicates and stops after 4 hops", () => {
    const cyc = fsResolver({ "/p/a.md": "A\n@b.md", "/p/b.md": "B\n@a.md" });
    expect(assembleMemory([{ path: "/p/a.md", text: "A\n@b.md" }], cyc.resolve)).toBe("Contents of /p/a.md:\n\nA\nB");

    const chain = fsResolver({ "/p/1.md": "one\n@2.md", "/p/2.md": "two\n@3.md", "/p/3.md": "three\n@4.md", "/p/4.md": "four\n@5.md", "/p/5.md": "five" });
    const text = assembleMemory([{ path: "/p/root.md", text: "root\n@1.md" }], chain.resolve);
    expect(text).toContain("four\n@5.md");
    expect(text).not.toContain("five");

    const dup = fsResolver({ "/p/shared.md": "S" });
    const twice = assembleMemory(
      [
        { path: "/p/x.md", text: "@shared.md" },
        { path: "/p/y.md", text: "y @shared.md" },
        { path: "/p/shared.md", text: "S" },
      ],
      dup.resolve,
    );
    expect(twice.match(/\bS\b/g)).toHaveLength(1);
  });

  it("strips comments in imported files and skips empty files", () => {
    const { resolve } = fsResolver({ "/p/i.md": "<!-- note to self -->\nvisible" });
    expect(assembleMemory([{ path: "/p/m.md", text: "@i.md" }, { path: "/p/empty.md", text: "<!-- only -->" }], resolve)).toBe("Contents of /p/m.md:\n\nvisible");
  });

  it("caps output at 32 KiB with a marker, never splitting multi-byte characters", () => {
    const big = "病例".repeat(10_000); // 6 bytes per repetition
    const text = assembleMemory([{ path: "/p/big.md", text: big }]);
    expect(byteLength(text)).toBeLessThanOrEqual(MEMORY_MAX_BYTES);
    expect(text.endsWith(MEMORY_TRUNCATION_MARKER)).toBe(true);
    expect(text).not.toContain("�");
    expect(truncateBytes("a😀b", 3)).toBe("a");
    expect(truncateBytes("abc", 10)).toBe("abc");
  });
});
