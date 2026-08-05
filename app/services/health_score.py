from typing import Dict, List
import polars as pl
from app.models.dataset import DataQualityMetrics, ColumnStatistics, HealthScore


def calculate_health_score(
    df: pl.DataFrame,
    quality: DataQualityMetrics,
    stats: Dict[str, ColumnStatistics]
) -> HealthScore:
    """
    Calculates a deterministic 0-100 health score with sub-scores for Completeness,
    Consistency, and Uniqueness, providing itemized deduction explanations.

    :param df: Polars DataFrame analyzed.
    :param quality: DataQualityMetrics model instance.
    :param stats: Dictionary of per-column ColumnStatistics.
    :return: HealthScore Pydantic model.
    """
    total_rows = df.height
    total_cols = df.width
    total_cells = total_rows * total_cols
    deductions: List[str] = []

    # 1. Completeness Sub-Score
    total_nulls = sum(quality.null_counts_per_column.values())
    if total_cells > 0:
        missing_ratio = total_nulls / total_cells
        completeness_score = max(0.0, round((1.0 - missing_ratio) * 100.0, 2))
        if total_nulls > 0:
            null_pct = round(missing_ratio * 100.0, 2)
            deductions.append(f"Completeness deduction: {total_nulls:,} missing cells ({null_pct}% of total dataset)")
    else:
        completeness_score = 100.0

    # 2. Uniqueness Sub-Score
    if quality.total_duplicate_rows > 0:
        uniqueness_score = max(0.0, round(100.0 - quality.duplicate_percentage, 2))
        deductions.append(
            f"Uniqueness deduction: {quality.total_duplicate_rows:,} duplicate rows ({quality.duplicate_percentage}% of total rows)"
        )
    else:
        uniqueness_score = 100.0

    # 3. Consistency Sub-Score
    consistency_score = 100.0

    # Constant columns penalty (10 pts per constant column)
    if quality.constant_columns:
        penalty = len(quality.constant_columns) * 10.0
        consistency_score -= penalty
        cols_str = ", ".join(quality.constant_columns[:5])
        deductions.append(f"Consistency deduction: -{penalty:.0f} pts for constant columns ({cols_str})")

    # High cardinality penalty (5 pts per high cardinality categorical column)
    if quality.high_cardinality_columns:
        penalty = len(quality.high_cardinality_columns) * 5.0
        consistency_score -= penalty
        cols_str = ", ".join(quality.high_cardinality_columns[:5])
        deductions.append(f"Consistency deduction: -{penalty:.0f} pts for high-cardinality non-numeric columns ({cols_str})")

    # Outlier penalty for numeric columns
    numeric_outlier_pcts = [
        col_stat.numeric.outlier_percentage
        for col_stat in stats.values()
        if col_stat.numeric is not None
    ]
    if numeric_outlier_pcts:
        avg_outlier_pct = sum(numeric_outlier_pcts) / len(numeric_outlier_pcts)
        if avg_outlier_pct > 2.0:
            penalty = min(20.0, round(avg_outlier_pct * 1.5, 2))
            consistency_score -= penalty
            deductions.append(f"Consistency deduction: -{penalty:.1f} pts due to numerical outliers (avg {avg_outlier_pct:.2f}%)")

    consistency_score = max(0.0, round(consistency_score, 2))

    # 4. Overall Weighted Score (Completeness 40%, Consistency 30%, Uniqueness 30%)
    overall = (completeness_score * 0.40) + (consistency_score * 0.30) + (uniqueness_score * 0.30)
    overall_score = max(0.0, min(100.0, round(overall, 2)))

    return HealthScore(
        overall_score=overall_score,
        completeness_score=completeness_score,
        consistency_score=consistency_score,
        uniqueness_score=uniqueness_score,
        deductions=deductions
    )
