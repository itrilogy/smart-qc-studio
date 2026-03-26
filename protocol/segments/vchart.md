# VChart (VisActor) 协议切片

## 1. 专家灵魂 (The Soul)

### VisActor 全能图表引擎 (VChart)
VChart 是基于可视化语法的高性能图表组件，适用于处理极其复杂、高维度或海量数据的工业级可视化场景。

#### 核心优势与逻辑：
- **解耦式声明**: 通过标准的 JSON `Spec` 描述图表，实现样式与数据的完全解耦。
- **复杂组合**: 支持柱-线-面积组合图、漏斗图、桑基图等 50+ 种复杂图表类型。
- **工业级表现**: 针对 Canvas 渲染进行了深度优化，支持万级数据点的实时交互。

### ⚠️ 公共注意事项及说明 (Avoidance)

| 类别 | 强制性约束 | 避坑指南 |
| :--- | :--- | :--- |
| **JSON 规范** | **100% 静态 JSON** | `Spec` 块内严禁出现任何 JavaScript 函数或 `formatMethod` 逻辑，否则解析引擎将崩溃。 |
| **坐标轴匹配** | **严禁跨系挂载** | **极坐标/特殊图表**（饼图、旭日、仪表、进度、桑基）严禁配置 `orient` Cartesian 轴，否则会导致渲染异常。 |
| **笛卡尔闭环** | **必须成对出现** | **笛卡尔图表**（柱、线、散点、箱线、漏斗、热力）必须显式包含 `bottom` 和 `left` 两个轴配置。 |
| **层级数据** | **单根对象嵌套** | **树图/旭日** 必须使用单一 Root 对象（含 `children`），且必须包裹在 `data` 数组中。 |
| **数据容器** | **Top-Level 必须为数组** | 所有的 `Spec.data` 必须是数组格式 `data: [{ values: [...] }]`，严禁直接使用对象。 |
| **多轴绑定** | **优先使用索引** | 在 `common` 组合图中，建议通过 `seriesIndex: [0, 1]` 进行轴绑定，以规避 `seriesId` 冲突。 |
| **配色管理** | **使用色板关键字** | 优先使用 `ColorPalette: industrial/tech/vibrant` 开箱即用的色板。 |
| **括号对齐** | **必须闭合 `}`** | AI 推理时易遗漏 `Spec: {` 的结尾大括号，必须确保 JSON 格式完整。 |
| **中文包裹** | **双引号策略** | 包含中文或空格的标签必须使用双引号包裹，且优先使用中文全角标点，规避解析截断。 |
| **分线图 (Sankey)** | **节点层级格式** | 推荐使用 `nodes` + `children` 嵌套格式。避免使用 `from`/`to` 扁平格式，后者在复杂拓扑下易失效。 |
| **箱线图 (BoxPlot)** | **预计算统计量** | 必须传入 `min/q1/median/q3/max` 五数概括。引擎不自动计算原始行数据的统计分布。 |
| **不支持类型** | **寻找等效替代** | `venn` (韦恩图) 不在 vchart-all 注册表中，请改用 `heatmap` (热力矩阵) 或 `scatter` (分布) 代替。 |
| **显示标注** | **显式开启 Label** | 必须在 series 中配置 `"label": { "visible": true }` 以确保数值标注可见。 |

---

## 2. 语法血肉 (The Flesh)

### 样式外壳 (DSL Wrapper)
VChart 协议采用“外壳 + 内核”模式：
- **外壳**: 控制标题、配色与显示行为。
- **内核 (Spec)**: 标准的 VisActor JSON 配置。

| 语法 | 说明 | 可选值 | 默认值 |
| :--- | :--- | :--- | :--- |
| `Title:` | 图表标题文字 | 任意文本 | — |
| `ColorPalette:` | 配色主题 | `light / dark / tech / vibrant / industrial / deep / ocean / forest / sunset` | `light` |
| `Font[Title]:` | 标题字号 (px) | 整数 | `20` |
| `ShowTitle:` | 是否显示标题 | `true / false` | `true` |
| `ShowLabel:` | 是否显示数值标签 | `true / false` | `true` |
| `Animation:` | 是否开启渲染动画 | `true / false` | `false` |
| `AnimationMode:` | 动画类型（仅 Animation: true 时有效） | `scale / fadeIn / appear / move` | `scale` |
| `Spec:` | 核心 JSON 配置 | 标准 VisActor JSON | — |

> **配色说明**: `light` / `dark` 为 VChart 内置主题，其余 7 种为自定义注册主题，均由引擎自动管理色彩协调（轴色、标签色、图例色自动适配）。

---

## 3. 官方示例 (The Seed)

> **DSL 示例规范说明**: 以下每个示例均包含完整的 DSL 外壳（`Title / ColorPalette / ShowTitle / ShowLabel / Animation`）和内核 `Spec`，可直接粘贴到 JSON 脚本编辑器中运行。

### 3.1 组合分析 (Common Chart)
**场景**：同时监控生产良率（折线右轴）与单位成本（柱状左轴）。
```dsl
Title: 生产效能双轴组合图
ColorPalette: tech
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "common",
  "series": [
    { "id": "cost", "type": "bar", "data": {"values": [{"x":"Q1","y":120},{"x":"Q2","y":150},{"x":"Q3","y":130}]}, "xField": "x", "yField": "y", "label": { "visible": true } },
    { "id": "yield", "type": "line", "data": {"values": [{"x":"Q1","y":98},{"x":"Q2","y":96},{"x":"Q3","y":97}]}, "xField": "x", "yField": "y", "label": { "visible": true } }
  ],
  "axes": [
    { "orient": "left", "seriesIndex": [0], "title": {"visible": true, "text": "成本 (K)"} },
    { "orient": "right", "seriesIndex": [1], "title": {"visible": true, "text": "良率 (%)"} },
    { "orient": "bottom", "label": { "visible": true } }
  ],
  "legends": [{ "visible": true, "orient": "bottom" }]
}
```

### 3.2 桑基流向 (Sankey Chart)
**场景**：物料流转路径分析。注意：VChart Sankey 推荐使用节点层级（nodes+children）格式，而非扮平连接格式。
```dsl
Title: 原材料流转路径分析
ColorPalette: industrial
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "sankey",
  "data": [
    {
      "values": [
        {
          "nodes": [
            {
              "name": "供应商A",
              "value": 100,
              "children": [{ "name": "一车间", "value": 100 }]
            },
            {
              "name": "供应商B",
              "value": 80,
              "children": [{ "name": "一车间", "value": 80 }]
            },
            {
              "name": "一车间",
              "value": 180,
              "children": [
                { "name": "成品库", "value": 150 },
                { "name": "返工区", "value": 30 }
              ]
            },
            { "name": "成品库", "value": 150 },
            { "name": "返工区", "value": 30 }
          ]
        }
      ]
    }
  ],
  "categoryField": "name",
  "valueField": "value",
  "nodeKey": "name",
  "label": { "visible": true }
}
```

### 3.3 变动归因 (Waterfall Chart)
**场景**：年度质量损失成本的归因拆解。
```dsl
Title: 质量成本变动归因分析
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "waterfall",
  "data": [
    {
      "values": [
        { "x": "起始成本", "y": 1000 },
        { "x": "材料波动", "y": 200 },
        { "x": "工艺改进", "y": -150 },
        { "x": "人工上涨", "y": 50 },
        { "x": "最终成本", "y": 1100, "isTotal": true }
      ]
    }
  ],
  "xField": "x",
  "yField": "y",
  "total": { "tagField": "isTotal" },
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
```

### 3.4 堆叠对比 (Stacked Bar Chart)
**场景**：各生产单元在不同维度的故障堆叠对比。
```dsl
Title: 生产单元故障堆叠分析
ColorPalette: ocean
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "bar",
  "data": [{ "values": [
    {"unit":"单元A","type":"机械","v":10}, {"unit":"单元A","type":"电气","v":20}, {"unit":"单元A","type":"人为","v":5},
    {"unit":"单元B","type":"机械","v":15}, {"unit":"单元B","type":"电气","v":5}, {"unit":"单元B","type":"人为","v":8}
  ]}],
  "xField": "unit", "yField": "v", "seriesField": "type", "stack": true,
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ],
  "legends": [{ "visible": true, "orient": "bottom" }]
}
```

### 3.5 占比构成 (Donut / Rose Chart)
**场景**：质量成本明细占比（环形图）。
```dsl
Title: 质量成本构成明细
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "pie",
  "data": [{ "values": [
    {"type":"预防成本","v":400},
    {"type":"鉴定成本","v":200},
    {"type":"内部故障","v":300},
    {"type":"外部故障","v":150}
  ]}],
  "categoryField": "type", "valueField": "v",
  "outerRadius": 0.8, "innerRadius": 0.5,
  "label": { "visible": true }
}
```

### 3.6 性能评估 (Radar Chart)
**场景**：供应商在多维指标上的均衡性对比。
```dsl
Title: 供应商能力评价雷达图
ColorPalette: tech
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "radar",
  "data": [{ "values": [
    {"key":"质量","v":90,"obj":"A"}, {"key":"交期","v":85,"obj":"A"}, {"key":"价格","v":70,"obj":"A"}, {"key":"服务","v":80,"obj":"A"},
    {"key":"质量","v":80,"obj":"B"}, {"key":"交期","v":90,"obj":"B"}, {"key":"价格","v":85,"obj":"B"}, {"key":"服务","v":75,"obj":"B"}
  ]}],
  "categoryField": "key", "valueField": "v", "seriesField": "obj",
  "label": { "visible": true },
  "legends": [{ "visible": true, "orient": "bottom" }]
}
```

### 3.7 空间负荷 (Heatmap)
**场景**：24 小时内的负荷热力分布。
```dsl
Title: 产线负荷热力分布
ColorPalette: sunset
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "heatmap",
  "data": [{ "values": [
    {"hour":"08:00","line":"Line1","v":90}, {"hour":"09:00","line":"Line1","v":95}, {"hour":"10:00","line":"Line1","v":80},
    {"hour":"08:00","line":"Line2","v":40}, {"hour":"09:00","line":"Line2","v":50}, {"hour":"10:00","line":"Line2","v":75}
  ]}],
  "xField": "hour", "yField": "line", "valueField": "v",
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
```

### 3.8 质量审计 (BoxPlot)
**场景**：多批次离散度审计。注意 type 必须使用驼峰 `boxPlot`；**VChart BoxPlot 需要预计算的五数概括**，而非原始行数据。
```dsl
Title: 加工尺寸分布审计 (箱线图)
ColorPalette: tech
ShowTitle: true
ShowLabel: false
Animation: false

Spec: {
  "type": "boxPlot",
  "data": [
    {
      "values": [
        { "batch": "批次A", "min": 10.1, "q1": 10.2, "median": 10.3, "q3": 10.4, "max": 10.5 },
        { "batch": "批次B", "min": 10.6, "q1": 10.7, "median": 10.75, "q3": 10.85, "max": 11.0 },
        { "batch": "批次C", "min": 10.0, "q1": 10.15, "median": 10.25, "q3": 10.35, "max": 10.55 }
      ]
    }
  ],
  "xField": "batch",
  "minField": "min",
  "q1Field": "q1",
  "medianField": "median",
  "q3Field": "q3",
  "maxField": "max",
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
```

### 3.9 层级穿透 (Sunburst Chart)
**场景**：产品成本的递归层级透视。
```dsl
Title: 产品成本层级拆解 (旭日图)
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "sunburst",
  "data": [
    {
      "values": [
        {
          "name": "总成本",
          "children": [
            { "name": "材料成本", "value": 500, "children": [
              { "name": "原材料", "value": 300 },
              { "name": "辅料", "value": 200 }
            ]},
            { "name": "制造成本", "value": 400, "children": [
              { "name": "人工", "value": 200 },
              { "name": "设备折旧", "value": 200 }
            ]}
          ]
        }
      ]
    }
  ],
  "categoryField": "name",
  "valueField": "value",
  "label": { "visible": true }
}
```

### 3.10 实时监控 (Gauge)
**场景**：产线 KPI 直通率仪表盘。
```dsl
Title: 产线实时直通率
ColorPalette: tech
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "gauge",
  "data": [{ "values": [{"v": 0.85}] }],
  "valueField": "v",
  "categoryField": "v",
  "outerRadius": 0.8,
  "innerRadius": 0.5,
  "startAngle": -225,
  "endAngle": 45,
  "label": { "visible": true }
}
```

### 3.11 文本印象 (WordCloud)
**场景**：巡检异常关键词热度。注意 type 必须使用驼峰 `wordCloud`。
```dsl
Title: 巡检异常关键词印象表
ColorPalette: forest
ShowTitle: true
ShowLabel: false
Animation: false

Spec: {
  "type": "wordCloud",
  "data": [{ "values": [
    {"name":"故障","value":100},
    {"name":"波动","value":80},
    {"name":"停机","value":60},
    {"name":"异常","value":50},
    {"name":"缺料","value":40},
    {"name":"超差","value":35},
    {"name":"返工","value":25}
  ]}],
  "nameField": "name",
  "valueField": "value"
}
```

### 3.12 趋势追踪 (Line Chart)
**场景**：分析连续月度的生产良率波动趋势。
```dsl
Title: 月度良率趋势分析
ColorPalette: ocean
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "line",
  "data": [{ "values": [
    {"month":"1月","v":95}, {"month":"2月","v":96}, {"month":"3月","v":94},
    {"month":"4月","v":97}, {"month":"5月","v":98}, {"month":"6月","v":95}
  ]}],
  "xField": "month", "yField": "v",
  "label": { "visible": true },
  "point": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
```

### 3.13 资源分布 (Area Chart)
**场景**：展示不同能源消耗（电、气、水）的堆叠分布。
```dsl
Title: 能源消耗结构分析
ColorPalette: forest
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "area",
  "data": [{ "values": [
    {"x":"周一","y":50,"c":"电"}, {"x":"周一","y":30,"c":"气"}, {"x":"周一","y":10,"c":"水"},
    {"x":"周二","y":55,"c":"电"}, {"x":"周二","y":35,"c":"气"}, {"x":"周二","y":12,"c":"水"},
    {"x":"周三","y":48,"c":"电"}, {"x":"周三","y":28,"c":"气"}, {"x":"周三","y":9,"c":"水"}
  ]}],
  "xField": "x", "yField": "y", "seriesField": "c", "stack": true,
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ],
  "legends": [{ "visible": true, "orient": "bottom" }]
}
```

### 3.14 关联分析 (Scatter Chart)
**场景**：分析生产温度与压力之间的相关性分布，按批次分类着色。
```dsl
Title: 温度与压力相关性分析
ColorPalette: tech
ShowTitle: true
ShowLabel: false
Animation: false

Spec: {
  "type": "scatter",
  "data": [{ "values": [
    {"x":200,"y":10.2,"c":"批次A"}, {"x":210,"y":11.5,"c":"批次A"}, {"x":220,"y":12.1,"c":"批次A"},
    {"x":205,"y":10.8,"c":"批次B"}, {"x":215,"y":11.2,"c":"批次B"}, {"x":225,"y":12.5,"c":"批次B"}
  ]}],
  "xField": "x", "yField": "y", "seriesField": "c",
  "axes": [
    { "orient": "bottom", "label": { "visible": true }, "title": {"visible": true, "text": "温度 (°C)"} },
    { "orient": "left", "label": { "visible": true }, "title": {"visible": true, "text": "压力 (MPa)"} }
  ],
  "legends": [{ "visible": true, "orient": "bottom" }]
}
```

### 3.15 转化效率 (Funnel Chart)
**场景**：业务转化漏斗分析。注意 `data` 必须为数组格式。
```dsl
Title: 业务转化漏斗
ColorPalette: vibrant
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "funnel",
  "data": [{ "values": [
    {"step":"访问","v":1000},
    {"step":"注册","v":600},
    {"step":"试用","v":300},
    {"step":"付费","v":100}
  ]}],
  "categoryField": "step",
  "valueField": "v",
  "label": { "visible": true }
}
```

### 3.16 资产分布 (Treemap)
**场景**：固定资产占比透视。
```dsl
Title: 固定资产分布比例图
ColorPalette: deep
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "treemap",
  "data": [
    {
      "values": [
        {
          "name": "总资产",
          "children": [
            { "name": "生产设备", "value": 500 },
            { "name": "运输工具", "value": 200 },
            { "name": "办公资产", "value": 100 },
            { "name": "IT设备", "value": 150 }
          ]
        }
      ]
    }
  ],
  "categoryField": "name",
  "valueField": "value",
  "label": { "visible": true }
}
```

### 3.17 进度环图 (Circular Progress)
**场景**：核心 KPI 达成率追踪，支持多条进度环对比。
```dsl
Title: 核心指标达成进度
ColorPalette: tech
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "circularProgress",
  "data": [{ "values": [
    { "name": "直通率", "value": 0.88 },
    { "name": "准时交付", "value": 0.76 },
    { "name": "CPK达成", "value": 0.92 }
  ]}],
  "valueField": "value",
  "categoryField": "name",
  "seriesField": "name",
  "radius": 0.8,
  "innerRadius": 0.2,
  "label": { "visible": true, "position": "bottom" }
}
```

### 3.18 相关矩阵分析 (Correlation Heatmap)
**场景**：分析多品质指标之间的相关性强度矩阵。⚠️ VChart `venn` 类型未包含在 vchart-all 中，本示例以热力矩阵为等效替代。
```dsl
Title: 品质指标相关性矩阵
ColorPalette: deep
ShowTitle: true
ShowLabel: true
Animation: false

Spec: {
  "type": "heatmap",
  "data": [{ "values": [
    {"x":"温度","y":"压力","v":0.92}, {"x":"温度","y":"转速","v":0.45}, {"x":"温度","y":"良率","v":-0.78},
    {"x":"压力","y":"温度","v":0.92}, {"x":"压力","y":"转速","v":0.31}, {"x":"压力","y":"良率","v":-0.65},
    {"x":"转速","y":"温度","v":0.45}, {"x":"转速","y":"压力","v":0.31}, {"x":"转速","y":"良率","v":0.22},
    {"x":"良率","y":"温度","v":-0.78}, {"x":"良率","y":"压力","v":-0.65}, {"x":"良率","y":"转速","v":0.22}
  ]}],
  "xField": "x",
  "yField": "y",
  "valueField": "v",
  "label": { "visible": true },
  "axes": [
    { "orient": "bottom", "label": { "visible": true } },
    { "orient": "left", "label": { "visible": true } }
  ]
}
```

---
**权威性声明**: 本文档内容与 `VChartEditor.tsx` 及 `chart_spec.json` 保持同步。当 DSL 关键字发生变更时，三者必须同步更新。 Riverside,
