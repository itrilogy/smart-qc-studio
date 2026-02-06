import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    PDPCNode,
    PDPCLink,
    PDPCGroup,
    PDPCChartStyles,
    DEFAULT_PDPC_STYLES,
    PDPCNodeType,
    PDPCMarkerType,
    PDPCData
} from '../types';
import { INITIAL_PDPC_DSL } from '../constants';
import {
    ChevronRight, Save, Trash2, Plus, Edit3, Settings2, ArrowRight, LayoutGrid, Circle,
    Workflow, Sparkles, HelpCircle, X, Loader2, Database, Code, GitFork, Layers, LogOut, RotateCcw, Zap
} from 'lucide-react';
import { generateLogicDSL, getAIStatus } from '../services/aiService';
import { QCToolType } from '../types';

interface PDPCEditorProps {
    data: PDPCData;
    styles: PDPCChartStyles;
    onDataChange: (data: PDPCData) => void;
    onStylesChange: (styles: PDPCChartStyles) => void;
}

export const parsePDPCDSL = (content: string): { data: PDPCData, styles: PDPCChartStyles } => {
    const lines = content.split('\n');
    const styles: any = { ...DEFAULT_PDPC_STYLES };
    const nodes: PDPCNode[] = [];
    const links: PDPCLink[] = [];
    const groups: PDPCGroup[] = [];

    let currentGroupId: string | undefined = undefined;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        // Styles
        if (trimmed.startsWith('Title:')) {
            styles.title = trimmed.replace('Title:', '').trim();
            return;
        }
        if (trimmed.startsWith('Layout:')) {
            const layoutVal = trimmed.replace('Layout:', '').trim();
            if (['Directional', 'Standard'].includes(layoutVal)) {
                styles.layout = layoutVal as any;
            }
            return;
        }

        const colorMatch = trimmed.match(/Color\[(Start|StartText|End|EndText|Step|StepText|Countermeasure|CountermeasureText|Line)\]:\s*(#[0-9a-fA-F]+)/i);
        if (colorMatch) {
            const keyMap: any = {
                'Start': 'startColor',
                'StartText': 'startTextColor',
                'End': 'endColor',
                'EndText': 'endTextColor',
                'Step': 'stepColor',
                'StepText': 'stepTextColor',
                'Countermeasure': 'countermeasureColor',
                'CountermeasureText': 'countermeasureTextColor',
                'Line': 'lineColor'
            };
            styles[keyMap[colorMatch[1]]] = colorMatch[2];
            return;
        }

        const fontMatch = trimmed.match(/Font\[(Title|Node)\]:\s*(\d+)/i);
        if (fontMatch) {
            if (fontMatch[1] === 'Title') styles.titleFontSize = parseInt(fontMatch[2]);
            if (fontMatch[1] === 'Node') styles.nodeFontSize = parseInt(fontMatch[2]);
            return;
        }

        const lineWidthMatch = trimmed.match(/Line\[Width\]:\s*(\d+)/i);
        if (lineWidthMatch) {
            styles.lineWidth = parseInt(lineWidthMatch[1]);
            return;
        }

        // Groups
        if (trimmed.startsWith('Group:')) {
            const parts = trimmed.replace('Group:', '').split(',').map(s => s.trim());
            if (parts.length >= 2) {
                currentGroupId = parts[0];
                groups.push({
                    id: parts[0],
                    label: parts[1],
                    parentId: parts[2] || null
                });
            }
            return;
        }
        if (trimmed.startsWith('EndGroup')) {
            currentGroupId = undefined;
            return;
        }

        // Items
        if (trimmed.startsWith('Item:')) {
            const parts = trimmed.replace('Item:', '').split(',').map(s => s.trim());
            if (parts.length >= 2) {
                const id = parts[0];
                const label = parts[1];
                let type: PDPCNodeType = 'step';

                if (parts[2]) {
                    const typeStr = parts[2].toLowerCase();
                    if (typeStr.includes('start')) type = 'start';
                    else if (typeStr.includes('end')) type = 'end';
                    else if (typeStr.includes('countermeasure')) type = 'countermeasure';
                }

                nodes.push({ id, label, type, groupId: currentGroupId });
            }
            return;
        }

        // Chains: id1--id2 [OK/NG]
        if (trimmed.includes('--')) {
            const markerMatch = trimmed.match(/\[(OK|NG)\]/i);
            const marker: PDPCMarkerType = markerMatch ? (markerMatch[1].toUpperCase() as PDPCMarkerType) : 'None';
            const cleanLine = trimmed.replace(/\[(OK|NG)\]/i, '').trim();
            const sequence = cleanLine.split('--').map(s => s.trim());

            for (let i = 0; i < sequence.length - 1; i++) {
                links.push({
                    source: sequence[i],
                    target: sequence[i + 1],
                    marker: i === sequence.length - 2 ? marker : 'None' // Only apply marker to the last segment if multiple? 
                    // Actually, usually it's just id1--id2. If id1--id2--id3 [OK], we might need better logic.
                    // For now, simplify to pair-wise or end-of-chain marker.
                });
            }
            return;
        }
    });

    return {
        data: { title: styles.title, nodes, links, groups },
        styles
    };
};

const PDPCEditor: React.FC<PDPCEditorProps> = ({
    data,
    styles,
    onDataChange,
    onStylesChange
}) => {
    const [dsl, setDsl] = useState(INITIAL_PDPC_DSL);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [error, setError] = useState<string | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [engineName, setEngineName] = useState('DeepSeek');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    const handleParseDSL = (val: string) => {
        try {
            const { data: newData, styles: newStyles } = parsePDPCDSL(val);
            onDataChange(newData);
            onStylesChange(newStyles);
            setError(null);
        } catch (e) {
            setError('DSL 解析错误');
        }
    };

    const handleDSLChange = (val: string) => {
        setDsl(val);
        handleParseDSL(val);
    };

    const generateDSLFromData = () => {
        let content = `Title: ${data.title}\nLayout: ${styles.layout}\n\n`;
        content += `Color[Start]: ${styles.startColor}\n`;
        content += `Color[StartText]: ${styles.startTextColor}\n`;
        content += `Color[Step]: ${styles.stepColor}\n`;
        content += `Color[StepText]: ${styles.stepTextColor}\n`;
        content += `Color[Countermeasure]: ${styles.countermeasureColor}\n`;
        content += `Color[CountermeasureText]: ${styles.countermeasureTextColor}\n`;
        content += `Color[End]: ${styles.endColor}\n`;
        content += `Color[EndText]: ${styles.endTextColor}\n`;
        content += `Color[Line]: ${styles.lineColor}\n`;
        content += `Line[Width]: ${styles.lineWidth}\n\n`;

        // Groups and Items
        const groupedNodes = new Map<string, PDPCNode[]>();
        const orphanNodes: PDPCNode[] = [];

        data.nodes.forEach(n => {
            if (n.groupId) {
                if (!groupedNodes.has(n.groupId)) groupedNodes.set(n.groupId, []);
                groupedNodes.get(n.groupId)?.push(n);
            } else {
                orphanNodes.push(n);
            }
        });

        data.groups.forEach(g => {
            content += `Group: ${g.id}, ${g.label}${g.parentId ? `, [${g.parentId}]` : ''}\n`;
            groupedNodes.get(g.id)?.forEach(n => {
                content += `  Item: ${n.id}, ${n.label}${n.type !== 'step' ? `, [${n.type}]` : ''}\n`;
            });
            content += `EndGroup\n\n`;
        });

        orphanNodes.forEach(n => {
            content += `Item: ${n.id}, ${n.label}${n.type !== 'step' ? `, [${n.type}]` : ''}\n`;
        });

        content += `\n`;

        // Links
        data.links.forEach(l => {
            content += `${l.source}--${l.target}${l.marker !== 'None' ? ` [${l.marker}]` : ''}\n`;
        });

        return content;
    };

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const dslResult = (await generateLogicDSL(aiPrompt, QCToolType.PDPC)) as string;
            setDsl(dslResult);
            handleParseDSL(dslResult);
            setActiveTab('dsl');
        } catch (err) {
            console.error('AI Generation failed:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？当前所有修改将丢失。')) {
            try {
                setDsl(INITIAL_PDPC_DSL);
                handleParseDSL(INITIAL_PDPC_DSL);
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-white relative">
            <div className="p-6 border-b border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                            <GitFork size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">PDPC 引擎</h2>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">DECISION PROGRAM ENGINE V1.0</p>
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
                            onClick={() => {
                                if (t.id === 'dsl' && activeTab !== 'dsl') setDsl(generateDSLFromData());
                                setActiveTab(t.id as any);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'manual' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        {/* Layout Section */}
                        <div className="p-6 bg-black/30 rounded-[2rem] border border-slate-800/50 space-y-4 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <LayoutGrid size={16} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">全局布局构建</span>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">图表标题与布局</span>
                                    <div className="flex gap-4">
                                        <input
                                            value={data.title}
                                            onChange={e => onDataChange({ ...data, title: e.target.value })}
                                            className="flex-1 h-12 px-4 text-xs font-bold bg-[#0f172a] text-white border border-slate-700 rounded-xl focus:border-emerald-500 transition-all shadow-inner"
                                            placeholder="输入图表标题..."
                                        />
                                        <button
                                            onClick={() => {
                                                const newLayout = styles.layout === 'Directional' ? 'Standard' : 'Directional';
                                                onStylesChange({ ...styles, layout: newLayout });
                                            }}
                                            className="w-12 h-12 flex items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-all group shadow-lg"
                                            title="切换排版方向"
                                        >
                                            <Workflow size={18} className={`transition-transform duration-500 ${styles.layout === 'Standard' ? 'rotate-90' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Style Section */}
                        <div className="p-6 bg-black/30 rounded-[2rem] border border-slate-800/50 space-y-4 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <Settings2 size={16} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">视觉配置</span>
                            </div>

                            <div className="space-y-4">
                                {/* BG Colors Row */}
                                <div className="flex flex-col gap-2 p-4 bg-slate-900/30 rounded-2xl border border-slate-800/50">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">背景颜色 (起点/过程/对策/终点)</span>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { key: 'startColor', label: 'Start' },
                                            { key: 'stepColor', label: 'Step' },
                                            { key: 'countermeasureColor', label: 'Counter' },
                                            { key: 'endColor', label: 'End' }
                                        ].map(c => (
                                            <div key={c.key} className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                                                <input
                                                    type="color"
                                                    value={(styles as any)[c.key]}
                                                    onChange={e => onStylesChange({ ...styles, [c.key]: e.target.value })}
                                                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                                                />
                                                <span className="text-[8px] font-mono text-slate-500 uppercase">{(styles as any)[c.key]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Text Colors Row */}
                                <div className="flex flex-col gap-2 p-4 bg-slate-900/30 rounded-2xl border border-slate-800/50">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">文字颜色 (起点/过程/对策/终点)</span>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { key: 'startTextColor', label: 'Start' },
                                            { key: 'stepTextColor', label: 'Step' },
                                            { key: 'countermeasureTextColor', label: 'Counter' },
                                            { key: 'endTextColor', label: 'End' }
                                        ].map(c => (
                                            <div key={c.key} className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                                                <input
                                                    type="color"
                                                    value={(styles as any)[c.key]}
                                                    onChange={e => onStylesChange({ ...styles, [c.key]: e.target.value })}
                                                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                                                />
                                                <span className="text-[8px] font-mono text-slate-500 uppercase">{(styles as any)[c.key]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Line Row */}
                                <div className="flex flex-col gap-2 p-4 bg-slate-900/30 rounded-2xl border border-slate-800/50">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">连接设置 (颜色 & 粗细)</span>
                                    <div className="flex items-center gap-4">
                                        {/* Line Picker aligned with first column (roughly 1/4 of width) */}
                                        <div className="w-[calc(25%-9px)] flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                                            <input
                                                type="color"
                                                value={styles.lineColor}
                                                onChange={e => onStylesChange({ ...styles, lineColor: e.target.value })}
                                                className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                                            />
                                            <span className="text-[8px] font-mono text-slate-500 uppercase">{styles.lineColor}</span>
                                        </div>

                                        {/* Slider taking the rest of the space */}
                                        <div className="flex-1 flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-800 h-[38px] px-4">
                                            <input
                                                type="range"
                                                min="1"
                                                max="10"
                                                value={styles.lineWidth}
                                                onChange={e => onStylesChange({ ...styles, lineWidth: parseInt(e.target.value) })}
                                                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                            />
                                            <span className="text-[10px] font-mono text-emerald-400 w-8 text-right">{styles.lineWidth}px</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Elements Management Section */}
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-6 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-4">
                                    <Database size={16} className="text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">要素管理</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const newId = `n${data.nodes.length + 1}`;
                                            onDataChange({
                                                ...data,
                                                nodes: [...data.nodes, { id: newId, label: '新节点', type: 'step' }]
                                            });
                                        }}
                                        className="px-3 py-1 bg-emerald-600/20 text-emerald-400 text-[9px] font-black rounded-lg border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all"
                                    >
                                        + 节点
                                    </button>
                                    <button
                                        onClick={() => {
                                            const newId = `g${data.groups.length + 1}`;
                                            onDataChange({
                                                ...data,
                                                groups: [...data.groups, { id: newId, label: '新阶段', parentId: null }]
                                            });
                                        }}
                                        className="px-3 py-1 bg-blue-600/20 text-blue-400 text-[9px] font-black rounded-lg border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all"
                                    >
                                        + 分组
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                {data.groups.map(group => (
                                    <div key={group.id} className="p-4 bg-slate-900/30 rounded-2xl border border-blue-500/20 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <input
                                                value={group.label}
                                                onChange={e => {
                                                    onDataChange({
                                                        ...data,
                                                        groups: data.groups.map(g => g.id === group.id ? { ...g, label: e.target.value } : g)
                                                    });
                                                }}
                                                className="bg-transparent border-none text-xs font-black text-blue-400 focus:outline-none w-full"
                                            />
                                            <select
                                                value={group.parentId || ''}
                                                onChange={e => {
                                                    onDataChange({
                                                        ...data,
                                                        groups: data.groups.map(g => g.id === group.id ? { ...g, parentId: e.target.value || null } : g)
                                                    });
                                                }}
                                                className="bg-slate-800 text-[8px] text-slate-500 p-1 rounded border-none max-w-[80px] focus:outline-none"
                                            >
                                                <option value="">顶级分组</option>
                                                {data.groups.filter(g => g.id !== group.id).map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                                            </select>
                                            <button
                                                onClick={() => {
                                                    onDataChange({
                                                        ...data,
                                                        groups: data.groups.filter(g => g.id !== group.id),
                                                        nodes: data.nodes.map(n => n.groupId === group.id ? { ...n, groupId: undefined } : n)
                                                    });
                                                }}
                                                className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div className="pl-4 border-l-2 border-slate-800 space-y-2">
                                            {data.nodes.filter(n => n.groupId === group.id).map(node => (
                                                <div key={node.id} className="flex items-center gap-2 bg-black/20 p-2 rounded-lg group/node">
                                                    <select
                                                        value={node.type}
                                                        onChange={e => {
                                                            onDataChange({
                                                                ...data,
                                                                nodes: data.nodes.map(n => n.id === node.id ? { ...n, type: e.target.value as any } : n)
                                                            });
                                                        }}
                                                        className="bg-slate-800 text-[8px] font-black text-slate-400 p-1 rounded border-none uppercase"
                                                    >
                                                        <option value="start">起点</option>
                                                        <option value="step">步骤</option>
                                                        <option value="countermeasure">对策</option>
                                                        <option value="end">终点</option>
                                                    </select>
                                                    <input
                                                        value={node.label}
                                                        onChange={e => {
                                                            onDataChange({
                                                                ...data,
                                                                nodes: data.nodes.map(n => n.id === node.id ? { ...n, label: e.target.value } : n)
                                                            });
                                                        }}
                                                        className="bg-transparent border-none text-[10px] text-slate-300 focus:outline-none flex-1"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            onDataChange({
                                                                ...data,
                                                                nodes: data.nodes.map(n => n.id === node.id ? { ...n, groupId: undefined } : n)
                                                            });
                                                        }}
                                                        className="opacity-0 group-hover/node:opacity-100 p-1 text-slate-600 hover:text-emerald-400 transition-all"
                                                        title="移出分组"
                                                    >
                                                        <LogOut size={10} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            onDataChange({
                                                                ...data,
                                                                nodes: data.nodes.filter(n => n.id !== node.id),
                                                                links: data.links.filter(l => l.source !== node.id && l.target !== node.id)
                                                            });
                                                        }}
                                                        className="opacity-0 group-hover/node:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Orphan Nodes */}
                                <div className="space-y-2">
                                    <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest pl-2">未分组节点</div>
                                    {data.nodes.filter(n => !n.groupId).map(node => (
                                        <div key={node.id} className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-800 group/node">
                                            <select
                                                value={node.type}
                                                onChange={e => {
                                                    onDataChange({
                                                        ...data,
                                                        nodes: data.nodes.map(n => n.id === node.id ? { ...n, type: e.target.value as any } : n)
                                                    });
                                                }}
                                                className="bg-slate-800 text-[8px] font-black text-slate-400 p-1 rounded border-none uppercase"
                                            >
                                                <option value="start">起点</option>
                                                <option value="step">步骤</option>
                                                <option value="countermeasure">对策</option>
                                                <option value="end">终点</option>
                                            </select>
                                            <input
                                                value={node.label}
                                                onChange={e => {
                                                    onDataChange({
                                                        ...data,
                                                        nodes: data.nodes.map(n => n.id === node.id ? { ...n, label: e.target.value } : n)
                                                    });
                                                }}
                                                className="bg-transparent border-none text-[10px] text-slate-300 focus:outline-none flex-1"
                                            />
                                            {data.groups.length > 0 && (
                                                <select
                                                    value=""
                                                    onChange={e => {
                                                        onDataChange({
                                                            ...data,
                                                            nodes: data.nodes.map(n => n.id === node.id ? { ...n, groupId: e.target.value } : n)
                                                        });
                                                    }}
                                                    className="opacity-0 group-hover/node:opacity-100 bg-slate-800 text-[8px] text-slate-500 p-1 rounded border-none max-w-[60px]"
                                                >
                                                    <option value="" disabled>加入分组</option>
                                                    {data.groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                                                </select>
                                            )}
                                            <button
                                                onClick={() => {
                                                    onDataChange({
                                                        ...data,
                                                        nodes: data.nodes.filter(n => n.id !== node.id),
                                                        links: data.links.filter(l => l.source !== node.id && l.target !== node.id)
                                                    });
                                                }}
                                                className="opacity-0 group-hover/node:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Logical Connections Section */}
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-6 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-4">
                                    <GitFork size={16} className="text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">逻辑连接</span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (data.nodes.length < 2) return;
                                        onDataChange({
                                            ...data,
                                            links: [...data.links, { source: data.nodes[0].id, target: data.nodes[1].id, marker: 'None' }]
                                        });
                                    }}
                                    className="px-3 py-1 bg-emerald-600/20 text-emerald-400 text-[9px] font-black rounded-lg border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all"
                                >
                                    + 连接
                                </button>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {data.links.map((link, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-slate-900/50 p-3 rounded-xl border border-slate-800 group/link">
                                        <select
                                            value={link.source}
                                            onChange={e => {
                                                const newLinks = [...data.links];
                                                newLinks[idx] = { ...link, source: e.target.value };
                                                onDataChange({ ...data, links: newLinks });
                                            }}
                                            className="bg-slate-800 text-[9px] text-slate-300 p-1 rounded border-none flex-1 max-w-[80px]"
                                        >
                                            {data.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                        </select>
                                        <div className="text-slate-600">→</div>
                                        <select
                                            value={link.target}
                                            onChange={e => {
                                                const newLinks = [...data.links];
                                                newLinks[idx] = { ...link, target: e.target.value };
                                                onDataChange({ ...data, links: newLinks });
                                            }}
                                            className="bg-slate-800 text-[9px] text-slate-300 p-1 rounded border-none flex-1 max-w-[80px]"
                                        >
                                            {data.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                        </select>
                                        <select
                                            value={link.marker}
                                            onChange={e => {
                                                const newLinks = [...data.links];
                                                newLinks[idx] = { ...link, marker: e.target.value as any };
                                                onDataChange({ ...data, links: newLinks });
                                            }}
                                            className={`text-[8px] font-black p-1 rounded border-none uppercase ${link.marker === 'OK' ? 'bg-emerald-600/20 text-emerald-400' : link.marker === 'NG' ? 'bg-red-600/20 text-red-400' : 'bg-slate-800 text-slate-500'}`}
                                        >
                                            <option value="None">无标记</option>
                                            <option value="OK">OK</option>
                                            <option value="NG">NG</option>
                                        </select>
                                        <button
                                            onClick={() => {
                                                onDataChange({
                                                    ...data,
                                                    links: data.links.filter((_, i) => i !== idx)
                                                });
                                            }}
                                            className="opacity-0 group-hover/link:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {data.links.length === 0 && (
                                    <div className="text-center py-8 text-slate-600 text-[10px] italic">暂无逻辑连接</div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
                        <textarea
                            value={dsl}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="flex-1 w-full bg-black/40 text-emerald-100 p-6 font-mono text-[11px] leading-relaxed border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none custom-scrollbar"
                            placeholder="输入 PDPC DSL..."
                            spellCheck={false}
                        />
                        {error && <div className="text-red-500 text-xs font-bold px-4">{error}</div>}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">智能风险推演描述</span>
                                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>

                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full h-56 bg-slate-900/50 text-slate-200 p-8 text-sm leading-relaxed border border-slate-800 rounded-[2rem] focus:outline-none focus:border-emerald-500 transition-all resize-none shadow-inner"
                                placeholder="描述您的计划和可能的风险，例如：'分析新药研发流程，识别临床试验失败的风险并制定补救措施'..."
                            />

                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-emerald-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在神经网络中推演...</span>
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
                                    您可以输入如“实验室火灾应急”、“支付系统故障应急”等场景描述。AI 将自动为您推演完整的 PDPC 决策路径，包含正常路径 (OK) 与异常对策 (NG)。
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
                                    <div className="p-3 bg-emerald-600/20 rounded-2xl border border-emerald-500/30">
                                        <GitFork size={24} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">PDPC 知识库</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Decision Process Logic Base V1.2</p>
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
                                        className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
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
                                        <div className="flex items-center gap-3 text-emerald-400 border-b border-emerald-500/20 pb-4">
                                            <Code size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">DSL 语法规范</span>
                                        </div>
                                        <div className="space-y-8">
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">A. 元数据与样式控制</p>
                                                <table className="w-full text-[10px] font-mono border-collapse bg-black/20 rounded-lg overflow-hidden">
                                                    <thead>
                                                        <tr className="text-slate-400 text-left bg-slate-800/50">
                                                            <th className="p-3">关键字</th>
                                                            <th className="p-3">示例</th>
                                                            <th className="p-3">说明</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50">
                                                        <tr><td className="p-3 text-emerald-400">Title</td><td className="p-3">Title: 某应急演练计划</td><td className="p-3 text-slate-400">设置图表标题</td></tr>
                                                        <tr><td className="p-3 text-emerald-400">Layout</td><td className="p-3">Layout: Directional</td><td className="p-3 text-slate-400">排版方向 (Directional | Standard)</td></tr>
                                                        <tr><td className="p-3 text-emerald-400">Color[*]</td><td className="p-3">Color[Start]: #ff0000</td><td className="p-3 text-slate-400">自定义颜色关键字</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">B. 结构化定义</p>
                                                <table className="w-full text-[10px] font-mono border-collapse bg-black/20 rounded-lg overflow-hidden">
                                                    <thead>
                                                        <tr className="text-slate-400 text-left bg-slate-800/50">
                                                            <th className="p-3">类型</th>
                                                            <th className="p-3">语法</th>
                                                            <th className="p-3">说明</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50">
                                                        <tr><td className="p-3 text-blue-400">分组 (Group)</td><td className="p-3">Group: G1, 第一阶段</td><td className="p-3 text-slate-400">以 EndGroup 结束</td></tr>
                                                        <tr><td className="p-3 text-emerald-400">原子项 (Item)</td><td className="p-3">Item: id, 标签, [类型]</td><td className="p-3 text-slate-400">类型可选: Start | Step | Countermeasure | End</td></tr>
                                                        <tr><td className="p-3 text-indigo-400">连接线 (Link)</td><td className="p-3">id1--id2 [OK/NG]</td><td className="p-3 text-slate-400">标记判定结果</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest border-b border-emerald-900/50 pb-2">PDPC 分析法 (决策程序图)</h4>
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4 text-xs leading-relaxed text-slate-400">
                                            <p>过程决策程序图 (Process Decision Program Chart) 是在制定计划阶段，对目标实现过程中可能出现的障碍进行预见，并设计多种应对手段的工具。</p>
                                            <ul className="list-disc list-inside space-y-2">
                                                <li><strong>顺向思维</strong>: 从起点出发，推演正常路径 (OK)。</li>
                                                <li><strong>逆向思维</strong>: 预设“万一...”，从障碍点引出“对策” (NG)。</li>
                                            </ul>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-blue-900/50 pb-2">动态决策逻辑</h4>
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4 text-xs leading-relaxed text-slate-400">
                                            <p>PDPC 的核心在于“走一步看一步”。根据实时执行结果（OK 或 NG），决策者可以迅速从预设的备选方案中选择最合适的后续路径。</p>
                                        </div>
                                    </section>

                                    <div className="p-6 bg-indigo-900/10 border border-indigo-800/20 rounded-3xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap size={14} className="text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase text-indigo-500">思维启发</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium italic mb-2">
                                            "一个完善的 PDPC 图不仅要考虑技术风险，更要考虑管理、环境和人员心理等不可控因素的突发影响。"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-10 border-t border-slate-800 bg-slate-900/50 flex justify-center shrink-0">
                            <button
                                onClick={() => setShowDocs(false)}
                                className="px-16 py-4 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-500 transition-all font-sans"
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

export default PDPCEditor;
