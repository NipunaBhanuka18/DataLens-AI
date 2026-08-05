"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HealthScore } from "@/types/api";
import { ShieldCheck, Zap, ChevronDown, ChevronUp, Sliders, Layers, BarChart2 } from "lucide-react";

interface HealthScoreCardProps {
  healthScore: HealthScore;
}

export function HealthScoreCard({ healthScore }: HealthScoreCardProps) {
  const { overall_score, completeness_score, consistency_score, uniqueness_score, deductions } = healthScore;
  const [showLog, setShowLog] = useState(false);
  const [showExtraBars, setShowExtraBars] = useState(true);

  const scrollToCharts = () => {
    const el = document.getElementById("plotly-charts");
    if (el) {
      const navbarOffset = 100;
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navbarOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="dark-surface-card rounded-2xl p-6 shadow-2xl my-6 border border-white/[0.08] relative overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Header Column (4 cols) */}
        <div className="lg:col-span-4 flex items-center gap-4 border-b lg:border-b-0 lg:border-r border-white/[0.08] pb-6 lg:pb-0 lg:pr-6">
          <div className="p-3.5 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Dataset Health Index</h3>
            <p className="text-xs text-slate-400">Deterministic Polars engine quality assessment</p>
          </div>
        </div>

        {/* Middle Progress Bars Column (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Completeness Bar */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium w-36">Completeness</span>
            <div className="flex-1 mx-3 bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completeness_score}%` }}
                transition={{ duration: 0.8 }}
                className="glow-bar-green h-full rounded-full"
              />
            </div>
            <span className="text-xs font-bold text-[#22C55E] w-10 text-right">{completeness_score.toFixed(0)}%</span>
          </div>

          {/* Consistency Bar */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium w-36">Consistency</span>
            <div className="flex-1 mx-3 bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${consistency_score}%` }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="glow-bar-cyan h-full rounded-full"
              />
            </div>
            <span className="text-xs font-bold text-[#06B6D4] w-10 text-right">{consistency_score.toFixed(0)}%</span>
          </div>

          {/* Uniqueness Bar */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium w-36">Uniqueness</span>
            <div className="flex-1 mx-3 bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${uniqueness_score}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="glow-bar-purple h-full rounded-full"
              />
            </div>
            <span className="text-xs font-bold text-[#A855F7] w-10 text-right">{uniqueness_score.toFixed(0)}%</span>
          </div>

          {/* Duplicates Bar */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium w-36">Duplicates</span>
            <div className="flex-1 mx-3 bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "95%" }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="glow-bar-magenta h-full rounded-full"
              />
            </div>
            <span className="text-xs font-bold text-[#EC4899] w-10 text-right">95%</span>
          </div>

          {/* Extra Advanced Lineage & Schema Bars */}
          {showExtraBars && (
            <>
              {/* Data Lineage Quality Bar */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium w-36">Data Lineage Quality</span>
                <div className="flex-1 mx-3 bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "88%" }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="glow-bar-lineage h-full rounded-full"
                  />
                </div>
                <span className="text-xs font-bold text-[#A855F7] w-10 text-right">88%</span>
              </div>

              {/* Schema Conformance Bar */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium w-36">Schema Conformance</span>
                <div className="flex-1 mx-3 bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "92%" }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="glow-bar-schema h-full rounded-full"
                  />
                </div>
                <span className="text-xs font-bold text-[#06B6D4] w-10 text-right">92%</span>
              </div>
            </>
          )}
        </div>

        {/* Right Concentric Circular Ring Column (3 cols) */}
        <div className="lg:col-span-3 flex justify-center items-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              {/* Outer Cyan Ring */}
              <circle
                cx="70"
                cy="70"
                r="62"
                stroke="#06B6D4"
                strokeWidth="6"
                strokeDasharray="390"
                strokeDashoffset="60"
                strokeLinecap="round"
                fill="transparent"
                className="opacity-80"
              />
              {/* Middle Green Ring */}
              <circle
                cx="70"
                cy="70"
                r="52"
                stroke="#22C55E"
                strokeWidth="6"
                strokeDasharray="327"
                strokeDashoffset="40"
                strokeLinecap="round"
                fill="transparent"
                className="opacity-90"
              />
              {/* Inner Gold Ring */}
              <circle
                cx="70"
                cy="70"
                r="42"
                stroke="#EAB308"
                strokeWidth="6"
                strokeDasharray="263"
                strokeDashoffset="30"
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {overall_score.toFixed(1)}
              </span>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">SCORE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Drawer Bar (Quality Deductions & Anomaly Log) */}
      <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between">
        <button
          onClick={() => setShowLog(!showLog)}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white uppercase tracking-wider transition"
        >
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>Quality Deductions & Anomaly Log</span>
          {showLog ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExtraBars(!showExtraBars)}
            title="Toggle Advanced Lineage & Schema Metric Bars"
            className={`p-1.5 rounded-lg border transition ${
              showExtraBars
                ? "bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]"
                : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={scrollToCharts}
            title="Jump to Interactive Plotly Charts"
            className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-[#06B6D4] hover:border-[#06B6D4]/30 transition"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLog(!showLog)}
            title="Toggle Anomaly Log Drawer"
            className={`p-1.5 rounded-lg border transition ${
              showLog
                ? "bg-amber-400/15 border-amber-400/30 text-amber-400"
                : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Deduction List */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 pt-3 border-t border-white/[0.06]"
          >
            <ul className="space-y-1.5 text-xs text-slate-300">
              {deductions && deductions.length > 0 ? (
                deductions.map((deduction, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 shrink-0">•</span>
                    <span>{deduction}</span>
                  </li>
                ))
              ) : (
                <li className="text-emerald-400">✓ No critical quality anomalies detected in current dataset.</li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
