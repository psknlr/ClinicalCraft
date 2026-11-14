/**
 * A request about the operative field in words (docs/TEAM.md §4.4), in both languages: as it is asked ("Dr Abe, please
 * hold the grasper in port B, pulling the infundibulum caudally."), read back ("The grasper in port B, pulling the
 * infundibulum caudally — confirm?") and reported ("Holding."). Words follow docs/GLOSSARY.md (扶镜, 推近, 拉远, 递器械,
 * 术者). Pure: what is named comes from the asker's own view — the people, the port as the field shows it, the names
 * of the operation's parts and regions.
 */
import type { DirectionName, FieldView, InstrumentId } from "@clinicalcraft/core";
import { procedureLabel } from "../i18n-procedure.js";
import { joinBoth, phrase, type Bilingual } from "./i18n.js";
import type { FieldAsk, MemberId } from "./types.js";

/** What naming a request needs from a member's view: people, the operation's parts and regions, the field in sight. */
export interface AskWords {
  name(who: MemberId): Bilingual;
  /** A part or a region of the operation by its name (else its id). */
  label(id: string): Bilingual;
  field: FieldView | null;
}

const NONE: Bilingual = { en: "", "zh-CN": "" };
const plain = (text: string): Bilingual => ({ en: text, "zh-CN": text });

/** An instrument of the field in both languages ("grasper" / "抓钳"). */
export function instrumentWords(id: InstrumentId | string): Bilingual {
  return { en: procedureLabel("en", id), "zh-CN": procedureLabel("zh-CN", id) };
}

/** A name as a sentence says it: "the infundibulum" / "胆囊颈". */
export function theWords(name: Bilingual): Bilingual {
  return phrase("clause.the", { name: { en: name.en.charAt(0).toLowerCase() + name.en.slice(1), "zh-CN": name["zh-CN"] } });
}

/** Which way a traction pulls ("to the patient's left and caudally" / "患者左侧、尾侧"). */
function directionWords(direction: readonly DirectionName[] | undefined): Bilingual {
  return direction?.length ? joinBoth(direction.map((d) => phrase(`clause.dir.${d}`)), "and") : NONE;
}

/** How hard, when it is not the usual firm pull (", gently" / "，轻柔一些"). */
function forceWords(force: FieldAsk["force"]): Bilingual {
  return force === "gentle" ? phrase("clause.force.gentle") : force === "excessive" ? phrase("clause.force.excessive") : NONE;
}

/** The instrument a traction is held with: the one in the port, else the grasper put into it. */
function tractionInstrument(w: AskWords, ask: FieldAsk): Bilingual {
  const p = w.field?.ports.find((x) => x.port === ask.port);
  return instrumentWords(p?.instrument ?? "grasper");
}

/** The camera port a request works (the one named, else the one the picture comes from), or null when unknown. */
export function cameraPortOf(f: FieldView | null, ask: FieldAsk): string | null {
  return ask.port ?? f?.camera?.port ?? f?.ports.find((p) => p.role === "camera")?.port ?? null;
}

function tractionParams(w: AskWords, ask: FieldAsk): Record<string, Bilingual> {
  return {
    instrument: tractionInstrument(w, ask),
    port: plain(ask.port ?? ""),
    structure: theWords(w.label(ask.structure ?? "")),
    direction: directionWords(ask.direction),
    force: forceWords(ask.force),
  };
}

/** The request as the asker says it to `to`. */
export function askText(w: AskWords, ask: FieldAsk, to: MemberId): Bilingual {
  const who = { to: w.name(to) };
  switch (ask.op) {
    case "traction":
      return phrase("ask.traction", { ...who, ...tractionParams(w, ask) });
    case "release":
      return ask.port ? phrase("ask.release", { ...who, port: plain(ask.port) }) : phrase("ask.releaseAll", who);
    case "camera":
      return phrase("ask.camera", who);
    case "aim":
      return phrase(ask.zoom === "close" ? "ask.aimClose" : "ask.aim", { ...who, region: theWords(w.label(ask.region ?? "")) });
    case "zoom":
      return phrase(ask.zoom === "close" ? "ask.closer" : "ask.wider", who);
    case "pass":
      return phrase("ask.pass", { ...who, instrument: instrumentWords(ask.instrument ?? "") });
  }
}

/** The request read back by the one asked, to the asker (check-back step 2). */
export function readbackText(w: AskWords, ask: FieldAsk, asker: MemberId): Bilingual {
  switch (ask.op) {
    case "traction":
      return phrase("readback.traction", tractionParams(w, ask));
    case "release":
      return ask.port ? phrase("readback.release", { port: plain(ask.port) }) : phrase("readback.releaseAll");
    case "camera": {
      const port = cameraPortOf(w.field, ask);
      return port ? phrase("readback.camera", { port: plain(port) }) : phrase("readback.cameraAny");
    }
    case "aim":
      return phrase(ask.zoom === "close" ? "readback.aimClose" : "readback.aim", { region: theWords(w.label(ask.region ?? "")) });
    case "zoom":
      return phrase(ask.zoom === "close" ? "readback.closer" : "readback.wider");
    case "pass":
      return phrase("readback.pass", { instrument: instrumentWords(ask.instrument ?? ""), for: w.name(asker) });
  }
}

/** What is reported once a request is done ("Holding.", "Passed."); letting go is said before it is done. */
export function reportText(w: AskWords, ask: FieldAsk): Bilingual {
  switch (ask.op) {
    case "traction":
      return phrase("report.holding");
    case "release":
      return phrase("report.lettingGo");
    case "camera":
      return phrase("report.camera");
    case "aim":
      return phrase("report.aimed", { region: theWords(w.label(ask.region ?? "")) });
    case "zoom":
      return phrase(ask.zoom === "close" ? "report.closer" : "report.wider");
    case "pass":
      return phrase("report.passed");
  }
}
