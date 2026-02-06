import React, { useState, useRef } from 'react';
import { QCToolType } from './types';
import {
  TOOL_CONFIGS,
  INITIAL_FISHBONE_DSL,
  INITIAL_PARETO_DSL,
  INITIAL_PARETO_DATA,
  INITIAL_CONTROL_DATA,
  INITIAL_HISTOGRAM_DSL,
  INITIAL_SCATTER_DATA,
  INITIAL_SCATTER_DSL,
  INITIAL_AFFINITY_DATA,
  INITIAL_AFFINITY_DSL,
  INITIAL_CONTROL_DSL,
  INITIAL_RELATION_DSL,
  INITIAL_RELATION_DATA,
  INITIAL_MATRIX_DSL,
  INITIAL_MATRIX_PLOT_DSL,
  INITIAL_PDPC_DSL,
  INITIAL_PDPC_DATA,
  INITIAL_ARROW_DSL,
  INITIAL_BASIC_DSL,
  INITIAL_BASIC_DATA,
  INITIAL_RADAR_DATA,
  INITIAL_RADAR_DSL
} from './constants';
import {
  DEFAULT_PARETO_STYLES,
  DEFAULT_FISHBONE_STYLES,
  DEFAULT_HISTOGRAM_STYLES,
  DEFAULT_SCATTER_STYLES,
  DEFAULT_AFFINITY_STYLES,
  DEFAULT_RELATION_STYLES,
  DEFAULT_MATRIX_STYLES,
  ScatterChartStyles,
  AffinityChartStyles,
  RelationNode,
  RelationLink,
  RelationChartStyles,
  MatrixData,
  MatrixChartStyles,
  MatrixPlotData,
  MatrixPlotStyles,
  DEFAULT_MATRIX_PLOT_STYLES,
  PDPCData,
  PDPCChartStyles,
  DEFAULT_PDPC_STYLES,
  ArrowData,
  ArrowChartStyles,
  DEFAULT_ARROW_STYLES,
  FishboneNode,
  ParetoItem,
  ScatterPoint,
  AffinityItem,
  BasicChartData,
  BasicChartStyles,
  DEFAULT_BASIC_STYLES,
  RadarData,
  RadarChartStyles,
  DEFAULT_RADAR_STYLES
} from './types';
import { Workspace } from './components/layout/Workspace';
import { DashboardView } from './components/DashboardView';
import { EditorPanel } from './components/EditorPanel';
import FishboneDiagram, { FishboneDiagramRef } from './components/FishboneDiagram';
import { ParetoDiagram, ParetoDiagramRef } from './components/ParetoDiagram';
import { HistogramDiagram } from './components/HistogramDiagram';
import { ScatterDiagram } from './components/ScatterDiagram';
import { AffinityDiagram } from './components/AffinityDiagram';
import { ParetoEditor } from './components/ParetoEditor';
import { HistogramEditor } from './components/HistogramEditor';
import FishboneEditor from './components/FishboneEditor';
import ScatterEditor from './components/ScatterEditor';
import AffinityEditor from './components/AffinityEditor';
import RelationEditor, { parseRelationDSL } from './components/RelationEditor';
import RelationDiagram from './components/RelationDiagram';
import ControlChartEditor, { parseControlDSL } from './components/ControlChartEditor';
import ControlChart from './components/ControlChart';
import MatrixEditor, { parseMatrixDSL, updateMatrixDSL } from './components/MatrixEditor';
import { MatrixDiagram } from './components/MatrixDiagram';
import MatrixPlotEditor, { parseMatrixPlotDSL } from './components/MatrixPlotEditor';
import { MatrixPlotDiagram } from './components/MatrixPlotDiagram';
import PDPCEditor, { parsePDPCDSL } from './components/PDPCEditor';
import PDPCDiagram from './components/PDPCDiagram';
import { ArrowDiagram } from './components/ArrowDiagram';
import { ArrowDiagramEditor, parseArrowDSL } from './components/ArrowDiagramEditor';
import BasicEditor, { parseBasicDSL } from './components/BasicEditor';
import BasicDiagram from './components/BasicDiagram';
import RadarEditor, { parseRadarDSL } from './components/RadarEditor';
import RadarDiagram from './components/RadarDiagram';
import { Zap, Settings, Globe, LayoutGrid, Download, FileText, Image, Cpu, Loader2, LineChart, BarChart3 } from 'lucide-react';

// --- DSL Parsing Functions (Move outside to support Lazy Initialization) ---

const parseInitialFishbone = () => {
  try {
    const lines = INITIAL_FISHBONE_DSL.split('\n');
    let title = '生产线停产原因分析';
    const mainBranches: FishboneNode[] = [];
    const newStyles = { ...DEFAULT_FISHBONE_STYLES };

    let currentMain: FishboneNode | null = null;
    let currentSub: FishboneNode | null = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) return;

      if (trimmed.startsWith('Title:')) {
        title = trimmed.split(':')[1].trim();
        return;
      }

      const colorMatch = trimmed.match(/Color\[(\w+)\]:\s*(#[0-9a-fA-F]{6})/);
      if (colorMatch) {
        const keyMap: any = {
          'Bone': 'boneLine',
          'Line': 'boneLine',
          'Root': 'rootColor',
          'RootText': 'rootTextColor',
          'Main': 'mainColor',
          'MainText': 'mainTextColor',
          'Text': 'caseColor',
          'End': 'endColor'
        };
        const key = keyMap[colorMatch[1]];
        if (key) newStyles[key] = colorMatch[2];
        return;
      }

      if (trimmed.startsWith('###')) {
        if (currentSub) {
          currentSub.children.push({
            id: Math.random().toString(36).substr(2, 9),
            label: trimmed.substring(3).trim(),
            type: 'sub',
            children: []
          });
        }
      } else if (trimmed.startsWith('##')) {
        if (currentMain) {
          currentSub = {
            id: Math.random().toString(36).substr(2, 9),
            label: trimmed.substring(2).trim(),
            type: 'sub',
            children: []
          };
          currentMain.children.push(currentSub);
        }
      } else if (trimmed.startsWith('#')) {
        currentMain = {
          id: Math.random().toString(36).substr(2, 9),
          label: trimmed.substring(1).trim(),
          type: 'main',
          children: []
        };
        mainBranches.push(currentMain);
        currentSub = null;
      }
    });

    return { data: { id: 'root', label: title, type: 'root', children: mainBranches }, styles: newStyles };
  } catch (e) {
    console.error('Fishbone Init Error:', e);
    return { data: { id: 'root', label: '核心问题', type: 'root', children: [] }, styles: DEFAULT_FISHBONE_STYLES };
  }
};

const parseInitialPareto = () => {
  const lines = INITIAL_PARETO_DSL.split('\n');
  const newItems: any[] = [];
  const newStyles: any = { ...DEFAULT_PARETO_STYLES };
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const titleMatch = trimmed.match(/^Title:\s*(.+)/);
    if (titleMatch) { newStyles.title = titleMatch[1]; return; }
    const colorMatch = trimmed.match(/Color\[(Bar|Line|MarkLine|Title)\]:\s*(#[0-9a-fA-F]+)/);
    if (colorMatch) {
      const key = colorMatch[1].charAt(0).toLowerCase() + colorMatch[1].slice(1) + 'Color';
      newStyles[key] = colorMatch[2]; return;
    }
    const decimalMatch = trimmed.match(/^Decimals:\s*(\d+)/);
    if (decimalMatch) { newStyles.decimals = parseInt(decimalMatch[1]); return; }
    const itemMatch = trimmed.match(/^-\s*(.+):\s*(\d+)/);
    if (itemMatch) {
      newItems.push({ id: Math.random().toString(36).substr(2, 9), name: itemMatch[1].trim(), value: parseInt(itemMatch[2]) });
    }
  });
  return { items: newItems.length > 0 ? newItems : INITIAL_PARETO_DATA, styles: newStyles };
};

const parseInitialHistogram = () => {
  const lines = INITIAL_HISTOGRAM_DSL.split('\n');
  const newData: number[] = [];
  const newStyles: any = { ...DEFAULT_HISTOGRAM_STYLES };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const titleMatch = trimmed.match(/^Title:\s*(.+)/);
    if (titleMatch) { newStyles.title = titleMatch[1].trim(); return; }
    const colorMatch = trimmed.match(/Color\[(Bar|Curve|USL|LSL|Target)\]:\s*(#[0-9a-fA-F]+)/i);
    if (colorMatch) { newStyles[colorMatch[1].toLowerCase() + 'Color'] = colorMatch[2]; return; }
    const specMatch = trimmed.match(/^(USL|LSL|Target):\s*([\d\.-]+)/);
    if (specMatch) { newStyles[specMatch[1].toLowerCase()] = parseFloat(specMatch[2]); return; }
    const curveMatch = trimmed.match(/^ShowCurve:\s*(true|false)/i);
    if (curveMatch) { newStyles.showCurve = curveMatch[1].toLowerCase() === 'true'; return; }
    const binsMatch = trimmed.match(/^Bins:\s*(auto|\d+)/i);
    if (binsMatch) { newStyles.bins = binsMatch[1].toLowerCase() === 'auto' ? 'auto' : parseInt(binsMatch[1]); return; }
    const dataMatch = trimmed.match(/^-\s*([\d\.-]+)/);
    if (dataMatch) newData.push(parseFloat(dataMatch[1]));
  });
  return { data: newData, styles: newStyles };
};

const parseInitialScatter = () => {
  const lines = INITIAL_SCATTER_DSL.split('\n');
  const newStyles: any = { ...DEFAULT_SCATTER_STYLES };
  const newPoints: any[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    if (trimmed.includes(':') && !trimmed.startsWith('-')) {
      const [key, ...vals] = trimmed.split(':');
      const val = vals.join(':').trim();
      switch (key.trim()) {
        case 'Title': newStyles.title = val; break;
        case 'XAxis': newStyles.xAxisLabel = val; break;
        case 'YAxis': newStyles.yAxisLabel = val; break;
        case 'Color[Point]': newStyles.pointColor = val; break;
        case 'Color[Trend]': newStyles.trendColor = val; break;
        case 'ShowTrend': newStyles.showTrend = val.toLowerCase() === 'true'; break;
        case 'ZAxis': newStyles.zAxisLabel = val; break;
        case '3D': newStyles.is3D = val.toLowerCase() === 'true'; break;
        case 'Size[Base]': newStyles.baseSize = parseFloat(val); break;
        case 'Opacity': newStyles.opacity = parseFloat(val); break;
      }
      return;
    }
    if (trimmed.startsWith('-')) {
      const parts = trimmed.substring(1).split(',').map(s => parseFloat(s.trim()));
      if (parts.length >= 2) newPoints.push({ id: Math.random().toString(36).substr(2, 9), x: parts[0], y: parts[1], z: parts[2] });
    }
  });
  const finalData = newPoints.length > 0 ? newPoints : INITIAL_SCATTER_DATA;
  return { data: finalData, styles: newStyles };
};

const parseInitialAffinity = () => {
  const lines = INITIAL_AFFINITY_DSL.split('\n');
  const newStyles: any = { ...DEFAULT_AFFINITY_STYLES };
  const items: AffinityItem[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return;

    if (trimmed.startsWith('Title:')) {
      newStyles.title = trimmed.split(':')[1].trim();
    } else if (trimmed.startsWith('Type:')) {
      newStyles.type = trimmed.split(':')[1].trim() as any;
    } else if (trimmed.startsWith('Layout:')) {
      newStyles.layout = trimmed.split(':')[1].trim() as any;
    } else if (trimmed.startsWith('Color[')) {
      const match = trimmed.match(/Color\[(TitleBg|TitleText|GroupHeaderBg|GroupHeaderText|ItemBg|ItemText|Line|Border)\]:\s*(#[0-9a-fA-F]+)/i);
      if (match) {
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
        newStyles[keyMap[match[1]]] = match[2];
      }
    } else if (trimmed.startsWith('Font[')) {
      const match = trimmed.match(/Font\[(Title|GroupHeader|Item)\]:\s*(\d+)/i);
      if (match) {
        const keyMap: any = {
          'Title': 'titleFontSize',
          'GroupHeader': 'groupHeaderFontSize',
          'Item': 'itemFontSize'
        };
        newStyles[keyMap[match[1]]] = parseInt(match[2]);
      }
    } else if (trimmed.startsWith('Item:')) {
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

  // Find the explicit 'root' node and use its children as the data provider
  // for AffinityDiagram (which adds its own virtual root from styles.title).
  const realRootNode = items.find(i => i.id === 'root');
  const finalData = realRootNode && realRootNode.children ? realRootNode.children : rootItems.filter(i => i.id !== 'root');

  return { data: finalData.length > 0 ? finalData : INITIAL_AFFINITY_DATA, styles: newStyles };
};



const parseInitialRelation = () => {
  try {
    const { nodes, links, styles } = parseRelationDSL(INITIAL_RELATION_DSL);
    return { nodes, links, styles };
  } catch (e) {
    console.error('Relation Init Error:', e);
    return { nodes: INITIAL_RELATION_DATA.nodes, links: INITIAL_RELATION_DATA.links, styles: DEFAULT_RELATION_STYLES };
  }
};

const parseInitialPDPC = () => {
  try {
    return parsePDPCDSL(INITIAL_PDPC_DSL);
  } catch {
    return { data: INITIAL_PDPC_DATA, styles: DEFAULT_PDPC_STYLES };
  }
};

const parseInitialBasic = () => {
  try {
    return parseBasicDSL(INITIAL_BASIC_DSL);
  } catch {
    return { data: INITIAL_BASIC_DATA, styles: DEFAULT_BASIC_STYLES };
  }
};

const parseInitialRadar = () => {
  try {
    return parseRadarDSL(INITIAL_RADAR_DSL);
  } catch {
    return { data: INITIAL_RADAR_DATA, styles: DEFAULT_RADAR_STYLES };
  }
};

const App: React.FC = () => {
  // State variables for each tool
  const [selectedTool, setSelectedTool] = useState<QCToolType>(QCToolType.DASHBOARD);

  const [fishboneData, setFishboneData] = useState<FishboneNode>(() => parseInitialFishbone().data);
  const [fishboneStyles, setFishboneStyles] = useState<any>(() => parseInitialFishbone().styles);

  const [paretoData, setParetoData] = useState<ParetoItem[]>(() => parseInitialPareto().items);
  const [paretoStyles, setParetoStyles] = useState<any>(() => parseInitialPareto().styles);

  const [histogramData, setHistogramData] = useState<number[]>(() => parseInitialHistogram().data);
  const [histogramStyles, setHistogramStyles] = useState<any>(() => parseInitialHistogram().styles);

  const [scatterData, setScatterData] = useState<ScatterPoint[]>(() => parseInitialScatter().data as ScatterPoint[]);
  const [scatterStyles, setScatterStyles] = useState<ScatterChartStyles>(() => parseInitialScatter().styles);

  const [affinityData, setAffinityData] = useState<AffinityItem[]>(() => parseInitialAffinity().data);
  const [affinityStyles, setAffinityStyles] = useState<AffinityChartStyles>(() => parseInitialAffinity().styles);

  const [relationNodes, setRelationNodes] = useState<RelationNode[]>(() => parseInitialRelation().nodes);
  const [relationLinks, setRelationLinks] = useState<RelationLink[]>(() => parseInitialRelation().links);
  const [relationStyles, setRelationStyles] = useState<RelationChartStyles>(() => parseInitialRelation().styles);

  const [matrixDsl, setMatrixDsl] = useState<string>(INITIAL_MATRIX_DSL);
  const [matrixData, setMatrixData] = useState<MatrixData | null>(() => parseMatrixDSL(INITIAL_MATRIX_DSL).data);
  const [matrixStyles, setMatrixStyles] = useState<MatrixChartStyles>(() => parseMatrixDSL(INITIAL_MATRIX_DSL).styles);

  const [matrixPlotDsl, setMatrixPlotDsl] = useState<string>(INITIAL_MATRIX_PLOT_DSL);
  const [matrixPlotData, setMatrixPlotData] = useState<MatrixPlotData | null>(() => parseMatrixPlotDSL(INITIAL_MATRIX_PLOT_DSL).data);
  const [matrixPlotStyles, setMatrixPlotStyles] = useState<MatrixPlotStyles>(() => parseMatrixPlotDSL(INITIAL_MATRIX_PLOT_DSL).styles);

  const [pdpcDsl, setPdpcDsl] = useState<string>(INITIAL_PDPC_DSL);
  const [pdpcData, setPdpcData] = useState<PDPCData>(() => parseInitialPDPC().data);
  const [pdpcStyles, setPdpcStyles] = useState<PDPCChartStyles>(() => parseInitialPDPC().styles);

  const [arrowData, setArrowData] = useState<ArrowData | null>(() => {
    try {
      return parseArrowDSL(INITIAL_ARROW_DSL).data;
    } catch {
      return null;
    }
  });
  const [arrowStyles, setArrowStyles] = useState<ArrowChartStyles>(() => {
    try {
      return parseArrowDSL(INITIAL_ARROW_DSL).styles;
    } catch {
      return DEFAULT_ARROW_STYLES;
    }
  });

  const [basicData, setBasicData] = useState<BasicChartData>(() => parseInitialBasic().data);
  const [basicStyles, setBasicStyles] = useState<BasicChartStyles>(() => parseInitialBasic().styles);

  const [radarData, setRadarData] = useState<RadarData>(() => parseInitialRadar().data);
  const [radarStyles, setRadarStyles] = useState<RadarChartStyles>(() => parseInitialRadar().styles);

  const [dashboardCols, setDashboardCols] = useState(6);


  const [controlDsl, setControlDsl] = useState<string>(INITIAL_CONTROL_DSL);
  const [showParetoLine, setShowParetoLine] = useState(true);
  const [matrixOrientation, setMatrixOrientation] = useState<'top-down' | 'bottom-up'>('top-down');

  // Derived Control Chart Data
  const { series: controlSeries, styles: controlStyles } = React.useMemo(() => parseControlDSL(controlDsl), [controlDsl]);

  // 引用图表组件的方法 (如导出)
  const diagramRef = useRef<any>(null);

  // 移除部分冗余的内部解析函数...


  // 移除部分冗余的内部解析函数 (Histogram & Scatter)...


  // 移除最后剩下的冗余内部解析函数 (Affinity, Relation & PDPC)...


  // 移除 redundant useEffect，因为所有状态都已通过 Lazy Initialization 初始化且状态持久化
  // 仅在需要响应特定工具切换逻辑时添加 useEffect
  React.useEffect(() => {
    if (selectedTool === QCToolType.MATRIX) {
      // 保持 Matrix 进入时重置 DSL 的逻辑（如果这是预期行为）
      // setMatrixDsl(INITIAL_MATRIX_DSL); 
    }
  }, [selectedTool]);

  // Interactive Matrix Handling
  const handleMatrixCellClick = (rowId: string, colId: string, currentSymbol: any, rowAxisId?: string, colAxisId?: string) => {
    const newDsl = updateMatrixDSL(matrixDsl, rowId, colId, currentSymbol, rowAxisId, colAxisId);
    setMatrixDsl(newDsl);
    // Auto-update data
    try {
      const { data: d, styles: s } = parseMatrixDSL(newDsl);
      setMatrixData(d);
      // setMatrixStyles(s); // Optional: keep style edits separate or sync
    } catch (e) {
      console.error("Auto-sync error", e);
    }
  };

  if (selectedTool === QCToolType.DASHBOARD) {
    return <DashboardView onSelectTool={setSelectedTool} cols={dashboardCols} setCols={setDashboardCols} />;
  }

  const currentTool = TOOL_CONFIGS.find(t => t.type === selectedTool);

  return (
    <div className="flex h-screen bg-[#fcfdfe] text-slate-900 overflow-hidden font-sans">
      <Workspace
        sidebarContent={
          <div className="flex flex-col h-full bg-[#0f172a]">
            <div className="p-8 h-20 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/40 shrink-0">
              <button
                onClick={() => setSelectedTool(QCToolType.DASHBOARD)}
                className="flex items-center gap-5 active:scale-95 transition-all group"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-blue-500 transition-all">
                  <Zap className="w-5 h-5 text-white fill-current" />
                </div>
                <div>
                  <h1 className="font-black text-white text-lg tracking-tighter leading-none uppercase">Studio</h1>
                  <p className="text-[8px] text-blue-400 uppercase font-black tracking-[0.2em] mt-1 opacity-60">Logic Core</p>
                </div>
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {selectedTool === QCToolType.PARETO ? (
                <ParetoEditor
                  data={paretoData}
                  styles={paretoStyles}
                  showLine={showParetoLine}
                  onShowLineChange={setShowParetoLine}
                  onUpdate={(d, s) => { setParetoData(d); setParetoStyles(s); }}
                />
              ) : selectedTool === QCToolType.CONTROL ? (
                <ControlChartEditor
                  dsl={controlDsl}
                  onDslChange={setControlDsl}
                />
              ) : selectedTool === QCToolType.FISHBONE ? (
                <FishboneEditor
                  data={fishboneData}
                  styles={fishboneStyles}
                  onDataChange={setFishboneData}
                  onStylesChange={setFishboneStyles}
                />
              ) : selectedTool === QCToolType.HISTOGRAM ? (
                <HistogramEditor
                  data={histogramData}
                  styles={histogramStyles}
                  onUpdate={(d, s) => {
                    setHistogramData(d);
                    setHistogramStyles(s);
                  }}
                />
              ) : selectedTool === QCToolType.SCATTER ? (
                <ScatterEditor
                  data={scatterData}
                  styles={scatterStyles}
                  onDataChange={setScatterData}
                  onStylesChange={setScatterStyles}
                />
              ) : selectedTool === QCToolType.AFFINITY ? (
                <AffinityEditor
                  data={affinityData}
                  styles={affinityStyles}
                  onDataChange={setAffinityData}
                  onStylesChange={setAffinityStyles}
                />
              ) : selectedTool === QCToolType.RELATION ? (
                <RelationEditor
                  nodes={relationNodes}
                  links={relationLinks}
                  styles={relationStyles}
                  onDataChange={(n, l) => { setRelationNodes(n); setRelationLinks(l); }}
                  onStylesChange={setRelationStyles}
                />
              ) : selectedTool === QCToolType.MATRIX ? (
                matrixData ? (
                  <MatrixEditor
                    data={matrixData}
                    styles={matrixStyles}
                    dsl={matrixDsl}
                    onDataChange={setMatrixData}
                    onStylesChange={setMatrixStyles}
                    onDslChange={setMatrixDsl}
                  />
                ) : <div className="text-slate-500 p-8">Initializing Matrix...</div>
              ) : selectedTool === QCToolType.MATRIX_PLOT ? (
                matrixPlotData ? (
                  <MatrixPlotEditor
                    data={matrixPlotData}
                    styles={matrixPlotStyles}
                    onDataChange={setMatrixPlotData}
                    onStylesChange={setMatrixPlotStyles}
                  />
                ) : <div className="text-slate-500 p-8">Initializing Matrix Plot...</div>
              ) : selectedTool === QCToolType.PDPC ? (
                <PDPCEditor
                  data={pdpcData}
                  styles={pdpcStyles}
                  onDataChange={setPdpcData}
                  onStylesChange={setPdpcStyles}
                />
              ) : selectedTool === QCToolType.ARROW ? (
                arrowData ? (
                  <ArrowDiagramEditor
                    data={arrowData}
                    styles={arrowStyles}
                    onDataChange={setArrowData}
                    onStylesChange={setArrowStyles}
                  />
                ) : <div className="text-slate-500 p-8">Initializing Arrow Diagram...</div>
              ) : selectedTool === QCToolType.BASIC ? (
                <BasicEditor
                  data={basicData}
                  styles={basicStyles}
                  onDataChange={setBasicData}
                  onStylesChange={setBasicStyles}
                />
              ) : selectedTool === QCToolType.RADAR ? (
                <RadarEditor
                  data={radarData}
                  styles={radarStyles}
                  onDataChange={setRadarData}
                  onStylesChange={setRadarStyles}
                />
              ) : (
                <EditorPanel
                  toolType={selectedTool}
                  onDataUpdate={() => { }} // TODO: 针对 fallback 工具实现具体的更新逻辑
                  currentData={null}
                />
              )}
            </div>

          </div>
        }
        canvasContent={
          <div className="w-full h-full flex flex-col relative bg-white">
            <header className="h-24 bg-white/70 backdrop-blur-2xl border-b border-slate-200/50 flex items-center justify-between px-12 shrink-0 z-40">
              <div className="flex items-center gap-6">
                <div className="w-1.5 h-12 bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)]" />
                <div>
                  <h2 className="font-black text-slate-900 text-2xl tracking-tighter uppercase">{currentTool?.name}</h2>
                  <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black tracking-widest border border-blue-100 uppercase mt-1">Live Engine</div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3 mr-1">画布操作</span>
                  <button
                    onClick={() => diagramRef.current?.tidyLayout?.()}
                    className="p-3 bg-white shadow-sm rounded-xl text-slate-700 hover:text-blue-600 hover:shadow-md transition-all flex items-center gap-2 group"
                  >
                    <LayoutGrid size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">整理布局</span>
                  </button>
                  <div className="w-px h-6 bg-slate-200 mx-1" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mr-1">导出</span>
                  <button
                    onClick={() => diagramRef.current?.exportPNG?.(false)}
                    className="p-3 bg-white shadow-sm rounded-xl text-slate-700 hover:text-blue-600 hover:shadow-md transition-all flex items-center gap-2 group"
                  >
                    <Image size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">白底 PNG</span>
                  </button>
                  <button
                    onClick={() => diagramRef.current?.exportPNG?.(true)}
                    className="p-3 bg-white shadow-sm rounded-xl text-slate-700 hover:text-emerald-600 hover:shadow-md transition-all flex items-center gap-2 group"
                  >
                    <Download size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">透明 PNG</span>
                  </button>
                  <button
                    onClick={() => diagramRef.current?.exportPDF?.()}
                    className="p-3 bg-white shadow-sm rounded-xl text-slate-700 hover:text-red-600 hover:shadow-md transition-all flex items-center gap-2"
                  >
                    <FileText size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">PDF</span>
                  </button>
                </div>
                {selectedTool === QCToolType.MATRIX && (
                  <div className="flex gap-2 ml-4 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3 mr-1">视图</span>
                    <button
                      onClick={() => setMatrixOrientation(prev => prev === 'top-down' ? 'bottom-up' : 'top-down')}
                      className={`p-3 shadow-sm rounded-xl text-slate-700 hover:shadow-md transition-all flex items-center gap-2 group ${matrixOrientation === 'bottom-up' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-white'}`}
                    >
                      <Globe size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{matrixOrientation === 'top-down' ? '俯视' : '仰视'}</span>
                    </button>
                  </div>
                )}
                <div className="w-12 h-12 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden shadow-2xl border-2 border-white ring-8 ring-slate-50">
                  <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${selectedTool}`} alt="avatar" />
                </div>
              </div>
            </header>

            <div className="flex-1 relative min-h-0 bg-white">
              {(() => {
                switch (selectedTool) {
                  case QCToolType.FISHBONE: return <FishboneDiagram ref={diagramRef} data={fishboneData} styles={fishboneStyles} />;
                  case QCToolType.PARETO: return (
                    <ParetoDiagram
                      ref={diagramRef}
                      data={paretoData}
                      styles={paretoStyles}
                      showLine={showParetoLine}
                    />
                  );
                  case QCToolType.CONTROL: return <ControlChart ref={diagramRef} series={controlSeries} styles={controlStyles} />;
                  case QCToolType.HISTOGRAM:
                    return <HistogramDiagram ref={diagramRef} data={histogramData} styles={histogramStyles} />;
                  case QCToolType.SCATTER:
                    return <ScatterDiagram ref={diagramRef} data={scatterData} styles={scatterStyles} />;
                  case QCToolType.AFFINITY:
                    return <AffinityDiagram ref={diagramRef} data={affinityData} styles={affinityStyles} />;
                  case QCToolType.RELATION:
                    return <RelationDiagram ref={diagramRef} nodes={relationNodes} links={relationLinks} styles={relationStyles} />;
                  case QCToolType.MATRIX:
                    return matrixData ? <MatrixDiagram ref={diagramRef} data={matrixData} styles={matrixStyles} onCellClick={handleMatrixCellClick} orientation={matrixOrientation} /> : null;
                  case QCToolType.MATRIX_PLOT:
                    return matrixPlotData ? <MatrixPlotDiagram ref={diagramRef} data={matrixPlotData} styles={matrixPlotStyles} /> : null;
                  case QCToolType.PDPC:
                    return <PDPCDiagram ref={diagramRef} data={pdpcData} styles={pdpcStyles} onStylesChange={setPdpcStyles} />;
                  case QCToolType.ARROW:
                    return arrowData ? <ArrowDiagram ref={diagramRef} data={arrowData} styles={arrowStyles} /> : null;
                  case QCToolType.BASIC:
                    return <BasicDiagram ref={diagramRef} data={basicData} styles={basicStyles} />;
                  case QCToolType.RADAR:
                    return <RadarDiagram ref={diagramRef} data={radarData} styles={radarStyles} />;
                  default: return (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-white">
                      <Cpu className="w-32 h-32 text-slate-100 mb-8" />
                      <p className="text-3xl font-black text-slate-200 uppercase tracking-[0.4em]">Unit Offline</p>
                      <p className="text-[11px] text-slate-400 mt-4 font-black uppercase tracking-[0.2em]">Logic injection required from terminal</p>
                    </div>
                  );
                }
              })()}
            </div>

            <footer className="h-20 border-t border-slate-100 px-12 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-xl">
              <div className="flex items-center gap-10">
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.25em] flex items-center gap-4">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_12px_#10b981]" />
                  Precision Computing Active
                </p>
                <div className="h-5 w-px bg-slate-200" />
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">Sample Rate: 60Hz</p>
              </div>
              <div className="flex gap-6">
                <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all">导出原始数据 (CSV)</button>
                <button
                  onClick={() => diagramRef.current?.exportPNG?.()}
                  className="text-[12px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-all"
                >
                  导出分析报告
                </button>
              </div>
            </footer>
          </div>
        }
      />
    </div>
  );
};

export default App;
