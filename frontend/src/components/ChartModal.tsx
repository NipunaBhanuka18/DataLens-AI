"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { VisualizationConfig, AnalysisState } from "@/types/api";
import { Sparkles, X, PlusCircle, Check, BarChart3 } from "lucide-react";

// SSR-safe Plotly import
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const DARK_NEON_PALETTE = [
  "#22C55E", // Emerald Green
  "#06B6D4", // Bright Cyan
  "#A855F7", // Purple
  "#EC4899", // Magenta
  "#F59E0B", // Amber
  "#38BDF8", // Light Blue
  "#F43F5E", // Coral Rose
];

interface ChartModalProps {
  chart: VisualizationConfig | null;
  onClose: () => void;
  onPinChart?: (chart: VisualizationConfig) => void;
  analysisState?: AnalysisState | null;
}

export function ChartModal({
  chart,
  onClose,
  onPinChart,
  analysisState,
}: ChartModalProps) {
  const [pinned, setPinned] = useState(false);

  if (!chart) return null;

  const preview = analysisState?.preview_data || [];
  const stats = analysisState?.column_statistics || {};

  const buildPlotData = () => {
    const { chart_type, x_column, y_column } = chart;

    let xData: any[] = [];
    let yData: any[] = [];

    if (preview.length > 0) {
      xData = preview.map((row) => row[x_column]).filter((v) => v !== undefined);
      if (y_column) {
        yData = preview.map((row) => row[y_column]).filter((v) => v !== undefined);
      }
    } else {
      const colStat = stats[x_column];
      if (colStat?.categorical?.top_categories) {
        xData = Object.keys(colStat.categorical.top_categories);
        yData = Object.values(colStat.categorical.top_categories);
      } else if (colStat?.numeric) {
        xData = ["min", "mean", "max"];
        yData = [colStat.numeric.min, colStat.numeric.mean, colStat.numeric.max];
      }
    }

    const typeMap: Record<string, string> = {
      bar: "bar",
      line: "scatter",
      scatter: "scatter",
      histogram: "histogram",
      box: "box",
      pie: "pie",
    };

    const plotlyType = typeMap[chart_type] || "bar";
    const mode = chart_type === "line" ? "lines+markers" : chart_type === "scatter" ? "markers" : undefined;

    if (chart_type === "pie") {
      return [
        {
          labels: xData,
          values: yData.length > 0 ? yData : Array(xData.length).fill(1),
          type: "pie" as const,
          marker: { colors: DARK_NEON_PALETTE },
        },
      ];
    }

    return [
      {
        x: xData,
        y: yData.length > 0 ? yData : undefined,
        type: plotlyType as any,
        mode: mode,
        marker: { color: "#22C55E" },
      },
    ];
  };

  const handlePin = () => {
    if (onPinChart && !pinned) {
      onPinChart(chart);
      setPinned(true);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-3xl bg-[#131B2E]/95 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-white/[0.12] overflow-hidden relative flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] rounded-2xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">{chart.title}</h3>
                  <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                    {chart.chart_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{chart.description}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/[0.08] text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Plotly Canvas Container */}
          <div className="my-5 w-full h-[360px] rounded-2xl overflow-hidden bg-[#0B0F19]/90 border border-white/[0.06] p-3 flex items-center justify-center">
            <Plot
              data={buildPlotData()}
              layout={{
                autosize: true,
                margin: { l: 50, r: 25, t: 20, b: 45 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                font: { color: "#F8FAFC", size: 12, family: "Inter, sans-serif" },
                xaxis: { gridcolor: "rgba(255,255,255,0.06)", title: chart.x_column },
                yaxis: { gridcolor: "rgba(255,255,255,0.06)", title: chart.y_column || "" },
              }}
              useResizeHandler={true}
              style={{ width: "100%", height: "100%" }}
              config={{ responsive: true, displayModeBar: true }}
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <BarChart3 className="w-4 h-4 text-[#22C55E]" />
              <span>AI Custom Visualization</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePin}
                disabled={pinned}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md ${
                  pinned
                    ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 cursor-default"
                    : "bg-[#22C55E] hover:bg-[#16a34a] text-black"
                }`}
              >
                {pinned ? <Check className="w-4 h-4 text-[#22C55E]" /> : <PlusCircle className="w-4 h-4" />}
                <span>{pinned ? "Pinned to Dashboard" : "Pin to Dashboard"}</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.08] transition"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
