"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export function ChartSkeleton() {
  return (
    <div className="dark-surface-card rounded-2xl p-6 shadow-2xl my-6 border border-white/[0.08]">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/[0.08]">
        <div className="p-2.5 bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] rounded-xl">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">AI Generating Plotly Charts...</h3>
          <p className="text-xs text-slate-400">Visualization Agent synthesizing structured chart schemas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((idx) => (
          <div key={idx} className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-5 space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-slate-700 rounded-full w-1/3" />
              <div className="h-4 bg-[#22C55E]/20 rounded-full w-16" />
            </div>
            <div className="h-3 bg-slate-800 rounded-full w-3/4" />
            <div className="h-64 bg-[#0B0F19]/80 rounded-xl flex items-end justify-between p-6 gap-3 border border-white/[0.04]">
              {[40, 70, 25, 90, 60, 80, 45].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="w-full bg-[#22C55E]/30 rounded-t-md"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
