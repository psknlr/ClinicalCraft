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
  transport_patient: { "zh-CN": "转运患者", en: "Transport the patient" },
};

/** Room kinds in words (a destination's `roomKind`). */
export const ROOM_KIND_NAMES: Record<string, Pair> = {
  entrance: { "zh-CN": "入口", en: "entrance" },
  reception: { "zh-CN": "接待处", en: "reception" },
  waiting: { "zh-CN": "候诊区", en: "waiting area" },
  consult: { "zh-CN": "诊室", en: "consulting room" },
  triage: { "zh-CN": "分诊台", en: "triage" },
  resus: { "zh-CN": "抢救室", en: "resuscitation room" },
  emergency: { "zh-CN": "急诊诊室", en: "emergency cubicle" },
  ward: { "zh-CN": "病房", en: "ward" },
  icu: { "zh-CN": "重症监护室", en: "intensive care unit" },
  "operating-room": { "zh-CN": "手术室", en: "operating theatre" },
  imaging: { "zh-CN": "影像室", en: "imaging room" },
  laboratory: { "zh-CN": "检验科", en: "laboratory" },
  pathology: { "zh-CN": "病理科", en: "pathology" },
  pharmacy: { "zh-CN": "药房", en: "pharmacy" },
  "nurse-station": { "zh-CN": "护士站", en: "nurse station" },
  conference: { "zh-CN": "会议室", en: "conference room" },
  office: { "zh-CN": "办公室", en: "office" },
  corridor: { "zh-CN": "走廊", en: "corridor" },
  storage: { "zh-CN": "储物间", en: "store room" },
  restroom: { "zh-CN": "卫生间", en: "restroom" },
  garden: { "zh-CN": "花园", en: "garden" },
  "build-zone": { "zh-CN": "建造区", en: "build zone" },
  rehabilitation: { "zh-CN": "康复室", en: "rehabilitation gym" },
  teaching: { "zh-CN": "示教室", en: "teaching room" },
  elevator: { "zh-CN": "电梯", en: "lift" },
  stairwell: { "zh-CN": "楼梯间", en: "stairwell" },
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
  "pre.handsClean": { "zh-CN": "请先在洗手池做手卫生。", en: "Clean your hands at a sink first." },
  "pre.holding": { "zh-CN": "需要先拿着「{item}」。", en: 'You need to hold "{item}".' },
  "pre.role": { "zh-CN": "只有{roles}可以「{operation}」。", en: 'Only {roles} may "{operation}".' },
  "pre.notAtBedside": { "zh-CN": "「{target}」不在患者床旁——请先把它推到患者身边。", en: '"{target}" is not at the patient\'s bedside — wheel it to the patient first.' },
  "pre.notAtBedsideFixed": { "zh-CN": "「{target}」不在患者床旁，且无法移动。", en: '"{target}" is not at the patient\'s bedside and cannot be moved.' },
  "pre.notOperableCart": { "zh-CN": "「{target}」离{patient}太远，没法在患者身边操作——请先把它推到患者身边。", en: '"{target}" is too far from {patient} to be used at their side — wheel it to the patient first.' },
  "pre.notOperableFixed": { "zh-CN": "「{target}」固定在别处，在{patient}身边够不到——请用患者自己床旁的设备，或推一台便携设备来。", en: '"{target}" is fixed out of reach of {patient}\'s side — use the equipment at the patient\'s own bedside, or bring a portable one.' },
  "pre.notOperableHandheld": { "zh-CN": "请先拿起「{target}」带到{patient}身边。", en: 'Pick up "{target}" and bring it to {patient}.' },
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
  "pre.noDestination": { "zh-CN": "要把患者送到哪里？请给出目的地：设备、床位、房间，或送回原床位", en: "where to? Give a destination: a device, a bed space, a room, or back to their own bed space" },
  "pre.unknownDestination": { "zh-CN": "这里没有可以把患者送去的「{destination}」。", en: 'There is no "{destination}" here to take the patient to.' },
  "pre.patientBusy": { "zh-CN": "{patient}正由{holder}转运中。", en: "{patient} is being moved by {holder}." },
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
  "ok.transported": { "zh-CN": "已把{patient}送到{place}（{distance} 米）。", en: "Took {patient} to {place} ({distance} m)." },
  "ok.patientThere": { "zh-CN": "{patient}已在{place}。", en: "{patient} is already at {place}." },
  // relocation by the team (a transfer, a phase with a location)
  "relocate.done": { "zh-CN": "{patient}已被送到{place}。", en: "{patient} has been moved to {place}." },
  "relocate.already": { "zh-CN": "{patient}已在{place}。", en: "{patient} is already at {place}." },
  "relocate.none": { "zh-CN": "本院没有{destination}：{patient}留在{place}。", en: "This hospital has no {destination}: {patient} stays in {place}." },
  "dest.home": { "zh-CN": "原床位", en: "their own bed space" },
  "dest.roomKind": { "zh-CN": "{kind}", en: "{kind}" },
  "setting.outpatient": { "zh-CN": "门诊诊室", en: "outpatient consulting room" },
  "setting.emergency": { "zh-CN": "急诊床位", en: "emergency bed space" },
  "setting.inpatient": { "zh-CN": "住院病床", en: "inpatient bed" },
  "setting.icu": { "zh-CN": "ICU/HDU 床位", en: "ICU/HDU bed" },
  "setting.ward": { "zh-CN": "病房床位", en: "ward bed" },
  "setting.operating-room": { "zh-CN": "手术室", en: "operating theatre" },
  "setting.community": { "zh-CN": "院外场所", en: "place outside the hospital" },
  // spatial policy (reasons)
  "spatial.not-near-patient": { "zh-CN": "距{patient} {distance} 米，需在 {range} 米内且视线无遮挡。", en: "You are {distance} m from {patient}; within {range} m with a clear view is needed." },
  "spatial.patient-not-visible": { "zh-CN": "{patient}在 {range} 米范围内，但视线被遮挡。", en: "{patient} is within {range} m but out of sight." },
  "spatial.not-at-patient": { "zh-CN": "需要在{patient}身边（{range} 米内），当前相距 {distance} 米。", en: "You need to be at {patient}'s side (within {range} m); you are {distance} m away." },
  "spatial.no-provider-in-reach": { "zh-CN": "需要{caps}：请到「{provider}」操作（最近）。", en: 'Needs {caps}: go to "{provider}" (nearest).' },
  "spatial.no-provider-in-reach-none": { "zh-CN": "需要{caps}：附近没有可用设备。", en: "Needs {caps}: no usable station is within reach." },
  "spatial.provider-not-at-bedside": { "zh-CN": "床旁需要{caps}；「{provider}」在别处——请把它推到{patient}身边。", en: 'Needs {caps} at the bedside; "{provider}" is elsewhere — wheel it to {patient}.' },
  "spatial.provider-not-at-bedside-fixed": { "zh-CN": "床旁需要{caps}，但提供它的设备都固定在别处，无法推来。", en: "Needs {caps} at the bedside, but every device providing it is fixed elsewhere and cannot be brought." },
  "spatial.no-provider-in-facility": { "zh-CN": "本院没有可用的设备提供{caps}。", en: "Nothing usable in this facility provides {caps}." },
  "spatial.no-patient": { "zh-CN": "这个世界里没有患者。", en: "There is no patient in this world." },
  "spatial.not-at-patient.sample": { "zh-CN": "标本要在{patient}身边采集（{range} 米内），当前相距 {distance} 米。", en: "The sample is taken at {patient}'s side (within {range} m); you are {distance} m away." },
  "spatial.not-at-patient.observations": { "zh-CN": "请在{patient}身边测量生命体征（{range} 米内，当前相距 {distance} 米），或在同一房间内看已连接监护仪的屏幕，或到电子病历终端查看记录。", en: "Check the vitals at {patient}'s side (within {range} m; you are {distance} m away), on an attached monitor's screen in its room, or in the chart at a records terminal." },
  "spatial.provider-busy": { "zh-CN": "床旁的{caps}（「{provider}」）正被{holder}使用——请把「{alternative}」推到{patient}身边，或等它空出来。", en: 'The bedside {caps} ("{provider}") is in use by {holder} — wheel "{alternative}" to {patient} instead, or wait for it.' },
  "spatial.provider-busy-none": { "zh-CN": "需要{caps}：「{provider}」正被{holder}使用，暂时没有其他可用设备——请稍后再试。", en: 'Needs {caps}: "{provider}" is in use by {holder} and no other one is free — wait for it.' },
  "spatial.no-monitor-attached": { "zh-CN": "{patient}没有连接的监护仪可看。", en: "No monitor is attached to {patient}." },
  "spatial.monitor-not-in-view": { "zh-CN": "看不到「{monitor}」的屏幕：需在它所在的房间内、{range} 米内且视线无遮挡。", en: 'The screen of "{monitor}" is out of view: be in its room, within {range} m, with a clear view.' },
  "spatial.clinical": { "zh-CN": "先要完成「{intervention}」。", en: 'This needs "{intervention}" first.' },
  "spatial.kit-at-home": { "zh-CN": "床旁需要{caps}，它在{place}且无法推来：请把{patient}送回去。", en: "Needs {caps} at the bedside; it stands in {place} and cannot be brought: take {patient} back there." },
  "spatial.patient-not-at-provider": { "zh-CN": "这项检查需要{patient}在{caps}旁（「{provider}」）：请把患者送过去。", en: 'This needs {patient} at {caps} ("{provider}"): take the patient there.' },
  "spatial.clinical.iv-access": { "zh-CN": "还没有静脉通路：请先建立静脉通路（「{intervention}」），再给这个药。", en: 'There is no IV access yet: place a cannula first ("{intervention}"), then give this.' },
  "spatial.clinical.sample": { "zh-CN": "还没有采集标本：请到{patient}身边采集，或先建立静脉通路（「{intervention}」，同时采血）。", en: 'No sample has been taken yet: take it at {patient}\'s side, or place IV access first ("{intervention}" draws the bloods).' },
  // hint labels
  "hint.patient": { "zh-CN": "前往{patient}身边", en: "Go to {patient}" },
  "hint.provider": { "zh-CN": "前往「{provider}」", en: 'Go to "{provider}"' },
  "hint.fetch": { "zh-CN": "取来「{provider}」并推到{patient}身边", en: 'Fetch "{provider}" and wheel it to {patient}' },
  "hint.transport": { "zh-CN": "把{patient}送到「{provider}」", en: 'Take {patient} to "{provider}"' },
  "hint.transportHome": { "zh-CN": "把{patient}送回{place}", en: "Take {patient} back to {place}" },
  "hint.look": { "zh-CN": "移动到能看清「{target}」的位置", en: 'Get a clear view of "{target}"' },
  "hint.approach": { "zh-CN": "走近「{target}」", en: 'Approach "{target}"' },
  "hint.wash": { "zh-CN": "到「{target}」洗手", en: 'Wash your hands at "{target}"' },
  "hint.alternative": { "zh-CN": "改用「{target}」", en: 'Use "{target}" instead' },
  "hint.joint": { "zh-CN": "站到既能操作「{target}」又在{patient}身边的位置", en: 'Stand where you can reach both "{target}" and {patient}' },
  // perception
  "screen.notRecorded": { "zh-CN": "未记录读数", en: "no reading recorded" },
  "screen.noReading": { "zh-CN": "无读数", en: "no reading" },
  "screen.alarms": { "zh-CN": "报警：{alarms}", en: "alarms: {alarms}" },
  "cue.distressed": { "zh-CN": "看起来很痛苦", en: "visibly distressed" },
  "cue.speaking": { "zh-CN": "正在说话", en: "speaking" },
  "level.warning": { "zh-CN": "警告", en: "warning" },
  "level.critical": { "zh-CN": "危急", en: "critical" },
};

/** Where things are (lead notes 1 and 2). */
export const WHEREABOUTS: Record<string, Pair> = {
  "region.corridor": { "zh-CN": "{building}走廊", en: "a corridor of {building}" },
  "whereabouts.usual": { "zh-CN": "通常放在{where}", en: "usually kept in {where}" },
  "whereabouts.lastSeen": { "zh-CN": "上次见于{where}", en: "last seen in {where}" },
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
  // the observer's own events (second person; others' stay in the third, G13)
  "self.moved": { "zh-CN": "你移动了 {distance} 米", en: "You moved {distance} m" },
  "self.entered-room": { "zh-CN": "你进入{room}", en: "You entered {room}" },
  "self.left": { "zh-CN": "你离开了房间", en: "You left the room" },
  "self.discovered": { "zh-CN": "你注意到 {count} 个新对象", en: "You noticed {count} new thing(s)" },
  "self.held": { "zh-CN": "你拿起了{target}", en: "You picked up {target}" },
  "self.dropped": { "zh-CN": "你放下了{target}", en: "You put down {target}" },
  "self.reserved": { "zh-CN": "{target}由你占用", en: "{target} reserved by you" },
  "self.hygiene": { "zh-CN": "你完成了手卫生", en: "You cleaned your hands" },
  "self.action": { "zh-CN": "你：{operation}（{status}）", en: "You: {operation} ({status})" },
  // the patient's body (EMBODIED §8)
  "patient.moved": { "zh-CN": "{patient}被送到{place}", en: "{patient} was moved to {place}" },
  "patient.transported": { "zh-CN": "{actor}把{patient}送到{place}", en: "{actor} took {patient} to {place}" },
  "self.transported": { "zh-CN": "你把{patient}送到{place}", en: "You took {patient} to {place}" },
  "patient.posture": { "zh-CN": "{patient}现在{posture}", en: "{patient} is now {posture}" },
};

/** Localised world message for a key ({placeholders} filled from vars; unknown keys are returned as is). */
export function worldMessage(key: string, locale: string, vars: Record<string, string | number> = {}): string {
  const pair = WORLD_MESSAGES[key] ?? EVENT_SUMMARIES[key] ?? WHEREABOUTS[key] ?? (key.startsWith("roomKind.") ? ROOM_KIND_NAMES[key.slice("roomKind.".length)] : undefined);
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
