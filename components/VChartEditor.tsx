import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { VChartData, VChartChartStyles, DEFAULT_VCHART_STYLES, QCToolType } from '../types';
import { INITIAL_VCHART_DSL, VCHART_COLOR_PALETTES } from '../constants';
import { 
    Cpu, Sparkles, RotateCcw, Database, Code, 
    ChevronRight, Trash2, Loader2, HelpCircle, X, BarChart3, Zap
} from 'lucide-react';
import { generateLogicDSL, getAIStatus } from '../services/aiService';

interface VChartEditorProps {
    data: VChartData;
    styles: VChartChartStyles;
    theme: 'light' | 'dark';
    onDataChange: (data: VChartData) => void;
    onStylesChange: (styles: VChartChartStyles) => void;
}

export const parseVChartDSL = (content: string, baseStyles: VChartChartStyles = DEFAULT_VCHART_STYLES) => {
    const lines = content.split('\n');
    let title = baseStyles.title;
    let colorPalette = baseStyles.colorPalette;
    let titleFontSize = baseStyles.titleFontSize;
    let baseFontSize = baseStyles.baseFontSize;
    let legendFontSize = baseStyles.legendFontSize;
    let axisFontSize = baseStyles.axisFontSize;
    let specStr = '';
    let inSpec = false;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        if (trimmed.startsWith('Title:')) {
            title = trimmed.split(':')[1].trim();
        } else if (trimmed.startsWith('ColorPalette:')) {
            colorPalette = trimmed.split(':')[1].trim();
        } else if (trimmed.startsWith('Font[Title]:')) {
            titleFontSize = parseInt(trimmed.split(':')[1]) || titleFontSize;
        } else if (trimmed.startsWith('Font[Base]:')) {
            baseFontSize = parseInt(trimmed.split(':')[1]) || baseFontSize;
        } else if (trimmed.startsWith('Font[Legend]:')) {
            legendFontSize = parseInt(trimmed.split(':')[1]) || legendFontSize;
        } else if (trimmed.startsWith('Font[Axis]:')) {
            axisFontSize = parseInt(trimmed.split(':')[1]) || axisFontSize;
        } else if (trimmed.startsWith('Spec:')) {
            inSpec = true;
            specStr = trimmed.substring(5).trim();
        } else if (inSpec) {
            specStr += ' ' + trimmed;
        }
    });

    let spec = {};
    try {
        if (specStr) {
            spec = JSON.parse(specStr);
        }
    } catch (e) {
        console.warn('Failed to parse VChart Spec JSON', e);
    }

    return {
        data: { title, spec },
        styles: { 
            ...baseStyles, 
            title, 
            colorPalette, 
            titleFontSize, 
            baseFontSize, 
            legendFontSize, 
            axisFontSize 
        }
    };
};

const VChartEditor: React.FC<VChartEditorProps> = ({ data, styles, theme, onDataChange, onStylesChange }) => {
    const [dsl, setDsl] = useState(INITIAL_VCHART_DSL);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [engineName, setEngineName] = useState('DeepSeek');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    const isInitialized = useRef(false);
    useEffect(() => {
        if (!isInitialized.current) {
            if (!data.spec || Object.keys(data.spec).length === 0) {
                handleParseDSL(INITIAL_VCHART_DSL);
            } else {
                setDsl(generateDSLFromState(data, styles));
            }
            isInitialized.current = true;
        }
    }, [data]);

    const generateDSLFromState = (currData: VChartData, currStyles: VChartChartStyles) => {
        let dslLines = [`Title: ${currData.title}`];
        if (currStyles.colorPalette) dslLines.push(`ColorPalette: ${currStyles.colorPalette}`);
        if (currStyles.titleFontSize) dslLines.push(`Font[Title]: ${currStyles.titleFontSize}`);
        if (currStyles.baseFontSize) dslLines.push(`Font[Base]: ${currStyles.baseFontSize}`);
        if (currStyles.legendFontSize) dslLines.push(`Font[Legend]: ${currStyles.legendFontSize}`);
        if (currStyles.axisFontSize) dslLines.push(`Font[Axis]: ${currStyles.axisFontSize}`);
        
        dslLines.push('');
        dslLines.push(`Spec: ${JSON.stringify(currData.spec, null, 2)}`);
        
        return dslLines.join('\n');
    };

    const handleParseDSL = (content: string) => {
        try {
            const { data: newData, styles: newStyles } = parseVChartDSL(content, styles);
            onDataChange(newData);
            onStylesChange(newStyles);
        } catch (e) {
            console.error('Failed to parse DSL', e);
        }
    };

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？')) {
            setDsl(INITIAL_VCHART_DSL);
            handleParseDSL(INITIAL_VCHART_DSL);
        }
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateLogicDSL(aiPrompt, QCToolType.VCHART);
            setDsl(result);
            handleParseDSL(result);
            setActiveTab('dsl');
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative transition-colors">
            <div className="p-6 border-b border-[var(--sidebar-border)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center border border-indigo-500/30">
                            <Cpu size={22} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">VChart 全能引擎</h2>
                            <p className="text-[8px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">VisActor Chart Engine | IQS Core</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleReset} className="p-3 bg-[var(--card-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-amber-400 transition-all border border-[var(--sidebar-border)] shadow-sm" title="恢复示例">
                            <RotateCcw size={18} />
                        </button>
                        <button onClick={() => setShowDocs(true)} className="p-3 bg-[var(--card-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-indigo-400 transition-all border border-[var(--sidebar-border)] shadow-sm" title="配置帮助">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex bg-[var(--input-bg)] p-1.5 rounded-lg border border-[var(--input-border)] gap-1">
                    {[
                        { id: 'manual', label: '全局配置', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'JSON 脚本', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--card-bg)]'}`}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <textarea
                            value={dsl}
                            onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }}
                            className="flex-1 w-full bg-[var(--input-bg)] text-[var(--sidebar-text)] p-8 font-mono text-[11px] leading-relaxed border border-[var(--input-border)] rounded-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none shadow-inner custom-scrollbar"
                            placeholder='{"type": "bar", ...}'
                            spellCheck={false}
                        />
                    </div>
                ) : activeTab === 'manual' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-indigo-500" />
                                <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">基础样式与字号</span>
                            </div>
                            <div className="space-y-4 bg-[var(--input-bg)] p-4 rounded-lg border border-[var(--input-border)]">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-[var(--sidebar-muted)] uppercase pl-1">图表标题</label>
                                    <input
                                        value={data.title}
                                        onChange={e => onDataChange({ ...data, title: e.target.value })}
                                        className="w-full h-10 px-4 bg-[var(--card-bg)] border border-[var(--input-border)] rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 text-[var(--sidebar-text)]"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-[var(--sidebar-muted)] uppercase pl-1">标题字号: {styles.titleFontSize}px</label>
                                        <input type="range" min="12" max="48" value={styles.titleFontSize} onChange={e => onStylesChange({ ...styles, titleFontSize: parseInt(e.target.value) })} className="w-full h-1 bg-[var(--input-border)] rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-[var(--sidebar-muted)] uppercase pl-1">正文字号: {styles.baseFontSize}px</label>
                                        <input type="range" min="8" max="24" value={styles.baseFontSize} onChange={e => onStylesChange({ ...styles, baseFontSize: parseInt(e.target.value) })} className="w-full h-1 bg-[var(--input-border)] rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-[var(--sidebar-muted)] uppercase pl-1">图例字号: {styles.legendFontSize}px</label>
                                        <input type="range" min="8" max="20" value={styles.legendFontSize} onChange={e => onStylesChange({ ...styles, legendFontSize: parseInt(e.target.value) })} className="w-full h-1 bg-[var(--input-border)] rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-[var(--sidebar-muted)] uppercase pl-1">坐标轴字号: {styles.axisFontSize}px</label>
                                        <input type="range" min="8" max="20" value={styles.axisFontSize} onChange={e => onStylesChange({ ...styles, axisFontSize: parseInt(e.target.value) })} className="w-full h-1 bg-[var(--input-border)] rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-indigo-500" />
                                <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">主题与配色</span>
                            </div>
                            <div className="space-y-4 bg-[var(--input-bg)] p-4 rounded-lg border border-[var(--input-border)]">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-[var(--sidebar-muted)] uppercase pl-1">配色方案</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {VCHART_COLOR_PALETTES.map(p => (
                                            <button 
                                                key={p.id}
                                                onClick={() => onStylesChange({ ...styles, colorPalette: p.id })}
                                                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${styles.colorPalette === p.id ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400' : 'bg-[var(--card-bg)] border-[var(--input-border)] text-[var(--sidebar-text)] hover:border-indigo-500/30'}`}
                                            >
                                                <span className="text-[10px] font-bold">{p.name}</span>
                                                <div className="flex gap-1">
                                                    {p.colors.map((c, idx) => (
                                                        <div key={idx} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                                                    ))}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-8 shadow-2xl relative overflow-hidden group">
                           <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">AI 智能生成</span>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                className="w-full h-32 p-4 bg-[var(--card-bg)] border border-[var(--input-border)] rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-500 text-[var(--sidebar-text)] resize-none"
                                placeholder="描述你想要生成的复杂图表，例如：'绘制一张展示 2024 年各产品线由于质量问题导致的成本损失与月度趋势的组合图'..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-lg flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-[var(--sidebar-muted)]' : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-indigo-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在解析 Spec...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">AI 生成图表脚本</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md transition-all">
                    <div className="bg-[var(--sidebar-bg)] w-[800px] max-h-[85vh] rounded-lg border border-[var(--sidebar-border)] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 flex flex-col border-b border-[var(--sidebar-border)] shrink-0 gap-6 bg-[var(--sidebar-bg)]/80 backdrop-blur-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-600/20 rounded-lg border border-indigo-500/30">
                                        <BarChart3 size={24} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--sidebar-text)] uppercase tracking-tighter">VChart 引擎知识库</h3>
                                        <p className="text-[10px] text-[var(--sidebar-muted)] font-bold uppercase tracking-widest mt-1">VisActor Chart Spec Guide</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDocs(false)} className="p-3 hover:bg-slate-800 rounded-lg transition-all text-slate-200 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <nav className="flex bg-[var(--card-bg)] p-1 rounded-lg border border-[var(--sidebar-border)] w-fit">
                                {[
                                    { id: 'dsl', label: 'DSL 规范说明' },
                                    { id: 'logic', label: '分析逻辑与指南' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setDocTab(t.id as any)}
                                        className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-200 hover:text-slate-300'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar text-[var(--sidebar-muted)]">
                            {docTab === 'dsl' ? (
                                <div className="space-y-12">
                                    <div className="font-mono text-xs space-y-6">
                                        <section>
                                            <h4 className="text-indigo-500 font-bold uppercase tracking-wider text-[10px] mb-3">关键配置</h4>
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px]">
                                                <p><span className="text-indigo-400 font-bold">Title:</span> [文字] - 图表标题</p>
                                                <p><span className="text-indigo-400 font-bold">ColorPalette:</span> tech | industrial | vibrant | deep</p>
                                                <p><span className="text-indigo-400 font-bold">Font[Title]:</span> [Size] - 标题字号</p>
                                                <p><span className="text-indigo-400 font-bold">Font[Base]:</span> [Size] - 正文/Tooltip 字号</p>
                                                <p><span className="text-indigo-400 font-bold">Font[Legend]:</span> [Size] - 图例字号</p>
                                                <p><span className="text-indigo-400 font-bold">Font[Axis]:</span> [Size] - 坐标轴字号</p>
                                            </div>
                                        </section>
                                        <section className="border-t border-slate-800 pt-6">
                                            <h4 className="text-emerald-500 font-bold uppercase tracking-wider text-[10px] mb-3">支持的图表类型 (Full Types)</h4>
                                            <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">bar (柱状图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">line (折线图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">area (面积图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">pie/rose (饼图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">scatter (散点图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">radar (雷达图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">sankey (桑基图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">funnel (漏斗图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">treemap (树图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">waterfall (瀑布)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">heatmap (热力图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">boxplot (箱线图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">gauge (仪表盘)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">liquid (水波图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">sunburst (旭日)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">map (地图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">venn (韦恩图)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">wordcloud (词云)</div>
                                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">common (组合图)</div>
                                            </div>
                                        </section>
                                        <section className="border-t border-slate-800 pt-6">
                                            <h4 className="text-amber-500 font-bold uppercase tracking-wider text-[10px] mb-3">标准 JSON Spec</h4>
                                            <div className="bg-[var(--card-bg)] p-4 rounded-lg border border-[var(--input-border)] text-[var(--sidebar-text)] text-[11px] font-mono leading-relaxed">
                                                <p className="text-indigo-400 mb-2">// 语法: Spec: {"{ ... }"}</p>
                                                <p>{"{"}</p>
                                                <p>  "type": "common",</p>
                                                <p>  "series": [ ... ],</p>
                                                <p>  "axes": [ ... ],</p>
                                                <p>  "legends": [ ... ]</p>
                                                <p>{"}"}</p>
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-900/50 pb-2">全能图表优势</h4>
                                        <div className="p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-4 text-xs leading-relaxed text-[var(--sidebar-text)]">
                                            <p>VChart 引擎适用于处理极其复杂的工业数据可视化场景：</p>
                                            <ul className="list-disc list-inside space-y-2">
                                                <li><strong>多轴组合</strong>: 柱状图、折线图、面积图的自由组合。</li>
                                                <li><strong>复杂布局</strong>: 桑基图、漏斗图、矩形树图等高级类型。</li>
                                                <li><strong>海量数据</strong>: 优化的 Canvas 渲染，支持数万个数据点的平滑展示。</li>
                                            </ul>
                                        </div>
                                    </section>

                                    <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap size={14} className="text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase text-indigo-500">专家建议</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--sidebar-text)] font-medium italic mb-2">
                                            "使用 VChart 时，建议通过 AI 智能生成初步框架，再通过 JSON 脚本进行微调，以获得最佳的可视化效果。"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-10 border-t border-[var(--sidebar-border)] bg-[var(--input-bg)] flex justify-center shrink-0">
                            <button
                                onClick={() => setShowDocs(false)}
                                className="px-16 py-4 bg-indigo-600 text-white font-black rounded-lg text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all font-sans"
                            >
                                已阅读规范
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default VChartEditor;
