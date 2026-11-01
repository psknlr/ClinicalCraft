/**
 * The operator's view of the field (docs/PROCEDURE.md §7): what a surgeon looking at the laparoscopic
 * screen could know. Ducts and vessels are handles ("T1"…) with what they look like — never their
 * anatomical names, which the operator must work out (cholangiography or ultrasound shows the ducts).
 * No safety-view verdict, injury the field does not show, unsafe-act record or score is included:
 * agents get this view and nothing else of the procedure state.
 */
import type { LocalizedText } from "../../i18n.js";
import type { InstrumentId, ProcedureDefinition } from "../../schema/procedure.js";
import { appearanceRule, clearedFraction, exposure, fieldOpen, isTubular, isVisible, obscured, structureOf } from "./field.js";
import { describeDirection } from "./geometry.js";
import type { ProcedureState } from "./state.js";
import { tubeVocabulary } from "./variant.js";

export interface FieldView {
  plan: string | null;
  ports: { port: string; role: "camera" | "working" | "assist"; sizeMm: number; hand?: "left" | "right"; instrument: InstrumentId | null }[];
  insufflated: boolean;
  pressure: number;
  /** The laparoscope shows the field. */
  inView: boolean;
  /** Organs and parts in view, by name (a liver is recognisable; which duct is which is not). */
  organs: { id: string; name: LocalizedText }[];
  tubes: {
    handle: string;
    appears: LocalizedText | null;
    isolated: boolean;
    clips: number;
    divided: boolean;
    /** What the operator named it, if anything. */
    namedAs: string | null;
    /** What intraoperative imaging showed it to be. */
    imaging: LocalizedText | null;
  }[];
  regions: {
    id: string;
    name: LocalizedText;
    dissection: "untouched" | "begun" | "partly" | "mostly" | "cleared";
    exposure: "none" | "poor" | "partial" | "good";
    /** What the tissue looks like once dissection there has begun (dense fibrosis), if anything unusual. */
    finding?: LocalizedText;
  }[];
  /** The names a duct or vessel can be given (`identify … as`): the same list whatever the anatomy. */
  names: string[];
  retractions: { structure: string; port: string; direction: string[]; force: "gentle" | "firm" | "excessive" }[];
  findings: ("bleeding" | "major-bleeding" | "field-obscured" | "bile" | "stones" | "duct-injury-on-imaging")[];
  specimen: ProcedureState["specimen"];
  bailouts: string[];
  imaged: string[];
  pauses: number;
  closed: boolean;
}

function dissectionBin(f: number): FieldView["regions"][number]["dissection"] {
  if (f <= 0) return "untouched";
  if (f < 0.34) return "begun";
  if (f < 0.67) return "partly";
  if (f < 1) return "mostly";
  return "cleared";
}

function exposureBin(e: number): FieldView["regions"][number]["exposure"] {
  if (e <= 0) return "none";
  if (e < 0.5) return "poor";
  if (e < 0.8) return "partial";
  return "good";
}

/** The operator's view of the field. */
export function observeField(def: ProcedureDefinition, s: ProcedureState): FieldView {
  const open = fieldOpen(s);
  const imagedDucts = s.imaged.includes("ioc") || s.imaged.includes("lap-us");
  const imagedVessels = s.imaged.includes("lap-us");
  const findings = new Set<FieldView["findings"][number]>();
  if (open || s.closed) {
    for (const b of s.bleeding) if (!b.controlled) findings.add(b.severity === "major" ? "major-bleeding" : "bleeding");
    if (obscured(s)) findings.add("field-obscured");
    if (s.spillage.bile && !s.spillage.cleared) findings.add("bile");
    if (s.spillage.stones && !s.spillage.cleared) findings.add("stones");
    if (s.injuries.some((i) => i.kind === "bile-duct-injury" && i.visible && s.imaged.length)) findings.add("duct-injury-on-imaging");
  }
  return {
    plan: s.plan,
    ports: s.ports.map((p) => ({ port: p.site, role: p.role, sizeMm: p.sizeMm, ...(p.hand ? { hand: p.hand } : {}), instrument: p.instrument })),
    insufflated: s.insufflated,
    pressure: s.pressure,
    inView: open,
    organs: open ? def.anatomy.filter((st) => !isTubular(st) && isVisible(def, s, st)).map((st) => ({ id: st.id, name: st.name })) : [],
    tubes: open
      ? s.handles.flatMap((h) => {
          const st = structureOf(def, h.structure);
          if (!st || !isVisible(def, s, st)) return [];
          const shown = (st.kind === "duct" && imagedDucts) || (st.kind !== "duct" && imagedVessels);
          return [
            {
              handle: h.handle,
              appears: appearanceRule(def, s, st)?.text ?? st.appearsAs?.default ?? null,
              isolated: s.isolated.includes(st.id),
              clips: s.clips[st.id] ?? 0,
              divided: s.divided.includes(st.id),
              namedAs: s.claims[h.handle] ?? null,
              imaging: shown ? st.name : null,
            },
          ];
        })
      : [],
    regions: open
      ? def.regions.map((r) => {
          const cleared = clearedFraction(def, s, r.id);
          return { id: r.id, name: r.name, dissection: dissectionBin(cleared), exposure: exposureBin(exposure(def, s, r.id)), ...(r.fibrosis && cleared > 0 ? { finding: r.fibrosis.finding } : {}) };
        })
      : [],
    names: tubeVocabulary(def),
    retractions: Object.entries(s.retractions).map(([structure, r]) => ({ structure, port: r.port, direction: describeDirection(r.direction), force: r.force })),
    findings: [...findings],
    specimen: s.specimen,
    bailouts: [...s.bailouts],
    imaged: [...s.imaged],
    pauses: s.pauses.length,
    closed: s.closed,
  };
}
