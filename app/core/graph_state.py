from typing import TypedDict, Dict, Any, List, Optional


class GraphState(TypedDict):
    """
    LangGraph state passing deterministic metrics and agent text/structured outputs
    between workflow nodes.
    """
    dataset_metadata: Dict[str, Any]
    quality_metrics: Dict[str, Any]
    statistics: Dict[str, Any]
    quality_report: Optional[str]
    eda_findings: Optional[str]
    visualizations: List[Dict[str, Any]]
    final_insights: Optional[str]
    persona: Optional[str]
    target_column: Optional[str]
    target_imbalance_ratio: Optional[Dict[str, float]]
    consultant_report: Optional[Dict[str, Any]]
    trace_logs: List[str]


