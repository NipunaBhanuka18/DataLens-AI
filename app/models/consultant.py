from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class MLProblemType(str, Enum):
    CLASSIFICATION = "Classification"
    REGRESSION     = "Regression"
    CLUSTERING     = "Clustering"
    UNKNOWN        = "Unknown"


class PriorityLevel(str, Enum):
    CRITICAL   = "CRITICAL"
    WARNING    = "WARNING"
    SUGGESTION = "SUGGESTION"


class ConfidenceLevel(str, Enum):
    HIGH   = "High"
    MEDIUM = "Medium"
    LOW    = "Low"


class ConsultantRecommendationItem(BaseModel):
    """Evidence-based, strictly typed ML recommendation item."""

    priority_level: PriorityLevel = Field(
        default=PriorityLevel.SUGGESTION,
        description=(
            "Severity triage: CRITICAL (leakage, imbalance, severe nulls) | "
            "WARNING (VIF, skewness, scaling) | SUGGESTION (encoding, low-variance)"
        )
    )
    confidence: ConfidenceLevel = Field(
        default=ConfidenceLevel.HIGH,
        description="How confident the agent is in this finding based on available metrics."
    )
    problem: str = Field(
        ...,
        description="Short, specific problem statement referencing column names and issue type."
    )
    evidence: str = Field(
        ...,
        description="Hard metric evidence: e.g. 'VIF of 12.4', '18.3% null rate', 'MI score 0.92 with target'."
    )
    impact: str = Field(
        ...,
        description="What goes wrong in the model if this issue is ignored."
    )
    recommendation: str = Field(
        ...,
        description="The exact corrective action to take, referencing specific transformers or techniques."
    )


class AssumptionCheck(BaseModel):
    """Single pass/fail check for one model-family assumption."""
    name: str = Field(..., description="Name of the assumption being checked.")
    passed: bool = Field(..., description="True if the dataset satisfies this assumption.")
    detail: str = Field(..., description="Evidence-backed explanation of pass or fail.")


class ModelFamilyAssumptions(BaseModel):
    """Assumption check results for one model family."""
    family: str = Field(..., description="Model family name: 'Linear Models', 'Tree-Based Models', 'Distance-Based Models'.")
    verdict: str = Field(..., description="Overall verdict: 'Ready', 'Needs Work', 'Not Recommended'.")
    checks: List[AssumptionCheck] = Field(default_factory=list)


class AssumptionReport(BaseModel):
    """Full Assumption Checker report covering all three model families."""
    linear_models: ModelFamilyAssumptions = Field(..., description="Assumptions for Linear/Logistic Regression.")
    tree_models:   ModelFamilyAssumptions = Field(..., description="Assumptions for Random Forest/XGBoost.")
    distance_models: ModelFamilyAssumptions = Field(..., description="Assumptions for KNN/SVM.")


class ConsultantReport(BaseModel):
    ml_problem_type: MLProblemType = Field(..., description="Detected ML problem type.")
    recommended_target_column: Optional[str] = Field(None, description="Primary target column.")
    model_readiness_score: float = Field(..., ge=0.0, le=100.0, description="Deterministic readiness score (0-100).")
    model_readiness_level: str = Field(..., description="EXCELLENT | GOOD | NEEDS_WORK | HIGH_RISK")
    score_deductions: List[str] = Field(default_factory=list)
    recommended_baseline_models: List[str] = Field(default_factory=list)
    recommended_preprocessing: List[str] = Field(default_factory=list)
    recommendations: List[ConsultantRecommendationItem] = Field(default_factory=list)
    assumption_report: Optional[AssumptionReport] = Field(None, description="Model family assumption check results.")
