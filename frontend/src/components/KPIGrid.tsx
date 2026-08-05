"use client";

import React from "react";
import { motion } from "framer-motion";
import { AnalysisState } from "@/types/api";
import { Database, CheckCircle2, Copy, ShieldCheck } from "lucide-react";

interface KPIGridProps {
  state: AnalysisState;
}

export function KPIGrid({ state }: KPIGridProps) {
  const health = state.health_score;
  const quality = state.quality_metrics;

  const totalCells = state.row_count * state.column_count;
  const nullCount = quality ? Object.values(quality.null_counts_per_column).reduce((a, b) => a + b, 0) : 0;
  const completenessPct = totalCells > 0 ? (((totalCells - nullCount) / totalCells) * 100).toFixed(1) : "100.0";

  const dupCount = quality?.total_duplicate_rows || 0;
  const dupPct = quality?.duplicate_percentage || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      {/* Card 1: Total Records (Slate Blue) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="kpi-card-slate p-5 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-white/[0.08] text-slate-300">
            <Database className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/[0.08] text-slate-300 border border-white/[0.1]">
            POLARS ZERO-COPY
          </span>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 mb-1">Total Records</p>
          <h3 className="text-3xl font-extrabold text-[#38BDF8] tracking-tight">{state.row_count.toLocaleString()}</h3>
          <p className="text-[11px] text-slate-400 mt-1">{state.column_count} columns parsed</p>
        </div>
      </motion.div>

      {/* Card 2: Data Completeness (Solid Emerald Green) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="kpi-card-green p-5 flex flex-col justify-between text-white"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-white/10 text-white">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-200 border border-white/20">
            {parseFloat(completenessPct) > 95 ? "EXCELLENT" : "NEEDS REVIEW"}
          </span>
        </div>
        <div>
          <p className="text-xs font-medium text-emerald-100 mb-1">Data Completeness</p>
          <h3 className="text-3xl font-extrabold text-[#4ADE80] tracking-tight">{completenessPct}%</h3>
          <p className="text-[11px] text-emerald-100/80 mt-1">{nullCount.toLocaleString()} missing cells</p>
        </div>
      </motion.div>

      {/* Card 3: Duplicate Rows (Solid Crimson Red) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.16 }}
        className="kpi-card-red p-5 flex flex-col justify-between text-white"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-white/10 text-white">
            <Copy className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-red-200 border border-white/20">
            {dupPct}% DUPLICATES
          </span>
        </div>
        <div>
          <p className="text-xs font-medium text-red-100 mb-1">Duplicate Rows</p>
          <h3 className="text-3xl font-extrabold text-[#FCA5A5] tracking-tight">{dupCount.toLocaleString()}</h3>
          <p className="text-[11px] text-red-100/80 mt-1">{dupPct}% row duplication</p>
        </div>
      </motion.div>

      {/* Card 4: Overall Health Score (Solid Amber Gold) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.24 }}
        className="kpi-card-gold p-5 flex flex-col justify-between text-white"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-white/10 text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-amber-200 border border-white/20">
            {health && health.overall_score >= 80 ? "HIGH QUALITY" : "MEDIUM RISK"}
          </span>
        </div>
        <div>
          <p className="text-xs font-medium text-amber-100 mb-1">Overall Health Score</p>
          <h3 className="text-3xl font-extrabold text-[#FDE047] tracking-tight">
            {health ? health.overall_score.toFixed(1) : "--"}
          </h3>
          <p className="text-[11px] text-amber-100/80 mt-1">Deterministic quality score</p>
        </div>
      </motion.div>
    </div>
  );
}
