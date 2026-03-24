# VChart (VisActor) 协议切片

## 1. 专家灵魂 (The Soul)

### VisActor 全能图表引擎 (VChart)
VChart 是基于可视化语法的高性能图表组件，适用于处理极其复杂、高维度或海量数据的工业级可视化场景。

#### 核心优势与逻辑：
- **解耦式声明**: 通过标准的 JSON `Spec` 描述图表，实现样式与数据的完全解耦。
- **复杂组合**: 支持柱-线-面积组合图、漏斗图、桑基图等 50+ 种复杂图表类型。
- **工业级表现**: 针对 Canvas 渲染进行了深度优化，支持万级数据点的实时交互。
- **自适应配色**: 内置 `Tech`, `Industrial`, `Vibrant`, `Deep` 等符合 IQS 审美标准的主题色板。

### 专家建议
> [!TIP]
> **混合建模**: 在进行“质量异常趋势 + 成本损失占比”的综合分析时，VChart 是唯一的权威选择。建议通过 AI 快速生成 `Spec` 骨架，再进行微调。

---

## 2. 语法血肉 (The Flesh)

### 样式外壳 (DSL Wrapper)
VChart 协议采用“外壳 + 内核”模式：
- **外壳**: 控制标题、字号与调色盘。
- **内核 (Spec)**: 标准的 VisActor JSON 配置。

| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 | `Title: 全球供应链风险热力图` |
| `ColorPalette:` | 配色方案 | `ColorPalette: industrial` |
| `Font[Title/Base]:` | 各部分字号 | `Font[Title]: 24` |
| `Spec:` | 核心 JSON 配置 | `Spec: { "type": "common", ... }` |

### 核心 Spec 结构
```json
{
  "type": "bar",
  "data": [{ "id": "data1", "values": [...] }],
  "xField": "x",
  "yField": "y",
  "series": [ ... ],
  "axes": [ ... ]
}
```

---

## 3. 官方示例 (The Seed)

### 场景：产品线故障损失组合分析
```dsl
Title: VChart 工业数据综合看板
ColorPalette: tech
Font[Title]: 20

Spec: {
  "type": "common",
  "series": [
    {
      "type": "bar",
      "id": "bar",
      "data": { "values": [{"type": "A", "value": 100}, {"type": "B", "value": 200}] },
      "xField": "type",
      "yField": "value"
    },
    {
      "type": "line",
      "id": "line",
      "data": { "values": [{"type": "A", "value": 15}, {"type": "B", "value": 25}] },
      "xField": "type",
      "yField": "value"
    }
  ],
  "axes": [
    { "orient": "left", "seriesIndex": [0] },
    { "orient": "right", "seriesIndex": [1], "grid": { "visible": false } }
  ]
}
```

---
**权威性声明**: 本文档内容与 `VChartEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
