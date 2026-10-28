# 参考演示 —— 具身接诊：胸痛 · 58岁男性

> 本演示验证的是基础设施（确定性地重放病例的参考解法），而不是临床推理能力。

病例 `stemi-inferior-rv` · 场馆 `general-hospital` · 语言 zh-CN · 提交 `ddbb594d96df (工作区有未提交的修改)` · 2026-10-20T06:52:48.865Z

具身参考医生（具身模式下的离线示范接诊）在病例自己的场馆中无界面地完成接诊；每一个审批请求都由一位上级医师答复（批准）。下面每一步都把 观察 → 计划 → 导航 → 设备交互 → 临床操作 → 状态变化 → 核验 串联起来，并给出世界版本、目标版本、动作 ID 与临床事件 ID（均取自本次轨迹 `trace.jsonl`）；每一步的结论都在运行结束后对照权威的引擎状态和世界状态重新核验，最后给出评估。✗ 表示被世界或空间闸门拒绝的世界动作：拒绝及随后的恢复都保留在记录中。

## 概要

- 通过 —— 每一步都得到权威状态的确认。
- 50 步 · 288 个轨迹片段 · 26 次世界动作 · 世界版本 23 · 模拟 66.7 分钟
- 3 次世界动作被拒绝并已恢复（见下文 ✗）
- 4 个审批请求由上级医师答复（批准 4 个）
- 独立审计：44 个受空间约束的操作，被接受的空间违规 0 个；49 个受权限约束的操作，未经授权 0 个

## 步骤

### 第 1 步 —— 开具检查：12导联心电图 ✓

- **观察** — 观察 observe_world（`b6`，世界 v0）; 观察 inspect `eq:resus1-ecg`（`b16`，世界 v1）; 观察 inspect `eq:resus1-ecg`（`b38`，世界 v4）
- **计划** — `order_test ecg-12lead` · 空间要求 bedside-provider [ecg-12lead] | the patient at [ecg-12lead] + at-provider [ecg-12lead] (fixed) (`b4`)
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
- **核验** — 轨迹中的后置条件：ok; 权威状态：cardiac-monitoring given; monitor attachment latched (engine + eq:cathlab-monitor) = true —— 已确认

### 第 3 步 —— 处置：建立静脉通路（左前臂） (左前臂18G留置针，同时抽血送检（保留右桡动脉供PCI入路）) ✓

- **观察** — 观察 observe_world（`b64`，世界 v6）; 观察 inspect `eq:resus1-crash-cart`（`b65`，世界 v6）; 观察 inspect `eq:resus1-crash-cart`（`b85`，世界 v7）
- **计划** — `intervene iv-access` · 空间要求 bedside-provider [iv-access] (`b62`)
- **导航** — navigate → —：1.5 米，0.4 秒（动作 `wa-b69`，世界 v7）
- **设备交互** — use 抢救车 1 (`eq:resus1-crash-cart`) → failed（动作 `wa-b66`，世界 v6，目标 v0） ✗ NOT_IN_RANGE; use 抢救车 1 (`eq:resus1-crash-cart`) → completed（动作 `wa-b77`，世界 v7，目标 v0）
- **审批** — 无需
- **临床操作** — `intervene` → ok；临床事件 `ev-68`, `ev-69`, `ev-70`
- **状态变化** — 世界：actor.moved; 引擎：intervention.applied, flag.changed, time.advanced（`ev-68`, `ev-69`, `ev-70`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：iv-access given —— 已确认

### 第 4 步 —— 问诊：疼痛是什么时候开始的？当时在做什么？ ✓

- **观察** — 观察 observe_world（`b89`，世界 v7）
- **计划** — `ask_patient hpi-onset` · 空间要求 near-patient ≤ 3 m + line of sight (`b87`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-79`, `ev-80`, `ev-82`, `ev-83`, `ev-84`
- **状态变化** — 引擎：history.asked, time.advanced, result.ready（`ev-79`, `ev-80`, `ev-82`, `ev-83`, `ev-84`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked hpi-onset —— 已确认

### 第 5 步 —— 问诊：是什么样的疼？ ✓

- **观察** — 观察 observe_world（`b98`，世界 v7）
- **计划** — `ask_patient pain-character` · 空间要求 near-patient ≤ 3 m + line of sight (`b96`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-99`, `ev-100`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-99`, `ev-100`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked pain-character —— 已确认

### 第 6 步 —— 问诊：疼痛会往别的地方放射吗？ ✓

- **观察** — 观察 observe_world（`b106`，世界 v7）
- **计划** — `ask_patient pain-radiation` · 空间要求 near-patient ≤ 3 m + line of sight (`b104`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-110`, `ev-111`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-110`, `ev-111`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked pain-radiation —— 已确认

### 第 7 步 —— 问诊：出汗多吗？有没有出冷汗？ ✓

- **观察** — 观察 observe_world（`b114`，世界 v7）
- **计划** — `ask_patient assoc-sweating` · 空间要求 near-patient ≤ 3 m + line of sight (`b112`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-121`, `ev-122`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-121`, `ev-122`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked assoc-sweating —— 已确认

### 第 8 步 —— 问诊：觉得恶心吗？吐过没有？ ✓

- **观察** — 观察 observe_world（`b122`，世界 v7）
- **计划** — `ask_patient assoc-nausea` · 空间要求 near-patient ≤ 3 m + line of sight (`b120`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-132`, `ev-133`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-132`, `ev-133`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked assoc-nausea —— 已确认

### 第 9 步 —— 查看结果：12导联心电图（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b130`，世界 v7）
- **计划** — `read_result ecg-12lead` · 空间要求 at-patient ≤ 1.5 m | at-provider [records] | at-provider [ecg-12lead] (fixed) (`b128`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-142`, `ev-143`
- **状态变化** — 引擎：result.read, time.advanced（`ev-142`, `ev-143`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ecg-12lead read —— 已确认

### 第 10 步 —— 开具检查：右胸及后壁导联心电图（V3R–V6R、V7–V9） ✓

- **观察** — 观察 observe_world（`b137`，世界 v7）; 观察 inspect `eq:resus1-ecg`（`b138`，世界 v7）; 观察 inspect `eq:resus1-ecg`（`b171`，世界 v11）
- **计划** — `order_test ecg-right-sided` · 空间要求 bedside-provider [ecg-12lead] | the patient at [ecg-12lead] + at-provider [ecg-12lead] (fixed) (`b135`)
- **导航** — navigate → —：1.0 米，0.3 秒（动作 `wa-b142`，世界 v8）; navigate → 12 导联心电图机 1 (`eq:resus1-ecg`)：0.5 米，0.1 秒（动作 `wa-b175`，世界 v12）
- **设备交互** — prepare 12 导联心电图机 1 (`eq:resus1-ecg`) → failed（动作 `wa-b139`，世界 v7，目标 v4） ✗ NOT_IN_RANGE; prepare 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b150`，世界 v9，目标 v5）; connect 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b156`，世界 v10，目标 v6）; record 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b161`，世界 v11，目标 v7）; reset 12 导联心电图机 1 (`eq:resus1-ecg`) → failed（动作 `wa-b172`，世界 v11，目标 v7） ✗ NOT_IN_RANGE; reset 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b182`，世界 v13，目标 v8）
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-168`, `ev-169`
- **状态变化** — 世界：actor.moved, entity.state, reservation.changed; 引擎：order.placed, time.advanced（`ev-168`, `ev-169`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ecg-right-sided ordered —— 已确认

### 第 11 步 —— 处置：一键启动导管室（直接PCI） ✓

- **观察** — 观察 observe_world（`b191`，世界 v13）
- **计划** — `intervene activate-cath-lab` · 空间要求 anywhere (`b189`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `intervene` → ok；临床事件 `ev-191`, `ev-192`, `ev-193`
- **状态变化** — 引擎：intervention.applied, flag.changed, time.advanced（`ev-191`, `ev-192`, `ev-193`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：activate-cath-lab given —— 已确认

### 第 12 步 —— 开具检查：高敏肌钙蛋白T ✓

- **观察** — 观察 observe_world（`b198`，世界 v13）
- **计划** — `order_test hs-troponin` · 空间要求 at-patient ≤ 1.5 m (sample) | clinical: sample (iv-access first) + (at-provider [records] | at-provider [lab-chemistry]) (`b196`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-198`, `ev-199`
- **状态变化** — 引擎：order.placed, time.advanced（`ev-198`, `ev-199`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：hs-troponin ordered —— 已确认

### 第 13 步 —— 开具检查：血常规 ✓

- **观察** — 观察 observe_world（`b205`，世界 v13）
- **计划** — `order_test cbc` · 空间要求 at-patient ≤ 1.5 m (sample) | clinical: sample (iv-access first) + (at-provider [records] | at-provider [lab-hematology]) (`b203`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-204`, `ev-205`
- **状态变化** — 引擎：order.placed, time.advanced（`ev-204`, `ev-205`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：cbc ordered —— 已确认

### 第 14 步 —— 开具检查：电解质与肾功能 ✓

- **观察** — 观察 observe_world（`b212`，世界 v13）
- **计划** — `order_test renal-electrolytes` · 空间要求 at-patient ≤ 1.5 m (sample) | clinical: sample (iv-access first) + (at-provider [records] | at-provider [lab-chemistry]) (`b210`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-210`, `ev-211`
- **状态变化** — 引擎：order.placed, time.advanced（`ev-210`, `ev-211`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：renal-electrolytes ordered —— 已确认

### 第 15 步 —— 开具检查：凝血功能 ✓

- **观察** — 观察 observe_world（`b219`，世界 v13）
- **计划** — `order_test coagulation` · 空间要求 at-patient ≤ 1.5 m (sample) | clinical: sample (iv-access first) + (at-provider [records] | at-provider [lab-hematology]) (`b217`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-216`, `ev-217`
- **状态变化** — 引擎：order.placed, time.advanced（`ev-216`, `ev-217`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：coagulation ordered —— 已确认

### 第 16 步 —— 处置：阿司匹林负荷 (阿司匹林 300 mg 嚼服（非肠溶片）) ✓

- **观察** — 观察 observe_world（`b226`，世界 v13）
- **计划** — `intervene aspirin` · 空间要求 delivered to the bedside [medications] (`b224`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `intervene` → ok；临床事件 `ev-222`, `ev-223`, `ev-224`, `ev-225`
- **状态变化** — 引擎：intervention.applied, flag.changed, time.advanced, result.ready（`ev-222`, `ev-223`, `ev-224`, `ev-225`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：aspirin given —— 已确认

### 第 17 步 —— 查体：观察一般情况 ✓

- **观察** — 观察 observe_world（`b234`，世界 v13）
- **计划** — `examine general` · 空间要求 at-patient ≤ 1.5 m (`b232`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `examine` → ok；临床事件 `ev-235`, `ev-236`, `ev-238`
- **状态变化** — 引擎：exam.performed, objective.completed, time.advanced（`ev-235`, `ev-236`, `ev-238`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：examined general —— 已确认

### 第 18 步 —— 查体：检查颈静脉压 ✓

- **观察** — 观察 observe_world（`b241`，世界 v13）
- **计划** — `examine jvp` · 空间要求 at-patient ≤ 1.5 m (`b239`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `examine` → ok；临床事件 `ev-243`, `ev-244`
- **状态变化** — 引擎：exam.performed, time.advanced（`ev-243`, `ev-244`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：examined jvp —— 已确认

### 第 19 步 —— 查体：双肺听诊 ✓

- **观察** — 观察 observe_world（`b248`，世界 v13）
- **计划** — `examine lungs` · 空间要求 at-patient ≤ 1.5 m (`b246`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `examine` → ok；临床事件 `ev-249`, `ev-250`
- **状态变化** — 引擎：exam.performed, time.advanced（`ev-249`, `ev-250`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：examined lungs —— 已确认

### 第 20 步 —— 查看结果：右胸及后壁导联心电图（V3R–V6R、V7–V9）（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b255`，世界 v13）
- **计划** — `read_result ecg-right-sided` · 空间要求 at-patient ≤ 1.5 m | at-provider [records] | at-provider [ecg-12lead] (fixed) (`b253`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-255`, `ev-256`
- **状态变化** — 引擎：result.read, time.advanced（`ev-255`, `ev-256`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ecg-right-sided read —— 已确认

### 第 21 步 —— 作答：综合病史、查体和心电图，最可能的诊断是什么？ → 急性下壁ST段抬高型心肌梗死合并右心室梗死（右冠近段闭塞可能） ✓

- **观察** — 无需
- **计划** — `answer_decision` (`b260`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `answer_decision` → ok；临床事件 `ev-261`
- **状态变化** — 引擎：decision.answered（`ev-261`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：decision dx-diagnosis answered —— 已确认

### 第 22 步 —— 问诊：疼痛是撕裂样的吗？有没有向后背放射？ ✓

- **观察** — 观察 observe_world（`b265`，世界 v13）
- **计划** — `ask_patient dissection-screen` · 空间要求 near-patient ≤ 3 m + line of sight (`b263`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-269`, `ev-270`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-269`, `ev-270`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked dissection-screen —— 已确认

### 第 23 步 —— 问诊：有没有中风、脑出血、胃出血或其他出血问题？最近有没有手术或头部外伤？ ✓

- **观察** — 观察 observe_world（`b273`，世界 v13）
- **计划** — `ask_patient bleeding-history` · 空间要求 near-patient ≤ 3 m + line of sight (`b271`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-280`, `ev-281`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-280`, `ev-281`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked bleeding-history —— 已确认

### 第 24 步 —— 问诊：有没有药物或其他过敏？ ✓

- **观察** — 观察 observe_world（`b281`，世界 v13）
- **计划** — `ask_patient allergies` · 空间要求 near-patient ≤ 3 m + line of sight (`b279`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-291`, `ev-292`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-291`, `ev-292`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked allergies —— 已确认

### 第 25 步 —— 问诊：平时吃什么药？今天吃了吗？来医院之前吃过什么药没有？ ✓

- **观察** — 观察 observe_world（`b289`，世界 v13）
- **计划** — `ask_patient medications` · 空间要求 near-patient ≤ 3 m + line of sight (`b287`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-302`, `ev-303`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-302`, `ev-303`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked medications —— 已确认

### 第 26 步 —— 查体：测量双上肢血压并比较双侧脉搏 ✓

- **观察** — 观察 observe_world（`b297`，世界 v13）
- **计划** — `examine bilateral-bp` · 空间要求 bedside-provider [cardiac-monitor] (`b295`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `examine` → ok；临床事件 `ev-312`, `ev-313`
- **状态变化** — 引擎：exam.performed, time.advanced（`ev-312`, `ev-313`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：examined bilateral-bp —— 已确认

### 第 27 步 —— 查体：心脏听诊 ✓

- **观察** — 观察 observe_world（`b304`，世界 v13）
- **计划** — `examine heart` · 空间要求 at-patient ≤ 1.5 m (`b302`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `examine` → ok；临床事件 `ev-318`, `ev-319`
- **状态变化** — 引擎：exam.performed, time.advanced（`ev-318`, `ev-319`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：examined heart —— 已确认

### 第 28 步 —— 作答：患者仍有8/10胸痛。护士问：“要不要给一片硝酸甘油含服？”你的最佳回答是？ → 不给硝酸酯；先小剂量补液维持前负荷，尽快再灌注，必要时小剂量滴定镇痛 ✓

- **观察** — 无需
- **计划** — `answer_decision` (`b309`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `answer_decision` → ok；临床事件 `ev-324`
- **状态变化** — 引擎：decision.answered（`ev-324`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：decision nitrate-safety answered —— 已确认

### 第 29 步 —— 处置：生理盐水补液 (0.9%氯化钠 500 mL 静脉快速输注（10–15分钟），每次后复评血压、颈静脉和肺部啰音) ✓

- **观察** — 观察 observe_world（`b314`，世界 v13）
- **计划** — `intervene fluid-bolus` · 空间要求 clinical: iv-access (iv-access first) + at-patient ≤ 1.5 m (`b312`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `intervene` → ok；临床事件 `ev-329`, `ev-330`, `ev-331`, `ev-333`
- **状态变化** — 引擎：intervention.applied, flag.changed, objective.completed, time.advanced（`ev-329`, `ev-330`, `ev-331`, `ev-333`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：fluid-bolus given —— 已确认

### 第 30 步 —— 处置：替格瑞洛负荷 (替格瑞洛 180 mg 口服) ✓

- **观察** — 观察 observe_world（`b321`，世界 v13）
- **计划** — `intervene ticagrelor` · 空间要求 delivered to the bedside [medications] (`b319`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — intervene（moderate 风险）：approved
- **临床操作** — `intervene` → ok；临床事件 `ev-342`, `ev-343`, `ev-344`
- **状态变化** — 引擎：intervention.applied, flag.changed, time.advanced（`ev-342`, `ev-343`, `ev-344`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ticagrelor given —— 已确认

### 第 31 步 —— 处置：普通肝素静脉推注 (普通肝素 70–100 U/kg 静脉推注，导管室内按ACT追加) ✓

- **观察** — 观察 observe_world（`b331`，世界 v13）
- **计划** — `intervene ufh` · 空间要求 clinical: iv-access (iv-access first) + delivered to the bedside [medications] (`b329`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — intervene（moderate 风险）：approved
- **临床操作** — `intervene` → ok；临床事件 `ev-356`, `ev-357`, `ev-358`
- **状态变化** — 引擎：intervention.applied, flag.changed, time.advanced（`ev-356`, `ev-357`, `ev-358`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ufh given —— 已确认

### 第 32 步 —— 作答：本院有24小时可用的导管室，团队今天在院内。最佳再灌注策略是？ → 立即一键启动导管室行直接PCI，目标从STEMI诊断至导丝通过 ≤ 60分钟 ✓

- **观察** — 无需
- **计划** — `answer_decision` (`b338`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `answer_decision` → ok；临床事件 `ev-363`
- **状态变化** — 引擎：decision.answered（`ev-363`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：decision reperfusion-strategy answered —— 已确认

### 第 33 步 —— 作答：按本院胸痛中心流程，进入导管室前应给予哪些抗栓治疗？（多选，选出全部正确项） → 阿司匹林150–300 mg负荷（嚼服）、一种P2Y12抑制剂负荷（替格瑞洛180 mg 或 氯吡格雷600 mg）、普通肝素70–100 U/kg静脉推注 ✓

- **观察** — 无需
- **计划** — `answer_decision` (`b341`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `answer_decision` → ok；临床事件 `ev-368`
- **状态变化** — 引擎：decision.answered（`ev-368`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：decision antithrombotic-bundle answered —— 已确认

### 第 34 步 —— 问诊：抽烟吗？抽多少、抽了多少年？ ✓

- **观察** — 观察 observe_world（`b346`，世界 v13）
- **计划** — `ask_patient smoking` · 空间要求 near-patient ≤ 3 m + line of sight (`b344`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-376`, `ev-377`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-376`, `ev-377`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked smoking —— 已确认

### 第 35 步 —— 问诊：有高血压吗？ ✓

- **观察** — 观察 observe_world（`b354`，世界 v13）
- **计划** — `ask_patient pmh-htn` · 空间要求 near-patient ≤ 3 m + line of sight (`b352`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-387`, `ev-388`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-387`, `ev-388`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked pmh-htn —— 已确认

### 第 36 步 —— 问诊：你最担心的是什么？你觉得是怎么回事？ ✓

- **观察** — 观察 observe_world（`b362`，世界 v13）
- **计划** — `ask_patient ice-concerns` · 空间要求 near-patient ≤ 3 m + line of sight (`b360`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `ask_patient` → ok；临床事件 `ev-398`, `ev-399`, `ev-401`, `ev-402`
- **状态变化** — 引擎：history.asked, time.advanced（`ev-398`, `ev-399`, `ev-401`, `ev-402`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：asked ice-concerns —— 已确认

### 第 37 步 —— 处置：贴除颤/起搏电极片 ✓

- **观察** — 观察 observe_world（`b370`，世界 v13）; 观察 inspect `eq:resus1-monitor`（`b371`，世界 v13）
- **计划** — `intervene defib-pads` · 空间要求 bedside-provider [defibrillator] (`b368`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `intervene` → ok；临床事件 `ev-411`, `ev-412`, `ev-413`
- **状态变化** — 引擎：intervention.applied, flag.changed, time.advanced（`ev-411`, `ev-412`, `ev-413`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：defib-pads given —— 已确认

### 第 38 步 —— 处置：转运至导管室 (医生与护士陪同，携带监护仪、除颤仪及急救药品转运) ✓

- **观察** — 观察 observe_world（`b378`，世界 v13）
- **计划** — `intervene transfer-cath-lab` · 空间要求 anywhere (`b376`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — intervene（moderate 风险）：approved
- **临床操作** — `intervene` → ok；临床事件 `ev-422`, `ev-425`, `ev-426`, `ev-427`
- **状态变化** — 引擎：intervention.applied, flag.changed, phase.changed, time.advanced（`ev-422`, `ev-425`, `ev-426`, `ev-427`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：transfer-cath-lab given; monitor attachment latched (engine + eq:cathlab-monitor) = true —— 已确认

### 第 39 步 —— 开具检查：冠状动脉造影（直接PCI） ✓

- **观察** — 观察 observe_world（`b388`，世界 v15）; 观察 inspect `eq:radiology-console`（`b398`，世界 v16）; 观察 inspect `eq:radiology-console`（`b409`，世界 v16）
- **计划** — `order_test coronary-angiography` · 空间要求 the patient at [fluoroscopy] + at-provider [fluoroscopy] (`b386`)
- **导航** — navigate → 影像医嘱与阅片工作站 (`eq:radiology-console`)：31.1 米，8.0 秒（动作 `wa-b389`，世界 v16）
- **设备交互** — order 影像医嘱与阅片工作站 (`eq:radiology-console`) → completed（动作 `wa-b399`，世界 v16，目标 v0）
- **审批** — order_test（moderate 风险）：approved
- **临床操作** — `order_test` → ok；临床事件 `ev-446`, `ev-447`
- **状态变化** — 世界：actor.moved; 引擎：order.placed, time.advanced（`ev-446`, `ev-447`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：coronary-angiography ordered —— 已确认

### 第 40 步 —— 等待 12.62 分钟 ✓

- **观察** — 无需
- **计划** — `wait` (`b411`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `wait` → ok；临床事件 `ev-455`
- **状态变化** — 引擎：time.advanced（`ev-455`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：time advanced 12.62 min —— 已确认

### 第 41 步 —— 等待 6.88 分钟 ✓

- **观察** — 无需
- **计划** — `wait` (`b414`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `wait` → ok；临床事件 `ev-462`
- **状态变化** — 引擎：time.advanced（`ev-462`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：time advanced 6.88 min —— 已确认

### 第 42 步 —— 查看结果：冠状动脉造影（直接PCI）（导管室） ✓

- **观察** — 观察 observe_world（`b420`，世界 v16）; 观察 inspect `eq:radiology-console`（`b421`，世界 v16）; 观察 inspect `eq:radiology-console`（`b430`，世界 v16）
- **计划** — `read_result coronary-angiography` · 空间要求 at-provider [fluoroscopy] (`b418`)
- **导航** — 无需
- **设备交互** — read 影像医嘱与阅片工作站 (`eq:radiology-console`) → completed（动作 `wa-b422`，世界 v16，目标 v0）
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-477`, `ev-478`, `ev-479`
- **状态变化** — 引擎：result.read, time.advanced, result.ready（`ev-477`, `ev-478`, `ev-479`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：coronary-angiography read —— 已确认

### 第 43 步 —— 开具检查：12导联心电图 ✓

- **观察** — 观察 observe_world（`b434`，世界 v16）; 观察 inspect `eq:resus1-ecg`（`b453`，世界 v19）; 观察 inspect `eq:resus1-ecg`（`b475`，世界 v22）
- **计划** — `order_test ecg-12lead` · 空间要求 bedside-provider [ecg-12lead] | the patient at [ecg-12lead] + at-provider [ecg-12lead] (fixed) (`b432`)
- **导航** — navigate → 12 导联心电图机 1 (`eq:resus1-ecg`)：30.1 米，7.7 秒（动作 `wa-b435`，世界 v17）; move_to → 12 导联心电图机 1 (`eq:resus1-ecg`)：46.0 米，11.8 秒（动作 `wa-b443`，世界 v19）
- **设备交互** — prepare 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b454`，世界 v20，目标 v10）; connect 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b460`，世界 v21，目标 v11）; record 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b465`，世界 v22，目标 v12）; reset 12 导联心电图机 1 (`eq:resus1-ecg`) → completed（动作 `wa-b476`，世界 v23，目标 v13）
- **审批** — 无需
- **临床操作** — `order_test` → ok；临床事件 `ev-517`, `ev-518`
- **状态变化** — 世界：actor.moved, entity.moved, entity.state, reservation.changed; 引擎：order.placed, time.advanced（`ev-517`, `ev-518`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ecg-12lead ordered —— 已确认

### 第 44 步 —— 等待 4 分钟 ✓

- **观察** — 无需
- **计划** — `wait` (`b483`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `wait` → ok；临床事件 `ev-527`
- **状态变化** — 引擎：time.advanced（`ev-527`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：time advanced 4 min —— 已确认

### 第 45 步 —— 查看结果：12导联心电图（导管室 · PCI术后） ✓

- **观察** — 观察 observe_world（`b488`，世界 v23）
- **计划** — `read_result ecg-12lead` · 空间要求 at-patient ≤ 1.5 m | at-provider [records] | at-provider [ecg-12lead] (fixed) (`b486`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-539`, `ev-540`, `ev-542`, `ev-544`
- **状态变化** — 引擎：result.read, objective.completed, case.completed, time.advanced（`ev-539`, `ev-540`, `ev-542`, `ev-544`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：ecg-12lead read —— 已确认

### 第 46 步 —— 查看结果：血常规（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b495`，世界 v23）
- **计划** — `read_result cbc` · 空间要求 at-provider [records] | at-patient ≤ 1.5 m | at-provider [lab-hematology] (`b493`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-549`, `ev-550`
- **状态变化** — 引擎：result.read, time.advanced（`ev-549`, `ev-550`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：cbc read —— 已确认

### 第 47 步 —— 查看结果：电解质与肾功能（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b502`，世界 v23）
- **计划** — `read_result renal-electrolytes` · 空间要求 at-provider [records] | at-patient ≤ 1.5 m | at-provider [lab-chemistry] (`b500`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-555`, `ev-556`, `ev-557`
- **状态变化** — 引擎：result.read, time.advanced, result.ready（`ev-555`, `ev-556`, `ev-557`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：renal-electrolytes read —— 已确认

### 第 48 步 —— 查看结果：凝血功能（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b510`，世界 v23）
- **计划** — `read_result coagulation` · 空间要求 at-provider [records] | at-patient ≤ 1.5 m | at-provider [lab-hematology] (`b508`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-567`, `ev-568`
- **状态变化** — 引擎：result.read, time.advanced（`ev-567`, `ev-568`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：coagulation read —— 已确认

### 第 49 步 —— 查看结果：高敏肌钙蛋白T（急诊抢救室） ✓

- **观察** — 观察 observe_world（`b517`，世界 v23）
- **计划** — `read_result hs-troponin` · 空间要求 at-provider [records] | at-patient ≤ 1.5 m | at-provider [lab-chemistry] (`b515`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `read_result` → ok；临床事件 `ev-573`, `ev-574`
- **状态变化** — 引擎：result.read, time.advanced（`ev-573`, `ev-574`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：hs-troponin read —— 已确认

### 第 50 步 —— 结束病例。 ✓

- **观察** — 无需
- **计划** — `finish_case` (`b522`)
- **导航** — 无需
- **设备交互** — 无需
- **审批** — 无需
- **临床操作** — `finish_case` → ok；临床事件 `ev-579`
- **状态变化** — 引擎：case.finished（`ev-579`）
- **核验** — 轨迹中的后置条件：ok; 权威状态：case finished —— 已确认

## 最终评估

- 得分 20/20（100%）
- 目标 5/5
- 首次即答对的决策：4/4
- 禁忌干预：0
- 模拟时间 66.7 分钟
- 评估: `bench-assessment` (是)

## 复现

```bash
npm run -s cc -- bench demo --case stemi-inferior-rv --lang zh-CN --out <dir>
```
