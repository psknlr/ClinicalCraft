/**
 * Bilingual (zh-CN + en) runtime strings of the world model: entity names it
 * synthesises (doors, the implicit level), public descriptors (roles,
 * postures, age/sex tags) and navigation messages. Content text stays
 * `LocalizedText` in the facility/catalog data.
 */
import { t, type LocalizedText } from "@clinicalcraft/core";

type Pair = { "zh-CN": string; en: string };

/** Staff and actor role names. */
export const ROLE_NAMES: Record<string, Pair> = {
  clinician: { "zh-CN": "医生", en: "Clinician" },
  nurse: { "zh-CN": "护士", en: "Nurse" },
  radiologist: { "zh-CN": "放射科医生", en: "Radiologist" },
  pathologist: { "zh-CN": "病理科医生", en: "Pathologist" },
  "lab-tech": { "zh-CN": "检验技师", en: "Lab technician" },
  attending: { "zh-CN": "上级医师", en: "Attending" },
  pharmacist: { "zh-CN": "药师", en: "Pharmacist" },
  receptionist: { "zh-CN": "导诊", en: "Receptionist" },
  paramedic: { "zh-CN": "急救员", en: "Paramedic" },
  porter: { "zh-CN": "护工", en: "Porter" },
};

export const POSTURE_NAMES: Record<string, Pair> = {
  standing: { "zh-CN": "站立", en: "standing" },
  sitting: { "zh-CN": "坐着", en: "sitting" },
  lying: { "zh-CN": "躺着", en: "lying" },
};

const SEX: Record<string, Pair> = {
  male: { "zh-CN": "男性", en: "male" },
  female: { "zh-CN": "女性", en: "female" },
  intersex: { "zh-CN": "间性", en: "intersex" },
  unspecified: { "zh-CN": "性别未注明", en: "sex not stated" },
};

const AGE: Record<string, Pair> = {
  years: { "zh-CN": "{n}岁", en: "{n} years" },
  months: { "zh-CN": "{n}个月", en: "{n} months" },
  days: { "zh-CN": "{n}天", en: "{n} days" },
};

const fill = (pattern: string, vars: Record<string, string | number>) => pattern.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));

/** Localised role name ("护士" / "Nurse"); unknown roles are returned as is. */
export function roleName(role: string, locale: string): string {
  const r = ROLE_NAMES[role];
  return r ? t(r, locale) : role;
}

/** Bilingual role name (LocalizedText). */
export function roleText(role: string): LocalizedText {
  return ROLE_NAMES[role] ?? role;
}

/** Localised posture ("躺着" / "lying"). */
export function postureName(posture: string, locale: string): string {
  const p = POSTURE_NAMES[posture];
  return p ? t(p, locale) : posture;
}

/** Bystander age/sex tag, the same wording as the web name tag: "74岁男性" / "74 years male". */
export function ageSexTag(patient: { age: number; ageUnit?: string; sex: string }, locale: string): string {
  const age = fill(t(AGE[patient.ageUnit ?? "years"] ?? AGE.years, locale), { n: patient.age });
  const sex = t(SEX[patient.sex] ?? SEX.unspecified, locale);
  return locale.toLowerCase().startsWith("zh") ? `${age}${sex}` : `${age} ${sex}`;
}

/** Door name: "<owner>大门" / "<owner> door" (building entrance), "<owner>门" / "<owner> door" (room). */
export function doorName(ownerName: LocalizedText, interior: boolean): LocalizedText {
  const zh = t(ownerName, "zh-CN");
  const en = t(ownerName, "en");
  return { "zh-CN": `${zh}${interior ? "门" : "大门"}`, en: `${en} door` };
}

/** Navigation failure messages ({placeholders} filled from details). */
export const NAV_MESSAGES: Record<string, Pair> = {
  TARGET_NOT_FOUND: { "zh-CN": "找不到目标「{target}」。", en: 'Target "{target}" not found.' },
  TARGET_NOT_REACHABLE: { "zh-CN": "无法从当前位置到达「{target}」。", en: 'No path from here to "{target}".' },
  PATH_BLOCKED: { "zh-CN": "通往「{target}」的路线被阻挡（{blockers}）。", en: 'The way to "{target}" is blocked ({blockers}).' },
  ACCESS_DENIED: { "zh-CN": "{role}无权通过前往「{target}」途中的限制区域（{zones}）。", en: 'Access denied for the role "{role}": the way to "{target}" crosses a restricted area ({zones}).' },
  NO_INTERACTION_POINT: { "zh-CN": "「{target}」周围没有可站立、可直视的操作位置。", en: 'There is no free spot within reach of "{target}" with a clear view of it.' },
  NAVIGATION_TIMEOUT: { "zh-CN": "路径规划超出搜索上限（{target}）。", en: 'Path planning to "{target}" exceeded its search budget.' },
  STALE_DESTINATION: { "zh-CN": "目标「{target}」已移动。", en: 'Target "{target}" has moved.' },
  MOVEMENT_INTERRUPTED: { "zh-CN": "移动被中断。", en: "Movement interrupted." },
};

/** Localised navigation message for an error code. */
export function navMessage(code: string, locale: string, vars: Record<string, string | number>): string {
  const pair = NAV_MESSAGES[code] ?? { "zh-CN": code, en: code };
  return fill(t(pair, locale), vars);
}
