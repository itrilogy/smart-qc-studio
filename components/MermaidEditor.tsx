import React, { useState, useEffect } from 'react';
import { MermaidChartStyles, DEFAULT_MERMAID_STYLES, QCToolType } from '../types';
import {
    Edit3, Code, Sparkles, Settings2, HelpCircle, X, RotateCcw,
    Loader2, Zap, LayoutGrid, ChevronRight, Palette, Type,
    Database, GitBranch
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { generateLogicDSL, getAIStatus } from '../services/aiService';
import { INITIAL_MERMAID_DSL } from '../constants';

interface MermaidEditorProps {
    data: string;
    styles: MermaidChartStyles;
    onDataChange: (data: string) => void;
    onStylesChange: (styles: MermaidChartStyles) => void;
}

const MermaidEditor: React.FC<MermaidEditorProps> = ({
    data,
    styles = DEFAULT_MERMAID_STYLES,
    onDataChange,
    onStylesChange
}) => {
    const [activeTab, setActiveTab] = useState<'style' | 'dsl' | 'ai'>('style');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'syntax' | 'examples'>('syntax');
    const [error, setError] = useState<string | null>(null);

    // Sync styles into DSL (Directives)
    useEffect(() => {
        if (!data) return;

        // Check if we have an init directive
        const initRegex = /^%%{init:\s*({[\s\S]*?})\s*}%%/;
        const match = data.match(initRegex);

        const newConfig = {
            theme: styles.theme,
            themeVariables: {
                fontSize: `${styles.fontSize}px`,
                titleFontSize: `${styles.titleFontSize}px`
            }
        };

        const directive = `%%{init: ${JSON.stringify(newConfig)}}%%`;

        if (match) {
            // Update existing directive if content changed (to avoid infinite loop, only update if different)
            if (match[0] !== directive) {
                onDataChange(data.replace(initRegex, directive));
            }
        } else {
            // Prepend new directive
            onDataChange(`${directive}\n${data}`);
        }
    }, [styles.theme, styles.fontSize, styles.titleFontSize]);

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [engineName, setEngineName] = useState('DeepSeek');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？当前所有修改将丢失。')) {
            onDataChange(INITIAL_MERMAID_DSL);
            onStylesChange(DEFAULT_MERMAID_STYLES);
        }
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        try {
            const dslResult = (await generateLogicDSL(aiPrompt, QCToolType.MERMAID)) as string;
            onDataChange(dslResult);
            setActiveTab('dsl');
        } catch (err) {
            console.error('AI Generation failed:', err);
            alert('AI 生成失败，请检查网络连接或 API 配置。');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-white relative">
            {/* Header Area */}
            <div className="p-6 border-b border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <GitBranch size={22} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white tracking-widest uppercase">Mermaid 引擎</h2>
                            <p className="text-[8px] text-slate-500 font-bold tracking-[0.2em] mt-1">LOGIC PROCESSOR V3.0</p>
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
                            title="帮助文档"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800">
                    {[
                        { id: 'style', label: '面板配置', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'style' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">图表核心信息</span>
                            </div>
                            <input
                                value={styles.title}
                                onChange={e => onStylesChange({ ...styles, title: e.target.value })}
                                className="w-full h-12 px-4 logic-terminal-input text-xs font-bold bg-[#0f172a] text-white border-slate-700 rounded-xl focus:border-blue-500"
                                placeholder="图表标题"
                            />
                        </div>

                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-6 shadow-2xl">
                            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                                <Palette size={14} className="text-blue-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">颜色方案与样式</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">内置主题</span>
                                    <select
                                        value={styles.theme}
                                        onChange={e => onStylesChange({ ...styles, theme: e.target.value as any })}
                                        className="w-full h-12 px-4 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-blue-100 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="default">默认主题 (Default)</option>
                                        <option value="forest">森林草木 (Forest)</option>
                                        <option value="dark">暗黑视界 (Dark)</option>
                                        <option value="neutral">中性简约 (Neutral)</option>
                                        <option value="base">工业基座 (Base)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">背景颜色</span>
                                    <div className="flex items-center gap-1.5 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                                        <input
                                            type="color"
                                            value={styles.backgroundColor}
                                            onChange={e => onStylesChange({ ...styles, backgroundColor: e.target.value })}
                                            className="w-5 h-5 rounded bg-transparent cursor-pointer border-none p-0"
                                        />
                                        <span className="text-[9px] font-mono text-slate-400 leading-none">画布背景</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">外观风格 (手绘模式)</span>
                                    <button
                                        onClick={() => onStylesChange({ ...styles, look: styles.look === 'handDrawn' ? 'classic' : 'handDrawn' })}
                                        className={`w-10 h-5 rounded-full transition-all relative ${styles.look === 'handDrawn' ? 'bg-blue-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${styles.look === 'handDrawn' ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[8px] text-slate-500 font-medium tracking-wider leading-relaxed px-1">开启手绘模式 (Hand-drawn) 将展示更具艺术感的草描效果。</p>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">高级布局引擎 (ELK)</span>
                                    <button
                                        onClick={() => onStylesChange({ ...styles, useElk: !styles.useElk })}
                                        className={`w-10 h-5 rounded-full transition-all relative ${styles.useElk ? 'bg-emerald-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${styles.useElk ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[8px] text-slate-500 font-medium tracking-wider leading-relaxed px-1">启用 ELK 布局引擎可获得更优化的复杂图表排列方案。</p>
                            </div>

                            {styles.useElk && (
                                <div className="space-y-4 pt-4 border-t border-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">合并平行边 (Merge Edges)</span>
                                        <button
                                            onClick={() => onStylesChange({ ...styles, elkMergeEdges: !styles.elkMergeEdges })}
                                            className={`w-8 h-4 rounded-full transition-all relative ${styles.elkMergeEdges ? 'bg-blue-600' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${styles.elkMergeEdges ? 'right-0.5' : 'left-0.5'}`} />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">节点放置策略</span>
                                        <select
                                            value={styles.elkNodePlacementStrategy}
                                            onChange={e => onStylesChange({ ...styles, elkNodePlacementStrategy: e.target.value as any })}
                                            className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-[10px] font-bold text-blue-100 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="SIMPLE">简单策略 (SIMPLE)</option>
                                            <option value="NETWORK_SIMPLE">网络简单 (NETWORK_SIMPLE)</option>
                                            <option value="LINEAR_SEGMENTS">线性段 (LINEAR_SEGMENTS)</option>
                                            <option value="BRANDES_KOEPF">最优对齐 (BRANDES_KOEPF)</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-6 shadow-2xl">
                            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                                <Type size={14} className="text-blue-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">排版设置</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">标题字号</span>
                                    <input
                                        type="number"
                                        value={styles.titleFontSize}
                                        onChange={e => onStylesChange({ ...styles, titleFontSize: parseInt(e.target.value) })}
                                        className="w-full h-10 px-3 text-[10px] font-bold bg-[#0f172a] text-white border border-slate-700 rounded-xl focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">内部字号</span>
                                    <input
                                        type="number"
                                        value={styles.fontSize}
                                        onChange={e => onStylesChange({ ...styles, fontSize: parseInt(e.target.value) })}
                                        className="w-full h-10 px-3 text-[10px] font-bold bg-[#0f172a] text-white border border-slate-700 rounded-xl focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between pl-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mermaid 脚本指令</span>
                        </div>
                        <textarea
                            value={data}
                            onChange={(e) => onDataChange(e.target.value)}
                            className="flex-1 w-full bg-black/40 text-blue-100 p-8 font-mono text-[11px] leading-relaxed border border-slate-800 rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none custom-scrollbar shadow-inner"
                            placeholder="输入 Mermaid 脚本..."
                            spellCheck={false}
                        />
                    </div>
                ) : activeTab === 'ai' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">AI 智能逻辑推演</span>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full h-56 bg-slate-900/50 text-slate-200 p-8 text-sm leading-relaxed border border-slate-800 rounded-[2rem] focus:outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                                placeholder="例如：画一个电商购物流程图，包含浏览、下单、支付、发货等环节..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-slate-800' : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.98]'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-blue-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在解析图形结构...</span>
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
                                    您可以输入原始文本、逻辑流程描述或业务规则。AI 会自动识别**节点关系**与**流程走向**，并依据“逻辑建模”为您配置好分析视角与架构。
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {
                showDocs && createPortal(
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-[#020617]/90 backdrop-blur-3xl">
                        <div className="bg-[#0f172a] w-[800px] max-h-[85vh] rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                            {/* Header */}
                            <div className="px-10 py-8 flex flex-col border-b border-slate-800 shrink-0 gap-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30">
                                            <Zap size={24} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Mermaid 知识库</h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Logic Mapping Base V3.0</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowDocs(false)} className="p-3 hover:bg-slate-800 rounded-xl transition-all text-slate-500 hover:text-white">
                                        <X size={24} />
                                    </button>
                                </div>

                                <nav className="flex bg-black/40 p-1 rounded-2xl border border-slate-800/80 w-fit">
                                    {[
                                        { id: 'syntax', label: '语法规范说明' },
                                        { id: 'examples', label: '常用示例手册' },
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
                                {docTab === 'syntax' ? (
                                    <div className="space-y-12">
                                        <section className="space-y-6">
                                            <div className="flex items-center gap-3 text-blue-400 border-b border-blue-500/20 pb-4">
                                                <Code size={18} />
                                                <span className="text-[12px] font-black uppercase tracking-widest">核心语法规范</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest underline decoration-blue-500 decoration-2 underline-offset-4">流程图 (Flowchart)</h5>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">使用 `graph TD` (自上而下) 或 `graph LR` (从左至右)。节点使用 `[]` (矩形), `()` (圆角), `{ }` (菱形)。</p>
                                                    <pre className="text-[9px] font-mono text-blue-300/70 p-2 bg-black/30 rounded">A[开始] --{'>'} B{'{'}判断{'}'}</pre>
                                                </div>
                                                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest underline decoration-blue-500 decoration-2 underline-offset-4">思维导图 (Mindmap)</h5>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">树状知识梳理。根节点使用 `(( ))`，分支使用缩进区分。支持多种形状如 `[ ]`, `( )`。</p>
                                                    <pre className="text-[9px] font-mono text-blue-300/70 p-2 bg-black/30 rounded">mindmap\n  root((\"中心\"))\n    [分支]</pre>
                                                </div>
                                                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest underline decoration-blue-500 decoration-2 underline-offset-4">序列图 (Sequence)</h5>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">描述对象间的交互。使用 `participant` 定义角色，`-{'>>'}` 表示异步消息。</p>
                                                    <pre className="text-[9px] font-mono text-blue-300/70 p-2 bg-black/30 rounded">Alice -{'>'}{'>>'} Bob: 你好</pre>
                                                </div>
                                                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest underline decoration-blue-500 decoration-2 underline-offset-4">看板图 (Kanban)</h5>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">任务状态跟踪。使用 `kanban` 声明，节点支持 `@{ }` 属性（如负责人、优先级）。</p>
                                                    <pre className="text-[9px] font-mono text-blue-300/70 p-2 bg-black/30 rounded">kanban\n  [待办]\n    [任务] </pre>
                                                </div>
                                                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest underline decoration-blue-500 decoration-2 underline-offset-4">状态图 (State)</h5>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">描述状态流转。`[*]` 表示起点/终点，`--&gt;` 表示状态转移。</p>
                                                    <pre className="text-[9px] font-mono text-blue-300/70 p-2 bg-black/30 rounded">[*] --{'>'} 流转 --{'>'} [*]</pre>
                                                </div>
                                                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest underline decoration-blue-500 decoration-2 underline-offset-4">类图 (Class)</h5>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">面向对象结构。`{'{'}` `{'}'}` 定义类内容，`&lt;|--` 定义继承等关系。</p>
                                                    <pre className="text-[9px] font-mono text-blue-300/70 p-2 bg-black/30 rounded">A &lt;|-- B\nclass A {'{'} +move() {'}'}</pre>
                                                </div>
                                                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest underline decoration-blue-500 decoration-2 underline-offset-4">实体关系 (ER)</h5>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">数据建模。`||--o{'{'}` 等符号表示数量关系，块内定义实体属性。</p>
                                                    <pre className="text-[9px] font-mono text-blue-300/70 p-2 bg-black/30 rounded">USER ||--o{'{'} ORDER : places</pre>
                                                </div>
                                                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest underline decoration-blue-500 decoration-2 underline-offset-4">饼图 (Pie)</h5>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">占比分布。`pie title xxx`，每行 `"标签" : 数值`。</p>
                                                    <pre className="text-[9px] font-mono text-blue-300/70 p-2 bg-black/30 rounded">pie title 分布\n  "A" : 60\n  "B" : 40</pre>
                                                </div>
                                                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest underline decoration-blue-500 decoration-2 underline-offset-4">旅程图 (Journey)</h5>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">用户体验旅程。使用 `journey`，`section` 分段，评分 `任务: 分数: 角色`。</p>
                                                    <pre className="text-[9px] font-mono text-blue-300/70 p-2 bg-black/30 rounded">任务: 5: 用户</pre>
                                                </div>
                                                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest underline decoration-blue-500 decoration-2 underline-offset-4">时间线 (Timeline)</h5>
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">发展历程记录。格式 `节点名 : 事件描述`。</p>
                                                    <pre className="text-[9px] font-mono text-blue-300/70 p-2 bg-black/30 rounded">2024 : 发布 V1.0</pre>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-6">
                                            <div className="flex items-center gap-3 text-emerald-400 border-b border-emerald-500/20 pb-4">
                                                <LayoutGrid size={18} />
                                                <span className="text-[12px] font-black uppercase tracking-widest">其他支持类型</span>
                                            </div>
                                            <div className="space-y-4">
                                                <table className="w-full text-[10px] font-mono border-collapse bg-black/20 rounded-lg overflow-hidden">
                                                    <thead>
                                                        <tr className="text-slate-400 text-left bg-slate-800/50">
                                                            <th className="p-3 border-b border-slate-700">类型</th>
                                                            <th className="p-3 border-b border-slate-700">声明关键字</th>
                                                            <th className="p-3 border-b border-slate-700">典型用途</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50">
                                                        <tr><td className="p-3 text-blue-400">甘特图</td><td className="p-3 font-bold">gantt</td><td className="p-3 text-slate-400">项目进度管理</td></tr>
                                                        <tr><td className="p-3 text-blue-400">状态图</td><td className="p-3 font-bold">stateDiagram-v2</td><td className="p-3 text-slate-400">系统/流程状态迁移</td></tr>
                                                        <tr><td className="p-3 text-blue-400">类图</td><td className="p-3 font-bold">classDiagram</td><td className="p-3 text-slate-400">面向对象系统建模</td></tr>
                                                        <tr><td className="p-3 text-blue-400">实体关系</td><td className="p-3 font-bold">erDiagram</td><td className="p-3 text-slate-400">数据库表结构设计</td></tr>
                                                        <tr><td className="p-3 text-blue-400">饼图</td><td className="p-3 font-bold">pie</td><td className="p-3 text-slate-400">直接数据占比分布</td></tr>
                                                        <tr><td className="p-3 text-blue-400">用户旅程</td><td className="p-3 font-bold">journey</td><td className="p-3 text-slate-400">体验与情绪量化映射</td></tr>
                                                        <tr><td className="p-3 text-blue-400">时间线</td><td className="p-3 font-bold">timeline</td><td className="p-3 text-slate-400">历史与里程碑梳理</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </section>
                                    </div>
                                ) : (
                                    <div className="space-y-12">
                                        <section className="space-y-6">
                                            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-4">
                                                <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest">标准流程图示例</h4>
                                                <div className="bg-black/40 p-6 rounded-2xl font-mono text-[10px] text-blue-300/80 leading-relaxed whitespace-pre">
                                                    {`graph TD
    A[用户请求] --> B{鉴权中心}
    B -- 成功 --> C[访问资源]
    B -- 失败 --> D[重定向登录]
    C --> E((结束))`}
                                                </div>
                                            </div>

                                            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-4">
                                                <h4 className="text-sm font-black text-purple-400 uppercase tracking-widest">思维导图示例</h4>
                                                <div className="bg-black/40 p-6 rounded-2xl font-mono text-[10px] text-purple-300/80 leading-relaxed whitespace-pre">
                                                    {`mindmap
  root(("知识管理"))
    输入
      笔记
      阅读
    处理
      分类
      标签
    输出
      写作`}
                                                </div>
                                            </div>

                                            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-4">
                                                <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest">工作看板示例</h4>
                                                <div className="bg-black/40 p-6 rounded-2xl font-mono text-[10px] text-amber-300/80 leading-relaxed whitespace-pre">
                                                    {`kanban
    待办[制作计划]
        [任务A] @{ assigned: "张三", priority: "High" }
    进行中[正在实施]
        [任务B] @{ assigned: "李四" }`}
                                                </div>
                                            </div>

                                            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-3xl space-y-4">
                                                <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest">甘特图示例</h4>
                                                <div className="bg-black/40 p-6 rounded-2xl font-mono text-[10px] text-emerald-300/80 leading-relaxed whitespace-pre">
                                                    {`gantt
    title 产品迭代计划
    dateFormat  YYYY-MM-DD
    section 调研
    需求梳理 :a1, 2024-01-01, 3d
    section 开发
    核心重构 :after a1, 7d`}
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>
                            <div className="p-10 border-t border-slate-800 bg-slate-900/50 flex justify-center shrink-0">
                                <button
                                    onClick={() => setShowDocs(false)}
                                    className="px-16 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-500 transition-all font-sans"
                                >
                                    我已了解语法
                                </button>
                            </div>
                        </div>
                    </div >,
                    document.body
                )
            }

        </div >
    );
};

export default MermaidEditor;
