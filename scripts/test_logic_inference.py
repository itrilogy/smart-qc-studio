import json
import os
import sys

# ILDR 2.0 Logic Tools Prompt Audit Script (Universal Version)
# Mirrors the latest logic in services/aiService.ts

MCP_TOOLS_PATH = "./mcp-server/mcp_tools.json"
REPORT_PATH = "./logic_prompts_report.md"

def load_tools():
    if not os.path.exists(MCP_TOOLS_PATH):
        raise FileNotFoundError(f"{MCP_TOOLS_PATH} not found.")
    with open(MCP_TOOLS_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def build_smart_prompt(parent_type, sub_type, all_tools):
    master = next((t for t in all_tools if t['parent_type'] == parent_type and t['sub_type'] == 'master'), None)
    specific = next((t for t in all_tools if t['parent_type'] == parent_type and t.get('sub_type') == sub_type), None)
    
    role = (specific.get('expertise') or master.get('expertise') or "Expert Analyst") if (specific or master) else "Expert Analyst"
    prompt = f"You are an expert {role}.\n\n"
    
    # 1. Master Protocol Soul (Global Redlines)
    if master:
        prompt += f"### 🟢 全局专家内核 (Master Protocol)\n{master['expert_logic']}\n\n"
    
    # 2. Logic Layer: Specific Tool
    if specific:
        prompt += f"### 🔵 专项专家逻辑 (Expert Logic - {sub_type})\n{specific['expert_logic']}\n\n"
        prompt += f"### 📗 语法约束与范式 (Syntax & Examples)\n{specific['syntax_rules']}\n\n"
        prompt += f"#### 💡 标准 DSL 范式示例:\n```dsl\n{specific['official_example']}\n```\n\n"
    
    # 3. Global Wrapper Rules
    if master:
        prompt += f"{master['syntax_rules']}\n\n"
    
    prompt += "### 🔴 输出红线 (Output Constraints):\n"
    prompt += "1. 严禁返回任何 JavaScript 函数（如 formatter），必须是 100% 静态内容。\n"
    prompt += "2. 仅返回纯文本内容，严禁包裹 Markdown 代码块 (```)。\n"
    prompt += "3. 严禁输出任何解释性描述。\n"
    prompt += "4. **自问自答 (CoT)**: 在生成最终输出前，请先核对上述红线约束，确保 nodeKey 与层级结构完全符合示例。\n"
    
    if parent_type == 'vchart':
        prompt += "5. **严禁外层 JSON**: 必须直接以 \"Title:\" 或 \"Spec:\" 开头输出纯文本。严禁将最终结果包裹在 {} 中。\n"
    elif parent_type == 'mermaid':
        prompt += "5. **直接输出语法**: 严禁输出 \"Spec:\"。必须直接输出 Mermaid 原生指令（如 flowchart TD, pie 等）。严禁包裹在 {} 中。\n"
    else:
        prompt += "5. **标准 DSL 分级**: 必须使用 \"Title:\"、\"# 分级\"、\"- 项目\" 的分级结构。严禁输出任何 JSON 对象。\n"
    
    return prompt

def generate_report():
    try:
        all_tools = load_tools()
        parent_types = ['iqs_native', 'vchart', 'mermaid']
        
        report = "# IQS Logic Tools System Prompts Audit Report (Universal)\n\n"
        report += f"Generated on: 2026-03-26\n"
        report += "---\n\n"
        
        for pt in parent_types:
            pt_tools = [t for t in all_tools if t['parent_type'] == pt and t['sub_type'] != 'master']
            if not pt_tools: continue
            
            report += f"# Category: `{pt}`\n\n"
            
            for tool in pt_tools:
                name = tool['name']
                sub_type = tool['sub_type']
                display_name = tool['display_name']
                
                system_prompt = build_smart_prompt(pt, sub_type, all_tools)
                
                report += f"## Tool: {display_name} ({name})\n"
                report += f"**Sub-type**: `{sub_type}`\n\n"
                report += "### Generated System Prompt:\n"
                report += f"```text\n{system_prompt}\n```\n\n"
                report += "---\n\n"
            
        with open(REPORT_PATH, 'w', encoding='utf-8') as f:
            f.write(report)
            
        print(f"Universal Audit report generated at {REPORT_PATH}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    generate_report()
