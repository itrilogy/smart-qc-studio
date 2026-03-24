# Arrow (双代号网络图) 协议切片

## 1. 专家灵魂 (The Soul)

### 双代号网络图 (Arrow Diagram Method)
矢线图，又称双代号网络图 (ADM)，是计划管理的重要工具。它通过节点（事件）和箭条（工作）展示各项任务间的先后顺序与时间关联。

#### 核心计算逻辑 (CPM):
- **关键路径 (Critical Path)**: 项目中耗时最长的路径。关键路径上的任何延迟都会导致整个项目的延期。
- **最早开始时间 (ES) / 最迟开始时间 (LS)**: 通过前推和后推算法计算每个节点的宽裕时间。
- **虚任务 (Dummy Task)**: 不消耗时间与资源，仅表示任务间逻辑依赖关系的虚线。

### 专家建议
> [!TIP]
> **资源优化**: 识别非关键路径上的 "时差 (Float)"。你可以通过延后非关键任务的开始时间，来平衡峰值期间的人力或设备资源，而不会影响项目总工期。

---

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 项目名称 | `Title: 新生产线建设进度控制` |
| `ShowCritical:` | 是否高亮显示关键路径 | `ShowCritical: true` |
| `ShowShortest:` | 是否显示最短路径 (Dijkstra) | `ShowShortest: false` |

### 元素定义
- **节点 (Event)**: `Event: [ID], [Label]`
- **实任务 (Task)**: `[SrcID] -> [TgtID]: [Duration], [Label]`
- **虚任务 (Dummy)**: `[SrcID] ..> [TgtID]: 0, [Label]`

### 视觉样式
- `Color[Node | Line]`: 常规节点与连线颜色。
- `Color[Critical | Shortest]`: 特殊路径的高亮色。

---

## 3. 官方示例 (The Seed)

### 场景：某办公软件开发项目计划
```dsl
Title: 办公软件 V1.0 开发计划
ShowCritical: true
ShowShortest: false

Color[Critical]: #ef4444
Color[Line]: #6366f1

# 节点定义
Event: 1, 立项完成
Event: 2, 需求评审
Event: 3, 架构设计
Event: 4, 模块 A 开发
Event: 5, 模块 B 开发
Event: 6, 集成测试
Event: 7, 交付

# 任务链条
1 -> 2: 3, 需求分析
2 -> 3: 2, 架构方案
3 -> 4: 10, A逻辑实现
3 -> 5: 8, B逻辑实现
5 ..> 4: 0, 依赖同步
4 -> 6: 5, 系统集成
6 -> 7: 2, 验收发布
```

---
**权威性声明**: 本文档内容与 `ArrowDiagramEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
