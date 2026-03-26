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
import { networkInterfaces } from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.IQS_BASE_URL || "http://localhost:5173";
const PROTOCOL_DIR = path.join(__dirname, "../protocol");
const SEGMENTS_DIR = path.join(PROTOCOL_DIR, "segments");

function getProtocolFile(relPath) {
  try {
    const fullPath = path.join(PROTOCOL_DIR, relPath);
    if (!fs.existsSync(fullPath)) return "";
    return fs.readFileSync(fullPath, "utf-8");
  } catch (e) {
    console.error(`Error reading protocol file ${relPath}:`, e);
    return "";
  }
}

const RENDERS_DIR = path.join(__dirname, "renders");
if (!fs.existsSync(RENDERS_DIR)) {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
}

// --- Browser Utils ---

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
let PUBLIC_URL = "";

// --- Path Configuration ---
const CHART_SPEC_PATH = path.join(__dirname, "../public/config.json");

const tools = JSON.parse(fs.readFileSync(path.join(__dirname, "./mcp_tools.json"), "utf8"));

function checkChartSpec() {
  try {
    if (!fs.existsSync(CHART_SPEC_PATH)) {
      console.warn(`Warning: config.json not found at ${CHART_SPEC_PATH}`);
      return;
    }
    const spec = JSON.parse(fs.readFileSync(CHART_SPEC_PATH, "utf8"));
    console.log(`[MCP Server] Linked to IQS Project: ${spec.project} v${spec.version}`);
  } catch (e) {
    console.error(`Error reading config.json:`, e);
  }
}

async function getExecutablePath() {
  const commonPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
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

  const launchOptions = {
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  await page.setViewport({ width, height, deviceScaleFactor: 3 });
  const encodedDsl = encodeURIComponent(dsl);
  const url = `${BASE_URL}/?mode=headless&type=${type}&dsl=${encodedDsl}&theme=light`;

  try {
    await page.evaluateOnNewDocument((w, h) => {
      const style = document.createElement('style');
      style.textContent = `
        #root, body, html { height: ${h}px !important; width: ${w}px !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; background: white !important; }
        #root > div { height: 100% !important; width: 100% !important; overflow: hidden !important; }
        #pareto-chart-container, #vchart-container, .mermaid, .echarts-for-react { height: 100% !important; width: 100% !important; position: absolute !important; top: 0 !important; left: 0 !important; }
        .p-8, .p-4 { padding: 0 !important; }
      `;
      document.head.appendChild(style);
    }, width, height);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    
    // 1. Wait for our custom readiness signal
    console.error(`[MCP] Waiting for IQS_READY...`);
    await page.waitForFunction(() => window.IQS_READY === true, { timeout: 20000 });
    
    // 2. Trigger a final resize just in case
    await page.evaluate(() => { window.dispatchEvent(new Event('resize')); });
    await new Promise(r => setTimeout(r, 500));

    // 3. Call the bridge capture function
    console.error(`[MCP] Invoking captureIQSChart with resolution: ${width}x${height}`);
    const dataURL = await page.evaluate(async (w, h) => {
      if (typeof window.captureIQSChart === 'function') {
        return await window.captureIQSChart({ 
          pixelRatio: 3, 
          backgroundColor: '#ffffff',
          width: w,
          height: h
        });
      }
      return '';
    }, width, height);

    if (!dataURL) {
      throw new Error("Failed to capture chart via captureIQSChart bridge");
    }

    const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");

    if (saveToFile) {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
      const hash = Math.random().toString(36).substring(7);
      const filename = `render_${timestamp}_${hash}.png`;
      const filePath = path.join(RENDERS_DIR, filename);
      
      fs.writeFileSync(filePath, base64Data, 'base64');
      
      const fileUrl = `${PUBLIC_URL}/renders/${filename}`;
      await browser.close();
      return { url: fileUrl };
    } else {
      await browser.close();
      return { base64: base64Data };
    }
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// --- MCP Server Factory ---

function createServer() {
  const newServer = new Server(
    {
      name: "iqs-expert-chart-server",
      version: "2.7.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  newServer.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "protocol://governance",
          name: "IQS Protocol Governance (全局治理规则)",
          mimeType: "text/markdown",
          description: "详述了 IQS 系统中的权威性等级协议 (Hierarchy of Authority) 及冲突处理准则。"
        },
        {
          uri: "protocol://segments",
          name: "IQS Component Knowledge Index (图表切片库索引)",
          mimeType: "text/markdown",
          description: "包含所有核心组件的独立专家逻辑与语法说明。"
        }
      ]
    };
  });

  newServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const governance = getProtocolFile("governance.md");

    if (uri === "protocol://governance") {
      return { contents: [{ uri, text: governance }] };
    }

    if (uri === "protocol://segments") {
      const files = fs.readdirSync(SEGMENTS_DIR);
      let allContent = "# IQS Protocol Segments Index\n\n";
      files.forEach(file => {
        if (file.endsWith(".md")) {
          allContent += `- [${file.replace('.md', '')}](protocol://segments/${file.replace('.md', '')})\n`;
        }
      });
      return { contents: [{ uri, text: allContent }] };
    }

    if (uri.startsWith("protocol://segments/")) {
      const key = uri.replace("protocol://segments/", "");
      const segment = getProtocolFile(`segments/${key}.md`);
      if (!segment) throw new Error(`Segment [${key}] not found`);
      
      const combined = [
        `# IQS Segment Knowledge: ${key}`,
        `\n> [!IMPORTANT]\n> 此文档由全局治理协议与专项切片逻辑动态组装而成。`,
        `\n## 1. 全局治理规则 (Governance)\n${governance}`,
        `\n## 2. 专项说明与语法 (Segment Logic)\n${segment}`
      ].join('\n\n');
      
      return { contents: [{ uri, text: combined }] };
    }

    throw new Error(`Resource not found: ${uri}`);
  });

const MCP_TOOLS_PATH = path.join(__dirname, "mcp_tools.json");

function getMCPTools() {
  try {
    return JSON.parse(fs.readFileSync(MCP_TOOLS_PATH, "utf-8"));
  } catch (e) {
    console.error(`Error reading mcp_tools.json:`, e);
    return [];
  }
}

// Helper: 构建瘦身版工具描述 (ILDR 2.0: 资源引导型描述)
function buildThinDescription(tool) {
  const parts = [
    `### ${tool.display_name}`,
    `【适用领域】：${tool.expertise || '通用图表'}`,
    `【捕获意图】：${(tool.intent_trigger || []).join(', ')}`,
    `【功能描述】：${tool.description}`,
    `\n🔴 物理约束：生成前【必须】阅读资源 [protocol://segments/${tool.parent_type}/${tool.sub_type}]。`,
    `🔴 核心禁令：该工具【不接受】JSON 对象作为输入。必须传导纯文本 DSL。`
  ];
  return parts.join('\n');
}

  newServer.setRequestHandler(ListResourcesRequestSchema, async () => {
    const allTools = getMCPTools();
    const resources = [];

    // 为每个非 master 的工具发布一个对应的聚合资源 URL
    allTools.filter(t => t.sub_type !== 'master').forEach(tool => {
      resources.push({
        uri: `protocol://segments/${tool.parent_type}/${tool.sub_type}`,
        name: `${tool.display_name} 完整规范 (Master + Subtype)`,
        mimeType: "text/markdown",
        description: `包含 ${tool.display_name} 的专家逻辑、语法规则及标准 DSL 范式示例。`
      });
    });

    return { resources };
  });

  newServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const match = uri.match(/^protocol:\/\/segments\/([^/]+)\/([^/]+)$/);
    
    if (match) {
      const [, parent, sub] = match;
      const allTools = getMCPTools();
      const master = allTools.find(t => t.parent_type === parent && t.sub_type === 'master');
      const tool = allTools.find(t => t.parent_type === parent && t.sub_type === sub);

      if (!tool) {
        throw new Error(`Resource not found: ${uri}`);
      }

      // 动态拼接：Master 总告 + 子类专家逻辑 + 子类语法规则 + 范式示例
      const content = [
        `# ${tool.display_name} 权威协议规范 (Spliced Protocol)`,
        master ? `\n## 1. 全局治理准则 (Master Protocol)\n${master.expert_logic}\n${master.syntax_rules}` : '',
        `\n## 2. 专项专家逻辑 (Expert Logic)\n${tool.expert_logic}`,
        `\n## 3. 语法约束 (Syntax Rules)\n${tool.syntax_rules}`,
        `\n## 4. 标准 DSL 范式示例 (Official Example)\n\`\`\`dsl\n${tool.official_example}\n\`\`\``,
        `\n## 5. 输出控制与自检 (Output Controls & Check)\n1. **自问自答 (CoT)**: 在生成最终输出前，请先核对上述红线约束，确保 nodeKey 与层级结构完全符合示例。\n2. **格式红线**: 仅返回纯文本内容，严禁包裹 Markdown 代码块 (\`\`\`) 或输出任何解释性描述。`
      ].join('\n');

      return {
        contents: [{
          uri,
          mimeType: "text/markdown",
          text: content
        }]
      };
    }
    throw new Error(`Unknown resource: ${uri}`);
  });

  newServer.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = getMCPTools();
    const publishedTools = [];

    allTools.forEach(tool => {
      // 瘦身方案：不发布 master 工具作为功能项
      if (tool.sub_type === 'master') return;

      publishedTools.push({
        name: tool.name,
        description: buildThinDescription(tool),
        inputSchema: {
          type: "object",
          properties: {
            dsl: { 
              type: "string", 
              description: `针对 ${tool.display_name} 的标准 DSL 文本。🔴 核心禁令：该字段【非 JSON】。必须是纯文本（如 Title: xxx\\nSpec: { ... }）。严禁传任何 JSON 对象。` 
            },
            width: { type: "number", default: 1200 },
            height: { type: "number", default: 800 }
          },
          required: ["dsl"]
        }
      });
    });

    return { tools: publishedTools };
  });

  newServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const isSse = !!PUBLIC_URL;

    let type = "";
    let dsl = args.dsl;

    if (name.startsWith("render_mermaid_")) {
      type = "mermaid";
    } else if (name.startsWith("render_vchart_")) {
      type = "vchart";
    } else if (name.startsWith("render_")) {
      type = name.replace("render_", "");
    }

    // ILDR 2.0: 增强型 JSON 检测。
    const isJsonLike = (typeof dsl === 'object' && dsl !== null) || 
                       (typeof dsl === 'string' && dsl.trim().startsWith('{'));

    if (isJsonLike) {
      const allTools = getMCPTools();
      const tool = allTools.find(t => t.parent_type === type && (t.sub_type === args.sub_type || name.includes(t.sub_type)));
      const example = tool?.official_example || "Title: 标题\nSpec: { ... }";
      
      return {
        content: [{
          type: "text",
          text: [
            `🔴【格式错误】严禁在 dsl 字段传导 JSON！该字段必须为【纯文本字符串】。`,
            `请立即按照以下范式重写（注意没有外层括号）：`,
            `\n${example}\n`,
            `🔴 严禁输出任何 Markdown 代码块，严禁输出任何解释性描述。`
          ].join('\n')
        }],
        isError: true
      };
    }
    
    try {
      const result = await renderChart(type, dsl, args.width, args.height, isSse);
      if (isSse && result.url) {
        return {
          content: [
            {
              type: "text",
              text: `【系统强制指令：必须显示图片】图表已生成。请务必在最终回复中包含以下内容：\n\n![IQS Chart](${result.url})\n\n(查看链接: ${result.url})`
            }
          ]
        };
      } else {
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

  return newServer;
}

// --- Main ---

const sseTransports = new Map();

async function main() {
  const transportType = process.argv.find(arg => arg.startsWith("--transport="))?.split("=")[1] || "stdio";

  if (transportType === "sse") {
    const app = express();
    app.use(cors());
    app.use('/renders', express.static(RENDERS_DIR));

    app.get("/sse", async (req, res) => {
      console.error("New SSE connection established");
      const transport = new SSEServerTransport("/messages", res);
      const server = createServer();
      await server.connect(transport);

      const sessionId = transport.sessionId;
      if (sessionId) {
        sseTransports.set(sessionId, transport);
      }

      res.on("close", () => {
        console.error(`SSE connection ${sessionId || 'unknown'} closed`);
        if (sessionId) sseTransports.delete(sessionId);
        server.close().catch(console.error);
      });
    });

    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId;
      const transport = sseTransports.get(sessionId);
      if (!transport) {
        return res.status(404).send(`Session ${sessionId} not found`);
      }
      await transport.handlePostMessage(req, res);
    });

    const port = process.env.PORT || 3000;
    PUBLIC_URL = process.env.IQS_SERVER_PUBLIC_URL || `http://${SERVER_IP}:${port}`;

    app.listen(port, () => {
      console.error(`IQS Expert Chart MCP Server (SSE) running on port ${port}`);
      console.error(`- Public URL: ${PUBLIC_URL}`);
      console.error(`- SSE endpoint: ${PUBLIC_URL}/sse`);
    });
  } else {
    const transport = new StdioServerTransport();
    const server = createServer();
    await server.connect(transport);
    console.error("IQS Expert Chart MCP Server (Stdio) running with full knowledge injection");
  }
}

main().catch(console.error);
