# Matrix Plot (矩阵散点图) 协议切片

## 1. 专家灵魂 (The Soul)

### 矩阵散点图分析价值 (Multi-variable Correlation)
图矩阵是多元统计分析中的核心工具，用于在单一视野内展示多变量间的两两交互关系。

#### 核心逻辑与策略：
- **Lowess 平滑**: 采用局部加权散点平滑算法。对离群点具有天然鲁棒性，能有效捕捉局部非线性趋势，是专业质量控制的标准配置。
- **对角线分布**: 利用直方图确认各变量的分布形态（如是否正态、有无双峰），是判定采样偏置的关键。
- **Group 分层识别**: 通过颜色与形状区分不同群组（如班次、机台）。群体分离标志着找到了问题的根本层级。
- **降维打击**: 在 $N \times N$ 的交互中快速锁定那 20% 具有强相关的关键驱动因素。

---

## 2. 语法血肉 (The Flesh)

### 基础配置元数据
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表主标题 | `Title: 制程参数关联分析` |
| `Mode:` | 布局模式 (`Matrix` 全矩阵 / `YvsX` 交叉) | `Mode: Matrix` |
| `Dimensions:` | 变量维度列表 (Matrix 模式) | `Dimensions: [温度, 压力, 良率]` |
| `Group:` | 分层变量名 | `Group: 批次` |
| `Smoother:` | 平滑算法 (`Lowess` / `MovingAverage`) | `Smoother: Lowess` |

### 数据定义 (Data Object)
使用 YAML-lite 格式定义样本：
`- { Key1: Value1, Key2: Value2, ... }`

### 视觉样式 (Styles)
- `DisplayMode`: `Full` (全显) / `Lower` (左下) / `Upper` (右上)。
- `Diagonal`: `Histogram` / `Boxplot` / `Label` / `None`。

---

## 3. 官方示例 (The Seed)

### 场景：半导体封装制程参数深度分析
```dsl
Title: 封装工艺参数相关性研究
Mode: Matrix
Dimensions: [压力, 温度, 固化时间, 剥离强度]
Group: 晶圆批次
Smoother: Lowess

Data:
- { 压力: 102, 温度: 185, 固化时间: 45, 剥离强度: 8.2, 晶圆批次: "W-01" }
- { 压力: 105, 温度: 188, 固化时间: 46, 剥离强度: 7.9, 晶圆批次: "W-01" }
- { 压力: 98, 温度: 192, 固化时间: 42, 剥离强度: 9.1, 晶圆批次: "W-02" }

Styles:
- DisplayMode: Lower
- Diagonal: Histogram
- ColorPalette: Industrial
```

---
**权威性声明**: 本文档内容与 `MatrixPlotEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
