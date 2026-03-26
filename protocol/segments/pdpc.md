# PDPC (过程决策程序图) 协议切片

## 1. 专家灵魂 (The Soul)

### 过程决策程序图 (Process Decision Program Chart)
PDPC 法是在制定计划阶段，对预期可能出现的问题，预先设计好各种对策，以确保目标达成的风险管理方法。

#### 核心逻辑：
- **目标设定**: 明确计划的起点与理想终点。
- **路径推演**: 识别从起点到终点所需的各个步骤 (Step)。
- **风险识别**: 预测可能导致计划中断的异常情况 (NG)。
- **对策制定**: 针对每个 NG 情况，预设补救措施或替代路径 (Countermeasure)。

### 专家建议
> [!IMPORTANT]
> PDPC 的价值在于 "思维的深度" 而非绘图的厚度。重点应放在那些可能导致毁灭性失败的关键环节，并为其配置显著的 [NG] 标记。

---

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 | `Title: 支付系统故障应急预案` |
| `Layout:` | 布局方向 (`Directional` / `Standard`) | `Layout: Directional` |

### 元素定义
- **分组**: `Group: [ID], [Label], [ParentID]` (使用 `EndGroup` 结束)。
- **数据项**: `Item: [ID], [Label], [Type]`
  - `Type` 可选: `start`, `step`, `countermeasure`, `end` (不填默认为 `step`)。

### 逻辑链条
- **普通连接**: `id1--id2`
- **带标记连接**: `id1--id2 [OK]` 或 `id1--id2 [NG]`
- **链式直写**: `start--step1--step2--end [OK]`

### 视觉样式
- `Color[Start | Step | Countermeasure | End]`: 各类型节点的背景色。
- `Color[StartText | StepText | CountermeasureText | EndText]`: 文字颜色。
- `Color[Line]`: 连线颜色。
- `Line[Width]`: 连线像素粗细。

---

## 3. 官方示例 (The Seed)

### 场景：实验室火灾应急响应程序
```dsl
Title: 关键系统迁移 PDPC 风险分析
Layout: Directional

Color[Start]: #2563eb
Color[StartText]: #ffffff
Color[Step]: #3b82f6
Color[StepText]: #ffffff
Color[Countermeasure]: #10b981
Color[CountermeasureText]: #ffffff
Color[End]: #ef4444
Color[EndText]: #ffffff
Color[Line]: #64748b
Line[Width]: 2

Group: p1, 前期准备
  Item: start, Start, [start]
  Item: a1, 环境检查
  Item: a2, 数据备份
EndGroup

Group: p2, 执行迁移
  Item: b1, 触发脚本
  Item: b2, 校验完整性
EndGroup

Group: p3, 异常应对
  Item: c1, 空间不足?
  Item: c2, 清理日志, [countermeasure]
  Item: c3, 扩容磁盘, [countermeasure]
  Item: c4, 权限拒绝?
  Item: c5, 提权重试, [countermeasure]
EndGroup

Item: end, Migration Success, [end]

start--a1
a1--a2
a2--b1
b1--b2 [OK]
b2--end [OK]
b1--c1 [NG]
c1--c2 [OK]
c2--b1 [OK]
c1--c3 [NG]
c3--b1 [OK]
b1--c4 [NG]
c4--c5 [OK]
c5--b1 [OK]

```

---
**权威性声明**: 本文档内容与 `PDPCEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
