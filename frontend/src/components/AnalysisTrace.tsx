"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Cpu } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisTraceProps {
  logs: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Tokens that get highlighted with a brighter color + bold weight
const HIGHLIGHT_TERMS = [
  "Polars", "LangGraph", "LLM", "VIF", "MI", "Shapiro",
  "CRITICAL", "WARNING", "SUGGESTION", "Boxplot", "Histogram",
  "Scatter", "Bar chart", "StandardScaler", "RobustScaler",
  "QuantileTransformer", "RandomForest", "LightGBM", "LogisticRegression",
  "Ridge", "leakage", "skewness", "outliers", "zero-copy",
];

const HIGHLIGHT_RE = new RegExp(
  `(${HIGHLIGHT_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "gi"
);

function HighlightedText({ text }: { text: string }) {
  // Strip the leading ✓ / ⚠ — we render those as icons
  const clean = text.replace(/^[✓⚠]\s+/, "");

  const parts = clean.split(HIGHLIGHT_RE);
  return (
    <span>
      {parts.map((part, i) =>
        HIGHLIGHT_RE.test(part) ? (
          <strong key={i} className="text-slate-100 font-semibold">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function isWarning(log: string) {
  return log.startsWith("⚠");
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const listVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnalysisTrace({ logs }: AnalysisTraceProps) {
  const [open, setOpen] = useState(false);

  if (!logs || logs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#131B2E]/60 backdrop-blur-xl overflow-hidden shadow-xl">
      {/* Header / Toggle */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition group"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20">
            <Cpu className="w-3.5 h-3.5 text-[#22C55E]" />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-white tracking-tight">
              AI Chain-of-Thought Trace
            </span>
            <p className="text-[10px] text-slate-500 font-medium">
              {logs.length} reasoning steps — LangGraph execution log
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]">
            {logs.length} steps
          </span>
          {open
            ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white transition" />
            : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition" />
          }
        </div>
      </button>

      {/* Vertical Timeline */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="relative px-5 py-4 space-y-0"
            >
              {/* Vertical spine line */}
              <div className="absolute left-[28px] top-4 bottom-4 w-px bg-gradient-to-b from-[#22C55E]/30 via-white/[0.06] to-transparent pointer-events-none" />

              {logs.map((log, idx) => {
                const warn = isWarning(log);
                return (
                  <motion.li
                    key={idx}
                    variants={itemVariants}
                    className="relative flex items-start gap-3 pb-4 last:pb-0"
                  >
                    {/* Node circle */}
                    <div className={`
                      relative z-10 mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center border
                      ${warn
                        ? "bg-amber-400/10 border-amber-400/30"
                        : "bg-[#22C55E]/10 border-[#22C55E]/30"
                      }
                    `}>
                      {warn
                        ? <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                        : <CheckCircle2 className="w-2.5 h-2.5 text-[#22C55E]" />
                      }
                    </div>

                    {/* Log content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      {/* Step label */}
                      <span className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 block ${
                        warn ? "text-amber-400/70" : "text-[#22C55E]/70"
                      }`}>
                        Step {idx + 1}
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <HighlightedText text={log} />
                      </p>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
