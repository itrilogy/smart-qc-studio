# Histogram (直方图) 协议切片

## 1. 专家灵魂 (The Soul)

### 正态分布分析 (Normal Distribution)
直方图通过对大量随机样本的观察，识别生产过程是否受控。完美的生产过程通常呈现对称的“钟形”曲线。
- **均值 (μ)**: 反映了加工的中心位置。
- **标准差 (σ)**: 反映了加工的散差大小。

### 工序能力指标 (Process Capability)
当定义了规格限 (USL/LSL) 时，系统会自动评估工序能力：
- **Cp / Cpk**: 指标越大，代表工序的质量保证能力越强。
- **1.33**: 视为工业级的“合格”门槛。
- **1.67**: 优秀水平。

### 统计洞察
> [!TIP]
> 双峰直方图通常意味着数据来源于两个不同的班次、设备或供应商，需要深入分析波动源。

---

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表标题 | `Title: 钢管直径分布` |
| `USL:` | 规格上限 (Upper Limit) | `USL: 10.5` |
| `LSL:` | 规格下限 (Lower Limit) | `LSL: 10.0` |
| `Target:` | 目标值 (Target Value) | `Target: 11.25` |
| `Bins:` | 分组数量 (auto 或 数字) | `Bins: 20` |
| `ShowCurve:` | 是否显示正态分布曲线 | `ShowCurve: true` |
| `ShowValues:` | 是否显示柱顶数值标记 | `ShowValues: true` |
| `ShowLabels:` | 是否显示轴标签 | `ShowLabels: true` |

### 视觉样式定义
- `Color[Bar]`: #HEX 直方柱颜色 (默认 `#3b82f6`)
- `Color[Curve]`: #HEX 正态曲线颜色 (默认 `#f97316`)
- `Color[USL]`: #HEX 上限线颜色 (默认 `#ef4444`)
- `Color[LSL]`: #HEX 下限线颜色 (默认 `#ef4444`)
- `Color[Target]`: #HEX 目标线颜色 (默认 `#22c55e`)

### 数据项录入
语法格式：`- [数值]`
```dsl
# 原始测量数据
- 10.5
- 10.2
- 9.8
- 11.0
```

---

## 3. 官方示例 (The Seed)

### 场景：产品直径分布分析 (标准)
```dsl
Title: 产品直径分布分析
USL: 10.5
LSL: 9.5
Target: 10.0
Color[Bar]: #3b82f6
Color[Curve]: #f97316
Color[USL]: #ef4444
Color[LSL]: #ef4444
Color[Target]: #22c55e
Bins: auto
ShowCurve: true

# 原始数据
- 9.8
- 10.2
- 10.1
- 9.9
- 10.0
- 10.3
- 9.7
- 10.1
- 9.9
- 10.0
- 10.2
- 9.8
- 10.4
- 9.6
- 10.1
- 9.9
- 10.0
- 10.2
- 9.8
- 10.1
- 10.5
- 9.5
- 10.0
- 10.3
- 9.7
- 10.1
- 9.9
- 10.2
- 10.0
- 9.8
```

---
**权威性声明**: 本文档内容与 `HistogramEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
