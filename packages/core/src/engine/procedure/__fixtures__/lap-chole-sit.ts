/**
 * A small laparoscopic-cholecystectomy-in-situs-inversus case for the procedure tests: the gallbladder
 * on the patient's left, three ports as in a published report (camera below the umbilicus, an
 * assistant/left-hand port below the xiphoid, the main port at the left midclavicular line), a mirrored
 * four-port plan and a "habitual" plan with the ports where they would go for usual anatomy. Simple
 * geometry (m, +x patient left, +y cranial, +z anterior) — test data, not anatomy.
 */
import { parseCase } from "../../parse.js";
import type { CaseDefinition } from "../../../schema/case.js";

const L = (en: string) => ({ en, "zh-CN": en });

export const LAP_CHOLE_SIT = {
  schema: "clinicalcraft/case@1",
  id: "mini-lap-chole-sit",
  version: "1.0.0",
  title: L("Mini laparoscopic cholecystectomy (situs inversus)"),
  summary: L("Procedure engine test case."),
  specialty: ["general-surgery"],
  difficulty: 3,
  setting: "operating-room",
  locales: ["en", "zh-CN"],
  provenance: { kind: "synthetic" },
  patient: {
    displayName: L("Test patient"),
    age: 84,
    sex: "male",
    chiefComplaint: L("Gallstones"),
    persona: { personality: L("Calm"), speechStyle: L("Brief"), affect: "calm", openingLine: L("Hello."), fallbackUnknown: L("Not recorded.") },
  },
  phases: [
    { id: "ward", label: L("Ward") },
    { id: "theatre", label: L("Theatre") },
  ],
  clock: { mode: "simulated", startTime: "08:00", actionCosts: { ask: 1, examine: 1, order: 1, read: 1, intervene: 1, answer: 0 } },
  objectives: [
    { id: "operate", title: L("Operate"), hint: L("Operate."), completeWhen: { procedure: { closed: true } } },
  ],
  debrief: { title: L("Debrief"), conclusion: L("Done.") },
  safetyGates: [
    { id: "bdi", label: L("Major bile duct injury"), when: { procedure: { injury: "bile-duct-injury" } }, verdict: "safety-critical", capPercent: 30 },
    { id: "unsafe-irreversible", label: L("Irreversible step without a documented critical view"), when: { any: [{ procedure: { unsafe: "irreversible-without-pause" } }, { procedure: { unsafe: "irreversible-without-view" } }] }, verdict: "safety-critical" },
    { id: "spill", label: L("Bile or stones spilled"), when: { procedure: { spillage: "bile" } }, verdict: "complication" },
  ],
  rubric: [
    { id: "r-cvs", text: L("Critical view documented and real"), domain: "safety", weight: 30, met: { procedure: { documented: "cvs", valid: true } } },
    { id: "r-out", text: L("Specimen out"), domain: "management", weight: 10, met: { procedure: { specimen: "extracted" } } },
  ],
  procedure: {
    id: "lap-chole",
    name: L("Laparoscopic cholecystectomy"),
    phases: ["theatre"],
    specimen: "gallbladder",
    stones: true,
    target: [0.045, 0.1, -0.1],
    anatomy: [
      { id: "liver", name: L("Liver"), kind: "organ", role: "organ", points: [[0.06, 0.12, -0.08]], radius: 0.12, provenance: "reference" },
      { id: "gallbladder", name: L("Gallbladder"), kind: "organ", role: "specimen", points: [[0.08, 0.06, -0.05], [0.07, 0.08, -0.07], [0.055, 0.095, -0.09]], radius: 0.02, provenance: "reference" },
      { id: "gallbladder-fundus", name: L("Fundus"), kind: "organ", role: "specimen", parent: "gallbladder", points: [[0.08, 0.06, -0.05]], radius: 0.015, provenance: "reference" },
      { id: "gallbladder-infundibulum", name: L("Infundibulum"), kind: "organ", role: "specimen", parent: "gallbladder", points: [[0.055, 0.095, -0.09]], radius: 0.012, provenance: "reference" },
      { id: "duodenum", name: L("Duodenum"), kind: "organ", role: "organ", points: [[0.04, 0.03, -0.1]], radius: 0.03, provenance: "reference" },
      { id: "cystic-plate", name: L("Cystic plate"), kind: "plate", role: "landmark", in: "cystic-plate", points: [[0.06, 0.1, -0.095]], radius: 0.015, provenance: "authored" },
      {
        id: "common-bile-duct",
        name: L("Common bile duct"),
        kind: "duct",
        role: "critical",
        joins: ["common-hepatic-duct", "cystic-duct"],
        in: "hepatocystic-triangle",
        revealAt: 0.2,
        points: [[0.035, 0.09, -0.11], [0.03, 0.03, -0.12]],
        radius: 0.003,
        appearsAs: {
          default: L("a wider duct running down in the hepatoduodenal ligament"),
          when: [{ exposure: "hepatocystic-triangle", below: 0.5, text: L("a duct that seems to run into the gallbladder neck"), appearsToEnter: "gallbladder" }],
        },
        provenance: "reference",
      },
      {
        id: "cystic-duct",
        name: L("Cystic duct"),
        kind: "duct",
        role: "target",
        joins: ["common-hepatic-duct", "common-bile-duct"],
        enters: "gallbladder-infundibulum",
        in: "hepatocystic-triangle",
        revealAt: 0.5,
        points: [[0.055, 0.095, -0.09], [0.035, 0.09, -0.11]],
        radius: 0.0015,
        appearsAs: { default: L("a thin duct running from the gallbladder neck") },
        provenance: "reference",
      },
      {
        id: "cystic-artery",
        name: L("Cystic artery"),
        kind: "artery",
        role: "target",
        joins: ["right-hepatic-artery"],
        enters: "gallbladder",
        in: "hepatocystic-triangle",
        revealAt: 0.6,
        points: [[0.03, 0.115, -0.115], [0.06, 0.1, -0.085]],
        radius: 0.001,
        appearsAs: { default: L("a thin pulsating vessel running up to the gallbladder") },
        provenance: "reference",
      },
      {
        id: "common-hepatic-duct",
        name: L("Common hepatic duct"),
        kind: "duct",
        role: "critical",
        in: "hepatocystic-triangle",
        revealAt: 0.9,
        points: [[0.03, 0.13, -0.11], [0.035, 0.09, -0.11]],
        radius: 0.0025,
        appearsAs: { default: L("a duct coming down from the liver hilum") },
        provenance: "reference",
      },
      {
        id: "right-hepatic-artery",
        name: L("Right hepatic artery"),
        kind: "artery",
        role: "critical",
        in: "hepatocystic-triangle",
        revealAt: 1,
        points: [[0.0, 0.11, -0.12], [0.05, 0.13, -0.12]],
        radius: 0.0015,
        appearsAs: { default: L("an artery running deep towards the liver") },
        provenance: "reference",
      },
    ],
    regions: [
      {
        id: "hepatocystic-triangle",
        name: L("Hepatocystic triangle"),
        units: 6,
        centre: [0.045, 0.1, -0.1],
        radius: 0.025,
        exposure: [{ structure: "gallbladder-infundibulum", direction: ["patient-left", "caudal"] }],
        hazards: ["common-bile-duct", "common-hepatic-duct", "right-hepatic-artery"],
      },
      {
        id: "cystic-plate",
        name: L("Lower third of the gallbladder bed"),
        units: 3,
        centre: [0.06, 0.1, -0.095],
        radius: 0.015,
        after: ["hepatocystic-triangle"],
        exposure: [{ structure: "gallbladder-infundibulum", direction: ["patient-left", "anterior"], full: 0.6 }],
      },
      {
        id: "gallbladder-bed",
        name: L("Gallbladder bed"),
        units: 5,
        centre: [0.075, 0.08, -0.07],
        radius: 0.03,
        after: ["cystic-plate"],
        exposure: [{ structure: "gallbladder-infundibulum", direction: ["anterior", "cephalad"], full: 0.6 }],
        bed: true,
      },
    ],
    portSites: [
      { id: "A", name: L("Below the umbilicus"), at: [0, -0.01, 0] },
      { id: "B", name: L("Below the xiphoid, slightly left"), at: [0.02, 0.17, -0.005], normal: [0, 0.2, 1] },
      { id: "C", name: L("Left midclavicular line, subcostal"), at: [0.09, 0.12, -0.02], normal: [0.3, 0.1, 1] },
      { id: "D", name: L("Left anterior axillary line"), at: [0.14, 0.07, -0.05], normal: [0.7, 0, 0.7] },
      { id: "H", name: L("Right anterior axillary line"), at: [-0.14, 0.07, -0.05], normal: [-0.7, 0, 0.7] },
      { id: "G", name: L("Right midclavicular line, subcostal"), at: [-0.09, 0.12, -0.02], normal: [-0.3, 0.1, 1] },
    ],
    portPlans: [
      {
        id: "three-port-left",
        name: L("Three ports, surgeon on the patient's left"),
        surgeonSide: "left",
        provenance: "published-case",
        ports: [
          { site: "A", role: "camera", sizeMm: 10 },
          { site: "B", role: "working", sizeMm: 5, hand: "left" },
          { site: "C", role: "working", sizeMm: 5, hand: "right" },
        ],
      },
      {
        id: "mirror-four-port",
        name: L("Mirrored four ports, surgeon on the patient's right"),
        surgeonSide: "right",
        provenance: "authored",
        ports: [
          { site: "A", role: "camera", sizeMm: 10 },
          { site: "B", role: "working", sizeMm: 5, hand: "left" },
          { site: "C", role: "working", sizeMm: 5, hand: "right" },
          { site: "D", role: "assist", sizeMm: 5 },
        ],
      },
      {
        id: "habitual",
        name: L("Ports placed as for usual anatomy"),
        surgeonSide: "left",
        provenance: "authored",
        ports: [
          { site: "A", role: "camera", sizeMm: 10 },
          { site: "G", role: "working", sizeMm: 5, hand: "left" },
          { site: "H", role: "working", sizeMm: 5, hand: "right" },
        ],
      },
    ],
    instruments: [
      { id: "laparoscope" },
      { id: "grasper" },
      { id: "maryland" },
      { id: "hook" },
      { id: "scissors" },
      { id: "clip-applier" },
      { id: "suction" },
      { id: "retrieval-bag", diameterMm: 5 },
      { id: "cholangiocatheter" },
    ],
    views: [
      {
        id: "cvs",
        name: L("Critical view of safety"),
        criteria: [
          { id: "triangle", name: L("Hepatocystic triangle cleared"), test: { cleared: "hepatocystic-triangle", atLeast: 1 } },
          { id: "plate", name: L("Lower third of the gallbladder off the cystic plate"), test: { cleared: "cystic-plate", atLeast: 1 } },
          { id: "two", name: L("Two and only two structures entering the gallbladder"), test: { onlyEntering: "gallbladder" } },
        ],
      },
    ],
    variants: [
      {
        id: "aberrant-duct",
        name: L("Aberrant right posterior duct"),
        summary: L("A sectoral duct crosses the triangle; until the triangle is fully cleared it looks like a duct entering the neck."),
        provenance: "authored",
        anatomy: [
          {
            id: "aberrant-right-posterior-duct",
            name: L("Aberrant right posterior sectoral duct"),
            kind: "duct",
            role: "critical",
            joins: ["common-hepatic-duct"],
            in: "hepatocystic-triangle",
            revealAt: 0.45,
            points: [[0.065, 0.125, -0.115], [0.04, 0.1, -0.112]],
            radius: 0.001,
            appearsAs: {
              default: L("a small duct coming out of the liver behind the neck and running down to the common duct"),
              when: [{ cleared: "hepatocystic-triangle", below: 1, text: L("a small duct that seems to run into the gallbladder neck"), appearsToEnter: "gallbladder" }],
            },
            provenance: "authored",
          },
        ],
      },
      {
        id: "posterior-artery",
        name: L("Double cystic artery"),
        summary: L("A posterior cystic artery runs on the cystic plate into the bed; it enters the gallbladder too."),
        provenance: "authored",
        anatomy: [
          {
            id: "posterior-cystic-artery",
            name: L("Posterior cystic artery"),
            kind: "artery",
            role: "target",
            joins: ["right-hepatic-artery"],
            enters: "gallbladder",
            in: "cystic-plate",
            revealAt: 0.6,
            crosses: "gallbladder-bed",
            points: [[0.045, 0.12, -0.118], [0.065, 0.095, -0.095]],
            radius: 0.0008,
            appearsAs: { default: L("a second thin vessel running onto the back of the gallbladder") },
            provenance: "authored",
          },
        ],
      },
      {
        id: "subvesical-duct",
        name: L("Subvesical duct"),
        summary: L("A fine duct runs in the gallbladder bed, close to the liver."),
        provenance: "authored",
        anatomy: [
          {
            id: "subvesical-duct",
            name: L("Subvesical duct"),
            kind: "duct",
            role: "target",
            in: "gallbladder-bed",
            revealAt: 0.4,
            crosses: "gallbladder-bed",
            points: [[0.07, 0.09, -0.08], [0.08, 0.07, -0.065]],
            radius: 0.0007,
            appearsAs: { default: L("a fine duct running in the gallbladder bed, close to the liver") },
            provenance: "authored",
          },
        ],
      },
      {
        id: "frozen-triangle",
        name: L("Dense fibrosis of the triangle"),
        summary: L("Severe chronic inflammation: the triangle cannot be cleared safely."),
        provenance: "authored",
        regions: [{ id: "hepatocystic-triangle", fibrosis: { safeTo: 0.5, finding: L("dense, woody fibrosis: the tissue planes do not separate") } }],
      },
    ],
  },
} as const;

/** The parsed fixture case. */
export function lapCholeCase(): CaseDefinition {
  const parsed = parseCase(structuredClone(LAP_CHOLE_SIT));
  if (!parsed.ok) throw new Error(`fixture invalid: ${JSON.stringify(parsed.issues.slice(0, 3))}`);
  return parsed.value;
}
