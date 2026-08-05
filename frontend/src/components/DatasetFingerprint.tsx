"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import {
  FileText,
  Grid3X3,
  ShieldCheck,
  BrainCircuit,
  Tag,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProblemType =
  | "Classification"
  | "Regression"
  | "Clustering"
  | "Unknown";

export interface DatasetFingerprintProps {
  filename: string;
  shape: string;               // e.g. "50,000 Rows × 24 Cols"
  problemType: ProblemType;
  healthScore: number;         // 0-100
  mlReadiness: number;         // 0-100
  riskLevel: string;           // e.g. "High Target Leakage" | "Low Risk"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(value: number): string {
  if (value >= 80) return "text-[#22C55E]";
  if (value >= 50) return "text-amber-400";
  return "text-rose-400";
}

function scoreBgGlow(value: number): string {
  if (value >= 80) return "shadow-[0_0_18px_rgba(34,197,94,0.2)]";
  if (value >= 50) return "shadow-[0_0_18px_rgba(251,191,36,0.2)]";
  return "shadow-[0_0_18px_rgba(251,113,133,0.2)]";
}

const PROBLEM_TYPE_CONFIG: Record<ProblemType, { color: string; bg: string }> = {
  Classification: { color: "text-[#A855F7]",  bg: "bg-[#A855F7]/10 border-[#A855F7]/25" },
  Regression:     { color: "text-[#06B6D4]",  bg: "bg-[#06B6D4]/10 border-[#06B6D4]/25" },
  Clustering:     { color: "text-amber-400",   bg: "bg-amber-400/10 border-amber-400/25"  },
  Unknown:        { color: "text-slate-400",   bg: "bg-white/[0.04] border-white/[0.1]"   },
};

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

// ─── Sub-component: Single metric cell ───────────────────────────────────────

interface MetricCellProps {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  /** if true, renders a right border divider on md+ screens */
  divider?: boolean;
}

function MetricCell({ label, icon: Icon, children, divider = true }: MetricCellProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={`flex flex-col justify-center gap-1.5 px-5 py-4 ${
        divider ? "md:border-r border-white/[0.07]" : ""
      }`}
    >
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <Icon className="w-3 h-3 opacity-70" />
        {label}
      </span>
      {children}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DatasetFingerprint({
  filename,
  shape,
  problemType,
  healthScore,
  mlReadiness,
  riskLevel,
}: DatasetFingerprintProps) {
  const isHighRisk = riskLevel.toLowerCase().includes("high");
  const ptConfig = PROBLEM_TYPE_CONFIG[problemType];

  // Circular arc helpers
  function describeArc(value: number, r = 16): string {
    const pct = Math.min(Math.max(value, 0), 100) / 100;
    const circ = 2 * Math.PI * r;
    return `${(pct * circ).toFixed(2)} ${circ.toFixed(2)}`;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full rounded-2xl border border-white/[0.09] bg-[#131B2E]/70 backdrop-blur-xl shadow-2xl overflow-hidden"
    >
      {/* Top accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#22C55E]/0 via-[#22C55E]/60 to-[#22C55E]/0" />

      <div className="grid grid-cols-2 md:grid-cols-6">

        {/* ── 1. Filename ── */}
        <MetricCell label="Dataset" icon={FileText} divider>
          <span
            className="text-base font-bold text-white truncate max-w-[140px]"
            title={filename}
          >
            {filename}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Active session</span>
        </MetricCell>

        {/* ── 2. Shape ── */}
        <MetricCell label="Shape" icon={Grid3X3} divider>
          <span className="text-xl font-semibold text-white leading-tight">
            {shape.split("×")[0].trim()}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            × {shape.split("×")[1]?.trim() ?? ""} columns
          </span>
        </MetricCell>

        {/* ── 3. ML Problem Type ── */}
        <MetricCell label="Problem Type" icon={Tag} divider>
          <span
            className={`inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg border text-xs font-bold tracking-wide ${ptConfig.bg} ${ptConfig.color}`}
          >
            <TrendingUp className="w-3 h-3" />
            {problemType}
          </span>
        </MetricCell>

        {/* ── 4. Health Score ── */}
        <MetricCell label="Health Score" icon={ShieldCheck} divider>
          <div className="flex items-center gap-3">
            {/* Mini radial ring */}
            <svg width="40" height="40" className="shrink-0 -rotate-90">
              <circle cx="20" cy="20" r="16" stroke="#1e293b" strokeWidth="4" fill="none" />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke={healthScore >= 80 ? "#22C55E" : healthScore >= 50 ? "#facc15" : "#f87171"}
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={describeArc(healthScore)}
                className="transition-all duration-700"
              />
            </svg>
            <div>
              <span className={`text-2xl font-bold leading-none ${scoreColor(healthScore)} ${scoreBgGlow(healthScore)}`}>
                {healthScore.toFixed(0)}
              </span>
              <span className="text-slate-500 text-sm font-medium">/100</span>
            </div>
          </div>
        </MetricCell>

        {/* ── 5. ML Readiness ── */}
        <MetricCell label="ML Readiness" icon={BrainCircuit} divider>
          <div className="flex items-center gap-3">
            <svg width="40" height="40" className="shrink-0 -rotate-90">
              <circle cx="20" cy="20" r="16" stroke="#1e293b" strokeWidth="4" fill="none" />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke={mlReadiness >= 80 ? "#22C55E" : mlReadiness >= 50 ? "#facc15" : "#f87171"}
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={describeArc(mlReadiness)}
                className="transition-all duration-700"
              />
            </svg>
            <div>
              <span className={`text-2xl font-bold leading-none ${scoreColor(mlReadiness)} ${scoreBgGlow(mlReadiness)}`}>
                {mlReadiness.toFixed(0)}
              </span>
              <span className="text-slate-500 text-sm font-medium">/100</span>
            </div>
          </div>
        </MetricCell>

        {/* ── 6. Risk Level ── */}
        <MetricCell label="Risk Level" icon={AlertTriangle} divider={false}>
          <div className="flex items-start gap-2">
            {isHighRisk && (
              <span className="mt-0.5 shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/15 border border-rose-500/30">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
              </span>
            )}
            <div>
              <span
                className={`text-sm font-bold leading-snug ${
                  isHighRisk ? "text-rose-400" : "text-[#22C55E]"
                }`}
              >
                {riskLevel}
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isHighRisk ? "Review before training" : "Safe to proceed"}
              </p>
            </div>
          </div>
        </MetricCell>
      </div>
    </motion.div>
  );
}
