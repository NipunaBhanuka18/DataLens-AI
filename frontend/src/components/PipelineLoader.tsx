"use client";

import React from "react";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import { PipelineStep } from "@/hooks/useDatasetAnalysis";

interface PipelineLoaderProps {
  step: PipelineStep;
}

export function PipelineLoader({ step }: PipelineLoaderProps) {
  const steps = [
    { id: "uploading", label: "Uploading dataset", desc: "Transferring dataset to temporary storage stream" },
    { id: "analyzing", label: "Analyzing Data Engine", desc: "Polars calculating distributions, missing values & health score" },
    { id: "generating_insights", label: "AI generating insights", desc: "LangGraph agents producing reports & Plotly visualization schemas" },
  ];

  const getStepStatus = (stepId: string) => {
    const order = ["idle", "uploading", "analyzing", "generating_insights", "complete"];
    const currentIndex = order.indexOf(step);
    const stepIndex = order.indexOf(stepId);

    if (currentIndex > stepIndex) return "completed";
    if (currentIndex === stepIndex) return "active";
    return "pending";
  };

  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
      <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        Processing Dataset Intelligence Pipeline
      </h3>
      <div className="space-y-4">
        {steps.map((s, idx) => {
          const status = getStepStatus(s.id);
          return (
            <div key={s.id} className="flex items-start gap-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
              <div className="mt-0.5">
                {status === "completed" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {status === "active" && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
                {status === "pending" && <Circle className="w-5 h-5 text-slate-600" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${status === "active" ? "text-indigo-300" : status === "completed" ? "text-slate-200" : "text-slate-500"}`}>
                    Step {idx + 1}: {s.label}
                  </span>
                  {status === "active" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
