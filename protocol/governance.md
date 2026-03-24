# IQS 协议全局治理规则 (IQS Protocol Governance)

## 1. 核心目标 (Objective)
建立一套分布式、颗粒化、具备机器可读性的知识管理体系。通过物理隔离不同组件的协议片段，确保系统逻辑的极度严密性与热同步的高效性。

## 2. 权威性等级协议 (Hierarchy of Authority)
当系统内的多份文档或知识源出现内容冲突或严重偏差时，AI 代理与 MCP 内核必须严格遵循以下**权威性递减顺序**进行判读与执行：

1. **Level 1: SSoT (最高权威)**
   - **载体**: `public/chart_spec.json`
   - **内容**: 定义物理规格、键名 (Key)、Few-shot 范式及基础触发词。
   - **冲突处理**: 任何与 Spec 不符的数据格式或参数定义均被视为无效。

2. **Level 2: Grammar (语法权威)**
   - **载体**: `protocol/segments/${id}.md` 中的 `### 指令表`
   - **内容**: 定义参数词典、详细指令说明及默认值。
   - **冲突处理**: 指令命名必须以 Spec 为基准，功能描述以手册为准。

3. **Level 3: Soul (专家权威)**
   - **载体**: `protocol/segments/${id}.md` 中的 `### 专家逻辑`
   - **内容**: 定义业务分析策略、QC 深度规范及专家提示。

4. **Level 4: Seed (溯源参考)**
   - **载体**: `docs/` 目录下的原始手册 (`USER_MANUAL_*.md`) 与历史笔记。
   - **内容**: 提供原始知识背景。

## 3. 分布式切片管理原则
- **物理独立**: 每一个组件 ID 对应一个独立的 `.md` 文件，存于 `protocol/segments/`。
- **锚点全量**: 修订必须是全量且无损的，严禁在切片中使用占位符。
- **命名一致性**: 文件名必须与 `chart_spec.json` 中的 `chart_grammars` 键值完全匹配。

---
*IQS Protocol Council - 2026.03*
 Riverside,
