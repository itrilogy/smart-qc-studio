
import React from 'react';
import { TOOL_CONFIGS } from '../constants';
import { QCToolType } from '../types';
import { ArrowUpRight, Cpu, ShieldCheck, LayoutGrid } from 'lucide-react';

interface Props {
  onSelectTool: (type: QCToolType) => void;
}

export const DashboardView: React.FC<Props> = ({ onSelectTool }) => {
  const [cols, setCols] = React.useState(5);

  const gridColsClass = {
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6'
  }[cols as 3 | 4 | 5 | 6] || 'md:grid-cols-5';

  return (
    <div className="w-screen h-screen bg-[#fcfdfe] dot-grid overflow-y-auto custom-scrollbar">
      <div className="max-w-[1600px] mx-auto w-full p-16 space-y-16">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-12">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-[#0f172a] rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <Cpu size={40} className="relative z-10" />
            </div>
            <div>
              <h1 className="text-5xl font-[900] text-slate-900 tracking-tighter uppercase leading-none">Smart QC <span className="text-blue-600 font-[400] italic">Studio</span></h1>
              <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px] mt-3 pl-1">Industrial OS Logic Core v3.0</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="bg-white/40 backdrop-blur-xl px-8 py-4 rounded-[2rem] border border-white/50 shadow-xl flex items-center gap-6 transition-all border-b-2 border-b-blue-500/10">
              <LayoutGrid size={24} className="text-blue-500" />
              <div className="flex flex-col min-w-[140px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">网格跨度</span>
                  <span className="text-[11px] font-black text-blue-600 tracking-tighter">{cols} COLUMNS</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="6"
                  step="1"
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-3xl px-8 py-4 rounded-[2rem] border border-slate-200 shadow-xl flex items-center gap-6 text-slate-900 border-b-2 border-b-emerald-500/10">
              <ShieldCheck size={28} className="text-emerald-500" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">System Status</p>
                <p className="text-base font-black tracking-tight text-slate-800 uppercase">Synchronized</p>
              </div>
            </div>
          </div>
        </header>

        <section className={`grid grid-cols-1 ${gridColsClass} gap-8`}>
          {TOOL_CONFIGS.map((tool) => (
            <button
              key={tool.type}
              onClick={() => onSelectTool(tool.type)}
              className="group bg-white rounded-[2.5rem] p-10 border border-slate-200/60 shadow-industrial hover:shadow-[0_20px_50px_-10px_rgba(37,99,235,0.1)] hover:border-blue-400/30 transition-all duration-700 relative overflow-hidden flex flex-col h-[320px] text-left active:scale-[0.98]"
            >
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className={`w-14 h-14 rounded-2xl ${tool.bg} flex items-center justify-center mb-6 transition-all duration-700 group-hover:scale-110 group-hover:rotate-[6deg] ring-1 ring-white/50 shadow-lg`}>
                    {React.cloneElement(tool.icon as React.ReactElement<any>, { size: 26, className: tool.color })}
                  </div>
                  <h3 className="text-2xl font-[900] text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors uppercase leading-none">
                    {tool.name}
                  </h3>
                  <div className="mt-2 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{tool.enName}</div>
                  <p className="text-[12px] text-slate-500 mt-6 font-medium leading-relaxed opacity-70 line-clamp-3">{tool.desc ? (tool.desc.length > 50 ? tool.desc.substring(0, 47) + '...' : tool.desc) : ''}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[20px] font-black text-slate-50 opacity-40 group-hover:opacity-100 transition-opacity duration-700 select-none">
                    0{TOOL_CONFIGS.indexOf(tool) + 1}
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-500 shadow-sm">
                    <ArrowUpRight size={22} />
                  </div>
                </div>
              </div>

              <div
                className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full opacity-0 group-hover:opacity-[0.06] transition-all duration-1000 scale-150 blur-[70px] pointer-events-none"
                style={{ backgroundColor: tool.accent }}
              ></div>
            </button>
          ))}

        </section>

        <footer className="py-10 border-t border-slate-100/60 flex items-center justify-center">
          <p className="text-slate-200 text-[9px] font-bold uppercase tracking-[0.6em]">
            Studio core | Unlimited components expansion ready
          </p>
        </footer>
      </div>
    </div>
  );
};
