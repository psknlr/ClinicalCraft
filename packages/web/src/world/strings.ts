/**
 * World-level strings (toasts, hints, door names). The world runs without
 * the UI i18n bundle, so it carries its own tiny zh-CN / en table.
 */

export type LocalizedText = string | { [locale: string]: string } | undefined | null;

/** Same resolution rules as core `t()` (exact → base language → en → zh-CN → first). */
export function tx(text: LocalizedText, locale: string): string {
  if (text == null) return "";
  if (typeof text === "string") return text;
  if (text[locale] != null) return text[locale];
  const base = locale.split("-")[0];
  for (const key of Object.keys(text)) if (key.split("-")[0] === base) return text[key];
  return text.en ?? text["zh-CN"] ?? Object.values(text)[0] ?? "";
}

const STRINGS = {
  "zh-CN": {
    selectBlock: ["先选择建造方块", "按 4–7 选择材料；前往建造园地。"],
    protected: ["这是受保护的场景", "可以采集园地里独立摆放或自己搭建的方块。"],
    cannotPlace: ["无法放置在这里", "只可在标出的建造园地内搭建，并为自己留出空间。"],
    noMaterial: ["材料不足", "采集园地材料，或在工作台合成。"],
    full: ["建造园地已达到容量", "先拆除一些方块再继续。"],
    leaveDoor: ["请先离开门口", "避免大门关闭时与角色重叠。"],
    approach: ["走近患者再交谈", "患者在接诊区；按 M 查看地图。"],
    dragLook: ["已启用拖动视角", "按住鼠标左键转头，E 交互；方向键也可转头。"],
    doorOpen: "打开大门",
    doorClose: "关闭大门",
    door: "大门",
    roomDoorOpen: "开门",
    roomDoorClose: "关门",
    roomDoor: "门",
    talk: "E · 交谈",
    use: "E · 使用",
    buildZone: "建造园地",
    north: "北 ↑",
    patient: "患者",
    unreachable: "无法到达目标",
  },
  en: {
    selectBlock: ["Select a building block first", "Press 4–7 to pick a material, then go to the build zone."],
    protected: ["This scenery is protected", "You can only mine blocks placed in the build zone."],
    cannotPlace: ["Cannot place here", "Build only inside the marked zone and leave room for yourself."],
    noMaterial: ["Not enough material", "Mine blocks in the zone or craft at the bench."],
    full: ["The build zone is full", "Remove some blocks first."],
    leaveDoor: ["Step out of the doorway first", "The door would close on you."],
    approach: ["Walk up to the patient to talk", "Press M to open the map."],
    dragLook: ["Drag-to-look enabled", "Hold the left mouse button to look around; E to interact; arrow keys also turn."],
    doorOpen: "Open door",
    doorClose: "Close door",
    door: "door",
    roomDoorOpen: "Open door",
    roomDoorClose: "Close door",
    roomDoor: "door",
    talk: "E · Talk",
    use: "E · Use",
    buildZone: "Build zone",
    north: "N ↑",
    patient: "Patient",
    unreachable: "Target unreachable",
  },
} as const;

export type StringKey = keyof (typeof STRINGS)["en"];

export function strings(locale: string) {
  return locale.toLowerCase().startsWith("zh") ? STRINGS["zh-CN"] : STRINGS.en;
}

export const ROLE_NAMES: Record<string, { "zh-CN": string; en: string }> = {
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

export function roleName(role: string, locale: string): string {
  const r = ROLE_NAMES[role];
  return r ? tx(r, locale) : role;
}
