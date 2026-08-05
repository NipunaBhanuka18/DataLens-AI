"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, RefreshCw, FileText, Database, X, Command, Loader2 } from "lucide-react";
import { generateChatChart } from "@/lib/api";
import { VisualizationConfig } from "@/types/api";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onReset?: () => void;
  filename?: string;
  datasetId?: string;
  onAddChart?: (chart: VisualizationConfig) => void;
  onSuccessChart?: (chart: VisualizationConfig) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onReset,
  filename,
  datasetId,
  onAddChart,
  onSuccessChart,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery("");
          setChatError(null);
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !datasetId || isSubmitting) return;

    setIsSubmitting(true);
    setChatError(null);

    try {
      const newChart = await generateChatChart(datasetId, query);
      if (newChart) {
        if (onSuccessChart) {
          onSuccessChart(newChart);
        } else if (onAddChart) {
          onAddChart(newChart);
        }
      }
      setIsSubmitting(false);
      setQuery("");
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      const rawDetail = err?.response?.data?.detail;
      const detailStr =
        typeof rawDetail === "string"
          ? rawDetail
          : Array.isArray(rawDetail)
          ? rawDetail.map((d: any) => d.msg || JSON.stringify(d)).join(", ")
          : err?.message || "Failed to generate chart.";
      setChatError(detailStr);
    }
  };


  const actions = [
    {
      id: "reset",
      title: "Analyze New Dataset",
      subtitle: "Clear current session and upload a new dataset",
      icon: RefreshCw,
      handler: () => {
        onReset?.();
        onClose();
      },
    },
    {
      id: "dataset",
      title: filename ? `Dataset: ${filename}` : "Current Active Dataset",
      subtitle: "View active Polars engine dataset session details",
      icon: Database,
      handler: () => onClose(),
    },
    {
      id: "export",
      title: "Export Dataset Intelligence Report",
      subtitle: "Download synthesized AI reports and Plotly schemas",
      icon: FileText,
      handler: () => onClose(),
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl bg-[#131B2E] rounded-2xl p-4 shadow-2xl border border-white/[0.1] overflow-hidden"
        >
          {/* Natural Language Prompt & Search Input Bar */}
          <form onSubmit={handleChatSubmit} className="flex items-center gap-3 px-3 py-2 border-b border-white/[0.08]">
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 text-[#22C55E] animate-spin shrink-0" />
            ) : datasetId ? (
              <Sparkles className="w-4 h-4 text-[#22C55E] shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
            )}

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                datasetId
                  ? "Ask AI to generate custom chart (e.g. 'Compare age and purchase amount')..."
                  : "Type a command or search..."
              }
              className="w-full text-sm bg-transparent text-white placeholder-slate-500 focus:outline-none"
              disabled={isSubmitting}
              autoFocus
            />

            {query && !isSubmitting && datasetId && (
              <button
                type="submit"
                className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-[#22C55E] hover:bg-[#16a34a] text-black transition shrink-0"
              >
                Generate Chart
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </form>

          {/* Submitting Loading State Banner */}
          {isSubmitting && (
            <div className="px-4 py-3 bg-[#22C55E]/10 border-b border-white/[0.08] flex items-center gap-2 text-xs font-semibold text-[#22C55E]">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Generating custom Plotly chart config...</span>
            </div>
          )}

          {/* Error Message */}
          {chatError && (
            <div className="px-4 py-2 bg-rose-500/10 text-rose-300 text-xs border-b border-white/[0.08]">
              {chatError}
            </div>
          )}

          {/* Quick Actions List */}
          <div className="py-2 space-y-1 max-h-72 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={action.handler}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#22C55E]/15 hover:text-[#22C55E] transition text-left group"
                  >
                    <div className="p-2 rounded-lg bg-white/[0.04] text-slate-400 group-hover:bg-[#22C55E]/20 group-hover:text-[#22C55E]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-[#22C55E]">
                        {action.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{action.subtitle}</p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="p-6 text-center text-xs text-slate-500">
                Press Enter to generate a custom chart for "{query}"
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500 px-3">
            <span className="flex items-center gap-1">
              <Command className="w-3 h-3 text-[#22C55E]" /> Chat-to-Chart AI Command Bar
            </span>
            <span>Press Enter to Submit • ESC to exit</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
