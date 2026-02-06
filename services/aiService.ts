import { QCToolType } from "../types";

interface AIProfile {
    name: string;
    endpoint: string;
    model: string;
}

interface ChartGrammar {
    dsl_specification: {
        rules: string[];
        few_shot_examples: { input: string; output: string }[];
    };
}

interface ChartSpec {
    ai_config: {
        active_profile: string;
        profiles: Record<string, AIProfile>;
    };
    chart_grammars: Record<string, ChartGrammar>;
}

let cachedSpec: ChartSpec | null = null;

async function getChartSpec(): Promise<ChartSpec> {
    if (cachedSpec) return cachedSpec;
    try {
        const res = await fetch('/chart_spec.json');
        if (!res.ok) throw new Error("Failed to load chart_spec.json");
        cachedSpec = await res.json();
        return cachedSpec!;
    } catch (e) {
        console.error("Spec Load Error:", e);
        throw e;
    }
}

async function callAI(systemPrompt: string, userPrompt: string) {
    const spec = await getChartSpec();
    // 1. Try env var first
    const envProfile = process.env.AI_ACTIVE_PROFILE;

    // 2. Fallback to chart_spec.json active_profile if no env var
    const activeProfileName = envProfile || spec.ai_config.active_profile;

    const profile = spec.ai_config.profiles[activeProfileName];
    if (!profile) throw new Error(`Invalid AI Profile: ${activeProfileName}`);

    // Use the env key (mapped from GEMINI_API_KEY in vite.config.ts)
    const apiKey = process.env.API_KEY;

    try {
        const response = await fetch(profile.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: profile.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.1,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`AI API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (error) {
        console.error("AI Inference Failed:", error);
        throw error;
    }
}

function buildSystemPrompt(role: string, grammarKey: string, spec: ChartSpec): string {
    const grammar = spec.chart_grammars[grammarKey];
    if (!grammar) return `You are an expert ${role}.`;

    const rules = grammar.dsl_specification.rules.join('\n');
    const examples = grammar.dsl_specification.few_shot_examples
        .map(ex => `Input: ${ex.input}\nOutput:\n${ex.output}`)
        .join('\n\n');

    return `You are an expert ${role}.
  
RULES:
${rules}

EXAMPLES:
${examples}

OUTPUT REQUIREMENTS:
1. Return ONLY the raw content (DSL or JSON) as requested.
2. NO markdown code blocks.
3. NO explanatory text.`;
}

/**
 * Generates DSL for Pareto Chart
 */
export const generateParetoDSL = async (prompt: string) => {
    try {
        const spec = await getChartSpec();
        const systemPrompt = buildSystemPrompt("Statistical Analyst", "pareto", spec);
        const text = await callAI(systemPrompt, prompt);
        return text.replace(/```\w*/g, '').replace(/```/g, '').trim();
    } catch (error: any) {
        return `Title: 数据解析失败\n- Error: ${error.message || error}`;
    }
};

/**
 * Generates DSL for Histogram
 */
export const generateHistogramDSL = async (prompt: string) => {
    try {
        const spec = await getChartSpec();
        const systemPrompt = buildSystemPrompt("SPC Expert", "histogram", spec);
        const text = await callAI(systemPrompt, prompt);
        return text.replace(/```\w*/g, '').replace(/```/g, '').trim();
    } catch (error: any) {
        return `Title: 生成失败\n- Error: ${error.message || error}`;
    }
};

/**
 * Generates DSL for Logic Tools (Fishbone/Affinity)
 * STRICTLY follows the DSL specification in prompt/chart_spec.
 */
export const generateLogicDSL = async (prompt: string, toolType: QCToolType) => {
    try {
        const spec = await getChartSpec();
        const grammarKey = toolType === QCToolType.FISHBONE ? 'fishbone' :
            toolType === QCToolType.RELATION ? 'relation' :
                toolType === QCToolType.MATRIX ? 'matrix' :
                    toolType === QCToolType.ARROW ? 'arrow' :
                        toolType === QCToolType.RADAR ? 'radar' :
                            toolType === QCToolType.PDPC ? 'pdpc' : 'affinity';
        const systemPrompt = buildSystemPrompt("Quality Control Engineer", grammarKey, spec);

        const text = await callAI(systemPrompt, prompt);
        // Clean markdown blocks if AI wraps output
        return text.replace(/```\w*/g, '').replace(/```/g, '').trim();
    } catch (error: any) {
        console.error("Logic DSL Gen Error:", error);
        return `Title: 生成失败\n- Error: ${error.message || error}`;
    }
};

/**
 * Generates DSL for Control Chart
 */
export const generateControlDSL = async (prompt: string) => {
    try {
        const spec = await getChartSpec();
        const systemPrompt = buildSystemPrompt("SPC Expert", "control", spec);
        const text = await callAI(systemPrompt, prompt);
        return text.replace(/```\w*/g, '').replace(/```/g, '').trim();
    } catch (error: any) {
        return `Title: 生成失败\nType: I-MR\n- Error: ${error.message || error}`;
    }
};

/**
 * Generates DSL for Scatter Chart
 */
export const generateScatterDSL = async (prompt: string) => {
    try {
        const spec = await getChartSpec();
        const systemPrompt = buildSystemPrompt("Statistical Analyst", "scatter", spec);
        const text = await callAI(systemPrompt, prompt);
        return text.replace(/```\w*/g, '').replace(/```/g, '').trim();
    } catch (error: any) {
        return `Title: 生成失败\n- Error: ${error.message || error}`;
    }
};
export const generateBasicDSL = async (prompt: string) => {
    try {
        const spec = await getChartSpec();
        const systemPrompt = buildSystemPrompt("Statistical Analyst", "basic", spec);
        const text = await callAI(systemPrompt, prompt);
        return text.replace(/```\w*/g, '').replace(/```/g, '').trim();
    } catch (error: any) {
        return `Title: 生成失败\n- Error: ${error.message || error}`;
    }
};

/**
 * Retrieves the name of the currently active AI engine
 */
export const getAIStatus = async (): Promise<string> => {
    try {
        const spec = await getChartSpec();
        const envProfile = process.env.AI_ACTIVE_PROFILE;
        const activeProfileName = envProfile || spec.ai_config.active_profile;
        const profile = spec.ai_config.profiles[activeProfileName];
        return profile?.name || "未激活服务";
    } catch (e) {
        return "未激活服务";
    }
};
