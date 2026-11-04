/**
 * The operation's equipment, as the world has it (docs/PROCEDURE.md "Equipment"): the laparoscopic image needs a
 * working camera and light source in the patient's room, the pneumoperitoneum a working insufflator
 * (`PROCEDURE_SUPPLY`). A device out of service supplies nothing; a backup brought into the room supplies exactly
 * the capabilities it has (a stand-alone insufflator restores the gas, not the picture). A facility that does not
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
  const snapshot = w.snapshot().entities;
  const equipment = w.entities().filter((x) => x.kind === "equipment");
  const inService = (id: string) => snapshot[id]?.available !== false;
  const devices = new Set<string>();
  const supplies = (caps: readonly string[]) =>
    caps.every((cap) => {
      const modelled = equipment.filter((x) => x.capabilities.includes(cap));
      if (!modelled.length) return true;
      const here = modelled.filter((x) => w.roomOf(x.id) === room && inService(x.id));
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
