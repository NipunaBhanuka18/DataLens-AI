"""
Decision Simulator Service
--------------------------
Deterministically evaluates a preprocessing decision for a single column
and produces a structured side-by-side comparison of two decision paths:
  • Path A – The naive / default approach
  • Path B – The recommended approach

All logic is driven purely from the column's measured statistics
(skewness, outlier_percentage, null_rate, VIF, cardinality).
No LLM call required – instant, reproducible output.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


# ─── Response Schema ──────────────────────────────────────────────────────────

class DecisionPath(BaseModel):
    label: str          = Field(..., description="Short path label, e.g. 'StandardScaler'")
    verdict: str        = Field(..., description="'Recommended' | 'Not Recommended' | 'Use With Caution'")
    verdict_level: str  = Field(..., description="'pass' | 'fail' | 'warn'")
    rationale: str      = Field(..., description="Why this choice succeeds or fails given the measured metrics.")
    math_detail: str    = Field(..., description="The mathematical mechanism, e.g. formula or transformation behaviour.")
    downstream_effect: str = Field(..., description="Effect on specific model families or training dynamics.")


class SimulationResult(BaseModel):
    feature_name: str
    suggested_action: str
    metric_snapshot: dict = Field(..., description="Key column metrics that drove this simulation.")
    path_a: DecisionPath  = Field(..., description="The naive / default choice.")
    path_b: DecisionPath  = Field(..., description="The recommended / better choice.")
    expected_effect: str  = Field(..., description="One-sentence summary of the net gain from choosing Path B.")
    confidence: str       = Field(..., description="'High' | 'Medium'")


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _safe(d: dict | object, key: str, default=None):
    if isinstance(d, dict):
        return d.get(key, default)
    return getattr(d, key, default)


def _null_rate(col_stat: dict, total_rows: int) -> float:
    num = _safe(col_stat, "numeric") or {}
    cat = _safe(col_stat, "categorical") or {}
    nc = _safe(num, "null_count", 0) or 0
    cc = _safe(cat, "null_count", 0) or 0
    return max(nc, cc) / total_rows if total_rows > 0 else 0.0


# ─── Simulation Strategies ────────────────────────────────────────────────────

def _simulate_scaler(col_name: str, num: dict, null_rate: float) -> SimulationResult:
    skew       = abs(_safe(num, "skewness") or 0)
    outlier_pct = _safe(num, "outlier_percentage") or 0
    is_normal  = _safe(num, "is_normal_distribution") or False
    mean_val   = _safe(num, "mean")
    std_val    = _safe(num, "std")

    snapshot = {
        "skewness": round(skew, 3),
        "outlier_pct": f"{outlier_pct:.1f}%",
        "is_normal": is_normal,
        "mean": round(mean_val, 4) if mean_val is not None else "N/A",
        "std": round(std_val, 4) if std_val is not None else "N/A",
        "null_rate": f"{null_rate * 100:.1f}%",
    }

    heavy_skew    = skew > 1.0
    heavy_outlier = outlier_pct > 5.0

    if is_normal and not heavy_outlier:
        # StandardScaler is correct
        path_a = DecisionPath(
            label="StandardScaler",
            verdict="Recommended",
            verdict_level="pass",
            rationale=(
                f"Shapiro-Wilk confirms near-normal distribution for '{col_name}'. "
                f"Outlier rate is {outlier_pct:.1f}% — within safe tolerance."
            ),
            math_detail="z = (x − μ) / σ  —  centres to zero mean, unit variance. "
                        "Works optimally when the distribution is Gaussian.",
            downstream_effect=(
                "Optimal for Logistic Regression, SVMs, and Neural Networks. "
                "Gradient descent converges faster on zero-centred, unit-variance inputs."
            ),
        )
        path_b = DecisionPath(
            label="RobustScaler",
            verdict="Use With Caution",
            verdict_level="warn",
            rationale=(
                f"RobustScaler is unnecessary for '{col_name}' since the distribution is already normal "
                f"and outlier rate ({outlier_pct:.1f}%) is low. Applying it may slightly over-compress the range."
            ),
            math_detail="x' = (x − median) / IQR  —  designed for skewed distributions with heavy tails. "
                        "On normal data, IQR ≈ 1.35σ so the result is similar to StandardScaler but less optimal.",
            downstream_effect=(
                "Negligible difference on already-normal data, but adds unnecessary computational complexity "
                "to the pipeline and harder to explain to stakeholders."
            ),
        )
        effect = (
            f"StandardScaler is the optimal choice for '{col_name}': Gaussian distribution confirmed, "
            f"outlier rate {outlier_pct:.1f}% is safe. Downstream gradient-based models will converge optimally."
        )
    else:
        # RobustScaler is correct
        cause_parts = []
        if heavy_skew:
            cause_parts.append(f"skewness of {skew:.2f}")
        if heavy_outlier:
            cause_parts.append(f"{outlier_pct:.1f}% outlier rate")
        cause = " and ".join(cause_parts) or "non-normal distribution"

        path_a = DecisionPath(
            label="StandardScaler",
            verdict="Not Recommended",
            verdict_level="fail",
            rationale=(
                f"'{col_name}' has {cause}. StandardScaler computes mean and std from all values including outliers, "
                f"so extreme tail values will skew the mean and inflate std — corrupting the scale for most data points."
            ),
            math_detail="z = (x − μ) / σ  —  the sample mean μ is pulled toward extreme outliers; "
                        f"for '{col_name}', the std ({std_val:.2f}) is inflated by outliers, "
                        "compressing inlier values to a narrow band near zero.",
            downstream_effect=(
                "Distance-based models (KNN, SVM) and Linear Regression will assign incorrect relative importance "
                "to this feature. Regularisation (L2) may penalise the wrong scale. "
                "Model accuracy and convergence speed both degrade."
            ),
        )
        path_b = DecisionPath(
            label="RobustScaler",
            verdict="Recommended",
            verdict_level="pass",
            rationale=(
                f"RobustScaler uses the median and IQR for '{col_name}', both of which are robust statistics — "
                f"they are not influenced by the {outlier_pct:.1f}% of extreme values beyond the 3σ fence."
            ),
            math_detail="x' = (x − median) / IQR  —  IQR = Q3 − Q1 covers the central 50% of the data. "
                        f"For '{col_name}', this correctly centres the bulk of the distribution "
                        "without being distorted by tail values.",
            downstream_effect=(
                "Produces stable, meaningful feature scales for KNN, SVM, and distance-based models. "
                "Prevents outlier-driven gradient explosions in linear models. "
                "Also advisable as a precursor to QuantileTransformer if normality is strictly required."
            ),
        )
        effect = (
            f"Switching from StandardScaler → RobustScaler for '{col_name}' "
            f"(skew={skew:.2f}, outliers={outlier_pct:.1f}%) eliminates outlier contamination of the mean/std, "
            f"producing stable feature scales for distance-based and linear models."
        )

    return SimulationResult(
        feature_name=col_name,
        suggested_action="scaler_choice",
        metric_snapshot=snapshot,
        path_a=path_a,
        path_b=path_b,
        expected_effect=effect,
        confidence="High",
    )


def _simulate_imputation(col_name: str, col_stat: dict, null_rate: float) -> SimulationResult:
    num = _safe(col_stat, "numeric") or {}
    cat = _safe(col_stat, "categorical") or {}
    is_numeric = bool(num)
    skew = abs(_safe(num, "skewness") or 0)
    outlier_pct = _safe(num, "outlier_percentage") or 0
    pct = null_rate * 100

    snapshot = {
        "null_rate": f"{pct:.1f}%",
        "column_type": "Numeric" if is_numeric else "Categorical",
        "skewness": round(skew, 3) if is_numeric else "N/A",
        "outlier_pct": f"{outlier_pct:.1f}%" if is_numeric else "N/A",
    }

    if is_numeric and (skew > 1.0 or outlier_pct > 5.0):
        # Median imputation recommended
        path_a = DecisionPath(
            label="Mean Imputation",
            verdict="Not Recommended",
            verdict_level="fail",
            rationale=(
                f"'{col_name}' has skewness {skew:.2f} and {outlier_pct:.1f}% outliers. "
                f"The arithmetic mean is pulled toward extreme values, so imputing {pct:.1f}% of missing cells "
                f"with a distorted mean injects systematic bias into the distribution."
            ),
            math_detail="μ = Σxᵢ/n  —  a single large outlier shifts μ significantly. "
                        f"For '{col_name}', the mean underestimates the typical value for skewed data.",
            downstream_effect=(
                "Artificially shifts the distribution, reducing model generalisation. "
                "Particularly harmful in Linear Regression where imputed values appear as real training signal."
            ),
        )
        path_b = DecisionPath(
            label="Median Imputation",
            verdict="Recommended",
            verdict_level="pass",
            rationale=(
                f"The median is the 50th percentile and is entirely unaffected by the {outlier_pct:.1f}% "
                f"extreme tail values in '{col_name}'. It represents the true centre of the distribution."
            ),
            math_detail="Median = middle value of sorted data  —  resistant to outliers by definition. "
                        "SimpleImputer(strategy='median') or IterativeImputer are both appropriate.",
            downstream_effect=(
                "Preserves the natural data distribution shape post-imputation. "
                "Downstream models train on representative values, maintaining data integrity across pipeline steps."
            ),
        )
        effect = (
            f"Median imputation for '{col_name}' (skew={skew:.2f}, {pct:.1f}% missing) "
            f"preserves distribution shape and prevents outlier-biased mean from contaminating imputed values."
        )
    elif is_numeric:
        # Mean imputation fine
        path_a = DecisionPath(
            label="Mean Imputation",
            verdict="Recommended",
            verdict_level="pass",
            rationale=(
                f"'{col_name}' has a near-normal distribution (skew={skew:.2f}) with low outlier rate "
                f"({outlier_pct:.1f}%), making the arithmetic mean a reliable imputation statistic."
            ),
            math_detail="μ = Σxᵢ/n  —  accurate estimate of the distribution centre for Gaussian data. "
                        "SimpleImputer(strategy='mean') is appropriate here.",
            downstream_effect=(
                "Minimal distortion to the distribution. Fast, interpretable, and well-suited "
                "for downstream linear models and gradient boosting."
            ),
        )
        path_b = DecisionPath(
            label="KNN Imputation",
            verdict="Use With Caution",
            verdict_level="warn",
            rationale=(
                f"KNN imputation uses neighbour similarity and is more powerful than mean imputation, "
                f"but for '{col_name}' with only {pct:.1f}% missingness and a normal distribution, "
                f"the additional complexity is unlikely to produce a measurable improvement."
            ),
            math_detail="KNNImputer computes Euclidean distance across all features to find k similar rows; "
                        "imputes with weighted average of k neighbours. O(n²) complexity at scale.",
            downstream_effect=(
                "Marginally better imputed values but at significant computation cost on large datasets. "
                "Reserve KNN imputation for MCAR/MAR patterns with > 15% missingness."
            ),
        )
        effect = (
            f"Mean imputation is optimal for '{col_name}' ({pct:.1f}% missing, near-Gaussian). "
            f"Low complexity, accurate centre estimate, no distribution distortion."
        )
    else:
        # Categorical: mode imputation
        unique = _safe(cat, "unique_count", 2) or 2
        path_a = DecisionPath(
            label="Mode Imputation",
            verdict="Recommended",
            verdict_level="pass",
            rationale=(
                f"'{col_name}' is categorical with {unique} unique values. "
                f"Mode (most frequent category) imputation preserves the existing frequency distribution "
                f"and is the standard approach for nominal features."
            ),
            math_detail="Mode = argmax(frequency(c) for c in categories)  —  "
                        "SimpleImputer(strategy='most_frequent') implements this directly.",
            downstream_effect=(
                "Maintains the target category encoding balance. "
                "Prevents introduction of NaN sentinel values that would break one-hot encoders."
            ),
        )
        path_b = DecisionPath(
            label="Add 'Unknown' Category",
            verdict="Use With Caution",
            verdict_level="warn",
            rationale=(
                f"For '{col_name}', adding a distinct 'Unknown' label preserves the information "
                f"that data was missing — which may itself be a predictive signal — but increases cardinality by 1."
            ),
            math_detail="Missing-indicator encoding: set NaN → 'Unknown' before encoding. "
                        "Avoids imputing a potentially wrong category at the cost of an extra dummy column.",
            downstream_effect=(
                "Useful when missingness is non-random (MNAR pattern). "
                "For tree-based models especially, preserving the 'missing' signal can improve accuracy. "
                "Increases memory footprint by one OHE column."
            ),
        )
        effect = (
            f"Mode imputation for categorical '{col_name}' ({pct:.1f}% missing, {unique} categories) "
            f"is the safest choice; use 'Unknown' category only if missingness is believed to be informative."
        )

    return SimulationResult(
        feature_name=col_name,
        suggested_action="imputation_strategy",
        metric_snapshot=snapshot,
        path_a=path_a,
        path_b=path_b,
        expected_effect=effect,
        confidence="High",
    )


def _simulate_outlier(col_name: str, num: dict, null_rate: float) -> SimulationResult:
    outlier_pct = _safe(num, "outlier_percentage") or 0
    outlier_cnt = _safe(num, "outlier_count") or 0
    skew        = _safe(num, "skewness") or 0
    mean_val    = _safe(num, "mean") or 0
    std_val     = _safe(num, "std") or 1

    snapshot = {
        "outlier_count": outlier_cnt,
        "outlier_pct": f"{outlier_pct:.1f}%",
        "skewness": round(skew, 3),
        "mean": round(mean_val, 4),
        "std": round(std_val, 4),
        "3σ_fence_upper": round(mean_val + 3 * std_val, 4),
        "3σ_fence_lower": round(mean_val - 3 * std_val, 4),
    }

    path_a = DecisionPath(
        label="Drop Outlier Rows",
        verdict="Use With Caution",
        verdict_level="warn",
        rationale=(
            f"Dropping the {outlier_cnt} rows ({outlier_pct:.1f}%) beyond 3σ for '{col_name}' "
            f"removes real data points that may represent genuine edge-cases. "
            f"If the dataset is small, this can significantly reduce training data."
        ),
        math_detail=f"3σ fence: [{mean_val - 3*std_val:.3f}, {mean_val + 3*std_val:.3f}]. "
                    f"Dropping {outlier_cnt} rows removes {outlier_pct:.1f}% of total training signal. "
                    f"Risk: induces selection bias if outliers are non-random.",
        downstream_effect=(
            "Model becomes blind to edge-case patterns it may encounter in production. "
            "Particularly harmful for fraud/anomaly detection where outliers ARE the signal."
        ),
    )
    path_b = DecisionPath(
        label="Winsorize / Clip to 1.5×IQR",
        verdict="Recommended",
        verdict_level="pass",
        rationale=(
            f"Winsorizing caps extreme values in '{col_name}' at the 1.5×IQR fence rather than discarding rows. "
            f"This retains all {outlier_cnt} data points while limiting the distortionary effect of extreme values."
        ),
        math_detail="x_clipped = clip(x, Q1 − 1.5×IQR, Q3 + 1.5×IQR). "
                    "The IQR (Q3 − Q1) captures the central 50% of data; 1.5× is Tukey's standard fence. "
                    "All rows are preserved — only the extreme magnitudes are truncated.",
        downstream_effect=(
            "Retains full training set size (zero data loss). "
            "Reduces outlier leverage on linear model coefficients and distance metrics. "
            "Compatible with all downstream scalers and transformers."
        ),
    )
    effect = (
        f"Winsorizing '{col_name}' (outliers={outlier_pct:.1f}%, skew={skew:.2f}) retains all {outlier_cnt} "
        f"borderline rows while eliminating their distortionary leverage on model coefficients and distances."
    )

    return SimulationResult(
        feature_name=col_name,
        suggested_action="outlier_handling",
        metric_snapshot=snapshot,
        path_a=path_a,
        path_b=path_b,
        expected_effect=effect,
        confidence="High",
    )


# ─── Public API ───────────────────────────────────────────────────────────────

def run_simulation(
    col_name: str,
    suggested_action: str,
    col_stat: dict,
    total_rows: int,
) -> SimulationResult:
    """
    Dispatches the correct simulation strategy based on `suggested_action`.

    Args:
        col_name:         Column name being evaluated.
        suggested_action: One of 'scaler_choice', 'imputation_strategy', 'outlier_handling'.
        col_stat:         ColumnStatistics.model_dump() for this column.
        total_rows:       Total dataset row count.

    Returns:
        SimulationResult with two decision paths and an expected effect summary.
    """
    null_rate = _null_rate(col_stat, total_rows)
    num = _safe(col_stat, "numeric") or {}

    if suggested_action == "scaler_choice":
        return _simulate_scaler(col_name, num, null_rate)
    elif suggested_action == "imputation_strategy":
        return _simulate_imputation(col_name, col_stat, null_rate)
    elif suggested_action == "outlier_handling":
        return _simulate_outlier(col_name, num, null_rate)
    else:
        # Generic fallback — return a neutral comparison
        return SimulationResult(
            feature_name=col_name,
            suggested_action=suggested_action,
            metric_snapshot={"null_rate": f"{null_rate*100:.1f}%"},
            path_a=DecisionPath(
                label="Default Approach",
                verdict="Use With Caution",
                verdict_level="warn",
                rationale="No specific simulation rule for this action type.",
                math_detail="N/A",
                downstream_effect="Review the recommendation manually.",
            ),
            path_b=DecisionPath(
                label="Recommended Approach",
                verdict="Recommended",
                verdict_level="pass",
                rationale="Follow the triage recommendation for this column.",
                math_detail="N/A",
                downstream_effect="Improved model stability expected.",
            ),
            expected_effect="Follow the triage recommendation for best results.",
            confidence="Medium",
        )
