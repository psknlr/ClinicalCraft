/**
 * Command hook executor: `sh -c <command>` with the HookInput JSON on stdin,
 * cwd = project dir, env `CLINICALCRAFT_PROJECT_DIR`, a timeout and
 * AbortSignal support (the hook's process group gets SIGTERM, then SIGKILL
 * after 2 s; the promise resolves immediately). The result is settled by the
 * hook's own exit status even when a background child keeps the pipes open.
 * Output is capped at 1 MiB per stream. Never rejects: spawn failures resolve
 * with exit code 127.
 */
import { spawn } from "node:child_process";
import { constants } from "node:os";
import type { CommandHookExecutor, HookInput } from "../hooks/types.js";

const MAX_OUTPUT = 1024 * 1024;
/**
 * After the hook process exits, wait this long for its remaining output. A
 * background child that inherited stdout/stderr can keep the pipes open
 * indefinitely; the hook's own exit status (e.g. 2 = block) must still count.
 */
const EXIT_GRACE_MS = 150;
/** Exit code reported when a hook times out. */
export const HOOK_TIMEOUT_EXIT_CODE = 124;
/** Exit code reported when a hook is aborted. */
export const HOOK_ABORT_EXIT_CODE = 130;

export interface CommandHookExecutorOptions {
  /** Extra environment for hook processes. */
  env?: Record<string, string | undefined>;
  /** Shell binary (default "sh"). */
  shell?: string;
}

/** Create the node `CommandHookExecutor` for a project directory. */
export function createCommandHookExecutor(cwd: string = process.cwd(), options: CommandHookExecutorOptions = {}): CommandHookExecutor {
  return {
    run(command: string, input: HookInput, timeoutSeconds: number, signal?: AbortSignal) {
      return new Promise((resolvePromise) => {
        if (signal?.aborted) {
          resolvePromise({ exitCode: HOOK_ABORT_EXIT_CODE, stdout: "", stderr: "hook aborted" });
          return;
        }
        let stdout = "";
        let stderr = "";
        let settled = false;

        const posix = process.platform !== "win32";
        const child = spawn(options.shell ?? "sh", ["-c", command], {
          cwd,
          env: { ...process.env, ...(options.env ?? {}), CLINICALCRAFT_PROJECT_DIR: cwd },
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
          // Own process group so a timeout kills the whole pipeline (sh + children).
          detached: posix,
        });

        let grace: ReturnType<typeof setTimeout> | undefined;
        const finish = (exitCode: number, extraErr?: string) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (grace) clearTimeout(grace);
          signal?.removeEventListener("abort", onAbort);
          resolvePromise({ exitCode, stdout, stderr: extraErr ? `${stderr}${stderr && !stderr.endsWith("\n") ? "\n" : ""}${extraErr}` : stderr });
        };
        const killTree = (sig: NodeJS.Signals) => {
          try {
            if (posix && child.pid) process.kill(-child.pid, sig);
            else child.kill(sig);
          } catch {
            /* already gone */
          }
        };
        const terminate = (code: number, message: string) => {
          killTree("SIGTERM");
          const hard = setTimeout(() => killTree("SIGKILL"), 2000);
          hard.unref?.();
          child.once("exit", () => clearTimeout(hard));
          child.stdout.destroy();
          child.stderr.destroy();
          finish(code, message);
        };
        const timer = setTimeout(
          () => terminate(HOOK_TIMEOUT_EXIT_CODE, `hook timed out after ${timeoutSeconds}s`),
          Math.max(1, timeoutSeconds) * 1000,
        );
        const onAbort = () => terminate(HOOK_ABORT_EXIT_CODE, "hook aborted");
        signal?.addEventListener("abort", onAbort, { once: true });

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
          if (stdout.length < MAX_OUTPUT) stdout += chunk.slice(0, MAX_OUTPUT - stdout.length);
        });
        child.stderr.on("data", (chunk: string) => {
          if (stderr.length < MAX_OUTPUT) stderr += chunk.slice(0, MAX_OUTPUT - stderr.length);
        });
        const statusOf = (code: number | null, sig: NodeJS.Signals | null) => code ?? (sig ? 128 + (constants.signals[sig] ?? 15) : 1);
        child.on("error", (err) => finish(127, `failed to start hook: ${err.message}`));
        child.on("exit", (code, sig) => {
          if (settled) return;
          grace = setTimeout(() => {
            child.stdout.destroy();
            child.stderr.destroy();
            finish(statusOf(code, sig));
          }, EXIT_GRACE_MS);
        });
        child.on("close", (code, sig) => finish(statusOf(code, sig)));
        // The hook may exit without reading stdin (EPIPE) — ignore.
        child.stdin.on("error", () => undefined);
        child.stdin.end(`${JSON.stringify(input)}\n`);
      });
    },
  };
}
