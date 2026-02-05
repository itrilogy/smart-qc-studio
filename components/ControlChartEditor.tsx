import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ControlSeries, ControlChartStyles, DEFAULT_CONTROL_STYLES, INITIAL_CONTROL_DSL, ControlChartType, ControlRule } from '../types';
import {
    Activity, Sparkles, HelpCircle, X, Loader2, Play,
    Database, Code, ChevronRight, Settings2, Ruler, RotateCcw
} from 'lucide-react';
import { generateControlDSL, getAIStatus } from '../services/aiService';

interface ControlEditorProps {
    dsl: string;
    onDslChange: (dsl: string) => void;
}

// 独立的 DSL 解析函数
export function parseControlDSL(dsl: string): { series: ControlSeries[]; styles: Partial<ControlChartStyles> } {
    const lines = dsl.split('\n').map(l => l.trimEnd());
    const styles: Partial<ControlChartStyles> = {};
    const series: ControlSeries[] = [];

    let currentSeries: ControlSeries | null = null;
    let isDataBlock = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || (trimmed.startsWith('//') && !isDataBlock)) continue;

        // Header configs
        if (trimmed.startsWith('Title:')) {
            styles.title = trimmed.substring(6).trim();
            continue;
        }
        if (trimmed.startsWith('Type:')) {
            styles.type = trimmed.substring(5).trim() as ControlChartType;
            continue;
        }
        if (trimmed.startsWith('Size:')) {
            styles.subgroupSize = parseInt(trimmed.substring(5).trim());
            continue;
        }
        if (trimmed.startsWith('Rules:')) {
            styles.rules = trimmed.substring(6).split(',').map(r => r.trim() as ControlRule);
            continue;
        }
        if (trimmed.startsWith('UCL:')) {
            styles.ucl = parseFloat(trimmed.substring(4).trim());
            continue;
        }
        if (trimmed.startsWith('LCL:')) {
            styles.lcl = parseFloat(trimmed.substring(4).trim());
            continue;
        }
        if (trimmed.startsWith('CL:')) {
            styles.cl = parseFloat(trimmed.substring(3).trim());
            continue;
        }
        if (trimmed.startsWith('Decimals:')) {
            styles.decimals = parseInt(trimmed.substring(9).trim());
            continue;
        }

        // Colors
        const colorMatch = trimmed.match(/^Color\[(\w+)\]:\s*(#[0-9A-Fa-f]{6})/);
        if (colorMatch) {
            const [, key, val] = colorMatch;
            if (key === 'Line') styles.lineColor = val;
            if (key === 'UCL') styles.uclColor = val;
            if (key === 'CL') styles.clColor = val;
            if (key === 'Point') styles.pointColor = val;
            continue;
        }

        // Series Block
        if (trimmed.startsWith('[series]:')) {
            isDataBlock = true;
            currentSeries = {
                name: trimmed.substring(9).trim(),
                data: []
            };
            continue;
        }
        if (trimmed === '[/series]') {
            if (currentSeries) series.push(currentSeries);
            currentSeries = null;
            isDataBlock = false;
            continue;
        }

        if (isDataBlock && currentSeries) {
            const values = trimmed.split(/[,;\s]+/).map(v => parseFloat(v));
            values.forEach(val => {
                if (!isNaN(val)) {
                    currentSeries!.data.push(val);
                }
            });
            continue;
        }
    }

    return { series, styles };
}

const ControlChartEditor: React.FC<ControlEditorProps> = ({ dsl, onDslChange }) => {
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [series, setSeries] = useState<ControlSeries[]>([]);
    const [styles, setStyles] = useState<ControlChartStyles>(DEFAULT_CONTROL_STYLES);
    const [aiInput, setAiInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [showDocs, setShowDocs] = useState(false);
    const [engineName, setEngineName] = useState('DeepSeek');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);
    const handleParseDSL = (val: string) => {
        try {
            const result = parseControlDSL(val);
            setSeries(result.series);
            setStyles(prev => ({ ...DEFAULT_CONTROL_STYLES, ...result.styles }));
        } catch (e) {
            console.error('DSL Parse Error:', e);
        }
    };

    // 解析 DSL 到 State
    useEffect(() => {
        handleParseDSL(dsl);
    }, [dsl]);

    // 初始化默认 DSL
    useEffect(() => {
        if (!dsl) {
            onDslChange(INITIAL_CONTROL_DSL);
        }
    }, []);

    // State 到 DSL 生成器
    const generateDSL = (s: ControlSeries[], st: ControlChartStyles) => {
        let lines: string[] = [];

        if (st.title) lines.push(`Title: ${st.title}`);
        if (st.type) lines.push(`Type: ${st.type}`);
        if (st.subgroupSize) lines.push(`Size: ${st.subgroupSize}`);
        if (st.rules && st.rules.length > 0) lines.push(`Rules: ${st.rules.join(',')}`);
        if (st.decimals !== undefined) lines.push(`Decimals: ${st.decimals}`);

        if (st.ucl !== undefined) lines.push(`UCL: ${st.ucl}`);
        if (st.lcl !== undefined) lines.push(`LCL: ${st.lcl}`);
        if (st.cl !== undefined) lines.push(`CL: ${st.cl}`);

        if (st.lineColor) lines.push(`Color[Line]: ${st.lineColor}`);
        if (st.pointColor) lines.push(`Color[Point]: ${st.pointColor}`);
        if (st.uclColor) lines.push(`Color[UCL]: ${st.uclColor}`);
        if (st.clColor) lines.push(`Color[CL]: ${st.clColor}`);

        lines.push('');

        s.forEach(se => {
            lines.push(`[series]: ${se.name}`);
            const chunkSize = 5;
            for (let i = 0; i < se.data.length; i += chunkSize) {
                const chunk = se.data.slice(i, i + chunkSize);
                lines.push(chunk.join(', '));
            }
            lines.push('[/series]');
            lines.push('');
        });

        return lines.join('\n');
    };

    const handleUpdate = (newSeries: ControlSeries[], newStyles: ControlChartStyles) => {
        setSeries(newSeries);
        setStyles(newStyles);
        const newDSL = generateDSL(newSeries, newStyles);
        onDslChange(newDSL);
    };

    const handleTabChange = (tab: 'manual' | 'dsl' | 'ai') => {
        setActiveTab(tab);
    };

    const handleSmartOptimize = async () => {
        if (!aiInput.trim()) return;
        setIsThinking(true);
        try {
            const result = await generateControlDSL(aiInput);
            onDslChange(result);
            setActiveTab('dsl');
        } catch (e) {
            console.error(e);
        } finally {
            setIsThinking(false);
        }
    };

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？当前所有修改将丢失。')) {
            onDslChange(INITIAL_CONTROL_DSL);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-white relative">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                            <Activity size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">控制图引擎</h2>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">SPC Processor v2.0</p>
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

                <nav className="flex gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800">
                    {[
                        { id: 'manual', label: '手动录入', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleTabChange(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'manual' && (
                    <div className="space-y-6">
                        {/* 1. Basic Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">图表基本信息</span>
                            </div>
                            <input
                                value={styles.title || ''}
                                onChange={e => handleUpdate(series, { ...styles, title: e.target.value })}
                                className="w-full h-14 px-6 logic-terminal-input text-sm font-bold"
                                placeholder="例如：关键尺寸控制图"
                            />
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2 block">图表类型</label>
                                    <select
                                        value={styles.type}
                                        onChange={e => handleUpdate(series, { ...styles, type: e.target.value as ControlChartType })}
                                        className="w-full h-10 px-3 bg-slate-800/50 rounded-xl border border-slate-700 text-[10px] font-bold text-slate-300 outline-none focus:border-emerald-500/50 appearance-none"
                                    >
                                        <option value="I-MR">I-MR (单维 | 单值)</option>
                                        <option value="X-bar-R">X-bar-R (单维 | 均值-极差)</option>
                                        <option value="X-bar-S">X-bar-S (单维 | 均值-标准差)</option>
                                        <option value="P">P Chart (单维 | 不合格率)</option>
                                        <option value="NP">NP Chart (单维 | 不合格数)</option>
                                        <option value="C">C Chart (单维 | 缺陷数)</option>
                                        <option value="U">U Chart (单维 | 单位缺陷数)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 2. SPC Params */}
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-6 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <Ruler size={16} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SPC 参数配置</span>
                            </div>

                            {/* Sliders */}
                            <div className="flex gap-8">
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                        <span>子组大小 (Size)</span>
                                        <span className="text-emerald-400">{styles.subgroupSize || 1}</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="10"
                                        value={styles.subgroupSize || 1}
                                        onChange={e => handleUpdate(series, { ...styles, subgroupSize: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                    />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                        <span>小数精度</span>
                                        <span className="text-emerald-400">{styles.decimals ?? 2} 位</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="4"
                                        value={styles.decimals ?? 2}
                                        onChange={e => handleUpdate(series, { ...styles, decimals: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                    />
                                </div>
                            </div>

                            {/* Rules */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">判异规则 (Rules)</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'Basic', label: '基础' },
                                        { id: 'Western-Electric', label: 'WE 规则' },
                                        { id: 'Nelson', label: 'Nelson 增强' }
                                    ].map(rule => {
                                        const isActive = styles.rules.includes(rule.id as ControlRule);
                                        return (
                                            <button
                                                key={rule.id}
                                                onClick={() => {
                                                    const newRules = isActive
                                                        ? styles.rules.filter(r => r !== rule.id)
                                                        : [...styles.rules, rule.id as ControlRule];
                                                    handleUpdate(series, { ...styles, rules: newRules });
                                                }}
                                                className={`flex-1 h-9 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center gap-1.5 ${isActive
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                    : 'bg-slate-800/30 border-slate-700 text-slate-500 hover:border-slate-600'
                                                    }`}
                                            >
                                                <div className={`w-2 h-2 rounded-full border ${isActive ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`} />
                                                {rule.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* 3. Data Entry */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <Database size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">观测数据序列</span>
                            </div>
                            {series.map((s, idx) => (
                                <div key={idx} className="space-y-2">
                                    <input
                                        value={s.name}
                                        onChange={e => {
                                            const newSeries = [...series];
                                            newSeries[idx].name = e.target.value;
                                            handleUpdate(newSeries, styles);
                                        }}
                                        className="w-full bg-transparent text-xs font-bold text-slate-400 outline-none placeholder:text-slate-700"
                                        placeholder="系列名称"
                                    />
                                    <textarea
                                        value={s.data.join(', ')}
                                        onChange={e => {
                                            const newSeries = [...series];
                                            const valStr = e.target.value;
                                            const newData = valStr.split(/[,;\s]+/).map(v => parseFloat(v)).filter(v => !isNaN(v));
                                            newSeries[idx].data = newData;
                                            handleUpdate(newSeries, styles);
                                        }}
                                        className="w-full h-32 p-4 bg-slate-800/50 rounded-xl border border-slate-700 focus:border-emerald-500/50 outline-none text-xs font-mono leading-relaxed text-slate-300 resize-none"
                                        placeholder="输入观测值，用逗号分隔..."
                                    />
                                </div>
                            ))}
                            {series.length === 0 && (
                                <button
                                    onClick={() => handleUpdate([{ name: '新数据系列', data: [] }], styles)}
                                    className="w-full py-3 border border-dashed border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
                                >
                                    + 添加数据系列
                                </button>
                            )}
                        </div>

                        {/* 4. Color Config */}
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-6 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <Settings2 size={16} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">视觉样式配置</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                {[
                                    { key: 'lineColor', label: '折线颜色' },
                                    { key: 'pointColor', label: '数据点色' },
                                    { key: 'clColor', label: '中心线色' },
                                    { key: 'uclColor', label: '控制线色' }
                                ].map(c => (
                                    <div key={c.key} className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-300">{c.label}</span>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded-md border border-slate-600/50 shadow-sm"
                                                style={{ backgroundColor: (styles as any)[c.key] || '#000' }}
                                            />
                                            <input
                                                type="color"
                                                value={(styles as any)[c.key] || '#000000'}
                                                onChange={e => handleUpdate(series, { ...styles, [c.key]: e.target.value })}
                                                className="w-6 h-6 opacity-0 absolute cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'dsl' && (
                    <div className="h-full flex flex-col gap-6">
                        <textarea
                            value={dsl}
                            onChange={(e) => onDslChange(e.target.value)}
                            className="flex-1 w-full min-h-[400px] p-8 logic-terminal-input text-sm leading-relaxed border border-slate-700/50 whitespace-pre overflow-auto"
                            placeholder="// 在此输入控制图 DSL 代码..."
                            spellCheck={false}
                        />
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">智能 SPC 逻辑推演</span>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiInput}
                                onChange={e => setAiInput(e.target.value)}
                                className="w-full h-64 p-8 bg-slate-900/50 text-slate-200 p-8 text-sm leading-relaxed border border-slate-800 rounded-[2rem] focus:outline-none focus:border-emerald-500 transition-all resize-none shadow-inner"
                                placeholder="例如：分析过去25组活塞销直径测量数据，每组5个样本。请自动判断控制限..."
                            />

                            <button
                                onClick={handleSmartOptimize}
                                disabled={isThinking || !aiInput.trim()}
                                className={`w-full h-16 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isThinking ? 'bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]'}`}
                            >
                                {isThinking ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-emerald-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在执行 SPC 建模推演...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            <div className="p-8 bg-emerald-900/10 border border-emerald-800/20 rounded-3xl space-y-4">
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">推理提示</p>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                    您可以直接粘贴原始测量数据（如 Excel 复制内容），AI 将自动识别子组结构，并根据 SPC 理论推荐合适的控制图类型（I-MR, X-bar 等）并自动计算控制限。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Help Modal */}
            {showDocs && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-[#020617]/90 backdrop-blur-3xl">
                    <div className="bg-[#0f172a] w-[600px] max-h-[80vh] rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]">
                        <div className="px-12 py-10 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20">
                                    <Activity size={28} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">控制图 DSL 规范</h3>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                        SPC Process Control V1
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowDocs(false)} className="p-4 hover:bg-slate-800 rounded-2xl transition-all text-slate-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar text-slate-300">
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 text-emerald-400 border-b border-emerald-500/20 pb-4">
                                    <Settings2 size={18} />
                                    <span className="text-[12px] font-black uppercase tracking-widest">1. 基础配置说明</span>
                                </div>
                                <div className="space-y-4">
                                    <table className="w-full text-xs font-mono border-collapse text-left">
                                        <thead>
                                            <tr className="text-slate-500 border-b border-slate-800">
                                                <th className="py-3 font-black uppercase w-32">语法</th>
                                                <th className="py-3 font-black uppercase">说明</th>
                                                <th className="py-3 font-black uppercase w-48">示例</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            <tr>
                                                <td className="py-3 text-emerald-400 font-bold">Title:</td>
                                                <td className="py-3">图表主标题</td>
                                                <td className="py-3 text-slate-500">Title: 关键尺寸控制图</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-emerald-400 font-bold">Type:</td>
                                                <td className="py-3">控制图类型 (I-MR, X-bar-R, X-bar-S, P, NP, C, U)</td>
                                                <td className="py-3 text-slate-500">Type: X-bar-R</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-emerald-400 font-bold">Size:</td>
                                                <td className="py-3">子组样本容量 (n)</td>
                                                <td className="py-3 text-slate-500">Size: 5</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-emerald-400 font-bold">Rules:</td>
                                                <td className="py-3">判异规则 (Basic/Western-Electric/Nelson)</td>
                                                <td className="py-3 text-slate-500">Rules: Nelson</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-emerald-400 font-bold">Decimals:</td>
                                                <td className="py-3">数值显示精度</td>
                                                <td className="py-3 text-slate-500">Decimals: 3</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <div className="flex items-center gap-3 text-blue-400 border-b border-blue-500/20 pb-4">
                                    <Sparkles size={18} />
                                    <span className="text-[12px] font-black uppercase tracking-widest">2. 视觉样式配置</span>
                                </div>
                                <div className="space-y-4">
                                    <table className="w-full text-xs font-mono border-collapse text-left">
                                        <thead>
                                            <tr className="text-slate-500 border-b border-slate-800">
                                                <th className="py-3 font-black uppercase w-32">语法</th>
                                                <th className="py-3 font-black uppercase">说明</th>
                                                <th className="py-3 font-black uppercase w-48">默认值</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            <tr>
                                                <td className="py-3 text-blue-400 font-bold">Color[Line]:</td>
                                                <td className="py-3">折线颜色</td>
                                                <td className="py-3 text-slate-500 flex items-center gap-2"><div className="w-3 h-3 bg-[#3b82f6] rounded-sm" /> #3b82f6</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-blue-400 font-bold">Color[Point]:</td>
                                                <td className="py-3">数据点颜色</td>
                                                <td className="py-3 text-slate-500 flex items-center gap-2"><div className="w-3 h-3 bg-[#1d4ed8] rounded-sm" /> #1d4ed8</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-blue-400 font-bold">Color[UCL]:</td>
                                                <td className="py-3">控制上限(UCL)颜色</td>
                                                <td className="py-3 text-slate-500 flex items-center gap-2"><div className="w-3 h-3 bg-[#ef4444] rounded-sm" /> #ef4444</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-blue-400 font-bold">Color[CL]:</td>
                                                <td className="py-3">中心线(CL)颜色</td>
                                                <td className="py-3 text-slate-500 flex items-center gap-2"><div className="w-3 h-3 bg-[#22c55e] rounded-sm" /> #22c55e</td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-blue-400 font-bold">Font[Title]:</td>
                                                <td className="py-3">主标题字号</td>
                                                <td className="py-3 text-slate-500">20</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="space-y-6">
                                <div className="flex items-center gap-3 text-purple-400 border-b border-purple-500/20 pb-4">
                                    <Play size={18} />
                                    <span className="text-[12px] font-black uppercase tracking-widest">3. 数据录入规范</span>
                                </div>
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                    <div className="text-[11px] font-bold text-slate-500 mb-2">标准数据块格式</div>
                                    <code className="block text-xs text-purple-200 leading-relaxed bg-black/30 p-4 rounded-xl font-mono">
                                        [series]: 熔体温度<br />
                                        <span className="text-slate-500">// 支持逗号、空格、换行分隔</span><br />
                                        12.5, 12.8, 12.1, 12.4, 12.6<br />
                                        12.3, 12.5, 12.7, 12.2, 12.9<br />
                                        [/series]
                                    </code>
                                </div>
                            </section>
                        </div>
                        <div className="p-10 border-t border-slate-800 bg-slate-900/50 flex justify-center">
                            <button onClick={() => setShowDocs(false)} className="px-16 py-4 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-500 transition-all">
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

export default ControlChartEditor;
