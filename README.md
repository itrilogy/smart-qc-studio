# Smart QC Studio - 工业级智能质量控制工作站 🏆📊

Smart QC Studio 是一款面向工业工程、质量管理（QC）及系统分析领域的绘图工作站。它通过自研的 **DSL (Domain Specific Language)** 引擎与 **LLM (大语言模型)** 推理技术，将传统的繁琐绘图流程简化为“语言即图表”的极简体验。本版本采用了全新的 **Industrial Light OS** 视觉规范，提供更为沉浸、专业的分析环境。

---

## 🚀 核心特性

本工具箱集成了全系列工业级分析图表，专为质量工程师打造：

### 🐟 1. 智能鱼骨图 (Smart Fishbone)
> **深度因果分析神器** — 只有想不透的原因，没有画不出的逻辑。
- **无限级联**: 独创的递归渲染引擎，支持最高 **6 级**因果嵌套，自动处理复杂的镜像生长与空间排布。
- **AI 辅助思维**: 集成 Google Gemini 等大模型，输入一句话（如"注塑件飞边原因分析"），秒级生成逻辑严密的完整鱼骨图。
- **极简 DSL**: 摒弃拖拽，使用缩进式语法 `#` 即可定义层级，让思维回归逻辑本身。

### 📊 2. 动态排列图 (Dynamic Pareto)
> **二八定律可视化** — 抓住关键少数，解决主要矛盾。
- **全自动计算**: 仅需输入原始数据，系统自动完成降序排列、累计频数统计及累计百分比计算。
- **双轴联动**: 左轴直观展示频数（柱状），右轴精准呈现占比（曲线），完美复刻 QC 七大手法经典样式。
- **关键线标记**: 自动绘制或自定义 80% 关键线，一眼锁定核心改善对象。

### 📈 3. 分布直方图 (Statistical Histogram)
> **制程能力显微镜** — 数据分布一目了然，制程变异无处遁形。
- **统计自动化**: 支持 Sturges 等算法自动计算最佳分组（Bins），亦可手动微调分组粒度。
- **规格可视化**: 内置 **USL (上规格限)**、**LSL (下规格限)** 及 **Target (目标值)** 标线，直观判断制程是否偏移。
- **正态拟合**: 实时计算均值与标准差，一键叠加正态分布曲线，辅助研判数据分布形态。

### 📉 4. 散点分析图 (Scatter Analysis)
> **相关性洞察利器** — 变量关联一目了然，趋势规律尽在掌握。
- **多维展示**: 支持标准散点和气泡图模式，X/Y/Z 三轴自由定义。
- **趋势拟合**: 一键叠加线性回归趋势线，量化变量相关性。
- **灵活配置**: 点大小、透明度、颜色全面可调，适配多种分析场景。

### 🧩 5. 智能亲和图 (Smart Affinity / KJ法)
> **头脑风暴整理神器** — 海量信息归类分组，直觉转化为结构。
- **双模渲染**: 支持 **树状层级 (Label)** 和 **卡片分组 (Card)** 两种可视化风格，适应不同展示需求。
- **层级嵌套**: 最高支持 4 级层级递归，灵活组织复杂信息结构。
- **颜色编码**: 分组头部、卡片背景、子项均可自定义颜色，视觉区分清晰直观。

### 📈 6. 统计控制图 (Statistical Control Chart / SPC)
> **质量波动监视器** — 实时监控生产状态，预警过程异常漂移。
- **经典模型**: 支持 **I-MR** (单点-移动极差) 与 **X-bar-R** (均值-极差) 工业标准图表。
- **判异引擎**: 内置 **Nelson Rules** 与 **Western Electric** 规则，自动识别 9 点中心偏离、6 点趋势、14 点交替等复杂异常，并以红点预警。
- **高性能 Canvas**: 支持高频采样数据实时动态重绘，轴范围自动呼吸缩放，确保大批量点位清晰呈现。

### 🕸️ 7. 关联图 (Relation Diagram)
> **复杂因果网络分析** — 顺藤摸瓜，理清千丝万缕的逻辑回路。
> - **虚拟核心**: 自动根据标题生成逻辑核心，智能归集末端因素。
> - **多维布局**: 提供单向流、中心辐射、力导向自由图三种专业视角。
> - **交叉逻辑**: 完美支持多因一果、一因多果的网状因果关系表达。

### ⚔️ 8. 智能矩阵分析图 (Smart Matrix Diagram)
> **多维关联与量化评价** — 发现复杂系统中的核心驱动与潜在冲突。
- **全系列布局**: 完整支持 L型 (二元)、T型 (三元)、Y型 (三向传递)、X型 (四象限约束) 及 C型 (屋顶自相关) 五大工业标准矩阵。
- **智能打分引擎**: 自动根据定义的权重（1/3/9 或自定义）计算轴维度分值，辅助量化决策。
- **等轴测投影**: Y型矩阵采用专业等轴测 3D 投影，完美展示三维度闭环传递逻辑。
- **灵活 DSL**: 独创的 ID:ID:Symbol 映射语法，支持在超大规模矩阵中快速录入。

### 📉 10. 全维度图矩阵 (Multivariate Matrix Plot)
> **深度相关性挖掘利器** — 透过庞杂的数据，捕捉变量间的互动模式。
- **多维分层渲染**: 通过分类变量 (Group) 自动识别聚类，并以不同的几何符号与工业配色进行区分展示。

### 🏹 9. 智能矢线图 (Smart Arrow Diagram)
> **项目进度与关键路径分析** — 科学排程，精准掌控时间脉搏。
- **CPM 核心算法**: 自动计算最早/最迟时间、总时差，精准锁定关键路径。
- **动态约束渲染**: 支持实活动与虚活动（Dummy）组合建模，自适应时空拓扑布局。
- **风险推演**: 支持实时调整工期，动态观察关键路径的演向转移。

- **逻辑分层**: 支持通过 `Group` 语法实现复杂流程的物理与逻辑分区。

### 📊 12. 基础组件图 (Basic Charts)
> **多维数据分析基石** — 柱形、折线、饼图的完美集成。
- **智能推理标准版**: “AI 推理”面板已全面兼容鱼骨图高级范式，支持 `Engine Active` 指示、精准业务提示与“智能解析回填”流。
- **图例交互管控**: 支持在常规配置面板通过拖拽（Drag & Drop）动态调整指标显示顺序，并实时同步图例配色与 DSL 排列。
- **多轴支持**: 独创的动态 Y 轴排列，支持 Y/Y2/Y3 无限扩展，自动处理轴偏移与刻度对齐。
- **叠层饼图**: 当 Type 为 Pie 时，支持通过多数值轴自动生成同心圆环分析。
- **智能排序**: 支持基于首个可见数值轴的“无/升序/降序”实时动态重排。

### 🛠️ 13. 工业级通用能力
- **专业导出引擎**: 支持 **白底 PNG** (报告用)、**透明 PNG** (PPT用) 及 **矢量 PDF** (打印用) 一键高清导出。
- **AI 智能推理**: 全系图表支持 LLM 推理，从自然语言到专业图表仅需一步。
- **DSL 驱动**: 所有图表均基于文本定义，易于存储、版本控制及在团队间作为代码分享。

---

## 🏗️ 技术栈

- **前端框架**: [Vite 5](https://vitejs.dev/) + React 18
- **组件系统**: 自研 Industrial Light OS UI 套件
- **图表驱动**: ECharts 5 + Canvas API / SVG
- **样式系统**: Tailwind CSS (CDN/PostCSS)
- **AI 核心**: Google Gemini Pro 1.5 Vision / Text
- **图标库**: Lucide React

---

## 📖 文档中心 (Documentation)

针对不同图表模块与设计背景，我们提供了详尽的文档：

- 🐟 **[鱼骨图 (Fishbone) 手册](docs/USER_MANUAL_FISHBONE.md)**
- 📊 **[排列图 (Pareto) 手册](docs/USER_MANUAL_PARETO.md)**
- 📈 **[分布直方图 (Histogram) 手册](docs/USER_MANUAL_HISTOGRAM.md)**
- 📉 **[散点分析图 (Scatter) 手册](docs/USER_MANUAL_SCATTER.md)**
- 🧩 **[智能亲和图 (Affinity) 手册](docs/USER_MANUAL_AFFINITY.md)**
- 📉 **[统计控制图 (Control) 手册](docs/USER_MANUAL_CONTROL.md)**
- 🕸️ **[关联图 (Relation) 手册](docs/USER_MANUAL_RELATION.md)**
- ⚔️ **[矩阵分析图 (Matrix) 手册](docs/USER_MANUAL_MATRIX.md)**
- 📉 **[全维度图矩阵 (Matrix Plot) 手册](docs/USER_MANUAL_MATRIX_PLOT.md)**
- 🛡️ **[PDPC (过程决策程序图) 手册](docs/USER_MANUAL_PDPC.md)**
- 🏹 **[矢线图 (Arrow Diagram) 手册](docs/USER_MANUAL_ARROW.md)**
- 📊 **[基础图表 (Basic Chart) 手册](docs/USER_MANUAL_BASIC.md)**
- 📒 **[控制图技术笔记](docs/控制图笔记.md)**
- 📒 **[控制图技术笔记](docs/控制图笔记.md)**
- 📐 **[亲和图设计方案](docs/DESIGN_AFFINITY.md)**
- 📝 **[项目需求说明书](docs/需求说明.md)**

---

## 📜 DSL 语法概览

### 🐟 一、鱼骨图 (Fishbone) DSL 规范

#### 1.1 标题设定
| 语法 | 说明 | 示例 |
|------|------|------|
| `Title: [文字]` | 设置鱼骨图核心问题 | `Title: 产品交付延迟` |

#### 1.2 层级结构
| 语法 | 层级 | 说明 |
|------|------|------|
| `# [文字]` | Level 1 | 大骨分类（如：人、机、料、法、环） |
| `## [文字]` | Level 2 | 具体原因 |
| `### [文字]` | Level 3 | 细节详情 |

#### 1.3 色彩配置
| 语法 | 作用对象 | 示例 |
|------|----------|--------|
| `Color[Root]: #HEX` | 鱼头背景 | `Color[Root]: #2563eb` |
| `Color[RootText]: #HEX` | 鱼头文字 | `Color[RootText]: #ffffff` |
| `Color[Main]: #HEX` | 大骨背景 | `Color[Main]: #3b82f6` |
| `Color[MainText]: #HEX` | 大骨文字 | `Color[MainText]: #ffffff` |
| `Color[Bone]: #HEX` | 主脊椎线 | `Color[Bone]: #475569` |
| `Color[Line]: #HEX` | 鱼刺连线 | `Color[Line]: #94a3b8` |
| `Color[Text]: #HEX` | 普通条目文字 | `Color[Text]: #1e293b` |
| `Color[End]: #HEX` | 鱼尾背景 | `Color[End]: #94a3b8` |

---

### 📊 二、排列图 (Pareto) DSL 规范

#### 2.1 基础配置
| 语法 | 说明 | 示例 |
|------|------|------|
| `Title: [文字]` | 设置图表主标题 | `Title: 产品缺陷频数分析` |
| `Decimals: [N]` | 累计百分比小数位数 | `Decimals: 2` |

#### 2.2 色彩与字号
| 语法 | 作用对象 | 示例 |
|------|----------|------|
| `Color[Bar]: #HEX` | 柱形图颜色 | `Color[Bar]: #2563eb` |
| `Color[Line]: #HEX` | 累计曲线颜色 | `Color[Line]: #d97706` |
| `Font[Title]: [Size]` | 主标题字号 | `Font[Title]: 20` |

---

### 📉 三、分布直方图 (Histogram) DSL 规范

#### 3.1 基础语法
| 语法 | 说明 | 示例 |
|------|------|------|
| `Title: [标题文本]` | 图表主标题 | `Title: 产品直径分布` |
| `USL: [数值] (上限)` | 上规格限 | `USL: 10.5` |
| `LSL: [数值] (下限)` | 下规格限 | `LSL: 9.5` |
| `Target: [数值] (目标)` | 目标中心值 | `Target: 10.0` |
| `Bins: [auto/数字]` | 分组数 | `Bins: auto` |
| `ShowCurve: [true/false]` | 显示正态曲线 | `ShowCurve: true` |

#### 3.2 颜色配置
| 语法 | 说明 | 示例 |
|------|------|------|
| `Color[Bar]: #HEX` | 柱形颜色 | `Color[Bar]: #3b82f6` |
| `Color[Curve]: #HEX` | 拟合线颜色 | `Color[Curve]: #f59e0b` |
| `Color[USL]: #HEX` | 规格线上限颜色 | `Color[USL]: #ef4444` |

#### 3.3 数据录入
```histogram
# 样本数据 (每行一个)
- 10.1
- 9.9
- 10.2
```

---

### 📈 四、散点分析图 (Scatter) DSL 规范

#### 4.1 基础元数据
| 语法 | 说明 | 示例 |
|------|------|------|
| `Title: [文字]` | 图表标题 | `Title: 销售与客流关系` |
| `XAxis: [文字]` | X轴标签 | `XAxis: 客流量` |
| `YAxis: [文字]` | Y轴标签 | `YAxis: 销售额` |
| `ZAxis: [文字]` | Z轴标签 (3D/气泡) | `ZAxis: 转化率` |

#### 4.2 样式控制
| 语法 | 说明 | 示例 |
|------|------|------|
| `Color[Point]: #HEX` | 点颜色 | `Color[Point]: #3b82f6` |
| `Color[Trend]: #HEX` | 趋势线颜色 | `Color[Trend]: #f59e0b` |
| `Size[Base]: [Number]` | 基准点大小 (默认10) | `Size[Base]: 12` |
| `Opacity: [0.1-1.0]` | 点透明度 | `Opacity: 0.8` |

#### 4.3 功能开关
| 语法 | 说明 | 示例 |
|------|------|------|
| `ShowTrend: [true/false]` | 显示回归线 | `ShowTrend: true` |
| `3D: [true/false]` | 启用3D模式 | `3D: true` |

#### 4.4 数据格式
```scatter
# 格式: - x, y, [z]
- 10.5, 20.2      // 2D点
- 15.0, 30.5, 50  // 3D点/气泡
```

---

### 🧩 五、智能亲和图 (Smart Affinity / KJ法) DSL 规范

| 语法 | 说明 | 示例 |
|------|------|------|
| `Type: Label/Card` | 图表类型 (Label=树状层级, Card=卡片分组) | `Type: Card` |
| `Layout: Vertical/Horizontal` | 布局方向 | `Layout: Horizontal` |
| `Color[TitleBg]: #HEX` | 标题背景 | `Color[TitleBg]: #3b82f6` |
| `Color[TitleText]: #HEX` | 标题文字 | `Color[TitleText]: #ffffff` |
| `Color[GroupHeaderBg]: #HEX` | 分组头/根节点背景 | `Color[GroupHeaderBg]: #bfdbfe` |
| `Color[GroupHeaderText]: #HEX` | 分组头/根节点文字 | `Color[GroupHeaderText]: #1e3a8a` |
| `Color[ItemBg]: #HEX` | 事项卡片背景 | `Color[ItemBg]: #ffffff` |
| `Color[ItemText]: #HEX` | 事项卡片文字 | `Color[ItemText]: #1e293b` |
| `Color[Line]: #HEX` | 连线颜色 (树状模式) | `Color[Line]: #64748b` |
| `Color[Border]: #HEX` | 边框颜色 | `Color[Border]: #cbd5e1` |
| `Font[Title/GroupHeader/Item]: [N]` | 各级字号设置 | `Font[Title]: 24` |
| `Item: [ID], [Label], [ParentID]` | 显式节点定义 | `Item: g1, 市场机会, root` |

---

### 📈 六、统计控制图 (Control Chart / SPC) DSL 规范

控制图用于分析过程稳定性，支持多种图表类型及判异规则。

#### 6.1 基础配置
| 语法 | 说明 | 示例 |
|------|------|------|
| `Title: [文字]` | 设置图表主标题 | `Title: 关键尺寸 X-bar 控制图` |
| `Type: [Type]` | 模型类型 (I-MR, X-bar-R, X-bar-S, P, NP, C, U) | `Type: X-bar-R` |
| `Size: [N]` | 子组样本容量 (n) | `Size: 5` |
| `Rules: [规则名]` | 启用的规则包 (Nelson/WE) | `Rules: Nelson` |
| `Decimals: [N]` | 限制线计算精度 | `Decimals: 3` |

#### 6.2 色彩与字号配置
| 语法 | 作用对象 | 默认值 | 示例 |
|------|----------|--------|------|
| `Color[Line]: #HEX` | 采集折线颜色 | `#3b82f6` | `Color[Line]: #2563eb` |
| `Color[UCL]: #HEX` | 控制上限 (UCL) 颜色 | `#ef4444` | `Color[UCL]: #dc2626` |
| `Color[CL]: #HEX` | 中心线 (CL) 颜色 | `#22c55e` | `Color[CL]: #16a34a` |
| `Color[Point]: #HEX` | 正常数据点颜色 | `#1d4ed8` | `Color[Point]: #3b82f6` |
| `Font[Title]: [N]` | 主标题字号 | `22` | `Font[Title]: 24` |
| `Font[Label]: [N]` | 控制限标注字号 | `10` | `Font[Label]: 12` |

#### 6.3 数据项定义
| 语法 | 说明 | 示例 |
|------|------|------|
| `[series]: [名称]` | 开启数据序列 | `[series]: 熔体温度` |
| `[数据点序列]` | 支持逗号/空格分隔多值 | `12.5, 12.8, 12.1` |
| `[/series]` | 关闭数据序列 | `[/series]` |

#### 6.4 完整示例 (X-bar-R 型)
```control
Title: 活塞销外径加工过程监控
Type: X-bar-R
Size: 5
Decimals: 3
Rules: Nelson
Color[Line]: #3b82f6
Color[Point]: #1d4ed8

[series]: 直径 (mm)
12.012, 12.008, 11.995, 12.001, 12.005
12.002, 11.998, 12.010, 12.003, 11.997
12.005, 12.012, 11.994, 12.008, 12.002
[/series]
```

---

### 🔗 七、关联图 (Relation Diagram) DSL 规范

关联图用于分析复杂因素之间的因果关系，自动梳理末端因素、中间因素与核心问题。

#### 7.1 基础配置
| 语法 | 说明 | 示例 |
|------|------|------|
| `Title: [文字]` | 根节点标题 (L0) | `Title: 客户满意度下降分析` |
| `Node: [ID], [Label]` | 定义因素节点 | `Node: m1, 产品质量波动` |

#### 7.2 关系定义
| 语法 | 说明 | 示例 |
|------|------|------|
| `Rel: [Source] -> [Target]` | 定义因果关系 | `Rel: e1 -> m1` |

#### 7.3 样式控制
| 语法 | 说明 | 示例 |
|------|------|------|
| `Color[Root]: #HEX` | 根节点背景色 | `Color[Root]: #7c3aed` |
| `Color[RootText]: #HEX` | 根节点文字色 | `Color[RootText]: #ffffff` |
| `Color[Middle]: #HEX` | 中间节点背景 | `Color[Middle]: #8b5cf6` |
| `Color[MiddleText]: #HEX` | 中间节点文字 | `Color[MiddleText]: #ffffff` |
| `Color[End]: #HEX` | 末端节点背景 | `Color[End]: #ddd6fe` |
| `Color[EndText]: #HEX` | 末端节点文字 | `Color[EndText]: #1e293b` |
| `Color[Line]: #HEX` | 连线颜色 | `Color[Line]: #a78bfa` |

#### 7.4 完整示例
```relation
Title: 客户满意度下降关联分析
Layout: Directional
Color[Root]: #7c3aed
Color[RootText]: #ffffff
Color[Middle]: #8b5cf6
Color[End]: #ddd6fe
Color[Line]: #a78bfa

Node: m1, 产品质量波动
Node: e1, 原材料批次不稳定

Rel: e1 -> m1
# 注: 末端节点(如e1)若未定义父级，会自动连接至上级；
# 所有最终汇聚点(Sinks)会自动连接至 Title(根节点)。
```

---

### ⚔️ 八、矩阵分析图 (Matrix Diagram) DSL 规范

#### 8.1 基础配置与全局权重
| 语法 | 说明 | 示例 |
|:---|:---|:---|
| `Title: [文字]` | 图表主标题 | `Title: 关键特性关系矩阵` |
| `Type: [L/T/Y/X/C]` | 矩阵布局类型 | `Type: Y` |
| `Weight[Strong]: [N]` | 自定义强相关分值 (默认 9) | `Weight[Strong]: 10` |
| `Orientation: [Top/Bottom]` | Y型或T轴的渲染朝向 | `Orientation: Bottom` |

#### 8.2 轴定义与项目权重
使用 `Axis:` 开启维度，使用 `-` 开启项目。
```matrix
Axis: ID, Label
- id, label, weight     // CSV方式定义权重
- id, label [weight]    // 标签标注方式定义权重
```

#### 8.3 矩阵映射语法
```matrix
# 声明
Matrix: AxisA x AxisB
# 数据填充 (RowID: ColID:Symbol)
a1: b1:S, b2:M, b3:W
```
*注：S (Strong/◎), M (Medium/○), W (Weak/△), 0 (None).*

#### 8.4 完整示例 (Y-Type)
```matrix
Title: 产品-特性-零件传递矩阵
Type: Y
Axis: A, 客户需求
- a1, 燃油经济性, 10
- a2, 乘坐舒适性, 8
Axis: B, 技术特性
- b1, 车身轻量化
- b2, 悬挂调教
Axis: C, 零部件
- c1, 碳纤维框架
- c2, 电子减震器
Matrix: A x B
a1: b1:S, b2:M
a2: b2:S
Matrix: B x C
b1: c1:S
b2: c2:S
Matrix: C x A
c1: a1:S
```

---

### 📊 十二、基础图表 (Basic Chart) DSL 规范

基础图表支持柱状图、折线图及饼图，具备强大的多轴配置能力。

#### 12.1 核心配置
| 语法 | 说明 | 示例 |
|------|------|------|
| `Title: [文字]` | 图表标题 | `Title: 季度营收分析` |
| `Type: [bar/line/pie]` | 图表类型 | `Type: bar` |
| `View: [v/h]` | 垂直/水平视图 (Bar/Line) | `View: v` |
| `Stacked: [true/false]` | 堆叠模式 | `Stacked: true` |
| `Smooth: [true/false]` | 平滑曲线 (Line) | `Smooth: true` |

#### 12.2 样式与元数据
| 语法 | 说明 | 示例 |
|------|------|------|
| `Color[Title]: #HEX` | 标题颜色 | `Color[Title]: #1e293b` |
| `Font[Title]: [Size]` | 标题字号 | `Font[Title]: 20` |
| `Axis: [Label], [X/Y/Y2...]` | 定义轴名称 | `Axis: 季度, X` |

#### 12.3 数据数据集语法
```yaml
# 格式: Dataset: [名称], [[值列表]], [颜色], [轴映射]
Dataset: 序列A, [10, 20, 30], #3b82f6, Y
Dataset: 序列B, [15, 25, 35], null, Y2
```

#### 12.4 典型应用示例 (双轴组合)
```basic
Title: 产线效能分析
Type: bar
Smooth: true
Dataset: 月份, [1月, 2月, 3月], null, X
Dataset: 产量, [800, 950, 1100], #3b82f6, Y
Dataset: 合格率, [92, 95, 94], #ef4444, Y2
```

---

### 📉 九、全维度图矩阵 (Matrix Plot) DSL 规范

#### 9.1 元数据配置
| 语法 | 说明 | 示例 |
|:---|:---|:---|
| `Title: [文字]` | 图表主标题 | `Title: 工艺参数关联分析` |
| `Mode: [Matrix/YvsX]` | 布局模式 (自相关或交叉) | `Mode: Matrix` |
| `Dimensions: [A, B...]` | 分析维度 (Matrix 模式用) | `Dimensions: [温度, 压力]` |
| `X-Dimensions: [X1...]` | X轴变量 (YvsX 模式用) | `X-Dimensions: [转速]` |
| `Y-Dimensions: [Y1...]` | Y轴变量 (YvsX 模式用) | `Y-Dimensions: [良率]` |
| `Group: [变量名]` | 分类变量 (用于颜色区分) | `Group: 批次` |
| `Smoother: [L/M/false]` | 平滑算法 (Lowess/MovingAverage) | `Smoother: Lowess` |

#### 9.2 数据与样式
使用 `Data:` 引导 JSON/YAML 列表，使用 `Styles:` 引导视觉参数。
```matrix_plot
Title: 生产稳定性分析
Mode: Matrix
Dimensions: [温度, 压力, 振动]
Group: 状态
Smoother: Lowess

Data:
- { 温度: 100, 压力: 5.5, 振动: 0.1, 状态: "正常" }
- { 温度: 120, 压力: 6.2, 振动: 0.5, 状态: "异常" }

Styles:
- Diagonal: Histogram
- DisplayMode: Full
- PointSize: 6
```

---

### 🛡️ 十、PDPC (过程决策程序图) DSL 规范

PDPC 用于动态风险分析，通过模拟各种可能的异常路径并预设对策，确保计划在各种情形下都能平稳执行。

#### 10.1 核心方法论 (Methodology)
1.  **设定目标**: 明确最终期望的状态（End）。
2.  **规划路径**: 按时间或逻辑顺序排列必要步骤（Step）。
3.  **预测障碍**: 在每个关键步骤寻找可能的失败点。
4.  **制定对策**: 为每个失败点准备补偿措施（Countermeasure）。

#### 10.2 节点定义与类型 (Nodes & Types)
| 语法 | 说明 | 示例 |
|:---|:---|:---|
| `Item: [ID], [Label], [start]` | 流程起点 | `Item: s1, 探测器火灾报警, [start]` |
| `Item: [ID], [Label], [step]` | 标准过程步骤 | `Item: s2, 现场确认火情, [step]` |
| `Item: [ID], [Label], [counter]` | 应对对策/补偿措施 | `Item: c1, 启用备用发电机, [countermeasure]` |
| `Item: [ID], [Label], [end]` | 流程终点/目标实现 | `Item: e1, 安全撤离完成, [end]` |

#### 10.3 分组与嵌套 (Grouping & Hierarchy)
| 语法 | 说明 | 示例 |
|:---|:---|:---|
| `Group: [ID], [Label]` | 开启分组容器 | `Group: Phase1, 初始化阶段` |
| `Group: [ID], [Label], [ParentID]` | 定义嵌套分组 | `Group: SubP1, 子流程, Phase1` |
| `EndGroup` | 结束当前分组容器 | - |

#### 10.4 逻辑连线与判定 (Links & Markers)
| 语法 | 说明 | 示例 |
|:---|:---|:---|
| `ID1--ID2` | 默认逻辑流向 | `s1--s2` |
| `ID1--ID2 [OK]` | 成功/正常路径标记 | `s2--s3 [OK]` |
| `ID1--ID2 [NG]` | 失败/异常路径标记 | `s2--c1 [NG]` |
| `ID1--ID2 [自定义]` | 标注任意判定决策文本 | `s2--c2 [火势失控]` |

#### 10.5 视觉样式定制 (Visual Styles)
| 语法 | 说明 | 默认值 |
|:---|:---|:---|
| `Layout: Directional/Standard` | 左右流 (LR) 或 上下流 (TB) | `Directional` |
| `Color[Start...]: #HEX` | 支持 Start, Step, Countermeasure, End 等节点的配对色 | - |
| `Line[Width]: [Number]` | 连接线条粗细滑杆同步值 | `2` |
| `Font[Title/Node]: [Size]` | 标题与节点文本字号 | `20 / 12` |

#### 10.6 典型应用示例 (IT 灾备场景)
```pdpc
Title: 核心支付系统故障应急 PDPC
Layout: Standard
Color[Countermeasure]: #ef4444
Color[CountermeasureText]: #ffffff
Line[Width]: 2

Group: g1, 监测预警
  Item: start, 监控系统报警, [start]
  Item: s1, 确认业务受损程度, [step]
EndGroup

Group: g2,应急决策
  Item: c1, 自动熔断与降级, [countermeasure]
  Item: c2, 切换备用数据库, [countermeasure]
  Item: s2, 系统可用性检查, [step]
EndGroup

Item: end, 业务完全恢复, [end]

start--s1
s1--c1 [响应时间 > 5s]
s1--c2 [主库连接失败]
c1--s2
c2--s2
s2--end [正常]
```

---

### 🏹 十一、矢线图 (Arrow Diagram) DSL 规范

矢线图用于项目排程与关键路径分析，支持实活动与虚活动。

#### 11.1 基础配置
| 语法 | 说明 | 示例 |
|------|------|------|
| `Title: [文字]` | 项目名称 | `Title: 二期生产线建设` |
| `ShowCritical: [true/false]` | 是否高亮关键路径 | `ShowCritical: true` |
| `Color[Node]: #HEX` | 节点背景色 | `Color[Node]: #ffffff` |
| `Color[Line]: #HEX` | 常规路径颜色 | `Color[Line]: #64748b` |
| `Color[Critical]: #HEX` | 关键路径颜色 | `Color[Critical]: #ef4444` |

#### 11.2 定义与关系
| 语法 | 说明 | 示例 |
|------|------|------|
| `Event: [ID], [Label]` | 定义里程碑节点 | `Event: 1, 开工` |
| `ID1 -> ID2 : [工期], [文字]` | 实活动 | `1 -> 2 : 5, 需求分析` |
| `ID1 ..> ID2 : 0, [文字]` | 虚活动 (Duration 须为 0) | `2 ..> 3 : 0, 虚任务` |

#### 11.3 典型应用示例
```arrow
Title: 软件开发进度网络图
ShowCritical: true

Event: 1, 项目启动
Event: 6, 项目结束

1 -> 2 : 5, 需求分析
2 -> 3 : 10, 架构设计
2 -> 4 : 5, UI设计
3 -> 5 : 15, 后端开发
4 -> 5 : 10, 前端开发
5 -> 6 : 5, 联调测试
```

---

## 📦 快速启动 (Quick Start)

### 1. 基础配置与环境变量
项目依赖环境变量来激活 AI 推理功能。在项目根目录下创建一个 `.env` 文件（或参考 `.env.example`）：

```bash
# AI 服务授权密钥 (如 DeepSeek, OpenAI 或 Gemini 的 Key)
API_KEY=your_real_api_key

# [可选] 激活的 AI 配置文件名
# 默认使用 deepseek_public，可切换为 chart_spec.json 中定义的其他方案
AI_ACTIVE_PROFILE=deepseek_public
```

### 2. 本地开发
1. **安装依赖**:
   ```bash
   npm install
   ```
2. **配置 API Key**:
   在根目录下创建 `.env` 文件并设置 `API_KEY`（或在 `vite.config.ts` 中定义的对应变量）。
3. **启动项目**:
   ```bash
   npm run dev
   ```
4. **访问**: [http://localhost:3000](http://localhost:3000)

### 2. 容器化部署 (Docker)
项目支持**运行时环境变量注入**，这意味着您可以直接通过环境变量修改配置而无需重新编译镜像。

1. **启动容器**:
   ```bash
   # 确保根目录下有 .env 文件或直接在命令中传入变量
   docker compose up -d --build
   ```
2. **动态更新配置**:
   如果您需要更换 API Key，只需修改 `.env` 或 `docker-compose.yml` 中的 `environment` 节点，然后运行：
   ```bash
   docker compose up -d
   ```
   系统将自动重写 `config.js` 并即时生效。
3. **配置生效原理 (Technical Detail)**:
   - **开发环境 (`npm run dev`)**: Vite 自动读取 `.env` 并直接注入代码。修改后通常需要重启 Vite 进程（或利用 HMR）。
   - **生产环境 (Docker)**: 采用“运行时注入”技术。容器内的 `docker-entrypoint.sh` 脚本会在启动时将当前的容器环境变量（来自 `.env` 或 Compose 节点）提取并生成 `/config.js`。
   - **优先级**: 运行时配置 (Docker) > 编译时配置 (.env/Dev) > 预置配置 (chart_spec.json)。

4. **访问系统**:
   通过浏览器访问 [http://localhost:8080](http://localhost:8080)。

---

## 🎨 设计理念

本工具遵循 **“极简描述，深度呈现”** 的原则。所有的 UI 比例均经过工业级视距优化，旨在为质量工程师提供一个沉浸式、无干扰的逻辑分析环境。

---

© 2026 Smart QC Studio | Industrial Logic Factory 🏆🏁
