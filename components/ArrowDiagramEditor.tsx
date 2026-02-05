
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowData,
    ArrowChartStyles,
    DEFAULT_ARROW_STYLES,
    QCToolType,
    ArrowNode,
    ArrowLink
} from '../types';
import { INITIAL_ARROW_DSL } from '../constants';
import {
    Settings2, LayoutGrid, Workflow, Sparkles, HelpCircle, X,
    Loader2, Database, Code, Network, Activity, Maximize, GitFork,
    Plus, Trash2, Edit3, ArrowRight, Save, RotateCcw
} from 'lucide-react';
import { generateLogicDSL, getAIStatus } from '../services/aiService';

// --- Logic Implementation (Inline) ---

const calculateCPM = (nodes: ArrowNode[], links: ArrowLink[]): { nodes: ArrowNode[], links: ArrowLink[], duration: number } => {
    // 1. Build Adjacency List & Maps
    const nodeMap = new Map<string, ArrowNode>();
    nodes.forEach(n => {
        n.es = 0; n.ls = Infinity;
        nodeMap.set(n.id, n);
    });

    const adj = new Map<string, ArrowLink[]>();
    const reverseAdj = new Map<string, ArrowLink[]>();

    nodes.forEach(n => {
        adj.set(n.id, []);
        reverseAdj.set(n.id, []);
    });

    links.forEach(l => {
        const u = l.source;
        const v = l.target;
        if (adj.has(u)) adj.get(u)!.push(l);
        if (reverseAdj.has(v)) reverseAdj.get(v)!.push(l);
    });

    // 2. Topological Sort (Kahn's)
    const inDegree = new Map<string, number>();
    nodes.forEach(n => inDegree.set(n.id, 0));
    links.forEach(l => inDegree.set(l.target, (inDegree.get(l.target) || 0) + 1));

    const queue: string[] = [];
    nodes.forEach(n => {
        if ((inDegree.get(n.id) || 0) === 0) queue.push(n.id);
    });

    const topoOrder: string[] = [];
    while (queue.length > 0) {
        const u = queue.shift()!;
        topoOrder.push(u);
        const neighbors = adj.get(u) || [];
        neighbors.forEach(l => {
            const v = l.target;
            inDegree.set(v, (inDegree.get(v) || 0) - 1);
            if (inDegree.get(v) === 0) queue.push(v);
        });
    }

    // 3. Forward Pass (ES)
    topoOrder.forEach(uId => {
        const u = nodeMap.get(uId)!;
        const outEdges = adj.get(uId) || [];
        outEdges.forEach(l => {
            l.ef = (u.es || 0) + l.duration;
            const v = nodeMap.get(l.target)!;
            if (l.ef > (v.es || 0)) {
                v.es = l.ef;
            }
        });
    });

    // Project Duration
    let projectDuration = 0;
    nodes.forEach(n => {
        if ((n.es || 0) > projectDuration) projectDuration = n.es || 0;
    });

    // 4. Backward Pass (LS)
    nodes.forEach(n => {
        const outDegree = (adj.get(n.id) || []).length;
        if (outDegree === 0) {
            n.ls = n.es; // Sink node LS = ES
        } else {
            n.ls = projectDuration;
        }
    });

    for (let i = topoOrder.length - 1; i >= 0; i--) {
        const uId = topoOrder[i];
        const u = nodeMap.get(uId)!;
        const outEdges = adj.get(uId) || [];

        let minLS = Infinity;
        if (outEdges.length > 0) {
            outEdges.forEach(l => {
                const v = nodeMap.get(l.target)!;
                const linkLS = (v.ls || projectDuration) - l.duration;
                if (linkLS < minLS) minLS = linkLS;

                l.lf = v.ls;
                l.ef = (u.es || 0) + l.duration;
                l.tf = (v.ls || 0) - l.duration - (u.es || 0);
                if (Math.abs(l.tf!) < 0.0001) l.tf = 0;
                l.isCritical = l.tf === 0;
            });
            u.ls = minLS;
        }
    }

    return { nodes, links, duration: projectDuration };
};

// Layout with Adaptive Scaling for labels
const performLayout = (nodes: ArrowNode[], links: ArrowLink[]): { nodes: ArrowNode[], pixelsPerTime: number } => {
    // 1. Calculate optimal pixelsPerTime based on label density
    let maxRatio = 0;
    links.forEach(l => {
        if (l.duration > 0) {
            // Approx width + padding, assume 8px per char + 40px base padding
            const labelLen = (l.label || '').length * 8 + 40;
            const ratio = labelLen / l.duration;
            if (ratio > maxRatio) maxRatio = ratio;
        }
    });

    // Default 24, typically 30-50 covers most needs. Cap at 120.
    let pixelsPerTime = Math.max(24, maxRatio);
    if (pixelsPerTime > 120) pixelsPerTime = 120;

    const padding = 100;
    const yStep = 180;

    // X: Time Scaled
    nodes.forEach(n => {
        n.x = padding + (n.es || 0) * pixelsPerTime;
    });

    // Y: Simple heuristics (Lane assignment)
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    nodes.forEach(n => n.y = 0); // Reset

    // Identify Start Nodes
    const starts = nodes.filter(n => n.es === 0);
    const assigned = new Set<string>();

    const assignY = (uId: string, currentY: number) => {
        if (assigned.has(uId)) return;

        const u = nodeMap.get(uId);
        if (!u) return;

        u.y = currentY;
        assigned.add(uId);

        // Outgoing links
        const outLinks = links.filter(l => l.source === uId);
        if (outLinks.length === 0) return;

        // Sort: Critical first (to keep straight), then others
        outLinks.sort((a, b) => {
            if (a.isCritical && !b.isCritical) return -1;
            if (!a.isCritical && b.isCritical) return 1;
            return 0;
        });

        // Distribute children
        const children = outLinks.map(l => l.target);
        const unassignedChildren = children.filter(c => !assigned.has(c));

        if (unassignedChildren.length === 0) return;

        const totalH = (unassignedChildren.length - 1) * yStep;
        let startChildY = currentY - totalH / 2;

        unassignedChildren.forEach((childId, idx) => {
            assignY(childId, startChildY + idx * yStep);
        });
    };

    starts.forEach((n, i) => {
        // Distribute multiple start nodes vertically
        assignY(n.id, 300 + i * yStep * 1.5);
    });

    // Ensure all assigned
    nodes.forEach(n => {
        if (!assigned.has(n.id)) n.y = 300;
    });

    return { nodes, pixelsPerTime };
};

export const parseArrowDSL = (content: string): { data: ArrowData, styles: ArrowChartStyles } => {
    const lines = content.split('\n');
    const newStyles = { ...DEFAULT_ARROW_STYLES };
    const nodes: ArrowNode[] = [];
    const links: ArrowLink[] = [];
    let title = '矢线图';

    const nodeMap = new Map<string, ArrowNode>();
    const getOrCreateNode = (id: string, label?: string) => {
        if (!nodeMap.has(id)) {
            const newNode = { id, label: label || id };
            nodeMap.set(id, newNode);
            nodes.push(newNode);
        } else if (label) {
            nodeMap.get(id)!.label = label;
        }
        return nodeMap.get(id)!;
    };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        if (trimmed.startsWith('Title:')) { title = trimmed.substring(6).trim(); return; }
        if (trimmed.startsWith('ShowCritical:')) { newStyles.showCriticalPath = trimmed.substring(13).trim() === 'true'; return; }
        if (trimmed.startsWith('Color[Node]:')) { newStyles.nodeColor = trimmed.substring(12).trim(); return; }
        if (trimmed.startsWith('Color[Line]:')) { newStyles.lineColor = trimmed.substring(12).trim(); return; }
        if (trimmed.startsWith('Color[Critical]:')) { newStyles.criticalLineColor = trimmed.substring(16).trim(); return; }

        if (trimmed.startsWith('Event:')) {
            const parts = trimmed.substring(6).split(',').map(s => s.trim());
            if (parts.length > 0) getOrCreateNode(parts[0], parts[1]);
            return;
        }

        const isDummy = trimmed.includes('..>');
        const separator = isDummy ? '..>' : '->';
        if (trimmed.includes(separator)) {
            const [relPart, metaPart] = trimmed.split(':').map(s => s.trim());
            const [srcId, tgtId] = relPart.split(separator).map(s => s.trim());
            let duration = 0, label = '';
            if (metaPart) {
                const metaParts = metaPart.split(',').map(s => s.trim());
                duration = parseFloat(metaParts[0]) || 0;
                label = metaParts[1] || '';
            }
            if (srcId && tgtId) {
                getOrCreateNode(srcId);
                getOrCreateNode(tgtId);
                links.push({ source: srcId, target: tgtId, duration, label, isDummy });
            }
        }
    });

    const cpmResult = calculateCPM(nodes, links);
    const layout = performLayout(cpmResult.nodes, cpmResult.links);

    return {
        data: { title, nodes: layout.nodes, links: cpmResult.links },
        styles: newStyles
    };
};

const generateDSLFromData = (data: ArrowData, styles: ArrowChartStyles): string => {
    let dsl = `Title: ${data.title}\n`;
    dsl += `ShowCritical: ${styles.showCriticalPath}\n`;
    dsl += `Color[Node]: ${styles.nodeColor}\n`;
    dsl += `Color[Line]: ${styles.lineColor}\n`;
    dsl += `Color[Critical]: ${styles.criticalLineColor}\n\n`;

    dsl += `// Nodes\n`;
    data.nodes.forEach(n => {
        dsl += `Event: ${n.id}, ${n.label}\n`;
    });
    dsl += `\n// Links\n`;
    data.links.forEach(l => {
        const dummy = l.isDummy ? '..>' : '->';
        dsl += `${l.source}${dummy}${l.target}: ${l.duration}, ${l.label}\n`;
    });

    return dsl;
};


// --- Editor Component ---

interface ArrowDiagramEditorProps {
    data: ArrowData;
    styles: ArrowChartStyles;
    onDataChange: (data: ArrowData) => void;
    onStylesChange: (styles: ArrowChartStyles) => void;
}

export const ArrowDiagramEditor: React.FC<ArrowDiagramEditorProps> = ({
    data,
    styles,
    onDataChange,
    onStylesChange
}) => {
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [dslContent, setDslContent] = useState(() => generateDSLFromData(data, styles));
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiStatus, setAiStatus] = useState<string>('Checking...');
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        // Initial Parse removed to prevent state reset on navigation
        getAIStatus().then(setAiStatus);
    }, []);

    const handleParseDSL = (val: string) => {
        try {
            const { data: parsedData, styles: parsedStyles } = parseArrowDSL(val);
            onDataChange(parsedData);
            onStylesChange(parsedStyles);
        } catch (e) {
            console.error('Arrow DSL Parse Error:', e);
        }
    };

    const handleDSLChange = (newDsl: string) => {
        setDslContent(newDsl);
        handleParseDSL(newDsl);
    };

    const updateFromManual = (newData: ArrowData, newStyles: ArrowChartStyles) => {
        const newDsl = generateDSLFromData(newData, newStyles);
        setDslContent(newDsl);
        onDataChange(newData);
        onStylesChange(newStyles);
    };

    // --- Manual Actions ---
    const addNode = () => {
        const id = (data.nodes.length + 1).toString();
        const newNode: ArrowNode = { id, label: `Node ${id}`, es: 0, ls: 0 }; // temporary values
        const newData = { ...data, nodes: [...data.nodes, newNode] };
        updateFromManual(newData, styles);
    };

    const updateNode = (idx: number, field: keyof ArrowNode, value: string) => {
        const newNodes = [...data.nodes];
        newNodes[idx] = { ...newNodes[idx], [field]: value };
        const newData = { ...data, nodes: newNodes };
        updateFromManual(newData, styles);
    };

    const deleteNode = (idx: number) => {
        const nodeId = data.nodes[idx].id;
        const newNodes = data.nodes.filter((_, i) => i !== idx);
        // Also remove related links
        const newLinks = data.links.filter(l => l.source !== nodeId && l.target !== nodeId);
        const newData = { ...data, nodes: newNodes, links: newLinks };
        updateFromManual(newData, styles);
    };

    const addLink = () => {
        if (data.nodes.length < 2) return;
        const src = data.nodes[data.nodes.length - 2].id;
        const tgt = data.nodes[data.nodes.length - 1].id;
        const newLink: ArrowLink = { source: src, target: tgt, duration: 5, label: 'Task', isDummy: false };
        const newData = { ...data, links: [...data.links, newLink] };
        updateFromManual(newData, styles);
    };

    const updateLink = (idx: number, field: keyof ArrowLink, value: any) => {
        const newLinks = [...data.links];
        newLinks[idx] = { ...newLinks[idx], [field]: value };
        const newData = { ...data, links: newLinks };
        updateFromManual(newData, styles);
    };

    const deleteLink = (idx: number) => {
        const newLinks = data.links.filter((_, i) => i !== idx);
        const newData = { ...data, links: newLinks };
        updateFromManual(newData, styles);
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const dsl = await generateLogicDSL(aiPrompt, QCToolType.ARROW);
            setDslContent(dsl);
            handleParseDSL(dsl);
            setActiveTab('dsl');
        } catch (error) {
            console.error('AI Generation Failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？当前所有修改将丢失。')) {
            setDslContent(INITIAL_ARROW_DSL);
            handleParseDSL(INITIAL_ARROW_DSL);
        }
    };

    const updateStyle = <K extends keyof ArrowChartStyles>(key: K, value: ArrowChartStyles[K]) => {
        const newStyles = { ...styles, [key]: value };
        updateFromManual(data, newStyles); // Also update DSL
    };

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-white relative">
            {/* Header Area */}
            <div className="p-6 border-b border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                            <Network size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">矢线图引擎</h2>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">ARROW DIAGRAM ENGINE V1.0</p>
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
                            onClick={() => setShowHelp(true)}
                            className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all border border-slate-700"
                            title="DSL Specification"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <nav className="flex gap-2 p-1.5 bg-slate-900/50 rounded-2xl border border-slate-800">
                    {[
                        { id: 'manual', label: '手动录入', icon: <Settings2 size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id
                                ? 'bg-indigo-600 text-white shadow-xl'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'manual' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        {/* Global Settings */}
                        <div className="p-6 bg-black/30 rounded-[2rem] border border-slate-800/50 space-y-4 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <LayoutGrid size={16} className="text-indigo-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">全局布局与显示</span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-col gap-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">项目标题</span>
                                    <input
                                        value={data.title || ''}
                                        onChange={(e) => updateFromManual({ ...data, title: e.target.value }, styles)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 p-4 bg-slate-900/30 rounded-2xl border border-slate-800/50 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">显示关键路径</span>
                                        <button
                                            onClick={() => updateStyle('showCriticalPath', !styles.showCriticalPath)}
                                            className={`relative w-8 h-4 rounded-full transition-colors ${styles.showCriticalPath ? 'bg-indigo-500' : 'bg-slate-700'}`}
                                        >
                                            <span className={`absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${styles.showCriticalPath ? 'translate-x-4' : ''}`} />
                                        </button>
                                    </div>
                                    <div className="flex-1 p-4 bg-slate-900/30 rounded-2xl border border-slate-800/50 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">节点半径</span>
                                            <span className="text-[10px] font-mono text-indigo-400">{styles.nodeRadius}px</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="10" max="40"
                                            value={styles.nodeRadius}
                                            onChange={(e) => updateStyle('nodeRadius', Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Node Management */}
                        <div className="p-6 bg-black/30 rounded-[2rem] border border-slate-800/50 space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-4">
                                    <Database size={16} className="text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">节点定义 (Nodes)</span>
                                </div>
                                <button onClick={addNode} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"><Plus size={14} /></button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {data.nodes.map((node, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-slate-900/30 p-2 rounded-xl border border-slate-800/50">
                                        <div className="w-8 shrink-0 flex items-center justify-center text-[10px] font-mono text-slate-500">{idx + 1}</div>
                                        <input
                                            value={node.id}
                                            onChange={(e) => updateNode(idx, 'id', e.target.value)}
                                            placeholder="ID"
                                            className="w-16 bg-black/20 border border-slate-700/50 rounded-lg px-2 py-1 text-[10px] font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                                        />
                                        <input
                                            value={node.label || ''}
                                            onChange={(e) => updateNode(idx, 'label', e.target.value)}
                                            placeholder="Label"
                                            className="flex-1 bg-black/20 border border-slate-700/50 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-emerald-500"
                                        />
                                        <button onClick={() => deleteNode(idx)} className="p-1 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Link Management */}
                        <div className="p-6 bg-black/30 rounded-[2rem] border border-slate-800/50 space-y-4 shadow-2xl">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-4">
                                    <Activity size={16} className="text-blue-500" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">任务逻辑 (Tasks)</span>
                                </div>
                                <button onClick={addLink} className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all"><Plus size={14} /></button>
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                {data.links.map((link, idx) => (
                                    <div key={idx} className="flex flex-col gap-2 bg-slate-900/30 p-3 rounded-xl border border-slate-800/50">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2 flex-1">
                                                <select
                                                    value={link.source}
                                                    onChange={(e) => updateLink(idx, 'source', e.target.value)}
                                                    className="w-20 bg-black/20 border border-slate-700/50 rounded-lg px-1 py-1 text-[10px] font-mono text-blue-300 focus:outline-none focus:border-blue-500 appearance-none"
                                                >
                                                    <option value="" disabled>From</option>
                                                    {data.nodes.map(n => (
                                                        <option key={n.id} value={n.id}>{n.id}: {n.label}</option>
                                                    ))}
                                                </select>
                                                <ArrowRight size={10} className="text-slate-600" />
                                                <select
                                                    value={link.target}
                                                    onChange={(e) => updateLink(idx, 'target', e.target.value)}
                                                    className="w-20 bg-black/20 border border-slate-700/50 rounded-lg px-1 py-1 text-[10px] font-mono text-blue-300 focus:outline-none focus:border-blue-500 appearance-none"
                                                >
                                                    <option value="" disabled>To</option>
                                                    {data.nodes.map(n => (
                                                        <option key={n.id} value={n.id}>{n.id}: {n.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button onClick={() => deleteLink(idx)} className="p-1 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                value={link.label || ''}
                                                onChange={(e) => updateLink(idx, 'label', e.target.value)}
                                                placeholder="Task Name"
                                                className="flex-1 bg-black/20 border border-slate-700/50 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500"
                                            />
                                            <div className="flex items-center gap-1 bg-black/20 px-2 rounded-lg border border-slate-700/50">
                                                <span className="text-[9px] text-slate-500 font-bold uppercase">Time</span>
                                                <input
                                                    type="number"
                                                    value={link.duration}
                                                    onChange={(e) => updateLink(idx, 'duration', Number(e.target.value))}
                                                    className="w-8 bg-transparent text-right text-[10px] font-mono text-indigo-300 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pl-1">
                                            <input
                                                type="checkbox"
                                                checked={link.isDummy}
                                                onChange={(e) => updateLink(idx, 'isDummy', e.target.checked)}
                                                className="w-3 h-3 rounded bg-slate-800 border-slate-600 accent-amber-500"
                                            />
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">虚任务 (Dummy)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-black/30 rounded-[2rem] border border-slate-800/50 space-y-4 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <Sparkles size={16} className="text-indigo-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">色彩风格配置</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-800/50 space-y-3">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">节点样式</span>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-slate-400">背景色</span>
                                            <input type="color" value={styles.nodeColor} onChange={e => updateStyle('nodeColor', e.target.value)} className="w-4 h-4 rounded bg-transparent border-0 cursor-pointer" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-slate-400">文字色</span>
                                            <input type="color" value={styles.nodeTextColor} onChange={e => updateStyle('nodeTextColor', e.target.value)} className="w-4 h-4 rounded bg-transparent border-0 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-800/50 space-y-3">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">连线样式</span>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-slate-400">常规连线</span>
                                            <input type="color" value={styles.lineColor} onChange={e => updateStyle('lineColor', e.target.value)} className="w-4 h-4 rounded bg-transparent border-0 cursor-pointer" />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-red-400 font-bold">关键路径</span>
                                            <input type="color" value={styles.criticalLineColor} onChange={e => updateStyle('criticalLineColor', e.target.value)} className="w-4 h-4 rounded bg-transparent border-0 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'dsl' && (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center px-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Arrow DSL Script</span>
                            <span className={`text-[10px] font-mono ${dslContent.length > 500 ? 'text-amber-500' : 'text-slate-600'}`}>
                                {dslContent.length} CHARS
                            </span>
                        </div>
                        <textarea
                            value={dslContent}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="flex-1 w-full bg-black/40 text-indigo-100 p-6 font-mono text-[11px] leading-relaxed border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none custom-scrollbar"
                            spellCheck={false}
                            placeholder="Enter Arrow Diagram DSL..."
                        />
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-6 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">AI 智能助手</span>
                                <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_#6366f1]" />
                                    <span className="text-[9px] font-black text-indigo-500 uppercase">Engine: {aiStatus}</span>
                                </div>
                            </div>
                            <textarea
                                className="w-full h-48 bg-slate-900/50 text-slate-200 p-6 text-sm leading-relaxed border border-slate-800 rounded-[2rem] focus:outline-none focus:border-indigo-500 transition-all resize-none shadow-inner"
                                placeholder="请输入您的项目描述，例如：'我们需要在这周内完成新办公室的搬迁，包含打包、运输、网络布线和设备调试，打包和网络布线可以同时开始...'"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                            />
                            <button
                                onClick={handleGenerateAI}
                                disabled={!aiPrompt.trim() || isGenerating}
                                className={`w-full h-14 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-emerald-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在构建网络逻辑...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并回填</span>
                                    </>
                                )}
                            </button>

                            {/* Inference Hint Card */}
                            <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 space-y-3">
                                <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">推理提示</h4>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    您可以输入如“某新产品研发流程，包含立项、研发、测试、市场推广及发布，其中研发和市场推广并行...”等自然语言描述。
                                    <br /><br />
                                    AI 将自动为您推演完整的网络图逻辑，识别关键路径，并生成符合 Arrow Diagram 语法的 DSL 代码。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Help Modal */}
            {showHelp && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-[#020617]/90 backdrop-blur-3xl">
                    <div className="bg-[#0f172a] w-[900px] h-[800px] rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden shadow-2xl relative">
                        <div className="px-10 py-8 flex flex-col border-b border-slate-800 shrink-0 gap-6 bg-[#0f172a]/80 backdrop-blur-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-indigo-500/20 rounded-xl">
                                        <HelpCircle size={24} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Arrow Diagram Manual</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Version 2.0 • CPM Engine</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowHelp(false)} className="p-3 hover:bg-slate-800 rounded-xl transition-all text-slate-500 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <nav className="flex bg-black/40 p-1 rounded-2xl border border-slate-800/80 w-fit">
                                {[
                                    { id: 'dsl', label: 'DSL 规范说明' },
                                    { id: 'logic', label: '核心算法逻辑' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setDocTab(t.id as any)}
                                        className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10 text-slate-300">
                            {docTab === 'dsl' ? (
                                <div className="space-y-12">
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-indigo-400 border-b border-indigo-500/20 pb-4">
                                            <Database size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">1. 主要元素定义</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">A. 全局配置</p>
                                                <table className="w-full text-[10px] font-mono border-collapse bg-black/20 rounded-lg overflow-hidden">
                                                    <thead>
                                                        <tr className="text-slate-400 text-left bg-slate-800/50">
                                                            <th className="p-3 w-32">指令</th>
                                                            <th className="p-3 w-48">示例</th>
                                                            <th className="p-3">说明</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50">
                                                        <tr><td className="p-3 text-indigo-400">Title</td><td className="p-3">Title: 某项目计划</td><td className="p-3 text-slate-400">设置图表标题</td></tr>
                                                        <tr><td className="p-3 text-indigo-400">ShowCritical</td><td className="p-3">ShowCritical: true</td><td className="p-3 text-slate-400">开启/关闭关键路径高亮</td></tr>
                                                        <tr><td className="p-3 text-indigo-400">Color[*]</td><td className="p-3">Color[Node]: #ff0000</td><td className="p-3 text-slate-400">自定义颜色 (Node, Line, Critical)</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">B. 节点与任务</p>
                                                <table className="w-full text-[10px] font-mono border-collapse bg-black/20 rounded-lg overflow-hidden">
                                                    <thead>
                                                        <tr className="text-slate-400 text-left bg-slate-800/50">
                                                            <th className="p-3 w-32">类型</th>
                                                            <th className="p-3 w-48">语法</th>
                                                            <th className="p-3">说明</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50">
                                                        <tr><td className="p-3 text-emerald-400">节点 (Node)</td><td className="p-3">Event: 1, 需求分析</td><td className="p-3 text-slate-400">定义节点ID和别名 (可选)</td></tr>
                                                        <tr><td className="p-3 text-blue-400">任务 (Activity)</td><td className="p-3">1-&gt;2: 5, 设计</td><td className="p-3 text-slate-400">从节点1到2，工期5天，名称"设计"</td></tr>
                                                        <tr><td className="p-3 text-amber-400">虚工序 (Dummy)</td><td className="p-3">2..&gt;3: 0, 虚任务</td><td className="p-3 text-slate-400">虚线连接，通常工期为0，用于逻辑依赖</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-amber-400 border-b border-amber-500/20 pb-4">
                                            <GitFork size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">2. 完整案例展示</span>
                                        </div>
                                        <div className="p-8 bg-black/40 rounded-[2rem] border border-white/5 font-mono text-[10px] leading-relaxed relative overflow-hidden group">
                                            <div className="absolute top-4 right-6 text-[8px] font-black text-slate-700 uppercase tracking-widest">Sample Construction Schedule</div>
                                            <div className="text-emerald-500">Title: 软件开发进度网络图</div>
                                            <div className="text-emerald-500">ShowCritical: true</div>
                                            <br />
                                            <div className="text-slate-500">// 节点定义</div>
                                            <div className="text-blue-400">Event: 1, 项目启动</div>
                                            <div className="text-blue-400">Event: 6, 项目结束</div>
                                            <br />
                                            <div className="text-slate-500">// 任务逻辑</div>
                                            <div className="text-indigo-300">1-&gt;2: 5, 需求分析</div>
                                            <div className="text-indigo-300">2-&gt;3: 10, 架构设计</div>
                                            <div className="text-indigo-300">2-&gt;4: 5, UI设计</div>
                                            <br />
                                            <div className="text-slate-500">// 虚任务示例</div>
                                            <div className="text-amber-500">4..&gt;3: 0, 虚活动示例 (dummy)</div>
                                            <br />
                                            <div className="text-indigo-300">3-&gt;5: 15, 后端开发</div>
                                            <div className="text-indigo-300">4-&gt;5: 10, 前端开发</div>
                                            <div className="text-indigo-300">5-&gt;6: 5, 联调测试</div>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-emerald-400 border-b border-emerald-500/20 pb-4">
                                            <Activity size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">关键路径法 (CPM) 原理</span>
                                        </div>
                                        <div className="p-8 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-6 text-xs leading-relaxed text-slate-400">
                                            <p>
                                                Smart QC Studio 采用标准的 <strong className="text-emerald-400">CPM (Critical Path Method)</strong> 算法来确定项目工期和关键路径。
                                                系统会自动计算每项任务的<b>最早开始时间 (ES)</b>、<b>最晚开始时间 (LS)</b> 以及<b>总时差 (Total Float)</b>。
                                            </p>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-3 bg-black/20 p-5 rounded-xl border border-white/5">
                                                    <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">1. 正向递推 (Forward Pass)</h5>
                                                    <p>从起点开始，沿箭头方向计算每个节点的最早开始时间。</p>
                                                    <code className="block bg-black/30 p-2 rounded text-[10px] font-mono text-slate-300">ES(j) = max(ES(i) + Duration(i→j))</code>
                                                    <p>这一步确定了整个项目的<b>最短总工期</b>。</p>
                                                </div>
                                                <div className="space-y-3 bg-black/20 p-5 rounded-xl border border-white/5">
                                                    <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">2. 反向递推 (Backward Pass)</h5>
                                                    <p>从终点开始，逆箭头方向推算每个节点的最晚结束时间。</p>
                                                    <code className="block bg-black/30 p-2 rounded text-[10px] font-mono text-slate-300">LS(i) = min(LS(j) - Duration(i→j))</code>
                                                </div>
                                            </div>

                                            <div className="space-y-3 bg-emerald-900/10 p-5 rounded-xl border border-emerald-500/20">
                                                <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">3. 判定关键路径 (Critical Path)</h5>
                                                <p>
                                                    即<b>总时差 (Total Float) 为零</b>的任务集合。这些任务没有机动时间，其任何延迟都会直接导致项目总工期延误。
                                                </p>
                                                <code className="block bg-black/30 p-2 rounded text-[10px] font-mono text-emerald-300">Total Float = LS - ES - Duration = 0</code>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
