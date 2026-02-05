import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Graph } from '@antv/g6';
import { RelationNode, RelationLink, RelationChartStyles, DEFAULT_RELATION_STYLES } from '../types';

export interface RelationDiagramRef {
    exportPNG: (transparent?: boolean) => void;
    exportPDF: () => void;
    tidyLayout: () => void;
}

interface RelationDiagramProps {
    nodes: RelationNode[];
    links: RelationLink[];
    styles?: RelationChartStyles;
    className?: string;
}

const RelationDiagram = forwardRef<RelationDiagramRef, RelationDiagramProps>(({ nodes, links, styles, className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<Graph | null>(null);

    const finalStyles = { ...DEFAULT_RELATION_STYLES, ...styles };

    useImperativeHandle(ref, () => ({
        exportPNG: async (transparent = false) => {
            if (!graphRef.current) return;
            const rawDataURL = await graphRef.current.toDataURL();

            if (transparent) {
                const link = document.createElement('a');
                link.download = `关联图_透明_${new Date().getTime()}.png`;
                link.href = rawDataURL;
                link.click();
                return;
            }

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#ffffff'; // Default white background
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    const link = document.createElement('a');
                    link.download = `关联图_${new Date().getTime()}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
            };
            img.src = rawDataURL;
        },
        exportPDF: async () => {
            if (!graphRef.current) return;
            const dataURL = await graphRef.current.toDataURL({
                backgroundColor: '#ffffff'
            } as any);

            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
             <html>
                 <head><title>导出 PDF - Smart QC Studio</title></head>
                 <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#f8fafc;">
                     <img src="${dataURL}" style="max-width:95%; max-height:95%; object-fit:contain; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);" />
                 </body>
             </html>
         `);
                win.document.close();
                setTimeout(() => {
                    win.print();
                    win.close();
                }, 800);
            }
        },
        tidyLayout: () => {
            if (graphRef.current) {
                graphRef.current.layout();
                graphRef.current.fitView({ duration: 500 } as any);
            }
        }
    }));

    useEffect(() => {
        if (!containerRef.current || !nodes.length) return;

        const width = containerRef.current.clientWidth || 800;
        const height = containerRef.current.clientHeight || 600;

        // Transform data for G6
        // --- VIRTUAL ROOT LOGIC ---
        // 1. Identify User Graph Sinks (Nodes with Out-Degree = 0)
        const userOutDegree = new Map<string, number>();
        nodes.forEach(n => userOutDegree.set(n.id, 0));
        links.forEach(l => {
            userOutDegree.set(l.source, (userOutDegree.get(l.source) || 0) + 1);
        });
        const userSinks = nodes.filter(n => (userOutDegree.get(n.id) || 0) === 0);

        // 2. Create Augmented Data
        const sysRootId = 'root';

        // Transform User Nodes
        const g6Nodes = nodes.map(node => {
            let fill = finalStyles.middleColor;
            let stroke = finalStyles.middleColor;
            let labelFill = finalStyles.middleTextColor;
            let shape = 'rect';
            let size: number | [number, number] = [Math.max(100, node.label.length * 14 + 20), 40];

            if (node.type === 'end') {
                fill = finalStyles.endColor;
                stroke = finalStyles.endColor;
                labelFill = finalStyles.endTextColor;
            }
            // Note: 'root' type is effectively deprecated for user nodes, but we keep fallback just in case

            return {
                id: node.id,
                type: shape,
                data: { ...node },
                style: {
                    fill,
                    stroke,
                    lineWidth: 0,
                    radius: 8,
                    labelText: node.label,
                    labelFill,
                    labelFontSize: finalStyles.nodeFontSize,
                    labelPlacement: 'center',
                    size,
                    cursor: 'pointer'
                }
            };
        });

        // Add Virtual Root Node
        // Add Virtual Root Node
        const rootLabel = finalStyles.title || '核心问题';
        const rootFontSize = finalStyles.titleFontSize || 20; // Default to 20px as requested for better visibility
        // Ellipse sizing: Width needs to be wider than text. 
        // Estimate char width ~ fontSize * 1.0 (compact) * text length
        const rootWidth = Math.max(140, rootLabel.length * rootFontSize + 40);
        const rootHeight = Math.max(50, rootFontSize * 2 + 20);

        g6Nodes.push({
            id: sysRootId,
            type: 'ellipse',
            data: { id: sysRootId, label: 'ROOT' } as any, // Dummy data
            style: {
                fill: finalStyles.rootColor,
                stroke: finalStyles.rootColor,
                lineWidth: 0,
                radius: 8,
                labelText: rootLabel,
                labelFill: finalStyles.rootTextColor,
                labelFontSize: rootFontSize,
                labelFontWeight: 'bold',
                labelPlacement: 'center',
                size: [rootWidth, rootHeight],
                cursor: 'default'
            }
        });

        // Transform User Links
        const g6Edges = links.map(link => ({
            source: link.source,
            target: link.target,
            style: {
                stroke: finalStyles.lineColor,
                lineWidth: 2,
                endArrow: true
            }
        }));

        // Add Edges from User Sinks -> Virtual Root
        userSinks.forEach(sink => {
            g6Edges.push({
                source: sink.id,
                target: sysRootId,
                style: {
                    stroke: finalStyles.lineColor,
                    lineWidth: 2,
                    endArrow: true,
                    lineDash: [4, 4] // Optional: dashed lines for implicit connections? Or solid? User implied default connection. Solid is fine.
                }
            });
        });

        if (!graphRef.current) {
            const graph = new Graph({
                container: containerRef.current,
                width,
                height,
                data: { nodes: g6Nodes, edges: g6Edges },
                layout: getLayoutConfig(finalStyles.layout || 'Directional'),
                behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
                autoFit: 'view',
                animation: true,
            });

            graphRef.current = graph;
            graph.render();
        } else {
            graphRef.current.setData({ nodes: g6Nodes, edges: g6Edges });
            // Update Layout dynamically
            graphRef.current.setLayout(getLayoutConfig(finalStyles.layout || 'Directional'));
            graphRef.current.render();
            // Force re-layout on data change
            setTimeout(() => graphRef.current?.layout(), 50);
        }

        function getLayoutConfig(type: string): any {
            switch (type) {
                case 'Directional':
                    return {
                        type: 'dagre',
                        rankdir: 'LR',
                        nodesep: 50,
                        ranksep: 100,
                        controlPoints: true,
                    };
                case 'Centralized':
                    // Radial Layout: Root at center
                    return {
                        type: 'radial',
                        center: [width / 2, height / 2],
                        unitRadius: 180, // Distance between rings
                        linkDistance: 150,
                        preventOverlap: true,
                        nodeSize: 60,
                        strict: true, // Place strictly on rings
                    };
                case 'Free':
                    return {
                        type: 'fruchterman',
                        gravity: 1, // Reduced gravity to prevent tight clustering
                        speed: 5,
                        preventOverlap: true,
                        nodeSize: 120, // Increased to account for larger labels
                        gpuEnabled: true, // Performance optimized
                        workerEnabled: true,
                    };
                default:
                    return {
                        type: 'dagre',
                        rankdir: 'LR',
                    };
            }
        }

        const resizeObserver = new ResizeObserver((entries) => {
            if (!containerRef.current || !graphRef.current) return;
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) {
                graphRef.current.setSize(width, height);
                graphRef.current.fitView();
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };

    }, [nodes, links, styles]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ width: '100%', height: '100%', backgroundColor: '#ffffff' }}
        />
    );
});

export default RelationDiagram;
