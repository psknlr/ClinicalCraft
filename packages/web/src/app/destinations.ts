/**
 * Where this case may take the patient in the world (in-world mode, no DOM): for each study the case's
 * investigations do on the patient at a fixed device (a CT, an X-ray table, the cath lab's C-arm) or that the
 * patient performs at a station (peak flow), the in-service device providing it that is nearest the patient —
 * the places the conversation offers to walk the patient to, or to have a colleague take them. Named as the
 * world names them, so the learner's sentence ("Please come with me to the CT scanner") is understood by the
 * session the same way a typed one is.
 */
import { t, type CaseDefinition } from "@clinicalcraft/core";
import { PATIENT_AT_PROVIDER_CAPABILITIES, PATIENT_PERFORMED_CAPABILITIES, type WorldRuntime } from "@clinicalcraft/world";

export interface Destination {
  /** The device's entity id (`eq:<id>`). */
  id: string;
  /** Its name in the UI language. */
  name: string;
}

const STUDY_CAPABILITIES: ReadonlySet<string> = new Set([...PATIENT_AT_PROVIDER_CAPABILITIES, ...PATIENT_PERFORMED_CAPABILITIES]);

/** The study devices this case may need the patient at (see the module docs), nearest the patient first per capability; at most `max`. */
export function studyDestinations(world: WorldRuntime, c: CaseDefinition, locale: string, max = 4): Destination[] {
  const caps = new Set<string>();
  for (const inv of c.investigations) {
    if (inv.performedAt === "bedside" || inv.performedAt === "records") continue;
    for (const cap of inv.requires) if (STUDY_CAPABILITIES.has(cap)) caps.add(cap);
  }
  const place = world.patientPlace();
  const out: Destination[] = [];
  for (const cap of caps) {
    const devices = world
      .entities()
      .filter((e) => e.kind === "equipment" && !e.portable && e.interaction === "device" && (e.capabilities ?? []).includes(cap))
      .map((e) => ({ e, d: place && e.level === place.level ? Math.hypot(e.position.x - place.x, e.position.z - place.z) : 1e6 }))
      .sort((a, b) => a.d - b.d || (a.e.id < b.e.id ? -1 : 1));
    const best = devices[0]?.e;
    if (best && !out.some((x) => x.id === best.id)) out.push({ id: best.id, name: t(best.name, locale) });
    if (out.length >= max) break;
  }
  return out;
}

/** Is the patient away from their own bed space (a transport back makes sense)? */
export function awayFromBed(world: WorldRuntime): boolean {
  const p = world.patientPlace();
  return !!p && (p.slot === null || p.slot !== p.home.slot);
}
