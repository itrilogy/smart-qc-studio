import { spawn } from 'child_process';
import readline from 'readline';
import fs from 'fs';

async function test() {
  const server = spawn('node', ['index.js'], {
    cwd: './',
    stdio: ['pipe', 'pipe', 'inherit']
  });

  const rl = readline.createInterface({
    input: server.stdout,
    terminal: false
  });

  const responses = new Map();

  rl.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      if (response.id) {
        responses.set(response.id, response);
      }
      
      // Check for list_tools result
      if (response.id && response.result && response.result.tools) {
        console.log(`\n--- MCP Tools Discovered: ${response.result.tools.length} ---`);
        const fb = response.result.tools.find(t => t.name === 'render_fishbone');
        if (fb) {
           console.log("\n[render_fishbone Description Extract]");
           console.log(fb.inputSchema.properties.dsl.description.substring(0, 1000));
           console.log("...");
        }
      }
    } catch (e) {}
  });

  function sendRequest(method, params = {}) {
    const id = Math.floor(Math.random() * 10000);
    const request = { jsonrpc: "2.0", id, method, params };
    server.stdin.write(JSON.stringify(request) + '\n');
    return id;
  }

  await new Promise(r => setTimeout(r, 1000));

  console.log("Listing tools...");
  sendRequest("tools/list");

  await new Promise(r => setTimeout(r, 1000));

  console.log("\nTesting render_fishbone...");
  const fishboneDsl = "Title: 生产线停产原因分析\n- 人员: 技能不足, 疲劳, 培训缺少\n- 机器: 压力不足, 漏油, 导向精度差\n- 方法: 标准不统一, 检测频率低\n- 物料: 杂质超标, 尺寸偏差";
  const id1 = sendRequest("tools/call", { name: "render_fishbone", arguments: { dsl: fishboneDsl } });

  // Wait for result
  let result1;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (responses.has(id1)) {
      result1 = responses.get(id1);
      break;
    }
  }

  if (result1 && result1.result && result1.result.content) {
    const image = result1.result.content.find(c => c.type === 'image');
    if (image) {
      const buffer = Buffer.from(image.data, 'base64');
      fs.writeFileSync('test_fishbone.png', buffer);
      console.log("Fishbone render success! Saved to test_fishbone.png");
    }
  }

  server.kill();
}

test();
