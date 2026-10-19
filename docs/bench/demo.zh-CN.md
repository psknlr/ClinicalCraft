# 参考演示 —— 具身接诊：胸痛 · 58岁男性

> **剧透提示：**本文包含 STEMI 病例的完整参考解法（含各项决策答案）。学员请先自行完成病例再阅读。
>
> 本演示验证的是基础设施（确定性地重放病例的参考解法），而不是临床推理能力。

病例 `stemi-inferior-rv` · 场馆 `general-hospital` · 语言 zh-CN · 提交 `8aa39772a495 (工作区有未提交的修改)` · 2026-10-19T20:31:39.397Z

具身参考医生（具身模式下的离线自动驾驶）在病例自己的场馆中无界面地完成接诊；每一个审批请求都由一位上级医生答复（批准）。下面每一步都把 观察 → 计划 → 导航 → 设备交互 → 临床操作 → 状态变化 → 核验 串联起来，并给出世界版本、目标版本、动作 ID 与临床事件 ID（均取自本次轨迹 `trace.jsonl`）；每一步的结论都在运行结束后对照权威的引擎状态和世界状态重新核验，最后给出评估。✗ 表示被世界或空间闸门拒绝的世界动作：拒绝及随后的恢复都保留在记录中。

## 概要

- 通过 —— 每一步都得到权威状态的确认。
- 50 步 · 327 个轨迹片段 · 42 次世界动作 · 世界版本 25 · 模拟 67.01 分钟
- 6 次世界动作被拒绝并已恢复（见下文 ✗）
- 4 个审批请求由上级医生答复（批准 4 个）
- 独立审计：44 个受空间约束的操作，被接受的空间违规 0 个；49 个受权限约束的操作，未经授权 0 个

## 步骤

### 第 1 步 —— 开具检查：12导联心电图 ✓

- **观察** — 观察 observe_world（`b6`，世界 v0）; 观察 inspect `eq:resus1-ecg`（`b16`，世界 v1）; 观察 inspect `eq:resus1-ecg`（`b38`，世界 v4）
- **计划** — `order_test ecg-12lead` · 空间要求 bedside-provider [ecg-12lead] | at-provider [ecg-12lead] (fixed) (`b4`)
- **导航** — navigate → 刘振华（化名） (`patient:resus-1`)：55.4 米，14.2 秒（动作 `wa-b7`，世界 v1）
- **设备交互** — prepare 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b17`，世界 v2，目标 v1）; connect 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b23`，世界 v3，目标 v2）; record 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b28`，世界 v4，目标 v3）; reset 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b39`，世界 v5，目标 v4）
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-29`, `ev-30`
- **状态变化** — 世界：actor.moved, entity.state, reservation.changed; 引擎：order.placed, time.advanced（`ev-29`, `ev-30`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ecg-12lead ordered —— 已确认

### 第 2 步 —— 处置：持续心电、血压、血氧监护 ✓

- **观察** — 观察 observe_world（`b48`，世界 v5）; 观察 inspect `eq:resus1-monitor`（`b49`，世界 v5）; 观察 inspect `eq:resus1-monitor`（`b60`，世界 v6）
- **计划** — `intervene cardiac-monitoring` · 空间要求 bedside-provider [cardiac-monitor] (`b46`)
- **导航** — 无需
- **设备交互** — attach 抢救监护仪 1 (`eq:resus1-monitor`) → completed（动作 `wa-b50`，世界 v6，目标 v1）
- **审批** — 无需
- **临床操作** — `intervene` → ok；临床事件 `ev-46`, `ev-47`, `ev-48`
- **状态变化** — 世界：entity.state; 引擎：intervention.applied, flag.changed, time.advanced（`ev-46`, `ev-47`, `ev-48`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：cardiac-monitoring given; monitor attachment latched (engine + eq:resus1-monitor) = true —— 已确认

### 第 3 步 —— 处置：建立静脉通路（左前臂） (左前臂18G留置针，同时抽血送检（保留右桡动脉供PCI入路）) ✓

- **观察** — 观察 observe_world（`b64`，世界 v6）; 观察 inspect `eq:resus1-iv-pole`（`b65`，世界 v6）
- **计划** — `intervene iv-access` · 空间要求 bedside-provider [iv-access] (`b62`)
- **导航** — navigate → 输液架 (`eq:resus1-iv-pole`)：7.1 米，1.8 秒（动作 `wa-b69`，世界 v7）; navigate → 刘振华（化名） (`patient:resus-1`)：1.5 米，0.4 秒（动作 `wa-b79`，世界 v8）
- **设备交互** — use 输液架 (`eq:resus1-iv-pole`) → failed（动作 `wa-b66`，世界 v6，目标 v0） ✗ NOT_IN_RANGE; use 输液架 (`eq:resus1-iv-pole`) → failed（动作 `wa-b76`，世界 v7，目标 v0） ✗ SPATIAL_REQUIREMENT_UNMET
- **审批** — 无需
- **临床操作** — `intervene` → ok；临床事件 `ev-76`, `ev-77`, `ev-78`
- **状态变化** — 世界：actor.moved; 引擎：intervention.applied, flag.changed, time.advanced（`ev-76`, `ev-77`, `ev-78`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：iv-access given —— 已确认

### 第 4 步 —— 问诊：疼痛是什么时候开始的？当时在做什么？ ✓

- **观察** — 观察 observe_world（`b93`，世界 v8）
- **计划** — `ask_patient hpi-onset` · 空间要求 near-patient ≤ 3 m + line of sight (`b91`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-84`, `ev-85`, `ev-87`, `ev-88`, `ev-89`
- **状态变化** — 引擎：history.asked, time.advanced, result.ready（`ev-84`, `ev-85`, `ev-87`, `ev-88`, `ev-89`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked hpi-onset —— 已确认

### 第 5 步 —— 问诊：是什么样的疼？ ✓

- **观察** — 观察 observe_world（`b102`，世界 v8）
- **计划** — `ask_patient pain-character` · 空间要求 near-patient ≤ 3 m + line of sight (`b100`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-104`, `ev-105`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-104`, `ev-105`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked pain-character —— 已确认

### 第 6 步 —— 问诊：疼痛会往别的地方放射吗？ ✓

- **观察** — 观察 observe_world（`b110`，世界 v8）
- **计划** — `ask_patient pain-radiation` · 空间要求 near-patient ≤ 3 m + line of sight (`b108`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-115`, `ev-116`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-115`, `ev-116`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked pain-radiation —— 已确认

### 第 7 步 —— 问诊：出汗多吗？有没有出冷汗？ ✓

- **观察** — 观察 observe_world（`b118`，世界 v8）
- **计划** — `ask_patient assoc-sweating` · 空间要求 near-patient ≤ 3 m + line of sight (`b116`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-126`, `ev-127`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-126`, `ev-127`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked assoc-sweating —— 已确认

### 第 8 步 —— 问诊：觉得恶心吗？吐过没有？ ✓

- **观察** — 观察 observe_world（`b126`，世界 v8）
- **计划** — `ask_patient assoc-nausea` · 空间要求 near-patient ≤ 3 m + line of sight (`b124`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-137`, `ev-138`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-137`, `ev-138`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked assoc-nausea —— 已确认

### 第 9 步 —— 查看结果：12导联心电图（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b134`，世界 v8）
- **计划** — `read_result ecg-12lead` · 空间要求 bedside-provider [ecg-12lead] | at-provider [ecg-12lead] (fixed) (`b132`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-147`, `ev-148`
- **状态变化** — 引擎：result.read, time.advanced（`ev-147`, `ev-148`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ecg-12lead read —— 已确认

### 第 10 步 —— 开具检查：右胸及后壁导联心电图（V3R–V6R、V7–V9） ✓

- **观察** — 观察 observe_world（`b141`，世界 v8）; 观察 inspect `eq:resus1-ecg`（`b142`，世界 v8）; 观察 inspect `eq:resus1-ecg`（`b185`，世界 v13）
- **计划** — `order_test ecg-right-sided` · 空间要求 bedside-provider [ecg-12lead] | at-provider [ecg-12lead] (fixed) (`b139`)
- **导航** — navigate → 12 导联心电图机 1 (`eq:resus1-ecg`)：6.1 米，1.6 秒（动作 `wa-b146`，世界 v9）; navigate → 刘振华（化名） (`patient:resus-1`)：2.5 米，0.6 秒（动作 `wa-b163`，世界 v11）
- **设备交互** — prepare 12 导联心电图机 1 (`eq:resus1-ecg`) → failed（动作 `wa-b143`，世界 v8，目标 v4） ✗ NOT_IN_RANGE; prepare 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b154`，世界 v10，目标 v5）; connect 12 导联心电图机 1 (`eq:resus1-ecg`) → failed（动作 `wa-b160`，世界 v10，目标 v5） ✗ NOT_IN_RANGE; connect 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b170`，世界 v12，目标 v6）; record 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b175`，世界 v13，目标 v7）; reset 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b186`，世界 v14，目标 v8）
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-184`, `ev-185`
- **状态变化** — 世界：actor.moved, entity.state, reservation.changed; 引擎：order.placed, time.advanced（`ev-184`, `ev-185`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ecg-right-sided ordered —— 已确认

### 第 11 步 —— 处置：一键启动导管室（直接PCI） ✓

- **观察** — 观察 observe_world（`b195`，世界 v14）
- **计划** — `intervene activate-cath-lab` · 空间要求 anywhere (`b193`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `intervene` → ok；临床事件 `ev-200`, `ev-201`, `ev-202`
- **状态变化** — 引擎：intervention.applied, flag.changed, time.advanced（`ev-200`, `ev-201`, `ev-202`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：activate-cath-lab given —— 已确认

### 第 12 步 —— 开具检查：高敏肌钙蛋白T ✓

- **观察** — 观察 observe_world（`b202`，世界 v14）; 观察 inspect `eq:lab-workstation`（`b212`，世界 v15）; 观察 inspect `eq:lab-workstation`（`b221`，世界 v15）
- **计划** — `order_test hs-troponin` · 空间要求 at-provider [lab-chemistry] (`b200`)
- **导航** — navigate → 检验医嘱工作站 (`eq:lab-workstation`)：29.8 米，7.6 秒（动作 `wa-b203`，世界 v15）
- **设备交互** — order 检验医嘱工作站 (`eq:lab-workstation`) → completed（动作 `wa-b213`，世界 v15，目标 v0）
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-217`, `ev-218`
- **状态变化** — 世界：actor.moved; 引擎：order.placed, time.advanced（`ev-217`, `ev-218`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：hs-troponin ordered —— 已确认

### 第 13 步 —— 开具检查：血常规 ✓

- **观察** — 观察 observe_world（`b225`，世界 v15）; 观察 inspect `eq:lab-workstation`（`b226`，世界 v15）; 观察 inspect `eq:lab-workstation`（`b235`，世界 v15）
- **计划** — `order_test cbc` · 空间要求 at-provider [lab-hematology] (`b223`)
- **导航** — 无需
- **设备交互** — order 检验医嘱工作站 (`eq:lab-workstation`) → completed（动作 `wa-b227`，世界 v15，目标 v0）
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-227`, `ev-228`
- **状态变化** — 引擎：order.placed, time.advanced（`ev-227`, `ev-228`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：cbc ordered —— 已确认

### 第 14 步 —— 开具检查：电解质与肾功能 ✓

- **观察** — 观察 observe_world（`b239`，世界 v15）; 观察 inspect `eq:lab-workstation`（`b240`，世界 v15）; 观察 inspect `eq:lab-workstation`（`b249`，世界 v15）
- **计划** — `order_test renal-electrolytes` · 空间要求 at-provider [lab-chemistry] (`b237`)
- **导航** — 无需
- **设备交互** — order 检验医嘱工作站 (`eq:lab-workstation`) → completed（动作 `wa-b241`，世界 v15，目标 v0）
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-237`, `ev-238`
- **状态变化** — 引擎：order.placed, time.advanced（`ev-237`, `ev-238`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：renal-electrolytes ordered —— 已确认

### 第 15 步 —— 开具检查：凝血功能 ✓

- **观察** — 观察 observe_world（`b253`，世界 v15）; 观察 inspect `eq:lab-workstation`（`b254`，世界 v15）; 观察 inspect `eq:lab-workstation`（`b263`，世界 v15）
- **计划** — `order_test coagulation` · 空间要求 at-provider [lab-hematology] (`b251`)
- **导航** — 无需
- **设备交互** — order 检验医嘱工作站 (`eq:lab-workstation`) → completed（动作 `wa-b255`，世界 v15，目标 v0）
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-247`, `ev-248`
- **状态变化** — 引擎：order.placed, time.advanced（`ev-247`, `ev-248`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：coagulation ordered —— 已确认

### 第 16 步 —— 处置：阿司匹林负荷 (阿司匹林 300 mg 嚼服（非肠溶片）) ✓

- **观察** — 观察 observe_world（`b267`，世界 v15）
- **计划** — `intervene aspirin` · 空间要求 delivered to the bedside [medications] (`b265`)
- **导航** — navigate → 刘振华（化名） (`patient:resus-1`)：29.8 米，7.6 秒（动作 `wa-b268`，世界 v16）
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `intervene` → ok；临床事件 `ev-264`, `ev-265`, `ev-266`, `ev-267`
- **状态变化** — 世界：actor.moved; 引擎：intervention.applied, flag.changed, time.advanced, result.ready（`ev-264`, `ev-265`, `ev-266`, `ev-267`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：aspirin given —— 已确认

### 第 17 步 —— 查体：观察一般情况 ✓

- **观察** — 观察 observe_world（`b283`，世界 v16）
- **计划** — `examine general` · 空间要求 at-patient ≤ 1.5 m (`b281`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `examine` → ok；临床事件 `ev-277`, `ev-278`, `ev-280`
- **状态变化** — 引擎：exam.performed, objective.completed, time.advanced（`ev-277`, `ev-278`, `ev-280`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：examined general —— 已确认

### 第 18 步 —— 查体：检查颈静脉压 ✓

- **观察** — 观察 observe_world（`b290`，世界 v16）
- **计划** — `examine jvp` · 空间要求 at-patient ≤ 1.5 m (`b288`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `examine` → ok；临床事件 `ev-285`, `ev-286`
- **状态变化** — 引擎：exam.performed, time.advanced（`ev-285`, `ev-286`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：examined jvp —— 已确认

### 第 19 步 —— 查体：双肺听诊 ✓

- **观察** — 观察 observe_world（`b297`，世界 v16）
- **计划** — `examine lungs` · 空间要求 at-patient ≤ 1.5 m (`b295`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `examine` → ok；临床事件 `ev-291`, `ev-292`
- **状态变化** — 引擎：exam.performed, time.advanced（`ev-291`, `ev-292`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：examined lungs —— 已确认

### 第 20 步 —— 查看结果：右胸及后壁导联心电图（V3R–V6R、V7–V9）（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b304`，世界 v16）
- **计划** — `read_result ecg-right-sided` · 空间要求 bedside-provider [ecg-12lead] | at-provider [ecg-12lead] (fixed) (`b302`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-297`, `ev-298`
- **状态变化** — 引擎：result.read, time.advanced（`ev-297`, `ev-298`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ecg-right-sided read —— 已确认

### 第 21 步 —— 作答：综合病史、查体和心电图，最可能的诊断是什么？ → 急性下壁ST段抬高型心肌梗死合并右心室梗死（右冠近段闭塞可能） ✓

- **观察** — 无需
- **计划** — `answer_decision` (`b309`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `answer_decision` → ok；临床事件 `ev-303`
- **状态变化** — 引擎：decision.answered（`ev-303`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：decision dx-diagnosis answered —— 已确认

### 第 22 步 —— 问诊：疼痛是撕裂样的吗？有没有向后背放射？ ✓

- **观察** — 观察 observe_world（`b314`，世界 v16）
- **计划** — `ask_patient dissection-screen` · 空间要求 near-patient ≤ 3 m + line of sight (`b312`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-311`, `ev-312`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-311`, `ev-312`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked dissection-screen —— 已确认

### 第 23 步 —— 问诊：有没有中风、脑出血、胃出血或其他出血问题？最近有没有手术或头部外伤？ ✓

- **观察** — 观察 observe_world（`b322`，世界 v16）
- **计划** — `ask_patient bleeding-history` · 空间要求 near-patient ≤ 3 m + line of sight (`b320`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-322`, `ev-323`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-322`, `ev-323`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked bleeding-history —— 已确认

### 第 24 步 —— 问诊：有没有药物或其他过敏？ ✓

- **观察** — 观察 observe_world（`b330`，世界 v16）
- **计划** — `ask_patient allergies` · 空间要求 near-patient ≤ 3 m + line of sight (`b328`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-333`, `ev-334`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-333`, `ev-334`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked allergies —— 已确认

### 第 25 步 —— 问诊：平时吃什么药？今天吃了吗？来医院之前吃过什么药没有？ ✓

- **观察** — 观察 observe_world（`b338`，世界 v16）
- **计划** — `ask_patient medications` · 空间要求 near-patient ≤ 3 m + line of sight (`b336`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-344`, `ev-345`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-344`, `ev-345`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked medications —— 已确认

### 第 26 步 —— 查体：测量双上肢血压并比较双侧脉搏 ✓

- **观察** — 观察 observe_world（`b346`，世界 v16）
- **计划** — `examine bilateral-bp` · 空间要求 bedside-provider [cardiac-monitor] (`b344`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `examine` → ok；临床事件 `ev-354`, `ev-355`
- **状态变化** — 引擎：exam.performed, time.advanced（`ev-354`, `ev-355`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：examined bilateral-bp —— 已确认

### 第 27 步 —— 查体：心脏听诊 ✓

- **观察** — 观察 observe_world（`b353`，世界 v16）
- **计划** — `examine heart` · 空间要求 at-patient ≤ 1.5 m (`b351`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `examine` → ok；临床事件 `ev-360`, `ev-361`
- **状态变化** — 引擎：exam.performed, time.advanced（`ev-360`, `ev-361`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：examined heart —— 已确认

### 第 28 步 —— 作答：患者仍有8/10胸痛。护士问：“要不要给一片硝酸甘油含服？”你的最佳回答是？ → 不给硝酸酯；先小剂量补液维持前负荷，尽快再灌注，必要时小剂量滴定镇痛 ✓

- **观察** — 无需
- **计划** — `answer_decision` (`b358`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `answer_decision` → ok；临床事件 `ev-366`
- **状态变化** — 引擎：decision.answered（`ev-366`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：decision nitrate-safety answered —— 已确认

### 第 29 步 —— 处置：生理盐水补液 (0.9%氯化钠 500 mL 静脉快速输注（10–15分钟），每次后复评血压、颈静脉和肺部啰音) ✓

- **观察** — 观察 observe_world（`b363`，世界 v16）; 观察 inspect `eq:resus1-iv-pole`（`b364`，世界 v16）
- **计划** — `intervene fluid-bolus` · 空间要求 bedside-provider [iv-access] (`b361`)
- **导航** — navigate → 输液架 (`eq:resus1-iv-pole`)：7.1 米，1.8 秒（动作 `wa-b368`，世界 v17）; navigate → 刘振华（化名） (`patient:resus-1`)：1.5 米，0.4 秒（动作 `wa-b378`，世界 v18）
- **设备交互** — use 输液架 (`eq:resus1-iv-pole`) → failed（动作 `wa-b365`，世界 v16，目标 v0） ✗ NOT_IN_RANGE; use 输液架 (`eq:resus1-iv-pole`) → failed（动作 `wa-b375`，世界 v17，目标 v0） ✗ SPATIAL_REQUIREMENT_UNMET
- **审批** — 无需
- **临床操作** — `intervene` → ok；临床事件 `ev-389`, `ev-390`, `ev-391`, `ev-393`
- **状态变化** — 世界：actor.moved; 引擎：intervention.applied, flag.changed, objective.completed, time.advanced（`ev-389`, `ev-390`, `ev-391`, `ev-393`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：fluid-bolus given —— 已确认

### 第 30 步 —— 处置：替格瑞洛负荷 (替格瑞洛 180 mg 口服) ✓

- **观察** — 观察 observe_world（`b391`，世界 v18）
- **计划** — `intervene ticagrelor` · 空间要求 delivered to the bedside [medications] (`b389`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — intervene（moderate 风险）：approved
- **临床操作** — `intervene` → ok；临床事件 `ev-402`, `ev-403`, `ev-404`
- **状态变化** — 引擎：intervention.applied, flag.changed, time.advanced（`ev-402`, `ev-403`, `ev-404`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ticagrelor given —— 已确认

### 第 31 步 —— 处置：普通肝素静脉推注 (普通肝素 70–100 U/kg 静脉推注，导管室内按ACT追加) ✓

- **观察** — 观察 observe_world（`b401`，世界 v18）; 观察 inspect `eq:resus1-iv-pole`（`b402`，世界 v18）; 观察 inspect `eq:resus1-iv-pole`（`b413`，世界 v18）
- **计划** — `intervene ufh` · 空间要求 bedside-provider [iv-access] + delivered [medications] (`b399`)
- **导航** — 无需
- **设备交互** — use 输液架 (`eq:resus1-iv-pole`) → completed（动作 `wa-b403`，世界 v18，目标 v0）
- **审批** — intervene（moderate 风险）：approved
- **临床操作** — `intervene` → ok；临床事件 `ev-417`, `ev-418`, `ev-419`
- **状态变化** — 引擎：intervention.applied, flag.changed, time.advanced（`ev-417`, `ev-418`, `ev-419`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ufh given —— 已确认

### 第 32 步 —— 作答：本院有24小时可用的导管室，团队今天在院内。最佳再灌注策略是？ → 立即一键启动导管室行直接PCI，目标从STEMI诊断至导丝通过 ≤ 60分钟 ✓

- **观察** — 无需
- **计划** — `answer_decision` (`b415`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `answer_decision` → ok；临床事件 `ev-427`
- **状态变化** — 引擎：decision.answered（`ev-427`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：decision reperfusion-strategy answered —— 已确认

### 第 33 步 —— 作答：按本院胸痛中心流程，进入导管室前应给予哪些抗栓治疗？（多选，选出全部正确项） → 阿司匹林150–300 mg负荷（嚼服）、一种P2Y12抑制剂负荷（替格瑞洛180 mg 或 氯吡格雷600 mg）、普通肝素70–100 U/kg静脉推注 ✓

- **观察** — 无需
- **计划** — `answer_decision` (`b418`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `answer_decision` → ok；临床事件 `ev-432`
- **状态变化** — 引擎：decision.answered（`ev-432`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：decision antithrombotic-bundle answered —— 已确认

### 第 34 步 —— 问诊：抽烟吗？抽多少、抽了多少年？ ✓

- **观察** — 观察 observe_world（`b423`，世界 v18）
- **计划** — `ask_patient smoking` · 空间要求 near-patient ≤ 3 m + line of sight (`b421`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-440`, `ev-441`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-440`, `ev-441`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked smoking —— 已确认

### 第 35 步 —— 问诊：有高血压吗？ ✓

- **观察** — 观察 observe_world（`b431`，世界 v18）
- **计划** — `ask_patient pmh-htn` · 空间要求 near-patient ≤ 3 m + line of sight (`b429`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-451`, `ev-452`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-451`, `ev-452`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked pmh-htn —— 已确认

### 第 36 步 —— 问诊：你最担心的是什么？你觉得是怎么回事？ ✓

- **观察** — 观察 observe_world（`b439`，世界 v18）
- **计划** — `ask_patient ice-concerns` · 空间要求 near-patient ≤ 3 m + line of sight (`b437`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-462`, `ev-463`, `ev-465`, `ev-466`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-462`, `ev-463`, `ev-465`, `ev-466`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked ice-concerns —— 已确认

### 第 37 步 —— 处置：贴除颤/起搏电极片 ✓

- **观察** — 观察 observe_world（`b447`，世界 v18）; 观察 inspect `eq:resus1-monitor`（`b448`，世界 v18）
- **计划** — `intervene defib-pads` · 空间要求 bedside-provider [defibrillator] (`b445`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `intervene` → ok；临床事件 `ev-475`, `ev-476`, `ev-477`
- **状态变化** — 引擎：intervention.applied, flag.changed, time.advanced（`ev-475`, `ev-476`, `ev-477`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：defib-pads given —— 已确认

### 第 38 步 —— 处置：转运至导管室 (医生与护士陪同，携带监护仪、除颤仪及急救药品转运) ✓

- **观察** — 观察 observe_world（`b455`，世界 v18）
- **计划** — `intervene transfer-cath-lab` · 空间要求 anywhere (`b453`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — intervene（moderate 风险）：approved
- **临床操作** — `intervene` → ok；临床事件 `ev-486`, `ev-487`, `ev-488`, `ev-489`
- **状态变化** — 引擎：intervention.applied, flag.changed, phase.changed, time.advanced（`ev-486`, `ev-487`, `ev-488`, `ev-489`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：transfer-cath-lab given; monitor attachment latched (engine + eq:resus1-monitor) = true —— 已确认

### 第 39 步 —— 开具检查：冠状动脉造影（直接PCI） ✓

- **观察** — 观察 observe_world（`b464`，世界 v18）; 观察 inspect `eq:radiology-console`（`b474`，世界 v19）; 观察 inspect `eq:radiology-console`（`b485`，世界 v19）
- **计划** — `order_test coronary-angiography` · 空间要求 at-provider [fluoroscopy] (`b462`)
- **导航** — navigate → 影像医嘱与阅片工作站 (`eq:radiology-console`)：35.6 米，9.1 秒（动作 `wa-b465`，世界 v19）
- **设备交互** — order 影像医嘱与阅片工作站 (`eq:radiology-console`) → completed（动作 `wa-b475`，世界 v19，目标 v0）
- **审批** — order_test（moderate 风险）：approved
- **临床操作** — `order_test` → ok；临床事件 `ev-508`, `ev-509`
- **状态变化** — 世界：actor.moved; 引擎：order.placed, time.advanced（`ev-508`, `ev-509`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：coronary-angiography ordered —— 已确认

### 第 40 步 —— 等待 12.25 分钟 ✓

- **观察** — 无需
- **计划** — `wait` (`b487`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `wait` → ok；临床事件 `ev-517`
- **状态变化** — 引擎：time.advanced（`ev-517`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：time advanced 12.25 min —— 已确认

### 第 41 步 —— 等待 7.25 分钟 ✓

- **观察** — 无需
- **计划** — `wait` (`b490`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `wait` → ok；临床事件 `ev-524`
- **状态变化** — 引擎：time.advanced（`ev-524`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：time advanced 7.25 min —— 已确认

### 第 42 步 —— 查看结果：冠状动脉造影（直接PCI）（导管室） ✓

- **观察** — 观察 observe_world（`b497`，世界 v19）; 观察 inspect `eq:radiology-console`（`b498`，世界 v19）; 观察 inspect `eq:radiology-console`（`b507`，世界 v19）
- **计划** — `read_result coronary-angiography` · 空间要求 at-provider [fluoroscopy] (`b495`)
- **导航** — 无需
- **设备交互** — read 影像医嘱与阅片工作站 (`eq:radiology-console`) → completed（动作 `wa-b499`，世界 v19，目标 v0）
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-545`, `ev-546`, `ev-547`
- **状态变化** — 引擎：result.read, time.advanced, result.ready（`ev-545`, `ev-546`, `ev-547`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：coronary-angiography read —— 已确认

### 第 43 步 —— 开具检查：12导联心电图 ✓

- **观察** — 观察 observe_world（`b511`，世界 v19）; 观察 inspect `eq:resus1-ecg`（`b520`，世界 v20）; 观察 inspect `eq:resus1-ecg`（`b542`，世界 v23）
- **计划** — `order_test ecg-12lead` · 空间要求 bedside-provider [ecg-12lead] | at-provider [ecg-12lead] (fixed) (`b509`)
- **导航** — navigate → 刘振华（化名） (`patient:resus-1`)：31.1 米，8.0 秒（动作 `wa-b512`，世界 v20）
- **设备交互** — prepare 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b521`，世界 v21，目标 v9）; connect 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b527`，世界 v22，目标 v10）; record 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b532`，世界 v23，目标 v11）; reset 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b543`，世界 v24，目标 v12）
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-575`, `ev-576`
- **状态变化** — 世界：actor.moved, entity.state, reservation.changed; 引擎：order.placed, time.advanced（`ev-575`, `ev-576`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ecg-12lead ordered —— 已确认

### 第 44 步 —— 等待 4 分钟 ✓

- **观察** — 无需
- **计划** — `wait` (`b550`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `wait` → ok；临床事件 `ev-585`
- **状态变化** — 引擎：time.advanced（`ev-585`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：time advanced 4 min —— 已确认

### 第 45 步 —— 查看结果：12导联心电图（导管室 · PCI术后） ✓

- **观察** — 观察 observe_world（`b555`，世界 v24）
- **计划** — `read_result ecg-12lead` · 空间要求 bedside-provider [ecg-12lead] | at-provider [ecg-12lead] (fixed) (`b553`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-597`, `ev-598`, `ev-600`, `ev-602`
- **状态变化** — 引擎：result.read, objective.completed, case.completed, time.advanced（`ev-597`, `ev-598`, `ev-600`, `ev-602`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ecg-12lead read —— 已确认

### 第 46 步 —— 查看结果：血常规（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b562`，世界 v24）; 观察 inspect `eq:lab-workstation`（`b571`，世界 v25）; 观察 inspect `eq:lab-workstation`（`b581`，世界 v25）
- **计划** — `read_result cbc` · 空间要求 at-provider [lab-hematology] (`b560`)
- **导航** — navigate → 检验医嘱工作站 (`eq:lab-workstation`)：29.8 米，7.6 秒（动作 `wa-b563`，世界 v25）
- **设备交互** — read 检验医嘱工作站 (`eq:lab-workstation`) → completed（动作 `wa-b572`，世界 v25，目标 v0）
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-616`, `ev-617`, `ev-618`
- **状态变化** — 世界：actor.moved; 引擎：result.read, time.advanced, result.ready（`ev-616`, `ev-617`, `ev-618`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：cbc read —— 已确认

### 第 47 步 —— 查看结果：电解质与肾功能（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b585`，世界 v25）; 观察 inspect `eq:lab-workstation`（`b586`，世界 v25）; 观察 inspect `eq:lab-workstation`（`b595`，世界 v25）
- **计划** — `read_result renal-electrolytes` · 空间要求 at-provider [lab-chemistry] (`b583`)
- **导航** — 无需
- **设备交互** — read 检验医嘱工作站 (`eq:lab-workstation`) → completed（动作 `wa-b587`，世界 v25，目标 v0）
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-632`, `ev-633`
- **状态变化** — 引擎：result.read, time.advanced（`ev-632`, `ev-633`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：renal-electrolytes read —— 已确认

### 第 48 步 —— 查看结果：凝血功能（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b599`，世界 v25）; 观察 inspect `eq:lab-workstation`（`b600`，世界 v25）; 观察 inspect `eq:lab-workstation`（`b609`，世界 v25）
- **计划** — `read_result coagulation` · 空间要求 at-provider [lab-hematology] (`b597`)
- **导航** — 无需
- **设备交互** — read 检验医嘱工作站 (`eq:lab-workstation`) → completed（动作 `wa-b601`，世界 v25，目标 v0）
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-642`, `ev-643`
- **状态变化** — 引擎：result.read, time.advanced（`ev-642`, `ev-643`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：coagulation read —— 已确认

### 第 49 步 —— 查看结果：高敏肌钙蛋白T（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b613`，世界 v25）; 观察 inspect `eq:lab-workstation`（`b614`，世界 v25）; 观察 inspect `eq:lab-workstation`（`b623`，世界 v25）
- **计划** — `read_result hs-troponin` · 空间要求 at-provider [lab-chemistry] (`b611`)
- **导航** — 无需
- **设备交互** — read 检验医嘱工作站 (`eq:lab-workstation`) → completed（动作 `wa-b615`，世界 v25，目标 v0）
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-652`, `ev-653`
- **状态变化** — 引擎：result.read, time.advanced（`ev-652`, `ev-653`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：hs-troponin read —— 已确认

### 第 50 步 —— 结束病例。 ✓

- **观察** — 无需
- **计划** — `finish_case` (`b625`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `finish_case` → ok；临床事件 `ev-661`
- **状态变化** — 引擎：case.finished（`ev-661`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：case finished —— 已确认

## 最终评估

- 得分 20/20（100%）
- 目标 5/5
- 首次即答对的决策：4/4
- 禁忌干预：0
- 模拟时间 67.01 分钟
- 评估: `bench-assessment` (是)

## 复现

```bash
npm run -s cc -- bench demo --case stemi-inferior-rv --lang zh-CN --out <dir>
```
