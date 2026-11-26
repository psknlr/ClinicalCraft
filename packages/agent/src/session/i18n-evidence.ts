/**
 * Runtime strings of evidence provenance and drawn pictures (docs/CASE_AUTHORING.md §5.2, docs/STUDIES.md §8): where a
 * result or a finding comes from, when it was captured, its quality check, and the label of a picture the engine drew
 * from data. Merged into `./i18n.ts`. Words follow docs/GLOSSARY.md (source / 来源, quality check / 质量检查, a picture
 * drawn from the record / 依据记录绘制的示意图).
 */

export const EVIDENCE_EN = {
  "evidence.source": "Source: {source}{by}",
  "evidence.by": " ({by})",
  "evidence.source.direct-observation": "direct observation",
  "evidence.source.patient-captured": "captured by the patient",
  "evidence.source.clinician-captured": "captured by clinic staff",
  "evidence.source.clinician-description": "a clinician's written description",
  "evidence.source.device-measurement": "measured by a device",
  "evidence.source.agent-interpretation": "a model's interpretation",
  "evidence.source.published-record": "the published case record",
  "evidence.capturedAt": "Captured: {when}",
  "evidence.quality.passed": "Quality check: passed",
  "evidence.quality.failed": "Quality check: failed — {reasons}",
  "evidence.quality.not-checked": "Quality check: not done",
  "evidence.picture": "Picture: drawn by the simulation from the recorded description — not a photograph of the patient.",
  "evidence.pictures": "Pictures ({n}): drawn by the simulation from the recorded data — not photographs of the patient.",
} as const;

export const EVIDENCE_ZH: Record<keyof typeof EVIDENCE_EN, string> = {
  "evidence.source": "来源：{source}{by}",
  "evidence.by": "（{by}）",
  "evidence.source.direct-observation": "直接观察",
  "evidence.source.patient-captured": "患者自行采集",
  "evidence.source.clinician-captured": "由诊所人员采集",
  "evidence.source.clinician-description": "医师的文字描述",
  "evidence.source.device-measurement": "设备测量",
  "evidence.source.agent-interpretation": "模型判读",
  "evidence.source.published-record": "原始病例记录",
  "evidence.capturedAt": "采集时间：{when}",
  "evidence.quality.passed": "质量检查：通过",
  "evidence.quality.failed": "质量检查：未通过——{reasons}",
  "evidence.quality.not-checked": "质量检查：未做",
  "evidence.picture": "图片：模拟系统依据记录的描述绘制的示意图——不是患者的照片。",
  "evidence.pictures": "图片（{n}张）：模拟系统依据记录的数据绘制的示意图——不是患者的照片。",
};
