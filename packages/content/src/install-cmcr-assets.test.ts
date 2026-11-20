/**
 * The CMCR media installer (scripts/install-cmcr-assets.mjs), run as `node` would run it: a copy of the script in
 * a throwaway repository (its own cases, withdrawn list, media review and `assets/local`) against a throwaway
 * download, so the checks never touch this checkout's local media.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("../../../scripts/install-cmcr-assets.mjs", import.meta.url));
const png = (text: string) => Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from(text)]);
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const FIG = png("approved figure");
const PDF = Buffer.from("%PDF-1.4 approved report");
const WITHDRAWN = png("withdrawn figure");

interface Asset { id: string; kind: "image" | "pdf"; path: string; localOnly: true; sha256?: string }
const asset = (caseId: string, file: string, bytes?: Buffer): Asset => ({
  id: file,
  kind: file.endsWith(".pdf") ? "pdf" : "image",
  path: `/local-assets/cases/${caseId}/${file}`,
  localOnly: true,
  ...(bytes ? { sha256: sha(bytes) } : {}),
});

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A repository with the real script, one case per collection and the two lists; a download with its media. */
function setup() {
  const tmp = mkdtempSync(join(tmpdir(), "cc-cmcr-install-"));
  temps.push(tmp);
  const root = join(tmp, "repo");
  const download = join(tmp, "download");
  const write = (file: string, data: string | Buffer) => {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, data);
  };
  const json = (file: string, value: unknown) => write(file, JSON.stringify(value, null, 2));
  write(join(root, "scripts/install-cmcr-assets.mjs"), readFileSync(SCRIPT));
  const setCase = (id: string, tag: string, assets: Asset[]) => json(join(root, "packages/content/cases", id, "case.json"), { id, tags: [tag], assets });
  const setReview = (files: { case: string; file: string; status: string; sha256: string }[]) =>
    json(join(root, "scripts/cmcr-105-media-review.json"), { files: files.map((f) => ({ reason: "test", ...f })) });
  json(join(root, "scripts/cmcr-withdrawn-assets.json"), { withdrawn: [{ case: "cmcr-9", file: "fig01.png", sha256: sha(WITHDRAWN), reason: "shows a name" }] });
  setReview([
    { case: "cmcr-1", file: "fig01.png", status: "approved", sha256: sha(FIG) },
    { case: "cmcr-1", file: "source.pdf", status: "approved", sha256: sha(PDF) },
  ]);
  setCase("cmcr-1", "cmcr-105", [asset("cmcr-1", "fig01.png", FIG), asset("cmcr-1", "source.pdf", PDF)]);
  setCase("cmcr-2", "cmcr-20", [asset("cmcr-2", "fig01.png")]);
  write(join(download, "1.pdf"), PDF);
  write(join(download, "media/1/fig01_a.png"), FIG);
  write(join(download, "media/2/fig01_b.png"), png("original figure"));
  const local = (file: string) => join(root, "assets/local", file);
  const run = (...args: string[]) => spawnSync(process.execPath, [join(root, "scripts/install-cmcr-assets.mjs"), ...args], { encoding: "utf8" });
  return { root, download, write, setCase, setReview, local, run };
}

/** A refusal is a message and exit code 1, never a crash with a stack trace. */
function expectRefused(result: ReturnType<ReturnType<typeof setup>["run"]>, reason: RegExp) {
  expect(result.status, result.stderr).toBe(1);
  expect(result.stderr).toMatch(reason);
  expect(result.stderr).not.toMatch(/\n\s+at /);
}

describe("CMCR media installer", () => {
  it("installs a cmcr-105 file only when the media review approves it with the case's checksum, and verifies it again later", () => {
    const t = setup();
    const first = t.run(t.download, "cmcr-105");
    expect(first.status, first.stderr).toBe(0);
    expect(readFileSync(t.local("cases/cmcr-1/fig01.png")).equals(FIG)).toBe(true);
    expect(readFileSync(t.local("cases/cmcr-1/source.pdf")).equals(PDF)).toBe(true);
    const manifest = JSON.parse(readFileSync(t.local("cmcr-105-manifest.json"), "utf8")) as { file: string; sha256: string }[];
    expect(manifest.map((m) => [m.file, m.sha256])).toEqual([["fig01.png", sha(FIG)], ["source.pdf", sha(PDF)]]);
    const again = t.run(t.download, "cmcr-105");
    expect(again.status, again.stderr).toBe(0);
    expect(again.stdout).toMatch(/Installed 0 and verified 2/);
  });

  const refusals: [string, (t: ReturnType<typeof setup>) => void, RegExp][] = [
    ["a file the media review does not list", (t) => t.setReview([{ case: "cmcr-1", file: "source.pdf", status: "approved", sha256: sha(PDF) }]), /Not approved .*cmcr-1\/fig01\.png/],
    ["a withheld file", (t) => t.setReview([{ case: "cmcr-1", file: "fig01.png", status: "withheld", sha256: sha(FIG) }, { case: "cmcr-1", file: "source.pdf", status: "approved", sha256: sha(PDF) }]), /withheld/],
    ["everything when the media review has no file list", (t) => t.write(join(t.root, "scripts/cmcr-105-media-review.json"), "{}"), /has no file list/],
    ["an asset without a checksum", (t) => t.setCase("cmcr-1", "cmcr-105", [asset("cmcr-1", "fig01.png"), asset("cmcr-1", "source.pdf", PDF)]), /No sha256 in cmcr-1 for fig01\.png/],
    ["a checksum other than the approved one", (t) => t.setCase("cmcr-1", "cmcr-105", [asset("cmcr-1", "fig01.png", png("another figure")), asset("cmcr-1", "source.pdf", PDF)]), /not the approved file's/],
    ["source bytes other than the approved ones", (t) => t.write(join(t.download, "media/1/fig01_a.png"), png("edited figure")), /Checksum mismatch for cmcr-1\/fig01\.png/],
    ["a withdrawn file under another name", (t) => t.write(join(t.download, "media/1/fig01_a.png"), WITHDRAWN), /is cmcr-9\/fig01\.png/],
    ["a download without a media folder", (t) => rmSync(join(t.download, "media"), { recursive: true }), /No media folder/],
  ];
  for (const [what, change, reason] of refusals) it(`cmcr-105 refuses ${what} and then copies nothing`, () => {
    const t = setup();
    change(t);
    expectRefused(t.run(t.download, "cmcr-105"), reason);
    expect(existsSync(t.local("cases"))).toBe(false);
    expect(existsSync(t.local("cmcr-105-manifest.json"))).toBe(false);
  });

  it("refuses an empty directory, dry run or not, without crashing or writing", () => {
    const t = setup();
    const empty = mkdtempSync(join(tmpdir(), "cc-cmcr-empty-"));
    temps.push(empty);
    for (const collection of ["cmcr-105", "cmcr-20"]) {
      expectRefused(t.run(empty, collection, "--dry-run"), /No media folder/);
      expectRefused(t.run(empty, collection), /No media folder/);
    }
    expect(existsSync(t.local(""))).toBe(false);
    const usage = t.run(empty, "cmcr-50");
    expect(usage.status).toBe(2);
    expect(usage.stderr).toMatch(/^Usage:/);
  });

  it("a dry run checks everything and writes nothing", () => {
    const t = setup();
    const dry = t.run(t.download, "cmcr-105", "--dry-run");
    expect(dry.status, dry.stderr).toBe(0);
    expect(dry.stdout).toMatch(/Dry run: 2 assets to install/);
    expect(existsSync(t.local(""))).toBe(false);
  });

  it("removes a withdrawn copy an earlier version installed even when the install is refused, and only that copy", () => {
    const t = setup();
    t.write(t.local("cases/cmcr-9/fig01.png"), WITHDRAWN);
    t.write(t.local("cases/cmcr-9/source.pdf"), PDF);
    const dry = t.run(t.download, "cmcr-105", "--dry-run");
    expect(dry.stdout).toMatch(/Would remove a withdrawn asset installed earlier: cmcr-9\/fig01\.png/);
    expect(existsSync(t.local("cases/cmcr-9/fig01.png"))).toBe(true);
    rmSync(join(t.download, "media"), { recursive: true });
    expectRefused(t.run(t.download, "cmcr-105"), /No media folder/);
    expect(existsSync(t.local("cases/cmcr-9/fig01.png"))).toBe(false);
    expect(existsSync(t.local("cases/cmcr-9/source.pdf"))).toBe(true);
    // Different bytes at a withdrawn path are not the withdrawn file: kept, and the user is told to inspect them.
    t.write(t.local("cases/cmcr-9/fig01.png"), png("something else"));
    expect(t.run(t.download, "cmcr-105").stderr).toMatch(/Not removed \(unexpected content\)/);
    expect(existsSync(t.local("cases/cmcr-9/fig01.png"))).toBe(true);
  });

  it("cmcr-20 keeps its rules: an authored checksum is optional, withdrawn files are refused, a differing local file is kept", () => {
    const t = setup();
    const installed = t.run(t.download, "cmcr-20");
    expect(installed.status, installed.stderr).toBe(0);
    expect(existsSync(t.local("cases/cmcr-2/fig01.png"))).toBe(true);
    t.write(t.local("cases/cmcr-2/fig01.png"), png("edited locally"));
    expectRefused(t.run(t.download, "cmcr-20"), /Existing asset differs/);
    expect(readFileSync(t.local("cases/cmcr-2/fig01.png")).equals(png("edited locally"))).toBe(true);
    rmSync(t.local("cases/cmcr-2/fig01.png"));
    t.setCase("cmcr-9", "cmcr-20", [asset("cmcr-9", "fig01.png")]);
    expectRefused(t.run(t.download, "cmcr-20"), /Withdrawn for privacy, never installed: cmcr-9\/fig01\.png/);
    expect(existsSync(t.local("cases/cmcr-2/fig01.png"))).toBe(false);
  });
});
