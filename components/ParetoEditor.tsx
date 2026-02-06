import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus, Trash2, Sparkles, Database, Code,
    ChevronRight, BarChart3, Sliders, HelpCircle, X, Loader2, RotateCcw, Zap
} from 'lucide-react';
import { ParetoItem, ParetoChartStyles, DEFAULT_PARETO_STYLES } from '../types';
import { generateParetoDSL, getAIStatus } from '../services/aiService';
import { INITIAL_PARETO_DATA, INITIAL_PARETO_DSL } from '../constants';

interface Props {
    data: ParetoItem[];
    styles: ParetoChartStyles;
    onUpdate: (data: ParetoItem[], styles: ParetoChartStyles) => void;
    showLine: boolean;
    onShowLineChange: (val: boolean) => void;
}

export const parseParetoDSL = (content: string, baseStyles: ParetoChartStyles = DEFAULT_PARETO_STYLES) => {
    const lines = content.split('\n');
    const newItems: ParetoItem[] = [];
    const newStyles: ParetoChartStyles = { ...baseStyles };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const titleMatch = trimmed.match(/^Title:\s*(.+)/);
        if (titleMatch) { newStyles.title = titleMatch[1]; return; }

        const decimalMatch = trimmed.match(/^Decimals:\s*(\d+)/);
        if (decimalMatch) { newStyles.decimals = parseInt(decimalMatch[1]); return; }

        const colorMatch = trimmed.match(/Color\[(Bar|Line|MarkLine|Title)\]:\s*(#[0-9a-fA-F]+)/);
        if (colorMatch) {
            const key = colorMatch[1].charAt(0).toLowerCase() + colorMatch[1].slice(1) + 'Color';
            (newStyles as any)[key] = colorMatch[2];
            return;
        }

        const fontMatch = trimmed.match(/Font\[(Title|Base|Bar|Line)\]:\s*(\d+)/);
        if (fontMatch) {
            const key = fontMatch[1].charAt(0).toLowerCase() + fontMatch[1].slice(1) + 'FontSize';
            (newStyles as any)[key] = parseInt(fontMatch[2]);
            return;
        }

        const itemMatch = trimmed.match(/^-\s*(.+):\s*(\d+)/);
        if (itemMatch) {
            newItems.push({ id: Math.random().toString(36).substr(2, 9), name: itemMatch[1].trim(), value: parseInt(itemMatch[2]) });
        }
    });

    return { items: newItems, styles: newStyles };
};

export const ParetoEditor: React.FC<Props> = ({
    data, styles, onUpdate, showLine, onShowLineChange
}) => {
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [dsl, setDsl] = useState('');
    const [aiInput, setAiInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [engineName, setEngineName] = useState('DeepSeek');

    React.useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    // 初始同步 DSL
    React.useEffect(() => {
        setDsl(generateDSL(data, styles));
    }, []);

    function generateDSL(items: ParetoItem[], s: ParetoChartStyles) {
        if (!Array.isArray(items)) return '';
        let lines: string[] = [];
        if (s.title) lines.push(`Title: ${s.title}`);
        if (s.titleColor) lines.push(`Color[Title]: ${s.titleColor}`);
        if (s.barColor) lines.push(`Color[Bar]: ${s.barColor}`);
        if (s.lineColor) lines.push(`Color[Line]: ${s.lineColor}`);
        if (s.markLineColor) lines.push(`Color[MarkLine]: ${s.markLineColor}`);
        if (s.decimals !== undefined) lines.push(`Decimals: ${s.decimals}`);
        if (s.titleFontSize) lines.push(`Font[Title]: ${s.titleFontSize}`);
        if (s.baseFontSize) lines.push(`Font[Base]: ${s.baseFontSize}`);
        if (s.barFontSize) lines.push(`Font[Bar]: ${s.barFontSize}`);
        if (s.lineFontSize) lines.push(`Font[Line]: ${s.lineFontSize}`);

        lines.push(''); // 空行分隔

        items.forEach(i => lines.push(`- ${i.name}: ${i.value}`));
        return lines.join('\n');
    }

    const handleTabChange = (tab: 'manual' | 'dsl' | 'ai') => {
        if (tab === 'dsl') setDsl(generateDSL(data, styles));
        setActiveTab(tab);
    };

    const handleParseDSL = (content: string) => {
        const { items: newItems, styles: newStyles } = parseParetoDSL(content, styles);
        if (newItems.length > 0) {
            onUpdate(newItems, newStyles);
        } else {
            onUpdate(data, newStyles);
        }
    };

    const generateAiData = async () => {
        if (!aiInput.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateParetoDSL(aiInput);
            setDsl(result);
            handleParseDSL(result);
            setActiveTab('dsl');
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？当前所有修改将丢失。')) {
            setDsl(INITIAL_PARETO_DSL);
            handleParseDSL(INITIAL_PARETO_DSL);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-white relative">
            <div className="p-6 border-b border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <BarChart3 size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">排列图引擎</h2>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Pareto Processor v3.0</p>
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

                <nav className="flex gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800">
                    {[
                        { id: 'manual', label: '手动录入', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleTabChange(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'manual' && (
                    <div className="space-y-6">
                        {!Array.isArray(data) ? (
                            <div className="p-10 text-center text-slate-500 text-[10px] uppercase font-black tracking-widest">
                                同步矩阵数据中...
                            </div>
                        ) : (
                            <>
                                {/* 图表基本信息 */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 pl-2">
                                        <ChevronRight size={14} className="text-blue-500" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">图表基本信息</span>
                                    </div>
                                    <input
                                        value={styles.title || ''}
                                        onChange={e => onUpdate(data, { ...styles, title: e.target.value })}
                                        className="w-full h-14 px-6 logic-terminal-input text-sm font-bold"
                                        placeholder="例如：故障频数排列图"
                                    />
                                </div>

                                {/* 统计指标录入 */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between pl-2">
                                        <div className="flex items-center gap-3">
                                            <ChevronRight size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">统计指标录入</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {data.map((item, idx) => (
                                            <div key={item.id} className="flex gap-3 group">
                                                <div className="flex-1 h-12 flex items-center bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden px-4 group-hover:border-slate-500 transition-colors">
                                                    <span className="text-[10px] font-black text-slate-600 mr-4">0{idx + 1}</span>
                                                    <input
                                                        value={item.name}
                                                        onChange={e => {
                                                            const newData = [...data];
                                                            newData[idx].name = e.target.value;
                                                            onUpdate(newData, styles);
                                                        }}
                                                        className="bg-transparent border-none outline-none text-sm font-bold w-full text-blue-100 placeholder:opacity-20"
                                                        placeholder="项目名称"
                                                    />
                                                </div>
                                                <div className="w-24 h-12 flex items-center bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden px-4 group-hover:border-blue-500 transition-colors shadow-inner">
                                                    <input
                                                        type="number"
                                                        value={item.value}
                                                        onChange={e => {
                                                            const newData = [...data];
                                                            newData[idx].value = parseInt(e.target.value) || 0;
                                                            onUpdate(newData, styles);
                                                        }}
                                                        className="bg-transparent border-none outline-none text-sm font-black w-full text-blue-400 text-center"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => onUpdate(data.filter(i => i.id !== item.id), styles)}
                                                    className="w-12 h-12 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => onUpdate([...data, { id: Math.random().toString(), name: '新统计项', value: 0 }], styles)}
                                            className="w-full h-14 border border-dashed border-slate-700 rounded-xl flex items-center justify-center gap-3 text-slate-500 hover:text-blue-400 hover:border-blue-500/50 transition-all group"
                                        >
                                            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">添加统计项</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* 图表高级配置 */}
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-8 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">图表高级配置</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[12px] font-bold text-slate-300">80% 关键线</span>
                                <button
                                    onClick={() => onShowLineChange(!showLine)}
                                    className={`w-14 h-7 rounded-full relative transition-all duration-500 ${showLine ? 'bg-blue-600' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-500 ${showLine ? 'left-8' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                    <span>小数点保留位数</span>
                                    <span className="text-blue-400">{styles.decimals ?? 1} 位</span>
                                </div>
                                <input
                                    type="range" min="0" max="4"
                                    value={styles.decimals ?? 1}
                                    onChange={e => onUpdate(data, { ...styles, decimals: parseInt(e.target.value) })}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                        </div>

                        {/* 颜色方案配置 */}
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-6 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">颜色方案配置</span>
                            </div>
                            {[
                                { key: 'barColor', label: '柱形颜色' },
                                { key: 'lineColor', label: '折线颜色' },
                                { key: 'markLineColor', label: '关键线颜色' }
                            ].map(c => (
                                <div key={c.key} className="flex items-center justify-between">
                                    <span className="text-[12px] font-bold text-slate-300">{c.label}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-mono text-slate-500 uppercase">{(styles as any)[c.key]}</span>
                                        <input
                                            type="color"
                                            value={(styles as any)[c.key] || '#000000'}
                                            onChange={e => onUpdate(data, { ...styles, [c.key]: e.target.value })}
                                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'dsl' && (
                    <div className="h-full flex flex-col gap-6">
                        <textarea
                            value={dsl}
                            onChange={e => { setDsl(e.target.value); handleParseDSL(e.target.value); }}
                            className="flex-1 w-full min-h-[400px] p-8 logic-terminal-input text-sm leading-relaxed border border-slate-700/50 whitespace-pre overflow-auto"
                            spellCheck={false}
                            placeholder="输入排列图 DSL..."
                        />
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">智能频率分布推演</span>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiInput}
                                onChange={e => setAiInput(e.target.value)}
                                className="w-full h-64 p-8 bg-slate-900/50 text-slate-200 p-8 text-sm leading-relaxed border border-slate-800 rounded-[2rem] focus:outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                                placeholder="例如：描述2024年客户投诉的主要类别及其频数，模型将自动转化为 DSL 脚本并生成图表..."
                            />

                            <button
                                onClick={generateAiData}
                                disabled={isGenerating || !aiInput.trim()}
                                className={`w-full h-16 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-slate-800' : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-blue-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在执行帕累托分析...</span>
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
                                    您可以输入原始文本、统计报表摘要或口语化描述。AI 会自动识别**分类项目**与**频数/金额**，并依据“二八准则”为您配置好分析视角与色系。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* Docs Modal */}
            {showDocs && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-[#020617]/90 backdrop-blur-3xl">
                    <div className="bg-[#0f172a] w-[800px] max-h-[85vh] rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="px-10 py-8 flex flex-col border-b border-slate-800 shrink-0 gap-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30">
                                        <BarChart3 size={24} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">排列图知识库</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Pareto Knowledge Base V3.1</p>
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
                                        className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
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
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-blue-400 border-b border-blue-500/20 pb-4">
                                            <Database size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">1. 基础配置说明</span>
                                        </div>
                                        <div className="space-y-4">
                                            <table className="w-full text-xs font-mono border-collapse">
                                                <thead>
                                                    <tr className="text-slate-500 text-left border-b border-slate-800">
                                                        <th className="py-3 font-black uppercase">语法</th>
                                                        <th className="py-3 font-black uppercase">说明</th>
                                                        <th className="py-3 font-black uppercase">示例</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800/50">
                                                    <tr>
                                                        <td className="py-3 text-blue-400 font-bold">Title:</td>
                                                        <td className="py-3">设置主标题</td>
                                                        <td className="py-3 text-slate-500">Title: 售后数据分析</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 text-emerald-400 font-bold">Decimals:</td>
                                                        <td className="py-3">累计百分比精度</td>
                                                        <td className="py-3 text-slate-500">Decimals: 2</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-amber-400 border-b border-amber-500/20 pb-4">
                                            <BarChart3 size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">2. 视觉样式定义</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 font-mono text-xs">
                                            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                                    <span className="text-amber-500">Color[Bar]:</span>
                                                    <span className="text-slate-400">#HEX 柱形颜色</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                                    <span className="text-amber-500">Color[Line]:</span>
                                                    <span className="text-slate-400">#HEX 折线颜色</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                                    <span className="text-amber-500">Color[MarkLine]:</span>
                                                    <span className="text-slate-400">#HEX 80% 线颜色</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-blue-400">Font[Title|Base|Bar]:</span>
                                                    <span className="text-slate-400">字号大小 (px)</span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-emerald-400 border-b border-emerald-500/20 pb-4">
                                            <Plus size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">3. 数据项录入语法</span>
                                        </div>
                                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                                            <div className="text-[11px] font-bold text-slate-500 mb-2">语法格式：- [项目名称]: [频数]</div>
                                            <code className="block text-xs text-blue-200 leading-relaxed bg-black/30 p-4 rounded-xl">
                                                - 物流破损: 420<br />
                                                - 包装变形: 156<br />
                                                - 标签缺失: 89
                                            </code>
                                            <p className="text-[10px] text-slate-500 italic">
                                                * 注意：系统将自动对数据执行降序排列并计算累计贡献率。
                                            </p>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-blue-900/50 pb-2">ABC 分类法 (Pareto Principle)</h4>
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4 text-xs leading-relaxed text-slate-400">
                                            <p>排列图基于“二八定律”，旨在帮助管理者从众多的质量问题中，找出影响质量的“关键少数”。</p>
                                            <ul className="list-disc list-inside space-y-2">
                                                <li><strong className="text-blue-300">A类因素</strong> (0% - 80%): 主要影响因素，必须重点解决。</li>
                                                <li><strong className="text-blue-300">B类因素</strong> (80% - 90%): 次要影响因素。</li>
                                                <li><strong className="text-blue-300">C类因素</strong> (90% - 100%): 一般影响因素。</li>
                                            </ul>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest border-b border-emerald-900/50 pb-2">核心算法 (Core Algorithms)</h4>
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4 text-xs leading-relaxed text-slate-400">
                                            <p>本引擎内置严密的数理逻辑：</p>
                                            <div className="bg-black/40 p-4 rounded-xl font-mono text-[10px] space-y-2">
                                                <div>1. 自动降序：Value[i] ≥ Value[i+1]</div>
                                                <div>2. 累计百分比：P[i] = (Σ V[0...i]) / Σ V[all]</div>
                                                <div>3. 80% 标识线：自动寻找 P[i] ≈ 80% 的临界坐标</div>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="p-6 bg-blue-900/10 border border-blue-800/20 rounded-3xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-black uppercase text-blue-500">质量改进提示</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium italic mb-2">
                                            "解决排列图中最左侧的两个主要因素，通常能消除 80% 的质量成本。"
                                        </p>
                                    </div>
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
