from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class ChartType(str, Enum):
    BAR = "bar"
    LINE = "line"
    SCATTER = "scatter"
    HISTOGRAM = "histogram"
    BOX = "box"
    PIE = "pie"


class VisualizationConfig(BaseModel):
    title: str = Field(..., description="Clear title describing what the chart displays")
    chart_type: ChartType = Field(..., description="Recommended Plotly chart type")
    x_column: str = Field(..., description="Column name mapped to X-axis or main dimension")
    y_column: Optional[str] = Field(None, description="Optional column name mapped to Y-axis for bivariate charts")
    color_column: Optional[str] = Field(None, description="Optional column name mapped to color grouping")
    description: str = Field(..., description="Explanation of why this chart is valuable for EDA")
    justification: str = Field(..., description="1-2 sentence explanation of why this specific chart type and columns were chosen")



class VisualizationList(BaseModel):
    """
    Wrapper schema used with LLM .with_structured_output() to return a strict list of chart configs.
    """
    charts: List[VisualizationConfig] = Field(
        ...,
        min_length=1,
        max_length=4,
        description="Top 3 to 4 recommended visualization configurations"
    )

