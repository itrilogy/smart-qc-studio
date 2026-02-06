import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AffinityItem, AffinityChartStyles, DEFAULT_AFFINITY_STYLES } from '../types';
import {
    Boxes, Sparkles, HelpCircle, X, Loader2, Database, Code,
    ChevronRight, Save, Trash2, Plus, Edit3, Grid, Layers,
    AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter, Type, Settings2, RotateCcw, Zap
} from 'lucide-react';
import { generateLogicDSL, getAIStatus } from '../services/aiService';
import { QCToolType } from '../types';
import { INITIAL_AFFINITY_DATA, INITIAL_AFFINITY_DSL } from '../constants';

interface AffinityEditorProps {
    data: AffinityItem[];
    styles: AffinityChartStyles;
    onDataChange: (data: AffinityItem[]) => void;
    onStylesChange: (styles: AffinityChartStyles) => void;
}

export const parseAffinityDSL = (content: string, baseStyles: AffinityChartStyles = DEFAULT_AFFINITY_STYLES) => {
    const lines = content.split('\n');
    const newStyles: any = { ...baseStyles };
    const items: AffinityItem[] = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Properties
        if (trimmed.startsWith('Title:')) { newStyles.title = trimmed.replace('Title:', '').trim(); return; }
        if (trimmed.startsWith('Type:')) { newStyles.type = trimmed.replace('Type:', '').trim(); return; }
        if (trimmed.startsWith('Layout:')) { newStyles.layout = trimmed.replace('Layout:', '').trim(); return; }

        // Colors - Strict Keys
        const colorMatch = trimmed.match(/Color\[(TitleBg|TitleText|GroupHeaderBg|GroupHeaderText|ItemBg|ItemText|Line|Border)\]:\s*(#[0-9a-fA-F]+)/i);
        if (colorMatch) {
            const keyMap: any = {
                'TitleBg': 'titleBackgroundColor',
                'TitleText': 'titleTextColor',
                'GroupHeaderBg': 'groupHeaderBackgroundColor',
                'GroupHeaderText': 'groupHeaderTextColor',
                'ItemBg': 'itemBackgroundColor',
                'ItemText': 'itemTextColor',
                'Line': 'lineColor',
                'Border': 'borderColor'
            };
            newStyles[keyMap[colorMatch[1]]] = colorMatch[2];
            return;
        }

        // Fonts - Strict Keys
        const fontMatch = trimmed.match(/Font\[(Title|GroupHeader|Item)\]:\s*(\d+)/i);
        if (fontMatch) {
            const keyMap: any = {
                'Title': 'titleFontSize',
                'GroupHeader': 'groupHeaderFontSize',
                'Item': 'itemFontSize'
            };
            newStyles[keyMap[fontMatch[1]]] = parseInt(fontMatch[2]);
            return;
        }

        // Items: Item: ID, Label, ParentID
        if (trimmed.startsWith('Item:')) {
            const parts = trimmed.replace('Item:', '').split(',').map(s => s.trim());
            if (parts.length >= 2) {
                items.push({
                    id: parts[0],
                    label: parts[1],
                    parentId: parts[2] || undefined,
                    children: []
                });
            }
        }
    });

    // Reconstruct Tree
    const rootItems: AffinityItem[] = [];
    const itemMap = new Map<string, AffinityItem>();
    items.forEach(i => itemMap.set(i.id, i));

    items.forEach(item => {
        if (item.parentId && itemMap.has(item.parentId)) {
            const parent = itemMap.get(item.parentId)!;
            parent.children = parent.children || [];
            parent.children.push(item);
        } else {
            rootItems.push(item);
        }
    });

    const realRootNode = items.find(i => i.id === 'root');
    const finalData = realRootNode && realRootNode.children ? realRootNode.children : rootItems.filter(i => i.id !== 'root');

    return { data: finalData, styles: newStyles };
};

const AffinityEditor: React.FC<AffinityEditorProps> = ({
    data,
    styles = DEFAULT_AFFINITY_STYLES,
    onDataChange,
    onStylesChange
}) => {
    // Guard against invalid data types from other tools during switching
    const isValidData = Array.isArray(data) && (data.length === 0 || (typeof data[0] === 'object' && 'label' in data[0]));

    if (!isValidData) {
        return <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">initializing affinity engine...</div>;
    }

    const [dsl, setDsl] = useState(INITIAL_AFFINITY_DSL);
    const [activeTab, setActiveTab] = useState<'manual' | 'dsl' | 'ai'>('manual');
    const [showDocs, setShowDocs] = useState(false);
    const [docTab, setDocTab] = useState<'dsl' | 'logic'>('dsl');
    const [error, setError] = useState<string | null>(null);

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiConfig, setAiConfig] = useState<any>(null);
    const [engineName, setEngineName] = useState('DeepSeek');

    useEffect(() => {
        getAIStatus().then(setEngineName);
    }, []);

    // AI Config Loader
    useEffect(() => {
        fetch('/chart_spec.json')
            .then(res => res.json())
            .then(config => setAiConfig(config))
            .catch(err => console.error('Failed to load AI config:', err));
    }, []);

    const handleParseDSL = (content: string) => {
        try {
            const { data: finalData, styles: newStyles } = parseAffinityDSL(content, styles);
            onDataChange(finalData);
            setError(null);
            onStylesChange(newStyles);
        } catch (e) {
            setError('DSL 解析错误');
        }
    };

    const handleDSLChange = (val: string) => {
        setDsl(val);
        handleParseDSL(val);
    };

    // --- LOGIC: DSL Generation ---
    const generateDSLFromData = () => {
        let dslContent = `Title: ${styles.title || '亲和图'}\nType: ${styles.type}\nLayout: ${styles.layout}\n\n`;

        dslContent += `Color[TitleBg]: ${styles.titleBackgroundColor}\n`;
        dslContent += `Color[TitleText]: ${styles.titleTextColor}\n`;
        dslContent += `Font[Title]: ${styles.titleFontSize}\n\n`;

        dslContent += `Color[GroupHeaderBg]: ${styles.groupHeaderBackgroundColor}\n`;
        dslContent += `Color[GroupHeaderText]: ${styles.groupHeaderTextColor}\n`;
        dslContent += `Font[GroupHeader]: ${styles.groupHeaderFontSize}\n\n`;

        dslContent += `Color[ItemBg]: ${styles.itemBackgroundColor}\n`;
        dslContent += `Color[ItemText]: ${styles.itemTextColor}\n`;
        dslContent += `Font[Item]: ${styles.itemFontSize}\n\n`;

        dslContent += `Color[Line]: ${styles.lineColor}\n`;
        dslContent += `Color[Border]: ${styles.borderColor}\n\n`;

        // We need to generate a full item list. We'll start with a virtual root.
        dslContent += `Item: root, ${styles.title}\n`;

        const traverse = (items: AffinityItem[], pId: string) => {
            items.forEach(item => {
                dslContent += `Item: ${item.id}, ${item.label}, ${pId}\n`;
                if (item.children) traverse(item.children, item.id);
            });
        };
        traverse(data, 'root');

        return dslContent;
    };

    // --- LOGIC: Manual Editor Actions ---
    const updateItem = (id: string, newLabel: string) => {
        const updateRecursive = (items: AffinityItem[]): AffinityItem[] => {
            return items.map(item => {
                if (item.id === id) return { ...item, label: newLabel };
                if (item.children) return { ...item, children: updateRecursive(item.children) };
                return item;
            });
        };
        onDataChange(updateRecursive(data));
    };

    const addItem = (parentId?: string) => {
        const newItem: AffinityItem = { id: Math.random().toString(36).substr(2, 6), label: '新项目', children: [] };
        if (!parentId) {
            onDataChange([...data, newItem]);
        } else {
            const addRecursive = (items: AffinityItem[]): AffinityItem[] => {
                return items.map(item => {
                    if (item.id === parentId) return { ...item, children: [...(item.children || []), newItem] };
                    if (item.children) return { ...item, children: addRecursive(item.children) };
                    return item;
                });
            };
            onDataChange(addRecursive(data));
        }
    };

    const deleteItem = (id: string) => {
        const deleteRecursive = (items: AffinityItem[]): AffinityItem[] => {
            return items.filter(i => i.id !== id).map(item => ({
                ...item,
                children: item.children ? deleteRecursive(item.children) : []
            }));
        };
        onDataChange(deleteRecursive(data));
    };

    // --- RENDER HELPERS ---
    const renderTreeItem = (item: AffinityItem, depth: number) => (
        <div key={item.id} className="space-y-2">
            <div className={`flex items-center gap-2 group ${depth === 0 ? 'bg-slate-900/50 border border-slate-700/50' : ''} p-2 rounded-xl transition-all`}>
                <div style={{ width: depth * 12 }} />
                {depth === 0 ? <Database size={14} className="text-indigo-400" /> : <ChevronRight size={12} className="text-slate-600" />}

                <input
                    value={item.label}
                    onChange={(e) => updateItem(item.id, e.target.value)}
                    className="bg-transparent border-b border-transparent focus:border-indigo-500 outline-none text-xs font-medium text-slate-300 w-full hover:text-white transition-colors placeholder-slate-600"
                    placeholder="请输入项目名称..."
                />

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => addItem(item.id)} className="p-1.5 hover:bg-indigo-600/20 text-slate-500 hover:text-indigo-300 rounded-lg transition-colors"><Plus size={12} /></button>
                    <button onClick={() => deleteItem(item.id)} className="p-1.5 hover:bg-red-600/20 text-slate-500 hover:text-red-300 rounded-lg transition-colors"><Trash2 size={12} /></button>
                </div>
            </div>
            {item.children && item.children.map(c => renderTreeItem(c, depth + 1))}
        </div>
    );

    const generateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);

        try {
            // New Strict Logic: AI returns exact DSL string matches Help Spec
            const dslResult = (await generateLogicDSL(aiPrompt, QCToolType.AFFINITY)) as string;

            // Direct DSL Injection
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
            setDsl(INITIAL_AFFINITY_DSL);
            handleParseDSL(INITIAL_AFFINITY_DSL);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0f172a] text-white relative">
            {/* Header Area */}
            <div className="p-6 border-b border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                            <Boxes size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">亲和图引擎</h2>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">AFFINITY ENGINE V2.0</p>
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
                        { id: 'manual', label: '手动录入', icon: <Edit3 size={14} /> },
                        { id: 'dsl', label: 'DSL 编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => {
                                if (t.id === 'dsl') setDsl(generateDSLFromData());
                                setActiveTab(t.id as any);
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
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
                            <div className="flex items-center gap-3 pl-2">
                                <ChevronRight size={14} className="text-indigo-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">图表基本信息</span>
                            </div>
                            <input
                                value={styles.title || ''}
                                onChange={e => onStylesChange({ ...styles, title: e.target.value })}
                                className="w-full h-14 px-6 logic-terminal-input text-sm font-bold bg-[#0f172a] text-white border-slate-700 rounded-xl focus:border-indigo-500"
                                placeholder="例如：市场环境亲和图分析"
                            />
                        </div>

                        {/* Display Config */}
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-6 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">显示配置</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-300">渲染模式 (Card/Label)</span>
                                        <span className="text-[9px] text-slate-500 font-mono mt-0.5">TYPE: {styles.type.toUpperCase()}</span>
                                    </div>
                                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 items-center">
                                        <button
                                            onClick={() => onStylesChange({ ...styles, type: 'Card' })}
                                            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${styles.type === 'Card' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <Layers size={12} />
                                            <span className="text-[10px] font-black uppercase">Card</span>
                                        </button>
                                        <button
                                            onClick={() => onStylesChange({ ...styles, type: 'Label' })}
                                            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${styles.type === 'Label' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <Grid size={12} />
                                            <span className="text-[10px] font-black uppercase">Label</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-300">布局方向 (Layout)</span>
                                        <span className="text-[9px] text-slate-500 font-mono mt-0.5">DIR: {styles.layout.toUpperCase()}</span>
                                    </div>
                                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 items-center">
                                        <button
                                            onClick={() => onStylesChange({ ...styles, layout: 'Horizontal' })}
                                            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${styles.layout === 'Horizontal' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <AlignHorizontalJustifyCenter size={12} />
                                            <span className="text-[10px] font-black uppercase">Horz</span>
                                        </button>
                                        <button
                                            onClick={() => onStylesChange({ ...styles, layout: 'Vertical' })}
                                            className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all ${styles.layout === 'Vertical' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            <AlignVerticalJustifyCenter size={12} />
                                            <span className="text-[10px] font-black uppercase">Vert</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between">
                                        <span className="text-xs font-bold text-slate-300">元素间距 (Gap)</span>
                                        <span className="text-[10px] font-mono text-slate-500">{styles.itemGap}px</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="100"
                                        value={styles.itemGap}
                                        onChange={e => onStylesChange({ ...styles, itemGap: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tree Editor */}
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-6 shadow-2xl min-h-[300px]">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">数据层级结构</span>
                                <button
                                    onClick={() => addItem()}
                                    className="text-[9px] font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20 transition-all hover:bg-indigo-500/20"
                                >
                                    <Plus size={10} /> ADD ROOT
                                </button>
                            </div>
                            <div className="space-y-1">
                                {data.map(item => renderTreeItem(item, 0))}
                            </div>
                        </div>

                        {/* Style Configuration (Paired Layout like Fishbone) */}
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-8 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">样式布局配置</span>
                            </div>

                            {/* Section 1: Title */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">标题样式 (Title)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest pl-1">背景色</span>
                                        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
                                            <input type="color" value={styles.titleBackgroundColor} onChange={e => onStylesChange({ ...styles, titleBackgroundColor: e.target.value })} className="w-6 h-6 rounded-lg bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[10px] font-mono text-slate-400">{styles.titleBackgroundColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest pl-1">文字颜色</span>
                                        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
                                            <input type="color" value={styles.titleTextColor} onChange={e => onStylesChange({ ...styles, titleTextColor: e.target.value })} className="w-6 h-6 rounded-lg bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[10px] font-mono text-slate-400">{styles.titleTextColor}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1 pt-1">
                                    <div className="flex justify-between px-1">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest">字号 (px)</span>
                                        <span className="text-[9px] font-mono text-slate-400">{styles.titleFontSize}px</span>
                                    </div>
                                    <input type="range" min="12" max="48" value={styles.titleFontSize} onChange={e => onStylesChange({ ...styles, titleFontSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-indigo-500" />
                                </div>
                            </div>

                            {/* Section 2: Group Header (Root) */}
                            <div className="space-y-3 pt-4 border-t border-slate-800/50">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">分组头/根节点 (Root)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest pl-1">背景色</span>
                                        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
                                            <input type="color" value={styles.groupHeaderBackgroundColor} onChange={e => onStylesChange({ ...styles, groupHeaderBackgroundColor: e.target.value })} className="w-6 h-6 rounded-lg bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[10px] font-mono text-slate-400">{styles.groupHeaderBackgroundColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest pl-1">文字颜色</span>
                                        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
                                            <input type="color" value={styles.groupHeaderTextColor} onChange={e => onStylesChange({ ...styles, groupHeaderTextColor: e.target.value })} className="w-6 h-6 rounded-lg bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[10px] font-mono text-slate-400">{styles.groupHeaderTextColor}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1 pt-1">
                                    <div className="flex justify-between px-1">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest">字号 (px)</span>
                                        <span className="text-[9px] font-mono text-slate-400">{styles.groupHeaderFontSize}px</span>
                                    </div>
                                    <input type="range" min="10" max="32" value={styles.groupHeaderFontSize} onChange={e => onStylesChange({ ...styles, groupHeaderFontSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-blue-500" />
                                </div>
                            </div>

                            {/* Section 3: Items (Other Nodes) */}
                            <div className="space-y-3 pt-4 border-t border-slate-800/50">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">其他节点 (Items)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest pl-1">背景色</span>
                                        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
                                            <input type="color" value={styles.itemBackgroundColor} onChange={e => onStylesChange({ ...styles, itemBackgroundColor: e.target.value })} className="w-6 h-6 rounded-lg bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[10px] font-mono text-slate-400">{styles.itemBackgroundColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest pl-1">文字颜色</span>
                                        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
                                            <input type="color" value={styles.itemTextColor} onChange={e => onStylesChange({ ...styles, itemTextColor: e.target.value })} className="w-6 h-6 rounded-lg bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[10px] font-mono text-slate-400">{styles.itemTextColor}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1 pt-1">
                                    <div className="flex justify-between px-1">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest">字号 (px)</span>
                                        <span className="text-[9px] font-mono text-slate-400">{styles.itemFontSize}px</span>
                                    </div>
                                    <input type="range" min="8" max="24" value={styles.itemFontSize} onChange={e => onStylesChange({ ...styles, itemFontSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-emerald-500" />
                                </div>
                            </div>

                            {/* Section 4: Lines & Borders */}
                            <div className="space-y-3 pt-4 border-t border-slate-800/50">
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-2">连接与边框</span>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest pl-1">边框颜色</span>
                                        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
                                            <input type="color" value={styles.borderColor} onChange={e => onStylesChange({ ...styles, borderColor: e.target.value })} className="w-6 h-6 rounded-lg bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[10px] font-mono text-slate-400">{styles.borderColor}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest pl-1">连线颜色 (Tree)</span>
                                        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
                                            <input type="color" value={styles.lineColor} onChange={e => onStylesChange({ ...styles, lineColor: e.target.value })} className="w-6 h-6 rounded-lg bg-transparent cursor-pointer border-none p-0" />
                                            <span className="text-[10px] font-mono text-slate-400">{styles.lineColor}</span>
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
                            className="flex-1 w-full bg-black/40 text-orange-100 p-6 font-mono text-[11px] leading-relaxed border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-none custom-scrollbar"
                            placeholder="输入 DSL 指令..."
                            spellCheck={false}
                        />
                        {error && <div className="text-red-500 text-xs font-bold px-4">{error}</div>}
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">智能亲和分析描述</span>
                                <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_#6366f1]" />
                                    <span className="text-[9px] font-black text-indigo-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full h-56 bg-slate-900/50 text-slate-200 p-8 text-sm leading-relaxed border border-slate-800 rounded-[2rem] focus:outline-none focus:border-indigo-500 transition-all resize-none shadow-inner"
                                placeholder="输入待整理的信息或想法，例如：'整理关于提升团队效率的头脑风暴想法，包括简化流程、工具引入等'..."
                            />
                            <button
                                onClick={generateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-indigo-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在执行归纳整理...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能归纳并生成</span>
                                    </>
                                )}
                            </button>

                            <div className="p-8 bg-indigo-900/10 border border-indigo-800/20 rounded-3xl space-y-4">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">推理提示</p>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                    您可以输入一堆杂乱的观点、反馈或想法，AI 将自动使用 **KJ法 (亲和图)** 对其进行归纳、分类和层级整理，并生成结构化的亲和图。
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
                                    <div className="p-3 bg-violet-600/20 rounded-2xl border border-violet-500/30">
                                        <Boxes size={24} className="text-violet-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">亲和图知识库</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Affinity Logic Base V2.1</p>
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
                                        className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
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
                                        <div className="flex items-center gap-3 text-violet-400 border-b border-violet-500/20 pb-4">
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
                                                        <td className="py-3 text-violet-400 font-bold">Title:</td>
                                                        <td className="py-3">图表标题</td>
                                                        <td className="py-3 text-slate-500">Title: 市场调研整理</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 text-emerald-400 font-bold">Type:</td>
                                                        <td className="py-3">渲染模式 (Card/Label)</td>
                                                        <td className="py-3 text-slate-500">Type: Card</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="py-3 text-amber-400 font-bold">Layout:</td>
                                                        <td className="py-3">布局方向 (Horizontal/Vertical)</td>
                                                        <td className="py-3 text-slate-500">Layout: Horizontal</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section className="space-y-6">
                                        <div className="flex items-center gap-3 text-amber-400 border-b border-amber-500/20 pb-4">
                                            <Boxes size={18} />
                                            <span className="text-[12px] font-black uppercase tracking-widest">2. 样式定义</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 font-mono text-xs">
                                            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                                    <span className="text-violet-400">Color[TitleBg|TitleText]:</span>
                                                    <span className="text-slate-400">#HEX 标题样式</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                                    <span className="text-emerald-400">Color[GroupHeaderBg]:</span>
                                                    <span className="text-slate-400">#HEX 分组头背景</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                                    <span className="text-blue-400">Color[ItemBg|ItemText]:</span>
                                                    <span className="text-slate-400">#HEX 卡片样式</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Font[Title|GroupHeader|Item]:</span>
                                                    <span className="text-slate-500">px 字号</span>
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
                                            <div className="text-[11px] font-bold text-slate-500 mb-2">语法格式：Item: [ID], [Label], [ParentID]</div>
                                            <code className="block text-xs text-blue-200 leading-relaxed bg-black/30 p-4 rounded-xl">
                                                Item: root, 核心主题, null<br />
                                                Item: g1, 市场因素, root<br />
                                                Item: sub1, 竞争激烈, g1
                                            </code>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-violet-400 uppercase tracking-widest border-b border-violet-900/50 pb-2">KJ法 (Affinity Diagram)</h4>
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4 text-xs leading-relaxed text-slate-400">
                                            <p>亲和图法，又称KJ法，是将收集到的事实、意见、想法等语言信息，按其相互亲和性（相近性）归纳整理，使问题条理化的方法。</p>
                                            <ul className="list-disc list-inside space-y-2">
                                                <li><strong>发散</strong>: 收集尽可能多的想法。</li>
                                                <li><strong>收敛</strong>: 寻找内在逻辑，形成层级。</li>
                                            </ul>
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest border-b border-emerald-900/50 pb-2">逻辑构建逻辑</h4>
                                        <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4 text-xs leading-relaxed text-slate-400">
                                            <p>通过层级化的定义，亲和图可以帮助团队从混乱的信息中理出头绪。一个好的亲和图应该具有清晰的因果或从属逻辑。</p>
                                        </div>
                                    </section>

                                    <div className="p-6 bg-indigo-900/10 border border-indigo-800/20 rounded-3xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Zap size={14} className="text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase text-indigo-500">思维洞察</span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 font-medium italic mb-2">
                                            "当多个想法无法归入现有分组时，可能意味着存在一个新的维度或未被识别的根本问题。"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-10 border-t border-slate-800 bg-slate-900/50 flex justify-center shrink-0">
                            <button
                                onClick={() => setShowDocs(false)}
                                className="px-16 py-4 bg-violet-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-violet-500 transition-all font-sans"
                            >
                                已阅读规范
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div >
    );
};

export default AffinityEditor;
