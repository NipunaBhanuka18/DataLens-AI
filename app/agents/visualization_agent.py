from typing import Dict, Any, List
from app.core.graph_state import GraphState
from app.models.visualization_schema import VisualizationList, VisualizationConfig, ChartType
from app.services.llm_factory import get_llm_model


def visualization_agent_node(state: GraphState) -> Dict[str, Any]:
    """
    Visualization Agent Node: Selects the top 3-4 most valuable Plotly visualizations
    using structured outputs (.with_structured_output), providing a clear design rationale
    (justification) for each chart selection.
    """
    stats = state.get("statistics", {})
    existing_logs: list = list(state.get("trace_logs") or [])
    llm = get_llm_model()

    num_cols = [c for c, s in stats.items() if s.get("numeric") is not None]
    cat_cols = [c for c, s in stats.items() if s.get("categorical") is not None]
    node_logs: list = [f"✓ Visualization Agent: Selecting optimal charts for {len(num_cols)} numeric and {len(cat_cols)} categorical features."]

    if llm is not None and (num_cols or cat_cols):
        summary_info = f"Numeric columns: {num_cols}\nCategorical columns: {cat_cols}"
        prompt = (
            f"You are an expert Data Visualization Architect.\n"
            f"Dataset Columns:\n{summary_info}\n\n"
            f"Task: Recommend the 3 to 4 most informative charts for an interactive executive dashboard.\n"
            f"Use valid column names from the dataset and select appropriate Plotly chart types.\n"
            f"For every chart, provide a concise 1-2 sentence 'justification' explaining why that specific chart type "
            f"and variables were chosen based on their data types (e.g. 'A scatter plot was selected because Age and Income "
            f"are continuous numerical variables, making it ideal for identifying non-linear correlations.')."
        )
        try:
            structured_llm = llm.with_structured_output(VisualizationList)
            result = structured_llm.invoke(prompt)
            if result and isinstance(result, VisualizationList):
                charts_json = [chart.model_dump() for chart in result.charts]
                chart_desc = ", ".join(f"{c.chart_type} ({c.x_column})" for c in result.charts[:3])
                node_logs.append(f"✓ Visualization Agent: LLM selected {len(result.charts)} charts — {chart_desc}.")
                return {"visualizations": charts_json, "trace_logs": existing_logs + node_logs}
        except Exception:
            pass

    # Deterministic Fallback Chart Generator with Justifications
    fallback_charts: List[VisualizationConfig] = []

    # 1. Bar chart for top categorical column
    if cat_cols:
        fallback_charts.append(
            VisualizationConfig(
                title=f"Distribution of {cat_cols[0]}",
                chart_type=ChartType.BAR,
                x_column=cat_cols[0],
                y_column=None,
                color_column=None,
                description=f"Frequency distribution across distinct categories in {cat_cols[0]}.",
                justification=f"A bar chart was selected because '{cat_cols[0]}' is a categorical variable, making discrete category frequency comparison clear and intuitive."
            )
        )

    # 2. Histogram for top numeric column
    if num_cols:
        fallback_charts.append(
            VisualizationConfig(
                title=f"Histogram of {num_cols[0]}",
                chart_type=ChartType.HISTOGRAM,
                x_column=num_cols[0],
                y_column=None,
                color_column=None,
                description=f"Distribution spread and variance for {num_cols[0]}.",
                justification=f"A histogram was selected because '{num_cols[0]}' is a continuous numerical feature, allowing binning to reveal distribution skewness and central tendencies."
            )
        )

    # 3. Scatter plot if at least 2 numeric columns
    if len(num_cols) >= 2:
        fallback_charts.append(
            VisualizationConfig(
                title=f"{num_cols[0]} vs {num_cols[1]} Scatter Analysis",
                chart_type=ChartType.SCATTER,
                x_column=num_cols[0],
                y_column=num_cols[1],
                color_column=cat_cols[0] if cat_cols else None,
                description=f"Bivariate relationship analysis between {num_cols[0]} and {num_cols[1]}.",
                justification=f"A scatter plot was selected because both '{num_cols[0]}' and '{num_cols[1]}' are continuous numeric variables, enabling direct visual inspection of linear or non-linear correlations."
            )
        )
    elif len(num_cols) >= 1 and len(cat_cols) >= 2:
        # Box plot of numeric by second categorical
        fallback_charts.append(
            VisualizationConfig(
                title=f"{num_cols[0]} by {cat_cols[1]}",
                chart_type=ChartType.BOX,
                x_column=cat_cols[1],
                y_column=num_cols[0],
                color_column=None,
                description=f"Boxplot showing spread of {num_cols[0]} across {cat_cols[1]} categories.",
                justification=f"A box plot was selected to compare the statistical median and quartile spread of continuous feature '{num_cols[0]}' across discrete '{cat_cols[1]}' categories."
            )
        )

    # 4. Secondary Histogram or Box chart if needed to reach 3
    if len(fallback_charts) < 3 and len(num_cols) > 1:
        fallback_charts.append(
            VisualizationConfig(
                title=f"Boxplot of {num_cols[1]}",
                chart_type=ChartType.BOX,
                x_column=num_cols[1],
                y_column=None,
                color_column=None,
                description=f"Outlier and quartile breakdown for {num_cols[1]}.",
                justification=f"A box plot was selected to highlight interquartile ranges and potential 3-sigma statistical outliers in numerical column '{num_cols[1]}'."
            )
        )

    charts_json = [chart.model_dump() for chart in fallback_charts]
    for c in fallback_charts:
        node_logs.append(f"✓ Visualization Agent: Selected {c.chart_type.upper()} chart — '{c.title}'.")
    return {"visualizations": charts_json, "trace_logs": existing_logs + node_logs}
