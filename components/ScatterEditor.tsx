import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ScatterPoint, ScatterChartStyles, DEFAULT_SCATTER_STYLES } from '../types';
import { INITIAL_SCATTER_DSL, INITIAL_SCATTER_DATA } from '../constants';
import { ScatterChart as ScatterIcon, Sparkles, HelpCircle, X, Loader2, Database, Code, ChevronRight, Box, Waves, Grid3X3, RotateCcw } from 'lucide-react';
import { generateScatterDSL, getAIStatus } from '../services/aiService';

interface ScatterEditorProps {
    data: ScatterPoint[];
    styles: ScatterChartStyles;
    onDataChange: (data: ScatterPoint[]) => void;
    onStylesChange: (styles: ScatterChartStyles) => void;
}

export const parseScatterDSL = (content: string, baseStyles: ScatterChartStyles = DEFAULT_SCATTER_STYLES) => {
    const lines = content.split('\n');
    const newStyles: ScatterChartStyles = { ...baseStyles };
    const newPoints: ScatterPoint[] = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        // Computed Properties
        if (trimmed.includes(':') && !trimmed.startsWith('-')) {
            const [key, ...vals] = trimmed.split(':');
            const val = vals.join(':').trim();

            switch (key.trim()) {
                case 'Title': newStyles.title = val; break;
                case 'XAxis': newStyles.xAxisLabel = val; break;
                case 'YAxis': newStyles.yAxisLabel = val; break;
                case 'ZAxis': newStyles.zAxisLabel = val; break;
                case 'Color[Point]': newStyles.pointColor = val; break;
                case 'Color[Trend]': newStyles.trendColor = val; break;
                case 'ShowTrend': newStyles.showTrend = val.toLowerCase() === 'true'; break;
                case '3D': newStyles.is3D = val.toLowerCase() === 'true'; break;
                case 'Size[Base]': newStyles.baseSize = parseFloat(val); break;
                case 'Opacity': newStyles.opacity = parseFloat(val); break;
            }
            return;
        }

        // Data Points
        if (trimmed.startsWith('-')) {
            const parts = trimmed.substring(1).split(',').map(s => parseFloat(s.trim()));
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                newPoints.push({
                    id: Math.random().toString(36).substr(2, 9),
                    x: parts[0],
                    y: parts[1],
                    z: parts[2]
                });
            }
        }
    });

    return { data: newPoints, styles: newStyles };
};

const ScatterEditor: React.FC<ScatterEditorProps> = ({ data, styles, onDataChange, onStylesChange }) => {
    const [dsl, setDsl] = useState(INITIAL_SCATTER_DSL);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [manualInput, setManualInput] = useState('');

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiConfig, setAiConfig] = useState<any>(null);
    const [engineName, setEngineName] = useState('DeepSeek');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    // Initial Sync
    const isInitialized = useRef(false);
    useEffect(() => {
        const isInvalidData = data.length > 0 && typeof (data[0] as any).x === 'undefined';

        if (!isInitialized.current || isInvalidData) {
            if (data.length === 0 || isInvalidData) {
                handleParseDSL(INITIAL_SCATTER_DSL);
            } else {
                setManualInput(data.map(p => `${p.x}, ${p.y}${p.z ? `, ${p.z}` : ''}`).join('\n'));
            }
            if (!isInvalidData) {
                isInitialized.current = true;
            }
        }
    }, [data]);

    // Load AI Config
    useEffect(() => {
        fetch('/chart_spec.json')
            .then(res => res.json())
            .then(config => setAiConfig(config))
            .catch(err => console.error('Failed to load AI config:', err));
    }, []);

    function generateDSLFromState(currentData: ScatterPoint[], currentStyles: ScatterChartStyles) {
        let lines: string[] = [];
        if (currentStyles.title) lines.push(`Title: ${currentStyles.title}`);
        if (currentStyles.xAxisLabel) lines.push(`XAxis: ${currentStyles.xAxisLabel}`);
        if (currentStyles.yAxisLabel) lines.push(`YAxis: ${currentStyles.yAxisLabel}`);
        if (currentStyles.zAxisLabel) lines.push(`ZAxis: ${currentStyles.zAxisLabel}`);
        if (currentStyles.pointColor) lines.push(`Color[Point]: ${currentStyles.pointColor}`);
        if (currentStyles.trendColor) lines.push(`Color[Trend]: ${currentStyles.trendColor}`);
        if (currentStyles.showTrend !== undefined) lines.push(`ShowTrend: ${currentStyles.showTrend}`);
        if (currentStyles.is3D !== undefined) lines.push(`3D: ${currentStyles.is3D}`);

        lines.push('');
        lines.push('# 数据 (X, Y, [Z])');
        currentData.forEach(p => {
            lines.push(`- ${p.x}, ${p.y}${p.z ? `, ${p.z}` : ''}`);
        });
        return lines.join('\n');
    }

    const handleTabChange = (tab: 'manual' | 'dsl' | 'ai') => {
        if (tab === 'dsl') setDsl(generateDSLFromState(data, styles));
        setActiveTab(tab);
    };

    const handleParseDSL = (content: string) => {
        const { data: newPoints, styles: newStyles } = parseScatterDSL(content, styles);
        onDataChange(newPoints);
        onStylesChange(newStyles);
        setManualInput(newPoints.map(p => `${p.x}, ${p.y}${p.z ? `, ${p.z}` : ''}`).join('\n'));
    };

    const handleManualChange = (val: string) => {
        setManualInput(val);
        const lines = val.split('\n');
        const newPoints: ScatterPoint[] = [];
        lines.forEach(line => {
            const parts = line.split(',').map(s => parseFloat(s.trim()));
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                newPoints.push({
                    id: Math.random().toString(36).substr(2, 9),
                    x: parts[0],
                    y: parts[1],
                    z: parts[2]
                });
            }
        });
        onDataChange(newPoints);
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateScatterDSL(aiPrompt);
            setDsl(result);
            handleParseDSL(result);
            setActiveTab('dsl');
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？当前所有修改将丢失。')) {
            setDsl(INITIAL_SCATTER_DSL);
            handleParseDSL(INITIAL_SCATTER_DSL);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-white relative">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center border border-amber-500/30">
                            <ScatterIcon size={22} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white tracking-widest uppercase">散点图引擎</h2>
                            <p className="text-[8px] text-slate-500 font-bold tracking-[0.2em] mt-1">SCATTER PROCESSOR V1.0</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-blue-400 transition-all border border-slate-700"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button onClick={() => setShowDocs(true)} className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all border border-slate-700">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>
                <nav className="flex bg-black/40 p-1.5 rounded-2xl border border-slate-800/50 gap-1">
                    {[{ id: 'manual', label: '手动录入', icon: <Database size={14} /> }, { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> }, { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }].map(t => (
                        <button key={t.id} onClick={() => handleTabChange(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-amber-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'manual' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Title & Axes */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-amber-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">图表元数据</span>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <input value={styles.title || ''} onChange={e => onStylesChange({ ...styles, title: e.target.value })} className="w-full h-10 px-4 logic-terminal-input text-xs font-bold bg-black/40 border border-slate-800 rounded-xl" placeholder="图表标题" />
                                <div className="grid grid-cols-3 gap-3">
                                    <input value={styles.xAxisLabel || ''} onChange={e => onStylesChange({ ...styles, xAxisLabel: e.target.value })} className="w-full h-10 px-4 logic-terminal-input text-xs bg-black/40 border border-slate-800 rounded-xl" placeholder="X轴标签" />
                                    <input value={styles.yAxisLabel || ''} onChange={e => onStylesChange({ ...styles, yAxisLabel: e.target.value })} className="w-full h-10 px-4 logic-terminal-input text-xs bg-black/40 border border-slate-800 rounded-xl" placeholder="Y轴标签" />
                                    <input value={styles.zAxisLabel || ''} onChange={e => onStylesChange({ ...styles, zAxisLabel: e.target.value })} className="w-full h-10 px-4 logic-terminal-input text-xs bg-black/40 border border-slate-800 rounded-xl" placeholder="Z轴标签" />
                                </div>
                            </div>
                        </div>

                        {/* Data Input */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pl-2">
                                <div className="flex items-center gap-3">
                                    <ChevronRight size={14} className="text-amber-500" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">坐标数据 (X, Y, [Z])</span>
                                </div>
                                <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">N={data.length}</span>
                            </div>
                            <textarea
                                value={manualInput}
                                onChange={e => handleManualChange(e.target.value)}
                                className="w-full h-96 bg-slate-900/50 text-slate-300 p-4 font-mono text-xs border border-slate-800 rounded-2xl resize-none focus:border-amber-500/50 focus:outline-none"
                                placeholder={"10.5, 20.3\n15.2, 25.1\n..."}
                                spellCheck={false}
                            />
                        </div>

                        {/* Configuration */}
                        <div className="p-6 bg-black/30 rounded-[2rem] border border-slate-800/50 space-y-4">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">样式配置</span>
                            </div>

                            {/* Compact Control Row */}
                            <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                {/* Point Color */}
                                <div className="flex flex-col gap-2 items-center">
                                    <span className="text-[10px] font-bold text-slate-400">点色</span>
                                    <input type="color" value={styles.pointColor} onChange={e => onStylesChange({ ...styles, pointColor: e.target.value })} className="w-8 h-5 rounded bg-transparent cursor-pointer" />
                                </div>
                                <div className="w-[1px] h-8 bg-slate-800" />

                                {/* Trend Line */}
                                <div className="flex flex-col gap-2 items-center">
                                    <span className="text-[10px] font-bold text-slate-400">趋势线</span>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={styles.trendColor} onChange={e => onStylesChange({ ...styles, trendColor: e.target.value })} className="w-8 h-5 rounded bg-transparent cursor-pointer" />
                                        <input type="checkbox" checked={styles.showTrend} onChange={e => onStylesChange({ ...styles, showTrend: e.target.checked })} className="w-4 h-4 rounded border-slate-600 text-amber-600 focus:ring-amber-500 bg-slate-700" />
                                    </div>
                                </div>
                                <div className="w-[1px] h-8 bg-slate-800" />

                                {/* 3D Mode */}
                                <div className="flex flex-col gap-2 items-center">
                                    <span className="text-[10px] font-bold text-slate-400">3D视图</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const modes: ('scatter' | 'surface')[] = ['scatter', 'surface'];
                                                const currentIdx = modes.indexOf((styles.renderMode3D as any) || 'scatter');
                                                const nextMode = modes[(currentIdx + 1) % modes.length];
                                                onStylesChange({ ...styles, renderMode3D: nextMode });
                                            }}
                                            disabled={!styles.is3D}
                                            className={`p-1.5 rounded-md border transition-all ${!styles.is3D
                                                ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                                                : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 active:scale-95'
                                                }`}
                                            title={styles.renderMode3D === 'surface' ? '3D曲面模式' : '3D散点模式'}
                                        >
                                            {styles.renderMode3D === 'surface' ? <Waves size={14} /> : <Box size={14} />}
                                        </button>
                                        <input type="checkbox" checked={styles.is3D} onChange={e => onStylesChange({ ...styles, is3D: e.target.checked })} className="w-4 h-4 rounded border-slate-600 text-amber-600 focus:ring-amber-500 bg-slate-700" />
                                    </div>
                                </div>
                            </div>

                            {/* Sliders Row */}
                            <div className="grid grid-cols-2 gap-4 pt-1">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">大小 ({styles.baseSize})</span>
                                    <input type="range" min="2" max="20" value={styles.baseSize} onChange={e => onStylesChange({ ...styles, baseSize: parseInt(e.target.value) })} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">透明度 ({styles.opacity})</span>
                                    <input type="range" min="0.1" max="1" step="0.05" value={styles.opacity} onChange={e => onStylesChange({ ...styles, opacity: parseFloat(e.target.value) })} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <textarea value={dsl} onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }} className="w-full h-full bg-black/40 text-amber-100 p-6 font-mono text-xs border border-slate-800 rounded-2xl resize-none focus:outline-none" spellCheck={false} />
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">智能相关性推演</span>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                className="w-full h-56 bg-slate-900/50 text-slate-200 p-8 text-sm leading-relaxed border border-slate-800 rounded-[2rem] focus:outline-none focus:border-amber-500 transition-all resize-none shadow-inner"
                                placeholder="输入描述，例如：'分析广告投入与销售额的关系，生成模拟数据'..."
                            />

                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-slate-800' : 'bg-amber-600 hover:bg-amber-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-amber-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在执行相关性分析...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            <div className="p-8 bg-amber-900/10 border border-amber-800/20 rounded-3xl space-y-4">
                                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">推理提示</p>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                    您可以输入变量间的因果猜想（如“温度对粘度的影响”）或具体的数据分布特征。AI 将为您模拟符合科学规律的点集，并自动计算初步的回归趋势。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Docs Modal */}
            {showDocs && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-[#020617]/90 backdrop-blur-3xl">
                    <div className="bg-[#0f172a] w-[600px] max-h-[80vh] rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
                        <div className="px-12 py-10 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-amber-600 rounded-2xl shadow-lg shadow-amber-500/20">
                                    <HelpCircle size={28} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">散点图 DSL 规范</h3>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                                        Scatter Correlation Spec V1
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowDocs(false)} className="p-4 hover:bg-slate-800 rounded-2xl transition-all text-slate-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-8 text-slate-300 custom-scrollbar">
                            <div className="font-mono text-xs space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-amber-500 font-bold uppercase tracking-wider text-[10px] mb-2">基础元数据</h4>
                                    <p className="text-slate-400"><span className="text-amber-400 font-bold">Title:</span> 图表标题</p>
                                    <p className="text-slate-400"><span className="text-amber-400 font-bold">XAxis:</span> X轴标签</p>
                                    <p className="text-slate-400"><span className="text-amber-400 font-bold">YAxis:</span> Y轴标签</p>
                                    <p className="text-slate-400"><span className="text-amber-400 font-bold">ZAxis:</span> Z轴标签 (用于3D视图及气泡大小)</p>
                                </div>

                                <div className="space-y-2 border-t border-slate-800 pt-4">
                                    <h4 className="text-blue-500 font-bold uppercase tracking-wider text-[10px] mb-2">样式控制</h4>
                                    <p className="text-slate-400"><span className="text-blue-400 font-bold">Color[Point]:</span> #HEX (点颜色)</p>
                                    <p className="text-slate-400"><span className="text-blue-400 font-bold">Color[Trend]:</span> #HEX (趋势线颜色)</p>
                                    <p className="text-slate-400"><span className="text-blue-400 font-bold">Size[Base]:</span> Number (基准点大小, 默认10)</p>
                                    <p className="text-slate-400"><span className="text-blue-400 font-bold">Opacity:</span> 0.1-1.0 (点透明度)</p>
                                </div>

                                <div className="space-y-2 border-t border-slate-800 pt-4">
                                    <h4 className="text-emerald-500 font-bold uppercase tracking-wider text-[10px] mb-2">功能开关</h4>
                                    <p className="text-slate-400"><span className="text-emerald-400 font-bold">ShowTrend:</span> true/false (显示回归线)</p>
                                    <p className="text-slate-400"><span className="text-emerald-400 font-bold">3D:</span> true/false (启用3D模式)</p>
                                </div>

                                <div className="space-y-2 border-t border-slate-800 pt-4">
                                    <h4 className="text-white font-bold uppercase tracking-wider text-[10px] mb-2">数据格式</h4>
                                    <p className="text-slate-500 mb-2">使用 "- " 开头定义数据点，格式为 X, Y, [Z]</p>
                                    <div className="bg-black/30 p-4 rounded-xl border border-slate-800 text-slate-400">
                                        <p># 格式示例</p>
                                        <p>- <span className="text-amber-400">10.5</span>, <span className="text-blue-400">20.2</span> <span className="text-slate-600">// X, Y (2D)</span></p>
                                        <p>- <span className="text-amber-400">15.0</span>, <span className="text-blue-400">30.5</span>, <span className="text-emerald-400">50</span> <span className="text-slate-600">// X, Y, Z (3D/Bubble)</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
};

export default ScatterEditor;
