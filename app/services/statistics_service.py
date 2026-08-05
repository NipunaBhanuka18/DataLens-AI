import math
from typing import Dict, Optional, Tuple
import polars as pl
from app.models.dataset import (
    ColumnStatistics,
    NumericColumnStats,
    CategoricalColumnStats,
)
from app.services.advanced_stats import (
    calculate_normality_test,
    calculate_vif_scores,
    calculate_mutual_information,
)


def _clean_float(val: Optional[float]) -> Optional[float]:
    """Helper to convert Polars float values into standard Python floats or None if NaN/Inf."""
    if val is None:
        return None
    f_val = float(val)
    if math.isnan(f_val) or math.isinf(f_val):
        return None
    return round(f_val, 4)


def compute_column_statistics(
    df: pl.DataFrame, target_column: Optional[str] = None
) -> Tuple[Dict[str, ColumnStatistics], Optional[Dict[str, float]]]:
    """
    Computes numerical distributions, categorical frequencies, 3-sigma outlier metrics,
    Shapiro-Wilk normality tests, VIF multicollinearity, and Mutual Information scores.

    :param df: Polars DataFrame to evaluate.
    :param target_column: Optional target feature for Mutual Information & imbalance calculation.
    :return: A tuple of (Dict[col_name, ColumnStatistics], target_imbalance_ratio_dict).
    """
    total_rows = df.height
    stats: Dict[str, ColumnStatistics] = {}

    numeric_cols = [
        col for col, dtype in df.schema.items() if dtype.is_numeric() and dtype != pl.Boolean
    ]

    # Calculate Advanced ML Heuristics
    normality_map = calculate_normality_test(df, numeric_cols)
    vif_map = calculate_vif_scores(df, numeric_cols)

    target_imbalance_ratio: Optional[Dict[str, float]] = None
    mi_map: Dict[str, float] = {}

    if target_column and target_column in df.columns:
        mi_map, target_imbalance_ratio = calculate_mutual_information(df, target_column)
    elif len(df.columns) > 1:
        # Default auto-select last column as target candidate
        candidate_target = df.columns[-1]
        mi_map, target_imbalance_ratio = calculate_mutual_information(df, candidate_target)

    for col_name, dtype in df.schema.items():
        dtype_str = str(dtype)
        null_count = int(df[col_name].null_count())
        mi_score = mi_map.get(col_name)

        if dtype.is_numeric() and dtype != pl.Boolean:
            series = df[col_name].drop_nulls()
            
            if series.len() == 0:
                numeric_stats = NumericColumnStats(
                    mean=None,
                    std=None,
                    min=None,
                    max=None,
                    skewness=None,
                    null_count=null_count,
                    outlier_count=0,
                    outlier_percentage=0.0,
                    is_normal_distribution=None,
                    shapiro_p_value=None,
                    vif_score=vif_map.get(col_name, 1.0),
                )
            else:
                mean_val = _clean_float(series.mean())
                std_val = _clean_float(series.std())
                min_val = _clean_float(series.min())
                max_val = _clean_float(series.max())
                skew_val = _clean_float(series.skew())

                outlier_count = 0
                outlier_pct = 0.0

                if mean_val is not None and std_val is not None and std_val > 0:
                    lower_bound = mean_val - (3 * std_val)
                    upper_bound = mean_val + (3 * std_val)
                    
                    outlier_expr = (pl.col(col_name) < lower_bound) | (pl.col(col_name) > upper_bound)
                    outlier_sum = df.select(outlier_expr.sum()).item()
                    outlier_count = int(outlier_sum) if outlier_sum is not None else 0
                    if total_rows > 0:
                        outlier_pct = round((outlier_count / total_rows) * 100.0, 2)

                norm_info = normality_map.get(col_name, {})
                vif = vif_map.get(col_name, 1.0)

                numeric_stats = NumericColumnStats(
                    mean=mean_val,
                    std=std_val,
                    min=min_val,
                    max=max_val,
                    skewness=skew_val,
                    null_count=null_count,
                    outlier_count=outlier_count,
                    outlier_percentage=outlier_pct,
                    is_normal_distribution=norm_info.get("is_normal"),
                    shapiro_p_value=norm_info.get("p_value"),
                    vif_score=vif,
                )

            stats[col_name] = ColumnStatistics(
                data_type=dtype_str,
                numeric=numeric_stats,
                categorical=None,
                mutual_info_score=mi_score,
            )

        else:
            unique_count = int(df[col_name].n_unique())
            top_cats: Dict[str, int] = {}
            
            if total_rows > 0:
                value_counts = (
                    df[col_name]
                    .drop_nulls()
                    .value_counts()
                    .sort("count", descending=True)
                    .head(10)
                )
                for row in value_counts.iter_rows(named=True):
                    val_str = str(row[col_name])
                    count_val = int(row["count"])
                    top_cats[val_str] = count_val

            cat_stats = CategoricalColumnStats(
                unique_count=unique_count,
                top_categories=top_cats,
                null_count=null_count
            )

            stats[col_name] = ColumnStatistics(
                data_type=dtype_str,
                numeric=None,
                categorical=cat_stats,
                mutual_info_score=mi_score,
            )

    return stats, target_imbalance_ratio
