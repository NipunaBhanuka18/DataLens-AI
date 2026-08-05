"use client";

import React, { useState } from "react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, Lightbulb, ChevronRight, BadgeCheck, Loader2, Play } from "lucide-react";
import { ConsultantRecommendationItem, PriorityLevel, ConfidenceLevel, SimulationResult } from "@/types/api";
import { useMutation } from "@tanstack/react-query";
import { simulateDecision } from "@/lib/api";
import { DecisionSimulator } from "./DecisionSimulator";

// ─── Triage Config ────────────────────────────────────────────────────────────

interface TriageTierConfig {
  level: PriorityLevel;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  headerBg: string;
  headerText: string;
  headerBadgeBg: string;
  accentColor: string;
  dot: string;
}

const TIERS: TriageTierConfig[] = [
  {
    level: "CRITICAL",
    label: "Fix Now",
    sublabel: "Critical — address before any modeling",
    icon: AlertCircle,
    cardBg: "bg-rose-500/[0.06]",
    cardBorder: "border-rose-500/20",
    cardHover: "hover:border-rose-500/40",
    headerBg: "bg-rose-500/10",
    headerText: "text-rose-400",
    headerBadgeBg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
    accentColor: "text-rose-400",
    dot: "bg-rose-400",
  },
  {
    level: "WARNING",
    label: "Improve Before Modeling",
    sublabel: "Warnings — high impact on model quality",
    icon: AlertTriangle,
    cardBg: "bg-amber-400/[0.06]",
    cardBorder: "border-amber-400/20",
    cardHover: "hover:border-amber-400/40",
    headerBg: "bg-amber-400/10",
    headerText: "text-amber-400",
    headerBadgeBg: "bg-amber-400/15 border-amber-400/30 text-amber-400",
    accentColor: "text-amber-400",
    dot: "bg-amber-400",
  },
  {
    level: "SUGGESTION",
    label: "Optional Optimizations",
    sublabel: "Suggestions — recommended but non-blocking",
    icon: Lightbulb,
    cardBg: "bg-emerald-500/[0.06]",
    cardBorder: "border-emerald-500/20",
    cardHover: "hover:border-emerald-500/40",
    headerBg: "bg-emerald-500/10",
    headerText: "text-emerald-400",
    headerBadgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    accentColor: "text-emerald-400",
    dot: "bg-emerald-400",
  },
];

// ─── Confidence Badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const styles: Record<ConfidenceLevel, string> = {
    High:   "bg-[#22C55E]/10 border-[#22C55E]/25 text-[#22C55E]",
    Medium: "bg-amber-400/10 border-amber-400/25 text-amber-400",
    Low:    "bg-slate-500/10 border-slate-500/25 text-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[level]}`}>
      <BadgeCheck className="w-2.5 h-2.5" />
      {level} Confidence
    </span>
  );
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const tierVariants: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.4, ease: "easeOut" } },
};

const itemVariants: Variants = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.3, ease: "easeOut" } },
};

// ─── Recommendation Card ──────────────────────────────────────────────────────

function RecommendationCard({
  rec, tier, datasetId
}: {
  rec: ConsultantRecommendationItem;
  tier: TriageTierConfig;
  datasetId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract feature name (usually in single quotes)
  const featureMatch = 
    rec.problem.match(/'([^']+)'/) || 
    rec.evidence.match(/'([^']+)'/) || 
    rec.recommendation.match(/'([^']+)'/);
  const featureName = featureMatch ? featureMatch[1] : null;

  // Infer action
  let suggestedAction = "unknown";
  const text = (rec.recommendation + " " + rec.problem).toLowerCase();
  if (text.includes("scale") || text.includes("standard") || text.includes("robust")) suggestedAction = "scaler_choice";
  else if (text.includes("imput") || text.includes("missing") || text.includes("nan")) suggestedAction = "imputation_strategy";
  else if (text.includes("outlier") || text.includes("winsoriz") || text.includes("clip")) suggestedAction = "outlier_handling";

  const { mutate: runSim, data: simulationResult, isPending } = useMutation({
    mutationFn: () => simulateDecision(datasetId, featureName!, suggestedAction),
    onSuccess: () => setIsOpen(true),
  });

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
    } else if (simulationResult) {
      setIsOpen(true);
    } else if (featureName) {
      runSim();
    }
  };

  return (
    <motion.div
      variants={itemVariants}
      className={`
        group rounded-xl border backdrop-blur-md p-4 transition-all duration-200 space-y-3
        ${tier.cardBg} ${tier.cardBorder} ${tier.cardHover}
      `}
    >
      {/* Header row: problem area badge + confidence */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${tier.accentColor}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${tier.dot}`} />
          {rec.problem}
        </span>
        <ConfidenceBadge level={rec.confidence} />
      </div>

      {/* Evidence chip */}
      <div className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${tier.cardBorder} bg-black/20 text-slate-300`}>
        <span className="text-slate-500 mr-1">EVIDENCE:</span>
        {rec.evidence}
      </div>

      {/* Recommendation — primary action */}
      <div className="flex items-start gap-2">
        <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${tier.accentColor}`} />
        <p className="text-sm font-semibold text-white leading-snug">{rec.recommendation}</p>
      </div>

      {/* Impact */}
      <div className="pt-1 border-t border-white/[0.05] flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            If Ignored:&nbsp;
          </span>
          <span className="text-[11px] text-slate-400">{rec.impact}</span>
        </div>

        {/* Simulate Button */}
        {featureName && suggestedAction !== "unknown" && (
          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`
              shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
              border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 ml-4
              ${isPending ? "opacity-70 cursor-not-allowed" : ""}
            `}
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isOpen ? (
              "Close"
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" /> Simulate Impact
              </>
            )}
          </button>
        )}
      </div>

      {/* Expandable Simulator */}
      <AnimatePresence>
        {isOpen && simulationResult && (
          <DecisionSimulator simulation={simulationResult} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface RecommendationTriageProps {
  datasetId: string;
  recommendations: ConsultantRecommendationItem[];
}

export function RecommendationTriage({ datasetId, recommendations }: RecommendationTriageProps) {
  const grouped = TIERS.map((tier) => ({
    tier,
    items: recommendations.filter((r) => r.priority_level === tier.level),
  })).filter((g) => g.items.length > 0);

  if (grouped.length === 0) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {grouped.map(({ tier, items }) => {
        const Icon = tier.icon;
        return (
          <motion.div
            key={tier.level}
            variants={tierVariants}
            className="rounded-2xl border border-white/[0.08] overflow-hidden backdrop-blur-xl bg-[#131B2E]/60 shadow-xl"
          >
            {/* Tier header */}
            <div className={`${tier.headerBg} border-b border-white/[0.07] px-5 py-3.5 flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${tier.headerText}`} />
                <div>
                  <span className={`text-sm font-bold ${tier.headerText}`}>{tier.label}</span>
                  <span className="ml-2 text-[10px] text-slate-400 font-medium">{tier.sublabel}</span>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tier.headerBadgeBg}`}>
                {items.length} {items.length === 1 ? "issue" : "issues"}
              </span>
            </div>

            {/* Cards */}
            <div className="p-4 space-y-3">
              {items.map((rec, idx) => (
                <RecommendationCard key={idx} rec={rec} tier={tier} datasetId={datasetId} />
              ))}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
