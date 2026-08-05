import pytest
import numpy as np
import polars as pl
from app.services.advanced_stats import (
    sample_df_for_ml,
    calculate_normality_test,
    calculate_vif_scores,
    calculate_mutual_information,
)


def test_sample_df_for_ml():
    # Create DF with 60,000 rows
    df_large = pl.DataFrame({"x": np.arange(60000)})
    sampled = sample_df_for_ml(df_large, max_rows=50000)
    assert sampled.height == 50000

    # DF with 1,000 rows should stay unchanged
    df_small = pl.DataFrame({"x": np.arange(1000)})
    assert sample_df_for_ml(df_small, max_rows=50000).height == 1000


def test_calculate_normality_test():
    np.random.seed(42)
    # Gaussian normal data
    normal_data = np.random.normal(loc=10.0, scale=2.0, size=500)
    # Uniform non-normal data
    uniform_data = np.random.uniform(low=0.0, high=100.0, size=500)

    df = pl.DataFrame({
        "gaussian": normal_data,
        "uniform": uniform_data
    })

    results = calculate_normality_test(df, ["gaussian", "uniform"])
    assert "gaussian" in results
    assert "uniform" in results
    assert results["gaussian"]["is_normal"] is True
    assert results["uniform"]["is_normal"] is False


def test_calculate_vif_scores():
    np.random.seed(42)
    x1 = np.random.normal(0, 1, 100)
    x2 = x1 * 2 + np.random.normal(0, 0.01, 100) # High correlation with x1
    x3 = np.random.normal(0, 1, 100)

    df = pl.DataFrame({"x1": x1, "x2": x2, "x3": x3})
    vif = calculate_vif_scores(df, ["x1", "x2", "x3"])

    assert "x1" in vif
    assert "x2" in vif
    assert "x3" in vif
    assert vif["x1"] > 5.0  # High VIF due to collinearity with x2
    assert vif["x3"] < 3.0  # Independent feature low VIF


def test_calculate_mutual_information():
    np.random.seed(42)
    x = np.random.normal(0, 1, 200)
    y = x ** 2 + np.random.normal(0, 0.1, 200) # Non-linear relationship
    cat_target = np.array(["A", "B"] * 100)

    df = pl.DataFrame({"x": x, "y": y, "target": cat_target})
    mi_scores, imbalance = calculate_mutual_information(df, target_column="y")

    assert "x" in mi_scores
    assert mi_scores["x"] > 0.0

    # Categorical target imbalance test
    mi_scores_cat, imbalance_cat = calculate_mutual_information(df, target_column="target")
    assert imbalance_cat is not None
    assert "A" in imbalance_cat
    assert "B" in imbalance_cat
    assert imbalance_cat["A"] == 50.0
    assert imbalance_cat["B"] == 50.0
