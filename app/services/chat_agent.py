from typing import Dict, Any, List
from app.models.visualization_schema import VisualizationConfig, ChartType
from app.services.llm_factory import get_llm_model


def generate_chat_chart(query: str, state: Dict[str, Any]) -> VisualizationConfig:
    """
    Chat-to-Chart AI Service: Takes a natural language user query and dataset metadata/statistics,
    and returns exactly ONE structured VisualizationConfig using LLM .with_structured_output().
    """
    stats = state.get("column_statistics", {}) or state.get("statistics", {})
    columns = state.get("columns", [])

    num_cols: List[str] = []
    cat_cols: List[str] = []

    if isinstance(columns, list) and len(columns) > 0:
        for c in columns:
            c_name = c.get("name") if isinstance(c, dict) else getattr(c, "name", str(c))
            c_type = c.get("data_type") if isinstance(c, dict) else getattr(c, "data_type", "")
            if any(t in str(c_type).lower() for t in ["int", "float", "double", "decimal", "numeric"]):
                num_cols.append(c_name)
            else:
                cat_cols.append(c_name)
    elif isinstance(stats, dict) and len(stats) > 0:
        num_cols = [c for c, s in stats.items() if isinstance(s, dict) and s.get("numeric") is not None]
        cat_cols = [c for c, s in stats.items() if isinstance(s, dict) and s.get("categorical") is not None]

    all_cols = num_cols + cat_cols
    llm = get_llm_model()

    if llm is not None and all_cols:
        summary_info = f"Numeric Columns: {num_cols}\nCategorical Columns: {cat_cols}"
        prompt = (
            f"You are an expert AI Data Visualization Assistant.\n\n"
            f"Dataset Columns:\n{summary_info}\n\n"
            f"User Natural Language Request: '{query}'\n\n"
            f"Task: Generate EXACTLY ONE Plotly chart configuration that answers the user's question.\n"
            f"1. You MUST use exact column names from the dataset list above.\n"
            f"2. Choose the optimal chart_type from: bar, line, scatter, histogram, box, pie.\n"
            f"3. Provide a clear title and description explaining the chart.\n"
            f"4. Provide a 1-2 sentence 'justification' explaining why this specific chart type and variables were chosen."
        )

        try:
            structured_llm = llm.with_structured_output(VisualizationConfig)
            result = structured_llm.invoke(prompt)
            if result and isinstance(result, VisualizationConfig):
                return result
        except Exception as e:
            print(f"[ChatAgent] LLM structured output warning: {e}")

    # Deterministic Intelligent Fallback
    query_lower = query.lower()
    matched_cols = [c for c in all_cols if c.lower() in query_lower]

    x_col = matched_cols[0] if len(matched_cols) >= 1 else (cat_cols[0] if cat_cols else (num_cols[0] if num_cols else "Value"))
    y_col = matched_cols[1] if len(matched_cols) >= 2 else (num_cols[0] if num_cols and matched_cols and matched_cols[0] != num_cols[0] else None)

    chart_type = ChartType.BAR
    if "line" in query_lower or "trend" in query_lower or "over time" in query_lower:
        chart_type = ChartType.LINE
    elif "scatter" in query_lower or "correlation" in query_lower or "relationship" in query_lower:
        chart_type = ChartType.SCATTER
    elif "histogram" in query_lower or "distribution" in query_lower or "spread" in query_lower:
        chart_type = ChartType.HISTOGRAM
    elif "box" in query_lower or "outlier" in query_lower:
        chart_type = ChartType.BOX
    elif "pie" in query_lower or "proportion" in query_lower or "percentage" in query_lower:
        chart_type = ChartType.PIE

    return VisualizationConfig(
        title=f"AI Generated: {query.capitalize()}",
        chart_type=chart_type,
        x_column=x_col,
        y_column=y_col,
        color_column=None,
        description=f"Custom chart generated for query: '{query}'.",
        justification=f"Chart selected for natural language query '{query}' mapping feature '{x_col}'."
    )
