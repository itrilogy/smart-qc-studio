import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.IQS_BASE_URL || "http://localhost:5173";
const DOCS_DIR = path.join(__dirname, "../docs");

const server = new Server(
  {
    name: "iqs-expert-chart-server",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// --- Knowledge Loading Utils ---

function getDocContent(filename) {
  try {
    return fs.readFileSync(path.join(DOCS_DIR, filename), "utf-8");
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
    return "";
  }
}

function extractSection(content, heading) {
  const lines = content.split("\n");
  let result = [];
  let found = false;
  for (const line of lines) {
    if (line.includes(heading)) {
      found = true;
      continue;
    }
    if (found && line.startsWith("##") && !line.includes(heading)) {
      break;
    }
    if (found) result.push(line);
  }
  return result.join("\n").trim();
}

const MANIFESTO = getDocContent("IQS_DSL_AGENT_MANIFESTO.md");
const MANUAL = getDocContent("DSL_SYNTAX_MANUAL.md");

const CHART_CONFIG = {
  fishbone: { name: "鱼骨图 (Fishbone Diagram)", section: "### 4.1 鱼骨图" },
  pareto: { name: "排列图 (Pareto Chart)", section: "### 5.1 排列图" },
  control: { name: "控制图 (Control Chart / SPC)", section: "### 5.4 控制图" },
  affinity: { name: "亲和图 (Affinity Diagram)", section: "### 4.2 亲和图" },
  histogram: { name: "直方图 (Histogram)", section: "### 5.2 直方图" },
  scatter: { name: "散点图 (Scatter Plot)", section: "### 5.3 散点图" },
  relation: { name: "关联图 (Relation Diagram)", section: "### 4.3 关联图" },
  matrix: { name: "矩阵图 (Matrix Diagram)", section: "### 6.1 矩阵图" },
  matrix_plot: { name: "矩阵数据分析图 (Matrix Plot)", section: "### 6.2 矩阵数据分析图" },
  pdpc: { name: "PDPC (过程决策程序图)", section: "### 4.4 PDPC" },
  arrow: { name: "矢线图 (Arrow Diagram)", section: "### 6.3 矢线图" },
  basic: { name: "基础图表 (Basic Charts)", section: "## 5. 统计分析工具" },
  radar: { name: "雷达图 (Radar Chart)", section: "### 2.4 雷达图" },
  mermaid: { name: "Mermaid 流程图", section: "## 4. 常见 Mermaid 语法参考" }
};

const CHART_TYPES = Object.keys(CHART_CONFIG);

// --- Browser Utils ---

async function getExecutablePath() {
  const commonPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];
  for (const path of commonPaths) {
    if (fs.existsSync(path)) return path;
  }
  return undefined;
}

async function renderChart(type, dsl, width = 1200, height = 800) {
  const executablePath = await getExecutablePath();
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height });

  const encodedDsl = encodeURIComponent(dsl);
  const url = `${BASE_URL}/?mode=headless&type=${type}&dsl=${encodedDsl}`;

  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));
    const screenshot = await page.screenshot({ encoding: "base64" });
    await browser.close();
    return screenshot;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// --- MCP Handlers ---

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "docs://manifesto",
        name: "IQS DSL Agent Manifesto (专家级绘图准则)",
        mimeType: "text/markdown",
        description: "包含 IQS 系统中 AI 代理的行为准则、分析逻辑、专家提示及严禁事项。"
      },
      {
        uri: "docs://manual",
        name: "IQS DSL Syntax Manual (全量语法手册)",
        mimeType: "text/markdown",
        description: "包含所有 14 种图表组件的具体 DSL 语法指令、色彩规范及实战范例。"
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  if (uri === "docs://manifesto") return { contents: [{ uri, text: MANIFESTO }] };
  if (uri === "docs://manual") return { contents: [{ uri, text: MANUAL }] };
  throw new Error(`Resource not found: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [];

  CHART_TYPES.forEach(type => {
    const config = CHART_CONFIG[type];
    const syntaxSection = extractSection(MANUAL, config.section);
    const manifestoSection = extractSection(MANIFESTO, type.charAt(0).toUpperCase() + type.slice(1));
    
    const fullDescription = `
【全量专家描述 - ${config.name}】
${manifestoSection || "遵循 IQS 标准专业分析逻辑。"}

【核心语法细节】
${syntaxSection || "参考全量语法手册。"}

【重要提示】
1. 必须包含 Title 指令。
2. 遵循 QC 专家建议：图表应服务于业务洞察。
3. 如果数据复杂，请使用 [series] 块。
    `.trim();

    tools.push({
      name: `render_${type}`,
      description: `渲染 ${config.name}。此工具已注入全量 DSL 语法和 QC 专家建议。`,
      inputSchema: {
        type: "object",
        properties: {
          dsl: { 
            type: "string", 
            description: fullDescription 
          },
          width: { type: "number", default: 1200 },
          height: { type: "number", default: 800 }
        },
        required: ["dsl"]
      }
    });
  });

  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const type = name.replace("render_", "");

  if (CHART_TYPES.includes(type)) {
    try {
      const data = await renderChart(type, args.dsl, args.width, args.height);
      return {
        content: [{ type: "image", data, mimeType: "image/png" }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `渲染错误: ${error.message}` }],
        isError: true
      };
    }
  }
  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transportType = process.argv.find(arg => arg.startsWith("--transport="))?.split("=")[1] || "stdio";

  if (transportType === "sse") {
    const app = express();
    app.use(cors());

    let transport;

    app.get("/sse", async (req, res) => {
      console.error("New SSE connection established");
      transport = new SSEServerTransport("/messages", res);
      await server.connect(transport);
    });

    app.post("/messages", async (req, res) => {
      if (!transport) {
        return res.status(400).send("No active SSE connection");
      }
      await transport.handlePostMessage(req, res);
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.error(`IQS Expert Chart MCP Server (SSE) running on port ${port}`);
      console.error(`- SSE endpoint: http://localhost:${port}/sse`);
      console.error(`- Message endpoint: http://localhost:${port}/messages`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("IQS Expert Chart MCP Server (Stdio) running with full knowledge injection");
  }
}

main().catch(console.error);
