# Pareto (排列图) 协议切片

## 1. 专家灵魂 (The Soul)

### ABC 分类法 (Pareto Principle)
排列图基于“二八定律”，旨在帮助管理者从众多的质量问题中，找出影响质量的“关键少数”。
- **A类因素** (0% - 80%): 主要影响因素，必须重点解决。
- **B类因素** (80% - 90%): 次次要影响因素。
- **C类因素** (90% - 100%): 一般影响因素。

### 核心算法 (Core Algorithms)
本引擎内置严密的数理逻辑：
1. **自动降序**：Value[i] ≥ Value[i+1]
2. **累计百分比**：P[i] = (Σ V[0...i]) / Σ V[all]
3. **80% 标识线**：自动寻找 P[i] ≈ 80% 的临界坐标。

### 质量改进提示
> [!TIP]
> 解决排列图中最左侧的两个主要因素，通常能消除 80% 的质量成本。

---

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 设置图表主标题 | `Title: 售后数据分析` |
| `Decimals:` | 数值/百分比显示精度 | `Decimals: 2` |
| `ShowValues:` | 是否显示数据标记 | `ShowValues: true` |

### 视觉样式定义
- `Color[Bar]`: #HEX 柱形颜色 (默认 `#3b82f6`)
- `Color[Line]`: #HEX 折线颜色 (默认 `#f59e0b`)
- `Color[MarkLine]`: #HEX 80% 线颜色 (默认 `#ef4444`)
- `Font[Title]`: 主标题字号 (px)
- `Font[Base]`: 基础文字字号 (px)
- `Font[Bar]`: 柱顶数值字号 (px)

### 数据项录入
语法格式：`- [项目名称]: [频数]`
```dsl
- 物流破损: 420
- 包装变形: 156
- 标签缺失: 89
```
*注意：系统将自动对数据执行降序排列并计算累计贡献率。*

---

## 3. 官方示例 (The Seed)

### 场景：售后质量问题分布分析
```dsl
Title: 售后质量问题分布分析
Color[Title]: #1e293b
Color[Bar]: #3b82f6
Color[Line]: #f59e0b
Color[MarkLine]: #ef4444
Decimals: 1
ShowValues: true
Font[Title]: 20
Font[Base]: 12
Font[Bar]: 12
Font[Line]: 12

- 物流破损: 420
- 零件缺失: 215
- 包装老化: 89
- 标签错误: 56
- 其他细项: 23
```

---
**权威性声明**: 本文档内容与 `ParetoEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
