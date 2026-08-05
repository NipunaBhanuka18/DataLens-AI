"use client";

import React from "react";
import { motion } from "framer-motion";
import { AnalysisState, InsightsResponse } from "@/types/api";
import { Zap, RefreshCw, Calendar, HardDrive } from "lucide-react";
import { ExportReportButton } from "@/components/ExportReportButton";

interface DashboardHeroProps {
  state: AnalysisState;
  insights?: InsightsResponse | null;
  onReset: () => void;
}

export function DashboardHero({ state, insights = null, onReset }: DashboardHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="dark-surface-card rounded-2xl p-6 shadow-2xl my-6 border border-white/[0.08]"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-[#22C55E]" /> Polars Engine Active
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {state.dataset_id}</span>
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {state.filename}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Analyzed Today
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              Zero-Copy Polars Data Frame
            </span>
          </div>
        </div>

        {/* Right Stats & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/[0.06] border border-white/[0.08] px-4 py-2 rounded-xl text-center min-w-[100px]">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Rows</span>
            <span className="text-lg font-bold text-white">{state.row_count.toLocaleString()}</span>
          </div>

          <div className="bg-white/[0.06] border border-white/[0.08] px-4 py-2 rounded-xl text-center min-w-[90px]">
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Columns</span>
            <span className="text-lg font-bold text-white">{state.column_count}</span>
          </div>

          <ExportReportButton analysisState={state} insights={insights} />

          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold shadow-lg shadow-[#0891B2]/20 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Analyze New Dataset
          </button>
        </div>
      </div>
    </motion.div>
  );
}
