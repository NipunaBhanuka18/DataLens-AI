"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  GitBranch, Sigma, Layers3,
} from "lucide-react";
import { AssumptionReport, ModelFamilyAssumptions, AssumptionCheck } from "@/types/api";

// ─── Config ───────────────────────────────────────────────────────────────────

type Verdict = "Ready" | "Needs Work" | "Not Recommended";

interface FamilyConfig {
  key: keyof AssumptionReport;
  icon: React.ElementType;
  description: string;
  algorithms: string[];
}

const FAMILY_CONFIG: FamilyConfig[] = [
  {
    key: "linear_models",
    icon: Sigma,
    description: "Linear & Logistic Regression",
    algorithms: ["LinearRegression", "LogisticRegression", "Ridge", "Lasso", "ElasticNet"],
  },
  {
    key: "tree_models",
    icon: GitBranch,
    description: "Random Forest, XGBoost, LightGBM",
    algorithms: ["RandomForest", "XGBoost", "LightGBM", "GradientBoosting", "ExtraTrees"],
  },
  {
    key: "distance_models",
    icon: Layers3,
    description: "KNN & Support Vector Machines",
    algorithms: ["KNeighborsClassifier", "SVC", "SVR", "NuSVC"],
  },
];

// ─── Verdict styling ──────────────────────────────────────────────────────────

function verdictStyle(verdict: Verdict) {
  if (verdict === "Ready")
    return {
      badge: "bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]",
      glow: "shadow-[0_0_16px_rgba(34,197,94,0.08)]",
      border: "border-[#22C55E]/20",
      header: "border-b border-[#22C55E]/10",
    };
  if (verdict === "Needs Work")
    return {
      badge: "bg-amber-400/15 border-amber-400/30 text-amber-400",
      glow: "shadow-[0_0_16px_rgba(251,191,36,0.08)]",
      border: "border-amber-400/15",
      header: "border-b border-amber-400/10",
    };
  return {
    badge: "bg-rose-500/15 border-rose-500/30 text-rose-400",
    glow: "shadow-[0_0_16px_rgba(244,63,94,0.08)]",
    border: "border-rose-500/15",
    header: "border-b border-rose-500/10",
  };
}

// ─── Variants ─────────────────────────────────────────────────────────────────

const cardVariants: Variants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.38, ease: "easeOut" } },
};

const gridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const checkVariants: Variants = {
  hidden:  { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.25, ease: "easeOut" } },
};

// ─── Single Check Row ─────────────────────────────────────────────────────────

function CheckRow({ check }: { check: AssumptionCheck }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div variants={checkVariants} className="space-y-1">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-start gap-2.5 text-left group"
      >
        {/* Icon */}
        <div className="mt-0.5 shrink-0">
          {check.passed ? (
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          )}
        </div>

        {/* Name */}
        <span className={`flex-1 text-xs font-semibold leading-snug ${
          check.passed ? "text-slate-200" : "text-amber-100"
        }`}>
          {check.name}
        </span>

        {/* Expand chevron */}
        {expanded
          ? <ChevronUp className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
          : <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="text-[11px] text-slate-400 leading-relaxed pl-6 border-l border-white/[0.06] ml-2"
          >
            {check.detail}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Family Card ──────────────────────────────────────────────────────────────

function FamilyCard({
  config,
  data,
}: {
  config: FamilyConfig;
  data: ModelFamilyAssumptions;
}) {
  const Icon = config.icon;
  const styles = verdictStyle(data.verdict as Verdict);
  const passed  = data.checks.filter((c) => c.passed).length;
  const total   = data.checks.length;

  return (
    <motion.div
      variants={cardVariants}
      className={`
        rounded-2xl border backdrop-blur-xl bg-[#131B2E]/70 overflow-hidden
        ${styles.border} ${styles.glow}
      `}
    >
      {/* Card header */}
      <div className={`px-4 py-3.5 ${styles.header} bg-white/[0.02] flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
            <Icon className="w-3.5 h-3.5 text-slate-300" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{data.family}</p>
            <p className="text-[10px] text-slate-500">{config.description}</p>
          </div>
        </div>

        {/* Verdict badge */}
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${styles.badge}`}>
          {data.verdict}
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 bg-black/20">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500 font-medium">Assumptions</span>
          <span className="text-[10px] font-bold text-slate-300">{passed}/{total} passed</span>
        </div>
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(passed / total) * 100}%` }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            className={`h-full rounded-full ${
              passed === total ? "bg-[#22C55E]" :
              passed > total / 2 ? "bg-amber-400" : "bg-rose-500"
            }`}
          />
        </div>
      </div>

      {/* Check list */}
      <motion.div
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        initial="hidden"
        animate="visible"
        className="px-4 py-3 space-y-2.5"
      >
        {data.checks.map((check, idx) => (
          <CheckRow key={idx} check={check} />
        ))}
      </motion.div>

      {/* Algorithms footer */}
      <div className="px-4 pb-4 pt-1 border-t border-white/[0.04] flex flex-wrap gap-1.5 mt-1">
        {config.algorithms.map((algo) => (
          <span
            key={algo}
            className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.05] border border-white/[0.07] text-slate-400"
          >
            {algo}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface AssumptionCheckerProps {
  report: AssumptionReport;
}

export function AssumptionChecker({ report }: AssumptionCheckerProps) {
  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          <Layers3 className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span className="text-xs font-bold text-slate-300 tracking-tight">
            Model Family Assumption Checker
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-white/[0.08] to-transparent" />
      </div>

      <p className="text-[11px] text-slate-500 text-center">
        Deterministic pass/fail evaluation of your dataset against the mathematical prerequisites of each ML family.
        Click any check to expand the evidence.
      </p>

      {/* Three-column card grid */}
      <motion.div
        variants={gridVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {FAMILY_CONFIG.map((config) => (
          <FamilyCard
            key={config.key}
            config={config}
            data={report[config.key]}
          />
        ))}
      </motion.div>
    </div>
  );
}
