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
const CHART_SPEC_PATH = path.join(__dirname, "../public/chart_spec.json");

function getChartSpec() {
  try {
    return JSON.parse(fs.readFileSync(CHART_SPEC_PATH, "utf-8"));
  } catch (e) {
    console.error(`Error reading chart_spec.json:`, e);
    return null;
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
          name: "IQS Component Knowledge segments (分布式图表切片库)",
          mimeType: "text/markdown",
          description: "包含 14 个核心组件的独立专家逻辑与语法规范。"
        }
      ]
    };
  });

  newServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    if (uri === "protocol://governance") {
      return { contents: [{ uri, text: getProtocolFile("governance.md") }] };
    }
    if (uri === "protocol://segments") {
      const files = fs.readdirSync(SEGMENTS_DIR);
      let allContent = "# IQS Protocol Segments Knowledge Base\n\n";
      files.forEach(file => {
        if (file.endsWith(".md")) {
          allContent += `\n---\n\n${fs.readFileSync(path.join(SEGMENTS_DIR, file), "utf-8")}\n`;
        }
      });
      return { contents: [{ uri, text: allContent }] };
    }
    throw new Error(`Resource not found: ${uri}`);
  });

  newServer.setRequestHandler(ListToolsRequestSchema, async () => {
    const spec = getChartSpec();
    const governance = getProtocolFile("governance.md");
    const tools = [];
    if (!spec) return { tools };

    Object.entries(spec.chart_grammars).forEach(([key, config]) => {
      const segment = getProtocolFile(`segments/${key}.md`);
      const rules = config.dsl_specification?.rules?.join('\n') || '';
      const examples = config.dsl_specification?.few_shot_examples?.map(ex =>
        `### 场景: ${ex.scenario}\n输入意图: ${ex.input}\n标准输出:\n${ex.output}`
      ).join('\n\n') || '';
      const triggers = config.intent_trigger?.join(', ') || '';

      const fullDescription = [
        `渲染 ${key}。依据 IQS 分布式协议规范。`,
        `\n【触发关键词】\n${triggers}`,
        `\n【治理规则】\n${governance}`,
        `\n【专家逻辑与说明】\n${segment || '暂无深度说明'}`,
        `\n【语法规则】\n${rules}`,
        `\n【实战示例】\n${examples}`,
        `\n🔴 注意：必须返回纯文本 DSL，严禁在 dsl 字段传 JSON。`
      ].join('\n\n');

      tools.push({
        name: `render_${key}`,
        description: fullDescription,
        inputSchema: {
          type: "object",
          properties: {
            dsl: { type: "string", description: "输入标准 IQS DSL 指令文本" },
            width: { type: "number", default: 1200 },
            height: { type: "number", default: 800 }
          },
          required: ["dsl"]
        }
      });

      if (key === 'mermaid') {
        const MERMAID_SUBTYPES = {
          "flowchart": "流程图。专注于制程逻辑、决策分支与循环。使用 A[文字] 表示节点，--> 表示指向。",
          "sequence": "序列图。专注于对象间的交互时序与消息传递。使用 'participant' 定义角色。",
          "gantt": "甘特图。项目进度与依赖管理。支持 section 分组、after 依赖与关键日期展示。",
          "class": "类图。描述系统架构、对象属性与方法。支持访问控制符（+ 为公有，- 为私有）。",
          "state": "状态图。记录对象状态跃迁。使用 [*] 表示起止，--> 表示跃迁动作。",
          "er": "关系图 (ERD)。用于数据库建模。描述实体间映射关系，支持 { } 包裹列名。",
          "pie": "饼图。表现定性数据占比。语法简单，直接声明名称与数值。",
          "journey": "用户旅程图。描述用户完成任务的环节。支持评分 (Score) 与角色 (Actors) 标注。",
          "mindmap": "思维导图。用于知识发散。采用缩进语法自动生成放射状层级布局。",
          "timeline": "时间轴。顺序记录里程碑。支持分段（section）展示年度或阶段事件。",
          "git": "Git 演进图。可视化分支合并。支持 commit, branch, checkout, merge 指令。",
          "quadrant": "四象限图。用于分析评估。支持配置 axes, x-axis, y-axis 标签及象限描述。",
          "xychart": "通用 XY 图。支持在同一坐标系混排柱状图、折线图等连续数据。",
          "sankey": "桑基图。表现能量/价值流动。使用 'source, target, value' 模式录入流动数据。",
          "block": "块图（Block）。描述组件堆叠与层次结构。适用于硬件或系统模块定义。",
          "architecture": "架构图。展示云服务资源与网络拓扑。支持内建组件图标映射。",
          "kanban": "看板图。表现任务流转状态。支持多列（Columns）定义任务项。",
          "packet": "报文图（Packet）。展示网络协议报文结构。支持 Bit 段定义与位移标记。",
          "requirement": "需求图。描述系统需求及其派生关系。支持 requirement, element 等类定义。"
        };

        Object.entries(MERMAID_SUBTYPES).forEach(([subType, descriptor]) => {
          tools.push({
            name: `render_mermaid_${subType}`,
            description: `【子类型专属指令】\n${descriptor}\n\n【全局协议继承】\n${fullDescription}`,
            inputSchema: {
              type: "object",
              properties: {
                dsl: { type: "string", description: `输入标准 Mermaid ${subType} 语法文本` },
                width: { type: "number", default: 1200 },
                height: { type: "number", default: 800 }
              },
              required: ["dsl"]
            }
          });
        });
      }

      if (key === 'vchart') {
        const VCHART_SUBTYPES = {
          "bar": "柱状图。分类数据对比。支持 stack (堆叠)、group (分组) 及方向切换。",
          "line": "折线图。趋势分析。支持 smooth (平滑)、step (阶梯) 及多指标混排。",
          "area": "面积图。累计趋势分析。强调数值随时间的填充空间感。",
          "pie": "饼图/玫瑰图。占比分析。支持 innerRadius (空心环形) 模式。",
          "scatter": "散点/气泡图。多维关联。支持 sizeField 映射气泡大小，支持趋势线。",
          "radar": "雷达图。多维性能评估。适用于供应商打分、设备综合效率分析。",
          "sankey": "桑基图。流动可视化。强调用 'source', 'target', 'value' 描述资源去向。",
          "funnel": "漏斗图。转化/留存分析。常用于制程直通率 (FPY) 梯级盘点。",
          "treemap": "矩形树图。层级占比。通过面积展示权重，适用于 BOM 成本分解。",
          "waterfall": "瀑布图。展示财务或损耗增减项。支持 auto 汇总计算。",
          "heatmap": "热力图。数值强度分布。常用于模芯温度、故障点击频次热区分析。",
          "boxplot": "箱线图。统计分布。清晰展示最大/最小、中位数及四分位异常点。",
          "wordcloud": "词云图。关键词聚合特性。词语大小代表重要度或频次。",
          "gauge": "仪表盘。关键指标 (KPI) 完成进度实时监控展示。",
          "liquid": "水波图。表现百分比水位或容积充满量，具动态视觉效果。",
          "sunburst": "旭日图。多层级比例分析。比树图更利于展示层级间的穿透关系。",
          "common": "多维组合图。高度灵活。支持在同一 spec 内混合定义多类 series 项。",
          "map": "地图分析。区域数据分布展示。支持地理信息与数值关联。",
          "venn": "韦恩图。表现集合间的交集、并集与逻辑重合关系。"
        };

        Object.entries(VCHART_SUBTYPES).forEach(([subType, descriptor]) => {
          tools.push({
            name: `render_vchart_${subType}`,
            description: `【子类型专属指令】\n${descriptor}\n\n【全局协议继承】\n${fullDescription}`,
            inputSchema: {
              type: "object",
              properties: {
                dsl: { type: "string", description: `基于 VChart JSON Spec 的 ${subType} 定义文本` },
                width: { type: "number", default: 1200 },
                height: { type: "number", default: 800 }
              },
              required: ["dsl"]
            }
          });
        });
      }
    });

    return { tools };
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

    if (typeof dsl === 'string' && dsl.trim().startsWith('{') && type !== 'vchart') {
      const spec = getChartSpec();
      const example = spec?.chart_grammars?.[type]?.dsl_specification?.few_shot_examples?.[0]?.output || "Title: 标题\n- 项目: 数值";
      return {
        content: [{
          type: "text",
          text: `【范式错误】检测到您传导了 JSON。IQS 核心组件要求纯文本 DSL。请遵循以下范式重试：\n\n${example}`
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
              text: `渲染成功 (3X 高清采样)！\n\n![Render Result](${result.url})\n\n(提示：如果预览未直接显示，请点击链接访问: [查看图表](${result.url}))`
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
