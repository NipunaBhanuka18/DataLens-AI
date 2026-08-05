from fastapi.testclient import TestClient
from main import app
from app.services.graph_workflow import run_dataset_agent_workflow, dataset_agent_graph
from app.models.dataset import AnalysisState, DataQualityMetrics, ColumnStatistics, NumericColumnStats, CategoricalColumnStats

client = TestClient(app)


def test_agent_graph_compilation():
    assert dataset_agent_graph is not None


def test_agent_workflow_unit():
    quality = DataQualityMetrics(
        total_duplicate_rows=0,
        duplicate_percentage=0.0,
        null_counts_per_column={"sales": 5, "region": 0},
        constant_columns=[],
        high_cardinality_columns=[]
    )
    col_stats = {
        "sales": ColumnStatistics(
            data_type="Float64",
            numeric=NumericColumnStats(
                mean=150.5, std=45.2, min=20.0, max=500.0, skewness=1.2,
                null_count=5, outlier_count=2, outlier_percentage=4.0
            ),
            categorical=None
        ),
        "region": ColumnStatistics(
            data_type="String",
            numeric=None,
            categorical=CategoricalColumnStats(
                unique_count=4,
                top_categories={"North": 25, "South": 20, "East": 15, "West": 10},
                null_count=0
            )
        )
    }

    state = AnalysisState(
        dataset_id="ds_test123",
        filename="sales_data.csv",
        row_count=75,
        column_count=2,
        quality_metrics=quality,
        column_statistics=col_stats
    )

    output = run_dataset_agent_workflow(state)

    assert "quality_report" in output and len(output["quality_report"]) > 0
    assert "eda_findings" in output and len(output["eda_findings"]) > 0
    assert "visualizations" in output and len(output["visualizations"]) >= 1
    assert "final_insights" in output and len(output["final_insights"]) > 0

    # Verify Plotly visualization schema fields
    chart = output["visualizations"][0]
    assert "title" in chart
    assert "chart_type" in chart
    assert "x_column" in chart


def test_insights_endpoint_integration():
    csv_bytes = (
        b"age,salary,department\n"
        b"25,50000,Engineering\n"
        b"30,65000,Engineering\n"
        b"45,120000,Management\n"
        b"35,80000,Marketing\n"
    )

    # 1. Upload
    up_res = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("employees.csv", csv_bytes, "text/csv")}
    )
    assert up_res.status_code == 201
    dataset_id = up_res.json()["dataset_id"]

    # 2. Get Insights via LangGraph agent workflow
    ins_res = client.post(f"/api/v1/datasets/{dataset_id}/insights")
    assert ins_res.status_code == 200
    data = ins_res.json()

    assert data["success"] is True
    assert data["dataset_id"] == dataset_id
    assert len(data["quality_report"]) > 0
    assert len(data["eda_findings"]) > 0
    assert isinstance(data["visualizations"], list)
    assert len(data["visualizations"]) >= 1
    assert len(data["final_insights"]) > 0
