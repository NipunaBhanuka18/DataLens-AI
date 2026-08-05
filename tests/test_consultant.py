import pytest
import numpy as np
import polars as pl
from app.models.dataset import AnalysisState, ColumnStatistics, NumericColumnStats, DataQualityMetrics
from app.services.modeling_readiness import (
    calculate_modeling_readiness_score,
    calculate_modeling_readiness_from_state,
)
from app.agents.ds_consultant import ds_consultant_node


def test_modeling_readiness_score_calculation():
    # Construct an AnalysisState with multicollinearity and high MI leakage
    col_stats = {
        "x1": ColumnStatistics(
            data_type="Float64",
            numeric=NumericColumnStats(
                mean=10.0, std=2.0, min=0.0, max=20.0, skewness=0.1,
                null_count=0, vif_score=14.5, is_normal_distribution=True
            ),
            mutual_info_score=0.95  # High leakage > 0.90
        ),
        "target": ColumnStatistics(
            data_type="Int64",
            numeric=NumericColumnStats(
                mean=1.0, std=0.5, min=0.0, max=1.0, skewness=0.0,
                null_count=0, vif_score=1.0, is_normal_distribution=False
            )
        )
    }

    state = AnalysisState(
        dataset_id="ds_test",
        filename="test.csv",
        row_count=5,
        column_count=20,  # Row/Col ratio = 5/20 = 0.25 < 10 (Curse of dimensionality)
        column_statistics=col_stats,
        target_column="target",
        target_imbalance_ratio={"0": 96.0, "1": 4.0},  # Severe imbalance < 5%
        current_step="tested"
    )

    score, level, deductions = calculate_modeling_readiness_from_state(state)

    assert score < 70.0
    assert level in {"NEEDS_WORK", "HIGH_RISK"}
    assert len(deductions) >= 3


def test_ds_consultant_node_execution():
    col_stats = {
        "age": {
            "data_type": "Float64",
            "numeric": {
                "mean": 35.0, "std": 10.0, "min": 18.0, "max": 65.0, "skewness": 0.2,
                "null_count": 0, "vif_score": 1.1, "is_normal_distribution": True
            },
            "mutual_info_score": 0.25
        },
        "salary": {
            "data_type": "Float64",
            "numeric": {
                "mean": 75000.0, "std": 35000.0, "min": 25000.0, "max": 300000.0, "skewness": 2.5,
                "null_count": 0, "vif_score": 12.8, "is_normal_distribution": False
            },
            "mutual_info_score": 0.45
        },
        "purchased": {
            "data_type": "Int64",
            "numeric": {
                "mean": 0.3, "std": 0.4, "min": 0.0, "max": 1.0, "skewness": 0.0,
                "null_count": 0, "vif_score": 1.0, "is_normal_distribution": False
            }
        }
    }

    graph_state = {
        "dataset_metadata": {"row_count": 1000, "column_count": 3, "filename": "customers.csv"},
        "quality_metrics": {"total_duplicate_rows": 0, "null_counts_per_column": {}},
        "statistics": col_stats,
        "quality_report": "Good health",
        "eda_findings": "Normal age, skewed salary",
        "visualizations": [],
        "final_insights": "Ready for baseline",
        "persona": "professional",
        "target_column": "purchased",
        "target_imbalance_ratio": {"0": 70.0, "1": 30.0},
        "consultant_report": None
    }

    result = ds_consultant_node(graph_state)

    assert "consultant_report" in result
    report = result["consultant_report"]
    assert "ml_problem_type" in report
    assert "model_readiness_score" in report
    assert "recommended_baseline_models" in report
    assert len(report["recommendations"]) > 0
