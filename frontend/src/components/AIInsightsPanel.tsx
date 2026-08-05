"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { InsightsResponse } from "@/types/api";
import { Sparkles, FileText, Search, BrainCircuit, Copy, Check, Loader2, Flame, Briefcase, UserCheck, AlertCircle, ArrowRight, ShieldAlert, FlaskConical } from "lucide-react";
import { PersonaSelector, AIPersona } from "@/components/PersonaSelector";
import { parseInsightBullets } from "@/lib/formatters";
import { RecommendationTriage } from "@/components/RecommendationTriage";
import { AssumptionChecker } from "@/components/AssumptionChecker";

interface AIInsightsPanelProps {
  insights: InsightsResponse;
  currentPersona?: AIPersona;
  onChangePersona?: (persona: AIPersona) => void;
  isLoadingPersona?: boolean;
}

export function AIInsightsPanel({
  insights,
  currentPersona = "professional",
  onChangePersona,
  isLoadingPersona = false,
}: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "quality" | "eda" | "triage" | "assumptions">("summary");
  const [copied, setCopied] = useState(false);

  const recommendations = insights.consultant_report?.recommendations ?? [];
  const hasRecommendations = recommendations.length > 0;
  const assumptionReport = insights.consultant_report?.assumption_report ?? null;

  const tabs = [
    { id: "summary", label: "Executive Summary", icon: Sparkles },
    { id: "quality", label: "Data Health Report", icon: FileText },
    { id: "eda", label: "EDA Statistical Findings", icon: Search },
    ...(hasRecommendations
      ? [{ id: "triage", label: "ML Recommendation Triage", icon: ShieldAlert }]
      : []),
    ...(assumptionReport
      ? [{ id: "assumptions", label: "Assumption Checker", icon: FlaskConical }]
      : []),
  ];

  const getRawText = () => {
    if (activeTab === "summary") return insights.final_insights;
    if (activeTab === "quality") return insights.quality_report;
    return insights.eda_findings;
  };

  const handleCopy = () => {
    const textToCopy = parseInsightBullets(getRawText()).join("\n• ");
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bullets = parseInsightBullets(getRawText());

  const getPersonaBadge = () => {
    if (currentPersona === "roast") {
      return { label: "Roast Mode 🔥", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
    }
    if (currentPersona === "executive") {
      return { label: "Executive 👔", color: "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30" };
    }
    return { label: "Professional 💼", color: "bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30" };
  };

  const personaBadge = getPersonaBadge();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="dark-surface-card rounded-2xl p-6 shadow-2xl my-6 border border-white/[0.08]"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-xl">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">LangGraph AI Insights Engine</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${personaBadge.color}`}>
                {personaBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-400">Point-by-point synthesized analysis with zero raw markdown syntax</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {onChangePersona && (
            <PersonaSelector
              currentPersona={currentPersona}
              onSelectPersona={onChangePersona}
              disabled={isLoadingPersona}
            />
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold border border-white/[0.08] transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? "Copied Report" : "Copy Report"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/[0.08] mb-6 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all rounded-t-xl ${
                isActive
                  ? "border-[#22C55E] text-[#22C55E] bg-[#22C55E]/10"
                  : "border-transparent text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#22C55E]" : ""}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Point-by-Point Structured Content Area */}
      <div className="bg-[#0B0F19]/90 rounded-2xl p-5 border border-white/[0.08] min-h-[160px] relative">
        <AnimatePresence mode="wait">
          {/* ML Recommendation Triage Tab */}
          {activeTab === "triage" ? (
            <motion.div
              key="triage"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <RecommendationTriage datasetId={insights.dataset_id} recommendations={recommendations} />
            </motion.div>
          ) : activeTab === "assumptions" && assumptionReport ? (
            <motion.div
              key="assumptions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <AssumptionChecker report={assumptionReport} />
            </motion.div>
          ) : isLoadingPersona ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 animate-pulse py-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Generating {currentPersona.toUpperCase()} AI insights...</span>
              </div>
              <div className="h-10 bg-white/[0.04] rounded-xl w-full" />
              <div className="h-10 bg-white/[0.04] rounded-xl w-full" />
              <div className="h-10 bg-white/[0.04] rounded-xl w-3/4" />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab + currentPersona}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {bullets.map((bullet, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition ${
                    currentPersona === "roast"
                      ? "bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40"
                      : currentPersona === "executive"
                      ? "bg-[#38BDF8]/10 border-[#38BDF8]/20 hover:border-[#38BDF8]/40"
                      : "bg-white/[0.04] border-white/[0.08] hover:border-[#22C55E]/40"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {currentPersona === "roast" ? (
                      <Flame className="w-4 h-4 text-rose-400" />
                    ) : currentPersona === "executive" ? (
                      <UserCheck className="w-4 h-4 text-[#38BDF8]" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-[#22C55E]" />
                    )}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {bullet}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
