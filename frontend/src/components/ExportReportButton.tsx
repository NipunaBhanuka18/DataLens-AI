"use client";

import React, { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { exportExecutivePDFReport } from "@/lib/pdfExporter";
import { AnalysisState, InsightsResponse } from "@/types/api";

interface ExportReportButtonProps {
  analysisState: AnalysisState;
  insights: InsightsResponse | null;
}

export function ExportReportButton({ analysisState, insights }: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      await exportExecutivePDFReport(analysisState, insights);
    } catch (err) {
      console.error("PDF Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] text-white text-xs font-bold transition shadow-md disabled:opacity-50"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 text-[#22C55E] animate-spin" />
          <span>Compiling Executive PDF...</span>
        </>
      ) : (
        <>
          <FileText className="w-4 h-4 text-[#22C55E]" />
          <span>Export PDF Report</span>
        </>
      )}
    </button>
  );
}
