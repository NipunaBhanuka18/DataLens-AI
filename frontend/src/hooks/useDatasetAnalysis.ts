"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { uploadDataset, analyzeDataset, fetchInsights, generateChatChart } from "@/lib/api";
import { AnalysisState, InsightsResponse, UploadResponse, VisualizationConfig } from "@/types/api";
import { AIPersona } from "@/components/PersonaSelector";

export type PipelineStep =
  | "idle"
  | "uploading"
  | "analyzing"
  | "generating_insights"
  | "complete"
  | "error";

export function useDatasetAnalysis() {
  const [step, setStep] = useState<PipelineStep>("idle");
  const [error, setError] = useState<string | null>(null);
  
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [currentPersona, setCurrentPersona] = useState<AIPersona>("professional");
  const [isLoadingPersona, setIsLoadingPersona] = useState(false);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      setError(null);
      setCurrentPersona("professional");
      
      // Step 1: Upload
      setStep("uploading");
      const uploadRes = await uploadDataset(file);
      setUploadData(uploadRes);
      const datasetId = uploadRes.dataset_id;

      // Step 2: Analyze Data Engine
      setStep("analyzing");
      const analyzeRes = await analyzeDataset(datasetId);
      setAnalysisState(analyzeRes.state);

      // Step 3: AI Insights (LangGraph)
      setStep("generating_insights");
      const insightsRes = await fetchInsights(datasetId, "professional");
      setInsights(insightsRes);

      setStep("complete");
      return { uploadRes, analyzeRes, insightsRes };
    },
    onError: (err: any) => {
      setStep("error");
      let message =
        err?.response?.data?.detail || err?.message || "An unexpected error occurred during processing.";

      if (message === "Network Error" || err?.code === "ERR_NETWORK") {
        const isClientInBrowser = typeof window !== "undefined";
        const isRemoteHost = isClientInBrowser && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

        if (isRemoteHost && (!apiUrl || apiUrl.includes("127.0.0.1") || apiUrl.includes("localhost"))) {
          message = "Network Error: Missing NEXT_PUBLIC_API_URL in deployed environment. Please set NEXT_PUBLIC_API_URL in Vercel project environment variables to your deployed FastAPI backend URL (e.g. https://your-backend.up.railway.app/api/v1).";
        } else {
          message = "Network Error: Could not connect to backend server. Please verify backend service is running and CORS (ALLOWED_ORIGINS) is properly configured.";
        }
      }

      setError(message);
    },
  });

  const switchPersona = async (newPersona: AIPersona) => {
    if (!analysisState?.dataset_id || isLoadingPersona) return;
    setCurrentPersona(newPersona);
    setIsLoadingPersona(true);
    try {
      const updatedInsights = await fetchInsights(analysisState.dataset_id, newPersona);
      setInsights((prev) => ({
        ...updatedInsights,
        visualizations: prev?.visualizations || updatedInsights.visualizations,
      }));
    } catch (err) {
      console.error("Failed to switch persona:", err);
    } finally {
      setIsLoadingPersona(false);
    }
  };

  const addCustomChart = (chart: VisualizationConfig) => {
    setInsights((prev) => {
      if (!prev) {
        return {
          success: true,
          message: "Custom chart created",
          dataset_id: analysisState?.dataset_id || "",
          quality_report: "",
          eda_findings: "",
          visualizations: [chart],
          final_insights: "",
          trace_logs: [],
        };
      }
      return {
        ...prev,
        visualizations: [chart, ...prev.visualizations],
      };
    });
  };

  const reset = () => {
    setStep("idle");
    setError(null);
    setUploadData(null);
    setAnalysisState(null);
    setInsights(null);
    setCurrentPersona("professional");
  };

  return {
    step,
    error,
    uploadData,
    analysisState,
    insights,
    currentPersona,
    isLoadingPersona,
    switchPersona,
    startPipeline: (file: File) => mutation.mutate(file),
    addCustomChart,
    isLoading: mutation.isPending,
    reset,
  };
}
