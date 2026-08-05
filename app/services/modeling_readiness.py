from typing import Tuple, List, Dict, Any, Optional
from app.models.dataset import AnalysisState


def calculate_modeling_readiness_score(
    rows: int,
    cols: int,
    col_stats: Dict[str, Any],
    quality_metrics: Optional[Dict[str, Any]] = None,
    target_column: Optional[str] = None,
    target_imbalance_ratio: Optional[Dict[str, float]] = None,
) -> Tuple[float, str, List[str]]:
    """
    Calculates a deterministic 0-100 Modeling Readiness Score based on ML statistics:
    - Data Leakage (Mutual Info > 0.90)
    - Multicollinearity (VIF > 10)
    - Class Imbalance (minority class < 15%)
    - Curse of Dimensionality (Row-to-Col ratio < 10)
    - Missingness ratio (> 10%)

    :return: A tuple of (score: float, level: str, deductions: List[str]).
    """
    score = 100.0
    deductions: List[str] = []

    # 1. Data Leakage Penalty (MI > 0.90)
    if col_stats:
        high_mi_cols = []
        for col_name, data in col_stats.items():
            if col_name == target_column:
                continue
            mi = data.get("mutual_info_score") if isinstance(data, dict) else getattr(data, "mutual_info_score", None)
            if mi and mi > 0.90:
                high_mi_cols.append(f"'{col_name}' (MI = {mi:.2f})")

        if high_mi_cols:
            score -= 25.0
            deductions.append(
                f"Data Leakage Risk (-25 pts): Feature(s) {', '.join(high_mi_cols)} exhibit near-perfect correlation with target '{target_column}'."
            )

    # 2. Multicollinearity Penalty (VIF > 10)
    if col_stats:
        high_vif_cols = []
        for col_name, data in col_stats.items():
            num = data.get("numeric") if isinstance(data, dict) else getattr(data, "numeric", None)
            vif = None
            if isinstance(num, dict):
                vif = num.get("vif_score")
            elif num:
                vif = getattr(num, "vif_score", None)

            if vif and vif > 10.0:
                high_vif_cols.append(f"'{col_name}' (VIF = {vif:.1f})")

        if high_vif_cols:
            penalty = min(15.0, len(high_vif_cols) * 5.0)
            score -= penalty
            deductions.append(
                f"Multicollinearity Warning (-{penalty:.0f} pts): Feature(s) {', '.join(high_vif_cols)} exceed VIF threshold of 10.0."
            )

    # 3. Class Imbalance Penalty (Minority < 15%)
    if target_imbalance_ratio:
        percentages = list(target_imbalance_ratio.values())
        min_pct = min(percentages) if percentages else 100.0
        if min_pct < 15.0:
            penalty = 15.0 if min_pct < 5.0 else 10.0
            score -= penalty
            deductions.append(
                f"Target Class Imbalance (-{penalty:.0f} pts): Target '{target_column}' has severe imbalance (minority class represents {min_pct:.1f}%)."
            )

    # 4. Curse of Dimensionality (Rows / Cols < 10)
    if cols > 0:
        ratio = rows / cols
        if ratio < 10.0:
            score -= 15.0
            deductions.append(
                f"Curse of Dimensionality (-15 pts): Low sample-to-feature ratio ({ratio:.1f} rows per column). High risk of model overfitting."
            )

    # 5. Missingness Penalty (> 10% nulls)
    if quality_metrics and rows > 0 and cols > 0:
        null_counts = quality_metrics.get("null_counts_per_column", {}) if isinstance(quality_metrics, dict) else getattr(quality_metrics, "null_counts_per_column", {})
        total_cells = rows * cols
        null_count = sum(null_counts.values()) if null_counts else 0
        null_pct = (null_count / total_cells) * 100.0
        if null_pct > 10.0:
            score -= 10.0
            deductions.append(
                f"High Data Missingness (-10 pts): Overall dataset contains {null_pct:.1f}% missing cells."
            )

    # Ensure score stays bounded [0, 100]
    final_score = max(0.0, min(100.0, round(score, 1)))

    if final_score >= 85.0:
        level = "EXCELLENT"
    elif final_score >= 70.0:
        level = "GOOD"
    elif final_score >= 50.0:
        level = "NEEDS_WORK"
    else:
        level = "HIGH_RISK"

    return final_score, level, deductions


def calculate_modeling_readiness_from_state(analysis_state: AnalysisState) -> Tuple[float, str, List[str]]:
    """Helper wrapper for AnalysisState instance."""
    q_dict = analysis_state.quality_metrics.model_dump() if analysis_state.quality_metrics else {}
    c_dict = (
        {col: stats.model_dump() for col, stats in analysis_state.column_statistics.items()}
        if analysis_state.column_statistics
        else {}
    )
    return calculate_modeling_readiness_score(
        rows=analysis_state.row_count,
        cols=analysis_state.column_count,
        col_stats=c_dict,
        quality_metrics=q_dict,
        target_column=analysis_state.target_column,
        target_imbalance_ratio=analysis_state.target_imbalance_ratio,
    )
