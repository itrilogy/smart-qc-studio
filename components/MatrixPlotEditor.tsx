import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MatrixPlotData, MatrixPlotStyles, DEFAULT_MATRIX_PLOT_STYLES, QCToolType } from '../types';
import { INITIAL_MATRIX_PLOT_DSL } from '../constants';
import { Grid3X3, Sparkles, HelpCircle, X, Loader2, Database, Code, RotateCcw } from 'lucide-react';
import { generateLogicDSL, getAIStatus } from '../services/aiService';

interface MatrixPlotEditorProps {
    data: MatrixPlotData;
    styles: MatrixPlotStyles;
    onDataChange: (data: MatrixPlotData) => void;
    onStylesChange: (styles: MatrixPlotStyles) => void;
}

export const parseMatrixPlotDSL = (content: string): { data: MatrixPlotData, styles: MatrixPlotStyles } => {
    const lines = content.split('\n');
    const newStyles: MatrixPlotStyles = { ...DEFAULT_MATRIX_PLOT_STYLES };
    const newData: MatrixPlotData = {
        title: '图矩阵相关性分析',
        mode: 'matrix',
        yDimensions: [],
        xDimensions: [],
        showSmoother: false,
        smootherMethod: 'Lowess',
        data: []
    };

    let isDataBlock = false;
    let isStylesBlock = false;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        // Block switches
        if (trimmed.startsWith('Data:')) {
            isDataBlock = true;
            isStylesBlock = false;
            return;
        }
        if (trimmed.startsWith('Styles:')) {
            isDataBlock = false;
            isStylesBlock = true;
            return;
        }

        // Styles Block Parsing
        if (isStylesBlock && trimmed.startsWith('-')) {
            const content = trimmed.substring(1).trim();
            const [key, ...valParts] = content.split(':').map(s => s.trim());
            const val = valParts.join(':').trim();
            if (key && val) {
                switch (key) {
                    case 'DisplayMode': newStyles.displayMode = val as any; break;
                    case 'Diagonal': newStyles.diagonal = val as any; break;
                    case 'PointSize': newStyles.pointSize = parseFloat(val); break;
                    case 'PointOpacity': newStyles.pointOpacity = parseFloat(val); break;
                    case 'ColorPalette': newStyles.colorPalette = val as any; break;
                }
            }
            return;
        }

        // Data Block Parsing (Fixed)
        if (isDataBlock && trimmed.startsWith('-')) {
            const content = trimmed.substring(1).trim();
            if (content.startsWith('{')) {
                // YAML-lite object
                try {
                    const obj: any = {};
                    const pairs = content.replace(/[{}]/g, '').split(',');
                    pairs.forEach(p => {
                        const [k, v] = p.split(':').map(s => s.trim());
                        if (k && v) {
                            const num = parseFloat(v);
                            obj[k] = isNaN(num) ? v.replace(/['"]/g, '') : num;
                        }
                    });
                    newData.data.push(obj);
                } catch (e) {
                    console.warn('Failed to parse data object:', content);
                }
            } else {
                // CSV-like
                const vals = content.split(',').map(s => s.trim());
                const obj: any = {};
                const dims = newData.mode === 'matrix' ? newData.xDimensions : [...newData.yDimensions, ...newData.xDimensions];
                vals.forEach((v, i) => {
                    if (dims[i]) {
                        const num = parseFloat(v);
                        obj[dims[i]] = isNaN(num) ? v : num;
                    }
                });
                if (Object.keys(obj).length > 0) newData.data.push(obj);
            }
            return;
        }

        // Top-level Metadata
        if (trimmed.includes(':') && !trimmed.startsWith('-')) {
            const [keyPart, ...valParts] = trimmed.split(':');
            const key = keyPart.trim();
            const val = valParts.join(':').trim();

            switch (key) {
                case 'Title':
                    newData.title = val;
                    newStyles.title = val;
                    break;
                case 'Mode':
                    newData.mode = val.toLowerCase() === 'yvsx' ? 'yvsx' : 'matrix';
                    break;
                case 'Dimensions':
                    const dims = val.replace(/[\[\]]/g, '').split(',').map(s => s.trim());
                    newData.xDimensions = dims;
                    newData.yDimensions = dims;
                    break;
                case 'X-Dimensions':
                    newData.xDimensions = val.replace(/[\[\]]/g, '').split(',').map(s => s.trim());
                    break;
                case 'Y-Dimensions':
                    newData.yDimensions = val.replace(/[\[\]]/g, '').split(',').map(s => s.trim());
                    break;
                case 'Group':
                    newData.groupVariable = val;
                    break;
                case 'Smoother':
                    const sVal = val.toLowerCase();
                    if (sVal === 'true') {
                        newData.showSmoother = true;
                        newData.smootherMethod = 'Lowess';
                    } else if (sVal === 'false') {
                        newData.showSmoother = false;
                    } else if (sVal === 'lowess') {
                        newData.showSmoother = true;
                        newData.smootherMethod = 'Lowess';
                    } else if (sVal === 'movingaverage') {
                        newData.showSmoother = true;
                        newData.smootherMethod = 'MovingAverage';
                    }
                    break;
            }
        }
    });

    return { data: newData, styles: newStyles };
};

export const generateMatrixPlotDSL = (data: MatrixPlotData, styles: MatrixPlotStyles): string => {
    let dsl = `Title: ${data.title}\n`;
    dsl += `Mode: ${data.mode === 'yvsx' ? 'YvsX' : 'Matrix'}\n`;

    if (data.mode === 'matrix') {
        dsl += `Dimensions: [${data.xDimensions.join(', ')}]\n`;
    } else {
        dsl += `Y-Dimensions: [${data.yDimensions.join(', ')}]\n`;
        dsl += `X-Dimensions: [${data.xDimensions.join(', ')}]\n`;
    }

    if (data.groupVariable) dsl += `Group: ${data.groupVariable}\n`;
    if (data.showSmoother) {
        dsl += `Smoother: ${data.smootherMethod || 'Lowess'}\n`;
    } else {
        dsl += `Smoother: false\n`;
    }

    dsl += `Data:\n`;
    data.data.forEach(row => {
        const fields = Object.entries(row)
            .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
            .join(', ');
        dsl += `- { ${fields} }\n`;
    });

    dsl += `\nStyles:\n`;
    dsl += `- DisplayMode: ${styles.displayMode}\n`;
    dsl += `- Diagonal: ${styles.diagonal}\n`;
    dsl += `- PointSize: ${styles.pointSize}\n`;
    dsl += `- PointOpacity: ${styles.pointOpacity}\n`;
    dsl += `- ColorPalette: ${styles.colorPalette}\n`;

    return dsl;
};

// SAMPLES removed as requested

const MatrixPlotEditor: React.FC<MatrixPlotEditorProps> = ({ data, styles, onDataChange, onStylesChange }) => {
    const [localDsl, setLocalDsl] = useState(INITIAL_MATRIX_PLOT_DSL);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [engineName, setEngineName] = useState('DeepSeek');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    // Sync DSL from data/styles when in manual tab
    useEffect(() => {
        if (activeTab !== 'dsl') {
            setLocalDsl(generateMatrixPlotDSL(data, styles));
        }
    }, [data, styles, activeTab]);

    const handleDSLChange = (val: string) => {
        setLocalDsl(val);
        try {
            const { data: d, styles: s } = parseMatrixPlotDSL(val);
            onDataChange(d);
            onStylesChange(s);
            setError(null);
        } catch (e) {
            setError('DSL 解析错误');
        }
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateLogicDSL(aiPrompt, QCToolType.MATRIX_PLOT);
            handleDSLChange(result);
            setActiveTab('dsl');
        } catch (err) {
            setError('AI 生成失败');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？当前所有修改将丢失。')) {
            try {
                const { data: d, styles: s } = parseMatrixPlotDSL(INITIAL_MATRIX_PLOT_DSL);
                onDataChange(d);
                onStylesChange(s);
                setLocalDsl(INITIAL_MATRIX_PLOT_DSL);
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-white overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <Grid3X3 size={22} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white tracking-widest uppercase">图矩阵引擎</h2>
                            <p className="text-[8px] text-slate-500 font-bold tracking-[0.2em] mt-1">MATRIX PLOT V1.0</p>
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
                        <button
                            onClick={() => setShowDocs(true)}
                            className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all border border-slate-700"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex bg-black/40 p-1.5 rounded-2xl border border-slate-800/50 gap-1">
                    {[
                        { id: 'manual', label: '配置参数', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'manual' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Basic Config */}
                        <div className="p-6 bg-black/30 rounded-[2rem] border border-slate-800/50 space-y-6 text-slate-300">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">核心配置</span>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center gap-4">
                                    <div className="flex-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">图表标题</span>
                                        <input
                                            value={data.title}
                                            onChange={e => onDataChange({ ...data, title: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="self-end pb-[2px]">
                                        <button
                                            onClick={() => {
                                                const modes: any[] = ['Full', 'Lower', 'Upper'];
                                                const idx = modes.indexOf(styles.displayMode);
                                                onStylesChange({ ...styles, displayMode: modes[(idx + 1) % modes.length] });
                                            }}
                                            className="h-[38px] px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all flex items-center gap-2 whitespace-nowrap shadow-lg active:scale-95"
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest">范围:</span>
                                            <span className="text-xs font-bold text-blue-400">
                                                {styles.displayMode === 'Full' ? '全矩阵' : styles.displayMode === 'Lower' ? '下三角' : '上三角'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">矩阵模式</span>
                                    <select
                                        value={data.mode}
                                        onChange={e => onDataChange({ ...data, mode: e.target.value as any })}
                                        className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none"
                                    >
                                        <option value="matrix">变量矩阵</option>
                                        <option value="yvsx">每个 Y 对每个 X</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">趋势线</span>
                                    <div className="flex items-center justify-between h-10 px-4 bg-slate-900/30 border border-slate-800/50 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={data.showSmoother}
                                                onChange={e => onDataChange({ ...data, showSmoother: e.target.checked })}
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-xs text-slate-400">拟合</span>
                                        </div>
                                        {data.showSmoother && (
                                            <button
                                                onClick={() => {
                                                    const methods = ['Lowess', 'MovingAverage'];
                                                    const idx = methods.indexOf(data.smootherMethod || 'Lowess');
                                                    onDataChange({ ...data, smootherMethod: methods[(idx + 1) % methods.length] as any });
                                                }}
                                                className="text-[9px] bg-slate-800 hover:bg-slate-700 text-blue-400/80 px-1.5 py-0.5 rounded border border-slate-700/50 transition-colors uppercase font-bold"
                                            >
                                                {data.smootherMethod === 'MovingAverage' ? '滑动平均' : 'Lowess'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {(() => {
                            const allKeys = new Set<string>();
                            data.data.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
                            const keys = Array.from(allKeys);

                            const toggleDim = (dim: string, type: 'x' | 'y') => {
                                if (data.mode === 'matrix') {
                                    const newDims = data.xDimensions.includes(dim)
                                        ? data.xDimensions.filter(d => d !== dim)
                                        : [...data.xDimensions, dim];
                                    onDataChange({ ...data, xDimensions: newDims, yDimensions: newDims });
                                } else {
                                    if (type === 'x') {
                                        const newDims = data.xDimensions.includes(dim)
                                            ? data.xDimensions.filter(d => d !== dim)
                                            : [...data.xDimensions, dim];
                                        onDataChange({ ...data, xDimensions: newDims });
                                    } else {
                                        const newDims = data.yDimensions.includes(dim)
                                            ? data.yDimensions.filter(d => d !== dim)
                                            : [...data.yDimensions, dim];
                                        onDataChange({ ...data, yDimensions: newDims });
                                    }
                                }
                            };

                            return (
                                <div className="space-y-4">
                                    {data.mode === 'matrix' ? (
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">分析变量</span>
                                            <div className="flex flex-wrap gap-2 p-3 bg-slate-900/10 border border-slate-800/40 rounded-xl min-h-[50px]">
                                                {keys.map(k => (
                                                    <button
                                                        key={k}
                                                        onClick={() => toggleDim(k, 'x')}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${data.xDimensions.includes(k)
                                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                                                            }`}
                                                    >
                                                        {k}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase">Y 变量</span>
                                                <div className="flex flex-wrap gap-2 p-3 bg-slate-900/10 border border-slate-800/40 rounded-xl min-h-[50px]">
                                                    {keys.map(k => (
                                                        <button
                                                            key={k}
                                                            onClick={() => toggleDim(k, 'y')}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${data.yDimensions.includes(k)
                                                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                                                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                                                                }`}
                                                        >
                                                            {k}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-bold text-blue-500 uppercase">X 变量</span>
                                                <div className="flex flex-wrap gap-2 p-3 bg-slate-900/10 border border-slate-800/40 rounded-xl min-h-[50px]">
                                                    {keys.map(k => (
                                                        <button
                                                            key={k}
                                                            onClick={() => toggleDim(k, 'x')}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${data.xDimensions.includes(k)
                                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                                                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                                                                }`}
                                                        >
                                                            {k}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {data.mode === 'matrix' && (
                                        <div className="space-y-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">对角线展示</span>
                                            <div className="flex flex-wrap gap-2 p-3 bg-slate-900/10 border border-slate-800/40 rounded-xl min-h-[50px]">
                                                {[
                                                    { id: 'Histogram', label: '直方图' },
                                                    { id: 'Boxplot', label: '箱线图' },
                                                    { id: 'Label', label: '变量名' },
                                                    { id: 'None', label: '无' }
                                                ].map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => onStylesChange({ ...styles, diagonal: opt.id as any })}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${styles.diagonal === opt.id
                                                            ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/20'
                                                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'dsl' && (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <textarea
                            value={localDsl}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="flex-1 w-full bg-black/40 text-blue-100 p-8 font-mono text-[11px] leading-relaxed border border-slate-800 rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none custom-scrollbar shadow-inner"
                            spellCheck={false}
                        />
                        {error && <p className="text-red-500 text-[10px] font-bold px-4">{error}</p>}
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">智能图矩阵推演</span>
                                <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]" />
                                    <span className="text-[9px] font-black text-blue-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full h-64 p-8 bg-slate-900/50 text-slate-200 text-sm leading-relaxed border border-slate-800 rounded-[2rem] focus:outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                                placeholder="输入分析需求，例如：'分析温度、压力与产量的关系，区分高/低速两组数据'..."
                            />

                            <button
                                onClick={handleGenerateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-slate-800' : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-blue-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">AI 推理中...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            <div className="p-8 bg-blue-900/10 border border-blue-800/20 rounded-3xl space-y-4">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">推理提示</p>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                    您可以描述多个变量及其数据样本，AI 将自动识别分析维度并推荐合适的布局模式（全矩阵或 Y 对 X）。例如：“对比分析 10 组产品的厚度与强度关系”。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Docs Modal */}
            {showDocs && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-[#020617]/90 backdrop-blur-3xl">
                    <div className="bg-[#0f172a] w-[800px] max-h-[85vh] rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
                        <div className="px-10 py-8 flex flex-col border-b border-slate-800 shrink-0 gap-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30">
                                        <Grid3X3 size={24} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">图矩阵知识库</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Matrix Plot Knowledge Base V1.0</p>
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
                                        className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar text-slate-300">
                            {docTab === 'dsl' ? (
                                <div className="space-y-12">
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-blue-900/50 pb-2">1. 基础配置元数据</h4>
                                        <div className="grid grid-cols-[180px_1fr] gap-4 text-xs font-mono bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                            <span className="text-blue-300 font-bold">Title:</span>
                                            <span className="text-slate-400">图表主标题，支持中文。</span>

                                            <span className="text-blue-300 font-bold">Mode:</span>
                                            <span className="text-slate-400">布局方案 - Matrix (变量矩阵) 或 YvsX (交叉矩阵)。</span>

                                            <span className="text-blue-300 font-bold">Dimensions:</span>
                                            <span className="text-slate-400">Matrix 模式下的分析变量列表，如 [Temp, Press, Yield]。</span>

                                            <span className="text-blue-300 font-bold">X/Y-Dimensions:</span>
                                            <span className="text-slate-400">YvsX 模式下的轴定义，支持多变量对齐。</span>

                                            <span className="text-blue-300 font-bold">Group:</span>
                                            <span className="text-slate-400">分类变量名，系统将自动分配颜色和形状区分群组。</span>

                                            <span className="text-blue-300 font-bold">Smoother:</span>
                                            <span className="text-slate-400">平滑算法 (Lowess/MovingAverage) 或 false 关闭。</span>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-blue-900/50 pb-2">2. 数据样本定义</h4>
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                                            <p className="text-xs">数据块紧跟在元数据之后，使用 YAML-lite 格式定义：</p>
                                            <pre className="text-[10px] font-mono text-emerald-400 bg-black/40 p-4 rounded-xl">
                                                {`Data:
- { Temp: 200, Press: 10.2, Group: "A" }
- { Temp: 210, Press: 11.5, Group: "A" }
- { Temp: 220, Press: 12.1, Group: "B" }`}
                                            </pre>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-blue-900/50 pb-2">3. 视觉样式控制 (Styles)</h4>
                                        <div className="grid grid-cols-[180px_1fr] gap-4 text-xs font-mono bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                            <span className="text-amber-400 font-bold">DisplayMode:</span>
                                            <span className="text-slate-400">Full (全矩阵), Lower (左下三角), Upper (右上三角)。</span>

                                            <span className="text-amber-400 font-bold">Diagonal:</span>
                                            <span className="text-slate-400">对角线内容 - Histogram (直方图), Boxplot (箱线图), Label (仅名称)。</span>

                                            <span className="text-amber-400 font-bold">PointSize:</span>
                                            <span className="text-slate-400">散点像素大小 (默认 4-6)。</span>

                                            <span className="text-amber-400 font-bold">ColorPalette:</span>
                                            <span className="text-slate-400">配色方案 - Industrial (稳重), Vibrant (明亮)。</span>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <section className="space-y-8">
                                        <div>
                                            <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-blue-900/50 pb-2 mb-4">变量相关性分析价值</h4>
                                            <p className="text-xs leading-relaxed text-slate-400">
                                                图矩阵（Matrix Plot）是多元统计分析中核心的可视化工具，用于在单一视野内展示多变量间的两两交互关系。它不仅能识别线性相关，更能通过模式识别发现非线性规律和群组聚类。
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                <h5 className="text-[10px] font-black text-white uppercase tracking-widest">Lowess 平滑逻辑</h5>
                                                <p className="text-[10px] leading-relaxed text-slate-400">
                                                    采用局部加权散点平滑（Locally Weighted Regression），基于 Tri-cube 权重函数。与普通线性回归不同，它能捕捉局部趋势，对孤立点具有更强的鲁棒性，是专业质量控制软件（如 Minitab）的标准配置。
                                                </p>
                                            </div>
                                            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                <h5 className="text-[10px] font-black text-white uppercase tracking-widest">分类特征识别</h5>
                                                <p className="text-[10px] leading-relaxed text-slate-400">
                                                    通过引入 Group 变量，系统将自动映射不同的颜色和几何形状。这对于识别“分层数据”至关重要——有时整体看起来不相关的变量，在特定层别下却呈现极强的规律性。
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-8 bg-blue-600/10 rounded-3xl border border-blue-500/20">
                                            <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-4">分析建议 (Analytic Strategy)</h4>
                                            <ul className="text-xs space-y-4 text-slate-300">
                                                <li className="flex gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                                    <span><strong className="text-white">观察对角线：</strong> 利用直方图确认各变量的分布形态（是否正态、有无双峰）。</span>
                                                </li>
                                                <li className="flex gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                                    <span><strong className="text-white">寻找异常聚类：</strong> 在各个散点格中寻找远离主群体的点，这往往标志着制程失控。</span>
                                                </li>
                                                <li className="flex gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                                    <span><strong className="text-white">利用平滑线：</strong> 当散点较为杂乱时，切换至 Lowess 平滑线观察整体的曲率变化。</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>

                        <div className="p-10 border-t border-slate-800 bg-slate-900/50 flex justify-center shrink-0">
                            <button
                                onClick={() => setShowDocs(false)}
                                className="px-16 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all"
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

export default MatrixPlotEditor;
