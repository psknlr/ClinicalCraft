/**
 * World tools (embodied mode only, docs/EMBODIED.md §4–§5, §8–§9): perception
 * (read-only, never need approval), navigation and device operations through
 * the world's action bus (side effect `world`), delegation to staff, skills
 * and camera frames.
 *
 * One path to a clinical effect (EMBODIED R3): an operation with a clinical
 * effect (`interact_object` on an ECG cart's `record`, a monitor's `attach`,
 * a workstation's `order`…) runs the clinical tool through the caller's own
 * tool path — hooks, precheck, the approval gate, deny rules — exactly as if
 * the caller had called the clinical tool; a world tool is never a way
 * around a deny rule. Navigation and operation durations charge simulated
 * time (`ClinicalPort.elapse`, EMBODIED R8).
 *
 * Outputs are concise and localised; `data` carries the observation, the
 * inspection or the `WorldActionResult` (with `hint` when a failure can be
 * fixed by walking).
 */
import type { ActorId, CameraSensor, EntityKind, EntityQuery, NavGoal, WorldActionRequest, WorldActionResult, WorldRuntime } from "@clinicalcraft/world";
import { goalProblem } from "@clinicalcraft/world";
import type { PracticeScope } from "../protocol.js";
import { rt } from "../session/i18n.js";
import { strArg } from "./clinical.js";
import type { ToolContext, ToolDefinition, ToolOutput } from "./types.js";
import { actionResultText, entitiesText, inspectionText, nameOf, observationText, roomText, whereText } from "./world-format.js";

/** A world action request as a tool builds it (the host assigns the action id and the acting body). */
export type WorldRequestInput = Omit<WorldActionRequest, "actionId" | "actorId"> & { actorId?: ActorId; actionId?: string };

/** What the world tools need from the embodied session. */
export interface WorldToolHost {
  /** The encounter's world. */
  world(): WorldRuntime;
  /** The body acting for a call (`ctx.actorId`, else the learner's avatar). */
  actorOf(ctx: ToolContext): ActorId;
  /** Resolve a target: an entity id, an unprefixed alias, `patient`, `patient-monitor` (null when unknown). */
  resolve(target: string, actorId: ActorId): string | null;
  /** Run a world action for this call's caller (a clinical effect runs through the caller's tool path). */
  act(ctx: ToolContext, request: WorldRequestInput): Promise<WorldActionResult>;
  /** The session clock, for "where am I". */
  clockText(): string;
  /** `delegate_task`. */
  delegate(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolOutput>;
  /** `execute_skill`. */
  executeSkill(ctx: ToolContext, args: Record<string, unknown>): Promise<ToolOutput>;
  /** Safety class of a skill (risk of `execute_skill`). */
  skillSafety(args: Record<string, unknown>): "read-only" | "physical" | "clinical" | "high-risk" | null;
  /** Camera frames (browser runtime only). */
  camera(): CameraSensor | null;
}

const ENTITY_KINDS: readonly EntityKind[] = ["patient", "staff", "actor", "equipment", "door", "room", "level", "connector", "item"];

/** Names of every world tool. */
export const WORLD_TOOL_NAMES = [
  "observe_world",
  "get_agent_state",
  "find_entities",
  "find_objects",
  "inspect_object",
  "get_nearby_objects",
  "get_visible_objects",
  "get_room_info",
  "get_action_feedback",
  "navigate_to",
  "approach_object",
  "look_at",
  "interact_object",
  "cancel_action",
  "delegate_task",
  "execute_skill",
  "get_camera_frame",
] as const;

/** World tools that only read (never need approval, may run in parallel). */
export const WORLD_READ_ONLY_TOOLS: readonly string[] = ["observe_world", "get_agent_state", "find_entities", "find_objects", "inspect_object", "get_nearby_objects", "get_visible_objects", "get_room_info", "get_action_feedback", "get_camera_frame"];

/** Tasks staff can be delegated (`delegate_task`). */
export const DELEGATION_TASKS = ["attach_monitor", "record_ecg", "obtain_iv_access", "fetch_equipment", "give_intervention"] as const;

const GOAL_SCHEMA = {
  type: "object",
  description: 'A navigation goal: {kind:"interact", id} (best interaction point), {kind:"entity", id, range}, {kind:"room", id}, {kind:"point", x, z, level?}, {kind:"look", id, range}, {kind:"follow", id}, {kind:"any", goals}. A refusal\'s hint.goal can be passed as is.',
} as const;

const TARGET = { type: "string", minLength: 1, maxLength: 120, description: 'Entity id ("eq:resus1-ecg", "patient:resus-1", "room:ed-resus"), an unprefixed id, "patient" or "patient-monitor".' } as const;

/** Static description of a world tool (MCP lists these). */
export interface WorldToolSpec {
  name: (typeof WORLD_TOOL_NAMES)[number];
  description: string;
  inputSchema: Record<string, unknown>;
  /** Practice scope (default `history-only`: available in every scope). */
  scope?: PracticeScope;
}

type Spec = WorldToolSpec;

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: false });

/** Static specs (names, descriptions, schemas) of the world tools — the MCP server lists these. */
export const WORLD_TOOL_SPECS: readonly Spec[] = [
  {
    name: "observe_world",
    description: "Look around: where you are, what you see and notice nearby (nearest first) with distances, directions, states and the operations each entity offers now. Read-only.",
    inputSchema: obj({ max_entities: { type: "integer", minimum: 1, maximum: 100 } }),
  },
  { name: "get_agent_state", description: "Your body: room, position, facing, what you hold, current task, hand hygiene. Read-only.", inputSchema: obj({ actor: { type: "string", maxLength: 80, description: "Another actor (staff:<id>); default yourself." } }) },
  {
    name: "find_entities",
    description: "Search people, equipment, rooms, doors you know of (seen, remembered or on the hospital map), sorted by walking distance. Read-only.",
    inputSchema: obj({
      name: { type: "string", maxLength: 80, description: "Part of the name, in either language." },
      kind: { type: "string", enum: [...ENTITY_KINDS] },
      type: { type: "string", maxLength: 80, description: "Equipment type id, staff role or room kind." },
      capabilities: { type: "array", items: { type: "string", maxLength: 60 }, maxItems: 8 },
      room: { type: "string", maxLength: 80 },
      visible_only: { type: "boolean" },
      reachable_only: { type: "boolean" },
      max_distance: { type: "number", minimum: 0 },
      limit: { type: "integer", minimum: 1, maximum: 50 },
    }),
  },
  {
    name: "find_objects",
    description: "Find equipment by name or capability (e.g. capabilities [\"ecg-12lead\"]), nearest by walking distance first. Read-only.",
    inputSchema: obj({
      query: { type: "string", maxLength: 80 },
      capabilities: { type: "array", items: { type: "string", maxLength: 60 }, maxItems: 8 },
      type: { type: "string", maxLength: 80, description: "Equipment type id." },
      interaction: { type: "string", enum: ["workstation", "monitor", "bed", "device", "atlas", "board", "craft", "door", "sink", "storage"], description: "Interaction kind (sink: sinks and hand-rub dispensers)." },
      portable_only: { type: "boolean", description: "Only carts and handheld items (what can be brought to the patient)." },
      limit: { type: "integer", minimum: 1, maximum: 50 },
    }),
  },
  { name: "inspect_object", description: "Inspect one entity: description, state, and every operation with whether it is available to you now (and why not). Read-only.", inputSchema: obj({ target: TARGET }, ["target"]) },
  { name: "get_nearby_objects", description: "Entities within a radius of you (default 8 m), nearest first. Read-only.", inputSchema: obj({ radius: { type: "number", minimum: 0.5, maximum: 50 } }) },
  { name: "get_visible_objects", description: "Entities you can see right now (field of view, line of sight), nearest first. Read-only.", inputSchema: obj({}) },
  { name: "get_room_info", description: "A room: its exits and what you know in it (default: the room you are in). Read-only.", inputSchema: obj({ room: { type: "string", maxLength: 80 } }) },
  { name: "get_action_feedback", description: "The recorded result of an earlier world action by its action id. Read-only.", inputSchema: obj({ action_id: { type: "string", minLength: 1, maxLength: 200 } }, ["action_id"]) },
  {
    name: "navigate_to",
    description:
      'Walk somewhere: a target ("patient", an entity id or alias, a room id — or a name) or an explicit goal (pass a refusal\'s hint.goal as is). Walking takes simulated time. Returns the route length and travel time.',
    inputSchema: obj({ target: { type: "string", minLength: 1, maxLength: 120 }, goal: GOAL_SCHEMA, range: { type: "number", minimum: 0, maximum: 30, description: "Stop within this distance (m) of the target." } }),
  },
  { name: "approach_object", description: "Walk to the best interaction point of an entity (within reach, line of sight, facing it).", inputSchema: obj({ target: TARGET }, ["target"]) },
  { name: "look_at", description: "Move to a spot from where you can see an entity and face it (e.g. a monitor screen).", inputSchema: obj({ target: TARGET }, ["target"]) },
  {
    name: "interact_object",
    description:
      "Operate an entity with one of its operations (inspect_object lists them): doors open/close, workstation order/read {investigation}, monitor attach/read, ECG cart prepare/connect/record/reset, device use {investigation|intervention}, carts move_to {goal}, sinks wash_hands, items pick_up/put_down. Operations with a clinical effect run the clinical tool through the same approval gate.",
    inputSchema: obj(
      {
        target: TARGET,
        operation: { type: "string", minLength: 1, maxLength: 60 },
        parameters: { type: "object", description: 'Operation parameters, e.g. {"investigation": "ecg-12lead"}, {"intervention": "aspirin"}, {"goal": {"kind": "interact", "id": "patient"}}.' },
        expected_version: { type: "integer", minimum: 0, description: "Optimistic concurrency: the target's stateVersion you observed." },
      },
      ["target", "operation"],
    ),
  },
  { name: "cancel_action", description: "Stop what a body is doing (default: yours): a walk, a device operation waiting for approval.", inputSchema: obj({ actor: { type: "string", maxLength: 80 } }) },
  {
    name: "delegate_task",
    description:
      "Ask a staff member to do a task with their own hands: attach_monitor, record_ecg, obtain_iv_access, fetch_equipment (target: equipment id or params.capability), give_intervention (params.intervention). They walk there and act; approvals still apply. Returns status, steps and simulated time.",
    inputSchema: obj(
      {
        role: { type: "string", minLength: 1, maxLength: 40, description: "nurse, porter, paramedic… (or a staff id staff:<id>)." },
        task: { type: "string", enum: [...DELEGATION_TASKS] },
        target: { type: "string", maxLength: 120 },
        params: { type: "object" },
      },
      ["role", "task"],
    ),
    scope: "workup",
  },
  {
    name: "execute_skill",
    description:
      "Run a skill — a validated multi-step workflow (locate_patient, approach_patient, wash_hands, fetch_equipment, perform_bedside_exam, perform_ecg, attach_monitor, obtain_result, review_imaging, administer_treatment, reassess_patient, or a project skill) — or an inline skill definition (JSON, never code). Each step runs through the normal tool path; success = postconditions hold in authoritative state.",
    inputSchema: obj({ skill_id: { type: "string", maxLength: 80 }, skill: { type: "object", description: "An inline skill definition (schema clinicalcraft/skill@1)." }, params: { type: "object" } }),
  },
  { name: "get_camera_frame", description: "A camera frame of what you see (vision-capable models; browser runtime). Read-only.", inputSchema: obj({ max_width: { type: "integer", minimum: 64, maximum: 1568 } }) },
];

/** Localised name of a delegation task. */
export function taskLabel(locale: string, task: string): string {
  return (DELEGATION_TASKS as readonly string[]).includes(task) ? rt(locale, `delegate.task.${task}` as Parameters<typeof rt>[1]) : task;
}

function specOf(name: Spec["name"]): Spec {
  return WORLD_TOOL_SPECS.find((s) => s.name === name)!;
}

const none = () => "none" as const;

function failedOutput(ctx: ToolContext, key: Parameters<typeof rt>[1], params: Record<string, string | number> = {}): ToolOutput {
  return { ok: false, output: rt(ctx.locale, key, params) };
}

function resultOutput(result: WorldActionResult, locale: string): ToolOutput {
  return { ok: result.status === "completed", output: actionResultText(result, locale), data: { result } };
}

/** The goal a `navigate_to` target names (null: unknown target). */
function targetGoal(host: WorldToolHost, actorId: ActorId, target: string, range: number | undefined): NavGoal | null {
  const world = host.world();
  let id = host.resolve(target, actorId);
  if (!id) {
    // A name ("pharmacy", "ECG"): the nearest known entity whose name matches.
    const hits = world.find(actorId, { name: target, limit: 1 });
    id = hits[0]?.id ?? null;
  }
  if (!id) return null;
  const e = world.entity(id);
  if (e?.kind === "room") return { kind: "room", id: id.replace(/^room:/, "") };
  if (range !== undefined) return { kind: "entity", id, range };
  return { kind: "interact", id };
}

/** Build the world tools over a host (registered only in embodied sessions). */
export function createWorldTools(host: WorldToolHost): ToolDefinition<Record<string, unknown>>[] {
  const L = (ctx: ToolContext) => ctx.locale;
  const base = (name: Spec["name"]) => {
    const s = specOf(name);
    return { name: s.name, description: s.description, inputSchema: s.inputSchema, scope: s.scope ?? ("history-only" as const), risk: none };
  };
  const readOnly = (name: Spec["name"], summarize: (args: Record<string, unknown>, ctx: ToolContext) => string, run: ToolDefinition<Record<string, unknown>>["run"]): ToolDefinition<Record<string, unknown>> => ({
    ...base(name),
    readOnly: true,
    sideEffect: "none",
    summarize,
    run,
  });
  const acting = (name: Spec["name"], summarize: (args: Record<string, unknown>, ctx: ToolContext) => string, run: ToolDefinition<Record<string, unknown>>["run"], extra: Partial<ToolDefinition<Record<string, unknown>>> = {}): ToolDefinition<Record<string, unknown>> => ({
    ...base(name),
    readOnly: false,
    sideEffect: "world",
    summarize,
    run,
    ...extra,
  });
  const targetName = (ctx: ToolContext, target: string) => {
    const id = host.resolve(target, host.actorOf(ctx));
    return id ? nameOf(host.world(), id, ctx.locale) : target;
  };
  const level = (ctx: ToolContext) => host.world().actor(host.actorOf(ctx))?.pose.level ?? "L0";

  const tools: ToolDefinition<Record<string, unknown>>[] = [
    readOnly(
      "observe_world",
      (_args, ctx) => rt(ctx.locale, "sum.look"),
      async (args, ctx) => {
        const max = typeof args.max_entities === "number" ? args.max_entities : undefined;
        const obs = host.world().observe(host.actorOf(ctx), max ? { maxEntities: max } : undefined);
        return { ok: true, output: observationText(host.world(), obs, L(ctx), host.clockText()), data: { observation: obs } };
      },
    ),
    readOnly(
      "get_agent_state",
      () => "get_agent_state",
      async (args, ctx) => {
        const id = strArg(args, "actor") ? (host.resolve(strArg(args, "actor"), host.actorOf(ctx)) ?? strArg(args, "actor")) : host.actorOf(ctx);
        const actor = host.world().actor(id);
        if (!actor) return failedOutput(ctx, "world.unknownTarget", { target: id });
        const lines = [whereText(host.world(), actor, L(ctx), host.clockText())];
        if (actor.holding.length) lines.push(rt(L(ctx), "world.holding", { items: actor.holding.map((h) => nameOf(host.world(), h, L(ctx))).join(", ") }));
        if (actor.task) lines.push(rt(L(ctx), "world.task", { task: actor.task.label }));
        if (actor.handsCleanUntil !== null) lines.push(rt(L(ctx), "world.handsClean", { until: actor.handsCleanUntil }));
        const { seen: _seen, ...rest } = actor;
        return { ok: true, output: lines.join("\n"), data: { actor: rest } };
      },
    ),
    readOnly(
      "find_entities",
      () => "find_entities",
      async (args, ctx) => {
        const q: EntityQuery = {};
        if (strArg(args, "name")) q.name = strArg(args, "name");
        if (typeof args.kind === "string") q.kind = args.kind as EntityKind;
        if (strArg(args, "type")) q.type = strArg(args, "type");
        if (Array.isArray(args.capabilities) && args.capabilities.length) q.capabilities = args.capabilities.map(String);
        if (strArg(args, "room")) q.room = strArg(args, "room").replace(/^room:/, "");
        if (args.visible_only === true) q.visibleOnly = true;
        if (args.reachable_only === true) q.reachableOnly = true;
        if (typeof args.max_distance === "number") q.maxDistance = args.max_distance;
        q.limit = typeof args.limit === "number" ? args.limit : 12;
        const list = host.world().find(host.actorOf(ctx), q);
        return { ok: true, output: entitiesText(list, L(ctx), level(ctx)), data: { entities: list } };
      },
    ),
    readOnly(
      "find_objects",
      () => "find_objects",
      async (args, ctx) => {
        const limit = typeof args.limit === "number" ? args.limit : 8;
        const interaction = strArg(args, "interaction");
        const portableOnly = args.portable_only === true;
        const filtered = Boolean(interaction) || portableOnly;
        const q: EntityQuery = { kind: ["equipment", "item"], limit: filtered ? 500 : limit };
        if (strArg(args, "query")) q.name = strArg(args, "query");
        if (strArg(args, "type")) q.type = strArg(args, "type");
        if (Array.isArray(args.capabilities) && args.capabilities.length) q.capabilities = args.capabilities.map(String);
        const world = host.world();
        let list = world.find(host.actorOf(ctx), q);
        if (filtered) {
          list = list
            .filter((e) => {
              const def = world.entity(e.id);
              return (!interaction || def?.interaction === interaction) && (!portableOnly || Boolean(def?.portable));
            })
            .slice(0, limit);
        }
        return { ok: true, output: entitiesText(list, L(ctx), level(ctx)), data: { entities: list } };
      },
    ),
    readOnly(
      "inspect_object",
      (args, ctx) => `inspect_object ${targetName(ctx, strArg(args, "target"))}`,
      async (args, ctx) => {
        const actor = host.actorOf(ctx);
        const id = host.resolve(strArg(args, "target"), actor);
        const info = id ? host.world().inspect(actor, id) : null;
        if (!info) return failedOutput(ctx, "world.unknownTarget", { target: strArg(args, "target") });
        return { ok: true, output: inspectionText(info, L(ctx), level(ctx)), data: { inspection: info } };
      },
    ),
    readOnly(
      "get_nearby_objects",
      () => "get_nearby_objects",
      async (args, ctx) => {
        const radius = typeof args.radius === "number" ? args.radius : 8;
        const list = host.world().find(host.actorOf(ctx), { kind: ["patient", "staff", "actor", "equipment", "door", "item", "connector"], maxDistance: radius, sort: "distance", limit: 30 });
        return { ok: true, output: entitiesText(list, L(ctx), level(ctx)), data: { entities: list } };
      },
    ),
    readOnly(
      "get_visible_objects",
      () => "get_visible_objects",
      async (_args, ctx) => {
        const list = host.world().find(host.actorOf(ctx), { visibleOnly: true, sort: "distance", limit: 30 });
        return { ok: true, output: entitiesText(list, L(ctx), level(ctx)), data: { entities: list } };
      },
    ),
    readOnly(
      "get_room_info",
      () => "get_room_info",
      async (args, ctx) => {
        const room = strArg(args, "room").replace(/^room:/, "");
        const info = host.world().roomInfo(host.actorOf(ctx), room || undefined);
        if (!info) return failedOutput(ctx, "world.unknownRoom", { room: room || "—" });
        return { ok: true, output: roomText(info, L(ctx), level(ctx)), data: { room: info } };
      },
    ),
    readOnly(
      "get_action_feedback",
      () => "get_action_feedback",
      async (args, ctx) => {
        const result = host.world().feedback(strArg(args, "action_id"));
        if (!result) return failedOutput(ctx, "world.feedback.none", { id: strArg(args, "action_id") });
        return { ok: true, output: actionResultText(result, L(ctx)), data: { result } };
      },
    ),
    acting(
      "navigate_to",
      (args, ctx) => rt(ctx.locale, "sum.navigate", { target: strArg(args, "target") ? targetName(ctx, strArg(args, "target")) : JSON.stringify(args.goal ?? {}) }),
      async (args, ctx) => {
        const actorId = host.actorOf(ctx);
        let goal: NavGoal | null = null;
        if (args.goal !== undefined) {
          const problem = goalProblem(args.goal);
          if (problem) return failedOutput(ctx, "world.badGoal", { reason: problem });
          goal = args.goal as NavGoal;
        } else if (strArg(args, "target")) {
          goal = targetGoal(host, actorId, strArg(args, "target"), typeof args.range === "number" ? args.range : undefined);
          if (!goal) return failedOutput(ctx, "world.unknownTarget", { target: strArg(args, "target") });
        } else return failedOutput(ctx, "world.needTarget");
        return resultOutput(await host.act(ctx, { operation: "navigate", goal }), L(ctx));
      },
      { specifier: (args) => strArg(args, "target") || (typeof (args.goal as { id?: unknown } | undefined)?.id === "string" ? String((args.goal as { id: string }).id) : "") },
    ),
    acting(
      "approach_object",
      (args, ctx) => rt(ctx.locale, "sum.approach", { target: targetName(ctx, strArg(args, "target")) }),
      async (args, ctx) => {
        const id = host.resolve(strArg(args, "target"), host.actorOf(ctx));
        if (!id) return failedOutput(ctx, "world.unknownTarget", { target: strArg(args, "target") });
        return resultOutput(await host.act(ctx, { operation: "approach", targetId: id }), L(ctx));
      },
      { specifier: (args) => strArg(args, "target") },
    ),
    acting(
      "look_at",
      (args, ctx) => rt(ctx.locale, "sum.lookAt", { target: targetName(ctx, strArg(args, "target")) }),
      async (args, ctx) => {
        const id = host.resolve(strArg(args, "target"), host.actorOf(ctx));
        if (!id) return failedOutput(ctx, "world.unknownTarget", { target: strArg(args, "target") });
        return resultOutput(await host.act(ctx, { operation: "look_at", targetId: id }), L(ctx));
      },
      { specifier: (args) => strArg(args, "target") },
    ),
    acting(
      "interact_object",
      (args, ctx) => rt(ctx.locale, "sum.operate", { target: targetName(ctx, strArg(args, "target")), operation: strArg(args, "operation") }),
      async (args, ctx) => {
        const id = host.resolve(strArg(args, "target"), host.actorOf(ctx));
        if (!id) return failedOutput(ctx, "world.unknownTarget", { target: strArg(args, "target") });
        const parameters = args.parameters && typeof args.parameters === "object" && !Array.isArray(args.parameters) ? (args.parameters as Record<string, unknown>) : undefined;
        const request: WorldRequestInput = { operation: strArg(args, "operation"), targetId: id, ...(parameters ? { parameters } : {}) };
        if (typeof args.expected_version === "number") request.expectedTargetVersion = args.expected_version;
        if (parameters && parameters.goal !== undefined && request.operation === "move_to") request.goal = parameters.goal as NavGoal;
        return resultOutput(await host.act(ctx, request), L(ctx));
      },
      // Rules name the operation and the target: `interact_object(lock *)`, `interact_object(* eq:ct-scanner)`.
      { specifier: (args) => `${strArg(args, "operation")} ${strArg(args, "target")}` },
    ),
    acting(
      "cancel_action",
      (args, ctx) => rt(ctx.locale, "sum.cancel", { actor: strArg(args, "actor") || host.actorOf(ctx) }),
      async (args, ctx) => {
        const actorId = strArg(args, "actor") ? (host.resolve(strArg(args, "actor"), host.actorOf(ctx)) ?? strArg(args, "actor")) : host.actorOf(ctx);
        const result = await host.act(ctx, { actorId, operation: "cancel" });
        return { ok: result.status === "completed", output: result.message, data: { result } };
      },
    ),
    acting(
      "delegate_task",
      (args, ctx) => rt(ctx.locale, "sum.delegate", { role: strArg(args, "role"), task: taskLabel(ctx.locale, strArg(args, "task")) }),
      async (args, ctx) => host.delegate(ctx, args),
      { risk: () => "low", specifier: (args) => `${strArg(args, "task")}${strArg(args, "target") ? ` ${strArg(args, "target")}` : ""}` },
    ),
    acting(
      "execute_skill",
      (args, ctx) => rt(ctx.locale, "sum.skill", { skill: strArg(args, "skill_id") || "inline" }),
      async (args, ctx) => host.executeSkill(ctx, args),
      {
        risk: (args) => {
          const safety = host.skillSafety(args);
          return safety === "high-risk" ? "high" : safety === "clinical" ? "low" : "none";
        },
        alwaysAsk: (args) => host.skillSafety(args) === "high-risk",
        specifier: (args) => strArg(args, "skill_id") || "inline",
      },
    ),
    readOnly(
      "get_camera_frame",
      () => "get_camera_frame",
      async (args, ctx) => {
        const camera = host.camera();
        if (!camera) return failedOutput(ctx, "world.camera.none");
        const actorId = host.actorOf(ctx);
        const maxWidth = typeof args.max_width === "number" ? args.max_width : 768;
        const frame = await camera.frame(actorId, { maxWidth, quality: 0.7 });
        if (!frame) return failedOutput(ctx, "world.camera.failed");
        const { imageData, ...meta } = frame;
        return {
          ok: true,
          output: rt(ctx.locale, "world.camera.frame", { actor: actorId, width: frame.width, height: frame.height, clock: frame.clock }),
          data: { frame: meta },
          images: [{ mediaType: frame.mimeType, data: imageData }],
        };
      },
    ),
  ];
  return tools;
}
