
import React, { ReactNode, useState } from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';

interface WorkspaceProps {
    sidebarContent: ReactNode;
    canvasContent: ReactNode;
    toolbarContent?: ReactNode;
}

export function Workspace({ sidebarContent, canvasContent, toolbarContent }: WorkspaceProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex flex-1 h-full min-h-0 overflow-hidden relative bg-[#f8fafc] font-sans">
            <aside
                className="bg-[#0f172a] flex flex-col shrink-0 panel-transition z-40 relative shadow-[40px_0_100px_-20px_rgba(0,0,0,0.4)]"
                style={{
                    width: isSidebarOpen ? '420px' : '0px',
                    opacity: isSidebarOpen ? 1 : 0
                }}
            >
                <div className="w-[420px] h-full flex flex-col overflow-hidden">
                    {sidebarContent}
                </div>
            </aside>

            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="absolute top-1/2 -translate-y-1/2 z-[100] w-6 h-28 flex flex-col items-center justify-center bg-[#0f172a] border border-slate-700 rounded-full shadow-2xl hover:bg-blue-600 group transition-all"
                style={{
                    left: isSidebarOpen ? '408px' : '12px',
                }}
            >
                <GripVertical size={10} className="text-slate-600 group-hover:text-white mb-2" />
                <div className="text-slate-400 group-hover:text-white">
                    {isSidebarOpen ? <ChevronLeft size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
                </div>
            </button>

            <main className="flex-1 min-w-0 relative flex flex-col overflow-hidden bg-[#f8fafc] dot-grid">
                <div className="flex-1 relative z-0 flex items-center justify-center p-20 overflow-auto custom-scrollbar">
                    <div className="w-full h-full max-w-[1600px] flex flex-col relative rounded-[4rem] bg-white shadow-[0_80px_150px_-40px_rgba(0,0,0,0.12)] border border-slate-100/60 overflow-hidden panel-transition">
                        {canvasContent}
                    </div>
                </div>
            </main>
        </div>
    );
}
