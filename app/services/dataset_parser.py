import io
import os
from typing import Tuple
import polars as pl
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.dataset import DatasetIntelligence, ColumnMetadata, AnalysisState


def parse_dataset_stream(file_bytes: bytes, filename: str) -> Tuple[DatasetIntelligence, pl.DataFrame]:
    """
    Parses uploaded file bytes using Polars and extracts core dataset intelligence.

    :param file_bytes: Raw bytes of uploaded file.
    :param filename: Name of the original file to infer extension.
    :return: A tuple of (DatasetIntelligence, pl.DataFrame).
    :raises HTTPException: If file extension is unsupported or content is corrupted/unparseable.
    """
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    _, ext = os.path.splitext(filename.lower())
    if ext not in settings.ALLOWED_EXTENSIONS:
        allowed = ", ".join(settings.ALLOWED_EXTENSIONS)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed extensions are: {allowed}"
        )

    try:
        bytes_io = io.BytesIO(file_bytes)
        if ext == ".csv":
            df = pl.read_csv(bytes_io)
        elif ext in {".xlsx", ".xls"}:
            df = pl.read_excel(bytes_io)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{ext}'."
            )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse dataset '{filename}'. Ensure file is a valid CSV or Excel spreadsheet. Error: {str(exc)}"
        ) from exc

    columns_metadata = [
        ColumnMetadata(name=col_name, data_type=str(dtype))
        for col_name, dtype in df.schema.items()
    ]

    intelligence = DatasetIntelligence(
        row_count=df.height,
        column_count=df.width,
        columns=columns_metadata
    )

    return intelligence, df


def create_initial_analysis_state(
    dataset_id: str,
    filename: str,
    intelligence: DatasetIntelligence,
    df: pl.DataFrame,
    sample_rows: int = 5
) -> AnalysisState:
    """
    Constructs an initial AnalysisState object suitable for downstream agent orchestration.
    """
    preview = df.head(sample_rows).to_dicts()
    return AnalysisState(
        dataset_id=dataset_id,
        filename=filename,
        row_count=intelligence.row_count,
        column_count=intelligence.column_count,
        columns=intelligence.columns,
        preview_data=preview,
        current_step="dataset_loaded"
    )
