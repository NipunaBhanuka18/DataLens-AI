import io
import polars as pl
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_upload_valid_csv():
    csv_content = b"id,name,age,salary,is_active\n1,Alice,30,75000.50,true\n2,Bob,25,50000.00,false\n3,Charlie,35,110000.25,true\n"
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("test_data.csv", csv_content, "text/csv")}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["dataset_id"].startswith("ds_")
    assert data["metadata"]["row_count"] == 3
    assert data["metadata"]["column_count"] == 5
    
    col_names = [col["name"] for col in data["metadata"]["columns"]]
    assert col_names == ["id", "name", "age", "salary", "is_active"]


def test_upload_invalid_extension():
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("data.txt", b"some text content", "text/plain")}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_upload_corrupted_csv():
    # Attempting to parse bad CSV byte stream or empty file
    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("corrupted.csv", b"", "text/csv")}
    )
    assert response.status_code == 400
    assert "Uploaded file is empty" in response.json()["detail"]


def test_upload_valid_excel():
    import io
    df = pl.DataFrame({
        "product": ["Widget A", "Widget B"],
        "price": [19.99, 29.99],
        "stock": [100, 200]
    })
    buffer = io.BytesIO()
    df.write_excel(buffer)
    excel_bytes = buffer.getvalue()

    response = client.post(
        "/api/v1/datasets/upload",
        files={"file": ("inventory.xlsx", excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["metadata"]["row_count"] == 2
    assert data["metadata"]["column_count"] == 3
    col_names = [col["name"] for col in data["metadata"]["columns"]]
    assert col_names == ["product", "price", "stock"]

