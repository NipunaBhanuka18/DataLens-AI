"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Circle, UploadCloud, Cpu, Activity, BrainCircuit } from "lucide-react";
import { PipelineStep } from "@/hooks/useDatasetAnalysis";

interface AnalysisStepperProps {
  step: PipelineStep;
}

export function AnalysisStepper({ step }: AnalysisStepperProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let timer: any;
    if (step !== "idle" && step !== "complete" && step !== "error") {
      timer = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [step]);

  const stages = [
    { id: "uploading", label: "Uploading to Edge...", desc: "Transferring dataset to temporary stream buffer", icon: UploadCloud },
    { id: "parsing", label: "Polars Parsing & Schema Inference...", desc: "Zero-copy data type detection & row counting", icon: Cpu },
    { id: "calculating", label: "Calculating 3-Sigma Outliers & Quality...", desc: "Missing values, duplicate detection & health score", icon: Activity },
    { id: "generating_insights", label: "Routing to LangGraph AI Agents...", desc: "Quality, EDA, Viz & Insight nodes synthesizing reports", icon: BrainCircuit },
  ];

  const getStageStatus = (stageId: string) => {
    if (step === "complete") return "completed";
    if (step === "error") return "error";

    if (step === "uploading") return stageId === "uploading" ? "active" : "pending";
    if (step === "analyzing") {
      if (stageId === "uploading") return "completed";
      if (stageId === "parsing" || stageId === "calculating") return "active";
      return "pending";
    }
    if (step === "generating_insights") {
      if (stageId === "generating_insights") return "active";
      return "completed";
    }

    return "pending";
  };

  return (
    <div className="dark-surface-card rounded-2xl p-6 shadow-2xl max-w-2xl mx-auto my-8 border border-white/[0.08]">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">AI Data Pipeline</h3>
            <p className="text-xs text-slate-400">FastAPI • Polars Engine • LangGraph Agents</p>
          </div>
        </div>

        <div className="text-right">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Elapsed Time</span>
          <span className="text-sm font-mono font-bold text-[#22C55E]">{elapsedSeconds}s</span>
        </div>
      </div>

      <div className="space-y-3">
        {stages.map((stg) => {
          const status = getStageStatus(stg.id);
          const Icon = stg.icon;

          return (
            <div
              key={stg.id}
              className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 border ${
                status === "active"
                  ? "bg-[#22C55E]/10 border-[#22C55E]/30 shadow-md shadow-[#22C55E]/5"
                  : status === "completed"
                  ? "bg-white/[0.03] border-white/[0.04]"
                  : "bg-white/[0.02] border-transparent opacity-40"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {status === "completed" ? (
                  <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                ) : status === "active" ? (
                  <Loader2 className="w-5 h-5 text-[#22C55E] animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${status === "active" ? "text-[#22C55E]" : "text-slate-400"}`} />
                    <span className={`text-sm font-bold ${status === "active" ? "text-[#22C55E]" : "text-white"}`}>
                      {stg.label}
                    </span>
                  </div>
                  {status === "active" && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
                      Processing
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{stg.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
