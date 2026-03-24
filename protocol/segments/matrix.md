# Matrix (矩阵图) 协议切片

## 1. 专家灵魂 (The Soul)

### 矩阵图分析 (Matrix Diagram)
矩阵图是从多维度的交叉点寻找解决问题线索的方法。它通过行与列的交点，展现各因素间的相关程度（强、中、弱）。

#### 常见矩阵选型：
- **L 型**: 两个维度 (A x B)，最常用。
- **T 型**: 三个维度 (A x B, A x C)，A 为关联中心。
- **Y 型**: 三个维度 (A x B, B x C, C x A)，形成闭环关联。
- **X 型**: 四个维度 (A x B, B x C, C x D, D x A)。
- **C 型**: 三维立体空间关联（或自相关）。

#### 符号与评分系统：
- **◎ (Strong)**: 强相关，默认权重 9。
- **○ (Medium)**: 中等相关，默认权重 3。
- **△ (Weak)**: 弱相关，默认权重 1。

### 专家建议
> [!TIP]
> 矩阵图不仅用于展示现状，更在于通过“评分模式”发现薄弱环节。启用 `ShowScores: true` 可以自动计算各维度的加权得分，帮助识别核心影响因子。

---

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 | `Title: 零件与故障模式矩阵` |
| `Type:` | 矩阵类型 (`L` / `T` / `Y` / `X` / `C`) | `Type: L` |
| `CellSize:` | 单元格像素大小 | `CellSize: 60` |
| `ShowScores:` | 是否显示加权得分统计 | `ShowScores: true` |

### 权重与色彩
- `Weight[Strong | Medium | Weak]`: 数字权重。
- `Color[Strong | Medium | Weak]`: #HEX 符号颜色。
- `Color[Axis | Grid]`: #HEX 轴与网格颜色。

### 核心语法
#### 1. 轴定义 (Axis)
```dsl
Axis: [AxisID], [Label]
- [ItemID], [Label], [OptionalWeight]
```

#### 2. 矩阵定义 (Matrix Block)
```dsl
Matrix: [RowAxisID] x [ColAxisID]
[RowItemID]: [ColItemID1]:[Symbol], [ColItemID2]:[Symbol]
```
*符号简写支持：S/9/◎ (强), M/3/○ (中), W/1/△ (弱)*

---

## 3. 官方示例 (The Seed)

### 场景：L 型矩阵 - 零部件与故障模式关联分析
```dsl
Title: 零部件与故障模式关联分析
Type: L
ShowScores: true
Weight[Strong]: 9
Weight[Medium]: 3
Weight[Weak]: 1

# A轴: 零部件 (行)
Axis: A, 零部件
- a1, 活塞销, 0.8
- a2, 连杆, 0.9
- a3, 轴瓦, 1.0

# B轴: 故障模式 (列)
Axis: B, 故障模式
- b1, 磨损
- b2, 裂纹
- b3, 泄漏
- b4, 异响

# 关系定义
Matrix: A x B
a1: b1:S, b2:M
a2: b2:S, b4:W
a3: b1:M, b3:S, b4:S
```

---
**权威性声明**: 本文档内容 with `MatrixEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
