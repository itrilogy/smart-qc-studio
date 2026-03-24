# Basic (基础图表) 协议切片

## 1. 专家灵魂 (The Soul)

### 基础图表分析 (Bar / Line / Pie)
基础图表是数据可视化中最通用、最权威的工具，涵盖了比较、趋势与占比三大核心分析维度。

#### 核心逻辑：
- **柱状图 (Bar)**: 强调个体之间的横向比较，适合分类数据的离散分析。
- **折线图 (Line)**: 专注于随时间或连续维度的趋势演变，利用“平滑 (Smooth)”算子可提升视觉连续性。
- **饼图 (Pie)**: 表达组成部分与整体的比例分配。
- **混合多轴 (Multi-Axis)**: 通过 `Y2` 轴绑定，可实现在同一画布对比量级差异巨大的两组数据（如营收额与增长率）。

### 专家建议
> [!IMPORTANT]
> **分类限制**: 避免在单一图表中展示超过 7 个分类。若分类过多，应考虑使用“其他”项合并或切换至水平柱状图 (`View: h`)。

---

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 | `Title: 年度经营指标分析` |
| `Type:` | 图表类型 (`bar` / `line` / `pie`) | `Type: bar` |
| `View:` | 布局方向 (`v` 垂直 / `h` 水平) | `View: v` |
| `Stacked:` | 堆叠模式 (true/false) | `Stacked: true` |
| `Smooth:` | 平滑曲线 (仅线图有效) | `Smooth: true` |

### 数据定义 (Dataset)
`Dataset: [Name], [Values], [Color], [AxisMatch]`
- `Values`: 数组格式 `[v1, v2, ...]`。
- `Color`: HEX 颜色，若为 `null` 则使用系统内置色板。
- `AxisMatch`: 绑定轴。可选 `X`, `Y`, `Y2`。
  - 必须包含一个 `X` 轴作为标签维。

### 视觉样式
- `Color[Title | Bg]`: 标题与背景色。
- `Font[Title | Base]`: 字体大小。
- `ShowValues:` / `ShowLegend:`: 开关数值标签与图例。

---

## 3. 官方示例 (The Seed)

### 场景：营收与利润率双轴分析
```dsl
Title: 2023 财年季度营收分析
Type: bar
ShowValues: true
Stacked: false

# X 轴标签
Dataset: 季度, [Q1, Q2, Q3, Q4], null, X

# Y 轴主数据 (柱状)
Dataset: 营业收入, [450, 520, 480, 610], #3b82f6, Y

# Y2 轴辅助数据 (建议手动配置为线图)
Type: line
Smooth: true
Dataset: 利润率, [12, 15, 11, 18], #10b981, Y2
```

---
**权威性声明**: 本文档内容与 `BasicEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
