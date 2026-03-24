# IQS DSL 全量语法手册 (DSL_SYNTAX_MANUAL) 📘🚀

> **声明**：本手册为 Smart QC Studio (IQS) 的核心技术资产，全量整合了系统内所有图表组件的 DSL (Domain Specific Language) 语法、配置参数、分析逻辑及专家建议。

---

## 0. 通用全局指令 (Global Directives)

所有图表组件均支持以下全局指令，用于定义图表元数据与视觉基调。

| 指令 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 定义图表主标题 | `Title: 2024年三季度良率分析` |
| `Color[Title]:` | 标题文字颜色 (HEX/名) | `Color[Title]: #1e293b` |
| `Font[Title]:` | 标题字号 (px) | `Font[Title]: 24` |
| `Font[Base]:` | 基础文本/轴标签字号 | `Font[Base]: 12` |
| `Color[Bg]:` | 画布背景颜色 | `Color[Bg]: #f8fafc` |

---

## 1. 鱼骨图 (Fishbone Diagram) - 归因分析

**分析场景**：用于寻找引起质量问题的根本原因。遵循“人机料法环” (5M1E) 或“4P”管理模型。

### 1.1 DSL 语法
- `# [大骨名称]`：定义一级分类（如：人员、设备）。
- `## [中骨名称]`：定义二级原因。
- `### [小骨名称]`：定义三级及以下详情（支持 6 级递归）。
- `Color[Start]:`：定义鱼头/主轴起始点颜色。
- `Color[BoneLine]:`：定义鱼骨线条颜色。

### 1.2 专家建议 (Expert Tips)
- **5 Whys 原则**：每一个小骨都应是具体的、可验证的“根因”。
- **要因锁定**：分析完成后，应圈定 3-5 个核心要因进行后续验证。

---

## 2. 排列图 (Pareto Chart) - 重点管理

**分析场景**：识别“关键少数”，遵循“二八定律”。用于确定改进的优先顺序。

### 2.1 DSL 语法
- `- 项目名称: 频数`：定义统计项。
- `Color[Bar]:`：柱状图颜色。
- `Color[MarkLine]:`：80% 关键参考线颜色。
- `Decimals:`：控制百分比小数点位数 (0-4)。
- `ShowFreq: true/false`：显隐柱头频数。
- `ShowPercent: true/false`：显隐累计百分比。

### 2.2 专家建议
- **ABC 分类**：0-80% 为 A 类（主要因素），80-90% 为 B 类（次要因素），90-100% 为 C 类。
- **改善对比**：在效果检查阶段，应将改善前后的排列图对等对比。

---

## 3. 直方图 (Histogram) - 分布分析

**分析场景**：分析连续制程数据的分布形态，评价过程能力 (Cp/Cpk)。

### 3.1 DSL 语法
- `- [数值]`：录入原始测量值。
- `USL: [值]` / `LSL: [值]`：设置规格限。
- `Target: [值]`：设置目标中心值。
- `Bins: auto | [数字]`：控制分组组数。
- `ShowCurve: true/false`：显示正态拟合曲线。

### 3.2 专家建议
- **双峰形态**：警示可能混入了不同来源（不同机器/班次）的数据，必须执行分层分析。
- **偏移识别**：图形偏离 Target 需调整均值；图形宽度超过 USL-LSL 需减小波动。

---

## 4. 散点图 (Scatter Plot) - 相关性研究

**分析场景**：研究两个变量间的因果相关性（如温度与良率）。

### 4.1 DSL 语法
- `- X, Y, [Z]`：录入数据点，Z 为可选气泡大小。
- `XAxis: [文本]` / `YAxis: [文本]`：坐标轴标签。
- `ShowTrend: true/false`：显示最小二乘法回归趋势线。
- `Size[Base]:`：散点基础直径。
- `Opacity:`：透明度 (0.1-1.0)，用于观察高密度聚集区。

### 4.2 专家建议
- **离群值价值**：远离趋势线的异常点往往隐藏着制程中的“特殊原因”，是分析问题的金矿。

---

## 5. 亲和图 (Affinity/KJ) - 创意分类

**分析场景**：将杂乱的语言信息通过逻辑关联进行归类。

### 5.1 DSL 语法
- `# [标题]` / `##` / `###`：定义嵌套层级。
- `Layout: Horizontal | Vertical`：控制生长方向。
- `itemGap: [px]`：控制视觉间距。

### 5.2 渲染模式
- **树状模式 (Label Mode)**：强调因果流转。
- **卡片模式 (Card Mode)**：强调容器包含，具现代工业设计感。

---

## 6. 控制图 (Control Chart) - 统计过程控制 (SPC)

**分析场景**：监测过程稳定性，区分偶然波动与异常波动。

### 6.1 DSL 语法
- `[series]: [名称] ... [/series]`：定义数据序列。
- `Type: I-MR | X-bar-R`：控制图类型。
- `Size: [N]`：子组样本容量。
- `Rules: Nelson | Western-Electric`：启用判异规则包。

### 6.2 专家建议
- **规则优先级**：Rule 1 (超出限值) 必须停机排查；Rule 2, 3 (趋势性) 用于预防性预警。

---

## 7. 关联图 (Relation Diagram) - 复杂因果

**分析场景**：分析多因素交叉影响的网状关系。

### 7.1 DSL 语法
- `Node: [ID], [Label]`：定义节点。
- `Rel: [Source] -> [Target]`：定义因果连线。
- `Layout: Directional | Centralized | Free`：布局模式。

### 7.2 核心逻辑
- **末端因素 (End Factors)**：入度为 0 的源头节点。
- **核心症结 (Sink Nodes)**：入度最高的节点。

---

## 8. 矩阵图 (Matrix Diagram) - 关联评价

**分析场景**：评价多组因素间的关联强弱（如 QFD 质量屋）。

### 8.1 DSL 语法
- `Type: L | T | Y | X | C`：矩阵拓扑结构。
- `Axis: [ID], [Label]` / `- [ItemID], [Label], [Weight]`：定义维度与项。
- `Matrix: Axis1 x Axis2` / `RowID: ColID:S, ColID:M...`：定义关联强弱 (S:9, M:3, W:1)。

### 8.2 类型解析
- **X型**：适用于人力-目标-流程-资源的跨界匹配。
- **C型 (自相关)**：识别系统的“敏感变量”。

---

## 9. 过程决策程序图 (PDPC) - 风险回避

**分析场景**：对计划进行动态风险模拟，制定预案。

### 9.1 DSL 语法
- `Item: id, label, [start/step/countermeasure/end]`：节点类型。
- `id1--id2 [OK/NG]`：建立连线并标记判定状态。
- `[NG]` 节点后必须接 `countermeasure` (对策)。

### 9.2 专家建议
- **容错思维**：PDPC 的核心价值在于揭示“逆境”分支及其应急对策。

---

## 10. 矢线图 (Arrow Diagram/PERT) - 进度管理

**分析场景**：关键路径法 (CPM) 计算，优化项目工期。

### 10.1 DSL 语法
- `ID1 -> ID2 : [工期], [内容]`：实活动。
- `ID1 ..> ID2 : 0, [内容]`：虚活动（逻辑约束）。
- `ShowCritical: true`：高亮关键路径。

---

## 11. 基础图表 (Basic: Bar/Line/Pie)

**分析场景**：通用数据对比、趋势观察与占比分析。

### 11.1 DSL 语法
- `Type: bar | line | pie`：渲染模式。
- `Dataset: [名], [值], [色], [轴]`：数据定义（支持 X, Y, Y2, Y3 多轴映射）。
- **多层同心圆**：在 Pie 模式下，Y, Y2, Y3 映射为不同半径的层叠圆环。

---

## 12. 雷达图 (Radar Chart) - 综合评价

**分析场景**：对比多个对象在多维度上的均衡表现。

### 12.1 DSL 语法
- `Axis: [名], [MAX], [MIN]`：指标轴定义。
- `Series: [名], [数据], [色], [不透明度]`：对比对象。
- `Standardize: true`：开启数据标准化，消除量纲差异。

### 12.2 专家建议
- **面积评分**：面积越大代表综合素质越强；“凹陷”代表木桶短板。

---

## 13. 矩阵坐标图 (Matrix Plot) - 多变量探索

**分析场景**：大样本数据下，寻找变量间的群组模式与非线性相关。

### 13.1 DSL 语法
- `Mode: Matrix | YvsX`：全变量矩阵或指定对比。
- `Smoother: Lowess`：采用局部加权平滑识别非线性趋势。
- `Diagonal: Histogram | Boxplot`：对角线展示变量分布情况。

---

## 14. Mermaid 引擎 - 逻辑图谱

**支持类型**：流程图 (Flowchart)、思维导图 (Mindmap)、看板 (Kanban)、序列图 (Sequence)、状态图 (State)、甘特图 (Gantt) 等。

### 14.1 语法
- 完全兼容 Mermaid.js 标准。
- `%%{init: { "theme": "..." }}%%`：自定义主题注入。

---

## 15. VChart 全能图表引擎 (VChart 引擎允许用户直接通过标准的 VChart (VisActor) Spec JSON 来定义极其复杂的图表。

#### 语法规则
* `Title: [文字]` - 图表标题。
* `ColorPalette: [ID]` - 配色方案 ID（如：`tech_blue`, `soft_pastel` 等）。
* `Font[Title/Base/Legend/Axis]: [Size]` - 精确控制各部分的字体大小（单位：px）。
* `Spec: { ... }` - VChart 官方标准的 JSON 配置。
* **注意**: `Spec:` 之后必须紧跟合法的 JSON 字符串。

#### 示例
```text
Title: 复杂多维组合图
ColorPalette: tech_blue
Font[Title]: 24
Font[Base]: 14
Spec: {
  "type": "common",
  "series": [
    { "type": "bar", "data": { "values": [...] }, "xField": "x", "yField": "y" },
    { "type": "line", "data": { "values": [...] }, "xField": "x", "yField": "y" }
  ]
}
```

## 附录：AI 推理与 Vibe Coding 规范

- **自然语言驱动**：AI 会根据 `chart_spec.json` 协议将口语描述语义化。
- **逻辑寻优**：AI 在生成图表时，会优先通过分析建议自动插入 NG 分支 (PDPC) 或 5M1E 分类 (鱼骨图)。
- **动态回填**：转换后的 DSL 具有 100% 可编辑性。

---
*Smart QC Studio - DSL 语言标准委员会 归档*
*Version: 2026.03.24*
