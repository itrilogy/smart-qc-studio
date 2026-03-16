# IQS Chart Rendering MCP Server Design Scheme 🎨🛠️

## 1. 目标 (Objective)
通过 MCP (Model Context Protocol) 协议，使 AI 代理能够调用 IQS 的 14 种图表组件，根据 DSL 输入生成高质量的图片输出。实现“指令即绘图”的自动化闭环。

## 2. 核心架构 (Core Architecture)

本方案采用 **“无头浏览器渲染桥接” (Headless Rendering Bridge)** 模式。

```mermaid
graph LR
    User[用户/AI] -- "render_chart(type, dsl)" --> MCP[MCP Server (Node.js)]
    MCP -- "Launch Headless" --> Chrome[Puppeteer / Chromium]
    Chrome -- "Load URL ?mode=headless" --> Vite[Vite Dev Server / App.tsx]
    Vite -- "Render Component" --> Chart[React Chart Component]
    Chart -- "Screenshot / Export" --> Chrome
    Chrome -- "Image Data" --> MCP
    MCP -- "Base64 Image" --> User
```

### 2.1 Web 端改造 (Headless Mode)
- **入口改造**：在 `App.tsx` 中增加对 URL 参数 `mode=headless` 的识别。
- **纯净自适应布局**：在渲染模式下，隐藏 Sidebar、Header 和 Footer，并强制容器宽高为 100% 或指定尺寸。
- **状态同步**：向 `window` 暴露渲染完成状态位，便于 Puppeteer 捕获。

### 2.2 服务端实现 (MCP Server)
- **技术栈**：Node.js + `@modelcontextprotocol/sdk` + `puppeteer`。
- **生命周期管理**：MCP 服务启动时可自动检测并启动 Vite 预览服务。
- **并发控制**：利用 Puppeteer 的 Context 功能支持多线程并发渲染。

## 3. 工具规格 (Tool Specifications)

### 3.1 核心指令：`render_chart`
- **输入参数**：
    - `type` (Enum): 图表类型 (fishbone, pareto, spc, etc.)
    - `dsl` (String): 符合 IQS 标准的 DSL 代码。
    - `width`/`height` (Optional): 输出图片尺寸。
    - `theme` (Optional): 视觉方案 (light, dark)。
- **输出格式**：
    - `image/png` (Base64)
    - `application/json` (含分析摘要)

### 3.2 具名快捷指令 (Named Shortcuts)
为了提升意图识别率，将为每个组件提供具名工具：
- `render_fishbone(dsl)`
- `render_pareto(dsl)`
- `render_spc(dsl)`
- ...等共计 14 个独立工具。

## 4. 实施路线图 (Implementation Roadmap)

1.  **Stage 1: Headless Entry Point**
    - 在 `App.tsx` 实现渲染参数注入。
    - 确保基础图表在无 UI 状态下能够正常加载 DSL。
2.  **Stage 2: Core MCP Server**
    - 编写 `mcp-server/index.js`。
    - 实现 Puppeteer 导航与截图逻辑。
3.  **Stage 3: DSL Parser Extract** (Optional)
    - 为了提升性能，可在服务端预校验 DSL 合法性。
4.  **Stage 4: Integration Test**
    - 验证所有 14 种图表在 headless 环境下的渲染质量。

---
*Smart QC Studio - MCP 架构组 归档*
