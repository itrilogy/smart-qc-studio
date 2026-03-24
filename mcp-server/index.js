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
  // --- 核心 IQS 组件 (14个) ---
  core: {
    fishbone: { name: "鱼骨图 (Fishbone)", section: "### 4.1 鱼骨图" },
    pareto: { name: "排列图 (Pareto)", section: "### 5.1 排列图" },
    control: { name: "控制图 (SPC)", section: "### 5.4 控制图" },
    affinity: { name: "亲和图 (Affinity)", section: "### 4.2 亲和图" },
    histogram: { name: "直方图 (Histogram)", section: "### 5.2 直方图" },
    scatter: { name: "散点图 (Scatter)", section: "### 5.3 散点图" },
    relation: { name: "关联图 (Relation)", section: "### 4.3 关联图" },
    matrix: { name: "矩阵图 (Matrix)", section: "### 6.1 矩阵图" },
    matrix_plot: { name: "矩阵数据分析图 (Matrix Plot)", section: "### 6.2 矩阵数据分析图" },
    pdpc: { name: "PDPC (过程决策程序图)", section: "### 4.4 PDPC" },
    arrow: { name: "矢线图 (Arrow Diagram)", section: "### 6.3 矢线图" },
    basic: { name: "基础统计图表 (Bar/Line/Pie)", section: "## 5. 统计分析工具" },
    radar: { name: "雷达图 (Radar Chart)", section: "### 2.4 雷达图" },
    vchart: { name: "VChart 全能图表 Spec", section: "### 2.5 VChart" }
  },
  // --- Mermaid 子类型 (穷举 18 种) ---
  mermaid: {
    flowchart: { name: "Mermaid 流程图", prefix: "graph TD\n" },
    sequence: { name: "Mermaid 时序图", prefix: "sequenceDiagram\n" },
    gantt: { name: "Mermaid 甘特图", prefix: "gantt\n" },
    class: { name: "Mermaid 类图", prefix: "classDiagram\n" },
    state: { name: "Mermaid 状态图", prefix: "stateDiagram-v2\n" },
    er: { name: "Mermaid ER图", prefix: "erDiagram\n" },
    journey: { name: "Mermaid 用户旅程图", prefix: "journey\n" },
    pie: { name: "Mermaid 饼图", prefix: "pie\n" },
    mindmap: { name: "Mermaid 思维导图", prefix: "mindmap\n" },
    timeline: { name: "Mermaid 时间线", prefix: "timeline\n" },
    kanban: { name: "Mermaid 看板", prefix: "kanban\n" },
    git: { name: "Mermaid Git图", prefix: "gitGraph\n" },
    requirement: { name: "Mermaid 需求图", prefix: "requirementDiagram\n" },
    quadrant: { name: "Mermaid 象限图", prefix: "quadrantChart\n" },
    xychart: { name: "Mermaid XY坐标轴图", prefix: "xychart-beta\n" },
    block: { name: "Mermaid 块图", prefix: "block-beta\n" },
    architecture: { name: "Mermaid 架构图", prefix: "architecture\n" },
    packet: { name: "Mermaid 网络包结构图", prefix: "packet\n" }
  },
  // --- VChart 子类型 (穷举 18 种) ---
  vchart: {
    bar: { name: "VChart 柱状图", dsl_hint: "Title: ...\nSpec: { \"type\": \"bar\", ... }" },
    line: { name: "VChart 折线图", dsl_hint: "Title: ...\nSpec: { \"type\": \"line\", ... }" },
    pie: { name: "VChart 饼图", dsl_hint: "Title: ...\nSpec: { \"type\": \"pie\", ... }" },
    scatter: { name: "VChart 散点图", dsl_hint: "Title: ...\nSpec: { \"type\": \"scatter\", ... }" },
    radar: { name: "VChart 雷达图", dsl_hint: "Title: ...\nSpec: { \"type\": \"radar\", ... }" },
    sankey: { name: "VChart 桑基图", dsl_hint: "Title: ...\nSpec: { \"type\": \"sankey\", ... }" },
    funnel: { name: "VChart 漏斗图", dsl_hint: "Title: ...\nSpec: { \"type\": \"funnel\", ... }" },
    treemap: { name: "VChart 矩形树图", dsl_hint: "Title: ...\nSpec: { \"type\": \"treemap\", ... }" },
    gauge: { name: "VChart 仪表盘", dsl_hint: "Title: ...\nSpec: { \"type\": \"gauge\", ... }" },
    wordcloud: { name: "VChart 词云图", dsl_hint: "Title: ...\nSpec: { \"type\": \"wordCloud\", ... }" },
    sunburst: { name: "VChart 旭日图", dsl_hint: "Title: ...\nSpec: { \"type\": \"sunburst\", ... }" },
    combination: { name: "VChart 自由组合图", dsl_hint: "Title: ...\nSpec: { \"type\": \"common\", ... }" },
    waterfall: { name: "VChart 瀑布图", dsl_hint: "Title: ...\nSpec: { \"type\": \"waterfall\", ... }" },
    boxplot: { name: "VChart 箱线图", dsl_hint: "Title: ...\nSpec: { \"type\": \"boxplot\", ... }" },
    heatmap: { name: "VChart 热力图", dsl_hint: "Title: ...\nSpec: { \"type\": \"heatmap\", ... }" },
    liquid: { name: "VChart 水球图", dsl_hint: "Title: ...\nSpec: { \"type\": \"liquid\", ... }" },
    rangecolumn: { name: "VChart 区间柱状图", dsl_hint: "Title: ...\nSpec: { \"type\": \"rangeColumn\", ... }" },
    circlepacking: { name: "VChart 圆形打包图", dsl_hint: "Title: ...\nSpec: { \"type\": \"circlePacking\", ... }" }
  }
};

const RENDERS_DIR = path.join(__dirname, "renders");
if (!fs.existsSync(RENDERS_DIR)) {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
}

// --- Browser Utils ---

import { networkInterfaces } from 'os';

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const SERVER_IP = getLocalIP();
let PUBLIC_URL = ""; // 将在 main 中根据 port 设置

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

async function renderChart(type, dsl, width = 1200, height = 800, saveToFile = false) {
  const executablePath = await getExecutablePath();
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  // 设置 3X 高清渲染倍率
  await page.setViewport({ width, height, deviceScaleFactor: 3 });

  const encodedDsl = encodeURIComponent(dsl);
  const url = `${BASE_URL}/?mode=headless&type=${type}&dsl=${encodedDsl}`;

  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    // 等待图表容器加载
    await page.waitForSelector('canvas, svg, .mermaid, #pareto-chart-container', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    
    const screenshotOptions = {
        type: 'png',
        fullPage: false,
        omitBackground: true // 导出透明背景
    };

    if (saveToFile) {
      // --- SSE 极简模式：仅保存文件并返回链接 ---
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
      const hash = Math.random().toString(36).substring(7);
      const filename = `render_${timestamp}_${hash}.png`;
      const filePath = path.join(RENDERS_DIR, filename);
      
      await page.screenshot({ ...screenshotOptions, path: filePath });
      const fileUrl = `${PUBLIC_URL}/renders/${filename}`;
      
      await browser.close();
      return { url: fileUrl };
    } else {
      // --- Stdio 模式：返回 Base64 ---
      const screenshotBase64 = await page.screenshot({ ...screenshotOptions, encoding: "base64" });
      await browser.close();
      return { base64: screenshotBase64 };
    }
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

  // 1. Core Tools
  Object.entries(CHART_CONFIG.core).forEach(([type, config]) => {
    const syntaxSection = extractSection(MANUAL, config.section);
    tools.push({
      name: `render_${type}`,
      description: `渲染 ${config.name}。依据 IQS 标准 DSL 语法。\n\n【核心语法】\n${syntaxSection}`,
      inputSchema: {
        type: "object",
        properties: {
          dsl: { type: "string" },
          width: { type: "number", default: 1200 },
          height: { type: "number", default: 800 }
        },
        required: ["dsl"]
      }
    });
  });

  // 2. Mermaid Specialized Tools
  Object.entries(CHART_CONFIG.mermaid).forEach(([subType, config]) => {
    tools.push({
      name: `render_mermaid_${subType}`,
      description: `渲染 ${config.name}。必须以 '${config.prefix.trim()}' 开头。`,
      inputSchema: {
        type: "object",
        properties: {
          dsl: { type: "string", description: `请输入完整的 Mermaid 代码，例如:\n${config.prefix}  ...` },
          width: { type: "number", default: 1200 },
          height: { type: "number", default: 800 }
        },
        required: ["dsl"]
      }
    });
  });

  // 3. VChart Specialized Tools
  Object.entries(CHART_CONFIG.vchart).forEach(([subType, config]) => {
    tools.push({
      name: `render_vchart_${subType}`,
      description: `渲染 ${config.name}。依据 IQS VChart 引擎规范。\n\n【DSL 示例】\n${config.dsl_hint}`,
      inputSchema: {
        type: "object",
        properties: {
          dsl: { type: "string" },
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
  const isSse = !!PUBLIC_URL; // SSE 模式下 PUBLIC_URL 会在 main 中被赋值

  let type = "";
  let dsl = args.dsl;

  if (name.startsWith("render_mermaid_")) {
    type = "mermaid";
  } else if (name.startsWith("render_vchart_")) {
    type = "vchart";
  } else if (name.startsWith("render_")) {
    type = name.replace("render_", "");
  }

  try {
    const result = await renderChart(type, dsl, args.width, args.height, isSse);
    
    if (isSse && result.url) {
      // SSE 极简模式：仅返回远程链接
      return {
        content: [
          {
            type: "text",
            text: `渲染成功 (3X 高清采样)！\n\n![Render Result](${result.url})\n\n(提示：如果预览未直接显示，请点击链接访问: [查看图表](${result.url}))`
          }
        ]
      };
    } else {
      // Stdio 模式：返回标准 Base64 图片
      return {
        content: [
          {
            type: "image",
            data: result.base64,
            mimeType: "image/png"
          }
        ]
      };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `渲染错误: ${error.message}` }],
      isError: true
    };
  }
});

async function main() {
  const transportType = process.argv.find(arg => arg.startsWith("--transport="))?.split("=")[1] || "stdio";

  if (transportType === "sse") {
    const app = express();
    app.use(cors());
    
    // 托管静态渲染结果
    app.use('/renders', express.static(RENDERS_DIR));

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
    
    // 设置公网/局域网访问地址
    PUBLIC_URL = process.env.IQS_SERVER_PUBLIC_URL || `http://${SERVER_IP}:${port}`;

    app.listen(port, () => {
      console.error(`IQS Expert Chart MCP Server (SSE) running on port ${port}`);
      console.error(`- Public URL: ${PUBLIC_URL}`);
      console.error(`- SSE endpoint: ${PUBLIC_URL}/sse`);
      console.error(`- Message endpoint: ${PUBLIC_URL}/messages`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("IQS Expert Chart MCP Server (Stdio) running with full knowledge injection");
  }
}

main().catch(console.error);
