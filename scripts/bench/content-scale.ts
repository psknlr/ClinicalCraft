/**
 * Content-scale benchmark (docs/EMBODIED.md §11, "Measured content scale").
 *
 *   npx tsx --conditions=source scripts/bench/content-scale.ts --cases 100,500,1000
 *   … [--requests 300] [--loads 100] [--no-web] [--json <file>]
 *
 * For each N it writes N synthetic cases — the built-in cases cloned
 * round-robin with new ids and titles — into a fresh directory under the OS
 * temp dir (never the repository; removed afterwards), then measures:
 *
 * - index: cold build (`CaseIndexer`: stat + read + hash + build, bounded
 *   concurrency), warm re-stat (nothing changed), the serialised index size
 *   (raw / gzip: what a bundled or listed index costs), its JSON.parse time,
 *   and process memory after indexing (after a full GC);
 * - server (`clinicalcraft serve` on a free local port, only the synthetic
 *   directory): `GET /api/content/cases` listing latency p50/p95 for a mix of
 *   pages and filters — first request of each query, repeated (cached body)
 *   and revalidated (304) —, and the full case `GET /api/content/cases/:id`
 *   p50/p95 on first load (read + parse + validate + serialise), cached, and
 *   304; process memory after those loads;
 * - web (once, built-in content): a `vite build` of packages/web into a temp
 *   dir — the initial JS (entry + modulepreloads in index.html) and the
 *   per-case chunks.
 *
 * Each N runs in its own child process (same Node flags), so memory and
 * latency of one size are not inflated by the previous one. Prints Markdown
 * tables (machine description first). Numbers are what this run measured on
 * this machine; nothing is extrapolated.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { availableParallelism, cpus, platform, release, tmpdir, totalmem } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import v8 from "node:v8";
import vm from "node:vm";
import { gzipSync } from "node:zlib";
import { mergeSettings } from "@clinicalcraft/agent";
import { builtinContentDir, CaseIndexer } from "@clinicalcraft/agent/node";
import { startServer } from "@clinicalcraft/server";

const REPO = fileURLToPath(new URL("../../", import.meta.url));

/* ---- arguments ------------------------------------------------------ */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const SIZES = (arg("cases") ?? "100,500,1000")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n > 0);
const REQUESTS = Number(arg("requests") ?? 300);
const LOADS = Number(arg("loads") ?? 100);
const WEB = !process.argv.includes("--no-web");
const JSON_OUT = arg("json");
/** Internal: measure one size and print its result as JSON (see `runChild`). */
const CHILD = arg("child");

/* ---- helpers -------------------------------------------------------- */

v8.setFlagsFromString("--expose-gc");
const gc = vm.runInNewContext("gc") as () => void;

const MiB = 1024 * 1024;
const kib = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;
const mib = (bytes: number) => `${(bytes / MiB).toFixed(1)} MiB`;
const ms = (v: number) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
const gzipBytes = (data: string | Buffer) => gzipSync(data, { level: 9 }).length;

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? NaN;
}
const p50p95 = (values: number[]) => `${ms(percentile(values, 50))} / ${ms(percentile(values, 95))}`;

function memory() {
  gc();
  const m = process.memoryUsage();
  return { rss: m.rss, heapUsed: m.heapUsed };
}

async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t0 = performance.now();
  const value = await fn();
  return [value, performance.now() - t0];
}

/** A deterministic pseudo-random sequence (no Math.random: repeatable runs). */
function sequence(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---- synthetic content --------------------------------------------- */

async function builtinCases(): Promise<Record<string, unknown>[]> {
  const dir = builtinContentDir();
  if (!dir) throw new Error("the built-in content directory was not found");
  const folders = (await readdir(join(dir, "cases"), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  return Promise.all(folders.map(async (f) => JSON.parse(await readFile(join(dir, "cases", f, "case.json"), "utf8")) as Record<string, unknown>));
}

function retitle(title: unknown, n: number): unknown {
  if (typeof title === "string") return `${title} #${n}`;
  if (title && typeof title === "object") return Object.fromEntries(Object.entries(title).map(([k, v]) => [k, `${String(v)} #${n}`]));
  return `Case #${n}`;
}

/** Write `n` clones of the built-in cases (new ids and titles) under `root/cases/`; returns their ids. */
async function writeSynthetic(root: string, n: number, base: Record<string, unknown>[]): Promise<{ ids: string[]; bytes: number }> {
  const ids: string[] = [];
  let bytes = 0;
  for (let i = 0; i < n; i++) {
    const src = base[i % base.length]!;
    const id = `${String(src.id)}-synth-${String(i).padStart(5, "0")}`;
    const text = JSON.stringify({ ...src, id, title: retitle(src.title, i) }, null, 2);
    await mkdir(join(root, "cases", id), { recursive: true });
    await writeFile(join(root, "cases", id, "case.json"), text);
    ids.push(id);
    bytes += Buffer.byteLength(text);
  }
  return { ids, bytes };
}

/* ---- measurements --------------------------------------------------- */

interface ScaleResult {
  cases: number;
  contentBytes: number;
  indexColdMs: number;
  indexWarmMs: number;
  indexBytes: number;
  indexGzipBytes: number;
  indexParseMs: number;
  memoryBaseline: { rss: number; heapUsed: number };
  memoryAfterIndex: { rss: number; heapUsed: number };
  listingFirst: number[];
  listingCached: number[];
  listing304: number[];
  caseFirst: number[];
  caseCached: number[];
  case304: number[];
  memoryAfterLoads: { rss: number; heapUsed: number };
}

async function measure(n: number, base: Record<string, unknown>[]): Promise<ScaleResult> {
  const root = await mkdtemp(join(tmpdir(), "cc-content-scale-"));
  try {
    const { ids, bytes } = await writeSynthetic(root, n, base);
    const memoryBaseline = memory();

    // Index: cold build, then a re-stat with nothing changed.
    const indexer = new CaseIndexer({ dirs: [root] });
    const [snapshot, indexColdMs] = await timed(() => indexer.refresh());
    if (snapshot.entries.length !== n || snapshot.issues.length > 0) throw new Error(`index: ${snapshot.entries.length} entries, ${snapshot.issues.length} issues`);
    const [, indexWarmMs] = await timed(() => indexer.refresh());
    const serialized = JSON.stringify(snapshot.entries);
    const t0 = performance.now();
    JSON.parse(serialized);
    const indexParseMs = performance.now() - t0;
    const memoryAfterIndex = memory();

    // Server: only the synthetic directory, on a free port.
    const home = join(root, "home");
    const server = await startServer({
      port: 0,
      host: "127.0.0.1",
      settings: mergeSettings([{ source: "flag", settings: { locale: "en", transcripts: { enabled: false } } }]),
      staticDir: null,
      assetDirs: [],
      contentDirs: [root],
      builtinContent: false,
      env: { CLINICALCRAFT_HOME: home, HOME: home },
      log: () => undefined,
    });
    try {
      const get = async (path: string, etag?: string) => {
        const t = performance.now();
        const res = await fetch(new URL(path, server.url), etag ? { headers: { "if-none-match": etag } } : {});
        const body = await res.arrayBuffer();
        const elapsed = performance.now() - t;
        if (res.status !== 200 && res.status !== 304) throw new Error(`${path}: HTTP ${res.status} ${Buffer.from(body).toString("utf8").slice(0, 200)}`);
        return { elapsed, status: res.status, etag: res.headers.get("etag") ?? "" };
      };
      await get("api/content/cases?limit=1"); // warm up: the first request indexes

      // Listing: a deterministic mix of pages and filters.
      const rnd = sequence(n);
      const filters = ["", "&q=pain", "&q=%E8%83%B8%E7%97%9B", "&specialty=emergency-medicine", "&setting=emergency", "&locale=en", "&specialty=cardiology,neurology&setting=emergency"];
      const queries = Array.from({ length: REQUESTS }, (_, i) => {
        const limit = [20, 50, 200][i % 3]!;
        const offset = Math.floor(rnd() * Math.max(1, n - limit));
        return `api/content/cases?offset=${offset}&limit=${limit}${filters[i % filters.length]}`;
      });
      const unique = [...new Set(queries)];
      const listingFirst: number[] = [];
      const etags = new Map<string, string>();
      for (const q of unique) {
        const r = await get(q);
        listingFirst.push(r.elapsed);
        etags.set(q, r.etag);
      }
      const listingCached: number[] = [];
      const listing304: number[] = [];
      for (const q of unique) listingCached.push((await get(q)).elapsed);
      for (const q of unique) {
        const r = await get(q, etags.get(q));
        if (r.status !== 304) throw new Error(`${q}: expected 304, got ${r.status}`);
        listing304.push(r.elapsed);
      }

      // Full cases: first load (validation), cached, revalidated.
      const sample = Array.from({ length: Math.min(LOADS, ids.length) }, (_, i) => ids[Math.floor((i * ids.length) / Math.min(LOADS, ids.length))]!);
      const caseFirst: number[] = [];
      const caseCached: number[] = [];
      const case304: number[] = [];
      const caseEtags = new Map<string, string>();
      for (const id of sample) {
        const r = await get(`api/content/cases/${id}`);
        caseFirst.push(r.elapsed);
        caseEtags.set(id, r.etag);
      }
      for (const id of sample) caseCached.push((await get(`api/content/cases/${id}`)).elapsed);
      for (const id of sample) {
        const r = await get(`api/content/cases/${id}`, caseEtags.get(id));
        if (r.status !== 304) throw new Error(`${id}: expected 304, got ${r.status}`);
        case304.push(r.elapsed);
      }
      const memoryAfterLoads = memory();
      return {
        cases: n,
        contentBytes: bytes,
        indexColdMs,
        indexWarmMs,
        indexBytes: Buffer.byteLength(serialized),
        indexGzipBytes: gzipBytes(serialized),
        indexParseMs,
        memoryBaseline,
        memoryAfterIndex,
        listingFirst,
        listingCached,
        listing304,
        caseFirst,
        caseCached,
        case304,
        memoryAfterLoads,
      };
    } finally {
      await server.close();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

interface WebResult {
  initial: { file: string; bytes: number; gzip: number }[];
  cases: { file: string; bytes: number; gzip: number }[];
  indexBytes: number;
  indexGzip: number;
}

/** `vite build` of packages/web into a temp dir: initial JS and per-case chunk sizes. */
async function measureWeb(): Promise<WebResult> {
  const out = await mkdtemp(join(tmpdir(), "cc-web-build-"));
  try {
    const webDir = join(REPO, "packages/web");
    const { build } = await import("vite");
    await build({ root: webDir, configFile: join(webDir, "vite.config.ts"), logLevel: "warn", build: { outDir: out, emptyOutDir: true } });
    const html = await readFile(join(out, "index.html"), "utf8");
    const refs = [...html.matchAll(/<script[^>]+type="module"[^>]+src="\.\/([^"]+)"/g), ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="\.\/([^"]+)"/g)].map((m) => m[1]!);
    const size = async (file: string) => {
      const buf = await readFile(join(out, file));
      return { file: file.replace(/^assets\//, ""), bytes: buf.length, gzip: gzipBytes(buf) };
    };
    const initial = await Promise.all(refs.map(size));
    const assets = await readdir(join(out, "assets"));
    const cases = await Promise.all(assets.filter((f) => /^case-.*\.js$/.test(f)).map((f) => size(`assets/${f}`)));
    // The bundled index itself (built-in content), as the plugin serialises it.
    const { caseIndexModule } = await import("../../packages/web/src/build/case-index-plugin.js");
    const module = await caseIndexModule(join(REPO, "packages/content"));
    const indexJson = /export const CASE_INDEX = (.*);\n/.exec(module.code)?.[1] ?? "";
    return { initial, cases: cases.sort((a, b) => a.bytes - b.bytes), indexBytes: Buffer.byteLength(indexJson), indexGzip: gzipBytes(indexJson) };
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}

/* ---- report --------------------------------------------------------- */

function machine(): string {
  const cpu = cpus()[0]?.model.trim() ?? "unknown CPU";
  return `${cpu} · nproc ${availableParallelism()} · ${(totalmem() / 1024 ** 3).toFixed(1)} GiB RAM · Node ${process.version} · ${platform()} ${release()}`;
}

/** Measure one size in a fresh process (same Node flags: the tsx loader and `--conditions=source`). */
function runChild(n: number): Promise<ScaleResult> {
  return new Promise((resolve, reject) => {
    const script = fileURLToPath(import.meta.url);
    const child = spawn(process.execPath, [...process.execArgv, script, "--child", String(n), "--requests", String(REQUESTS), "--loads", String(LOADS)], { stdio: ["ignore", "pipe", "inherit"] });
    let out = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => (out += d));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) return reject(new Error(`the ${n}-case run exited with ${code}`));
      try {
        resolve(JSON.parse(out) as ScaleResult);
      } catch (err) {
        reject(err as Error);
      }
    });
  });
}

async function main(): Promise<void> {
  if (CHILD !== undefined) {
    process.stdout.write(JSON.stringify(await measure(Number(CHILD), await builtinCases())));
    return;
  }
  if (SIZES.length === 0) throw new Error("--cases needs a list such as 100,500,1000");
  const base = await builtinCases();
  const results: ScaleResult[] = [];
  for (const n of SIZES) {
    process.stderr.write(`[content-scale] ${n} cases…\n`);
    results.push(await runChild(n));
  }
  const web = WEB ? (process.stderr.write("[content-scale] vite build…\n"), await measureWeb()) : null;

  const lines: string[] = [];
  lines.push(`Machine: ${machine()}. Synthetic cases = the ${base.length} built-in cases cloned round-robin (new ids/titles), pretty-printed JSON; one fresh process per size.`, "");
  lines.push("| cases | case files | index: cold build | index: re-stat, unchanged | index JSON raw / gzip | JSON.parse(index) | rss / heapUsed after indexing (baseline) |");
  lines.push("|---:|---:|---:|---:|---:|---:|---|");
  for (const r of results) {
    lines.push(
      `| ${r.cases} | ${mib(r.contentBytes)} | ${ms(r.indexColdMs)} ms | ${ms(r.indexWarmMs)} ms | ${kib(r.indexBytes)} / ${kib(r.indexGzipBytes)} | ${ms(r.indexParseMs)} ms | ${mib(r.memoryAfterIndex.rss)} / ${mib(r.memoryAfterIndex.heapUsed)} (${mib(r.memoryBaseline.rss)} / ${mib(r.memoryBaseline.heapUsed)}) |`,
    );
  }
  lines.push("");
  lines.push("Server (`clinicalcraft serve` on a local port, HTTP keep-alive, sequential requests; p50 / p95 in ms):", "");
  lines.push("| cases | listing: first request of a query (n) | listing: repeated | listing: 304 | full case: first load (read + validate) (n) | full case: cached | full case: 304 | rss / heapUsed after the loads |");
  lines.push("|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const r of results) {
    lines.push(
      `| ${r.cases} | ${p50p95(r.listingFirst)} (${r.listingFirst.length}) | ${p50p95(r.listingCached)} | ${p50p95(r.listing304)} | ${p50p95(r.caseFirst)} (${r.caseFirst.length}) | ${p50p95(r.caseCached)} | ${p50p95(r.case304)} | ${mib(r.memoryAfterLoads.rss)} / ${mib(r.memoryAfterLoads.heapUsed)} |`,
    );
  }
  if (web) {
    const sum = (list: { bytes: number }[]) => list.reduce((a, b) => a + b.bytes, 0);
    const sumGz = (list: { gzip: number }[]) => list.reduce((a, b) => a + b.gzip, 0);
    const median = web.cases[Math.floor((web.cases.length - 1) / 2)];
    lines.push("", "Web (`vite build`, built-in content):", "");
    lines.push("| initial JS (entry + modulepreload) raw / gzip | files | per-case chunks: count | smallest / median / largest raw (gzip) | all case chunks raw / gzip | bundled index JSON raw / gzip |");
    lines.push("|---:|---|---:|---|---:|---:|");
    lines.push(
      `| ${kib(sum(web.initial))} / ${kib(sumGz(web.initial))} | ${web.initial.map((f) => `${f.file.replace(/-[A-Za-z0-9_-]{8}\.js$/, ".js")} ${kib(f.bytes)}`).join(", ")} | ${web.cases.length} | ${web.cases.length ? `${kib(web.cases[0]!.bytes)} (${kib(web.cases[0]!.gzip)}) / ${kib(median!.bytes)} (${kib(median!.gzip)}) / ${kib(web.cases.at(-1)!.bytes)} (${kib(web.cases.at(-1)!.gzip)})` : "-"} | ${kib(sum(web.cases))} / ${kib(sumGz(web.cases))} | ${kib(web.indexBytes)} / ${kib(web.indexGzip)} |`,
    );
  }
  process.stdout.write(`${lines.join("\n")}\n`);
  if (JSON_OUT) await writeFile(JSON_OUT, JSON.stringify({ machine: machine(), results, web }, null, 2));
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
