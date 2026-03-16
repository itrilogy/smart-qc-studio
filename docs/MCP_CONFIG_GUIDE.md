# IQS Chart Rendering MCP Server 配置指南 🛠️

本指南将指导您如何在支持 Model Context Protocol (MCP) 的 AI 客户端（如 Claude Desktop）中集成 Smart QC Studio 的图表渲染服务。

## 1. 准备环境

确保您的系统中已安装以下软件：
- **Node.js**: v18.0.0 或更高版本。
- **Google Chrome**: 渲染引擎将自动寻找 `/Applications/Google Chrome.app` (macOS) 或系统默认路径。
- **运行中的 Web 服务**: MCP 服务器作为一个本地脚本运行，但它会通过 Puppeteer 访问正在运行的 Smart QC Studio Web 应用（默认内网地址 `http://localhost:5173`）来抓取图表。

> [!TIP]
> 请确保在项目根目录下运行 `npm run dev` 以启动 Web 服务。

## 2. 客户端配置 (以 Claude Desktop 为例)

### 配置文件位置
- **macOS**: `~/Library/Application\ Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

在 `mcpServers` 部分添加以下内容（请根据您的实际路径修改 `args` 中的路径）：

> [!NOTE]
> 这里的配置使用的是 **Stdio (标准输入输出)** 通信模式。在这种模式下，客户端通过执行本地 Node.js 脚本来启动 MCP 服务，因此 `args` 必须是本地文件的绝对路径，而不是 `http` 地址。

```json
{
  "mcpServers": {
    "iqs-chart-server": {
      "command": "node",
      "args": [
        "/Users/kwangwah/Code/qctools/smart-qc-studio/mcp-server/index.js"
      ],
      "env": {
        "IQS_BASE_URL": "http://localhost:5173"
      }
    }
  }
}
```

## 3. 核心工具说明

配置完成后，AI 客户端将识别到以下工具：

- **`render_chart`**: 通用绘图工具，需提供 `type`（如 `fishbone`, `pareto`）和 `dsl`。
- **`render_[type]`**: 快捷工具（如 `render_fishbone`），只需提供 `dsl` 字符串。

## 4. 常见问题排查

1. **找不到浏览器**: 如果报错提示无法启动浏览器，请检查 `mcp-server/index.js` 中的 `getExecutablePath` 函数是否覆盖了您的 Chrome 安装路径。
2. **连接被拒绝**: 请确认 `IQS_BASE_URL` 指代的 Web 服务已正常运行。
3. **渲染超时**: 首次启动或复杂图表可能需要较长时间，默认超时时间为 30 秒。

---

## 5. 远程调用与灵活性扩展 (Remote Access & SSE)

如果您希望将 Smart QC Studio 部署在服务器上，供多台主机远程调用，请使用 **SSE (Server-Sent Events)** 模式。

### 5.1 服务端启动 (Server Side)
1. 在服务器上克隆并构建项目。
2. 在 `mcp-server` 目录下运行：
   ```bash
   PORT=3000 npm run start:sse
   ```
   服务器将监听 3000 端口，并提供 `/sse` 节点。

### 5.2 客户端配置 (Client Side)
在客户端（如另一台电脑上的 Claude Desktop）中，配置文件应指向服务器 URL：

```json
{
  "mcpServers": {
    "iqs-remote-server": {
      "url": "http://your-server-ip:3000/sse"
    }
  }
}
```

> [!IMPORTANT]
> - **灵活性**: SSE 模式下，客户端无需在本地安装脚本或依赖环境。
> - **安全性**: 如果在公网部署，请务必设置防火墙或反向代理（如 Nginx）来保护 `/sse` 和 `/messages` 接口。

---

## 6. Docker 容器化部署 (Docker Deployment)

为了简化生产环境的部署，推荐将 Web 应用与 MCP Server 打包在同一个 Docker 容器中。

### 6.1 镜像构建 (镜像是统一的)
```bash
docker build -t smart-qc-studio .
```

### 6.2 生产级部署与逻辑
项目支持通过 **Docker Compose** 实现一键混合编排部署。

1. **一键启动**:
   ```bash
   # 确保项目根目录有 .env 文件
   docker compose up -d --build
   ```

2. **动态配置**:
   如果您需要更换 API Key，只需修改 `.env` 并运行 `docker compose up -d`。系统将通过 **运行时注入 (Runtime Injection)** 技术自动重写配置并即时生效。

3. **端口说明**:
   - **5173 端口**: 网页分析界面访问地址。
   - **3000 端口**: MCP SSE 专家服务接入点。

4. **内部逻辑**:
   - **混合编排**: 容器内部同时运行前端预览与 MCP SSE 服务，环境完全一致。
   - **闭环通信**: MCP Server 直接通过容器内网地址 `http://localhost:5173` 访问前端，性能极佳。

---

## 🙋 技术解答：推理与输出逻辑

**问题：** 逻辑推理是本项目 AI 引擎完成，还是客户端 AI 完成？

**解答：**
根据目前的架构（基于 MCP 协议），**推理工作由客户端 AI（即您正在对话的 Claude/GPT 等）完成**，而**本项目提供的是执行绘图的“渲染引擎”**。

具体流程如下：
1. **意图识别**: 您向客户端 AI 提出要求（例如：“帮我画个质量异常的鱼骨图”）。
2. **DSL 生成 (推理阶段)**: 客户端 AI 基于 `IQS_DSL_AGENT_MANIFESTO.md` 定义的规则，**自行推理**并生成符合语法的 DSL 字符串。
3. **工具调用**: 客户端 AI 通过 MCP 协议调用本项目提供的 `render_fishbone` 工具。
4. **渲染输出 (本项目工作)**: 项目中的 MCP Server 启动 Puppeteer，将 DSL 传入无头浏览器，利用项目内置的 React 组件渲染出图并返回给客户端。

**结论：** 
- **客户端 AI** = “大脑”（负责思考、决定画什么、写代码）。
- **本项目 MCP Server** = “手”（负责精准执行、渲染视觉成果）。
