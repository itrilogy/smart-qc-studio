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
Title: 实验室火灾应急 PDPC 演练
Layout: Directional

Color[Start]: #4f46e5
Color[Step]: #f0f9ff
Color[Countermeasure]: #fef2f2
Color[End]: #ecfdf5
Color[Line]: #64748b
Line[Width]: 2

# 阶段 1: 发现
Group: g1, 异常发现
  Item: n1, 烟雾报警器触发, [start]
  Item: n2, 确认火情真实性
EndGroup

# 阶段 2: 处置
Group: g2, 应急处置
  Item: n3, 拨打 119 报警
  Item: n4, 启动自动灭火系统
  Item: n5, 灭火系统失效, [countermeasure]
  Item: n6, 使用手持灭火器补救, [countermeasure]
EndGroup

# 阶段 3: 疏散
Group: g3, 人员疏散
  Item: n7, 全员依序撤离
  Item: n8, 清点人数, [end]
EndGroup

# 逻辑链条
n1--n2
n2--n3 [OK]
n2--n4 [OK]
n4--n7 [OK]
n4--n5 [NG]
n5--n6
n6--n7 [OK]
n7--n8
```

---
**权威性声明**: 本文档内容与 `PDPCEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
