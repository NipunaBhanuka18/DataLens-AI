import axios from "axios";
import { UploadResponse, AnalysisResponse, InsightsResponse, VisualizationConfig, SimulationResult } from "@/types/api";

const getBaseUrl = (): string => {
  let url = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
  url = url.trim().replace(/\/+$/, "");
  if (!url.endsWith("/api/v1")) {
    url = `${url}/api/v1`;
  }
  return url;
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 120000, // 2 minutes (accounts for Render free-tier cold starts)
});

export async function uploadDataset(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<UploadResponse>("/datasets/upload", formData);
  return response.data;
}

export async function analyzeDataset(datasetId: string): Promise<AnalysisResponse> {
  const response = await apiClient.post<AnalysisResponse>(`/datasets/${datasetId}/analyze`);
  return response.data;
}

export async function fetchInsights(datasetId: string, persona: string = "professional"): Promise<InsightsResponse> {
  const response = await apiClient.post<InsightsResponse>(`/datasets/${datasetId}/insights`, { persona });
  return response.data;
}

export async function generateChatChart(datasetId: string, query: string): Promise<VisualizationConfig> {
  const response = await apiClient.post<VisualizationConfig>(`/datasets/${datasetId}/chat-chart`, { query });
  return response.data;
}

export async function simulateDecision(datasetId: string, featureName: string, suggestedAction: string): Promise<SimulationResult> {
  const response = await apiClient.post<SimulationResult>(`/datasets/${datasetId}/simulate`, {
    feature_name: featureName,
    suggested_action: suggestedAction,
  });
  return response.data;
}
