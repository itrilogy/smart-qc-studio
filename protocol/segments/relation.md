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
Title: 项目开发进度延期分析
Layout: Directional

Color[Root]: #fef2f2
Color[RootText]: #991b1b
Color[Middle]: #f0f9ff
Color[End]: #ecfdf5

# 因素定义
Node: n1, 人员流动率高
Node: n2, 关键技术储备不足
Node: n3, 需求文档不清晰
Node: n4, 开发环境配置缓慢
Node: n5, 技术债务堆积
Node: n6, 沟通响应超时

# 关系链条
Rel: n1 -> n2
Rel: n2 -> n5
Rel: n3 -> n5
Rel: n3 -> n6
Rel: n5 -> root
Rel: n6 -> root
Rel: n4 -> root
```

---
**权威性声明**: 本文档内容与 `RelationEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
