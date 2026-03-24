# Control (SPC 控制图) 协议切片

## 1. 专家灵魂 (The Soul)

### SPC 统计过程控制原理
控制图（Control Chart）是用于区分过程中的**偶然波动**与**异常波动**的重要工具。Smart QC Studio 遵循 ISO 7870 与 GB/T 4091 标准进行计算。

### 控制图选型指南
| 数据性质 | 子组大小 | 推荐类型 |
| :--- | :--- | :--- |
| 计量型 (长度/重量) | n=1 | I-MR |
| 计量型 (连续生产) | 2≤n≤10 | X-bar-R |
| 计件型 (不合格数) | 恒定 | NP |
| 计点型 (缺陷数) | 不恒定 | U |

### 判异规则 (Rules)
系统支持 Nelson 规则与 WE (Western Electric) 规则。常见异常包括：
- 1 个点落在 $3\sigma$ 区外。
- 连续 9 点落在中心线同一侧。
- 连续 6 点持续上升或下降。

---

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 图表主标题 | `Title: 关键尺寸控制图` |
| `Type:` | 控制图类型 | `Type: X-bar-R` |
| `Size:` | 子组样本容量 (n) | `Size: 5` |
| `Rules:` | 判异规则 (Basic/Western-Electric/Nelson) | `Rules: Nelson` |
| `Decimals:` | 数值显示精度 | `Decimals: 3` |
| `ShowValues:` | 是否显示数据标记标签 | `ShowValues: true` |

### 视觉样式配置
- `Color[Line]`: #HEX 折线颜色 (默认 `#3b82f6`)
- `Color[Point]`: #HEX 数据点颜色 (默认 `#1d4ed8`)
- `Color[UCL]`: #HEX 控制上限颜色 (默认 `#ef4444`)
- `Color[CL]`: #HEX 中心线颜色 (默认 `#22c55e`)

### 数据录入规范
使用 `[series]` 块定义数据。
```dsl
[series]: 熔体温度
12.5, 12.8, 12.1, 12.4, 12.6
12.3, 12.5, 12.7, 12.2, 12.9
[/series]
```

---

## 3. 官方示例 (The Seed)

### 场景：均值极差图 (X-bar-R) 监控
```dsl
Title: 缸盖螺栓孔径 X-bar-R 控制图
Type: X-bar-R
Size: 5
Rules: Nelson
Decimals: 3
Color[Line]: #2563eb
Color[Point]: #1d4ed8
Color[UCL]: #ef4444

[series]: 孔径测量值 (mm)
12.01, 12.02, 11.99, 12.00, 12.01
12.03, 11.98, 12.01, 12.02, 11.99
12.00, 12.01, 12.04, 11.97, 12.02
12.01, 11.99, 12.00, 12.03, 12.01
11.98, 12.02, 12.01, 11.99, 12.00
[/series]
```

---
**权威性声明**: 本文档内容与 `ControlChartEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
