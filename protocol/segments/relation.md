# Relation (关联图) 协议切片

## 1. 专家灵魂 (The Soul)

### 关联图 (Relationship Diagram)
关联图是将问题及其各种因素之间的复杂因果关系，用箭头连接起来的图形分析工具。它特别适用于原因相互交织、难以用鱼骨图等层级工具分析的场景。

#### 因果识别逻辑：
- **末端因素 (End/Source)**: 只有引出箭头，没有指向自身的箭头。通常是问题的根本原因。
- **中间因素 (Middle)**: 既有接收箭头，也有引出箭头。
- **主要症结 (Root/Sink)**: 在此场景下，即为分析的主题或最终结果。

### 专家技巧
> [!TIP]
> **出入度分析**: 一个节点如果具有极高的 "入度" (指向它的箭头多)，通常意味着它是核心矛盾的体现；如果具有极高的 "出度" (引出的箭头多)，则是问题的根源所在。

---

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 定义主要症结 (Root) | `Title: 客户满意度下降分析` |
| `Layout:` | 布局模式 (`Directional` / `Centralized` / `Free`) | `Layout: Directional` |

### 样式配置
- `Color[Root | RootText]`: 主要症结背景与文字。
- `Color[Middle | MiddleText]`: 中间环节样式。
- `Color[End | EndText]`: 末端根因样式。
- `Font[Title | Node]`: px 字号。
- `Color[Line]`: #HEX 连线颜色。

### 核心语法
- **节点定义**: `Node: [ID], [Label]`
- **关系定义**: `Rel: [SourceID] -> [TargetID]`

---

## 3. 官方示例 (The Seed)

### 场景：项目进度延期根因关联分析
```dsl
Title: 注塑件尺寸不稳定

Layout: Directional
Color[Root]: #2563eb
Color[RootText]: #ffffff
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
Rel: e4 -> m4
```

---
**权威性声明**: 本文档内容与 `RelationEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
