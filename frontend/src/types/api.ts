export interface ColumnMetadata {
  name: string;
  data_type: string;
}

export interface DatasetIntelligence {
  row_count: number;
  column_count: number;
  columns: ColumnMetadata[];
}

export interface DataQualityMetrics {
  total_duplicate_rows: number;
  duplicate_percentage: number;
  null_counts_per_column: Record<string, number>;
  constant_columns: string[];
  high_cardinality_columns: string[];
}

export interface NumericColumnStats {
  mean: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
  skewness: number | null;
  null_count: number;
  outlier_count: number;
  outlier_percentage: number;
}

export interface CategoricalColumnStats {
  unique_count: number;
  top_categories: Record<string, number>;
  null_count: number;
}

export interface ColumnStatistics {
  data_type: string;
  numeric: NumericColumnStats | null;
  categorical: CategoricalColumnStats | null;
}

export interface HealthScore {
  overall_score: number;
  completeness_score: number;
  consistency_score: number;
  uniqueness_score: number;
  deductions: string[];
}

export interface AnalysisState {
  dataset_id: string;
  filename: string;
  row_count: number;
  column_count: number;
  columns: ColumnMetadata[];
  preview_data: Record<string, any>[];
  quality_metrics: DataQualityMetrics | null;
  column_statistics: Record<string, ColumnStatistics> | null;
  health_score: HealthScore | null;
  current_step: string;
  error_message: string | null;
}

export type ChartType = "bar" | "line" | "scatter" | "histogram" | "box" | "pie";

export interface VisualizationConfig {
  title: string;
  chart_type: ChartType;
  x_column: string;
  y_column?: string | null;
  color_column?: string | null;
  description: string;
  justification?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  dataset_id: string;
  metadata: DatasetIntelligence;
}

export interface AnalysisResponse {
  success: boolean;
  message: string;
  state: AnalysisState;
}

export type MLProblemType = "Classification" | "Regression" | "Clustering" | "Unknown";
export type PriorityLevel  = "CRITICAL" | "WARNING" | "SUGGESTION";
export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface ConsultantRecommendationItem {
  priority_level: PriorityLevel;
  confidence: ConfidenceLevel;
  problem: string;
  evidence: string;
  impact: string;
  recommendation: string;
}

export interface AssumptionCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface ModelFamilyAssumptions {
  family: string;
  verdict: "Ready" | "Needs Work" | "Not Recommended";
  checks: AssumptionCheck[];
}

export interface AssumptionReport {
  linear_models:   ModelFamilyAssumptions;
  tree_models:     ModelFamilyAssumptions;
  distance_models: ModelFamilyAssumptions;
}

export interface ConsultantReport {
  ml_problem_type: MLProblemType;
  recommended_target_column?: string | null;
  model_readiness_score: number;
  model_readiness_level: string;
  score_deductions: string[];
  recommended_baseline_models: string[];
  recommended_preprocessing: string[];
  recommendations: ConsultantRecommendationItem[];
  assumption_report?: AssumptionReport | null;
}

export interface InsightsResponse {
  success: boolean;
  message: string;
  dataset_id: string;
  quality_report: string;
  eda_findings: string;
  visualizations: VisualizationConfig[];
  final_insights: string;
  consultant_report?: ConsultantReport | null;
  trace_logs: string[];
}

// ─── Decision Simulator ───────────────────────────────────────────────────────

export type VerdictLevel = "pass" | "fail" | "warn";

export interface DecisionPath {
  label: string;
  verdict: string;
  verdict_level: VerdictLevel;
  rationale: string;
  math_detail: string;
  downstream_effect: string;
}

export interface SimulationResult {
  feature_name: string;
  suggested_action: string;
  metric_snapshot: Record<string, string | number | boolean>;
  path_a: DecisionPath;
  path_b: DecisionPath;
  expected_effect: string;
  confidence: "High" | "Medium";
}
