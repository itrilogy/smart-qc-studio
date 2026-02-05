import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MatrixData, MatrixChartStyles, DEFAULT_MATRIX_STYLES, MatrixAxis, MatrixSymbolType } from '../types';
import { INITIAL_MATRIX_DSL, MATRIX_SAMPLE_TEMPLATES } from '../constants';
import { Table, Sparkles, HelpCircle, X, Loader2, Database, Code, Trash2, RotateCcw } from 'lucide-react';
import { generateLogicDSL, getAIStatus } from '../services/aiService';
import { QCToolType } from '../types';

interface MatrixEditorProps {
    data: MatrixData;
    styles: MatrixChartStyles;
    // We pass the raw DSL string for persistence if needed, or handle it internally
    dsl?: string;
    onDataChange: (data: MatrixData) => void;
    onStylesChange: (styles: MatrixChartStyles) => void;
    onDslChange?: (dsl: string) => void;
}

export const parseMatrixDSL = (content: string): { data: MatrixData, styles: MatrixChartStyles } => {
    const lines = content.split('\n');
    const newStyles: MatrixChartStyles = { ...DEFAULT_MATRIX_STYLES };
    const axes: MatrixAxis[] = [];
    const matrices: any[] = [];
    let title = '矩阵图分析';

    // Relation mapping logic
    // Default shorthands: S->Strong, M->Medium, W->Weak, 9->Strong, 3->Medium, 1->Weak
    const symbolMap: Record<string, MatrixSymbolType> = {
        'S': 'Strong', '9': 'Strong', '◎': 'Strong',
        'M': 'Medium', '3': 'Medium', '○': 'Medium',
        'W': 'Weak', '1': 'Weak', '△': 'Weak'
    };

    let currentAxisId = '';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        // 1. Meta & Styling
        if (trimmed.startsWith('Title:')) { title = trimmed.replace('Title:', '').trim(); return; }

        // Flexible Type handling: L-Type, L-type, L, etc -> normalized L
        if (trimmed.startsWith('Type:')) {
            const val = trimmed.replace('Type:', '').trim().toUpperCase();
            if (val.startsWith('L')) newStyles.type = 'L';
            else if (val.startsWith('T')) newStyles.type = 'T';
            else if (val.startsWith('Y')) newStyles.type = 'Y';
            else if (val.startsWith('X')) newStyles.type = 'X';
            else if (val.startsWith('C')) newStyles.type = 'C';
            return;
        }

        // Color[Key]: hex
        if (trimmed.startsWith('Color[')) {
            const match = trimmed.match(/Color\[(Axis|Grid|Strong|Medium|Weak)\]:\s*(#\w+)/i);
            if (match) {
                const key = match[1].toLowerCase();
                if (key === 'axis') newStyles.axisColor = match[2];
                else if (key === 'grid') newStyles.gridColor = match[2];
                else if (key === 'strong') newStyles.symbolColorStrong = match[2];
                else if (key === 'medium') newStyles.symbolColorMedium = match[2];
                else if (key === 'weak') newStyles.symbolColorWeak = match[2];
            }
            return;
        }

        // Font[Key]: size
        if (trimmed.startsWith('Font[')) {
            const match = trimmed.match(/Font\[(Title|Base)\]:\s*(\d+)/i);
            if (match) {
                const key = match[1].toLowerCase();
                if (key === 'title') newStyles.titleFontSize = parseInt(match[2]);
                else if (key === 'base') newStyles.fontSize = parseInt(match[2]);
            }
            return;
        }

        // CellSize: num
        if (trimmed.startsWith('CellSize:')) {
            const val = parseInt(trimmed.replace('CellSize:', '').trim());
            if (!isNaN(val)) newStyles.cellSize = val;
            return;
        }

        // ShowScores: true/false
        if (trimmed.startsWith('ShowScores:')) {
            const val = trimmed.replace('ShowScores:', '').trim().toLowerCase();
            newStyles.showScores = (val === 'true');
            return;
        }

        // Weight[Key]: num
        if (trimmed.startsWith('Weight[')) {
            const match = trimmed.match(/Weight\[(Strong|Medium|Weak)\]:\s*(\d+)/i);
            if (match) {
                const key = match[1].toLowerCase();
                if (key === 'strong') newStyles.weightStrong = parseInt(match[2]);
                else if (key === 'medium') newStyles.weightMedium = parseInt(match[2]);
                else if (key === 'weak') newStyles.weightWeak = parseInt(match[2]);
            }
            return;
        }

        // Relation Mapping (Optional): Relation: Strong(S:9:◎)
        if (trimmed.startsWith('Relation:')) {
            const rules = trimmed.replace('Relation:', '').split(',');
            rules.forEach(rule => {
                const m = rule.match(/\((.*?)\)/);
                if (m) {
                    const parts = m[1].split(':');
                    // We only care about the shorthand -> Symbol mapping for parsing
                    // parts: 0:shorthand, 1:weight, 2:symbol_char
                    if (parts.length >= 2) {
                        const shorthand = parts[0].trim();
                        const typeName = rule.split('(')[0].trim();
                        if (typeName.includes('Strong')) symbolMap[shorthand] = 'Strong';
                        else if (typeName.includes('Medium')) symbolMap[shorthand] = 'Medium';
                        else if (typeName.includes('Weak')) symbolMap[shorthand] = 'Weak';
                    }
                }
            });
            return;
        }

        // 2. Axis Definition
        if (trimmed.startsWith('Axis:')) {
            const parts = trimmed.replace('Axis:', '').split(',');
            if (parts.length >= 1) {
                currentAxisId = parts[0].trim();
                const label = parts[1] ? parts[1].trim() : currentAxisId;
                axes.push({ id: currentAxisId, label, items: [] });
            }
            return;
        }

        // Axis Items (starting with -)
        if (trimmed.startsWith('-') && currentAxisId) {
            const axis = axes.find(a => a.id === currentAxisId);
            if (axis) {
                const parts = trimmed.substring(1).split(',');
                const id = parts[0].trim();
                let label = parts[1] ? parts[1].trim() : id;
                let weight = parts[2] ? parseFloat(parts[2]) : undefined;

                // Robustness: If weight column is missing, try to extract from label like "Item [5]"
                if (weight === undefined) {
                    const weightMatch = label.match(/\[(\d+(?:\.\d+)?)\]/);
                    if (weightMatch) {
                        weight = parseFloat(weightMatch[1]);
                        label = label.replace(weightMatch[0], '').trim();
                    }
                }
                axis.items.push({ id, label, weight });
            }
            return;
        }

        // 3. Matrix Relation Definition: Matrix: A x B
        if (trimmed.startsWith('Matrix:')) {
            const parts = trimmed.replace('Matrix:', '').split('x');
            if (parts.length >= 2) {
                matrices.push({
                    rowAxisId: parts[0].trim(),
                    colAxisId: parts[1].trim(),
                    cells: []
                });
            }
            return;
        }

        // Matrix Cells: a1: b1:S, b2:◎
        if (trimmed.includes(':') && !trimmed.startsWith('Title') && !trimmed.startsWith('Type') && !trimmed.startsWith('Axis') && !trimmed.startsWith('Matrix')) {
            const lastMatrix = matrices[matrices.length - 1];
            if (lastMatrix) {
                const [rowId, relations] = trimmed.split(/:(.+)/);
                if (rowId && relations) {
                    const relParts = relations.split(',');
                    relParts.forEach(rel => {
                        const [colId, symKey] = rel.split(':').map(s => s.trim());
                        if (colId && symKey) {
                            const symbol = symbolMap[symKey] || symbolMap[symKey.toUpperCase()] || 'None';
                            lastMatrix.cells.push({
                                rowId: rowId.trim(),
                                colId: colId.trim(),
                                symbol
                            });
                        }
                    });
                }
            }
        }
    });

    return {
        data: { title, type: newStyles.type, axes, matrices },
        styles: newStyles
    };
};

export const generateMatrixDSL = (data: MatrixData, styles: MatrixChartStyles): string => {
    let dsl = `Title: ${data.title}\n`;
    dsl += `Type: ${styles.type}\n`;
    dsl += `CellSize: ${styles.cellSize}\n`;
    dsl += `ShowScores: ${styles.showScores}\n`;
    dsl += `Font[Title]: ${styles.titleFontSize}\n`;
    dsl += `Font[Base]: ${styles.fontSize}\n`;
    dsl += `Weight[Strong]: ${styles.weightStrong}\n`;
    dsl += `Weight[Medium]: ${styles.weightMedium}\n`;
    dsl += `Weight[Weak]: ${styles.weightWeak}\n`;
    dsl += `Color[Strong]: ${styles.symbolColorStrong}\n`;
    dsl += `Color[Medium]: ${styles.symbolColorMedium}\n`;
    dsl += `Color[Weak]: ${styles.symbolColorWeak}\n`;
    dsl += `Color[Axis]: ${styles.axisColor}\n`;
    dsl += `Color[Grid]: ${styles.gridColor}\n\n`;

    data.axes.forEach(axis => {
        dsl += `Axis: ${axis.id}, ${axis.label}\n`;
        axis.items.forEach(item => {
            dsl += `- ${item.id}, ${item.label}${item.weight !== undefined ? `, ${item.weight}` : ''}\n`;
        });
        dsl += `\n`;
    });

    data.matrices.forEach(matrix => {
        dsl += `Matrix: ${matrix.rowAxisId} x ${matrix.colAxisId}\n`;
        // Group cells by rowId
        const rows: Record<string, { colId: string, char: string }[]> = {};
        (matrix.cells || []).forEach(cell => {
            if (cell.symbol === 'None') return;
            if (!rows[cell.rowId]) rows[cell.rowId] = [];
            let char = '◎';
            if (cell.symbol === 'Medium') char = '○';
            else if (cell.symbol === 'Weak') char = '△';
            rows[cell.rowId].push({ colId: cell.colId, char });
        });

        Object.entries(rows).forEach(([rowId, rels]) => {
            dsl += `${rowId}: ${rels.map(r => `${r.colId}:${r.char}`).join(', ')}\n`;
        });
        dsl += `\n`;
    });

    return dsl.trim();
};

export const clearMatrixRelations = (currentDSL: string): string => {
    const lines = currentDSL.split('\n');
    const newLines: string[] = [];
    let isSkipping = false;

    for (const line of lines) {
        const trimmed = line.trim();

        // If we encounter a new Matrix header, store it and start skipping subsequent lines (the data)
        if (trimmed.startsWith('Matrix:')) {
            newLines.push(line);
            isSkipping = true;
            continue;
        }

        // If we represent a new section, stop skipping
        if (trimmed.startsWith('Title:') ||
            trimmed.startsWith('Type:') ||
            trimmed.startsWith('Relation:') ||
            trimmed.startsWith('Axis:') ||
            trimmed.startsWith('# ')) { // Comments or Section Headers often start with #
            isSkipping = false;
        }

        if (!isSkipping) {
            newLines.push(line);
        }
    }

    return newLines.join('\n');
};

export const updateMatrixDSL = (currentDSL: string, rowId: string, colId: string, currentSymbolName: any, targetRowAxisId?: string, targetColAxisId?: string): string => {
    const lines = currentDSL.split('\n');

    // 1. Define Cycle: Name -> Next Name
    const transition: Record<string, string> = {
        'None': 'Strong',
        'Strong': 'Medium',
        'Medium': 'Weak',
        'Weak': 'None'
    };
    const nextName = transition[currentSymbolName] || 'Strong';

    // 2. Define Name -> DSL Char
    const symbolChar: Record<string, string> = {
        'Strong': '◎',
        'Medium': '○',
        'Weak': '△'
    };

    let matrixStartIndex = -1;
    let matrixEndIndex = -1;
    let targetRowIndex = -1;

    // 1. Locate the CORRECT Matrix Section
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('Matrix:')) {
            // Check if this matrix matches the requested axes (if provided)
            let isMatch = true;
            if (targetRowAxisId && targetColAxisId) {
                const parts = line.replace('Matrix:', '').split('x');
                if (parts.length >= 2) {
                    const r = parts[0].trim();
                    const c = parts[1].trim();
                    if (r !== targetRowAxisId || c !== targetColAxisId) {
                        isMatch = false;
                    }
                }
            }

            if (isMatch) {
                matrixStartIndex = i;
                // Find end of this block
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].trim() === '' || lines[j].startsWith('Title:') || lines[j].startsWith('Axis:') || lines[j].startsWith('Matrix:')) {
                        matrixEndIndex = j;
                        break;
                    }
                }
                if (matrixEndIndex === -1) matrixEndIndex = lines.length;
                break; // Found the target matrix
            }
        }
    }

    if (matrixStartIndex === -1) {
        // If we have specific axes but didn't find the block, maybe we need to create it?
        // For now, assume block exists or fail.
        return currentDSL;
    }

    // 2. Find row
    for (let i = matrixStartIndex + 1; i < matrixEndIndex; i++) {
        if (lines[i].trim().startsWith(`${rowId}:`)) {
            targetRowIndex = i;
            break;
        }
    }

    // 3. Apply Change
    if (targetRowIndex !== -1) {
        const line = lines[targetRowIndex];
        let newLine = line;

        if (line.includes(`${colId}:`)) {
            // Update Or Delete
            if (nextName === 'None') {
                // Remove logic
                newLine = line.replace(new RegExp(`${colId}:[^,\\s]+`), '')
                    .replace(/,\s*,/g, ',')
                    .replace(/:\s*,/g, ': ')
                    .replace(/,\s*$/, '').trim();
            } else {
                // Update char
                newLine = line.replace(new RegExp(`${colId}:[^,\\s]+`), `${colId}:${symbolChar[nextName]}`);
            }
        } else {
            // Append
            if (nextName !== 'None') {
                // If line ends with ':', just pad space. Else add comma.
                if (line.trim().endsWith(':')) {
                    newLine = `${line} ${colId}:${symbolChar[nextName]}`;
                } else {
                    newLine = `${line}, ${colId}:${symbolChar[nextName]}`;
                }
            }
        }
        lines[targetRowIndex] = newLine;
    } else {
        // Insert new row line
        if (nextName !== 'None') {
            const newLine = `${rowId}: ${colId}:${symbolChar[nextName]}`;
            // Find best place to insert: usually after Matrix line or at end of block
            lines.splice(matrixEndIndex, 0, newLine);
        }
    }

    return lines.join('\n');
};

const MatrixEditor: React.FC<MatrixEditorProps> = ({ data, styles, onDataChange, onStylesChange, onDslChange, dsl: propDsl }) => {
    const [localDsl, setLocalDsl] = useState(INITIAL_MATRIX_DSL);
    const [activeTab, setActiveTab] = useState<'dsl' | 'manual' | 'ai'>('manual');
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

    // Use prop DSL if available, otherwise local
    const currentDsl = propDsl !== undefined ? propDsl : localDsl;

    // Initial Parse (only if not controlled or first load)
    useEffect(() => {
        if (!propDsl) {
            try {
                const { data: d, styles: s } = parseMatrixDSL(INITIAL_MATRIX_DSL);
                onDataChange(d);
                onStylesChange(s);
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    // Also sync propDsl changes to data if needed (usually handled by parent, but for safety)
    useEffect(() => {
        if (propDsl) {
            try {
                const { data: d, styles: s } = parseMatrixDSL(propDsl);
                onDataChange(d);
                onStylesChange(s);
            } catch (e) {
                // Silent error on prop update
            }
        }
    }, [propDsl]);

    const handleParseDSL = (val: string) => {
        try {
            const { data: d, styles: s } = parseMatrixDSL(val);
            onDataChange(d);
            onStylesChange(s);
            setError(null);
        } catch (e) {
            console.error(e);
            // setError('DSL 解析错误'); 
        }
    };

    const handleDSLChange = (val: string) => {
        if (propDsl === undefined) setLocalDsl(val);
        if (onDslChange) onDslChange(val);
        handleParseDSL(val);
    };

    const handleDataChange = (newData: MatrixData) => {
        // Cleanup relations if axes/items were deleted
        const validAxisIds = new Set(newData.axes.map(a => a.id));
        const validItemIds = new Set(newData.axes.flatMap(a => a.items.map(i => i.id)));

        const cleanedMatrices = newData.matrices
            .filter(m => validAxisIds.has(m.rowAxisId) && validAxisIds.has(m.colAxisId))
            .map(m => ({
                ...m,
                cells: m.cells.filter(c => validItemIds.has(c.rowId) && validItemIds.has(c.colId))
            }));

        const finalData = { ...newData, matrices: cleanedMatrices };

        onDataChange(finalData);
        const newDsl = generateMatrixDSL(finalData, styles);
        if (propDsl === undefined) setLocalDsl(newDsl);
        if (onDslChange) onDslChange(newDsl);
    };

    const handleStylesChange = (newStyles: MatrixChartStyles) => {
        onStylesChange(newStyles);
        // Sync title back to data if changed
        const newData = { ...data, title: newStyles.title };
        if (newStyles.title !== data.title) {
            onDataChange(newData);
        }
        const newDsl = generateMatrixDSL(newData, newStyles);
        if (propDsl === undefined) setLocalDsl(newDsl);
        if (onDslChange) onDslChange(newDsl);
    };

    const handleLoadSample = () => {
        const type = styles.type;
        const template = (MATRIX_SAMPLE_TEMPLATES as any)[type];
        if (template && window.confirm(`确定要加载 ${type} 型矩阵的示例结构吗？这会覆盖当前的维度定义。`)) {
            handleDSLChange(template);
        }
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        try {
            const result = await generateLogicDSL(aiPrompt, QCToolType.MATRIX);
            handleDSLChange(result);
            setActiveTab('dsl');
        } catch (err) {
            console.error(err);
            setError('AI 生成失败，请重试');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        if (confirm('确定要恢复到示例数据吗？当前所有修改将丢失。')) {
            try {
                const { data: d, styles: s } = parseMatrixDSL(INITIAL_MATRIX_DSL);
                onDataChange(d);
                onStylesChange(s);
                if (propDsl === undefined) setLocalDsl(INITIAL_MATRIX_DSL);
                if (onDslChange) onDslChange(INITIAL_MATRIX_DSL);
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
                        <div className="w-10 h-10 bg-cyan-600/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
                            <Table size={22} className="text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white tracking-widest uppercase">矩阵图引擎</h2>
                            <p className="text-[8px] text-slate-500 font-bold tracking-[0.2em] mt-1">MATRIX PROCESSOR V1.0</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-blue-400 transition-all border border-slate-700"
                            title="恢复示例"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm('确定要清空所有矩阵关系吗？此操作无法撤销。')) {
                                    const newDsl = clearMatrixRelations(currentDsl);
                                    handleDSLChange(newDsl);
                                }
                            }}
                            className="p-3 bg-red-500/10 rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                            title="清空所有关系"
                        >
                            <Trash2 size={18} />
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
                        { id: 'manual', label: '手工录入', icon: <Database size={14} /> },
                        { id: 'dsl', label: 'DSL编辑器', icon: <Code size={14} /> },
                        { id: 'ai', label: 'AI 推理', icon: <Sparkles size={14} /> },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-cyan-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                }`}
                        >
                            {t.icon} {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {/* AI Inference Tab */}
                {activeTab === 'ai' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-8 shadow-2xl relative overflow-hidden group">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">智能矩阵分析描述</span>
                                <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_#06b6d4]" />
                                    <span className="text-[9px] font-black text-cyan-500 uppercase">Engine Active: {engineName}</span>
                                </div>
                            </div>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full h-56 bg-slate-900/50 text-slate-200 p-8 text-sm leading-relaxed border border-slate-800 rounded-[2rem] focus:outline-none focus:border-cyan-500 transition-all resize-none shadow-inner"
                                placeholder="输入您想分析的维度及其关系描述，例如：'分析零件(齿轮、轴承)与故障模式(磨损、泄漏)的强弱相关性'..."
                            />
                            <button
                                onClick={handleGenerateAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`w-full h-16 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-2xl relative overflow-hidden group ${isGenerating ? 'bg-slate-800' : 'bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98]'}`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin text-cyan-400" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">正在推演矩阵关系...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} className="text-white group-hover:rotate-12 transition-transform" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">智能解析并生成</span>
                                    </>
                                )}
                            </button>

                            <div className="p-8 bg-cyan-900/10 border border-cyan-800/20 rounded-3xl space-y-4">
                                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">推理提示</p>
                                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                    您可以描述多个维度及其交叉点关系，AI 将自动识别轴和项目，并填充矩阵。例如：“分析部门 A、B 与考核指标 X、Y 的关系，其中 A 与 X 强相关”。
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* DSL Configuration Tab */}
                {activeTab === 'dsl' && (
                    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <textarea
                            value={currentDsl}
                            onChange={(e) => handleDSLChange(e.target.value)}
                            className="flex-1 w-full bg-black/40 text-cyan-100 p-8 font-mono text-[11px] leading-relaxed border border-slate-800 rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all resize-none custom-scrollbar shadow-inner"
                            placeholder="输入 DSL 指令..."
                            spellCheck={false}
                        />
                        {error && (
                            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-[9px] font-black text-red-500 uppercase">{error}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Manual Entry Tab */}
                {activeTab === 'manual' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 bg-black/30 rounded-[2.5rem] border border-slate-800/50 space-y-6 shadow-2xl">
                            {/* Global & Layout Section */}
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">全局与布局</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[11px] font-bold text-slate-300">矩阵图类型</span>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={styles.type}
                                                onChange={e => handleStylesChange({ ...styles, type: e.target.value as any })}
                                                className="bg-slate-800 text-[11px] text-cyan-400 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                            >
                                                <option value="L">L 型 (2轴)</option>
                                                <option value="T">T 型 (3轴)</option>
                                                <option value="Y">Y 型 (3轴闭环)</option>
                                                <option value="X">X 型 (4轴)</option>
                                                <option value="C">C 型 (自相关)</option>
                                            </select>
                                            <button
                                                onClick={handleLoadSample}
                                                className="px-2 py-1 bg-cyan-600/20 text-cyan-400 text-[10px] font-bold rounded-lg border border-cyan-500/30 hover:bg-cyan-600 hover:text-white transition-all whitespace-nowrap"
                                                title="加载该类型的标准示例结构"
                                            >
                                                取示例
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-bold text-slate-300">数值计算</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={styles.showScores}
                                                onChange={e => handleStylesChange({ ...styles, showScores: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-[11px] font-bold text-slate-300 shrink-0">项目标题</span>
                                    <input
                                        type="text"
                                        value={styles.title}
                                        onChange={e => handleStylesChange({ ...styles, title: e.target.value })}
                                        className="flex-1 bg-slate-800 text-[11px] text-white border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-mono"
                                    />
                                </div>
                            </div>

                            {/* Data Structure Section */}
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3 mt-8">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">数据结构 (Axes & Items)</span>
                            </div>
                            <div className="space-y-4">
                                {data.axes.map((axis, aIdx) => (
                                    <div key={axis.id} className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <input
                                                className="bg-transparent text-xs font-black text-cyan-400 w-16 focus:outline-none"
                                                value={axis.id}
                                                onChange={e => {
                                                    const newAxes = [...data.axes];
                                                    newAxes[aIdx] = { ...axis, id: e.target.value };
                                                    handleDataChange({ ...data, axes: newAxes });
                                                }}
                                            />
                                            <input
                                                className="flex-1 bg-slate-800/50 text-[11px] text-white border border-slate-700/50 rounded px-2 py-1 focus:outline-none"
                                                value={axis.label}
                                                onChange={e => {
                                                    const newAxes = [...data.axes];
                                                    newAxes[aIdx] = { ...axis, label: e.target.value };
                                                    handleDataChange({ ...data, axes: newAxes });
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newAxes = data.axes.filter((_, i) => i !== aIdx);
                                                    handleDataChange({ ...data, axes: newAxes });
                                                }}
                                                className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="pl-4 space-y-2 border-l border-slate-800">
                                            {axis.items.map((item, iIdx) => (
                                                <div key={item.id} className="flex items-center gap-2">
                                                    <input
                                                        className="bg-transparent text-[10px] text-slate-500 w-12 font-mono focus:outline-none"
                                                        value={item.id}
                                                        onChange={e => {
                                                            const newAxes = [...data.axes];
                                                            const newItems = [...axis.items];
                                                            newItems[iIdx] = { ...item, id: e.target.value };
                                                            newAxes[aIdx] = { ...axis, items: newItems };
                                                            handleDataChange({ ...data, axes: newAxes });
                                                        }}
                                                    />
                                                    <input
                                                        className="flex-1 bg-slate-800/30 text-[10px] text-slate-300 border border-slate-700/30 rounded px-2 py-0.5 focus:outline-none"
                                                        value={item.label}
                                                        onChange={e => {
                                                            const newAxes = [...data.axes];
                                                            const newItems = [...axis.items];
                                                            newItems[iIdx] = { ...item, label: e.target.value };
                                                            newAxes[aIdx] = { ...axis, items: newItems };
                                                            handleDataChange({ ...data, axes: newAxes });
                                                        }}
                                                    />
                                                    <input
                                                        type="number"
                                                        className="w-12 bg-slate-800/30 text-[10px] text-amber-400 border border-slate-700/30 rounded px-1 py-0.5 focus:outline-none text-center"
                                                        placeholder="W"
                                                        value={item.weight ?? ''}
                                                        onChange={e => {
                                                            const newAxes = [...data.axes];
                                                            const newItems = [...axis.items];
                                                            newItems[iIdx] = { ...item, weight: e.target.value ? parseFloat(e.target.value) : undefined };
                                                            newAxes[aIdx] = { ...axis, items: newItems };
                                                            handleDataChange({ ...data, axes: newAxes });
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newAxes = [...data.axes];
                                                            const newItems = axis.items.filter((_, i) => i !== iIdx);
                                                            newAxes[aIdx] = { ...axis, items: newItems };
                                                            handleDataChange({ ...data, axes: newAxes });
                                                        }}
                                                        className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    const newAxes = [...data.axes];
                                                    const newId = `${axis.id.toLowerCase()}${axis.items.length + 1}`;
                                                    newAxes[aIdx] = { ...axis, items: [...axis.items, { id: newId, label: '新项目' }] };
                                                    handleDataChange({ ...data, axes: newAxes });
                                                }}
                                                className="text-[9px] text-cyan-500/80 flex items-center gap-1 hover:text-cyan-400 transition-all mt-2 px-1"
                                            >
                                                + 添加项目
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const nextId = String.fromCharCode(65 + data.axes.length);
                                        handleDataChange({ ...data, axes: [...data.axes, { id: nextId, label: `维度轴 ${nextId}`, items: [] }] });
                                    }}
                                    className="w-full py-4 bg-slate-900/30 rounded-2xl border border-dashed border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
                                >
                                    + 新增维度轴
                                </button>
                            </div>

                            {/* Symbol Weight Configuration */}
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3 mt-8">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">符号权重配置</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { key: 'weightStrong', label: '强 (◎)' },
                                    { key: 'weightMedium', label: '中 (○)' },
                                    { key: 'weightWeak', label: '弱 (△)' }
                                ].map(w => (
                                    <div key={w.key} className="space-y-2">
                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center">{w.label}</div>
                                        <input
                                            type="number"
                                            value={(styles as any)[w.key]}
                                            onChange={e => handleStylesChange({ ...styles, [w.key]: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-slate-800 text-[11px] text-white border border-slate-700 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Visual Configuration */}
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3 mt-8">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">视觉配置</span>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                {[
                                    { key: 'symbolColorStrong', label: '强相关 (◎)' },
                                    { key: 'symbolColorMedium', label: '中相关 (○)' },
                                    { key: 'symbolColorWeak', label: '弱相关 (△)' },
                                    { key: 'axisColor', label: '轴标签颜色' },
                                    { key: 'gridColor', label: '网格线颜色' }
                                ].map(c => (
                                    <div key={c.key} className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-300">{c.label}</span>
                                        <input
                                            type="color"
                                            value={(styles as any)[c.key] || '#000000'}
                                            onChange={e => handleStylesChange({ ...styles, [c.key]: e.target.value })}
                                            className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-none p-0"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Size Configuration */}
                            <div className="flex items-center gap-4 border-b border-slate-800 pb-3 mt-8">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">尺寸配置</span>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-slate-300">单元格尺寸</span>
                                    <input
                                        type="range"
                                        min="30"
                                        max="80"
                                        step="5"
                                        value={styles.cellSize}
                                        onChange={e => handleStylesChange({ ...styles, cellSize: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                    <div className="text-[10px] text-slate-500 text-right">{styles.cellSize}px</div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-slate-300">标题字号</span>
                                    <input
                                        type="range"
                                        min="12"
                                        max="48"
                                        step="1"
                                        value={styles.titleFontSize}
                                        onChange={e => handleStylesChange({ ...styles, titleFontSize: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                    <div className="text-[10px] text-slate-500 text-right">{styles.titleFontSize}px</div>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[11px] font-bold text-slate-300">内容字号</span>
                                    <input
                                        type="range"
                                        min="8"
                                        max="24"
                                        step="1"
                                        value={styles.fontSize}
                                        onChange={e => handleStylesChange({ ...styles, fontSize: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                    <div className="text-[10px] text-slate-500 text-right">{styles.fontSize}px</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Docs Modal */}
            {
                showDocs && createPortal(
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-8 bg-[#020617]/90 backdrop-blur-3xl">
                        <div className="bg-[#0f172a] w-[800px] max-h-[85vh] rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
                            <div className="px-10 py-8 flex flex-col border-b border-slate-800 shrink-0 gap-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-cyan-600/20 rounded-2xl border border-cyan-500/30">
                                            <Table size={24} className="text-cyan-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">矩阵图知识库</h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Matrix Knowledge Base V1.1</p>
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
                                            className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${docTab === t.id ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
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
                                        {/* Section 1: 全局配置 */}
                                        <section className="space-y-4">
                                            <h4 className="text-sm font-black text-cyan-400 uppercase tracking-widest border-b border-cyan-900/50 pb-2">1. 全局基础配置 (Global Settings)</h4>
                                            <div className="grid grid-cols-[180px_1fr] gap-4 text-xs font-mono bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                <span className="text-cyan-300 font-bold">Title:</span>
                                                <span className="text-slate-400">图表主标题，显示在顶部中央。</span>

                                                <span className="text-cyan-300 font-bold">Type:</span>
                                                <span className="text-slate-400">矩阵布局类型: L, T, Y, X, C</span>

                                                <span className="text-cyan-300 font-bold">Orientation:</span>
                                                <span className="text-slate-400">渲染方向: Top (默认) 或 Bottom (等轴测视图翻转)</span>

                                                <span className="text-cyan-300 font-bold">CellSize:</span>
                                                <span className="text-slate-400">正方形单元格基础尺寸 (默认 40)</span>

                                                <span className="text-cyan-300 font-bold">Font[Title|Base|Score]:</span>
                                                <span className="text-slate-400">对应位置的字号。示例: Font[Title]: 24</span>

                                                <span className="text-cyan-300 font-bold">Weight[Strong|Medium|Weak]:</span>
                                                <span className="text-slate-400">自定义符号对应的分值。默认: 9, 3, 1</span>

                                                <span className="text-cyan-300 font-bold">Color[Axis|Grid|...]:</span>
                                                <span className="text-slate-400">色彩配置。支持 HEX 颜色值。</span>
                                            </div>
                                        </section>

                                        {/* Section 2: 维度定义与权重 */}
                                        <section className="space-y-4">
                                            <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest border-b border-amber-900/50 pb-2">2. 轴维度与项目定义 (Axis & Items)</h4>
                                            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-6">
                                                <div className="space-y-3">
                                                    <p className="text-xs text-white font-bold">定义语法：</p>
                                                    <div className="bg-black/40 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-2">
                                                        <div>Axis: [ID], [Label] <span className="text-slate-600">// 定义一个新的维度轴</span></div>
                                                        <div>- [ItemID], [ItemLabel], [Weight] <span className="text-slate-600">// 定义轴下的具体项目</span></div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <p className="text-xs text-white font-bold">权重定义 (两种方式)：</p>
                                                    <ul className="text-xs space-y-2 text-slate-400 list-disc list-inside">
                                                        <li>三列 CSV 式：<code className="text-amber-500">- a01, 稳定性需求, 10</code></li>
                                                        <li>标签标注式：<code className="text-amber-500">- a01, 稳定性需求 [10]</code> (更易读)</li>
                                                    </ul>
                                                </div>

                                                <div className="space-y-3">
                                                    <p className="text-xs text-white font-bold">X型矩阵专用定义：</p>
                                                    <p className="text-xs text-slate-400 font-mono bg-black/40 p-4 rounded-xl">Order: AxisN, AxisE, AxisS, AxisW <br /><span className="text-[10px] text-slate-600">按顺时针方向定义四个轴的位置。</span></p>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Section 3: 矩阵映射规则 */}
                                        <section className="space-y-4">
                                            <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest border-b border-emerald-900/50 pb-2">3. 矩阵创建与数据填充 (Matrix Mapping)</h4>
                                            <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-6">
                                                <div className="space-y-3">
                                                    <p className="text-xs text-white font-bold">矩阵声明：</p>
                                                    <p className="text-xs text-slate-400 font-mono bg-black/40 p-4 rounded-xl">Matrix: [AxisID_Row] x [AxisID_Col]</p>
                                                </div>

                                                <div className="space-y-3">
                                                    <p className="text-xs text-white font-bold">关系录入：</p>
                                                    <div className="bg-black/40 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-2">
                                                        <div>[RowID]: [ColID]:[Symbol]</div>
                                                        <div className="text-slate-600 mt-1"> 示例: r1: c1:S, c2:M, c3:W</div>
                                                        <div className="text-slate-600"> (S=强, M=中, W=弱, 0=清除)</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                ) : (
                                    <div className="space-y-16">
                                        {/* Methodology Section */}
                                        <section className="space-y-8">
                                            <div className="flex items-center gap-4 border-l-4 border-cyan-500 pl-4">
                                                <h4 className="text-lg font-black text-white uppercase tracking-tight italic">矩阵分析法指南 (Methods & Analysis)</h4>
                                            </div>

                                            <div className="space-y-12">
                                                {/* L/T Type */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-[10px] font-black rounded border border-cyan-500/30">L/T 型</span>
                                                        <h5 className="text-sm font-bold text-slate-200">二元/三元传递分析</h5>
                                                    </div>
                                                    <div className="grid grid-cols-[240px_1fr] gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                        <div className="text-xs text-slate-400 leading-relaxed italic border-r border-slate-800 pr-6">
                                                            "最基础的映射分析，用于将客户需求（WHAT）转化为设计特性（HOW）。"
                                                        </div>
                                                        <div className="space-y-3 text-xs">
                                                            <div className="text-cyan-500 font-bold uppercase tracking-widest text-[10px]">分析逻辑</div>
                                                            <p>计算每个“输出项”承载的加权总分。分值越高，代表为了满足该项指标，系统需要投入的关注度越大。</p>
                                                            <div className="mt-2 text-slate-500 font-mono text-[10px]">公式: Score = Σ (输入权重 * 关联强度)</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Y Type */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black rounded border border-amber-500/30">Y 型</span>
                                                        <h5 className="text-sm font-bold text-slate-200">立体闭环影响分析</h5>
                                                    </div>
                                                    <div className="grid grid-cols-[240px_1fr] gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                        <div className="text-xs text-slate-400 leading-relaxed italic border-r border-slate-800 pr-6">
                                                            "用于三个维度互相制约的场景，如：需求 &rarr; 功能 &rarr; 零件 &rarr; 需求。"
                                                        </div>
                                                        <div className="space-y-3 text-xs">
                                                            <div className="text-amber-500 font-bold uppercase tracking-widest text-[10px]">分析逻辑</div>
                                                            <p>通过等轴测视图观察三维度的传递效率。不仅计算单轴得分，还要观察是否存在“逻辑断链”或“过度冗余”。</p>
                                                            <div className="mt-2 px-3 py-2 bg-black/30 rounded border border-white/5 text-slate-400 italic">
                                                                闭环分析有助于发现：看似不重要的零件（C），可能通过影响关键功能（B）从而极大地满足了核心需求（A）。
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* X Type */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded border border-emerald-500/30">X 型</span>
                                                        <h5 className="text-sm font-bold text-slate-200">四象限约束与匹配分析</h5>
                                                    </div>
                                                    <div className="grid grid-cols-[240px_1fr] gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                        <div className="text-xs text-slate-400 leading-relaxed italic border-r border-slate-800 pr-6">
                                                            "典型的组织资源匹配矩阵。例如：目标 &harr; 部门 &harr; 流程 &harr; 资源。"
                                                        </div>
                                                        <div className="space-y-3 text-xs">
                                                            <div className="text-emerald-500 font-bold uppercase tracking-widest text-[10px]">分析逻辑</div>
                                                            <p>边缘得分展示了该项受到两个相邻象限的“双重拉动强度”。高分项通常是跨流程协作的“超级枢纽”。</p>
                                                            <ul className="text-[10px] space-y-1 text-slate-500 list-disc list-inside">
                                                                <li>均衡性分析：观察象限关系是否分布均匀。</li>
                                                                <li>瓶颈分析：识别承载过多约束的关键环节。</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* C Type */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-black rounded border border-purple-500/30">C 型</span>
                                                        <h5 className="text-sm font-bold text-slate-200">屋顶自相关与协同分析</h5>
                                                    </div>
                                                    <div className="grid grid-cols-[240px_1fr] gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                                                        <div className="text-xs text-slate-400 leading-relaxed italic border-r border-slate-800 pr-6">
                                                            "HOQ 质量屋的经典屋顶。分析指标间的内部冲突或协同增益。"
                                                        </div>
                                                        <div className="space-y-3 text-xs">
                                                            <div className="text-purple-500 font-bold uppercase tracking-widest text-[10px]">分析逻辑</div>
                                                            <p>计算项目的<strong>“耦合度分值”</strong>。高分项代表系统中最不稳定的“敏感变量”。</p>
                                                            <div className="mt-2 text-slate-500 font-mono text-[10px]">
                                                                决策提示：在调整高分项参数时，必须同步评估它对其他所有项目的冲击效应。
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-10 border-t border-slate-800 bg-slate-900/50 flex justify-center shrink-0">
                                <button
                                    onClick={() => setShowDocs(false)}
                                    className="px-16 py-4 bg-cyan-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl hover:bg-cyan-500 transition-all"
                                >
                                    已阅读规范
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </div>
    );
};

export default MatrixEditor;
