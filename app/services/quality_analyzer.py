import polars as pl
from app.models.dataset import DataQualityMetrics


def analyze_data_quality(df: pl.DataFrame) -> DataQualityMetrics:
    """
    Computes data quality metrics using Polars: duplicate rows, null counts,
    constant columns, and high-cardinality non-numeric columns.

    :param df: Polars DataFrame to analyze.
    :return: DataQualityMetrics Pydantic model.
    """
    total_rows = df.height
    if total_rows == 0:
        return DataQualityMetrics(
            total_duplicate_rows=0,
            duplicate_percentage=0.0,
            null_counts_per_column={col: 0 for col in df.columns},
            constant_columns=[],
            high_cardinality_columns=[]
        )

    # 1. Duplicate rows count
    total_duplicates = int(df.is_duplicated().sum())
    duplicate_pct = round((total_duplicates / total_rows) * 100.0, 2)

    # 2. Null counts per column via Polars null_count()
    null_counts_df = df.null_count()
    null_counts: dict[str, int] = {
        col: int(null_counts_df[col][0])
        for col in df.columns
    }

    # 3. Constant columns & High cardinality columns
    constant_cols: list[str] = []
    high_cardinality_cols: list[str] = []

    for col_name, dtype in df.schema.items():
        n_unique = int(df[col_name].n_unique())
        
        # Constant column check
        if n_unique <= 1:
            constant_cols.append(col_name)
        
        # High cardinality check for string / categorical columns
        if dtype in {pl.String, pl.Categorical, pl.Object} and total_rows > 5:
            distinct_ratio = n_unique / total_rows
            if distinct_ratio > 0.8:
                high_cardinality_cols.append(col_name)

    return DataQualityMetrics(
        total_duplicate_rows=total_duplicates,
        duplicate_percentage=duplicate_pct,
        null_counts_per_column=null_counts,
        constant_columns=constant_cols,
        high_cardinality_columns=high_cardinality_cols
    )
