/**
 * SMZL case (`packages/content/cases/smzl-lung-adeno/case.json`) — parity with
 * Virtual Patient V4, the voxel clinic it was ported from.
 *
 * The V4 reference implementation below is copied verbatim from V4's decoded
 * `custom_cn.js` (case logic: state `Vd`, questions `Za`, chapters `zn`/`mn`,
 * decisions `Ka`, reducer `Wd`, investigations `is`, order matcher `Xd`,
 * results `dh`, destination logic `gh`, quest copy). Only TypeScript
 * annotations were added; strings and logic are untouched. `gh` read V4's
 * global state, so it takes the state as a parameter here.
 *
 * What is asserted:
 * - the case parses, passes integrity and its reference `solution` verifies;
 * - every zh-CN string the case carries over from V4 is identical;
 * - `matchOrders`/`orderWarnings` reproduce V4 `Xd` (and the 平扫 notice) for
 *   queries in V4's vocabulary; English extensions behave as documented;
 * - objective completion, current objective and waypoint equal V4 `zn`/`mn`/`gh`
 *   (scripted path, exhaustive over the relevant facts, and random walks
 *   through the reducer);
 * - decision `requires` is equivalent to V4 `Ka[...].requires`;
 * - the case's `extensions.testUtterances` matcher corpus.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { t as tr } from "../i18n.js";
import type { CaseDefinition } from "../schema/case.js";
import type { ClinicalAction, SessionState } from "../schema/session.js";
import {
  assess,
  availableDecisions,
  checkCaseIntegrity,
  createRng,
  createSession,
  currentWaypoint,
  evaluate,
  matchHistory,
  matchOrders,
  orderWarnings,
  parseCase,
  progress,
  reduce,
  resultFor,
  verifyCase,
} from "./index.js";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const CASE_PATH = resolve(REPO_ROOT, "packages/content/cases/smzl-lung-adeno/case.json");
const RAW: unknown = JSON.parse(readFileSync(CASE_PATH, "utf8"));

function loadCase(): CaseDefinition {
  const parsed = parseCase(RAW);
  if (!parsed.ok) throw new Error(`smzl-lung-adeno does not parse:\n${JSON.stringify(parsed.issues, null, 2)}`);
  return parsed.value;
}
const C = loadCase();
const ZH = "zh-CN";
const zh = (text: Parameters<typeof tr>[0]) => tr(text, ZH);

/* ------------------------------------------------------------------ */
/* V4 reference implementation (custom_cn.js, verbatim)                */
/* ------------------------------------------------------------------ */

interface V4State {
  version: number;
  started: boolean;
  history: string[];
  orders: { id: string; phase: string; key: string }[];
  seen: string[];
  decisions: Record<string, boolean>;
  attempts: { id: string; option: string; ok: boolean }[];
  hints: number;
  phase: string;
  finished: boolean;
}
interface V4Question { id: string; label: string; answer: string; source: string }
interface V4Chapter { name: string; short: string; hint: string; done: boolean; tab: string }
interface V4Decision {
  title: string;
  requires: (i: V4State) => boolean;
  need: string;
  options: { id: string; text: string; ok: boolean; feedback: string }[];
}
interface V4Investigation { id: string; name: string; aliases: string[]; type: string }
interface V4Result { date: string; text: string; figs: number[]; source: string; note?: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type V4Action = { type: string; [field: string]: any };

/* eslint-disable */
function Vd(): V4State {
  return {
    version: 4,
    started: !1,
    history: [],
    orders: [],
    seen: [],
    decisions: {},
    attempts: [],
    hints: 0,
    phase: "pre",
    finished: !1
  }
}
var Za: V4Question[] = [{
  id: "pain",
  label: "哪里疼，什么时候开始？",
  answer: "这次是左上腹痛。病例记录在2025年3—4月就诊检查；没有记下每次疼痛持续多久或疼痛评分。",
  source: "正文·一般资料；依据原文整理的模拟回答"
}, {
  id: "spleen",
  label: "以前是否发现过脾大？",
  answer: "大约30年前就发现脾大了。2024年11月的PET/CT又提示脾脏明显增大。不能据这段病史认定淋巴瘤已经持续30年。",
  source: "正文·讨论与检查；依据原文整理的模拟回答"
}, {
  id: "lung",
  label: "既往有哪些肿瘤及治疗？",
  answer: "之前诊断过左上肺浸润性腺癌，记录为EGFR突变阳性，服用阿美替尼。具体突变位点及肺癌TNM没有提供。",
  source: "正文·既往史；依据原文整理的模拟回答"
}, {
  id: "other",
  label: "吸烟史、家族史能否补充？",
  answer: "这份病例没有记录吸烟史及肿瘤家族史，我无法从材料中提供。",
  source: "缺失信息：明确保留未知，不补造患者回答"
}];

function kn(i: V4State, e: string, t = "pre"): boolean {
  return i.seen.includes(e + "_" + t)
}

function zn(i: V4State): V4Chapter[] {
  return [{
    name: "建立病史",
    short: "问诊",
    hint: "询问疼痛、脾大病程及既往肿瘤史。",
    done: ["pain", "spleen", "lung"].every(e => i.history.includes(e)),
    tab: "history"
  }, {
    name: "发现异常模式",
    short: "初查",
    hint: "调阅血常规，以及腹部增强CT或脾脏超声。",
    done: kn(i, "cbc") && (kn(i, "abdct") || kn(i, "us")),
    tab: "exams"
  }, {
    name: "获取血液学证据",
    short: "取证",
    hint: "阅读骨髓活检／免疫组化和流式细胞术，结合形态判断。",
    done: kn(i, "biopsy") && kn(i, "flow"),
    tab: "exams"
  }, {
    name: "提交诊断推理",
    short: "诊断",
    hint: "依据病史、影像及骨髓证据判断，避免把所有异常归为肺癌。",
    done: !!i.decisions.diagnosis,
    tab: "reason"
  }, {
    name: "完成安全与复评",
    short: "复盘",
    hint: "核对乙肝、核型、治疗后影像／流式，并完成三项判断。",
    done: !!i.decisions.safety && !!i.decisions.genetics && !!i.decisions.response,
    tab: "reason"
  }]
}

function mn(i: V4State): number {
  let e = zn(i).findIndex(t => !t.done);
  return e < 0 ? 5 : e
}

function Gd(i: V4State) {
  let e = zn(i).filter(t => t.done).length;
  return {
    done: e,
    total: 5,
    percent: e * 20
  }
}
var Ka: Record<string, V4Decision> = {
  diagnosis: {
    title: "最能解释当前证据的诊断组合是？",
    requires: i => zn(i).slice(0, 3).every(e => e.done),
    need: "先完成病史、血常规／腹部影像、骨髓活检及流式证据。",
    options: [{
      id: "metastasis",
      text: "肺腺癌转移可以解释全部异常",
      ok: !1,
      feedback: "骨髓有独立的成熟B细胞肿瘤证据，不能把脾大和三系减少直接归因于肺癌转移。"
    }, {
      id: "dual",
      text: "SMZL伴骨髓侵犯，与肺腺癌并存",
      ok: !0,
      feedback: "符合原病例诊断。脾脏主导表现与低级别B细胞证据共同支持SMZL；肺癌需建立独立病理及分子证据链。"
    }, {
      id: "infection",
      text: "单纯感染性脾大，无需考虑肿瘤",
      ok: !1,
      feedback: "感染可能影响病程，但不能解释本例骨髓单克隆B细胞及组织病理证据。"
    }]
  },
  safety: {
    title: "开始抗CD20治疗前，哪项认识更合适？",
    requires: i => kn(i, "hbv"),
    need: "先开具并阅读乙肝筛查／HBV DNA记录。",
    options: [{
      id: "negative",
      text: "HBV DNA未检出，可以排除再激活风险",
      ok: !1,
      feedback: "HBcAb阳性且将接受抗CD20治疗时，不能仅凭HBV DNA低于检测限排除再激活风险。"
    }, {
      id: "assess",
      text: "补全HBsAg等信息，制定再激活预防与监测方案",
      ok: !0,
      feedback: "材料未提供HBsAg。应完整评估HBV状态，并结合抗CD20治疗制定预防与监测方案。"
    }]
  },
  genetics: {
    title: "t(4;12)(q23;q13)支持哪种结论？",
    requires: i => kn(i, "karyo"),
    need: "先阅读染色体核型原图及报告。",
    options: [{
      id: "same",
      text: "足以证明两种肿瘤具有共同起源",
      ok: !1,
      feedback: "仅有骨髓核型不足以证明肺癌与淋巴瘤同源，也不能据断点直接确定融合基因。"
    }, {
      id: "limited",
      text: "是本例核型发现，共同机制仍需配对组织验证",
      ok: !0,
      feedback: "正确保留证据边界：同源性及驱动机制需要两种肿瘤的配对分子证据。"
    }]
  },
  response: {
    title: "治疗后的资料最合理支持什么结论？",
    requires: i => (kn(i, "abdct", "post") || kn(i, "us", "post")) && kn(i, "flow", "post"),
    need: "切换到复评期，阅读腹部CT或超声，以及复查流式。",
    options: [{
      id: "complete",
      text: "流式转阴，证明两种肿瘤都已完全缓解",
      ok: !1,
      feedback: "流式改善只覆盖相应血液学证据，不能替代肺癌复评，也不能单独判定淋巴瘤完全缓解。"
    }, {
      id: "separate",
      text: "淋巴瘤有治疗反应，两种肿瘤仍需分别复评",
      ok: !0,
      feedback: "脾脏及流式改善支持治疗反应。PR为原作者报告；现有数据不足以独立完成标准化复核，肺癌应另行评价。"
    }]
  }
};

function Wd(i: V4State, e: V4Action): V4State {
  switch (i = JSON.parse(JSON.stringify(i)), e.type) {
    case "start":
      i.started = !0;
      break;
    case "ask":
      Za.some(t => t.id === e.id) && !i.history.includes(e.id) && i.history.push(e.id);
      break;
    case "order": {
      let t = e.id + "_" + i.phase;
      i.orders.some(n => n.key === t) || i.orders.push({
        id: e.id,
        phase: i.phase,
        key: t
      });
      break
    }
    case "read":
      i.orders.some(t => t.key === e.key) && !i.seen.includes(e.key) && i.seen.push(e.key);
      break;
    case "phase":
      i.phase = e.phase === "post" ? "post" : "pre";
      break;
    case "hint":
      i.hints++;
      break;
    case "answer": {
      let t = Ka[e.id];
      if (!t || !t.requires(i)) return i;
      let n = t.options.find(s => s.id === e.option);
      if (!n) return i;
      i.attempts.push({
        id: e.id,
        option: e.option,
        ok: n.ok
      }), n.ok && (i.decisions[e.id] = !0);
      break
    }
    case "finish":
      mn(i) === 5 && (i.finished = !0);
      break
  }
  return i
}
var is: V4Investigation[] = [{
  id: "cbc",
  name: "血常规",
  aliases: ["血常规", "血细胞分析", "全血细胞计数", "cbc"],
  type: "text"
}, {
  id: "abdct",
  name: "腹部增强CT",
  aliases: ["腹部增强ct", "全腹增强ct", "腹部ct", "脾脏ct", "胸腹部增强ct", "胸腹增强ct", "增强ct", "ct增强", "ct平扫", "全腹部ct", "全腹ct"],
  type: "image"
}, {
  id: "chestct",
  name: "胸部CT",
  aliases: ["胸部ct", "肺部ct", "肺ct", "胸部增强ct", "肺部增强ct", "胸ct"],
  type: "text"
}, {
  id: "us",
  name: "肝胆脾胰超声",
  aliases: ["超声", "彩超", "b超", "腹部b超", "脾脏超声", "脾脏彩超", "肝胆脾胰", "门静脉超声"],
  type: "image"
}, {
  id: "nodeus",
  name: "浅表淋巴结超声",
  aliases: ["淋巴结超声", "淋巴结彩超", "淋巴结b超"],
  type: "text"
}, {
  id: "pet",
  name: "全身PET/CT",
  aliases: ["petct", "pet/ct", "pet-ct", "pet", "派特"],
  type: "image"
}, {
  id: "marrow",
  name: "骨髓穿刺／细胞学",
  aliases: ["骨髓穿刺", "骨穿", "骨髓细胞学", "骨髓涂片", "骨髓检查"],
  type: "text"
}, {
  id: "biopsy",
  name: "骨髓活检／免疫组化",
  aliases: ["骨髓活检", "骨髓病理", "免疫组化", "ihc"],
  type: "image"
}, {
  id: "flow",
  name: "流式细胞术",
  aliases: ["流式", "免疫分型", "免疫表型", "flow"],
  type: "text"
}, {
  id: "karyo",
  name: "染色体核型分析",
  aliases: ["核型", "染色体", "细胞遗传", "karyotype"],
  type: "image"
}, {
  id: "hbv",
  name: "乙肝筛查／HBV DNA",
  aliases: ["乙肝", "hbv", "肝炎筛查"],
  type: "text"
}, {
  id: "ldh",
  name: "乳酸脱氢酶",
  aliases: ["乳酸脱氢酶", "ldh"],
  type: "text"
}, {
  id: "egfr",
  name: "EGFR基因检测记录",
  aliases: ["egfr", "基因检测", "驱动基因"],
  type: "text"
}];

function Xd(i: string): string[] {
  let e = i.toLowerCase().replace(/\s+/g, "").replace(/（/g, "(").replace(/）/g, ")");
  if (!e) return [];
  let t = is.filter(n => n.aliases.some(s => e.includes(s))).map(n => n.id);
  // @ts-ignore — V4 expression-statement style preserved verbatim
  return t.includes("pet") && (/腹部|全腹|脾脏|胸腹/.test(e) || (t = t.filter(n => n !== "abdct")), /胸部|肺部/.test(e) || (t = t.filter(n => n !== "chestct"))), t.includes("chestct") && !/腹部|全腹|脾脏|胸腹/.test(e) && (t = t.filter(n => n !== "abdct")), /胸腹/.test(e) && /ct/.test(e) && !t.includes("chestct") && t.push("chestct"), t.includes("nodeus") && (t = t.filter(n => n !== "us")), /心脏|甲状腺|颈动脉|下肢|肾脏|乳腺/.test(e) && /超声|彩超|b超/.test(e) && (t = t.filter(n => n !== "us")), e === "超声" || e === "彩超" || e === "b超" ? ["us", "nodeus"] : e === "ct" || e === "ct检查" || e === "做ct" ? ["abdct", "chestct"] : (/骨髓穿刺/.test(e) && /活检/.test(e) && !t.includes("biopsy") && t.push("biopsy"), t)
}

function dh(i: string, e: string): V4Result {
  let t = e === "post";
  return ({
    cbc: {
      date: t ? "2025年7月（原文概述）" : "初诊及2025-04-28",
      text: t ? "原文记录“血常规基本恢复”，未提供完整复查数值；不生成数值。" : "初诊：白细胞3.2×10⁹/L，中性粒细胞1.3×10⁹/L，Hb 97 g/L，血小板71×10⁹/L。2025-04-28：白细胞1.98×10⁹/L，中性粒细胞1.05×10⁹/L，Hb 79.10 g/L，血小板27×10⁹/L。",
      figs: [],
      source: "正文·临床资料／检查"
    },
    abdct: {
      date: t ? "2025-07-04" : "2025-03-28",
      text: t ? "增大脾脏较前缩小，脾脏多发低密度灶伴边缘强化；肝门部及腹膜后部分淋巴结缩小；副脾及脾周积液较前减少。" : "脾大伴低密度灶，原报告提出“梗死？”；副脾，脾周少量积液，肝门部及腹膜后部分淋巴结增大。原包仅提供增强CT代表层面，不含完整DICOM序列；平扫申请不能视为与增强CT完全等价。",
      figs: [t ? 6 : 3],
      source: t ? "正文·检查，图6" : "正文·检查，图3"
    },
    chestct: {
      date: t ? "2025-07-04" : "2025-03-28／2025年6月",
      text: t ? "正文记录左肺上叶结节；双侧肺门及纵隔部分淋巴结较前略缩小。未提供肺结节直径。" : "正文记录左肺上叶结节；2025年6月肺腺癌病灶较前增大，随后调整阿美替尼剂量。原报告讨论部分另称“未见进展”，存在叙述不一致。",
      figs: [],
      source: "正文·既往史／检查",
      note: "原包CT配图为腹部代表层面，没有可用于肺结节局部评价的胸部原图。"
    },
    us: {
      date: t ? "2025-07-07" : "2025-03-30",
      text: t ? "脾大，脾静脉增宽，脾脏片状低回声。图7标注脾纵向距离5.53 cm、横向距离13.40 cm。" : "脾大，脾静脉增宽；脾门等回声，考虑副脾。图2标注脾纵向距离9.90 cm、横向距离17.45 cm。保留原图测量名称，不用二维数字推算体积。",
      figs: [t ? 7 : 2],
      source: t ? "正文·检查，图7" : "正文·检查，图2"
    },
    nodeus: {
      date: t ? "2025-07-02" : "2025-04-07",
      text: t ? "双侧锁骨上淋巴结：左6×4 mm、右7×4 mm；颈部最大12×6 mm，腋窝最大11×6 mm，腹股沟最大15×7 mm。" : "双侧锁骨上淋巴结：左9×7 mm、右7×8 mm；颈部最大12×5 mm，腋窝最大13×6 mm，腹股沟最大17×6 mm。",
      figs: [],
      source: "正文·检查",
      note: "没有浅表淋巴结超声原图；脾脏超声图不能替代。"
    },
    pet: {
      date: "2024-11-27",
      text: "全身PET/CT：脾脏明显肿大、代谢异常增高；建议进一步排除淋巴瘤。代谢增高本身不等于病理确诊。",
      figs: [1],
      source: "正文·检查，图1",
      note: t ? "仅有治疗前PET/CT，未提供治疗后PET复查。" : "原始图中保留了来源标记；仅在本地教学材料中使用。"
    },
    marrow: {
      date: t ? "2025-07-02" : "2025-04-02",
      text: t ? "三系增生活跃。原文转归概述骨髓细胞学及流式结果转阴，但没有复查骨髓细胞图片。" : "三系增生活跃，淋巴瘤样细胞占2%。骨髓穿刺细胞学与骨髓组织活检是不同取材方法；需要活检与免疫组化时另行申请相应检查。",
      figs: [],
      source: "正文·检查"
    },
    biopsy: {
      date: "2025年4月诊断期",
      text: "骨髓活检：低级别小B细胞淋巴瘤，肿瘤细胞约15%，MF-1级，倾向边缘区淋巴瘤。CD19、CD20、PAX5及IgD阳性；CD5、CD10、Cyclin-D1、SOX11、LEF1、CD103、Annexin-A1阴性；Ki-67＜5%。图5未逐一标明A/B切片抗体名称，不擅自补注。",
      figs: [5],
      source: "正文·检查，图5",
      note: t ? "此为诊断期活检原图，未提供治疗后组织活检图。" : ""
    },
    flow: {
      date: t ? "2025-07-05" : "2025-04-02",
      text: t ? "未检测到明显免疫表型异常的淋巴细胞。" : "检出约1.58%的CD5阴性、CD10阴性成熟单克隆B淋巴细胞；未见明显急性白血病及高危MDS相关免疫表型异常证据。与活检15%并非同一分母，不能直接比较。",
      figs: [],
      source: "正文·检查",
      note: "未附原始流式散点图。"
    },
    karyo: {
      date: "2025年4月诊断期",
      text: "46,XY,t(4;12)(q23;q13)。分析20个中期分裂相，均见一条4号与一条12号染色体长臂相互易位。核型不能确定融合基因，也不能证明与肺癌同源。",
      figs: [4],
      source: "正文·检查，图4",
      note: t ? "仅提供诊断期核型结果，没有复查核型。" : ""
    },
    hbv: {
      date: "2025-03-29／04-08",
      text: "乙肝表面抗体412.53 mIU/ml；乙肝核心抗体阳性；HBV DNA＜1.00×10\xB2 IU/ml。材料未给出HBsAg结果，不能推断为阴性。接受抗CD20治疗前需完整评估再激活风险。",
      figs: [],
      source: "正文·检查"
    },
    ldh: {
      date: "2025-04-28",
      text: "乳酸脱氢酶498 U/L（原文标为升高）。未提供治疗后LDH值。",
      figs: [],
      source: "正文·检查"
    },
    egfr: {
      date: "既往肺癌诊断期",
      text: "正文记载左上肺浸润性腺癌、EGFR突变阳性；具体位点、检测平台与原始基因报告未提供。不能据此补写19del或L858R。",
      figs: [],
      source: "正文·既往史"
    }
  } as Record<string, V4Result>)[i]
}
/* eslint-enable */

/** V4 `gh()` — the quest destination. V4 read its global state `Oe`; here it is a parameter. */
function gh(Oe: V4State): string {
  switch (mn(Oe)) {
    case 0:
      return "patient";
    case 1:
      return Oe.seen.includes("cbc_pre") ? "imaging" : "lab";
    case 2:
      return Oe.seen.includes("biopsy_pre") ? "lab" : "path";
    case 3:
      return "board";
    case 4:
      return Oe.seen.includes("hbv_pre") ? Oe.seen.includes("karyo_pre") ? "board" : "path" : "lab";
    default:
      return "board"
  }
}

/** V4 quest copy `n[i]` (ir()). */
const QUEST_COPY = [
  "进入诊所，向左走。询问疼痛、脾大病程和既往肿瘤。",
  "在检验室调阅血常规，再到影像室查看腹部CT或脾脏超声。",
  "去病理室调阅骨髓活检，再到检验室查看流式细胞术。",
  "带着已读证据，走到走廊尽头的会诊板。",
  "调阅乙肝与核型；在会诊板切换复评期，核对影像和流式。",
];

/** V4 finish screen (hx()), patient card (cx()) and 平扫 toast (Zd()). */
const V4_UI = {
  finishTitle: "病例完成 · 两种肿瘤，两条证据链",
  conclusion: "SMZL伴骨髓侵犯，与EGFR突变阳性左上肺浸润性腺癌并存。",
  keyReasoning: "脾脏主导表现与低级别B细胞证据结合判断；不能把所有异常归因于肺癌，也不能以CD5/CD10阴性单独定性。",
  boundaries: "脾脏与流式改善支持治疗反应。PR为原作者报告；现有数据不足以独立完成标准化复核。两种肿瘤分别评价。",
  unknowns: "EGFR位点、肺癌TNM、肺结节尺寸、共同起源机制，以及HBsAg结果。",
  notice: "完成度与判断记录来自教学脚本，未经临床能力量表验证。场景时间、方块和声音只是游戏呈现。",
  tags: ["左上腹痛", "脾脏增大", "病史待询问"],
  plainScanToast: "原包仅提供腹部增强CT代表图，平扫与增强CT不能视为等价。",
};

/* ------------------------------------------------------------------ */
/* V4 ⇄ V5 adapters                                                    */
/* ------------------------------------------------------------------ */

/**
 * V5 waypoint target → V4 destination, via the clinic-v4 workstation
 * groupings (docs/FACILITIES.md). With every objective done V5 has no
 * waypoint; V4 pointed at the board.
 */
const V4_DESTINATION: Record<string, string> = {
  patient: "patient",
  board: "board",
  "lab-hematology": "lab",
  "lab-chemistry": "lab",
  "lab-serology": "lab",
  "flow-cytometry": "lab",
  cytology: "lab",
  ct: "imaging",
  ultrasound: "imaging",
  "pet-ct": "imaging",
  histopathology: "path",
  cytogenetics: "path",
  molecular: "path",
};
const destination = (target: string | null): string => (target == null ? "board" : (V4_DESTINATION[target] ?? `unmapped:${target}`));

/** V4 result key `${id}_${phase}` ⇄ V5 `${id}@${phase}`. */
const v4Key = (key: string) => key.replace("@", "_");

function toV5(a: V4Action): ClinicalAction {
  switch (a.type) {
    case "start":
      return { type: "start" };
    case "ask":
      return { type: "ask", itemId: a.id };
    case "order":
      return { type: "order", investigationId: a.id };
    case "read": {
      const [investigationId, phase] = String(a.key).split("_");
      return { type: "read", investigationId, phase };
    }
    case "phase":
      return { type: "set-phase", phase: a.phase };
    case "hint":
      return { type: "hint" };
    case "answer":
      return { type: "answer", decisionId: a.id, optionIds: [a.option] };
    case "finish":
      return { type: "finish" };
  }
  throw new Error(`unknown V4 action ${a.type}`);
}

function toV4(a: ClinicalAction, phase: string): V4Action | null {
  switch (a.type) {
    case "start":
    case "hint":
    case "finish":
      return { type: a.type };
    case "ask":
      return { type: "ask", id: a.itemId };
    case "order":
      return { type: "order", id: a.investigationId };
    case "read":
      return { type: "read", key: `${a.investigationId}_${a.phase ?? phase}` };
    case "set-phase":
      return { type: "phase", phase: a.phase };
    case "answer":
      return { type: "answer", id: a.decisionId, option: a.optionIds[0] };
    default:
      return null;
  }
}

/** Everything V4's UI derives from its state, side by side with the V5 equivalent. */
function snapV4(i: V4State) {
  return {
    asked: [...i.history].sort(),
    orders: i.orders.map((o) => o.key),
    seen: [...i.seen],
    decided: Object.keys(i.decisions).filter((k) => i.decisions[k]).sort(),
    attempts: i.attempts.map((a) => [a.id, a.option, a.ok]),
    phase: i.phase,
    hints: i.hints,
    finished: i.finished,
    chaptersDone: zn(i).map((ch) => ch.done),
    current: mn(i),
    destination: gh(i),
    unlocked: Object.entries(Ka).map(([id, d]) => [id, d.requires(i)]),
  };
}

function snapV5(s: SessionState) {
  const p = progress(C, s);
  return {
    asked: [...s.asked].sort(),
    orders: s.orders.map((o) => `${o.investigationId}_${o.phase}`),
    seen: s.seen.map(v4Key),
    decided: Object.keys(s.decisions).sort(),
    attempts: s.attempts.map((a) => [a.decisionId, a.optionIds.join(","), a.correct]),
    phase: s.phase,
    hints: s.hints,
    finished: s.finished,
    chaptersDone: p.objectives.map((o) => o.done),
    current: p.currentIndex,
    destination: destination(currentWaypoint(C, s)),
    unlocked: availableDecisions(C, s).map((d) => [d.decision.id, d.unlocked]),
  };
}

const PHASES = ["pre", "post"] as const;

/* ------------------------------------------------------------------ */
/* Case health                                                         */
/* ------------------------------------------------------------------ */

describe("smzl-lung-adeno — case health", () => {
  it("parses without warnings and passes integrity", () => {
    const parsed = parseCase(RAW);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.warnings).toEqual([]);
    expect(checkCaseIntegrity(C)).toEqual([]);
  });

  it("verifies: the reference solution completes every objective, decides every decision first time and meets every deterministic rubric item", () => {
    const v = verifyCase(C);
    expect(v.issues).toEqual([]);
    expect(v.ok).toBe(true);
    expect(v.finalState.finished).toBe(true);
    expect(v.assessment.completed).toBe(true);
    expect(v.assessment.decisions.map((d) => [d.id, d.firstTryCorrect, d.attempts])).toEqual(
      Object.keys(Ka).map((id) => [id, true, 1]),
    );
    expect(v.assessment.history.missingRequired).toEqual([]);
    expect(v.assessment.investigations.essentialMissing).toEqual([]);
    expect(v.assessment.investigations.unread).toEqual([]);
    expect(v.assessment.rubric.filter((r) => r.met === false).map((r) => r.id)).toEqual([]);
    expect(v.assessment.score.percent).toBe(100);
  });

  it("the reference solution also completes V4's own state machine", () => {
    let v4 = Vd();
    let phase = "pre";
    for (const action of C.solution as ClinicalAction[]) {
      const a = toV4(action, phase);
      if (!a) continue;
      v4 = Wd(v4, a);
      phase = v4.phase;
    }
    expect(mn(v4)).toBe(5);
    expect(v4.finished).toBe(true);
    expect(Object.keys(Ka).filter((id) => v4.attempts.find((t) => t.id === id)?.ok)).toEqual(Object.keys(Ka));
  });

  it("keeps V5 additions in the phase the source records them", () => {
    const pre = reduce(C, createSession(C), { type: "start" }).state;
    for (const itemId of ["general-since-onset", "treatment-course", "numbness", "meds-post"]) {
      expect(reduce(C, pre, { type: "ask", itemId }).rejected?.code, itemId).toBe("phase-locked");
    }
    for (const finding of C.exam) {
      expect(reduce(C, pre, { type: "examine", findingId: finding.id }).rejected?.code, finding.id).toBe("phase-locked");
    }
    const post = reduce(C, pre, { type: "set-phase", phase: "post" }).state;
    expect(reduce(C, post, { type: "ask", itemId: "meds" }).rejected?.code).toBe("phase-locked");
    expect(reduce(C, post, { type: "ask", itemId: "meds-post" }).rejected).toBeUndefined();
    for (const itemId of ["pain", "spleen", "lung", "other"]) {
      expect(reduce(C, pre, { type: "ask", itemId }).rejected, itemId).toBeUndefined();
      expect(reduce(C, post, { type: "ask", itemId }).rejected, itemId).toBeUndefined();
    }
  });
});

/* ------------------------------------------------------------------ */
/* zh-CN text carried over from V4                                     */
/* ------------------------------------------------------------------ */

describe("smzl-lung-adeno — V4 text fidelity (zh-CN)", () => {
  it("questions Za: same ids first, in order, with identical question/answer/source", () => {
    expect(C.history.slice(0, Za.length).map((h) => h.id)).toEqual(Za.map((q) => q.id));
    for (const q of Za) {
      const h = C.history.find((x) => x.id === q.id)!;
      expect([zh(h.question), zh(h.answer), zh(h.source)], q.id).toEqual([q.label, q.answer, q.source]);
    }
    expect(C.history.filter((h) => h.required).map((h) => h.id)).toEqual(["pain", "spleen", "lung"]);
    expect(C.history.find((h) => h.id === "other")!.disclosure).toBe("unknown");
  });

  it("chapters zn + quest copy: identical title/short/hint/guidance", () => {
    const chapters = zn(Vd());
    expect(C.objectives).toHaveLength(chapters.length);
    chapters.forEach((ch, k) => {
      const o = C.objectives[k];
      expect([zh(o.title), zh(o.short), zh(o.hint), zh(o.guidance)], o.id).toEqual([ch.name, ch.short, ch.hint, QUEST_COPY[k]]);
    });
  });

  it("decisions Ka: identical prompt/need/options/feedback, single best answer", () => {
    expect(C.decisions.map((d) => d.id)).toEqual(Object.keys(Ka));
    for (const [id, k] of Object.entries(Ka)) {
      const d = C.decisions.find((x) => x.id === id)!;
      expect(d.kind).toBe("single");
      expect([zh(d.prompt), zh(d.need)], id).toEqual([k.title, k.need]);
      expect(d.options.map((o) => [o.id, zh(o.text), o.correct, zh(o.feedback)]), id).toEqual(k.options.map((o) => [o.id, o.text, o.ok, o.feedback]));
    }
  });

  it("investigations is: same ids in declaration order, identical names and zh-CN aliases", () => {
    expect(C.investigations.map((i) => [i.id, zh(i.name)])).toEqual(is.map((i) => [i.id, i.name]));
    for (const v4 of is) {
      const aliases = C.investigations.find((i) => i.id === v4.id)!.aliases;
      expect(Array.isArray(aliases) ? aliases : aliases[ZH], v4.id).toEqual(v4.aliases);
    }
  });

  it("results dh: 13 investigations × 2 phases with identical date/text/note/source/figures", () => {
    let checked = 0;
    for (const { id } of is) {
      for (const phase of PHASES) {
        const v4 = dh(id, phase);
        const r = resultFor(C, id, phase);
        expect(r, `${id}@${phase}`).not.toBeNull();
        expect(
          { available: r!.available, date: zh(r!.date), text: zh(r!.text), note: zh(r!.note) || "", source: zh(r!.source), figures: r!.figures, values: r!.values },
          `${id}@${phase}`,
        ).toEqual({ available: true, date: v4.date, text: v4.text, note: v4.note ?? "", source: v4.source, figures: v4.figs.map((n) => `fig${n}`), values: [] });
        checked++;
      }
    }
    expect(checked).toBe(26);
    const figures = new Set(C.investigations.flatMap((i) => Object.values(i.results).flatMap((r) => r.figures)));
    for (const fig of figures) expect(C.assets.find((a) => a.id === fig)?.localOnly, fig).toBe(true);
  });

  it("finish screen, patient card and 平扫 notice", () => {
    expect(zh(C.debrief.title)).toBe(V4_UI.finishTitle);
    expect(zh(C.debrief.conclusion)).toBe(V4_UI.conclusion);
    expect(zh(C.debrief.keyReasoning[0])).toBe(V4_UI.keyReasoning);
    expect(zh(C.debrief.boundaries)).toBe(V4_UI.boundaries);
    expect(zh(C.debrief.notice)).toBe(V4_UI.notice);
    const unknowns = C.debrief.unknowns.map(zh);
    expect(`${unknowns.slice(0, -1).join("、")}，以及${unknowns.at(-1)}。`).toBe(V4_UI.unknowns);
    for (const u of unknowns) expect(C.unknowns.map(zh)).toContain(u);
    expect(C.patient.tags.map(zh)).toEqual(V4_UI.tags);
    expect(C.orderMatching.warnings.map((w) => [w.investigation, zh(w.message)])).toEqual([["abdct", V4_UI.plainScanToast]]);
  });
});

/* ------------------------------------------------------------------ */
/* Order matching                                                      */
/* ------------------------------------------------------------------ */

/** Queries in V4's vocabulary (Chinese plus V4's own ASCII aliases), including V4's quirks. */
const PARITY_QUERIES = [
  "血常规", "血细胞分析", "CBC", "全血细胞计数", "血常规和乳酸脱氢酶",
  "腹部增强CT", "腹部 增强 CT", "全腹增强ct", "腹部CT", "脾脏CT", "胸腹部增强CT", "胸腹增强CT", "增强CT", "CT增强",
  "CT平扫", "腹部CT平扫", "全腹部CT", "（腹部）增强CT",
  "胸部CT", "肺部CT", "肺CT", "胸部增强CT", "胸CT", "胸部CT和腹部CT", "胸部CT，腹部CT", "（胸腹）CT",
  "胸部CT和全腹CT", "肺CT和脾脏CT", "胸CT和胸腹增强CT", "胸部CT和增强CT", "肺部CT平扫",
  "超声", "彩超", "B超", " 超 声 ", "腹部B超", "脾脏超声", "脾脏彩超", "肝胆脾胰超声", "门静脉超声",
  "心脏超声", "甲状腺彩超", "颈动脉B超", "下肢超声", "肾脏超声", "乳腺超声",
  "淋巴结超声", "浅表淋巴结超声", "淋巴结彩超和脾脏超声", "心脏彩超+脾脏超声",
  "PET-CT", "PET/CT", "PETCT", "全身PET/CT", "派特", "PET-CT腹部", "PET和胸部CT", "PET和腹部增强CT", "PET胸腹", "PET-CT胸腹部", "PET与肺部CT", "（PET）CT",
  "PET和全腹CT", "PET和脾脏CT", "PET胸腹增强CT", "PET和增强CT", "PET-CT和肺CT", "PET和CT平扫",
  "CT", "ct检查", "做CT", "做 CT",
  "骨髓穿刺", "骨穿", "骨髓细胞学", "骨髓涂片", "骨髓检查", "骨髓穿刺／细胞学", "骨髓穿刺+活检", "骨髓穿刺和活检",
  "骨髓活检", "骨髓病理", "免疫组化", "IHC", "骨髓活检／免疫组化", "骨髓活检和流式",
  "流式", "流式细胞术", "免疫分型", "免疫表型", "FLOW", "流式和核型",
  "核型", "染色体", "细胞遗传", "染色体核型分析", "karyotype",
  "乙肝", "HBV", "肝炎筛查", "乙肝筛查／HBV DNA", "乙肝和LDH",
  "乳酸脱氢酶", "LDH", "EGFR", "基因检测", "驱动基因", "EGFR基因检测记录",
  "", "   ", "磁共振", "胃镜", "尿常规",
];

/** English behaviour the case adds on top of V4 (V4 had no English order entry). */
const ENGLISH_ORDERS: [string, string[], boolean][] = [
  // query, expected candidates, 平扫-equivalent notice on abdct
  ["complete blood count", ["cbc"], false],
  ["full blood count", ["cbc"], false],
  ["CT abdomen", ["abdct"], false],
  ["contrast-enhanced CT of the abdomen", ["abdct"], false],
  ["non-contrast CT abdomen", ["abdct"], true],
  ["unenhanced CT", ["abdct"], true],
  ["CT without contrast", ["abdct"], true],
  ["chest CT", ["chestct"], false],
  ["CT chest with contrast", ["chestct"], false],
  ["chest and abdominal CT", ["abdct", "chestct"], false],
  ["CT chest and abdomen", ["chestct", "abdct"], false],
  ["CT", ["abdct", "chestct"], false],
  ["CT scan", ["abdct", "chestct"], false],
  ["ultrasound", ["us", "nodeus"], false],
  ["spleen ultrasound", ["us"], false],
  ["lymph node ultrasound", ["nodeus"], false],
  ["thyroid ultrasound", [], false],
  ["cardiac ultrasound", [], false],
  ["PET-CT", ["pet"], false],
  ["PET-CT and abdominal CT", ["abdct", "pet"], false],
  ["PET and chest CT", ["chestct", "pet"], false],
  ["bone marrow aspirate and biopsy", ["marrow", "biopsy"], false],
  ["bone marrow examination", ["marrow"], false],
  ["trephine", ["biopsy"], false],
  ["immunophenotyping", ["flow"], false],
  ["cytogenetics", ["karyo"], false],
  ["HBsAg", ["hbv"], false],
  ["lactate dehydrogenase", ["ldh"], false],
  ["EGFR mutation", ["egfr"], false],
  ["MRI", [], false],
];

describe("smzl-lung-adeno — order matching", () => {
  it(`matchOrders reproduces V4 Xd for ${PARITY_QUERIES.length} queries, in both locales`, () => {
    expect(PARITY_QUERIES.length).toBeGreaterThanOrEqual(30);
    const mismatches: string[] = [];
    for (const query of PARITY_QUERIES) {
      const expected = Xd(query);
      for (const locale of [ZH, "en"]) {
        const actual = matchOrders(C, query, locale);
        if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches.push(`${JSON.stringify(query)} [${locale}]: V4 ${JSON.stringify(expected)} ≠ V5 ${JSON.stringify(actual)}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("the 平扫 notice fires exactly when V4's does", () => {
    const mismatches: string[] = [];
    for (const query of PARITY_QUERIES) {
      for (const id of Xd(query)) {
        const v4 = /平扫/.test(query) && id === "abdct";
        const v5 = orderWarnings(C, query, id, ZH);
        if (v4 !== v5.length > 0) mismatches.push(`${query} → ${id}`);
        if (v4) expect(v5).toEqual([V4_UI.plainScanToast]);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it.each(ENGLISH_ORDERS)("English order %j → %j", (query, expected, notice) => {
    expect(matchOrders(C, query, "en")).toEqual(expected);
    expect(orderWarnings(C, query, "abdct", "en").length > 0).toBe(notice);
  });
});

/* ------------------------------------------------------------------ */
/* Objectives, waypoints and decision gates                            */
/* ------------------------------------------------------------------ */

describe("smzl-lung-adeno — objective / waypoint / decision parity", () => {
  it("scripted V4 path: chapters, current chapter and destination match V4 zn/mn/gh at every step", () => {
    const orderRead = (id: string, phase: string): V4Action[] => [{ type: "order", id }, { type: "read", key: `${id}_${phase}` }];
    // [actions, expected current chapter, expected V4 destination, expected V5 waypoint target]
    const script: [V4Action[], number, string, string | null][] = [
      [[{ type: "start" }], 0, "patient", "patient"],
      [[{ type: "ask", id: "pain" }], 0, "patient", "patient"],
      [[{ type: "ask", id: "spleen" }, { type: "ask", id: "other" }], 0, "patient", "patient"],
      [[{ type: "ask", id: "lung" }], 1, "lab", "lab-hematology"],
      [orderRead("cbc", "pre"), 1, "imaging", "ct"],
      [orderRead("us", "pre"), 2, "path", "histopathology"],
      [[{ type: "answer", id: "diagnosis", option: "dual" }], 2, "path", "histopathology"],
      [orderRead("biopsy", "pre"), 2, "lab", "flow-cytometry"],
      [[{ type: "finish" }], 2, "lab", "flow-cytometry"],
      [orderRead("flow", "pre"), 3, "board", "board"],
      [[{ type: "hint" }, { type: "answer", id: "diagnosis", option: "metastasis" }], 3, "board", "board"],
      [[{ type: "answer", id: "diagnosis", option: "dual" }], 4, "lab", "lab-serology"],
      [orderRead("hbv", "pre"), 4, "path", "cytogenetics"],
      [[{ type: "answer", id: "safety", option: "assess" }], 4, "path", "cytogenetics"],
      [orderRead("karyo", "pre"), 4, "board", "board"],
      [[{ type: "answer", id: "genetics", option: "limited" }, { type: "phase", phase: "post" }], 4, "board", "board"],
      [[...orderRead("abdct", "post"), ...orderRead("flow", "post")], 4, "board", "board"],
      [[{ type: "answer", id: "response", option: "separate" }], 5, "board", null],
      [[{ type: "finish" }], 5, "board", null],
    ];
    let v4 = Vd();
    let s5 = createSession(C);
    for (const [actions, chapter, v4Destination, waypoint] of script) {
      for (const a of actions) {
        v4 = Wd(v4, a);
        s5 = reduce(C, s5, toV5(a)).state;
        expect(snapV5(s5), JSON.stringify(a)).toEqual(snapV4(v4));
      }
      const label = JSON.stringify(actions);
      expect(mn(v4), label).toBe(chapter);
      expect(gh(v4), label).toBe(v4Destination);
      expect(currentWaypoint(C, s5), label).toBe(waypoint);
    }
    expect(v4.finished).toBe(true);
    expect(s5.finished).toBe(true);
    expect(assess(C, s5).decisions.find((d) => d.id === "diagnosis")).toMatchObject({ firstTryCorrect: false, attempts: 2 });
  });

  it("exhaustive: chapter completion, current chapter, destination and decision gates equal V4 over every combination of the facts they read", () => {
    type Atom = { kind: "ask"; id: string } | { kind: "seen"; id: string; phase: string } | { kind: "decided"; id: string };
    const atoms: Atom[] = [
      ...["pain", "spleen", "lung"].map((id): Atom => ({ kind: "ask", id })),
      ...["cbc", "abdct", "us", "biopsy", "flow", "hbv", "karyo"].map((id): Atom => ({ kind: "seen", id, phase: "pre" })),
      ...["abdct", "us", "flow"].map((id): Atom => ({ kind: "seen", id, phase: "post" })),
      ...Object.keys(Ka).map((id): Atom => ({ kind: "decided", id })),
    ];
    // Facts no V4 gate reads; sprinkled in pseudo-randomly to prove they do not matter.
    const distractors: Atom[] = [
      { kind: "ask", id: "other" },
      ...["cbc", "biopsy", "hbv", "karyo", "chestct"].map((id): Atom => ({ kind: "seen", id, phase: "post" })),
      ...["marrow", "pet", "nodeus", "chestct", "ldh", "egfr"].map((id): Atom => ({ kind: "seen", id, phase: "pre" })),
    ];
    const rng = createRng(4_12_2026);
    const mismatches: string[] = [];
    const total = 1 << atoms.length;
    for (let mask = 0; mask < total; mask++) {
      const facts = atoms.filter((_, bit) => mask & (1 << bit));
      for (const d of distractors) if (rng() < 0.3) facts.push(d);
      const phase = rng() < 0.5 ? "pre" : "post";

      const v4 = Vd();
      v4.started = true;
      v4.phase = phase;
      const s5 = createSession(C);
      s5.started = true;
      s5.phase = phase;
      for (const f of facts) {
        if (f.kind === "ask") {
          v4.history.push(f.id);
          s5.asked.push(f.id);
        } else if (f.kind === "seen") {
          v4.orders.push({ id: f.id, phase: f.phase, key: `${f.id}_${f.phase}` });
          v4.seen.push(`${f.id}_${f.phase}`);
          s5.orders.push({ key: `${f.id}@${f.phase}`, investigationId: f.id, phase: f.phase, orderedAt: 0, readyAt: 0 });
          s5.seen.push(`${f.id}@${f.phase}`);
        } else {
          v4.decisions[f.id] = true;
          s5.decisions[f.id] = 0;
        }
      }
      // Completion is recorded by the reducer whenever `completeWhen` holds; every fact here is monotone.
      for (const o of C.objectives) if (evaluate(C, s5, o.completeWhen)) s5.objectivesDone[o.id] = 0;

      const a = snapV4(v4);
      const b = snapV5(s5);
      const pick = (x: typeof a) => ({ chaptersDone: x.chaptersDone, current: x.current, destination: x.destination, unlocked: x.unlocked });
      if (JSON.stringify(pick(a)) !== JSON.stringify(pick(b)) && mismatches.length < 5) {
        mismatches.push(`${JSON.stringify(facts)}\n  V4 ${JSON.stringify(pick(a))}\n  V5 ${JSON.stringify(pick(b))}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("random walks: reduce() stays in lock-step with V4 Wd (state, chapters, destination, decision gates)", () => {
    const rng = createRng(20_250_404);
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
    const next = (v4: V4State): V4Action[] => {
      const r = rng();
      if (r < 0.14) return [{ type: "ask", id: pick(Za).id }];
      if (r < 0.52) {
        const id = pick(is).id;
        return [{ type: "order", id }, { type: "read", key: `${id}_${v4.phase}` }];
      }
      if (r < 0.58) return [{ type: "read", key: `${pick(is).id}_${pick(PHASES)}` }];
      if (r < 0.66) return [{ type: "phase", phase: pick(PHASES) }];
      if (r < 0.69) return [{ type: "hint" }];
      if (r < 0.96) {
        // V4's board disables a decision's options once it is decided.
        const open = Object.keys(Ka).filter((id) => !v4.decisions[id]);
        if (open.length === 0) return [{ type: "finish" }];
        const id = pick(open);
        return [{ type: "answer", id, option: pick(Ka[id].options).id }];
      }
      return [{ type: "finish" }];
    };
    let steps = 0;
    let completed = 0;
    for (let walk = 0; walk < 300; walk++) {
      let v4 = Wd(Vd(), { type: "start" });
      let s5 = reduce(C, createSession(C), { type: "start" }).state;
      const trace: V4Action[] = [{ type: "start" }];
      for (let k = 0; k < 160 && !v4.finished; k++) {
        for (const a of next(v4)) {
          trace.push(a);
          v4 = Wd(v4, a);
          s5 = reduce(C, s5, toV5(a)).state;
          steps++;
          const a4 = snapV4(v4);
          const a5 = snapV5(s5);
          if (JSON.stringify(a4) !== JSON.stringify(a5)) {
            expect(a5, `walk ${walk}: ${JSON.stringify(trace)}`).toEqual(a4);
          }
        }
      }
      if (mn(v4) === 5) completed++;
    }
    expect(steps).toBeGreaterThan(40_000);
    // The walks must reach the late chapters often enough to exercise them.
    expect(completed).toBeGreaterThanOrEqual(60);
  });

  it("V5 reports V4's silent no-ops as explicit rejections", () => {
    let s = reduce(C, createSession(C), { type: "start" }).state;
    expect(reduce(C, s, { type: "answer", decisionId: "diagnosis", optionIds: ["dual"] }).rejected?.code).toBe("requirements-unmet");
    expect(reduce(C, s, { type: "finish" }).rejected?.code).toBe("objectives-incomplete");
    expect(reduce(C, s, { type: "read", investigationId: "cbc", phase: "pre" }).rejected?.code).toBe("not-ordered");
    s = reduce(C, s, { type: "order", investigationId: "hbv" }).state;
    s = reduce(C, s, { type: "set-phase", phase: "post" }).state;
    s = reduce(C, s, { type: "order", investigationId: "hbv" }).state;
    s = reduce(C, s, { type: "read", investigationId: "hbv", phase: "post" }).state;
    // V4 Ka.safety reads the diagnostic-phase record only.
    expect(availableDecisions(C, s).find((d) => d.decision.id === "safety")!.unlocked).toBe(false);
    s = reduce(C, s, { type: "read", investigationId: "hbv", phase: "pre" }).state;
    expect(availableDecisions(C, s).find((d) => d.decision.id === "safety")!.unlocked).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* History matcher corpus                                              */
/* ------------------------------------------------------------------ */

interface TestUtterance { text: string; locale: string; expect: string[] }
/** The patient pipeline selects facts scoring ≥ 0.55 (docs/ARCHITECTURE.md §4.2). */
const SELECT = 0.55;

describe("smzl-lung-adeno — extensions.testUtterances", () => {
  const corpus = (C.extensions.testUtterances ?? []) as TestUtterance[];

  it("has a bilingual corpus of 15–40 utterances", () => {
    expect(corpus.length).toBeGreaterThanOrEqual(15);
    expect(corpus.length).toBeLessThanOrEqual(40);
    expect(new Set(corpus.map((u) => u.locale))).toEqual(new Set([ZH, "en"]));
    const ids = new Set(C.history.map((h) => h.id));
    for (const u of corpus) for (const id of u.expect) expect(ids.has(id), `${u.text} → ${id}`).toBe(true);
  });

  it.each(corpus.map((u) => [u.text, u.locale, u.expect] as const))("%j (%s) selects %j", (text, locale, expected) => {
    const selected = matchHistory(C, text, locale).filter((h) => h.score >= SELECT);
    if (expected.length === 0) {
      // Unrecorded topics must fall through to the patient's "not recorded" line.
      expect(selected).toEqual([]);
      return;
    }
    const ids = selected.map((h) => h.id);
    for (const id of expected) expect(ids).toContain(id);
    expect(expected).toContain(ids[0]);
  });
});
