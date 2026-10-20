/**
 * CLINICALCRAFT.md memory assembly (Claude Code CLAUDE.md semantics):
 *
 *   - HTML comments (`<!-- … -->`) are stripped;
 *   - `@path/to/file.md` imports — a line that is only `@path` is replaced by
 *     the imported file; inline `@path` tokens keep the line and the imported
 *     file follows it. Inline tokens must look like files (contain `/` or a
 *     file extension) so that `@nurse` addressing in prose is not an import.
 *     Imports inside code spans / fenced code blocks are ignored;
 *   - at most 4 import hops, cycles and repeated files are skipped;
 *   - the result is capped at 32 KiB (UTF-8) with a truncation marker.
 *
 * Isomorphic: file access is injected through `resolveImport`.
 */

/** A memory file (already read). */
export interface MemoryFile {
  path: string;
  text: string;
}

/**
 * Resolve an import token relative to the importing file. Return null when
 * the file does not exist / is not allowed.
 */
export type ResolveImport = (importPath: string, fromPath: string) => MemoryFile | null;

/** Maximum import depth (hops from a top-level memory file). */
export const MEMORY_MAX_IMPORT_DEPTH = 4;
/** Total size cap in bytes. */
export const MEMORY_MAX_BYTES = 32 * 1024;
/** Marker appended when the cap truncates memory. */
export const MEMORY_TRUNCATION_MARKER = "\n\n[… memory truncated: 32 KiB limit reached …]";

const LINE_IMPORT = /^\s*@(\S+)\s*$/;
const INLINE_IMPORT = /(^|\s)@([^\s`'"<>()[\]{}]+)/g;

/** Remove HTML comments (multi-line), leaving code blocks untouched. */
export function stripHtmlComments(text: string): string {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let inFence = false;
  let inComment = false;
  for (const line of lines) {
    if (!inComment && /^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    let rest = line;
    let kept = "";
    while (rest.length > 0) {
      if (inComment) {
        const end = rest.indexOf("-->");
        if (end === -1) {
          rest = "";
        } else {
          rest = rest.slice(end + 3);
          inComment = false;
        }
      } else {
        const start = rest.indexOf("<!--");
        if (start === -1) {
          kept += rest;
          rest = "";
        } else {
          kept += rest.slice(0, start);
          rest = rest.slice(start + 4);
          inComment = true;
        }
      }
    }
    // Drop lines that only held a comment.
    if (kept.trim() === "" && line.trim() !== "") continue;
    out.push(kept);
  }
  return out.join("\n");
}

function looksLikeFile(token: string): boolean {
  return token.includes("/") || /\.[A-Za-z0-9]{1,8}$/.test(token);
}

function stripCodeSpans(line: string): string {
  return line.replace(/`[^`]*`/g, (m) => " ".repeat(m.length));
}

interface Ctx {
  resolve: ResolveImport;
  seen: Set<string>;
}

function expand(file: MemoryFile, depth: number, chain: string[], ctx: Ctx): string {
  const text = stripHtmlComments(file.text);
  const lines = text.split("\n");
  const out: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence || depth >= MEMORY_MAX_IMPORT_DEPTH) {
      out.push(line);
      continue;
    }
    const whole = LINE_IMPORT.exec(line);
    if (whole && looksLikeFile(whole[1]!)) {
      const imported = importFile(whole[1]!, file.path, depth, chain, ctx);
      if (imported !== null) {
        if (imported) out.push(imported);
        continue;
      }
      out.push(line);
      continue;
    }
    out.push(line);
    const scan = stripCodeSpans(line);
    INLINE_IMPORT.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = INLINE_IMPORT.exec(scan)) !== null) {
      const token = m[2]!.replace(/[.,;:!?)]+$/, "");
      if (!looksLikeFile(token)) continue;
      const imported = importFile(token, file.path, depth, chain, ctx);
      if (imported) out.push(imported);
    }
  }
  return out.join("\n");
}

/** Returns the expanded text, "" when skipped (cycle / duplicate), or null when unresolved. */
function importFile(token: string, fromPath: string, depth: number, chain: string[], ctx: Ctx): string | null {
  let resolved: MemoryFile | null;
  try {
    resolved = ctx.resolve(token, fromPath);
  } catch {
    resolved = null;
  }
  if (!resolved) return null;
  if (chain.includes(resolved.path) || ctx.seen.has(resolved.path)) return "";
  ctx.seen.add(resolved.path);
  return expand(resolved, depth + 1, [...chain, resolved.path], ctx).trim();
}

const encoder = new TextEncoder();

/** UTF-8 byte length. */
export function byteLength(text: string): number {
  return encoder.encode(text).length;
}

/** Truncate to at most `maxBytes` UTF-8 bytes (never splitting a code point). */
export function truncateBytes(text: string, maxBytes: number): string {
  if (byteLength(text) <= maxBytes) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (byteLength(text.slice(0, mid)) <= maxBytes) lo = mid;
    else hi = mid - 1;
  }
  let cut = lo;
  // Avoid splitting a surrogate pair.
  const code = text.charCodeAt(cut - 1);
  if (code >= 0xd800 && code <= 0xdbff) cut -= 1;
  return text.slice(0, cut);
}

/**
 * Assemble memory files (root-first order) into one prompt section. Each
 * top-level file is introduced with `Contents of <path>:`. Never throws.
 */
export function assembleMemory(files: readonly MemoryFile[], resolveImport: ResolveImport = () => null, maxBytes = MEMORY_MAX_BYTES): string {
  const ctx: Ctx = { resolve: resolveImport, seen: new Set() };
  const sections: string[] = [];
  for (const file of files) {
    if (ctx.seen.has(file.path)) continue;
    ctx.seen.add(file.path);
    const body = expand(file, 0, [file.path], ctx).trim();
    if (!body) continue;
    sections.push(`Contents of ${file.path}:\n\n${body}`);
  }
  const text = sections.join("\n\n");
  if (byteLength(text) <= maxBytes) return text;
  return truncateBytes(text, maxBytes - byteLength(MEMORY_TRUNCATION_MARKER)).trimEnd() + MEMORY_TRUNCATION_MARKER;
}
