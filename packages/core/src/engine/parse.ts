/**
 * Validation & loading: zod parsing with readable issues, plus content
 * warnings (non-canonical capabilities, missing translations).
 */
import { z, type ZodError, type ZodIssue, type ZodTypeAny } from "zod";
import { CaseSchema, type CaseDefinition } from "../schema/case.js";
import { CAPABILITIES, CapabilitySchema, LocalizedListSchema, LocalizedTextSchema } from "../schema/common.js";
import { EquipmentCatalogSchema, FacilitySchema, type EquipmentCatalog, type FacilityDefinition } from "../schema/facility.js";
import type { Issue, ParseResult } from "./types.js";

type PathPart = string | number;

/** Dot-joined issue path (`objectives.0.completeWhen.all.1.asked`); "" = document root. */
export function formatPath(path: readonly PathPart[]): string {
  return path.map(String).join(".");
}

/* ------------------------------------------------------------------ */
/* Zod error → Issue[]                                                 */
/* ------------------------------------------------------------------ */

function valueAt(root: unknown, path: readonly PathPart[]): unknown {
  let node: unknown = root;
  for (const key of path) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<PathPart, unknown>)[key];
  }
  return node;
}

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") {
    const keys = Object.keys(value as object);
    return keys.length ? `object with keys {${keys.join(", ")}}` : "empty object";
  }
  return typeof value;
}

/** True when a branch issue shows the input does not have that union variant's shape at all. */
function isShapeMismatch(issue: ZodIssue, depth: number): boolean {
  if (issue.path.length > depth + 1) return false;
  if (issue.code === "unrecognized_keys" || issue.code === "invalid_union_discriminator") return true;
  if (issue.code === "invalid_literal") return true;
  if (issue.code === "invalid_type") return issue.path.length === depth || issue.received === "undefined";
  if (issue.code === "invalid_union") return issue.path.length === depth;
  return false;
}

function unionIssues(issue: ZodIssue & { code: "invalid_union" }, root: unknown): Issue[] {
  const depth = issue.path.length;
  const viable = issue.unionErrors.filter((e) => !e.issues.some((i) => isShapeMismatch(i, depth)));
  if (viable.length > 0) {
    const best = viable.reduce((a, b) => (b.issues.length < a.issues.length ? b : a));
    return best.issues.flatMap((i) => zodIssueToIssues(i, root));
  }
  const expected = issue.unionErrors.flatMap((e) =>
    e.issues.filter((i): i is ZodIssue & { code: "invalid_type" } => i.code === "invalid_type" && i.path.length === depth).map((i) => i.expected),
  );
  const value = valueAt(root, issue.path);
  const message = expected.length
    ? `expected ${[...new Set(expected)].join(" or ")}, received ${describeValue(value)}`
    : `no allowed form matches ${describeValue(value)}`;
  return [{ path: formatPath(issue.path), message, severity: "error" }];
}

function zodIssueToIssues(issue: ZodIssue, root: unknown): Issue[] {
  if (issue.code === "invalid_union") return unionIssues(issue, root);
  return [{ path: formatPath(issue.path), message: issue.message, severity: "error" }];
}

/** Convert a zod error into issues (union errors resolved to the most plausible variant). */
export function issuesFromZodError(error: ZodError, root: unknown): Issue[] {
  const seen = new Set<string>();
  const out: Issue[] = [];
  for (const issue of error.issues.flatMap((i) => zodIssueToIssues(i, root))) {
    const key = `${issue.path}\u0000${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Schema-guided content warnings                                      */
/* ------------------------------------------------------------------ */

interface Visitor {
  text(value: unknown, path: PathPart[]): void;
  list(value: unknown, path: PathPart[]): void;
  capability(value: unknown, path: PathPart[]): void;
}

/** Inner schema of wrappers that do not change the data shape. */
function unwrap(schema: ZodTypeAny): ZodTypeAny {
  let current = schema;
  for (;;) {
    if (current instanceof z.ZodOptional || current instanceof z.ZodNullable || current instanceof z.ZodDefault) {
      current = current._def.innerType;
    } else if (current instanceof z.ZodEffects) {
      current = current._def.schema;
    } else {
      return current;
    }
  }
}

/**
 * Walk parsed data alongside its schema and report every LocalizedText,
 * LocalizedList and capability value (identified by schema identity).
 * Lazy (recursive condition) schemas are skipped: conditions carry no text.
 */
function walk(schema: ZodTypeAny, value: unknown, path: PathPart[], visitor: Visitor): void {
  if (value === undefined) return;
  if (schema === LocalizedTextSchema) return visitor.text(value, path);
  if (schema === LocalizedListSchema) return visitor.list(value, path);
  if (schema === CapabilitySchema) return visitor.capability(value, path);
  const inner = unwrap(schema);
  if (inner !== schema) return walk(inner, value, path, visitor);
  if (schema instanceof z.ZodObject && value && typeof value === "object") {
    const shape = schema.shape as Record<string, ZodTypeAny>;
    for (const [key, child] of Object.entries(shape)) walk(child, (value as Record<string, unknown>)[key], [...path, key], visitor);
  } else if (schema instanceof z.ZodArray && Array.isArray(value)) {
    value.forEach((item, i) => walk(schema.element as ZodTypeAny, item, [...path, i], visitor));
  } else if (schema instanceof z.ZodRecord && value && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) walk(schema.valueSchema as ZodTypeAny, item, [...path, key], visitor);
  } else if (schema instanceof z.ZodTuple && Array.isArray(value)) {
    (schema.items as ZodTypeAny[]).forEach((item, i) => walk(item, value[i], [...path, i], visitor));
  }
}

function localeRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Locales used by any per-locale text/list in a document. */
function usedLocales(schema: ZodTypeAny, value: unknown): string[] {
  const locales = new Set<string>();
  const collect = (v: unknown) => Object.keys(localeRecord(v) ?? {}).forEach((l) => locales.add(l));
  walk(schema, value, [], { text: collect, list: collect, capability: () => undefined });
  return [...locales];
}

/**
 * Content warnings: per-locale texts/lists missing one of `locales`, and
 * capability strings outside the canonical `CAPABILITIES` vocabulary.
 */
export function contentWarnings(schema: ZodTypeAny, value: unknown, locales: readonly string[]): Issue[] {
  const issues: Issue[] = [];
  const checkLocales = (kind: string) => (v: unknown, path: PathPart[]) => {
    const record = localeRecord(v);
    if (!record) return;
    for (const locale of locales) {
      if (record[locale] == null || record[locale] === "") {
        issues.push({ path: formatPath(path), message: `${kind} is missing the "${locale}" translation`, severity: "warning" });
      }
    }
  };
  walk(schema, value, [], {
    text: checkLocales("text"),
    list: checkLocales("list"),
    capability: (v, path) => {
      if (typeof v === "string" && !(v in CAPABILITIES)) {
        issues.push({ path: formatPath(path), message: `non-canonical capability "${v}" (see CAPABILITIES)`, severity: "warning" });
      }
    },
  });
  return issues;
}

/* ------------------------------------------------------------------ */
/* Public parsers                                                      */
/* ------------------------------------------------------------------ */

function parseWith<T>(schema: ZodTypeAny, json: unknown, locales: (value: T) => readonly string[]): ParseResult<T> {
  const result = schema.safeParse(json);
  if (!result.success) return { ok: false, issues: issuesFromZodError(result.error, json) };
  const value = result.data as T;
  return { ok: true, value, warnings: contentWarnings(schema, value, locales(value)) };
}

/** Parse and validate a case (`clinicalcraft/case@1`). Warnings cover missing translations of `locales` and non-canonical capabilities. */
export function parseCase(json: unknown): ParseResult<CaseDefinition> {
  return parseWith<CaseDefinition>(CaseSchema, json, (c) => c.locales);
}

/** Parse and validate a facility (`clinicalcraft/facility@1`). Missing translations are judged against every locale the document uses. */
export function parseFacility(json: unknown): ParseResult<FacilityDefinition> {
  return parseWith<FacilityDefinition>(FacilitySchema, json, (f) => usedLocales(FacilitySchema, f));
}

/** Parse and validate an equipment catalog (`clinicalcraft/equipment-catalog@1`). */
export function parseCatalog(json: unknown): ParseResult<EquipmentCatalog> {
  return parseWith<EquipmentCatalog>(EquipmentCatalogSchema, json, (c) => usedLocales(EquipmentCatalogSchema, c));
}
