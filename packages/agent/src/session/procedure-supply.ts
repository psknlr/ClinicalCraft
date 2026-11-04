/**
 * The operation's equipment, as the world has it (docs/PROCEDURE.md "Equipment"): the laparoscopic image needs a
 * working camera and light source in the patient's room, the pneumoperitoneum a working insufflator
 * (`PROCEDURE_SUPPLY`) — working by the world's capability rule (`WorldRuntime.provides`): a device out of service,
 * or in a state that does not supply it (a tower switched off), supplies nothing; powering it on restores what that
 * state supplies; a backup brought into the room supplies exactly the capabilities it has (a stand-alone insufflator
 * restores the gas, not the picture). A facility that does not
 * model a capability at all is not limited by it. When what the room supplies differs from the record, the session
 * records it (`procedure-supply`, by the system) — before every operative step, when the field is looked at, and on
 * the staff's own round.
 */
import { PROCEDURE_SUPPLY, procedureFor, t, type ProcedureSupply } from "@clinicalcraft/core";
import type { SessionKernel } from "./kernel.js";

/** What the equipment in the patient's room supplies now, and the devices supplying it (null: no world, no operation). */
export function suppliedByWorld(k: SessionKernel): (ProcedureSupply & { source: string }) | null {
  const e = k.embodied;
  if (!e || !procedureFor(k.caseDef, k.state)) return null;
  const w = e.world();
  const patient = e.patientId();
  const room = patient ? w.roomOf(patient) : null;
  const equipment = w.entities().filter((x) => x.kind === "equipment");
  const devices = new Set<string>();
  const supplies = (caps: readonly string[]) =>
    caps.every((cap) => {
      const modelled = equipment.filter((x) => x.capabilities.includes(cap));
      if (!modelled.length) return true;
      // the world's capability rule: in service, and in a state that supplies it (a tower switched off gives nothing)
      const here = modelled.filter((x) => w.roomOf(x.id) === room && w.provides(x.id).includes(cap));
      for (const x of here) devices.add(t(x.name, k.locale));
      return here.length > 0;
    });
  const image = supplies(PROCEDURE_SUPPLY.image);
  const gas = supplies(PROCEDURE_SUPPLY.gas);
  return { image, gas, source: [...devices].join(", ").slice(0, 200) };
}

/** Record a change of what the equipment supplies (nothing when it is what the record holds). */
export function syncProcedureSupply(k: SessionKernel, id: string): void {
  const now = suppliedByWorld(k);
  if (!now) return;
  const p = k.state.procedure;
  if ((p?.supply?.image !== false) === now.image && (p?.supply?.gas !== false) === now.gas) return;
  k.dispatch({ type: "procedure-supply", supply: { image: now.image, gas: now.gas, ...(now.source ? { source: now.source } : {}) }, by: "system" }, id);
}

/** A device the operation needs that is in the room and in service but not switched on, and the step that would. */
export interface IdleSupplier {
  device: string;
  /** What it would supply that the operation lacks now. */
  capabilities: string[];
  /** Its behaviour state now, the operation that brings it to a state supplying them, and that state. */
  state: string;
  operation: string;
  to: string;
  /** Roles that may do it (empty: anyone). */
  roles: readonly string[];
}

/**
 * Once the operation has begun, the first device in the patient's room, in service, that has a capability the
 * operation lacks now but does not supply it in its state (a tower switched off, a spare just brought in), with the one operation from that state to a
 * state that supplies it (power on). Null: nothing lacking, or nothing in the room that switching on would help.
 */
export function idleSupplier(k: SessionKernel): IdleSupplier | null {
  const e = k.embodied;
  // once the operation has begun (a port plan chosen): before it, a tower may be off on purpose
  if (!e || !k.state.procedure?.plan) return null;
  const now = suppliedByWorld(k);
  if (!now || (now.image && now.gas)) return null;
  const lacking = [...(now.image ? [] : PROCEDURE_SUPPLY.image), ...(now.gas ? [] : PROCEDURE_SUPPLY.gas)];
  const w = e.world();
  const patient = e.patientId();
  const room = patient ? w.roomOf(patient) : null;
  const stored = w.snapshot().entities;
  for (const x of w.entities()) {
    if (x.kind !== "equipment" || w.roomOf(x.id) !== room || stored[x.id]?.available === false) continue;
    const b = x.equipmentType?.behavior;
    if (!b || b.derived) continue;
    const provides = w.provides(x.id);
    const want = lacking.filter((cap) => x.capabilities.includes(cap) && !provides.includes(cap));
    if (!want.length) continue;
    const state = stored[x.id]?.state ?? x.initialState ?? b.initial;
    const suppliesIn = (to: string) => b.states[to]?.supplies ?? x.capabilities;
    const step = Object.entries(b.operations).find(([, o]) => o.to && (o.from === "*" || o.from.includes(state)) && want.every((cap) => suppliesIn(o.to!).includes(cap)));
    if (step) return { device: x.id, capabilities: want, state, operation: step[0], to: step[1].to!, roles: step[1].roles ?? [] };
  }
  return null;
}
