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

/* ------------------------------------------------------------------ */
/* Dynamic layer (state store, behaviours, policy, perception, bus)    */
/* ------------------------------------------------------------------ */

/** Names of the built-in operations (catalog behaviours name their own). */
export const OPERATION_NAMES: Record<string, Pair> = {
  navigate: { "zh-CN": "前往", en: "Go to" },
  approach: { "zh-CN": "走近", en: "Approach" },
  look_at: { "zh-CN": "看向", en: "Look at" },
  cancel: { "zh-CN": "取消", en: "Cancel" },
  order: { "zh-CN": "开具检查", en: "Order a test" },
  read: { "zh-CN": "查看结果", en: "Read a result" },
  use: { "zh-CN": "使用", en: "Use" },
  attach: { "zh-CN": "连接床旁监护", en: "Attach the bedside monitor" },
  cycle_nibp: { "zh-CN": "立即测量无创血压", en: "Cycle the NIBP cuff" },
  open: { "zh-CN": "打开", en: "Open" },
  close: { "zh-CN": "关闭", en: "Close" },
  lock: { "zh-CN": "上锁", en: "Lock" },
  unlock: { "zh-CN": "开锁", en: "Unlock" },
  wash_hands: { "zh-CN": "洗手", en: "Wash hands" },
  move_to: { "zh-CN": "推到指定位置", en: "Move to" },
  pick_up: { "zh-CN": "拿起", en: "Pick up" },
  put_down: { "zh-CN": "放下", en: "Put down" },
  equip: { "zh-CN": "佩戴", en: "Equip" },
};

/** Names of built-in states (catalog behaviours name their own). */
export const STATE_NAMES: Record<string, Pair> = {
  open: { "zh-CN": "开着", en: "open" },
  closed: { "zh-CN": "关着", en: "closed" },
  locked: { "zh-CN": "已上锁", en: "locked" },
  attached: { "zh-CN": "已连接", en: "attached" },
  detached: { "zh-CN": "未连接", en: "not attached" },
  held: { "zh-CN": "被拿着", en: "held" },
  equipped: { "zh-CN": "已佩戴", en: "equipped" },
  "out-of-service": { "zh-CN": "暂停使用", en: "out of service" },
};

/** Messages of the action bus, the spatial policy and perception ({placeholders} filled from vars). */
export const WORLD_MESSAGES: Record<string, Pair> = {
  // request / authority / device
  INVALID_REQUEST: { "zh-CN": "请求无效：{reason}。", en: "Invalid request: {reason}." },
  UNKNOWN_ACTOR: { "zh-CN": "未知的行动者「{actor}」。", en: 'Unknown actor "{actor}".' },
  OPERATION_NOT_SUPPORTED: { "zh-CN": "「{target}」不支持「{operation}」。可用操作：{available}。", en: '"{target}" does not support "{operation}". Its operations: {available}.' },
  NOT_AUTHORIZED: { "zh-CN": "{role}无权对「{target}」执行「{operation}」。", en: 'The role "{role}" may not "{operation}" {target}.' },
  DEVICE_BUSY: { "zh-CN": "「{target}」正被{holder}使用。", en: '"{target}" is in use by {holder}.' },
  DEVICE_UNAVAILABLE: { "zh-CN": "「{target}」暂停使用。", en: '"{target}" is out of service.' },
  STALE_STATE: { "zh-CN": "「{target}」的状态已变化（版本 {expected} → {actual}），请重新观察后再操作。", en: '"{target}" changed since you last looked (version {expected} → {actual}); observe it again.' },
  STALE_WORLD: { "zh-CN": "世界状态已变化（版本 {expected} → {actual}）。", en: "The world changed (version {expected} → {actual})." },
  HANDS_FULL: { "zh-CN": "双手已满（最多拿 {max} 件）。", en: "Your hands are full (at most {max} items)." },
  NOT_HOLDING: { "zh-CN": "你没有拿着「{target}」。", en: 'You are not holding "{target}".' },
  CANCELLED: { "zh-CN": "已取消。", en: "Cancelled." },
  PREEMPTED: { "zh-CN": "已被同一行动者的新指令取代。", en: "Superseded by a newer command for the same actor." },
  CLINICAL_REJECTED: { "zh-CN": "临床操作未执行：{output}", en: "The clinical action was not carried out: {output}" },
  APPROVAL_DENIED: { "zh-CN": "未获批准：{output}", en: "Not approved: {output}" },
  NO_PORT: { "zh-CN": "没有连接临床会话，无法执行临床操作。", en: "No clinical session is connected: clinical operations cannot run." },
  // preconditions
  "pre.state": { "zh-CN": "「{target}」当前{state}，不能「{operation}」。", en: 'Cannot "{operation}": {target} is {state}.' },
  "pre.handsClean": { "zh-CN": "请先做手卫生（在洗手池执行 wash_hands）。", en: "Clean your hands first (wash_hands at a sink)." },
  "pre.holding": { "zh-CN": "需要先拿着「{item}」。", en: 'You need to hold "{item}".' },
  "pre.role": { "zh-CN": "只有{roles}可以「{operation}」。", en: 'Only {roles} may "{operation}".' },
  "pre.notAtBedside": { "zh-CN": "「{target}」不在患者床旁——请先把它推到患者身边（move_to）。", en: '"{target}" is not at the patient\'s bedside — wheel it to the patient first (move_to).' },
  "pre.notAtBedsideFixed": { "zh-CN": "「{target}」不在患者床旁，且无法移动。", en: '"{target}" is not at the patient\'s bedside and cannot be moved.' },
  "pre.predicate": { "zh-CN": "「{operation}」的前提条件不满足。", en: 'The conditions for "{operation}" are not met.' },
  "pre.doorway": { "zh-CN": "门口有人，不能关门。", en: "Someone is standing in the doorway." },
  "pre.notPatientMonitor": { "zh-CN": "「{target}」不是该患者的监护仪。", en: '"{target}" is not this patient\'s monitor.' },
  "pre.heldByOther": { "zh-CN": "「{target}」在{holder}手里。", en: '"{target}" is held by {holder}.' },
  "pre.equipped": { "zh-CN": "「{target}」已佩戴。", en: '"{target}" is already equipped.' },
  "pre.noPatient": { "zh-CN": "这里没有患者。", en: "There is no patient here." },
  "pre.noItem": { "zh-CN": "本病例在「{target}」没有可做的项目。", en: 'There is nothing to do with "{target}" in this case.' },
  "pre.cannotProvide": { "zh-CN": "「{target}」不能提供「{item}」（需要：{caps}）。", en: '"{target}" cannot provide "{item}" (needs: {caps}).' },
  "pre.noSpot": { "zh-CN": "附近没有空位放下「{target}」。", en: 'There is no free spot nearby to leave "{target}".' },
  "pre.notPortable": { "zh-CN": "「{target}」不能移动。", en: '"{target}" cannot be moved.' },
  "pre.missingParam": { "zh-CN": "缺少参数 {param}。", en: "Missing parameter {param}." },
  "pre.unknownItem": { "zh-CN": "本病例没有「{item}」。", en: 'This case has no "{item}".' },
  // range / sight
  NOT_IN_RANGE: { "zh-CN": "距「{target}」{distance} 米，需在 {range} 米内。", en: '"{target}" is {distance} m away; within {range} m is needed.' },
  NOT_IN_RANGE_LEVEL: { "zh-CN": "「{target}」在另一层（{level}）。", en: '"{target}" is on another level ({level}).' },
  NOT_VISIBLE: { "zh-CN": "看不到「{target}」（视线被遮挡）。", en: 'No clear line of sight to "{target}".' },
  NO_ROUTE_HINT: { "zh-CN": "无法到达可以操作「{target}」的位置（{reason}）。", en: 'No reachable spot to operate "{target}" from ({reason}).' },
  // success
  "ok.arrived": { "zh-CN": "已到达「{target}」（{distance} 米，{seconds} 秒）。", en: 'Arrived at "{target}" ({distance} m, {seconds} s).' },
  "ok.there": { "zh-CN": "已在「{target}」。", en: 'Already at "{target}".' },
  "ok.interrupted": { "zh-CN": "移动被中断，停在 {distance} 米处。", en: "Movement interrupted after {distance} m." },
  "ok.done": { "zh-CN": "已完成：{operation}（{target}）。", en: "Done: {operation} ({target})." },
  "ok.state": { "zh-CN": "已完成：{operation}（{target}），当前{state}。", en: "Done: {operation} ({target}); it is now {state}." },
  "ok.clinical": { "zh-CN": "已完成：{operation}（{target}）。\n{output}", en: "Done: {operation} ({target}).\n{output}" },
  "ok.washed": { "zh-CN": "已完成手卫生（有效至第 {until} 分钟）。", en: "Hands cleaned (valid until minute {until})." },
  "ok.screen": { "zh-CN": "「{target}」屏幕：{screen}", en: '"{target}" screen: {screen}' },
  "ok.moved": { "zh-CN": "已把「{target}」推到 {place}（{distance} 米）。", en: 'Moved "{target}" to {place} ({distance} m).' },
  "ok.cancelled": { "zh-CN": "已取消 {count} 个进行中的操作。", en: "Cancelled {count} pending action(s)." },
  // spatial policy (reasons)
  "spatial.not-near-patient": { "zh-CN": "距{patient} {distance} 米，需在 {range} 米内且视线无遮挡。", en: "You are {distance} m from {patient}; within {range} m with a clear view is needed." },
  "spatial.patient-not-visible": { "zh-CN": "{patient}在 {range} 米范围内，但视线被遮挡。", en: "{patient} is within {range} m but out of sight." },
  "spatial.not-at-patient": { "zh-CN": "需要在{patient}身边（{range} 米内），当前相距 {distance} 米。", en: "You need to be at {patient}'s side (within {range} m); you are {distance} m away." },
  "spatial.no-provider-in-reach": { "zh-CN": "需要{caps}：请到「{provider}」操作（最近）。", en: 'Needs {caps}: go to "{provider}" (nearest).' },
  "spatial.no-provider-in-reach-none": { "zh-CN": "需要{caps}：附近没有可用设备。", en: "Needs {caps}: no usable station is within reach." },
  "spatial.provider-not-at-bedside": { "zh-CN": "床旁需要{caps}；「{provider}」在别处——请把它推到{patient}身边（move_to）。", en: 'Needs {caps} at the bedside; "{provider}" is elsewhere — wheel it to {patient} (move_to).' },
  "spatial.provider-not-at-bedside-fixed": { "zh-CN": "床旁需要{caps}，但提供它的设备都固定在别处，无法推来。", en: "Needs {caps} at the bedside, but every device providing it is fixed elsewhere and cannot be brought." },
  "spatial.no-provider-in-facility": { "zh-CN": "本院没有可用的设备提供{caps}。", en: "Nothing usable in this facility provides {caps}." },
  "spatial.no-patient": { "zh-CN": "这个世界里没有患者。", en: "There is no patient in this world." },
  // hint labels
  "hint.patient": { "zh-CN": "前往{patient}身边", en: "Go to {patient}" },
  "hint.provider": { "zh-CN": "前往「{provider}」", en: 'Go to "{provider}"' },
  "hint.fetch": { "zh-CN": "取来「{provider}」并推到{patient}身边（move_to）", en: 'Fetch "{provider}" and wheel it to {patient} (move_to)' },
  "hint.look": { "zh-CN": "移动到能看清「{target}」的位置", en: 'Get a clear view of "{target}"' },
  "hint.approach": { "zh-CN": "走近「{target}」", en: 'Approach "{target}"' },
  // perception
  "screen.notRecorded": { "zh-CN": "未记录读数", en: "no reading recorded" },
  "screen.noReading": { "zh-CN": "无读数", en: "no reading" },
  "screen.alarms": { "zh-CN": "报警：{alarms}", en: "alarms: {alarms}" },
  "cue.distressed": { "zh-CN": "看起来很痛苦", en: "visibly distressed" },
  "cue.speaking": { "zh-CN": "正在说话", en: "speaking" },
  "level.warning": { "zh-CN": "警告", en: "warning" },
  "level.critical": { "zh-CN": "危急", en: "critical" },
};

/** One-line event summaries (WorldEventSummary). */
export const EVENT_SUMMARIES: Record<string, Pair> = {
  "actor.moved": { "zh-CN": "{actor}移动了 {distance} 米", en: "{actor} moved {distance} m" },
  "actor.entered-room": { "zh-CN": "{actor}进入{room}", en: "{actor} entered {room}" },
  "actor.left": { "zh-CN": "{actor}离开了房间", en: "{actor} left the room" },
  "actor.discovered": { "zh-CN": "{actor}注意到 {count} 个新对象", en: "{actor} noticed {count} new thing(s)" },
  "entity.state": { "zh-CN": "{target}：{from} → {to}", en: "{target}: {from} → {to}" },
  "entity.moved": { "zh-CN": "{target}被移动了", en: "{target} was moved" },
  "item.held": { "zh-CN": "{actor}拿起了{target}", en: "{actor} picked up {target}" },
  "item.dropped": { "zh-CN": "{actor}放下了{target}", en: "{actor} put down {target}" },
  "door.changed": { "zh-CN": "{target}：{state}", en: "{target}: {state}" },
  "reservation.changed": { "zh-CN": "{target}由{actor}占用", en: "{target} reserved by {actor}" },
  "reservation.released": { "zh-CN": "{target}已释放", en: "{target} released" },
  "obstacle.changed": { "zh-CN": "障碍：{label}", en: "Obstacle: {label}" },
  "obstacle.cleared": { "zh-CN": "障碍已清除：{label}", en: "Obstacle cleared: {label}" },
  "entity.availability": { "zh-CN": "{target}暂停使用", en: "{target} out of service" },
  "entity.available": { "zh-CN": "{target}恢复使用", en: "{target} back in service" },
  hygiene: { "zh-CN": "{actor}完成了手卫生", en: "{actor} cleaned their hands" },
  "task.changed": { "zh-CN": "{actor}：{label}", en: "{actor}: {label}" },
  "task.idle": { "zh-CN": "{actor}空闲", en: "{actor} is idle" },
  "action.completed": { "zh-CN": "{actor}：{operation}（{status}）", en: "{actor}: {operation} ({status})" },
};

/** Localised world message for a key ({placeholders} filled from vars; unknown keys are returned as is). */
export function worldMessage(key: string, locale: string, vars: Record<string, string | number> = {}): string {
  const pair = WORLD_MESSAGES[key] ?? EVENT_SUMMARIES[key];
  return pair ? fill(t(pair, locale), vars) : key;
}

/** Localised operation name: the behaviour's own name, else the built-in one, else the id. */
export function operationName(op: string, locale: string, own?: LocalizedText): string {
  if (own) return t(own, locale);
  const pair = OPERATION_NAMES[op];
  return pair ? t(pair, locale) : op;
}

/** Localised state name: the behaviour's own name, else the built-in one, else the id. */
export function stateName(state: string, locale: string, own?: LocalizedText): string {
  if (own) return t(own, locale);
  const pair = STATE_NAMES[state];
  return pair ? t(pair, locale) : state;
}

/** Metres with one decimal ("3.4"). */
export function metres(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : "∞";
}

/** A list in the reader's language ("a, b" / "a、b"). */
export function listText(items: readonly string[], locale: string): string {
  return items.join(locale.toLowerCase().startsWith("zh") ? "、" : ", ");
}
