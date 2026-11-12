/**
 * The open-surgery view (after a conversion, docs/PROCEDURE.md): the laparoscope is out, so the surgery window and
 * the scope dock stop showing a scope picture and show the field as it is worked open instead — each dissection
 * field and how far it is cleared, each tubular structure with its clips, division and the name given to it. Pure:
 * the lines come from the field view (`observeField`), the same for both views.
 */
import { t, type FieldView } from "@clinicalcraft/core";

/** Has the operation been converted to open surgery? */
export function convertedToOpen(v: Pick<FieldView, "bailouts">): boolean {
  return (v.bailouts ?? []).includes("convert-open");
}

/** Words the view needs, in the learner's language. */
export interface OpenFieldWords {
  title: string;
  region: (name: string, dissection: string) => string;
  tube: (handle: string, named: string | null, clips: number, divided: boolean) => string;
  dissection: (state: FieldView["regions"][number]["dissection"]) => string;
}

/** The open field in lines: a title, then the dissection fields, then the tubular structures. */
export function openFieldLines(v: FieldView, locale: string, w: OpenFieldWords): string[] {
  return [w.title, ...v.regions.map((r) => w.region(t(r.name, locale), w.dissection(r.dissection))), ...v.tubes.map((x) => w.tube(x.handle, x.namedAs, x.clips, x.divided))];
}

/** The open field as the views show it: its lines in the learner's language (`tr`, the surgery labels). */
export function openFieldText(v: FieldView, locale: string, tr: (key: "open.title" | "open.region" | "open.tube" | "open.named" | "open.divided", params?: Record<string, string | number>) => string, label: (group: "dissection", value: string) => string, nameOf: (structure: string) => string): string[] {
  return openFieldLines(v, locale, {
    title: tr("open.title"),
    region: (name, dissection) => tr("open.region", { name, dissection }),
    tube: (handle, named, clips, divided) => tr("open.tube", { handle, named: named ? tr("open.named", { name: nameOf(named) }) : "", clips, divided: divided ? tr("open.divided") : "" }),
    dissection: (state) => label("dissection", state),
  });
}
