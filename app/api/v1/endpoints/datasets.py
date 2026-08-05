import glob
import os
import uuid
from typing import Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Body, Query
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.dataset import UploadResponse, AnalysisResponse, InsightsResponse
from app.models.visualization_schema import VisualizationConfig
from app.services.dataset_parser import parse_dataset_stream, create_initial_analysis_state

from app.services.quality_analyzer import analyze_data_quality
from app.services.statistics_service import compute_column_statistics
from app.services.health_score import calculate_health_score
from app.services.chat_agent import generate_chat_chart

router = APIRouter()


class ChatChartRequest(BaseModel):
    query: str = Field(..., description="Natural language query requesting a custom visualization")


@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and parse dataset",
    description="Uploads a CSV or XLSX file, saves it to temporary storage, and returns basic dataset intelligence."
)
async def upload_dataset(file: UploadFile = File(...)) -> UploadResponse:
    """
    Accepts dataset uploads, persists bytes temporarily, and returns initial metadata.
    """
    file_bytes = await file.read()
    intelligence, _ = parse_dataset_stream(file_bytes=file_bytes, filename=file.filename)
    
    dataset_id = f"ds_{uuid.uuid4().hex[:12]}"
    _, ext = os.path.splitext(file.filename.lower())
    
    # Save file to temporary uploads folder
    temp_dir = settings.ensure_temp_dir()
    save_path = os.path.join(temp_dir, f"{dataset_id}{ext}")
    with open(save_path, "wb") as f:
        f.write(file_bytes)
    
    return UploadResponse(
        success=True,
        message=f"Successfully uploaded '{file.filename}'. Use /datasets/{dataset_id}/analyze for deep intelligence.",
        dataset_id=dataset_id,
        metadata=intelligence
    )


@router.post(
    "/{dataset_id}/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze dataset intelligence",
    description="Executes Data Quality Analyzer, Statistics Service, Outlier Detection, and Health Score Engine on saved dataset."
)
async def analyze_dataset(dataset_id: str, target_column: Optional[str] = Query(None)) -> AnalysisResponse:
    """
    Triggers deep Polars-based dataset analysis for missing values, duplicates, outliers, statistics, and health score.
    """
    temp_dir = settings.ensure_temp_dir()
    pattern = os.path.join(temp_dir, f"{dataset_id}.*")
    matches = glob.glob(pattern)
    
    if not matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found or session expired."
        )
    
    file_path = matches[0]
    filename = os.path.basename(file_path)
    
    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read dataset file '{filename}': {str(exc)}"
        ) from exc

    intelligence, df = parse_dataset_stream(file_bytes=file_bytes, filename=filename)
    
    # 1. Quality Analysis
    quality_metrics = analyze_data_quality(df)
    
    # 2. Statistics, Outliers & Advanced ML Heuristics
    column_statistics, target_imbalance = compute_column_statistics(df, target_column=target_column)
    
    # 3. Health Score
    health_score = calculate_health_score(df, quality_metrics, column_statistics)
    
    # 4. Build AnalysisState
    state = create_initial_analysis_state(
        dataset_id=dataset_id,
        filename=filename,
        intelligence=intelligence,
        df=df
    )
    state.quality_metrics = quality_metrics
    state.column_statistics = column_statistics
    state.health_score = health_score
    state.target_column = target_column or (df.columns[-1] if len(df.columns) > 1 else None)
    state.target_imbalance_ratio = target_imbalance
    state.current_step = "analyzed"

    return AnalysisResponse(
        success=True,
        message=f"Deep analysis completed for dataset '{dataset_id}'.",
        state=state
    )


class InsightsRequestPayload(BaseModel):
    persona: str = Field("professional", description="Persona mode: 'professional' | 'roast' | 'executive'")
    target_column: Optional[str] = Field(None, description="Optional target column for ML readiness correlation")


@router.post(
    "/{dataset_id}/insights",
    response_model=InsightsResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate AI insights & visualization configs",
    description="Invokes the LangGraph Agent workflow (Quality -> EDA -> Visualization -> Insight) to generate AI reports and Plotly schemas."
)
async def generate_dataset_insights(dataset_id: str, payload: Optional[InsightsRequestPayload] = Body(default=None)) -> InsightsResponse:
    """
    Executes the multi-agent LangGraph workflow over deterministic dataset intelligence.
    """
    persona = payload.persona if payload else "professional"
    target_col = payload.target_column if payload else None

    temp_dir = settings.ensure_temp_dir()
    pattern = os.path.join(temp_dir, f"{dataset_id}.*")
    matches = glob.glob(pattern)
    
    if not matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found or session expired."
        )
    
    file_path = matches[0]
    filename = os.path.basename(file_path)
    
    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read dataset file '{filename}': {str(exc)}"
        ) from exc

    intelligence, df = parse_dataset_stream(file_bytes=file_bytes, filename=filename)
    quality_metrics = analyze_data_quality(df)
    column_statistics, target_imbalance = compute_column_statistics(df, target_column=target_col)
    health_score = calculate_health_score(df, quality_metrics, column_statistics)
    
    state = create_initial_analysis_state(
        dataset_id=dataset_id,
        filename=filename,
        intelligence=intelligence,
        df=df
    )
    state.quality_metrics = quality_metrics
    state.column_statistics = column_statistics
    state.health_score = health_score
    state.target_column = target_col or (df.columns[-1] if len(df.columns) > 1 else None)
    state.target_imbalance_ratio = target_imbalance
    state.current_step = "insights_generated"

    # Invoke LangGraph Workflow with persona
    from app.services.graph_workflow import run_dataset_agent_workflow
    agent_output = run_dataset_agent_workflow(state, persona=persona)


    return InsightsResponse(
        success=True,
        message=f"AI Agent workflow completed successfully for dataset '{dataset_id}'.",
        dataset_id=dataset_id,
        quality_report=agent_output.get("quality_report") or "",
        eda_findings=agent_output.get("eda_findings") or "",
        visualizations=agent_output.get("visualizations") or [],
        final_insights=agent_output.get("final_insights") or "",
        consultant_report=agent_output.get("consultant_report"),
        trace_logs=agent_output.get("trace_logs") or [],
    )


@router.post(
    "/{dataset_id}/chat-chart",
    response_model=VisualizationConfig,
    status_code=status.HTTP_200_OK,
    summary="Chat-to-Chart AI Visualization Generator",
    description="Generates a single custom Plotly VisualizationConfig based on natural language prompt and dataset schema/statistics."
)
async def chat_to_chart(dataset_id: str, request: ChatChartRequest) -> VisualizationConfig:
    temp_dir = settings.ensure_temp_dir()
    pattern = os.path.join(temp_dir, f"{dataset_id}.*")
    matches = glob.glob(pattern)

    if not matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found or session expired."
        )

    file_path = matches[0]
    filename = os.path.basename(file_path)

    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read dataset file '{filename}': {str(exc)}"
        ) from exc

    intelligence, df = parse_dataset_stream(file_bytes=file_bytes, filename=filename)
    column_statistics, _ = compute_column_statistics(df)

    state_dict = {
        "dataset_id": dataset_id,
        "filename": filename,
        "columns": [col.model_dump() for col in intelligence.columns],
        "column_statistics": {k: v.model_dump() for k, v in column_statistics.items()},
    }

    viz_config = generate_chat_chart(query=request.query, state=state_dict)
    return viz_config


# ── Decision Simulator ────────────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    feature_name: str = Field(..., description="Column name to simulate a preprocessing decision for.")
    suggested_action: str = Field(
        ...,
        description="Action type: 'scaler_choice' | 'imputation_strategy' | 'outlier_handling'",
    )


@router.post(
    "/{dataset_id}/simulate",
    status_code=status.HTTP_200_OK,
    summary="Decision Simulator",
    description=(
        "Runs a deterministic side-by-side comparison of two preprocessing paths "
        "(naive vs recommended) for a specific feature, driven entirely by the column's "
        "measured statistics. Returns structured SimulationResult."
    ),
)
async def simulate_decision(dataset_id: str, request: SimulateRequest):
    from app.services.simulator import run_simulation

    temp_dir = settings.ensure_temp_dir()
    pattern  = os.path.join(temp_dir, f"{dataset_id}.*")
    matches  = glob.glob(pattern)

    if not matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset '{dataset_id}' not found or session expired.",
        )

    file_path = matches[0]
    filename  = os.path.basename(file_path)

    try:
        with open(file_path, "rb") as f:
            file_bytes = f.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read dataset file '{filename}': {str(exc)}",
        ) from exc

    intelligence, df = parse_dataset_stream(file_bytes=file_bytes, filename=filename)
    column_statistics, _ = compute_column_statistics(df)

    feature = request.feature_name
    if feature not in column_statistics:
        available = list(column_statistics.keys())
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Feature '{feature}' not found in dataset. "
                f"Available columns: {available[:10]}"
            ),
        )

    col_stat   = column_statistics[feature].model_dump()
    total_rows = intelligence.row_count

    result = run_simulation(
        col_name=feature,
        suggested_action=request.suggested_action,
        col_stat=col_stat,
        total_rows=total_rows,
    )
    return result.model_dump()
