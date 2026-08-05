import math
import numpy as np
import pandas as pd
import polars as pl
from scipy import stats
from sklearn.feature_selection import mutual_info_classif, mutual_info_regression
from sklearn.preprocessing import LabelEncoder
from typing import Dict, List, Tuple, Optional, Any


def sample_df_for_ml(df: pl.DataFrame, max_rows: int = 50000) -> pl.DataFrame:
    """
    Randomly samples the Polars DataFrame if row count exceeds max_rows to maintain sub-3s API latency.
    """
    if df.height > max_rows:
        return df.sample(n=max_rows, seed=42)
    return df


def calculate_normality_test(df: pl.DataFrame, numeric_cols: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Performs the Shapiro-Wilk normality test for numerical columns.
    Returns: {col_name: {"is_normal": bool, "p_value": float}}
    """
    sampled_df = sample_df_for_ml(df, max_rows=50000)
    results: Dict[str, Dict[str, Any]] = {}

    for col in numeric_cols:
        series = sampled_df[col].drop_nulls().to_numpy()
        if len(series) < 3:
            continue

        # Shapiro-Wilk test requires N <= 5000 for scipy.stats.shapiro
        if len(series) > 5000:
            np.random.seed(42)
            series = np.random.choice(series, size=5000, replace=False)

        try:
            stat, p_val = stats.shapiro(series)
            p_val_float = float(p_val)
            results[col] = {
                "is_normal": bool(p_val_float > 0.05),
                "p_value": p_val_float,
            }
        except Exception:
            pass

    return results


def calculate_vif_scores(df: pl.DataFrame, numeric_cols: List[str]) -> Dict[str, float]:
    """
    Calculates Variance Inflation Factor (VIF) for numerical columns to detect multicollinearity.
    VIF = 1 / (1 - R^2). VIF > 10 indicates high correlation/redundancy.
    """
    if len(numeric_cols) < 2:
        return {col: 1.0 for col in numeric_cols}

    sampled_df = sample_df_for_ml(df, max_rows=50000)
    pandas_df = pd.DataFrame(sampled_df.select(numeric_cols).to_dict(as_series=False))

    # Handle NaNs: Impute with column median
    for c in numeric_cols:
        if pandas_df[c].isnull().any():
            median_val = pandas_df[c].median() if pd.api.types.is_numeric_dtype(pandas_df[c]) else 0
            pandas_df[c] = pandas_df[c].fillna(median_val if not pd.isna(median_val) else 0)

    # Drop zero variance (constant) columns
    valid_cols = [c for c in numeric_cols if pandas_df[c].std() > 1e-8]
    if len(valid_cols) < 2:
        return {c: 1.0 for c in numeric_cols}

    X = pandas_df[valid_cols].values
    vif_dict: Dict[str, float] = {}

    for i, col in enumerate(valid_cols):
        y_i = X[:, i]
        X_other = np.delete(X, i, axis=1)

        try:
            # Solve OLS R^2: y_hat = X_other @ coef
            coef, resid, rank, s = np.linalg.lstsq(X_other, y_i, rcond=None)
            total_sum_squares = np.sum((y_i - np.mean(y_i)) ** 2)
            if total_sum_squares < 1e-8:
                vif_dict[col] = 1.0
                continue

            residual_sum_squares = np.sum((y_i - X_other @ coef) ** 2)
            r_squared = 1.0 - (residual_sum_squares / total_sum_squares)
            r_squared = max(0.0, min(0.9999, r_squared))
            vif = 1.0 / (1.0 - r_squared)
            vif_dict[col] = float(np.round(vif, 2))
        except Exception:
            vif_dict[col] = 1.0

    return vif_dict


def calculate_mutual_information(
    df: pl.DataFrame, target_column: str
) -> Tuple[Dict[str, float], Optional[Dict[str, float]]]:
    """
    Calculates Mutual Information (MI) scores between all features and a user-specified target_column.
    Also calculates target imbalance ratio if the target is categorical.

    Returns: (mi_scores_dict, target_imbalance_ratio_dict)
    """
    if target_column not in df.columns:
        return {}, None

    sampled_df = sample_df_for_ml(df, max_rows=50000)
    pandas_df = pd.DataFrame(sampled_df.to_dict(as_series=False))

    target = pandas_df[target_column]
    feature_cols = [c for c in pandas_df.columns if c != target_column]

    if len(feature_cols) == 0:
        return {}, None

    # Determine if target is categorical or numeric
    is_categorical_target = False
    imbalance_ratio: Optional[Dict[str, float]] = None

    if not pd.api.types.is_numeric_dtype(target) or target.nunique() <= 10:
        is_categorical_target = True
        counts = target.value_counts(normalize=True).to_dict()
        imbalance_ratio = {str(k): float(np.round(v * 100, 2)) for k, v in counts.items()}

    # Preprocess Target Y
    if is_categorical_target:
        le = LabelEncoder()
        y = le.fit_transform(target.astype(str).fillna("Missing"))
    else:
        med_y = target.median() if pd.api.types.is_numeric_dtype(target) else 0
        y = target.fillna(med_y if not pd.isna(med_y) else 0).values

    # Preprocess Feature Matrix X
    encoded_features = []
    processed_feature_names = []

    for col in feature_cols:
        col_series = pandas_df[col]
        if pd.api.types.is_numeric_dtype(col_series):
            med_x = col_series.median()
            filled_val = col_series.fillna(med_x if not pd.isna(med_x) else 0).values
            encoded_features.append(filled_val)
            processed_feature_names.append(col)
        else:
            le_feat = LabelEncoder()
            encoded_val = le_feat.fit_transform(col_series.astype(str).fillna("Missing"))
            encoded_features.append(encoded_val)
            processed_feature_names.append(col)

    if len(encoded_features) == 0:
        return {}, imbalance_ratio

    X = np.column_stack(encoded_features)

    try:
        if is_categorical_target:
            mi_values = mutual_info_classif(X, y, random_state=42)
        else:
            mi_values = mutual_info_regression(X, y, random_state=42)

        mi_dict: Dict[str, float] = {}
        for col_name, score in zip(processed_feature_names, mi_values):
            mi_dict[col_name] = float(np.round(score, 4))

        return mi_dict, imbalance_ratio
    except Exception:
        return {}, imbalance_ratio
