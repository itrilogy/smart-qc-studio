import React, { useState, useEffect, useRef } from 'react';
import { RadarData, RadarChartStyles, DEFAULT_RADAR_STYLES } from '../types';
import { INITIAL_RADAR_DSL } from '../constants';
import { Sparkles, HelpCircle, RotateCcw, Code, Settings2, ChevronRight, Palette, Layout, Loader2, X, Zap, Database, Trash2, Plus } from 'lucide-react';
import { generateLogicDSL, getAIStatus } from '../services/aiService';
import { QCToolType } from '../types';
import { createPortal } from 'react-dom';

interface RadarEditorProps {
    data: RadarData;
    styles: RadarChartStyles;
    onDataChange: (data: RadarData) => void;
    onStylesChange: (styles: RadarChartStyles) => void;
}

export const parseRadarDSL = (content: string, baseStyles: RadarChartStyles = DEFAULT_RADAR_STYLES) => {
    const lines = content.split('\n');
    const newStyles: RadarChartStyles = { ...baseStyles };
    const axes: any[] = [];
    const series: any[] = [];
    let title = baseStyles.title;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (trimmed.includes(':')) {
            const [keyPart, ...valParts] = trimmed.split(':');
            const key = keyPart.trim();
            const val = valParts.join(':').trim();

            if (key === 'Title') {
                title = val;
            } else if (key === 'StartAngle') {
                newStyles.startAngle = parseFloat(val);
            } else if (key === 'Clockwise') {
                newStyles.clockwise = val.toLowerCase() === 'true';
            } else if (key === 'Closed') {
                newStyles.isClosed = val.toLowerCase() === 'true';
            } else if (key === 'Standardize') {
                newStyles.standardize = val.toLowerCase() === 'true';
            } else if (key === 'ShowAreaScore') {
                newStyles.showAreaScore = val.toLowerCase() === 'true';
            } else if (key === 'ShowSimilarity') {
                newStyles.showSimilarity = val.toLowerCase() === 'true';
            } else if (key === 'Axis') {
                const parts = val.split(',').map(s => s.trim());
                if (parts.length >= 2) {
                    axes.push({
                        name: parts[0],
                        max: parseFloat(parts[1]),
                        min: parts[2] ? parseFloat(parts[2]) : 0
                    });
                }
            } else if (key === 'Series') {
                const parts = val.split(/,(?![^\[]*\])/).map(s => s.trim());
                if (parts.length >= 2) {
                    const name = parts[0];
                    const valuesStr = parts[1].replace(/[\[\]]/g, '');
                    const values = valuesStr.split(',').map(v => parseFloat(v.trim()));
                    const color = parts[2] && parts[2] !== 'null' ? parts[2] : undefined;
                    const opacity = parts[3] ? parseFloat(parts[3]) : undefined;
                    series.push({ name, values, color, fillOpacity: opacity });
                }
            }
        }
    });

    return {
        data: { title, axes, series },
        styles: { ...newStyles, title }
    };
};

const RadarEditor: React.FC<RadarEditorProps> = ({ data, styles, onDataChange, onStylesChange }) => {
    const [dsl, setDsl] = useState(INITIAL_RADAR_DSL);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [engineName, setEngineName] = useState('DeepSeek');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    const isInitialized = useRef(false);
    useEffect(() => {
        if (!isInitialized.current) {
            if (data.axes.length === 0) {
                handleParseDSL(INITIAL_RADAR_DSL);
            } else {
                setDsl(generateDSLFromState(data, styles));
            }
            isInitialized.current = true;
        }
    }, [data]);

    const generateDSLFromState = (currData: RadarData, currStyles: RadarChartStyles) => {
        const lines: string[] = [];
        lines.push(`Title: ${currData.title}`);
        lines.push(``);
        lines.push(`// 统计分析控制`);
        lines.push(`Standardize: ${currStyles.standardize}`);
        lines.push(`ShowAreaScore: ${currStyles.showAreaScore}`);
        lines.push(`ShowSimilarity: ${currStyles.showSimilarity}`);
        lines.push(``);
        lines.push(`// 极坐标控制`);
        lines.push(`StartAngle: ${currStyles.startAngle}`);
        lines.push(`Clockwise: ${currStyles.clockwise}`);
        lines.push(`Closed: ${currStyles.isClosed}`);
        lines.push(``);
        lines.push(`// 轴定义`);
        currData.axes.forEach(axis => {
            lines.push(`Axis: ${axis.name}, ${axis.max}${axis.min !== undefined ? `, ${axis.min}` : ''}`);
        });
        lines.push(``);
        lines.push(`// 数据系列`);
        currData.series.forEach(s => {
            lines.push(`Series: ${s.name}, [${s.values.join(', ')}], ${s.color || 'null'}, ${s.fillOpacity || 'null'}`);
        });
        return lines.join('\n');
    };

    const handleParseDSL = (content: string) => {
        const { data: newData, styles: newStyles } = parseRadarDSL(content, styles);
        onDataChange(newData);
        onStylesChange(newStyles);
    };

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？')) {
            setDsl(INITIAL_RADAR_DSL);
            handleParseDSL(INITIAL_RADAR_DSL);
        }
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateLogicDSL(aiPrompt, QCToolType.RADAR);
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
        <div className="flex flex-col h-full bg-[#0f172a] text-white relative">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center border border-amber-500/30">
                            <Sparkles size={22} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white tracking-widest uppercase">雷达图分析引擎</h2>
                            <p className="text-[8px] text-slate-500 font-bold tracking-[0.2em] mt-1">RADAR ENGINE V2.0</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleReset} className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-amber-400 transition-all border border-slate-700">
                            <RotateCcw size={18} />
                        </button>
                        <button onClick={() => setShowDocs(true)} className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all border border-slate-700">
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>
                <nav className="flex bg-black/40 p-1.5 rounded-2xl border border-slate-800/50 gap-1">
                    {[
                        { id: 'manual', label: '手动编辑', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id as any)}
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
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-amber-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">基础配置</span>
                            </div>
                            <input
                                value={data.title}
                                onChange={e => {
                                    onDataChange({ ...data, title: e.target.value });
                                    onStylesChange({ ...styles, title: e.target.value });
                                }}
                                className="w-full h-10 px-4 bg-black/40 border border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
                                placeholder="图表标题"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase pl-1">网格层级: {styles.gridLevels}</label>
                                    <input type="range" min="1" max="10" value={styles.gridLevels} onChange={e => onStylesChange({ ...styles, gridLevels: parseInt(e.target.value) })} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase pl-1">起始角度: {styles.startAngle}°</label>
                                    <input type="range" min="-360" max="360" value={styles.startAngle} onChange={e => onStylesChange({ ...styles, startAngle: parseInt(e.target.value) })} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-amber-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">统计分析算子</span>
                            </div>
                            <div className="p-4 bg-black/30 rounded-2xl border border-slate-800/50 grid grid-cols-1 gap-4">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 uppercase tracking-wider">自动数据标准化</span>
                                    <input type="checkbox" checked={styles.standardize} onChange={e => onStylesChange({ ...styles, standardize: e.target.checked })} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-600 focus:ring-amber-500" />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 uppercase tracking-wider">展示面积评分</span>
                                    <input type="checkbox" checked={styles.showAreaScore} onChange={e => onStylesChange({ ...styles, showAreaScore: e.target.checked })} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-600 focus:ring-amber-500" />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 uppercase tracking-wider">相似性分析</span>
                                    <input type="checkbox" checked={styles.showSimilarity} onChange={e => onStylesChange({ ...styles, showSimilarity: e.target.checked })} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-600 focus:ring-amber-500" />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-amber-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">坐标与显示</span>
                            </div>
                            <div className="p-4 bg-black/30 rounded-2xl border border-slate-800/50 grid grid-cols-1 gap-4">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={styles.isClosed} onChange={e => onStylesChange({ ...styles, isClosed: e.target.checked })} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-600 focus:ring-amber-500" />
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 uppercase tracking-wider">多边形坐标系</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={styles.clockwise} onChange={e => onStylesChange({ ...styles, clockwise: e.target.checked })} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-600 focus:ring-amber-500" />
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 uppercase tracking-wider">顺时针方向</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input type="checkbox" checked={styles.showValues} onChange={e => onStylesChange({ ...styles, showValues: e.target.checked })} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-600 focus:ring-amber-500" />
                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-200 uppercase tracking-wider">显示数据拐点</span>
                                </label>
                            </div>
                        </div>

                        {/* Axis Management */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pl-2">
                                <div className="flex items-center gap-3">
                                    <ChevronRight size={14} className="text-amber-500" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">维度指标定义</span>
                                </div>
                                <button
                                    onClick={() => {
                                        const newAxes = [...data.axes, { name: `新指标 ${data.axes.length + 1}`, max: 100, min: 0 }];
                                        const newSeries = data.series.map(s => ({ ...s, values: [...s.values, 0] }));
                                        onDataChange({ ...data, axes: newAxes, series: newSeries });
                                    }}
                                    className="p-1.5 hover:bg-slate-800 rounded-lg text-amber-500 transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {data.axes.map((axis, idx) => (
                                    <div key={idx} className="group flex items-center gap-2 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <div className="flex-1 bg-black/40 border border-slate-800 rounded-xl px-3 h-10 flex items-center gap-2 group-hover:border-amber-500/30">
                                            <input
                                                value={axis.name}
                                                onChange={e => {
                                                    const newAxes = [...data.axes];
                                                    newAxes[idx] = { ...newAxes[idx], name: e.target.value };
                                                    onDataChange({ ...data, axes: newAxes });
                                                }}
                                                className="bg-transparent text-[10px] font-bold text-slate-200 outline-none flex-1"
                                                placeholder="指标名称"
                                            />
                                            <div className="h-4 w-px bg-slate-800" />
                                            <input
                                                type="number"
                                                value={axis.min || 0}
                                                onChange={e => {
                                                    const newAxes = [...data.axes];
                                                    newAxes[idx] = { ...newAxes[idx], min: parseFloat(e.target.value) };
                                                    onDataChange({ ...data, axes: newAxes });
                                                }}
                                                className="bg-transparent text-[10px] font-bold text-slate-500 outline-none w-10 text-center"
                                                placeholder="MIN"
                                            />
                                            <div className="h-4 w-px bg-slate-800" />
                                            <input
                                                type="number"
                                                value={axis.max}
                                                onChange={e => {
                                                    const newAxes = [...data.axes];
                                                    newAxes[idx] = { ...newAxes[idx], max: parseFloat(e.target.value) };
                                                    onDataChange({ ...data, axes: newAxes });
                                                }}
                                                className="bg-transparent text-[10px] font-bold text-amber-500 outline-none w-10 text-center"
                                                placeholder="MAX"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (data.axes.length <= 3) return;
                                                const newAxes = data.axes.filter((_, i) => i !== idx);
                                                const newSeries = data.series.map(s => ({ ...s, values: s.values.filter((_, i) => i !== idx) }));
                                                onDataChange({ ...data, axes: newAxes, series: newSeries });
                                            }}
                                            className="w-10 h-10 flex items-center justify-center bg-slate-900/50 border border-slate-800 rounded-xl text-slate-700 hover:text-red-400 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Series Management */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between pl-2">
                                <div className="flex items-center gap-3">
                                    <ChevronRight size={14} className="text-amber-500" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">数据系列管理</span>
                                </div>
                                <button
                                    onClick={() => {
                                        const newSeries = [...data.series, {
                                            name: `新系列 ${data.series.length + 1}`,
                                            values: data.axes.map(() => 0),
                                            color: '#fbbf24',
                                            fillOpacity: 0.3
                                        }];
                                        onDataChange({ ...data, series: newSeries });
                                    }}
                                    className="p-1.5 hover:bg-slate-800 rounded-lg text-amber-500 transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {data.series.map((s, idx) => (
                                    <div key={idx} className="flex flex-col bg-black/40 rounded-xl border border-slate-800 overflow-hidden group">
                                        <div className="flex items-center justify-between px-4 h-12 border-b border-slate-800/50">
                                            <div className="flex items-center gap-3">
                                                <input type="color" value={s.color || '#3b82f6'} onChange={e => {
                                                    const newSeries = [...data.series];
                                                    newSeries[idx] = { ...newSeries[idx], color: e.target.value };
                                                    onDataChange({ ...data, series: newSeries });
                                                }} className="w-6 h-6 bg-transparent cursor-pointer rounded overflow-hidden border-none" />
                                                <input
                                                    value={s.name}
                                                    onChange={e => {
                                                        const newSeries = [...data.series];
                                                        newSeries[idx] = { ...newSeries[idx], name: e.target.value };
                                                        onDataChange({ ...data, series: newSeries });
                                                    }}
                                                    className="bg-transparent text-[10px] font-bold text-slate-200 outline-none"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-2 mr-4">
                                                    <span className="text-[8px] text-slate-500 font-black">透明度</span>
                                                    <input type="range" min="0" max="1" step="0.1" value={s.fillOpacity || 0.3} onChange={e => {
                                                        const newSeries = [...data.series];
                                                        newSeries[idx] = { ...newSeries[idx], fillOpacity: parseFloat(e.target.value) };
                                                        onDataChange({ ...data, series: newSeries });
                                                    }} className="w-12 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newSeries = data.series.filter((_, i) => i !== idx);
                                                        onDataChange({ ...data, series: newSeries });
                                                    }}
                                                    className="p-2 text-slate-700 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-3 grid grid-cols-3 gap-2 bg-black/20">
                                            {data.axes.map((axis, aIdx) => (
                                                <div key={aIdx} className="space-y-1">
                                                    <label className="text-[8px] font-black text-slate-600 uppercase truncate block">{axis.name}</label>
                                                    <input
                                                        type="number"
                                                        value={s.values[aIdx]}
                                                        onChange={e => {
                                                            const newSeries = [...data.series];
                                                            const newValues = [...newSeries[idx].values];
                                                            newValues[aIdx] = parseFloat(e.target.value);
                                                            newSeries[idx] = { ...newSeries[idx], values: newValues };
                                                            onDataChange({ ...data, series: newSeries });
                                                        }}
                                                        className="w-full h-7 px-2 bg-slate-900/50 border border-slate-800 rounded-lg text-[10px] font-bold text-amber-500 outline-none focus:border-amber-500/50"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-amber-900/10 border border-amber-800/20 rounded-2xl">
                            <p className="text-[9px] text-amber-400 font-bold leading-relaxed uppercase">
                                💡 进阶提示：当变量超过 15 个时，雷达图可能会显得拥挤，建议精简指标或关注前 5 个关键特征。
                            </p>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <textarea
                            value={dsl}
                            onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }}
                            className="flex-1 w-full bg-black/40 text-amber-100 p-8 font-mono text-[11px] leading-relaxed border border-slate-800 rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all resize-none shadow-inner custom-scrollbar"
                            placeholder="输入 DSL 指令..."
                            spellCheck={false}
                        />
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">智能评估描述</span>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={e => setAiPrompt(e.target.value)}
                                className="w-full h-56 bg-slate-900/50 text-slate-200 p-8 text-sm leading-relaxed border border-slate-800 rounded-[2rem] focus:outline-none focus:border-amber-500 transition-all resize-none shadow-inner"
                                placeholder="输入评估指标和数值，例如：'对比 A 和 B 产品的 5 个维度性能，维度包括：价格、功能、美观度、易用性、稳定性'..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-slate-800' : 'bg-amber-600 hover:bg-amber-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-amber-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在精准推演...</span>
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
                                    您可以输入如“对比两款手机的硬件参数”或“部门月度 KPI 达成情况”等核心描述。AI 将自动识别维度轴与数值序列，为您生成具备专业配色的雷达图 DSL 配置。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-[#020617]/90 backdrop-blur-3xl">
                    <div className="bg-[#0f172a] w-[800px] max-h-[85vh] rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="px-10 py-8 flex flex-col border-b border-slate-800 shrink-0 gap-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-600/20 rounded-2xl border border-amber-500/30">
                                        <Layout size={24} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">雷达图知识库</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Radar Knowledge Base V2.1</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDocs(false)} className="p-3 hover:bg-slate-800 rounded-xl transition-all text-slate-500 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <nav className="flex bg-black/40 p-1 rounded-2xl border border-slate-800/80 w-fit">
                                {[
                                    { id: 'dsl', label: 'DSL 规范说明' },
                                    { id: 'logic', label: '分析逻辑与指南' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setDocTab(t.id as any)}
                                        className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar text-slate-300">
                            {docTab === 'dsl' ? (
                                <div className="space-y-12">
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest border-b border-amber-900/50 pb-2">1. 基础配置说明 (Global Configuration)</h4>
                                        <div className="grid grid-cols-[180px_1fr] gap-4 text-xs font-mono bg-slate-900/50 p-6 rounded-2xl border border-slate-800 leading-relaxed">
                                            <span className="text-amber-300 font-bold">Title:</span>
                                            <span className="text-slate-400">图表名称。示例: `Title: 综合性能分析`</span>

                                            <span className="text-amber-300 font-bold">Standardize:</span>
                                            <span className="text-slate-400">布尔值。指示是否将所有轴数据标准化到 0-1 范围。</span>

                                            <span className="text-amber-300 font-bold">ShowAreaScore:</span>
                                            <span className="text-slate-400">布尔值。显示基于多边形面积的综合得分。</span>

                                            <span className="text-amber-300 font-bold">ShowSimilarity:</span>
                                            <span className="text-slate-400">布尔值。计算并显示各系列与首个系列的相似度。</span>

                                            <span className="text-amber-300 font-bold">StartAngle:</span>
                                            <span className="text-slate-400">初始偏置角度。`-90` 代表顶部 12 点钟方向。</span>

                                            <span className="text-amber-300 font-bold">Closed:</span>
                                            <span className="text-slate-400">布尔值。网格线显示为多边形 (true) 或圆形 (false)。</span>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-blue-900/50 pb-2">2. 指标定义 (Axis Definitions)</h4>
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                                            <div className="font-mono text-xs text-amber-200 bg-black/40 p-4 rounded-xl">
                                                Axis: 指标名称, 最大值, [最小值]
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                雷达图的每一个辐射轴。如果不指定最小值，默认从 0 开始。
                                                <br /><span className="italic">示例: Axis: 价格, 5000, 1000</span>
                                            </p>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest border-b border-emerald-900/50 pb-2">3. 数据系列 (Data Series)</h4>
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                                            <div className="font-mono text-xs text-amber-200 bg-black/40 p-4 rounded-xl">
                                                Series: 系列名称, [数值1, 数值2, ...], [颜色], [透明度]
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                数据系列的名称、对应的轴数值列表、可选的 HEX 颜色以及填充透明度（0-1）。
                                                <br /><span className="italic">示例: Series: 产品A, [80, 95, 70], #fbbf24, 0.4</span>
                                            </p>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-cyan-400 uppercase tracking-widest border-b border-cyan-900/50 pb-2">综合得分分析 (Area Score Methodology)</h4>
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4 text-xs leading-relaxed">
                                            <p>雷达图得分通过计算数据点围成的多边形面积来得出权重。与简单的加权平均不同，面积评分更能反映指标之间的平衡性。</p>
                                            <div className="bg-black/40 p-4 rounded-xl font-mono text-[10px] text-slate-500">
                                                公式: Area = 1/2 * Σ |xᵢ * yᵢ₊₁ - xᵢ₊₁ * yᵢ|
                                            </div>
                                            <p className="text-slate-400">面积越大，代表该对象在多维度上的综合表现越强。如果某一项指标极低，会导致整体面积锐减，即使其他指标很高。</p>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-purple-400 uppercase tracking-widest border-b border-purple-900/50 pb-2">相似度检测 (Similarity Analysis)</h4>
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4 text-xs leading-relaxed">
                                            <p>通过计算欧氏距离 (Euclidean Distance) 来衡量两个对象在所有维度上的“亲疏关系”。</p>
                                            <ul className="list-disc list-inside text-slate-400 space-y-2">
                                                <li><strong>100%</strong>: 完全重合。</li>
                                                <li><strong>&gt;80%</strong>: 极度相似，属于同一梯队或具有相似的优劣势结构。</li>
                                                <li><strong>&lt;50%</strong>: 特征截然不同，通常代表了两种完全不同的战略定位。</li>
                                            </ul>
                                        </div>
                                    </section>

                                    <div className="p-6 bg-amber-900/10 border border-amber-800/20 rounded-3xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap size={14} className="text-amber-500" />
                                            <span className="text-[10px] font-black uppercase text-amber-500">使用提示</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium italic mb-2">
                                            "当需要对比多个竞品在市场上的重合度时，相似度指标能快速识别出直接竞争对手与差异化产品。"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-10 border-t border-slate-800 bg-slate-900/50 flex justify-center shrink-0">
                            <button
                                onClick={() => setShowDocs(false)}
                                className="px-16 py-4 bg-amber-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-amber-500 transition-all"
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

export default RadarEditor;
