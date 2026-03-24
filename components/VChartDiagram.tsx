import React, { useImperativeHandle, forwardRef, useRef, useMemo } from 'react';
import { VChart } from '@visactor/react-vchart';
import { VChartData, VChartChartStyles, DEFAULT_VCHART_STYLES, BaseDiagramRef } from '../types';
import { VCHART_COLOR_PALETTES } from '../constants';

export interface VChartDiagramRef extends BaseDiagramRef {}

interface Props {
    data: VChartData;
    styles?: VChartChartStyles;
    theme: 'light' | 'dark';
}

export const VChartDiagram = forwardRef<VChartDiagramRef, Props>(({ data, styles, theme }, ref) => {
    const vchartRef = useRef<any>(null);

    const finalStyles = useMemo(() => ({
        ...DEFAULT_VCHART_STYLES,
        ...styles
    }), [styles]);

    useImperativeHandle(ref, () => ({
        getDataURL: async (options) => {
            if (!vchartRef.current) return '';
            const vchartInstance = vchartRef.current.getVChart();

            if (options?.width && options?.height) {
                vchartInstance.updateSize(options.width, options.height);
            }

            return vchartInstance.getDataURL({
                pixelRatio: options?.pixelRatio || 3,
                transparent: options?.backgroundColor === 'transparent'
            });
        },
        exportPNG: (transparent = false, scale = 3) => {
            if (!vchartRef.current) return;
            const vchartInstance = vchartRef.current.getVChart();
            const fileName = `${data.title || 'vchart分析图'}_${new Date().getTime()}`;
            vchartInstance.exportImg(fileName, {
                type: 'png',
                pixelRatio: scale,
                transparent: transparent
            });
        },
        exportPDF: (transparent = false) => {
            if (!vchartRef.current) return;
            const vchartInstance = vchartRef.current.getVChart();
            const dataURL = vchartInstance.getDataURL();

            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <html>
                        <head><title>Export PDF - IQS VChart</title></head>
                        <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f8fafc;">
                            <div style="padding: 40px; background: ${transparent ? 'transparent' : '#fff'}; border-radius: 20px; text-align: center;">
                                <img src="${dataURL}" style="max-width:100%; height:auto;" />
                                <div style="margin-top: 20px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                                    ${data.title} | Smart QC Studio
                                </div>
                            </div>
                            <script>
                                window.onload = () => {
                                    setTimeout(() => {
                                        window.print();
                                        window.close();
                                    }, 500);
                                }
                            </script>
                        </body>
                    </html>
                `);
                win.document.close();
            }
        }
    }));

    const spec = useMemo(() => {
        const baseSpec = data.spec || {};
        const palette = VCHART_COLOR_PALETTES.find(p => p.id === finalStyles.colorPalette);
        const currentTheme = theme || 'light';
        const isDark = currentTheme === 'dark';

        return {
            ...baseSpec,
            color: palette && palette.colors.length > 0 ? palette.colors : baseSpec.color,
            theme: currentTheme,
            title: {
                visible: !!data.title,
                text: data.title,
                textStyle: {
                    fontSize: finalStyles.titleFontSize,
                    fontWeight: 'bold',
                    fill: isDark ? '#fff' : '#000'
                },
                ...baseSpec.title
            },
            legends: (Array.isArray(baseSpec.legends) ? baseSpec.legends : baseSpec.legends ? [baseSpec.legends] : [{}]).map((l: any) => ({
                visible: true,
                padding: { top: 10 },
                label: {
                    style: {
                        fontSize: finalStyles.legendFontSize,
                        fill: isDark ? '#cbd5e1' : '#475569'
                    }
                },
                ...l
            })),
            axes: (baseSpec.axes || []).map((a: any) => ({
                label: {
                    style: {
                        fontSize: finalStyles.axisFontSize,
                        fill: isDark ? '#94a3b8' : '#64748b'
                    }
                },
                title: {
                    style: {
                        fontSize: finalStyles.axisFontSize,
                        fill: isDark ? '#cbd5e1' : '#475569'
                    },
                    ...a.title
                },
                ...a
            })),
            tooltip: {
                ...baseSpec.tooltip,
                style: {
                    panel: {
                        backgroundColor: isDark ? '#1e293b' : '#fff',
                        ...baseSpec.tooltip?.style?.panel
                    },
                    keyContent: {
                        fontSize: finalStyles.baseFontSize,
                        fill: isDark ? '#f1f5f9' : '#1e293b',
                        ...baseSpec.tooltip?.style?.keyContent
                    },
                    valueContent: {
                        fontSize: finalStyles.baseFontSize,
                        fill: isDark ? '#f1f5f9' : '#1e293b',
                        ...baseSpec.tooltip?.style?.valueContent
                    }
                }
            }
        };
    }, [data, finalStyles, theme]);

    return (
        <div className={`w-full h-full flex flex-col items-center justify-center p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`} id="vchart-container">
            <div className="w-full h-full relative">
                <VChart
                    ref={vchartRef}
                    spec={spec}
                    style={{ height: '100%', width: '100%' }}
                />
            </div>
        </div>
    );
});

VChartDiagram.displayName = 'VChartDiagram';

export default VChartDiagram;
