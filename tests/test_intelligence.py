import polars as pl
from fastapi.testclient import TestClient
from main import app
from app.services.quality_analyzer import analyze_data_quality
from app.services.statistics_service import compute_column_statistics
from app.services.health_score import calculate_health_score

client = TestClient(app)


def test_quality_analyzer_unit():
    df = pl.DataFrame({
        "id": [1, 2, 2, 3, 4],
        "category": ["A", "B", "B", "C", "D"],
        "constant_col": [1, 1, 1, 1, 1],
        "value": [10.0, 10.0, 10.0, 100.0, 50.0]  # rows 1 and 2 are exact duplicates
    })
    
    quality = analyze_data_quality(df)
    assert quality.total_duplicate_rows == 2  # Polars flags both matching rows in is_duplicated()
    assert quality.constant_columns == ["constant_col"]
    assert "value" in quality.null_counts_per_column


def test_statistics_and_health_score_unit():
    # 24 normal values + 1 extreme outlier (1000.0) allows z-score > 3.0
    scores = [10.0] * 24 + [1000.0]
    cities = ["NYC"] * 10 + ["LA"] * 10 + ["Chicago"] * 5
    df = pl.DataFrame({
        "score": scores,
        "city": cities
    })

    
    quality = analyze_data_quality(df)
    stats, _ = compute_column_statistics(df)
    
    assert "score" in stats
    assert stats["score"].numeric is not None
    assert stats["score"].numeric.mean is not None
    assert stats["score"].numeric.outlier_count >= 1
    
    assert "city" in stats
    assert stats["city"].categorical is not None
    assert stats["city"].categorical.unique_count == 3
    
    health = calculate_health_score(df, quality, stats)
    assert 0.0 <= health.overall_score <= 100.0
    assert health.completeness_score == 100.0


def test_upload_and_analyze_integration():
    csv_bytes = (
        b"id,name,salary,department,constant_flag\n"
        b"1,Alice,70000,Engineering,YES\n"
        b"2,Bob,80000,Engineering,YES\n"
        b"3,Charlie,75000,Marketing,YES\n"
        b"4,David,,Marketing,YES\n"  # missing salary
        b"4,David,,Marketing,YES\n"  # duplicate row
    )
    
    # 1. Upload dataset
    upload_res = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("company.csv", csv_bytes, "text/csv")}
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    dataset_id = upload_data["dataset_id"]
    
    # 2. Trigger analysis
    analyze_res = client.post(f"/api/v1/datasets/{dataset_id}/analyze")
    assert analyze_res.status_code == 200
    
    data = analyze_res.json()
    assert data["success"] is True
    state = data["state"]
    
    assert state["dataset_id"] == dataset_id
    assert state["current_step"] == "analyzed"
    assert state["quality_metrics"]["total_duplicate_rows"] == 2
    assert state["quality_metrics"]["constant_columns"] == ["constant_flag"]
    assert state["column_statistics"]["salary"]["numeric"]["null_count"] == 2
    
    health = state["health_score"]
    assert 0.0 <= health["overall_score"] <= 100.0
    assert len(health["deductions"]) > 0



def test_analyze_non_existent_dataset():
    response = client.post("/api/v1/datasets/ds_invalid12345/analyze")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]
