/**
 * Authority (EMBODIED §8): which operations an actor's role permits. Every
 * operation belongs to one class; a role holds a set of classes, and an
 * operation's own `roles` (catalog behaviour, built-in door keys) narrow it
 * further. Checked by the action bus right after the target is resolved
 * (`NOT_AUTHORIZED`), and by `availableActions`.
 *
 * | class      | operations                                                        |
 * |------------|-------------------------------------------------------------------|
 * | `move`     | navigate, approach, look_at, cancel                               |
 * | `physical` | open/close (doors, storage), wash_hands, move_to, pick_up, put_down, equip, device operations without a clinical effect (prepare, connect, reset, cycle_nibp, monitor read) |
 * | `secure`   | lock, unlock (doors)                                              |
 * | `clinical` | every operation with a clinical effect (workstation order/read, device use, monitor attach, ECG record…) |
 *
 * | role                                                                           | move | physical | secure | clinical |
 * |--------------------------------------------------------------------------------|:----:|:--------:|:------:|:--------:|
 * | clinician (the learner's avatar)                                               | ✓ | ✓ | – | ✓ |
 * | nurse, attending, paramedic, radiologist, pathologist, lab-tech, pharmacist     | ✓ | ✓ | – | ✓ |
 * | porter, receptionist (facilities / front desk: they hold the keys)             | ✓ | ✓ | ✓ | – |
 *
 * The clinical class only lets an actor *ask* for a clinical effect: the
 * session's tool path (hooks, approval, practice scope) still decides.
 */
import type { ActorRole } from "./contracts.js";

export type OperationClass = "move" | "physical" | "secure" | "clinical";

/** Operations of the `move` class. */
export const MOVE_OPERATIONS: readonly string[] = ["navigate", "approach", "look_at", "cancel"];

/** Operations of the `secure` class. */
export const SECURE_OPERATIONS: readonly string[] = ["lock", "unlock"];

const CLINICAL_STAFF: readonly OperationClass[] = ["move", "physical", "clinical"];
const KEY_HOLDERS: readonly OperationClass[] = ["move", "physical", "secure"];

/** Role → permitted operation classes (see the module table). */
export const ROLE_AUTHORITY: Readonly<Record<ActorRole, readonly OperationClass[]>> = {
  clinician: CLINICAL_STAFF,
  nurse: CLINICAL_STAFF,
  attending: CLINICAL_STAFF,
  paramedic: CLINICAL_STAFF,
  radiologist: CLINICAL_STAFF,
  pathologist: CLINICAL_STAFF,
  "lab-tech": CLINICAL_STAFF,
  pharmacist: CLINICAL_STAFF,
  porter: KEY_HOLDERS,
  receptionist: KEY_HOLDERS,
};

/** Class of an operation (by name, and whether it runs a clinical effect). */
export function operationClass(operation: string, clinical: boolean): OperationClass {
  if (MOVE_OPERATIONS.includes(operation)) return "move";
  if (SECURE_OPERATIONS.includes(operation)) return "secure";
  return clinical ? "clinical" : "physical";
}

/** May `role` perform the operation (its class, then the operation's own `roles`)? */
export function permits(role: ActorRole, operation: string, op?: { roles?: readonly ActorRole[]; clinical?: unknown }): boolean {
  const classes = ROLE_AUTHORITY[role] ?? [];
  if (!classes.includes(operationClass(operation, !!op?.clinical))) return false;
  return !op?.roles?.length || op.roles.includes(role);
}

/** Roles that may perform an operation of this class (for messages). */
export function rolesFor(cls: OperationClass): ActorRole[] {
  return (Object.keys(ROLE_AUTHORITY) as ActorRole[]).filter((r) => ROLE_AUTHORITY[r].includes(cls));
}
