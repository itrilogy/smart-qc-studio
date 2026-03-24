# IQS Chart Rendering MCP Server Design Scheme 🎨🛠️

## 1. 目标 (Objective)
通过 MCP (Model Context Protocol) 协议，使 AI 代理能够精准调用 IQS 的 14 种核心组件及扩展的 Mermaid/VChart 图表类型。实现工具级别的物理隔离，并提供极致的渲染兼容性。

## 2. 核心架构 (Enhanced Architecture)

本方案采用 **“渲染增强桥接” (Enhanced Rendering Bridge)** 模式。

```mermaid
graph TD
    User[用户/AI] -- "1. render_vchart_bar(dsl)" --> MCP[MCP Server (Node.js)]
    MCP -- "2. Launch Headless" --> Chrome[Puppeteer]
    Chrome -- "3. Render" --> Vite[App.tsx]
    Vite -- "4. Screenshot" --> Chrome
    Chrome -- "5. Save Base64" --> MCP
    
    subgraph SSE_Optimization [SSE 渲染优化]
        MCP -- "6a. Save File" --> Disk[(renders/ folder)]
        Disk -- "6b. Static Serve" --> Express[Express Server]
    end
    
    MCP -- "7. Response: Mode-based (Stdio: Base64 / SSE: URL Link)" --> User
```

### 2.1 渲染增强机制
- **3X 高清采样**: 启用 `deviceScaleFactor: 3`，确保生成的图表在视网膜屏下极度清晰。
- **单模返回 (URL Only)**: 在 SSE 模式下，系统**仅返回**封装了 Markdown 图片外链的 `text` 内容。这彻底避免了部分客户端解析 Base64 时的显示异常。
- **命名规范**: 根据时间戳与随机 Hash 生成：`render_YYYYMMDD_HHMMSS_[hash].png`。
- **静态托管**: SSE 模式下通过 Express 静态服务挂载 `renders/` 目录。

## 3. 工具规格 (Tool Specifications)

现已实现 **50 个专项工具**，分为三大类：

### 3.1 核心组件 (Core) - 14 种
- `render_fishbone`, `render_pareto`, `render_spc`, `render_affinity`, `render_histogram`, `render_scatter`, `render_relation`, `render_matrix`, `render_matrix_data`, `render_pdpc`, `render_arrow`, `render_basic`, `render_radar`, `render_vchart`

### 3.2 Mermaid 扩展 - 18 种
- 支持 `flowchart`, `sequence`, `gantt`, `class`, `state`, `er`, `journey`, `pie`, `mindmap`, `timeline`, `kanban`, `git`, `requirement`, `quadrant`, `xychart`, `block`, `architecture`, `packet`

### 3.3 VChart 扩展 (AI 友好) - 18 种
- 支持 `bar`, `line`, `pie`, `scatter`, `radar`, `sankey`, `funnel`, `treemap`, `gauge`, `wordcloud`, `sunburst`, `combination`, `waterfall`, `boxplot`, `heatmap`, `liquid`, `rangecolumn`, `circlepacking`

---
*Smart QC Studio - MCP 架构组 归档*
