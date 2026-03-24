# Fishbone (鱼骨图) 协议切片

## 1. 专家灵魂 (The Soul)

### 石川图 (Ishikawa) 因果分析原理
鱼骨图，又称因果图，是整理**问题与原因**之间关系的一种极佳工具。

#### 1. 5M1E 模型 (制造业)
最常用的分类方法，涵盖：
- **人 (Man):** 操作员、技术、意识。
- **机 (Machine):** 设备稳定性、精度、润滑。
- **料 (Material):** 原材料、品质、规格。
- **法 (Method):** 工艺标准、操作流程。
- **环 (Environment):** 温湿度、照明、噪音。
- **测 (Measurement):** 测量工具、抽样方法。

#### 2. 4P 模型 (服务业/管理)
- **策略 (Policies):** 规章制度、管理流程。
- **程序 (Procedures):** 具体作业步骤。
- **人员 (People):** 能力、态度、协作。
- **场所 (Plant):** 办公环境、系统工具。

### 专家建议
> [!TIP]
> 鱼骨图的深度决定了解决问题的深度。当您推导出某个原因时，请连续追问 "为什么" (5 Whys)，直到找到实质性的根因节点。

---

## 2. 语法血肉 (The Flesh)

### 基础配置
| 语法 | 说明 | 示例 |
| :--- | :--- | :--- |
| `Title:` | 定义图表核心标题 (鱼头) | `Title: 售后投诉根因分析` |

### 颜色键值语法
- `Color[Root]`: 鱼头背景 (Root Node)
- `Color[RootText]`: 鱼头文字 (Root Text)
- `Color[Main]`: 大骨背景 (Main Category)
- `Color[MainText]`: 大骨文字 (Main Text)
- `Color[Bone]`: 主脊椎线 (Spine Line)
- `Color[Line]`: 子因连接线 (Sub-cause Line)
- `Color[Text]`: 原因文字 (General Text)

### 层级定义语法 (Markdown 风格)
- `# [文字]`: 一级分类（大骨）
- `## [文字]`: 二级原因（中骨）
- `### [文字]`: 三级原因（小骨）
*以此类推，支持多级嵌套。*

---

## 3. 官方示例 (The Seed)

### 场景：工业制造 - 注塑件表面缩水分析
```dsl
Title: 注塑件表面缩水故障分析
Color[Root]: #ef4444
Color[RootText]: #ffffff
Color[Main]: #3b82f6
Color[MainText]: #ffffff

# 人 (Man)
## 调机参数设置不当
### 保压压力过低
### 保压时间不足
## 巡检意识淡薄

# 机 (Machine)
## 料筒加热温度偏移
## 模具冷却水道阻塞
### 冷却水流量不足

# 料 (Material)
## 材料缩水率不均匀
## 回料比例过高

# 法 (Method)
## 工艺标准不完善
## 注射速度过快
```

---
**权威性声明**: 本文档内容与 `FishboneEditor.tsx` 及 `chart_spec.json` 保持同步。 Riverside,
