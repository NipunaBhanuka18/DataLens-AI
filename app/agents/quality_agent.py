from typing import Dict, Any
from app.core.graph_state import GraphState
from app.services.llm_factory import get_llm_model


def quality_agent_node(state: GraphState) -> Dict[str, Any]:
    """
    Quality Agent Node: Evaluates data quality metrics and generates a human-readable summary
    of data health, missingness, and structural anomalies.
    """
    metadata = state.get("dataset_metadata", {})
    quality = state.get("quality_metrics", {})
    existing_logs: list = list(state.get("trace_logs") or [])

    rows = metadata.get("row_count", 0)
    cols = metadata.get("column_count", 0)
    duplicates = quality.get("total_duplicate_rows", 0)
    dup_pct = quality.get("duplicate_percentage", 0.0)
    nulls = quality.get("null_counts_per_column", {})
    constant = quality.get("constant_columns", [])
    cardinality = quality.get("high_cardinality_columns", [])

    # Build trace log entries for this node
    node_logs: list = []
    node_logs.append(f"✓ Quality Agent: Ingested {rows:,} rows × {cols} columns via Polars zero-copy engine.")
    if duplicates > 0:
        node_logs.append(f"⚠ Quality Agent: Detected {duplicates:,} duplicate rows ({dup_pct:.1f}% of dataset).")
    else:
        node_logs.append("✓ Quality Agent: Zero duplicate rows — dataset uniqueness confirmed.")
    missing_cols = [c for c, count in nulls.items() if count > 0]
    if missing_cols:
        node_logs.append(f"⚠ Quality Agent: Missing values found in {len(missing_cols)} column(s): {', '.join(missing_cols[:4])}{'...' if len(missing_cols) > 4 else ''}.")
    else:
        node_logs.append("✓ Quality Agent: 100% cell completeness — no null values across any column.")
    if constant:
        node_logs.append(f"⚠ Quality Agent: Constant (zero-variance) columns detected: {', '.join(constant)}.")
    if cardinality:
        node_logs.append(f"⚠ Quality Agent: High-cardinality categorical columns: {', '.join(cardinality)}.")

    persona = state.get("persona", "professional") or "professional"
    temp = 0.8 if persona == "roast" else 0.1 if persona == "executive" else 0.2
    llm = get_llm_model(temperature=temp)

    if llm is not None:
        if persona == "roast":
            persona_instructions = (
                "You are a brutally witty, lightheartedly sarcastic Data Quality Critic.\n"
                "Task: Roast the dataset's data quality issues (missing values, duplicates, constant columns) with sharp humor. "
                "For example, if duplicates exist, ask if their Ctrl+V key got stuck! "
                "Keep it hilarious, sharp, and focused strictly on the dataset's statistical hygiene flaws. Use 3 to 5 witty bullet points."
            )
        elif persona == "executive":
            persona_instructions = (
                "You are a C-Suite Chief Data Officer.\n"
                "Task: Provide an ultra-concise, high-level executive summary focused strictly on strategic risk and data reliability. "
                "Zero technical jargon. Maximum 3 high-impact bullet points."
            )
        else:
            persona_instructions = (
                "You are a Data Quality Specialist AI.\n"
                "Task: Provide a concise, scientific executive report (3 to 5 bullet points) summarizing data health issues, "
                "critical missing value risks, and duplicate/constant column anomalies."
            )

        prompt = (
            f"{persona_instructions}\n\n"
            f"Dataset Context: {rows:,} rows and {cols} columns.\n"
            f"Data Quality Metrics:\n"
            f"- Total Duplicate Rows: {duplicates:,} ({dup_pct}%)\n"
            f"- Missing values per column: {nulls}\n"
            f"- Constant columns (single unique value): {constant}\n"
            f"- High-cardinality non-numeric columns: {cardinality}\n"
        )
        try:
            response = llm.invoke(prompt)
            report = response.content if hasattr(response, "content") else str(response)
            return {"quality_report": report, "trace_logs": node_logs}
        except Exception:
            pass

    # Deterministic Fallback Report by Persona
    bullets = []
    if persona == "roast":
        if duplicates > 0:
            bullets.append(f"🔥 Duplicate Rows: Found {duplicates:,} duplicate rows ({dup_pct}%). Did someone fall asleep holding Ctrl+V?")
        else:
            bullets.append("🔥 Uniqueness: Wow, zero duplicate rows! Miracles do happen in raw CSVs.")

        missing_cols = [c for c, count in nulls.items() if count > 0]
        if missing_cols:
            bullets.append(f"🔥 Missing Data: Columns {', '.join(missing_cols)} are emptier than a Monday morning office standup.")
        else:
            bullets.append("🔥 Completeness: 100% complete cells. Looks like someone actually cleaned their dataset before uploading.")
    elif persona == "executive":
        bullets.append(f"👔 Strategic Scope: Analyzed enterprise dataset comprising {rows:,} record rows across {cols} schema dimensions.")
        if duplicates > 0:
            bullets.append(f"👔 Governance Alert: {duplicates:,} duplicate records detected requiring deduplication before downstream reporting.")
        else:
            bullets.append("👔 Data Integrity: 100% unique record identity verified across all rows.")
    else:
        if duplicates > 0:
            bullets.append(f"• Duplicate Rows: Identified {duplicates:,} duplicate rows ({dup_pct}% of total dataset).")
        else:
            bullets.append("• Uniqueness: No duplicate rows detected across the dataset.")

        missing_cols = [c for c, count in nulls.items() if count > 0]
        if missing_cols:
            bullets.append(f"• Missing Values: Missing values detected in {len(missing_cols)} column(s): {', '.join(missing_cols)}.")
        else:
            bullets.append("• Completeness: Excellent data completeness with zero missing values.")

    fallback_report = "\n".join(bullets)
    return {"quality_report": fallback_report, "trace_logs": node_logs}
