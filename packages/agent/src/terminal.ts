/**
 * Terminal safety for untrusted text (model output, case content, provider
 * errors, file names, settings values) written to a terminal or to stderr
 * diagnostics (CLI, MCP server logs). Isomorphic.
 */

/**
 * Escape sequences and control characters a terminal would act on: CSI (7-bit
 * and 8-bit), OSC/DCS/SOS/PM/APC strings up to BEL or ST (or the end of the
 * text — a stream chunk may cut one), other ESC sequences (`ESC c`, `ESC 7`,
 * `ESC ( B`…), then any lone C0 control except newline and tab, DEL and C1.
 * Group 1 captures a 7-bit CSI (so SGR colour codes can be told apart).
 */
const TERMINAL_UNSAFE_RE =
  /(\u001b\[[0-?]*[ -/]*[@-~])|\u009b[0-?]*[ -/]*[@-~]|\u001b[\]PX^_][\s\S]*?(?:\u0007|\u001b\\|\u009c|$)|[\u0090\u0098\u009d\u009e\u009f][\s\S]*?(?:\u0007|\u001b\\|\u009c|$)|\u001b[ -/]*[0-~]|[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g;
const HAS_UNSAFE_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/;
const SGR_RE = /^\u001b\[[0-9;]*m$/;

/**
 * Make untrusted text safe to write to a terminal: removes C0/C1 control
 * characters and whole ANSI escape sequences (clipboard writes, cursor
 * movement, hyperlinks, title changes, colours…), keeping `\n` and `\t`
 * (`\r\n` becomes `\n`). Apply it before adding your own colour codes.
 * `keepColors` keeps SGR colour sequences (`ESC [ … m`) and strips the rest —
 * only for text that already carries the front-end's own palette codes,
 * never for third-party text (which could then recolour or hide output).
 */
export function sanitizeTerminal(text: string, options: { keepColors?: boolean } = {}): string {
  if (!HAS_UNSAFE_RE.test(text)) return text;
  return text.replace(/\r\n/g, "\n").replace(TERMINAL_UNSAFE_RE, (match: string, csi: string | undefined) => (options.keepColors && csi && SGR_RE.test(match) ? match : ""));
}
