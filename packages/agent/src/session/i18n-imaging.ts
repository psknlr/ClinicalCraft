/**
 * Runtime strings of a study done on the patient at a device in the world (docs/EMBODIED.md §8.7, audit 2026-11-12
 * P1-7): an order that waits for the patient there ("ordered — the patient must go to CT" / "已开单——患者需要去CT"),
 * the acquisition, a read refused before it. Merged into `./i18n.ts`. Words follow docs/GLOSSARY.md.
 */

export const IMAGING_EN = {
  "label.atModality": "ordered — the patient must go to {modality}",
  "tool.ordered.atModality": "Not done yet — the patient must go to {modality}: the study is done there, and its result comes {minutes} min after it.",
  "tool.ordered.atModalityNow": "{patient} is at {modality}: the study is done now; result expected at {time} (now {now}).",
  "tool.read.notAcquired": "{name} has been ordered but not done: the patient must go to {modality} for it. Its result comes {minutes} min after the study.",
  "tool.results.atModality": "{name} ({phase}) has been ordered but not done: the patient must go to {modality}.",
  "notify.acquired.title": "Study done",
  "notify.acquired.body": "{name}: the study has been done; the report is due at {time}.",
  "nurse.offline.atModality": "Ordered, not done yet — the patient has to go for them: {list}.",
  "acquire.handEntry": "A study done on the patient at a device is recorded as done when the patient is there, not entered by hand: take the patient to it.",
} as const;

export const IMAGING_ZH: Record<keyof typeof IMAGING_EN, string> = {
  "label.atModality": "已开单——患者需要去{modality}",
  "tool.ordered.atModality": "尚未完成——患者需要去{modality}：检查在那里完成，结果在检查后{minutes}分钟出来。",
  "tool.ordered.atModalityNow": "{patient}已在{modality}：检查现在完成；预计{time}出结果（现在{now}）。",
  "tool.read.notAcquired": "{name}已开单但尚未完成：患者需要去{modality}做这项检查。结果在检查完成后{minutes}分钟出来。",
  "tool.results.atModality": "{name}（{phase}）已开单但尚未完成：患者需要去{modality}。",
  "notify.acquired.title": "检查已完成",
  "notify.acquired.body": "{name}：检查已完成；报告预计{time}发出。",
  "nurse.offline.atModality": "已开单、尚未做——要把患者送过去：{list}。",
  "acquire.handEntry": "在设备上为患者完成的检查，由医院在患者到达设备时记录完成，不能手工录入：请把患者送过去。",
};
