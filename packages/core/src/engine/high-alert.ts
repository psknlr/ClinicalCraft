/**
 * High-alert medicines (ISMP's list, by the item's name in any locale): the medicines whose dose errors are the ones
 * that kill. A twofold dose error, or another route, with one of them is critical whatever the case's risk label
 * (`doseErrorSeverity`), and one whose dose text states one dose has a preset (`cases validate`, docs/CASE_AUTHORING.md
 * §6, §9.8). Pure: no I/O, no clock.
 */
import type { LocalizedText } from "../i18n.js";
import type { Intervention } from "../schema/case.js";
import type { DoseRoute } from "../schema/common.js";
import { doseRoute } from "./dose-read.js";

/**
 * High-alert by any route: insulins, anticoagulants (heparins, warfarin, the factor Xa and thrombin inhibitors),
 * opioids, thrombolytics.
 */
const ANY_ROUTE =
  /insulin|heparin|enoxaparin|dalteparin|tinzaparin|nadroparin|fondaparinux|\blmwh\b|\bufh\b|warfarin|rivaroxaban|apixaban|edoxaban|dabigatran|argatroban|bivalirudin|morphine|fentanyl|oxycodone|hydromorphone|pethidine|meperidine|diamorphine|methadone|tramadol|opioid|alteplase|tenecteplase|reteplase|streptokinase|urokinase|thromboly|fibrinoly|胰岛素|肝素|华法林|利伐沙班|阿哌沙班|艾多沙班|达比加群|阿加曲班|比伐芦定|吗啡|芬太尼|羟考酮|氢吗啡酮|哌替啶|美沙酮|曲马多|阿片|阿替普酶|替奈普酶|瑞替普酶|尿激酶|链激酶|溶栓/iu;

/**
 * High-alert given intravenously or intraosseously, as ISMP names them: potassium (concentrated potassium chloride and
 * potassium phosphates for injection — never oral potassium, nor potassium-sparing drugs), adrenergic agonists
 * (adrenaline, noradrenaline, phenylephrine) and vasopressin, magnesium sulfate, sedation agents (midazolam, propofol,
 * dexmedetomidine, ketamine), neuromuscular blockers, antiarrhythmics (amiodarone, lidocaine) and inotropes (digoxin,
 * milrinone).
 */
const PARENTERAL =
  /\bpotassium\b(?![\s-]*sparing)|\bkcl\b|氯化钾|磷酸钾|补钾|adrenaline|epinephrine|phenylephrine|vasopressin|magnesium\s+sul(?:ph|f)ate|\bmgso4\b|midazolam|propofol|dexmedetomidine|ketamine|rocuronium|vecuronium|suxamethonium|succinylcholine|atracurium|amiodarone|lidocaine|lignocaine|digoxin|milrinone|肾上腺素|去氧肾上腺素|血管加压素|硫酸镁|咪达唑仑|丙泊酚|右美托咪定|氯胺酮|罗库溴铵|维库溴铵|琥珀胆碱|阿曲库铵|胺碘酮|利多卡因|地高辛|米力农/iu;

/** A name's words that say it runs into a vein: an infusion, a drip, a pump. */
const INFUSION = /\binfusion\b|\bdrip\b|输注|泵入|静滴|滴注/iu;

/** Every text of a localised value. */
const textsOf = (x: LocalizedText | undefined): string[] => (x == null ? [] : typeof x === "string" ? [x] : Object.values(x).filter((v): v is string => typeof v === "string"));

/** The route an item is given by: its preset's, else the one its dose text or its name states (an infusion is IV). */
function itemRoute(iv: Pick<Intervention, "name" | "dose" | "doseSpec">): DoseRoute | null {
  if (iv.doseSpec?.route) return iv.doseSpec.route;
  for (const text of [...textsOf(iv.dose), ...textsOf(iv.name)]) {
    const route = doseRoute(text);
    if (route) return route;
  }
  return textsOf(iv.name).some((n) => INFUSION.test(n)) ? "IV" : null;
}

/**
 * Is the intervention a high-alert medicine (by its name, any locale)? Insulins, anticoagulants, opioids and
 * thrombolytics by any route; potassium, adrenaline, noradrenaline, phenylephrine, vasopressin, magnesium sulfate,
 * sedation agents, neuromuscular blockers, antiarrhythmics, digoxin and milrinone given IV or IO (their route: the
 * preset's, else the one the dose text or the name states).
 */
export function isHighAlert(iv: Pick<Intervention, "name"> & Partial<Pick<Intervention, "kind" | "dose" | "doseSpec">>): boolean {
  if (iv.kind != null && iv.kind !== "medication") return false;
  const names = textsOf(iv.name);
  if (names.some((n) => ANY_ROUTE.test(n))) return true;
  if (!names.some((n) => PARENTERAL.test(n))) return false;
  const route = itemRoute(iv as Pick<Intervention, "name" | "dose" | "doseSpec">);
  return route === "IV" || route === "IO";
}
