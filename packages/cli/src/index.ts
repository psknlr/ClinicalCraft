/**
 * @clinicalcraft/cli — the `clinicalcraft` command-line front-end
 * (docs/PROTOCOL.md §11). `main(argv)` is the programmatic entry point; the
 * pieces (argv parser, renderer, ZIP reader, V4 importer…) are exported for
 * tests and embedding.
 */
export { main, resolveCommand, type ResolvedCommand } from "./main.js";
export { editDistance, flagBool, flagList, flagNumber, flagString, lookupFlag, parseArgs, suggest, UsageError, type FlagSpec, type FlagType, type Localized, type ParsedArgs } from "./argv.js";
export { ROOT as COMMAND_TREE, findChild, type CommandRun, type CommandSpec } from "./commands.js";
export { CliError, createContext, EXIT, type CliContext, type CliIO } from "./context.js";
export { colorEnabled, createPalette, stripAnsi, type Palette } from "./ansi.js";
export { EventRenderer, clockLabel, summarizeArgs, truncate } from "./render.js";
export { autoAnswerApprovals, HEADLESS_DENY_REASON, parseOpLine, RunTracker, type ExecResult, type ResultSubtype } from "./exec.js";
export { completeLine, parseApprovalAnswer, Repl } from "./repl.js";
export { checkUtterances, validateCaseFile, verifyCaseDefinition, type CaseVerification, type FileValidation } from "./cases.js";
export { caseTemplate, readmeTemplate } from "./scaffold.js";
export { crc32, listZip, readZipEntry, ZipError, type ZipEntry } from "./zip.js";
export { classifyName, collectInputs, decodeBase64, extractCaseDataJson, importV4, joinParts, V4_CASE_ID, V4_SHA256, type ImportResult } from "./import-v4.js";
export { evalMarkdown, type EvalReport, type EvalRun } from "./eval.js";
export { m, type MsgKey } from "./i18n.js";
export { cliVersion } from "./paths.js";
