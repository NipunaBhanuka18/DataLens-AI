from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ColumnMetadata(BaseModel):
    name: str = Field(..., description="Column header name")
    data_type: str = Field(..., description="Detected Polars data type representation")


class DatasetIntelligence(BaseModel):
    row_count: int = Field(..., ge=0, description="Total number of rows in the dataset")
    column_count: int = Field(..., ge=0, description="Total number of columns in the dataset")
    columns: List[ColumnMetadata] = Field(..., description="List of column names and their data types")


class DataQualityMetrics(BaseModel):
    total_duplicate_rows: int = Field(..., ge=0, description="Total duplicate rows in dataset")
    duplicate_percentage: float = Field(..., ge=0.0, le=100.0, description="Percentage of duplicate rows")
    null_counts_per_column: Dict[str, int] = Field(..., description="Map of column name to null count")
    constant_columns: List[str] = Field(default_factory=list, description="Columns containing only a single unique value")
    high_cardinality_columns: List[str] = Field(default_factory=list, description="Categorical columns with distinct ratio > 80%")


class NumericColumnStats(BaseModel):
    mean: Optional[float] = Field(None, description="Mean average value")
    std: Optional[float] = Field(None, description="Standard deviation")
    min: Optional[float] = Field(None, description="Minimum value")
    max: Optional[float] = Field(None, description="Maximum value")
    skewness: Optional[float] = Field(None, description="Distribution skewness")
    null_count: int = Field(..., ge=0, description="Number of null/missing values")
    outlier_count: int = Field(0, ge=0, description="Number of values beyond 3 standard deviations")
    outlier_percentage: float = Field(0.0, ge=0.0, le=100.0, description="Percentage of outlier values")
    is_normal_distribution: Optional[bool] = Field(None, description="Shapiro-Wilk test result: True if Gaussian (p > 0.05)")
    shapiro_p_value: Optional[float] = Field(None, description="Shapiro-Wilk test p-value")
    vif_score: Optional[float] = Field(None, description="Variance Inflation Factor for multicollinearity (> 10 indicates high correlation)")


class CategoricalColumnStats(BaseModel):
    unique_count: int = Field(..., ge=0, description="Count of distinct values")
    top_categories: Dict[str, int] = Field(default_factory=dict, description="Top category value counts")
    null_count: int = Field(..., ge=0, description="Number of null/missing values")


class ColumnStatistics(BaseModel):
    data_type: str = Field(..., description="Polars data type string")
    numeric: Optional[NumericColumnStats] = Field(None, description="Numerical distribution metrics if numeric")
    categorical: Optional[CategoricalColumnStats] = Field(None, description="Categorical frequency metrics if non-numeric")
    mutual_info_score: Optional[float] = Field(None, description="Mutual Information score relative to target_column")


class HealthScore(BaseModel):
    overall_score: float = Field(..., ge=0.0, le=100.0, description="Overall dataset health score (0-100)")
    completeness_score: float = Field(..., ge=0.0, le=100.0, description="Completeness sub-score based on non-null ratio")
    consistency_score: float = Field(..., ge=0.0, le=100.0, description="Consistency sub-score based on anomalies/constants")
    uniqueness_score: float = Field(..., ge=0.0, le=100.0, description="Uniqueness sub-score based on non-duplicate ratio")
    deductions: List[str] = Field(default_factory=list, description="Itemized score deduction details")


class UploadResponse(BaseModel):
    success: bool = Field(True, description="Indicates if upload succeeded")
    message: str = Field(..., description="Status summary message")
    dataset_id: str = Field(..., description="Unique identifier for the saved dataset")
    metadata: DatasetIntelligence = Field(..., description="Extracted dataset intelligence summary")


class AnalysisState(BaseModel):
    """
    Comprehensive state schema passed through data intelligence workflows and LangGraph nodes.
    """
    dataset_id: str = Field(..., description="Unique dataset identifier")
    filename: str = Field(..., description="Original uploaded dataset filename")
    row_count: int = Field(..., ge=0, description="Total row count")
    column_count: int = Field(..., ge=0, description="Total column count")
    columns: List[ColumnMetadata] = Field(default_factory=list, description="Schema metadata")
    preview_data: List[Dict[str, Any]] = Field(default_factory=list, description="First sample rows")
    quality_metrics: Optional[DataQualityMetrics] = Field(None, description="Data quality analysis metrics")
    column_statistics: Optional[Dict[str, ColumnStatistics]] = Field(None, description="Per-column statistics & outlier analysis")
    health_score: Optional[HealthScore] = Field(None, description="Calculated dataset health score")
    target_column: Optional[str] = Field(None, description="Target feature column selected for ML correlation & leakage checks")
    target_imbalance_ratio: Optional[Dict[str, float]] = Field(None, description="Target category frequency ratio if target is categorical")
    current_step: str = Field("dataset_loaded", description="Current workflow execution step")
    error_message: Optional[str] = Field(None, description="Error explanation if any step failed")


class AnalysisResponse(BaseModel):
    success: bool = Field(True, description="Indicates if analysis succeeded")
    message: str = Field(..., description="Status operational message")
    state: AnalysisState = Field(..., description="Updated analysis state containing metrics and scores")


class InsightsResponse(BaseModel):
    success: bool = Field(True, description="Indicates if AI insights workflow succeeded")
    message: str = Field(..., description="Operational status message")
    dataset_id: str = Field(..., description="Dataset session identifier")
    quality_report: str = Field(..., description="Executive summary of data health and issues")
    eda_findings: str = Field(..., description="Statistical patterns and distribution insights")
    visualizations: List[Dict[str, Any]] = Field(..., description="Top Plotly chart configurations")
    final_insights: str = Field(..., description="Synthesized executive summary for decision-makers")
    consultant_report: Optional[Dict[str, Any]] = Field(None, description="AI Data Science Consultant machine learning recommendations")
    trace_logs: List[str] = Field(default_factory=list, description="Ordered chain-of-thought execution log from each LangGraph node")


