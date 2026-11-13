import { z } from "zod";
import { ConditionSchema, IdSchema, LocalizedTextSchema } from "./common.js";
// the leaf module of positions and controls (not facility.ts, which imports case.ts, which imports this module)
import { StaffPositionSchema, SurgicalControlSchema } from "./positions.js";
import { ProvenanceTagSchema } from "./procedure.js";

/**
 * The care team of a case (docs/TEAM.md): the staff of one room who work without being told each step —
 * each member has duties, sees what their own body can see, receives what is said to them, and acts with
 * their own body through the world's action bus. Authored team scenarios (initial conditions and
 * perturbations: a need for an instrument, a colleague on a break, an item moved or missing) are chosen at
 * `start`, like a procedure variant, and are hidden state: the team must work them out.
 */

/**
 * What a member is there for: `circulate` (the circulating nurse: notices needs, asks the right colleague,
 * verifies what happened, escalates); `instruments` (the scrub nurse: the sterile instruments — locates,
 * carries and hands them over); `count` (the surgical count); `surgeon`; `anaesthesia`; `assist` (at the table with
 * the surgeon — a first or second assistant; the member's controls say for what).
 */
export const TeamDutySchema = z.enum(["circulate", "instruments", "count", "surgeon", "anaesthesia", "assist"]);
export type TeamDuty = z.infer<typeof TeamDutySchema>;

/** A staff id of the facility without its prefix (`or-7.scrub-nurse`), or `surgeon`: the operating surgeon (the learner, or a simulated surgeon in observer mode). */
const MemberRef = z.string().regex(/^(surgeon|[A-Za-z0-9._-]+)$/, "a staff id (or-7.scrub-nurse) or surgeon");

export const TeamMemberSchema = z
  .object({
    staff: MemberRef,
    duties: z.array(TeamDutySchema).min(1),
    /**
     * The member's position (default: from the duties, by priority — surgeon, anaesthesia, instruments, assist,
     * circulate, count). Needed when two members share a duty: a first and a second assistant both `assist`.
     */
    position: StaffPositionSchema.optional(),
    /** The member's controls, replacing their position's defaults (a scrub nurse who also holds the camera). */
    controls: z
      .array(SurgicalControlSchema)
      .min(1)
      .refine((xs) => new Set(xs).size === xs.length, { message: "each control is listed once" })
      .optional(),
    /**
     * On the `surgeon` member only: the facility staff member who operates when the learner takes another place in
     * the team (a first or second assistant, the scrub nurse) — the stand-in surgeon. A team without one offers the
     * learner the surgeon's place only.
     */
    standIn: MemberRef.optional(),
  })
  .strict();
export type TeamMember = z.infer<typeof TeamMemberSchema>;

/**
 * A line-up: assistants added to the team for this encounter (`start {lineup}`), the base team staying as it is — a
 * three-surgeon team beside the two-surgeon one a report describes. Each added member assists (`duties: ["assist"]`).
 */
export const TeamLineupSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    provenance: ProvenanceTagSchema,
    note: LocalizedTextSchema.optional(),
    members: z.array(TeamMemberSchema).min(1),
  })
  .strict();
export type TeamLineup = z.infer<typeof TeamLineupSchema>;

/** Something the team has to provide: an item of a type for a member (the surgeon needs a needle holder). */
export const TeamNeedSchema = z
  .object({
    id: IdSchema,
    /** Equipment type id: any item of that type will do (the team locates one). */
    item: IdSchema,
    /** What the team calls it aloud ("needle holder"; default: the equipment type's name without its details). */
    name: LocalizedTextSchema.optional(),
    /** Who needs it: `surgeon` or a member's staff id. */
    for: MemberRef,
    /** The member who notices it (default: the member who circulates). */
    noticedBy: MemberRef.optional(),
    /** What is said when it is noticed (default: generated from the item and the person). */
    text: LocalizedTextSchema.optional(),
  })
  .strict();
export type TeamNeed = z.infer<typeof TeamNeedSchema>;

/** A team scenario: initial conditions and perturbations, never the steps (authored teaching / benchmark material). */
export const TeamScenarioSchema = z
  .object({
    id: IdSchema,
    name: LocalizedTextSchema,
    /** What is set up and why (debrief and facilitator text; never shown to the team's policies). */
    summary: LocalizedTextSchema,
    provenance: ProvenanceTagSchema,
    needs: z.array(TeamNeedSchema).default([]),
    /** Members not available (on a break, scrubbed out): present in the facility, not answering in the room. */
    absent: z.array(MemberRef).default([]),
    /** Colleagues outside the room the team may call on when a member is unavailable (staff id → duties). */
    relief: z.array(TeamMemberSchema).default([]),
    /**
     * What should come of it (the team benchmark's ground truth; never shown to the team): `delivered` — every need
     * ends with the person holding the item, verified (false: it ends escalated, with the reason); `count` — the
     * count's outcome.
     */
    expect: z
      .object({
        delivered: z.boolean().optional(),
        count: z.enum(["correct", "reconciled", "unresolved"]).optional(),
      })
      .strict()
      .optional(),
    /**
     * Items not where the room keeps them: put beside another placement (or `patient`) at the start — another table
     * in the room, or a placement elsewhere in the hospital (then the team will not find it in the room).
     * `concealed`: out of everyone's sight where it lies until someone searches within reach (a swab dropped under
     * the Mayo stand); `inside`: concealed in what it is beside, found only by searching that (a swab in the wound:
     * beside `patient`). Items are moved after the count's baseline is taken (the expected items by identity).
     */
    items: z
      .array(
        z
          .object({
            placement: z.string().min(1),
            beside: z.string().min(1),
            concealed: z.boolean().optional(),
            inside: z.boolean().optional(),
            /**
             * A documented transfer off the field (a counted item sent with the specimen): recorded in the count by
             * `by` (default: the member who circulates) when the scenario is set up — the positive control: an item
             * that left legitimately is neither missing nor a discrepancy.
             */
            transfer: z.object({ to: LocalizedTextSchema, reason: LocalizedTextSchema, by: MemberRef.optional() }).strict().optional(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();
export type TeamScenario = z.infer<typeof TeamScenarioSchema>;

/**
 * The surgical count the team keeps, item by item (docs/TEAM.md §4.3): when `when` holds (the specimen is out), the
 * member who counts counts the items of `item` she can see in the room against the baseline (every one in the room
 * before incision). A discrepancy stops the line: the surgeon is asked to hold closure and check the wound
 * (with a read-back), the circulating nurse searches `searchPlaces` in order — the same places whatever happened, so
 * nothing points to where an item is — and asks for a recount: correct, the surgeon may close; still short, it is
 * escalated (an X-ray before the patient leaves).
 */
export const TeamCountSchema = z
  .object({
    /** Equipment type counted (each item one entity: a swab). */
    item: IdSchema,
    /** What the team calls them aloud ("swabs"). */
    name: LocalizedTextSchema.optional(),
    /** When the count is due (e.g. the specimen is out, before closure). */
    when: ConditionSchema,
    /** Placements the circulating nurse searches, in order (the floor round them, within reach). */
    searchPlaces: z.array(z.string().min(1)).min(1).max(12),
    /**
     * Closure while the count is not settled (an item missing or not in the count, no clear scan after an
     * escalation): `record` — allowed, and recorded as an unsafe progression for the debrief (it is never erased);
     * `refuse` — refused until the count is settled.
     */
    closure: z.enum(["record", "refuse"]).default("record"),
  })
  .strict();
export type TeamCount = z.infer<typeof TeamCountSchema>;

export const CaseTeamSchema = z
  .object({
    /** The room the team works in (a facility room id, e.g. `or-7`). */
    room: IdSchema,
    /** Case phases in which the team works on its own. */
    phases: z.array(IdSchema).min(1),
    members: z.array(TeamMemberSchema).min(2),
    /** Scheduler rounds a member waits for an answer before rerouting or escalating (default 3). */
    waitRounds: z.number().int().min(1).max(20).default(3),
    /** The count the team keeps (a member with the `count` duty counts; the circulating nurse searches). */
    count: TeamCountSchema.optional(),
    /**
     * Colleagues outside the room who take over a member's duty when that member has to leave during the case (the
     * duty anaesthetist relieving the room's anaesthetist): a member with the `anaesthesia` duty asked to go while
     * the patient is under anaesthesia (`patient.nonVerbalWhen` holds) leaves only once a colleague covering
     * `anaesthesia` has come to the patient and taken over, and the hand-over is recorded (docs/TEAM.md §5).
     */
    cover: z.array(TeamMemberSchema).default([]),
    scenarios: z.array(TeamScenarioSchema).default([]),
    /** Line-ups the encounter may choose at `start {lineup}` (assistants added to the members). */
    lineups: z.array(TeamLineupSchema).default([]),
    note: LocalizedTextSchema.optional(),
  })
  .strict();
export type CaseTeam = z.infer<typeof CaseTeamSchema>;
