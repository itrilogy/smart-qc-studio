import React from 'react';
import { Zap, BarChart3, LineChart, PieChart, ScatterChart, Activity, Workflow, Network, Boxes, Grid3X3, GitBranch, BarChart2, Table, GitFork } from 'lucide-react';
import { QCToolType, FishboneNode } from './types';

export const TOOL_CONFIGS = [
  {
    type: QCToolType.FISHBONE,
    name: '鱼骨图',
    enName: 'Fishbone Diagram',
    desc: '用于分析问题与其潜在原因之间的关系，支持思维导图式交互。',
    icon: <GitBranch size={32} />,
    color: 'text-blue-500',
    bg: 'bg-blue-50/50',
    accent: '#3b82f6'
  },
  {
    type: QCToolType.PARETO,
    name: '排列图',
    enName: 'Pareto Chart',
    desc: '自动计算累计频率，识别造成这一结果的主要原因（二八法则）。',
    icon: <BarChart3 size={32} />,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50/50',
    accent: '#10b981'
  },
  {
    type: QCToolType.HISTOGRAM,
    name: '直方图',
    enName: 'Histogram',
    desc: '显示数据的分布情况，判断工序是否处于稳定状态。',
    icon: <BarChart2 size={32} />,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50/50',
    accent: '#6366f1'
  },
  {
    type: QCToolType.SCATTER,
    name: '散点图',
    enName: 'Scatter Plot',
    desc: '分析两个变量之间的相关性，支持多维度气泡展示与趋势回归。',
    icon: <ScatterChart size={32} />,
    color: 'text-amber-500',
    bg: 'bg-amber-50/50',
    accent: '#f59e0b'
  },
  {
    type: QCToolType.AFFINITY,
    name: '系统/亲和图',
    enName: 'System / Affinity Diagram',
    desc: '集成 KJ 法与系统图功能，支持卡片分组归类与树状层级布局，适用于头脑风暴与系统架构分析。',
    icon: <Boxes size={32} />,
    color: 'text-orange-500',
    bg: 'bg-orange-50/50',
    accent: '#f97316'
  },
  {
    type: QCToolType.CONTROL,
    name: '控制图',
    enName: 'Control Chart',
    desc: '工业级 SPC 统计工具，自动计算 UCL/LCL，识别异常点并应用 Western-Electric 等判异规则。支持单/多维数据。',
    icon: <Activity size={32} />,
    color: 'text-rose-500',
    bg: 'bg-rose-50/50',
    accent: '#f43f5e'
  },
  {
    type: QCToolType.RELATION,
    name: '关联图',
    enName: 'Relation Diagram',
    desc: '分析复杂因素之间的因果关系，自动梳理末端因素、中间因素与核心问题。',
    icon: <Workflow size={32} />,
    color: 'text-purple-500',
    bg: 'bg-purple-50/50',
    accent: '#a855f7'
  },
  {
    type: QCToolType.MATRIX,
    name: '矩阵图',
    enName: 'Matrix Diagram',
    desc: 'L/T/Y/X 型矩阵分析工具，支持多维度因素关联分析与加权评分计算。',
    icon: <Table size={32} />,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50/50',
    accent: '#06b6d4'
  },
  {
    type: QCToolType.MATRIX_PLOT,
    name: '图矩阵',
    enName: 'Matrix Plot',
    desc: '多变量散点图矩阵，支持 Minitab 风格的全变量分析及 Y 对 X 分析。',
    icon: <Grid3X3 size={32} />, // Keeping Grid3X3 for Matrix Plot
    color: 'text-blue-600',
    bg: 'bg-blue-50/50',
    accent: '#2563eb'
  },
  {
    type: QCToolType.PDPC,
    name: 'PDPC',
    enName: 'PDPC Chart',
    desc: '过程决策程序图，用于识别实现目标过程中的障碍并制定对策，确保计划顺利完成。',
    icon: <GitFork size={32} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50/50',
    accent: '#059669'
  },
  {
    type: QCToolType.ARROW,
    name: '矢线图',
    enName: 'Arrow Diagram',
    desc: '又称网络计划技术 (PERT/CPM)，用于安排工程进度并识别关键路径。',
    icon: <Network size={32} />,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50/50',
    accent: '#4f46e5'
  }
];


export const INITIAL_FISHBONE_DSL = `Color[Bone]: #475569
Color[Line]: #cbd5e1
Color[Root]: #2563eb
Color[RootText]: #ffffff
Color[Main]: #3b82f6
Color[MainText]: #ffffff
Color[Text]: #1e293b
Color[End]: #94a3b8
Title: 生产线停产原因分析

# 人员 (Man)
## 调机参数设置不当
### 保压压力过低
## 巡检不及时

# 机械 (Machine)
## 料筒加热温度偏移
## 模具冷却水道阻塞

# 物料 (Material)
## 材料缩水率不均匀
`;

export const INITIAL_HISTOGRAM_DATA = [
  9.8, 10.2, 10.1, 9.9, 10.0, 10.3, 9.7, 10.1, 9.9, 10.0,
  10.2, 9.8, 10.4, 9.6, 10.1, 9.9, 10.0, 10.2, 9.8, 10.1,
  10.5, 9.5, 10.0, 10.3, 9.7, 10.1, 9.9, 10.2, 10.0, 9.8
];

export const INITIAL_HISTOGRAM_DSL = `Title: 产品直径分布分析
USL: 10.5
LSL: 9.5
Target: 10.0
Color[Bar]: #3b82f6
Color[Curve]: #f97316
Color[USL]: #ef4444
Color[LSL]: #ef4444
Color[Target]: #22c55e
Font[Title]: 18
Font[Base]: 12
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
`;

export const INITIAL_FISHBONE_DATA: FishboneNode = {
  id: 'root',
  label: '生产线停产原因分析',
  type: 'root',
  children: [
    {
      id: 'm1',
      label: '人员 (Man)',
      type: 'main',
      children: [
        {
          id: 's1-1',
          label: '调机参数设置不当',
          type: 'sub',
          children: [
            { id: 'd1-1-1', label: '保压压力过低', type: 'detail' }
          ]
        },
        { id: 's1-2', label: '巡检不及时', type: 'sub' }
      ]
    },
    {
      id: 'm2',
      label: '机械 (Machine)',
      type: 'main',
      children: [
        { id: 's2-1', label: '料筒加热温度偏移', type: 'sub' },
        { id: 's2-2', label: '模具冷却水道阻塞', type: 'sub' }
      ]
    }
  ]
};

export const INITIAL_PARETO_DSL = `Title: 售后质量问题分布分析
Color[Title]: #1e293b
Color[Bar]: #3b82f6
Color[Line]: #f59e0b
Color[MarkLine]: #ef4444
Font[Title]: 20
Decimals: 1

- 物流破损: 420
- 零件缺失: 215
- 包装老化: 89
- 标签错误: 56
- 其他细项: 23`;

export const INITIAL_PARETO_DATA = [
  { id: '1', name: '物流破损', value: 420 },
  { id: '2', name: '零件缺失', value: 215 },
  { id: '3', name: '包装老化', value: 89 },
  { id: '4', name: '标签错误', value: 56 },
  { id: '5', name: '其他细项', value: 23 }
];

export const INITIAL_CONTROL_DATA = {
  series: [{ name: '轴径', data: [12.01, 11.98, 12.05, 12.01, 11.97, 12.02, 11.99, 12.03, 12.01, 12.04, 11.98, 12.00, 12.02, 11.99, 12.01, 12.03, 11.97, 11.99, 12.01, 12.02] }]
};

export const INITIAL_CONTROL_DSL = `// 示例：轴类零件外径加工过程监控
// 包含 25 个连续观测值，若子组大小为 5，则自动计算 5 个子组的均值与极差
Title: 活塞销外径加工过程监控（高频采样）
Type: X-bar-R
Size: 5
Rules: Western-Electric,Nelson
Decimals: 3
Color[Line]: #3b82f6
Color[Point]: #1d4ed8

[series]: 测量观测值
12.012, 11.985, 12.053, 12.001, 11.974
12.022, 11.991, 12.035, 12.011, 12.042
11.988, 12.005, 12.021, 11.995, 12.018
12.031, 11.978, 11.999, 12.015, 12.024
12.008, 12.026, 11.984, 12.041, 11.992
[/series]`;


export const INITIAL_SCATTER_DATA = [
  { id: '1', x: 210.5, y: 95.2, z: 1.2 },
  { id: '2', x: 215.0, y: 98.5, z: 1.1 },
  { id: '3', x: 208.2, y: 92.1, z: 1.4 },
  { id: '4', x: 220.5, y: 105.0, z: 0.9 },
  { id: '5', x: 205.0, y: 90.0, z: 1.6 },
  { id: '6', x: 212.8, y: 96.5, z: 1.15 },
  { id: '7', x: 218.0, y: 102.0, z: 0.95 },
  { id: '8', x: 202.0, y: 88.5, z: 1.8 },
  { id: '9', x: 214.5, y: 97.2, z: 1.12 },
  { id: '10', x: 209.0, y: 94.0, z: 1.35 },
  { id: '11', x: 219.5, y: 103.5, z: 0.92 },
  { id: '12', x: 206.5, y: 91.0, z: 1.55 }
];

export const INITIAL_SCATTER_DSL = `Title: 注塑工艺参数三维分析 (温度/压力/收缩率)
XAxis: 模具温度(℃)
YAxis: 注射压力(MPa)
ZAxis: 收缩率%
Color[Point]: #3b82f6
Color[Trend]: #f97316
ShowTrend: true
3D: false

# 数据 (X:温度, Y:压力, Z:收缩率)
# 组1: 低温低压 -> 高收缩 (欠注)
- 195.5, 85.2, 2.4
- 192.0, 82.5, 2.5
- 198.5, 88.0, 2.2
- 194.2, 84.1, 2.35

# 组2: 优选参数 -> 低收缩 (理想)
- 215.0, 105.0, 0.6
- 218.5, 108.2, 0.55
- 212.0, 102.5, 0.7
- 216.5, 106.8, 0.58

# 组3: 高温高压 -> 中收缩 (过保压)
- 235.0, 125.0, 1.2
- 238.5, 128.5, 1.3
- 232.0, 122.0, 1.15
- 240.0, 130.2, 1.25
`;

export const INITIAL_AFFINITY_DSL = `Title: 市场环境亲和图分析
Type: Card
Layout: Horizontal

Color[TitleBg]: #ffffff
Color[TitleText]: #1e293b
Font[Title]: 24

Color[GroupHeaderBg]: #eff6ff
Color[GroupHeaderText]: #1e293b
Font[GroupHeader]: 16

Color[ItemBg]: #ffffff
Color[ItemText]: #334155
Font[Item]: 14

Color[Line]: #64748b
Color[Border]: #cbd5e1

Item: root, 市场环境亲和图分析
Item: g1, 市场机会, root
Item: i1, 新能源需求增长, g1
Item: i2, 政策扶持力度大, g1
Item: g2, 技术风险, root
Item: i3, 电池技术迭代快, g2
Item: i4, 供应链不稳定, g2
Item: g3, 运营挑战, root
Item: i5, 人才缺口大, g3
Item: i6, 跨区域管理难, g3`;

export const INITIAL_AFFINITY_DATA: any[] = [
  {
    id: 'g1',
    label: '市场机会',
    children: [
      { id: 'i1', label: '新能源需求增长' },
      { id: 'i2', label: '政策扶持力度大' }
    ]
  },
  {
    id: 'g2',
    label: '技术风险',
    children: [
      { id: 'i3', label: '电池技术迭代快' },
      { id: 'i4', label: '供应链不稳定' }
    ]
  },
  {
    id: 'g3',
    label: '运营挑战',
    children: [
      { id: 'i5', label: '人才缺口大' },
      { id: 'i6', label: '跨区域管理难' }
    ]
  }
];

export const INITIAL_RELATION_DSL = `Title: 注塑件尺寸不稳定
Layout: Directional
Color[Middle]: #8b5cf6
Color[MiddleText]: #ffffff
Color[End]: #ddd6fe
Color[EndText]: #4c1d95
Color[Line]: #a78bfa

Node: m1, 模温异常
Node: m2, 压力波动
Node: m3, 阀芯卡滞
Node: m4, 油质污染
Node: e1, 水路堵塞
Node: e2, 油温过高
Node: e3, 泵体磨损
Node: e4, 滤芯破损

Rel: m1 -> root
Rel: m2 -> root
Rel: e1 -> m1
Rel: e2 -> m1
Rel: e2 -> m2
Rel: m3 -> m2
Rel: e3 -> m2
Rel: m4 -> m3
Rel: m4 -> e3
Rel: e4 -> m4`;

export const INITIAL_RELATION_DATA = {
  nodes: [
    { id: 'm1', label: '模温异常', type: 'middle' },
    { id: 'm2', label: '压力波动', type: 'middle' },
    { id: 'm3', label: '阀芯卡滞', type: 'middle' },
    { id: 'm4', label: '油质污染', type: 'middle' },
    { id: 'e1', label: '水路堵塞', type: 'end' },
    { id: 'e2', label: '油温过高', type: 'end' }, // Logical End/Middle hybrid (Source of m1, m2)
    { id: 'e3', label: '泵体磨损', type: 'end' },
    { id: 'e4', label: '滤芯破损', type: 'end' }
  ],
  links: [
    { source: 'm1', target: 'root' }, // Implicit in DSL but explicit in Object for initial render if needed
    { source: 'm2', target: 'root' },
    { source: 'e1', target: 'm1' },
    { source: 'e2', target: 'm1' },
    { source: 'e2', target: 'm2' },
    { source: 'm3', target: 'm2' },
    { source: 'e3', target: 'm2' },
    { source: 'm4', target: 'm3' },
    { source: 'm4', target: 'e3' },
    { source: 'e4', target: 'm4' }
  ]
};

export const INITIAL_MATRIX_DSL = `Title: 矩阵图分析 (L-Type)
Type: L
CellSize: 40
ShowScores: true
Font[Title]: 14
Font[Base]: 10

Axis: A, 维度轴 A
- a1, 指标 A1, 9
- a2, 指标 A2, 6
- a3, 指标 A3, 3
- a4, 指标 A4, 1

Axis: B, 维度轴 B
- b1, 特性 B1
- b2, 特性 B2
- b3, 特性 B3
- b4, 特性 B4

Matrix: A x B
a1: b1:S, b2:M
a2: b3:S
`;


export const MATRIX_SAMPLE_TEMPLATES = {
  L: INITIAL_MATRIX_DSL,
  T: `Title: 矩阵图分析 (T-Type)
Type: T
CellSize: 40
ShowScores: true
Font[Title]: 14
Font[Base]: 10

Axis: A, 维度轴 A
- a1, 指标 A1, 9
- a2, 指标 A2, 6
- a3, 指标 A3, 3
- a4, 指标 A4, 1

Axis: B, 维度轴 B
- b1, 特性 B1
- b2, 特性 B2
- b3, 特性 B3
- b4, 特性 B4

Axis: C, 维度轴 C
- c1, 属性 C1
- c2, 属性 C2
- c3, 属性 C3
- c4, 属性 C4

Matrix: A x B

Matrix: A x C
`,
  Y: `Title: 矩阵图分析 (Y-Type)
Type: Y
Orientation: Top
CellSize: 40
ShowScores: true
Font[Title]: 14
Font[Base]: 10

Axis: A, 维度轴 A
- a1, 指标 A1, 9
- a2, 指标 A2, 7
- a3, 指标 A3, 5
- a4, 指标 A4, 3

Axis: B, 维度轴 B
- b1, 特性 B1, 5
- b2, 特性 B2, 5
- b3, 特性 B3, 5
- b4, 特性 B4, 5

Axis: C, 维度轴 C
- c1, 属性 C1, 2
- c2, 属性 C2, 2
- c3, 属性 C3, 2
- c4, 属性 C4, 2

Matrix: A x B

Matrix: B x C

Matrix: C x A
`,
  X: `Title: 矩阵图分析 (X-Type)
Type: X
CellSize: 40
ShowScores: true
Font[Title]: 14
Font[Base]: 10

Axis: N, 北轴 (North)
- n1, 指标 N1, 8
- n2, 指标 N2, 6
- n3, 指标 N3, 4
- n4, 指标 N4, 2

Axis: E, 东轴 (East)
- e1, 特性 E1, 5
- e2, 特性 E2, 5
- e3, 特性 E3, 5
- e4, 特性 E4, 5

Axis: S, 南轴 (South)
- s1, 属性 S1, 3
- s2, 属性 S2, 3
- s3, 属性 S3, 3
- s4, 属性 S4, 3

Axis: W, 西轴 (West)
- w1, 目标 W1, 9
- w2, 目标 W2, 9
- w3, 目标 W3, 9
- w4, 目标 W4, 9

Matrix: W x N

Matrix: E x N

Matrix: E x S

Matrix: W x S
`,
  C: `Title: 矩阵图分析 (C-Type)
Type: C
CellSize: 40
ShowScores: true
Font[Title]: 14
Font[Base]: 10

Axis: T, 维度轴 T
- t1, 指标 T1, 9
- t2, 指标 T2, 7
- t3, 指标 T3, 5
- t4, 指标 T4, 3

Matrix: T x T
`
};

export const INITIAL_MATRIX_PLOT_DSL = `Title: 工艺参数关联性分析 (简单矩阵)
Mode: Matrix
Dimensions: [温度, 压力, 时间, 强度]
Smoother: false

Data:
- { 温度: 200, 压力: 10.2, 时间: 30, 强度: 450 }
- { 温度: 210, 压力: 11.5, 时间: 31, 强度: 470 }
- { 温度: 205, 压力: 10.8, 时间: 32, 强度: 460 }
- { 温度: 220, 压力: 12.1, 时间: 33, 强度: 480 }
- { 温度: 225, 压力: 12.5, 时间: 34, 强度: 490 }
- { 温度: 218, 压力: 11.9, 时间: 35, 强度: 475 }
- { 温度: 190, 压力: 9.5, 时间: 29, 强度: 430 }
- { 温度: 195, 压力: 9.8, 时间: 28, 强度: 440 }
- { 温度: 202, 压力: 10.4, 时间: 29, 强度: 455 }
- { 温度: 208, 压力: 11.2, 时间: 30, 强度: 465 }
- { 温度: 212, 压力: 11.6, 时间: 32, 强度: 472 }
- { 温度: 215, 压力: 11.8, 时间: 33, 强度: 478 }
- { 温度: 222, 压力: 12.3, 时间: 35, 强度: 485 }
- { 温度: 228, 压力: 12.7, 时间: 36, 强度: 495 }
- { 温度: 230, 压力: 13.0, 时间: 37, 强度: 500 }
- { 温度: 185, 压力: 9.2, 时间: 27, 强度: 420 }
- { 温度: 198, 压力: 10.0, 时间: 28, 强度: 445 }
- { 温度: 204, 压力: 10.6, 时间: 31, 强度: 458 }
- { 温度: 211, 压力: 11.4, 时间: 32, 强度: 468 }
- { 温度: 216, 压力: 11.9, 时间: 33, 强度: 476 }
- { 温度: 219, 压力: 12.2, 时间: 34, 强度: 482 }
- { 温度: 223, 压力: 12.4, 时间: 35, 强度: 488 }
- { 温度: 226, 压力: 12.6, 时间: 36, 强度: 492 }
- { 温度: 192, 压力: 9.6, 时间: 28, 强度: 435 }

Styles:
- DisplayMode: Full
- Diagonal: Label
- ColorPalette: Industrial
- PointSize: 5
- PointOpacity: 0.6
- ColorPalette: Industrial
`;

export const INITIAL_PDPC_DSL = `Title: 关键系统迁移 PDPC 风险分析
Layout: Directional

// 1. 样式配置
Color[Start]: #2563eb
Color[Step]: #3b82f6
Color[Countermeasure]: #10b981
Color[End]: #ef4444

// 2. 节点与分组定义 (多路径多层级)
Group: p1, 前期准备
  Item: start, Start, [start]
  Item: a1, 环境检查
  Item: a2, 数据备份
EndGroup

Group: p2, 执行迁移
  Item: b1, 触发脚本
  Item: b2, 校验完整性
EndGroup

Group: p3, 异常应对
  Item: c1, 空间不足?
  Item: c2, 清理日志, [countermeasure]
  Item: c3, 扩容磁盘, [countermeasure]
  Item: c4, 权限拒绝?
  Item: c5, 提权重试, [countermeasure]
EndGroup

Item: end, Migration Success, [end]

// 3. 链条定义
start--a1--a2--b1
b1--b2 [OK]
b2--end [OK]

// 路径 1: 空间问题
b1--c1 [NG]
c1--c2 [OK]
c2--b1 [OK]
c1--c3 [NG]
c3--b1 [OK]

// 路径 2: 权限问题
b1--c4 [NG]
c4--c5 [OK]
c5--b1 [OK]`;

export const INITIAL_PDPC_DATA = {
  title: '关键系统迁移 PDPC 风险分析',
  nodes: [
    { id: 'start', label: 'Start', type: 'start', groupId: 'p1' },
    { id: 'a1', label: '环境检查', type: 'step', groupId: 'p1' },
    { id: 'a2', label: '数据备份', type: 'step', groupId: 'p1' },
    { id: 'b1', label: '触发脚本', type: 'step', groupId: 'p2' },
    { id: 'b2', label: '校验完整性', type: 'step', groupId: 'p2' },
    { id: 'c1', label: '空间不足?', type: 'step', groupId: 'p3' },
    { id: 'c2', label: '清理日志', type: 'countermeasure', groupId: 'p3' },
    { id: 'c3', label: '扩容磁盘', type: 'countermeasure', groupId: 'p3' },
    { id: 'c4', label: '权限拒绝?', type: 'step', groupId: 'p3' },
    { id: 'c5', label: '提权重试', type: 'countermeasure', groupId: 'p3' },
    { id: 'end', label: 'Migration Success', type: 'end' }
  ],
  links: [
    { source: 'start', target: 'a1', marker: 'None' },
    { source: 'a1', target: 'a2', marker: 'None' },
    { source: 'a2', target: 'b1', marker: 'None' },
    { source: 'b1', target: 'b2', marker: 'OK' },
    { source: 'b2', target: 'end', marker: 'OK' },
    { source: 'b1', target: 'c1', marker: 'NG' },
    { source: 'c1', target: 'c2', marker: 'OK' },
    { source: 'c2', target: 'b1', marker: 'OK' },
    { source: 'c1', target: 'c3', marker: 'NG' },
    { source: 'c3', target: 'b1', marker: 'OK' },
    { source: 'b1', target: 'c4', marker: 'NG' },
    { source: 'c4', target: 'c5', marker: 'OK' },
    { source: 'c5', target: 'b1', marker: 'OK' }
  ],
  groups: [
    { id: 'p1', label: '前期准备' },
    { id: 'p2', label: '执行迁移' },
    { id: 'p3', label: '异常应对' }
  ]
};

export const INITIAL_ARROW_DSL = `Title: 新产品研发上市网络计划
ShowCritical: true
Color[Node]: #ffffff
Color[Line]: #94a3b8
Color[Critical]: #ef4444

// 1. 项目启动
Event: 1, 立项
Event: 8, 上市发布

// 2. 研发线 (关键路径)
Event: 2, 方案定稿
Event: 5, 样机产出
1 -> 2: 5, 需求调研
2 -> 5: 20, 核心研发
5 -> 8: 15, 量产准备

// 3. 市场线 (非关键)
Event: 3, 市场策划
Event: 6, 预热推广
1 -> 3: 8, 竞品分析
3 -> 6: 10, 营销方案
6 -> 8: 12, 渠道铺设

// 4. 其它关联 (逻辑约束)
// 方案定稿(5d)后 -> 市场策划(8d+?)
2 ..> 3: 0, 方案确认
// 样机产出(25d)后 -> 预热推广(18d+?)
5 ..> 6: 0, 样机提供

// 5. 备案线 (非关键)
Event: 4, 合规审查
Event: 7, 许可证获取
1 -> 4: 8, 资料准备
4 -> 7: 15, 资质审批
7 -> 8: 5, 最终归档
`;
