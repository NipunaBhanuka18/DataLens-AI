"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDatasetAnalysis } from "@/hooks/useDatasetAnalysis";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { SettingsModal } from "@/components/SettingsModal";
import { DashboardHero } from "@/components/DashboardHero";
import { KPIGrid } from "@/components/KPIGrid";
import { DatasetFingerprint, ProblemType } from "@/components/DatasetFingerprint";
import { AnalysisTrace } from "@/components/AnalysisTrace";
import { FileUpload } from "@/components/FileUpload";
import { AnalysisStepper } from "@/components/AnalysisStepper";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { HealthScoreCard } from "@/components/HealthScoreCard";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { DynamicChartRenderer } from "@/components/DynamicChartRenderer";
import { ChartSkeleton } from "@/components/ChartSkeleton";
import { ChartModal } from "@/components/ChartModal";
import { VisualizationConfig } from "@/types/api";
import { Sparkles, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const {
    step,
    error,
    analysisState,
    insights,
    currentPersona,
    isLoadingPersona,
    switchPersona,
    startPipeline,
    addCustomChart,
    reset,
  } = useDatasetAnalysis();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeChatChart, setActiveChatChart] = useState<VisualizationConfig | null>(null);

  const isProcessing = step === "uploading" || step === "analyzing" || step === "generating_insights";

  // IntersectionObserver Scroll-Spy to auto-highlight Sidebar items as user scrolls
  useEffect(() => {
    if (step !== "complete") return;

    const sections = [
      { id: "dashboard-hero", tab: "dashboard" },
      { id: "health-score-index", tab: "reports" },
      { id: "data-preview", tab: "preview" },
      { id: "ai-insights", tab: "analysis" },
      { id: "plotly-charts", tab: "charts" },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const matched = sections.find((s) => s.id === entry.target.id);
            if (matched) {
              setActiveTab(matched.tab);
            }
          }
        });
      },
      { rootMargin: "-100px 0px -50% 0px" }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [step]);

  return (
    <div className="min-h-screen text-white flex flex-col bg-[#0B0F19] selection:bg-[#22C55E]/30">
      {/* Navbar */}
      <Navbar
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        activeFilename={analysisState?.filename}
      />

      {/* Command Palette (⌘K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onReset={reset}
        filename={analysisState?.filename}
        datasetId={analysisState?.dataset_id}
        onAddChart={addCustomChart}
        onSuccessChart={(chart) => setActiveChatChart(chart)}
      />

      {/* Platform Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Instant AI Chart Modal Pop-up */}
      <ChartModal
        chart={activeChatChart}
        onClose={() => setActiveChatChart(null)}
        onPinChart={addCustomChart}
        analysisState={analysisState}
      />

      {/* Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:pl-24 transition-all">
        {/* Error Alert Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto mb-6 p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300 text-sm shadow-2xl"
            >
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">Analysis Pipeline Error</h4>
                <p className="text-xs text-slate-300">{error}</p>
                <button
                  onClick={reset}
                  className="mt-3 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-md"
                >
                  Try Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload State */}
        {(step === "idle" || step === "error") && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="py-12"
          >
            <div className="text-center max-w-xl mx-auto mb-8 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full dark-glass-pill text-xs font-bold text-[#22C55E] border border-[#22C55E]/30 shadow-xs mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Sleek Dark Modern AI Copilot
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Instant Dataset Intelligence & AI Insights
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Upload your CSV or Excel dataset. Polars will perform zero-copy statistical profiling,
                quality metrics, and LangGraph AI will generate executive reports with interactive Plotly charts.
              </p>
            </div>

            <FileUpload onUpload={startPipeline} disabled={isProcessing} />
          </motion.div>
        )}

        {/* Processing Stepper */}
        {isProcessing && <AnalysisStepper step={step} />}

        {/* Completed Dashboard View */}
        {step === "complete" && analysisState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, staggerChildren: 0.08 }}
            className="space-y-6"
          >
            {/* ─── Dataset Fingerprint Hero ─── */}
            <div id="dashboard-hero" className="space-y-4 scroll-mt-28">
              {(() => {
                const cr = insights?.consultant_report;
                const hs = analysisState.health_score;

                const shape = `${analysisState.row_count.toLocaleString()} Rows × ${analysisState.column_count} Cols`;

                const problemType: ProblemType =
                  (cr?.ml_problem_type as ProblemType) ?? "Unknown";

                const healthScore = hs?.overall_score ?? 0;

                const mlReadiness = cr?.model_readiness_score ?? 0;

                const riskLevel = (() => {
                  if (!cr) return "Pending Analysis";
                  const level = cr.model_readiness_level;
                  if (level === "HIGH_RISK") return "High Risk — Review Before Training";
                  if (level === "NEEDS_WORK") return "Moderate Risk — Action Needed";
                  if (level === "GOOD") return "Low Risk — Good to Go";
                  return "Low Risk — Excellent Shape";
                })();

                return (
                  <DatasetFingerprint
                    filename={analysisState.filename}
                    shape={shape}
                    problemType={problemType}
                    healthScore={healthScore}
                    mlReadiness={mlReadiness}
                    riskLevel={riskLevel}
                  />
                );
              })()}

              {/* AI Chain-of-Thought Trace Timeline */}
              {insights?.trace_logs && insights.trace_logs.length > 0 && (
                <AnalysisTrace logs={insights.trace_logs} />
              )}

              <DashboardHero state={analysisState} insights={insights} onReset={reset} />
              <KPIGrid state={analysisState} />
            </div>

            {/* Dataset Health Index */}
            {analysisState.health_score && (
              <div id="health-score-index" className="scroll-mt-28">
                <HealthScoreCard healthScore={analysisState.health_score} />
              </div>
            )}

            {/* Interactive Data Preview Table */}
            {analysisState.preview_data && analysisState.columns && (
              <div id="data-preview" className="scroll-mt-28">
                <DataPreviewTable columns={analysisState.columns} data={analysisState.preview_data} />
              </div>
            )}

            {/* AI Insights Panel & DS Consultant */}
            {insights ? (
              <div id="ai-insights" className="scroll-mt-28">
                <AIInsightsPanel
                  insights={insights}
                  currentPersona={currentPersona}
                  onChangePersona={switchPersona}
                  isLoadingPersona={isLoadingPersona}
                />
              </div>
            ) : null}

            {/* Dynamic Interactive Plotly Charts */}
            <div id="plotly-charts" className="scroll-mt-28">
              {insights?.visualizations && insights.visualizations.length > 0 ? (
                <DynamicChartRenderer
                  visualizations={insights.visualizations}
                  analysisState={analysisState}
                />
              ) : (
                <ChartSkeleton />
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-6 text-center text-xs text-slate-500 mt-12">
        <p>DataLens AI • Autonomous AI Data Science Copilot • Sleek Dark Modern Edition</p>
      </footer>
    </div>
  );
}
