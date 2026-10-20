/**
 * The environment a benchmark ran in (reports and the demonstration are
 * stamped with it): the git commit of the working tree (and whether it had
 * uncommitted changes), Node, platform, CPUs and memory.
 */
import { execFileSync } from "node:child_process";
import { arch, cpus, platform, release, totalmem } from "node:os";

export interface BenchEnvironment {
  /** `git rev-parse HEAD` (null outside a git checkout). */
  commit: string | null;
  /** Uncommitted changes in the working tree (`git status --porcelain` not empty). */
  dirty: boolean | null;
  node: string;
  platform: string;
  arch: string;
  cpus: number;
  cpuModel: string | null;
  memoryGiB: number;
  clinicalcraft: string;
}

function git(args: string[], cwd: string): string | null {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).trim();
  } catch {
    return null;
  }
}

/** Collect the environment (`cwd`: a directory inside the checkout). */
export function benchEnvironment(cwd: string, version: string): BenchEnvironment {
  const commit = git(["rev-parse", "HEAD"], cwd);
  const status = commit ? git(["status", "--porcelain"], cwd) : null;
  const list = cpus();
  return {
    commit,
    dirty: status === null ? null : status.length > 0,
    node: process.version,
    platform: `${platform()} ${release()}`,
    arch: arch(),
    cpus: list.length,
    cpuModel: list[0]?.model?.trim() || null,
    memoryGiB: Math.round((totalmem() / 1024 ** 3) * 10) / 10,
    clinicalcraft: version,
  };
}

/** "abc1234" (+ " (dirty)") — short form for headers. */
export function commitLabel(env: Pick<BenchEnvironment, "commit" | "dirty">, dirtyLabel = "dirty"): string {
  if (!env.commit) return "unknown";
  return `${env.commit.slice(0, 12)}${env.dirty ? ` (${dirtyLabel})` : ""}`;
}
