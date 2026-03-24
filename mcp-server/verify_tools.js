import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "index.js");

async function test() {
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  const tools = await client.listTools();
  console.log(`Total tools found: ${tools.tools.length}`);
  tools.tools.slice(0, 5).forEach(t => console.log(`- ${t.name}`));
  
  // Check for some specific new tools
  const hasMermaid = tools.tools.some(t => t.name.startsWith("render_mermaid_"));
  const hasVChart = tools.tools.some(t => t.name.startsWith("render_vchart_"));
  console.log(`Has Mermaid tools: ${hasMermaid}`);
  console.log(`Has VChart tools: ${hasVChart}`);

  await transport.close();
}

test().catch(console.error);
