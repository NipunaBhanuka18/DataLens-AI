from typing import Dict, Any
from langgraph.graph import StateGraph, START, END

from app.core.graph_state import GraphState
from app.models.dataset import AnalysisState
from app.agents.quality_agent import quality_agent_node
from app.agents.eda_agent import eda_agent_node
from app.agents.visualization_agent import visualization_agent_node
from app.agents.insight_agent import insight_agent_node
from app.agents.ds_consultant import ds_consultant_node


def build_agent_graph() -> Any:
    """
    Constructs and compiles the parallel LangGraph StateGraph:
    - Parallel Fan-Out: START -> quality_agent, eda_agent, visualization_agent, ds_consultant
    - Fan-In: quality, eda, visualization -> insight_agent -> END
    - ds_consultant -> END
    """
    workflow = StateGraph(GraphState)

    # 1. Add Agent Nodes
    workflow.add_node("quality_agent", quality_agent_node)
    workflow.add_node("eda_agent", eda_agent_node)
    workflow.add_node("visualization_agent", visualization_agent_node)
    workflow.add_node("insight_agent", insight_agent_node)
    workflow.add_node("ds_consultant", ds_consultant_node)

    # 2. Add Parallel Fan-Out Edges from START
    workflow.add_edge(START, "quality_agent")
    workflow.add_edge(START, "eda_agent")
    workflow.add_edge(START, "visualization_agent")
    workflow.add_edge(START, "ds_consultant")

    # 3. Fan-In to Insight Agent once quality, eda, and visualization complete
    workflow.add_edge("quality_agent", "insight_agent")
    workflow.add_edge("eda_agent", "insight_agent")
    workflow.add_edge("visualization_agent", "insight_agent")

    # 4. Terminal Edges to END
    workflow.add_edge("insight_agent", END)
    workflow.add_edge("ds_consultant", END)

    return workflow.compile()


# Singleton compiled graph instance
dataset_agent_graph = build_agent_graph()


def run_dataset_agent_workflow(analysis_state: AnalysisState, persona: str = "professional") -> Dict[str, Any]:
    """
    Runs the compiled LangGraph workflow using deterministic metrics extracted from AnalysisState.

    :param analysis_state: AnalysisState model instance from Phase 2.
    :param persona: Persona mode for AI tone ("professional", "roast", "executive").
    :return: Final GraphState dictionary containing quality_report, eda_findings, visualizations, final_insights, consultant_report.
    """
    quality_dict = analysis_state.quality_metrics.model_dump() if analysis_state.quality_metrics else {}
    stats_dict = (
        {col: stats.model_dump() for col, stats in analysis_state.column_statistics.items()}
        if analysis_state.column_statistics
        else {}
    )

    initial_graph_state: GraphState = {
        "dataset_metadata": {
            "row_count": analysis_state.row_count,
            "column_count": analysis_state.column_count,
            "filename": analysis_state.filename
        },
        "quality_metrics": quality_dict,
        "statistics": stats_dict,
        "quality_report": None,
        "eda_findings": None,
        "visualizations": [],
        "final_insights": None,
        "persona": persona,
        "target_column": analysis_state.target_column,
        "target_imbalance_ratio": analysis_state.target_imbalance_ratio,
        "consultant_report": None,
        "trace_logs": [],
    }

    final_state = dataset_agent_graph.invoke(initial_graph_state)
    return final_state
