"use client";

import React from "react";
import { motion } from "framer-motion";
import { SimulationResult, DecisionPath } from "@/types/api";
import { CheckCircle2, AlertOctagon, AlertTriangle, ArrowRight, Activity, Cpu } from "lucide-react";

interface DecisionSimulatorProps {
  simulation: SimulationResult;
}

function PathCard({ path, type }: { path: DecisionPath; type: "A" | "B" }) {
  const isRecommended = path.verdict_level === "pass";
  const isWarn = path.verdict_level === "warn";

  const styles = isRecommended
    ? "bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-400"
    : isWarn
    ? "bg-amber-400/[0.04] border-amber-400/20 text-amber-400"
    : "bg-rose-500/[0.04] border-rose-500/20 text-rose-400";

  const Icon = isRecommended ? CheckCircle2 : isWarn ? AlertTriangle : AlertOctagon;

  return (
    <div className={`p-4 rounded-xl border backdrop-blur-md ${styles} space-y-3 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
        <Icon className="w-24 h-24" />
      </div>

      <div className="flex items-start gap-2 relative z-10">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Path {type}: {path.verdict}</p>
          <h4 className="text-sm font-bold text-slate-100">{path.label}</h4>
        </div>
      </div>

      <div className="space-y-2 text-[11px] leading-relaxed relative z-10">
        <p className="text-slate-300">
          <strong className="text-slate-100 font-semibold opacity-90">Why: </strong>
          {path.rationale}
        </p>
        <p className="text-slate-300">
          <strong className="text-slate-100 font-semibold opacity-90">Math: </strong>
          <span className="font-mono text-[10px] bg-black/20 px-1 rounded">{path.math_detail}</span>
        </p>
        <p className="text-slate-300">
          <strong className="text-slate-100 font-semibold opacity-90">Impact: </strong>
          {path.downstream_effect}
        </p>
      </div>
    </div>
  );
}

export function DecisionSimulator({ simulation }: DecisionSimulatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden mt-3"
    >
      <div className="p-4 rounded-xl bg-black/20 border border-white/10 space-y-4">
        {/* Header & Metric Snapshot */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">
              Simulation: {simulation.feature_name}
            </h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Object.entries(simulation.metric_snapshot).map(([key, val]) => (
              <span key={key} className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.05] border border-white/[0.08] text-slate-300 flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-500" />
                {key}: <strong className="text-white">{String(val)}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Side by side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PathCard path={simulation.path_a} type="A" />
          <PathCard path={simulation.path_b} type="B" />
        </div>

        {/* Expected Effect Footer */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
          <ArrowRight className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            <strong className="text-indigo-300 font-bold tracking-widest uppercase mr-2">Net Effect:</strong>
            {simulation.expected_effect}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
