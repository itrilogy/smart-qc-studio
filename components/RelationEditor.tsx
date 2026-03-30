import React, { useState, useEffect } from 'react';
import {
    createPortal } from 'react-dom';
import { RelationNode,
    RelationLink,
    RelationChartStyles,
    DEFAULT_RELATION_STYLES,
    RelationLayoutType } from '../types';
import {
    ChevronRight,
    Save,
    Trash2,
    Plus,
    Edit3,
    Settings2,
    ArrowRight,
    LayoutGrid,
    Circle,
    Workflow,
    Sparkles,
    HelpCircle,
    X,
    Loader2,
    Database,
    Code,
    RotateCcw,
    Cpu,
    Zap
} from 'lucide-react';
import { generateLogicDSL, getAIStatus } from '../services/aiService';
import { QCToolType } from '../types';
import { INITIAL_RELATION_DATA, INITIAL_RELATION_DSL } from '../constants';

export const parseRelationDSL = (content: string, currentStyles: RelationChartStyles = DEFAULT_RELATION_STYLES): { nodes: RelationNode[], links: RelationLink[], styles: RelationChartStyles } => {
    try {
        const lines = content.split('\n');
        const newStyles: RelationChartStyles = { ...currentStyles };
        const newNodes: RelationNode[] = [];
        const newLinks: RelationLink[] = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('//')) return;

            // Properties
            if (trimmed.startsWith('Title:')) {
                newStyles.title = trimmed.replace('Title:', '').trim();
                return;
            }

            // Layout: Centralized/Directional/Free
            if (trimmed.startsWith('Layout:')) {
                const layoutVal = trimmed.replace('Layout:', '').trim();
                if (['Centralized', 'Directional', 'Free'].includes(layoutVal)) {
                    newStyles.layout = layoutVal as RelationLayoutType;
                }
                return;
            }

            // Colors
            const colorMatch = trimmed.match(/Color\[(Root|RootText|Middle|MiddleText|End|EndText|Line)\]:\s*(#[0-9a-fA-F]+)/i);
            if (colorMatch) {
                const keyMap: Record<string, string> = {
                    'Root': 'rootColor',
                    'RootText': 'rootTextColor',
                    'Middle': 'middleColor',
                    'MiddleText': 'middleTextColor',
                    'End': 'endColor',
                    'EndText': 'endTextColor',
                    'Line': 'lineColor'
                };
                const styleKey = keyMap[colorMatch[1]];
                if (styleKey) (newStyles as any)[styleKey] = colorMatch[2];
                return;
            }

            // Fonts
            const fontMatch = trimmed.match(/Font\[(Title|Node)\]:\s*(\d+)/i);
            if (fontMatch) {
                if (fontMatch[1].toLowerCase() === 'title') newStyles.titleFontSize = parseInt(fontMatch[2]);
                if (fontMatch[1].toLowerCase() === 'node') newStyles.nodeFontSize = parseInt(fontMatch[2]);
                return;
            }

            // Nodes: Node: id, label
            if (trimmed.startsWith('Node:')) {
                const parts = trimmed.replace('Node:', '').split(',').map(s => s.trim());
                if (parts.length >= 2) {
                    newNodes.push({ id: parts[0], label: parts[1] });
                }
            }

            // Links: Rel: source -> target
            if (trimmed.startsWith('Rel:')) {
                const relPart = trimmed.replace('Rel:', '').trim();
                const parts = relPart.split('->').map(s => s.trim());
                if (parts.length === 2) {
                    newLinks.push({ source: parts[0], target: parts[1] });
                }
            }
        });

        // Cycle Detection & Type Calculation
        const adjacency = new Map<string, string[]>();
        newNodes.forEach(n => adjacency.set(n.id, []));
        newLinks.forEach(l => {
            if (l.source !== l.target) {
                if (!adjacency.has(l.source)) adjacency.set(l.source, []);
                adjacency.get(l.source)?.push(l.target);
            }
        });

        // Self-Reference Detection
        newLinks.forEach(l => {
            if (l.source === l.target) {
                throw new Error(`检测到自引用连线: ${l.source} -> ${l.target}。因果关系不能指向自身。`);
            }
        });

        // Cycle Detection (DFS)
        const hasCycle = () => {
            const visited = new Set<string>();
            const recStack = new Set<string>();

            const isCyclic = (nodeId: string): boolean => {
                if (recStack.has(nodeId)) return true;
                if (visited.has(nodeId)) return false;

                visited.add(nodeId);
                recStack.add(nodeId);

                const neighbors = adjacency.get(nodeId) || [];
                for (const neighbor of neighbors) {
                    if (isCyclic(neighbor)) return true;
                }

                recStack.delete(nodeId);
                return false;
            };

            for (const node of newNodes) {
                if (isCyclic(node.id)) return true;
            }
            return false;
        };

        if (hasCycle()) {
            throw new Error('检测到逻辑循环回路！请检查因果路径。');
        }

        const inDegree = new Map<string, number>();
        const outDegree = new Map<string, number>();
        newNodes.forEach(n => { inDegree.set(n.id, 0); outDegree.set(n.id, 0); });
        newLinks.forEach(l => {
            outDegree.set(l.source, (outDegree.get(l.source) || 0) + 1);
            inDegree.set(l.target, (inDegree.get(l.target) || 0) + 1);
        });

        newNodes.forEach(n => {
            const ind = inDegree.get(n.id) || 0;
            const outd = outDegree.get(n.id) || 0;
            // Logical mapping:
            // Out-degree 0 = Symptom (Root/Sink)
            // In-degree 0 = Root Cause (End/Source)
            if (outd === 0) {
                n.type = 'root';
            } else if (ind === 0) {
                n.type = 'end';
            } else {
                n.type = 'middle';
            }
        });

        return { nodes: newNodes, links: newLinks, styles: newStyles };
    } catch (e) {
        throw e;
    }
};

interface RelationEditorProps {
    nodes: RelationNode[];
    links: RelationLink[];
    styles: RelationChartStyles;
    onDataChange: (nodes: RelationNode[], links: RelationLink[]) => void;
    onStylesChange: (styles: RelationChartStyles) => void;
}

const RelationEditor: React.FC<RelationEditorProps> = ({
    nodes,
    links,
    styles = DEFAULT_RELATION_STYLES,
    onDataChange,
    onStylesChange
}) => {
    const [dsl, setDsl] = useState(INITIAL_RELATION_DSL);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [error, setError] = useState<string | null>(null);

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [engineName, setEngineName] = useState('DeepSeek');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    // --- LOGIC: DSL Parsing ---
    const handleParseDSL = (content: string) => {
        try {
            const { nodes: newNodes, links: newLinks, styles: newStyles } = parseRelationDSL(content, styles);
            onStylesChange(newStyles);
            onDataChange(newNodes, newLinks);
            setError(null);
        } catch (e: any) {
            setError(e.message || 'DSL 解析错误');
        }
    };

    const handleDSLChange = (val: string) => {
        setDsl(val);
        handleParseDSL(val);
    };

    // --- LOGIC: DSL Generation ---
    const generateDSLFromData = () => {
        let dslContent = `Title: ${styles.title || '关联图'}\n\n`;

        dslContent += `Layout: ${styles.layout || 'Directional'}\n`;
        dslContent += `Color[Root]: ${styles.rootColor}\n`;
        dslContent += `Color[RootText]: ${styles.rootTextColor}\n`;
        dslContent += `Color[Middle]: ${styles.middleColor}\n`;
        dslContent += `Color[MiddleText]: ${styles.middleTextColor}\n`;
        dslContent += `Color[End]: ${styles.endColor}\n`;
        dslContent += `Color[EndText]: ${styles.endTextColor}\n`;
        dslContent += `Color[Line]: ${styles.lineColor}\n\n`;

        nodes.forEach(n => {
            // Filter out any accidentally left 'root' node just in case
            if (n.id !== 'root') {
                dslContent += `Node: ${n.id}, ${n.label}\n`;
            }
        });
        dslContent += `\n`;

        links.forEach(l => {
            dslContent += `Rel: ${l.source} -> ${l.target}\n`;
        });

        return dslContent;
    };

    // --- LOGIC: Manual Editor Actions ---
    const addNode = () => {
        const id = `n${Date.now().toString(36).substr(-4)}`;
        onDataChange([...nodes, { id, label: '新节点' }], links);
    };

    const updateNode = (id: string, label: string) => {
        onDataChange(nodes.map(n => n.id === id ? { ...n, label } : n), links);
    };

    const deleteNode = (id: string) => {
        onDataChange(
            nodes.filter(n => n.id !== id),
            links.filter(l => l.source !== id && l.target !== id)
        );
    };

    const addLink = () => {
        if (nodes.length < 2) return;
        const source = nodes[nodes.length - 2].id;
        const target = nodes[nodes.length - 1].id;
        onDataChange(nodes, [...links, { source, target }]);
    };

    const updateLink = (idx: number, field: 'source' | 'target', value: string) => {
        const newLinks = [...links];
        newLinks[idx] = { ...newLinks[idx], [field]: value };
        onDataChange(nodes, newLinks);
    };

    const deleteLink = (idx: number) => {
        const newLinks = [...links];
        newLinks.splice(idx, 1);
        onDataChange(nodes, newLinks);
    };


    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        try {
            const dslResult = (await generateLogicDSL(aiPrompt, QCToolType.RELATION)) as string;
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
            setDsl(INITIAL_RELATION_DSL);
            handleParseDSL(INITIAL_RELATION_DSL);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] relative transition-colors">
            {/* Header Area */}
            <div className="p-6 border-b border-[var(--sidebar-border)] space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                            <Cpu size={22} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-[var(--sidebar-text)] tracking-widest uppercase">关联度逻辑分析</h2>
                            <p className="text-[8px] text-[var(--sidebar-muted)] font-bold tracking-[0.2em] mt-1 uppercase">IQS Relation Engine | LUXI LAB</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReset}
                            className="p-3 bg-[var(--card-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-blue-400 transition-all border border-[var(--sidebar-border)] shadow-sm"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            onClick={() => setShowDocs(true)}
                            className="p-3 bg-[var(--card-bg)] rounded-lg text-[var(--sidebar-text)] hover:text-white transition-all border border-[var(--sidebar-border)] shadow-sm"
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>

                <nav className="flex gap-2 p-1.5 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)]">
                    {[
                        { id: 'manual', label: '手工录入', icon: <Edit3 size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => {
                                if (t.id === 'dsl') setDsl(generateDSLFromData());
                                setActiveTab(t.id as any);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-purple-600 text-white shadow-xl' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--card-bg)]'
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {activeTab === 'manual' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Global Settings */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 pl-2">
                                        <ChevronRight size={14} className="text-purple-500" />
                                        <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">图形标题</span>
                                    </div>
                                    <input
                                        value={styles.title || ''}
                                        onChange={e => onStylesChange({ ...styles, title: e.target.value })}
                                        className="w-full h-12 px-4 logic-terminal-input text-xs font-bold bg-[var(--input-bg)] text-[var(--sidebar-text)] border border-[var(--input-border)] rounded-lg focus:border-purple-500 outline-none shadow-inner"
                                        placeholder="图名称（用于导出文件命名）"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 pl-2">
                                        <LayoutGrid size={14} className="text-blue-500" />
                                        <span className="text-[10px] font-black text-[var(--sidebar-text)] uppercase tracking-widest">布局模式</span>
                                    </div>
                                    <select
                                        value={styles.layout || 'Directional'}
                                        onChange={e => onStylesChange({ ...styles, layout: e.target.value as any })}
                                        className="w-full h-12 px-4 text-xs font-bold bg-[var(--input-bg)] text-[var(--sidebar-text)] border border-[var(--input-border)] rounded-lg focus:border-blue-500 outline-none appearance-none"
                                    >
                                        <option value="Directional">单项汇集型</option>
                                        <option value="Centralized">中央集中型</option>
                                        <option value="Free">关系自由型</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Nodes Editor */}
                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-6 shadow-sm">
                            <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">节点列表</span>
                                <button
                                    onClick={addNode}
                                    className="text-[9px] font-black uppercase tracking-wider text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20 transition-all hover:bg-purple-500/20 shadow-sm"
                                >
                                    <Plus size={10} /> 添加节点
                                </button>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {(() => {
                                    // Calculate In-Degree to determine End nodes (Sources)
                                    // End Node = In-Degree 0 (No inputs)
                                    const inDegreeMap = new Map<string, number>();
                                    nodes.forEach(n => inDegreeMap.set(n.id, 0));
                                    links.forEach(l => {
                                        if (inDegreeMap.has(l.target)) {
                                            inDegreeMap.set(l.target, (inDegreeMap.get(l.target) || 0) + 1);
                                        }
                                    });

                                    return nodes.map(node => {
                                        const isEnd = (inDegreeMap.get(node.id) || 0) === 0;

                                        return (
                                            <div key={node.id} className="flex items-center gap-2 bg-[var(--sidebar-bg)] p-2 rounded-lg border border-[var(--sidebar-border)]">
                                                <div className="w-16 px-2 py-1 bg-[var(--input-bg)] rounded text-[9px] font-mono text-[var(--sidebar-muted)] truncate">{node.id}</div>
                                                <input
                                                    value={node.label}
                                                    onChange={e => updateNode(node.id, e.target.value)}
                                                    className="flex-1 bg-transparent border-none text-xs text-[var(--sidebar-text)] focus:ring-0 placeholder-[var(--sidebar-muted)] outline-none"
                                                    placeholder="节点名称"
                                                />
                                                {/* Only show tag if it is an End node */}
                                                {isEnd && (
                                                    <div className="px-1.5 py-0.5 rounded text-[8px] uppercase font-bold bg-blue-500/20 text-blue-400">
                                                        END
                                                    </div>
                                                )}
                                                <button onClick={() => deleteNode(node.id)} className="p-1.5 hover:bg-red-500/20 text-[var(--sidebar-muted)] hover:text-red-400 rounded transition-colors shadow-sm">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        {/* Links Editor */}
                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-6 shadow-sm">
                            <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">关系列表 (From {'->'} To)</span>
                                <button
                                    onClick={addLink}
                                    className="text-[9px] font-black uppercase tracking-wider text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20 transition-all hover:bg-purple-500/20 shadow-sm"
                                >
                                    <Plus size={10} /> 添加连线
                                </button>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {links.map((link, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-[var(--sidebar-bg)] p-2 rounded-lg border border-[var(--sidebar-border)]">
                                        <select
                                            value={link.source}
                                            onChange={e => updateLink(idx, 'source', e.target.value)}
                                            className="flex-1 bg-[var(--input-bg)] text-[10px] text-[var(--sidebar-text)] border border-[var(--input-border)] rounded p-1 outline-none"
                                        >
                                            {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                        </select>
                                        <ArrowRight size={12} className="text-[var(--sidebar-muted)]" />
                                        <select
                                            value={link.target}
                                            onChange={e => updateLink(idx, 'target', e.target.value)}
                                            className="flex-1 bg-[var(--input-bg)] text-[10px] text-[var(--sidebar-text)] border border-[var(--input-border)] rounded p-1 outline-none"
                                        >
                                            {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                                        </select>
                                        <button onClick={() => deleteLink(idx)} className="p-1.5 hover:bg-red-500/20 text-[var(--sidebar-muted)] hover:text-red-400 rounded transition-colors shadow-sm">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Styles */}
                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-6 shadow-sm">
                            <div className="flex items-center gap-4 border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">样式配置</span>
                            </div>
                            <div className="space-y-2">
                                {/* Root Styles */}
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">主要症结 (Root)</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-lg border border-[var(--sidebar-border)]">
                                            <input type="color" value={styles.rootColor} onChange={e => onStylesChange({ ...styles, rootColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[9px] font-mono text-[var(--sidebar-text)] leading-none">背景</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-lg border border-[var(--sidebar-border)]">
                                            <input type="color" value={styles.rootTextColor} onChange={e => onStylesChange({ ...styles, rootTextColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[9px] font-mono text-[var(--sidebar-text)] leading-none">文字</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle Styles */}
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">中间因素 (Middle)</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-lg border border-[var(--sidebar-border)]">
                                            <input type="color" value={styles.middleColor} onChange={e => onStylesChange({ ...styles, middleColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[9px] font-mono text-[var(--sidebar-text)] leading-none">背景</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-lg border border-[var(--sidebar-border)]">
                                            <input type="color" value={styles.middleTextColor} onChange={e => onStylesChange({ ...styles, middleTextColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[9px] font-mono text-[var(--sidebar-text)] leading-none">文字</span>
                                        </div>
                                    </div>
                                </div>

                                {/* End Styles */}
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">末端因素 (End)</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-lg border border-[var(--sidebar-border)]">
                                            <input type="color" value={styles.endColor} onChange={e => onStylesChange({ ...styles, endColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[9px] font-mono text-[var(--sidebar-text)] leading-none">背景</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-lg border border-[var(--sidebar-border)]">
                                            <input type="color" value={styles.endTextColor} onChange={e => onStylesChange({ ...styles, endTextColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[9px] font-mono text-[var(--sidebar-text)] leading-none">文字</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Line Style */}
                                <div className="space-y-1 pt-1 border-t border-[var(--sidebar-border)]">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <span className="text-[9px] text-[var(--sidebar-muted)] uppercase tracking-widest pl-1">连线 (Line)</span>
                                            <div className="flex items-center gap-1.5 bg-[var(--sidebar-bg)] p-1 rounded-lg border border-[var(--sidebar-border)]">
                                                <input type="color" value={styles.lineColor} onChange={e => onStylesChange({ ...styles, lineColor: e.target.value })} className="w-4 h-4 rounded bg-transparent cursor-pointer border-none p-0" />
                                                <span className="text-[9px] font-mono text-[var(--sidebar-text)] leading-none">Line</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'dsl' ? (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <textarea
                            value={dsl}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="flex-1 w-full bg-[var(--input-bg)] text-[var(--sidebar-text)] p-6 font-mono text-[11px] leading-relaxed border border-[var(--input-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none shadow-inner custom-scrollbar"
                            placeholder="输入 DSL 指令..."
                            spellCheck={false}
                        />
                        {error && <div className="text-red-500 text-xs font-bold px-4">{error}</div>}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-8 shadow-sm relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--sidebar-text)]">智能关联分析描述</span>
                                <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse shadow-[0_0_8px_#a855f7]" />
                                    <span className="text-[9px] font-black text-purple-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full  rounded-lg "
                                placeholder="输入复杂因果关系描述，例如：'分析导致项目延期的根本原因，包括人员流失、需求变更频繁、技术债务等'..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-lg flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-slate-800' : 'bg-purple-600 hover:bg-purple-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-purple-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在推演因果链...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并生成</span>
                                    </>
                                )}
                            </button>

                            <div className="p-8 bg-purple-900/10 border border-purple-800/20 rounded-lg space-y-4">
                                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">推理提示</p>
                                <p className="text-xs text-[var(--sidebar-text)] leading-relaxed font-medium">
                                    您可以输入复杂的因果描述，例如：“导致项目延期的原因包括人员流失、需求变更频繁等，其中需求变更频繁又导致了技术债务堆积”。AI 将自动梳理出逻辑链条并生成关联图。
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showDocs && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-black/60 backdrop-blur-md transition-all">
                    <div className="bg-[var(--sidebar-bg)] w-[800px] max-h-[85vh] rounded-lg border border-[var(--sidebar-border)] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="px-10 py-8 flex flex-col border-b border-[var(--sidebar-border)] shrink-0 gap-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-600/20 rounded-lg border border-purple-500/30">
                                        <Workflow size={24} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[var(--sidebar-text)] uppercase tracking-tighter">关联图知识库</h3>
                                        <p className="text-[10px] text-[var(--sidebar-muted)] font-bold uppercase tracking-widest mt-1">Relation Analysis Logic Base V1.2</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowDocs(false)} className="p-3 hover:bg-[var(--card-bg)] rounded-lg transition-all text-[var(--sidebar-text)] hover:text-white shadow-sm">
                                    <X size={24} />
                                </button>
                            </div>

                            <nav className="flex bg-[var(--input-bg)] p-1 rounded-lg border border-[var(--input-border)] w-fit">
                                {[
                                    { id: 'dsl', label: 'DSL 规范说明' },
                                    { id: 'logic', label: '分析逻辑与指南' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setDocTab(t.id as any)}
                                        className={`px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-purple-600 text-white shadow-lg' : 'text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)]'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar text-[var(--sidebar-text)]">
                            {docTab === 'dsl' ? (
                                <div className="space-y-12">
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-purple-400 border-b border-purple-500/20 pb-4">
                                            <Code size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">DSL 语法规范</span>
                                        </div>
                                        <div className="space-y-4">
                                            <table className="w-full text-[10px] font-mono border-collapse bg-[var(--sidebar-bg)] rounded-lg overflow-hidden border border-[var(--sidebar-border)]">
                                                <thead>
                                                    <tr className="text-[var(--sidebar-text)] text-left bg-[var(--input-bg)] border-b border-[var(--sidebar-border)]">
                                                        <th className="p-3">关键字</th>
                                                        <th className="p-3">说明</th>
                                                        <th className="p-3">示例</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--sidebar-border)]">
                                                    <tr><td className="p-3 text-purple-400">Title</td><td className="p-3 text-[var(--sidebar-text)]">定义图形主标题 (Metadata)</td><td className="p-3 text-[var(--sidebar-text)]">Title: 客户满意度分析</td></tr>
                                                    <tr><td className="p-3 text-emerald-400">Node</td><td className="p-3 text-[var(--sidebar-text)]">定义因素节点</td><td className="p-3 text-[var(--sidebar-text)]">Node: m1, 服务态度</td></tr>
                                                    <tr><td className="p-3 text-amber-400">Rel</td><td className="p-3 text-[var(--sidebar-text)]">定义因果箭头 (Source -{'>'} Target)</td><td className="p-3 text-[var(--sidebar-text)]">Rel: e1 -{'>'} m1</td></tr>
                                                    <tr><td className="p-3 text-blue-400">Color</td><td className="p-3 text-[var(--sidebar-text)]">节点与连线色彩配置</td><td className="p-3 text-[var(--sidebar-text)]">Color[Root]: #ff0000</td></tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-[10px] font-black text-[var(--sidebar-muted)] uppercase tracking-widest border-b border-[var(--sidebar-border)] pb-2">完整代码片段</h4>
                                        <div className="bg-[var(--input-bg)] p-6 rounded-lg border border-[var(--input-border)] font-mono text-[10px] text-emerald-400/80 leading-relaxed shadow-inner">
                                            <div className="whitespace-pre">
                                                {`Title: 效率提升缓慢分析
Layout: Directional
Color[Root]: #dbeafe
Color[RootText]: #1e40af
Node: m1, 流程繁琐
Node: e1, 缺乏信息化工具
Rel: e1 -> m1`}
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-purple-400 uppercase tracking-widest border-b border-purple-900/50 pb-2">关联图 (Relationship Diagram)</h4>
                                        <div className="p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-4 text-xs leading-relaxed text-[var(--sidebar-text)] shadow-sm">
                                            <p>关联图是将问题及其各种因素之间的复杂因果关系，用箭头连接起来的图形分析工具。它特别适用于原因相互交织、难以用鱼骨图等层级工具分析的场景。</p>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest border-b border-blue-900/50 pb-2">因果识别逻辑</h4>
                                        <div className="p-6 bg-[var(--input-bg)] rounded-lg border border-[var(--input-border)] space-y-4 text-xs leading-relaxed text-[var(--sidebar-text)] shadow-sm">
                                            <ul className="list-disc list-inside space-y-2">
                                                <li><strong>末端因素 (End/Source)</strong>: 只有引出箭头，没有指向自身的箭头。通常是根本原因。</li>
                                                <li><strong>中间因素 (Middle)</strong>: 既有接收箭头，也有引出箭头。</li>
                                                <li><strong>主要症结 (Root/Sink)</strong>: 在此场景下，即为分析的主题或结果。</li>
                                            </ul>
                                        </div>
                                    </section>

                                    <div className="p-6 bg-indigo-900/10 border border-indigo-800/20 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap size={14} className="text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase text-indigo-500">专家技巧</span>
                                        </div>
                                        <p className="text-[11px] text-[var(--sidebar-text)] font-medium italic mb-2">
                                            "一个节点如果具有极高的'入度'(指向它的箭头多)，通常意味着它是核心矛盾的体现；如果具有极高的'出度'(引出的箭头多)，则是问题的根源所在。"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-10 border-t border-[var(--sidebar-border)] bg-[var(--input-bg)] flex justify-center shrink-0">
                            <button
                                onClick={() => setShowDocs(false)}
                                className="px-16 py-4 bg-purple-600 text-white font-black rounded-lg text-[10px] uppercase tracking-widest shadow-xl hover:bg-purple-500 transition-all font-sans"
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

export default RelationEditor;
