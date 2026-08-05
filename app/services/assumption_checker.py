"""
Assumption Checker Service
--------------------------
Deterministically evaluates a dataset's column statistics against the core
mathematical assumptions of three ML model families:

  • Linear Models   (Linear/Logistic Regression)
  • Tree-Based      (Random Forest, XGBoost, LightGBM)
  • Distance-Based  (KNN, SVM)

Returns an AssumptionReport with per-family pass/fail checks and an overall verdict.
"""
from typing import Dict, Any, List

from app.models.consultant import (
    AssumptionCheck,
    ModelFamilyAssumptions,
    AssumptionReport,
)


# ── Thresholds ────────────────────────────────────────────────────────────────

VIF_LINEAR_THRESHOLD    = 5.0    # Strict: LR is sensitive to multicollinearity
VIF_DISTANCE_THRESHOLD  = 5.0    # KNN/SVM equally sensitive
NULL_TREE_THRESHOLD     = 0.05   # 5% — XGBoost handles some natively, RF does not
NULL_CRITICAL_THRESHOLD = 0.20   # 20% — too high for any model family
SKEW_THRESHOLD          = 1.0    # |skew| > 1 = problematic for linear models
HIGH_CARDINALITY_LIMIT  = 50     # unique vals before encoding is mandatory
DIM_RATIO_THRESHOLD     = 10     # rows-per-feature; below this = curse of dimensionality


def _null_rate(col_stats: Dict[str, Any], total_rows: int) -> float:
    """Returns null fraction for a column stats dict."""
    num = col_stats.get("numeric") or {}
    cat = col_stats.get("categorical") or {}
    if isinstance(num, dict):
        null_cnt = num.get("null_count", 0)
    elif hasattr(num, "null_count"):
        null_cnt = getattr(num, "null_count", 0)
    else:
        null_cnt = 0
    if isinstance(cat, dict):
        null_cnt = max(null_cnt, cat.get("null_count", 0))
    elif hasattr(cat, "null_count"):
        null_cnt = max(null_cnt, getattr(cat, "null_count", 0))
    return null_cnt / total_rows if total_rows > 0 else 0.0


def _get_num(d: Any, key: str):
    if isinstance(d, dict):
        return d.get(key)
    return getattr(d, key, None)


# ── Linear Models ─────────────────────────────────────────────────────────────

def _check_linear(
    stats: Dict[str, Any],
    rows: int,
    cols: int,
) -> ModelFamilyAssumptions:
    checks: List[AssumptionCheck] = []

    # 1. Multicollinearity (VIF)
    high_vif = [
        (col, _get_num(s.get("numeric") or {}, "vif_score"))
        for col, s in stats.items()
        if s.get("numeric") and _get_num(s.get("numeric") or {}, "vif_score") and
           _get_num(s.get("numeric") or {}, "vif_score") > VIF_LINEAR_THRESHOLD
    ]
    if high_vif:
        detail = "; ".join(f"'{c}' VIF={v:.1f}" for c, v in high_vif[:4])
        checks.append(AssumptionCheck(
            name="No Multicollinearity (VIF ≤ 5)",
            passed=False,
            detail=f"FAILED — {len(high_vif)} feature(s) exceed VIF 5.0: {detail}. "
                   f"Linear models assume predictor independence; high VIF inflates standard errors."
        ))
    else:
        checks.append(AssumptionCheck(
            name="No Multicollinearity (VIF ≤ 5)",
            passed=True,
            detail="PASSED — All numeric features have VIF ≤ 5.0; predictor independence confirmed."
        ))

    # 2. Normality / Skewness
    skewed = [
        (col, _get_num(s.get("numeric") or {}, "skewness"))
        for col, s in stats.items()
        if s.get("numeric") and _get_num(s.get("numeric") or {}, "skewness") is not None and
           abs(_get_num(s.get("numeric") or {}, "skewness")) > SKEW_THRESHOLD
    ]
    if skewed:
        detail = "; ".join(f"'{c}' skew={v:.2f}" for c, v in skewed[:4])
        checks.append(AssumptionCheck(
            name="Near-Normal Feature Distributions (|skew| ≤ 1)",
            passed=False,
            detail=f"FAILED — {len(skewed)} feature(s) exceed skewness threshold: {detail}. "
                   f"Log/Box-Cox transformation or RobustScaler recommended before fitting."
        ))
    else:
        checks.append(AssumptionCheck(
            name="Near-Normal Feature Distributions (|skew| ≤ 1)",
            passed=True,
            detail="PASSED — All numeric distributions within acceptable skewness range."
        ))

    # 3. Feature Scaling Required
    checks.append(AssumptionCheck(
        name="Feature Scaling Applied (StandardScaler / RobustScaler)",
        passed=False,   # Always a prerequisite for Linear models
        detail="REQUIRED — Linear/Logistic Regression is not scale-invariant. "
               "Apply StandardScaler to Gaussian features and RobustScaler to skewed or outlier-heavy ones."
    ))

    # 4. No severe missingness
    missing = {
        col: _null_rate(s, rows)
        for col, s in stats.items()
        if _null_rate(s, rows) > NULL_CRITICAL_THRESHOLD
    }
    if missing:
        detail = "; ".join(f"'{c}' {r*100:.1f}%" for c, r in list(missing.items())[:4])
        checks.append(AssumptionCheck(
            name="Low Missingness (< 20% per feature)",
            passed=False,
            detail=f"FAILED — {len(missing)} feature(s) exceed 20% null rate: {detail}. "
                   f"Linear models cannot handle missing data natively — imputation required."
        ))
    else:
        checks.append(AssumptionCheck(
            name="Low Missingness (< 20% per feature)",
            passed=True,
            detail="PASSED — All features have < 20% null rate; imputation or direct fitting feasible."
        ))

    n_failed = sum(1 for c in checks if not c.passed)
    verdict = "Ready" if n_failed == 0 else ("Needs Work" if n_failed <= 2 else "Not Recommended")
    return ModelFamilyAssumptions(family="Linear Models", verdict=verdict, checks=checks)


# ── Tree-Based Models ─────────────────────────────────────────────────────────

def _check_tree(
    stats: Dict[str, Any],
    rows: int,
    quality_metrics: Dict[str, Any],
) -> ModelFamilyAssumptions:
    checks: List[AssumptionCheck] = []

    # 1. Missing Values (RF cannot handle; XGBoost can partially)
    high_missing = {
        col: _null_rate(s, rows)
        for col, s in stats.items()
        if _null_rate(s, rows) > NULL_TREE_THRESHOLD
    }
    if high_missing:
        detail = "; ".join(f"'{c}' {r*100:.1f}%" for c, r in list(high_missing.items())[:4])
        checks.append(AssumptionCheck(
            name="Missing Values < 5%",
            passed=False,
            detail=f"WARNING — {len(high_missing)} feature(s) exceed 5% null rate: {detail}. "
                   f"RandomForest cannot handle NaN; median/mode imputation or SimpleImputer required."
        ))
    else:
        checks.append(AssumptionCheck(
            name="Missing Values < 5%",
            passed=True,
            detail="PASSED — All features have < 5% null rate; tree models can fit without imputation."
        ))

    # 2. High Cardinality Categoricals
    cardinality_issues = [
        (col, _get_num(s.get("categorical") or {}, "unique_count"))
        for col, s in stats.items()
        if s.get("categorical") and
           (_get_num(s.get("categorical") or {}, "unique_count") or 0) > HIGH_CARDINALITY_LIMIT
    ]
    if cardinality_issues:
        detail = "; ".join(f"'{c}' ({n} unique)" for c, n in cardinality_issues[:4])
        checks.append(AssumptionCheck(
            name="Categorical Cardinality < 50 Unique Values",
            passed=False,
            detail=f"WARNING — {len(cardinality_issues)} high-cardinality column(s): {detail}. "
                   f"Use OrdinalEncoder or TargetEncoder instead of one-hot to avoid sparse matrices."
        ))
    else:
        checks.append(AssumptionCheck(
            name="Categorical Cardinality < 50 Unique Values",
            passed=True,
            detail="PASSED — All categorical columns have manageable cardinality for tree-based encoding."
        ))

    # 3. Scale Invariance (trees don't need scaling — this is a pass)
    checks.append(AssumptionCheck(
        name="Scale Invariance (No Scaling Required)",
        passed=True,
        detail="PASSED — Tree-based models (Random Forest, XGBoost, LightGBM) are scale-invariant; "
               "raw feature magnitudes do not affect split decisions."
    ))

    # 4. Duplicate / Noise Check
    dup_pct = quality_metrics.get("duplicate_percentage", 0.0)
    if dup_pct > 10.0:
        checks.append(AssumptionCheck(
            name="Low Duplicate Rate (< 10%)",
            passed=False,
            detail=f"WARNING — {dup_pct:.1f}% duplicate rows detected. "
                   f"Duplicates bias tree-split frequency and inflate training-set performance."
        ))
    else:
        checks.append(AssumptionCheck(
            name="Low Duplicate Rate (< 10%)",
            passed=True,
            detail=f"PASSED — Duplicate row rate is {dup_pct:.1f}%, within acceptable tree-model tolerance."
        ))

    n_failed = sum(1 for c in checks if not c.passed)
    verdict = "Ready" if n_failed == 0 else ("Needs Work" if n_failed <= 1 else "Not Recommended")
    return ModelFamilyAssumptions(family="Tree-Based Models", verdict=verdict, checks=checks)


# ── Distance-Based Models ─────────────────────────────────────────────────────

def _check_distance(
    stats: Dict[str, Any],
    rows: int,
    cols: int,
) -> ModelFamilyAssumptions:
    checks: List[AssumptionCheck] = []

    # 1. Feature Scaling is mandatory
    checks.append(AssumptionCheck(
        name="Feature Scaling Required (StandardScaler Mandatory)",
        passed=False,  # Always a prerequisite
        detail="REQUIRED — KNN and SVM compute Euclidean/kernel distances; unscaled features with "
               "large magnitude ranges dominate distance calculations and degrade performance."
    ))

    # 2. VIF / Multicollinearity
    high_vif = [
        (col, _get_num(s.get("numeric") or {}, "vif_score"))
        for col, s in stats.items()
        if s.get("numeric") and
           _get_num(s.get("numeric") or {}, "vif_score") and
           _get_num(s.get("numeric") or {}, "vif_score") > VIF_DISTANCE_THRESHOLD
    ]
    if high_vif:
        detail = "; ".join(f"'{c}' VIF={v:.1f}" for c, v in high_vif[:4])
        checks.append(AssumptionCheck(
            name="No Feature Redundancy (VIF ≤ 5)",
            passed=False,
            detail=f"FAILED — {len(high_vif)} correlated feature(s): {detail}. "
                   f"Redundant features add noise to distance metrics; apply PCA or drop correlated columns."
        ))
    else:
        checks.append(AssumptionCheck(
            name="No Feature Redundancy (VIF ≤ 5)",
            passed=True,
            detail="PASSED — Feature set shows low multicollinearity; distance computations will be meaningful."
        ))

    # 3. Curse of Dimensionality (rows / cols ratio)
    dim_ratio = rows / cols if cols > 0 else float("inf")
    if dim_ratio < DIM_RATIO_THRESHOLD:
        checks.append(AssumptionCheck(
            name=f"Sufficient Row-to-Feature Ratio (> {DIM_RATIO_THRESHOLD}× needed)",
            passed=False,
            detail=f"FAILED — Row-to-feature ratio is {dim_ratio:.1f}× ({rows:,} rows / {cols} features). "
                   f"Distance-based models suffer severely from the curse of dimensionality below 10× ratio. "
                   f"Apply PCA, feature selection, or increase dataset size."
        ))
    else:
        checks.append(AssumptionCheck(
            name=f"Sufficient Row-to-Feature Ratio (> {DIM_RATIO_THRESHOLD}× needed)",
            passed=True,
            detail=f"PASSED — Row-to-feature ratio is {dim_ratio:.1f}×; dimensionality is manageable."
        ))

    # 4. Missing Values (KNN/SVM cannot handle NaN natively)
    any_missing = any(_null_rate(s, rows) > 0 for s in stats.values())
    if any_missing:
        missing_cols = [col for col, s in stats.items() if _null_rate(s, rows) > 0]
        checks.append(AssumptionCheck(
            name="Zero Missing Values (Imputation Required for NaN)",
            passed=False,
            detail=f"FAILED — {len(missing_cols)} column(s) contain null values. "
                   f"KNN and SVM cannot compute distances on NaN rows; full imputation is mandatory."
        ))
    else:
        checks.append(AssumptionCheck(
            name="Zero Missing Values (Imputation Required for NaN)",
            passed=True,
            detail="PASSED — No null values detected; distance computations can proceed on all rows."
        ))

    n_failed = sum(1 for c in checks if not c.passed)
    verdict = "Ready" if n_failed == 0 else ("Needs Work" if n_failed <= 2 else "Not Recommended")
    return ModelFamilyAssumptions(family="Distance-Based Models", verdict=verdict, checks=checks)


# ── Public API ────────────────────────────────────────────────────────────────

def run_assumption_checker(
    stats: Dict[str, Any],
    quality_metrics: Dict[str, Any],
    rows: int,
    cols: int,
) -> AssumptionReport:
    """
    Runs all three model-family assumption checks deterministically
    from Polars-derived column statistics.

    Args:
        stats:           Column statistics dict {col: ColumnStatistics.model_dump()}.
        quality_metrics: DataQualityMetrics.model_dump().
        rows:            Total row count.
        cols:            Total column count.

    Returns:
        AssumptionReport with linear, tree, and distance results.
    """
    return AssumptionReport(
        linear_models=_check_linear(stats, rows, cols),
        tree_models=_check_tree(stats, rows, quality_metrics),
        distance_models=_check_distance(stats, rows, cols),
    )
