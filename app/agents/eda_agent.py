from typing import Dict, Any
from app.core.graph_state import GraphState
from app.services.llm_factory import get_llm_model


def eda_agent_node(state: GraphState) -> Dict[str, Any]:
    """
    EDA Agent Node: Examines column statistics (distributions, skewness, outliers, categories)
    to uncover key statistical patterns without reading raw data rows.
    """
    stats = state.get("statistics", {})
    existing_logs: list = list(state.get("trace_logs") or [])
    persona = state.get("persona", "professional") or "professional"
    temp = 0.8 if persona == "roast" else 0.1 if persona == "executive" else 0.2
    llm = get_llm_model(temperature=temp)

    # Build EDA trace log entries
    node_logs: list = []
    num_count = sum(1 for d in stats.values() if d.get("numeric"))
    cat_count = sum(1 for d in stats.values() if d.get("categorical"))
    node_logs.append(f"✓ EDA Agent: Profiled {num_count} numeric and {cat_count} categorical features.")

    summary_lines = []
    for col, data in stats.items():
        dtype = data.get("data_type", "")
        num = data.get("numeric")
        cat = data.get("categorical")
        if num:
            skew = num.get("skewness")
            outlier_pct = num.get("outlier_percentage", 0)
            outlier_cnt = num.get("outlier_count", 0)
            if skew is not None and abs(skew) > 1.5:
                direction = "right" if skew > 0 else "left"
                node_logs.append(f"⚠ EDA Agent: '{col}' flagged for extreme {direction}-tail skewness ({skew:.2f}).")
            if outlier_cnt > 0 and outlier_pct > 5:
                node_logs.append(f"⚠ EDA Agent: '{col}' contains {outlier_cnt} outliers ({outlier_pct:.1f}% of values — 3σ threshold).")
            summary_lines.append(
                f"- {col} ({dtype}): mean={num.get('mean')}, std={num.get('std')}, "
                f"min={num.get('min')}, max={num.get('max')}, skew={num.get('skewness')}, "
                f"outliers={num.get('outlier_count')} ({num.get('outlier_percentage')}%)"
            )
        elif cat:
            top = cat.get("top_categories", {})
            summary_lines.append(
                f"- {col} ({dtype}): {cat.get('unique_count')} unique values, top categories={top}"
            )

    stats_text = "\n".join(summary_lines)

    if llm is not None and stats_text:
        if persona == "roast":
            persona_instructions = (
                "You are a sarcastic Data Scientist roasting the statistical distributions of a dataset.\n"
                "Task: Roast extreme skewness, wild min/max ranges, and high 3-sigma outlier percentages with sharp humor. "
                "Keep it hilarious, sharp, and focused strictly on statistical anomalies. Use 3 to 5 witty bullet points."
            )
        elif persona == "executive":
            persona_instructions = (
                "You are a C-Suite Business Analyst.\n"
                "Task: Summarize key statistical patterns in terms of strategic metric ranges and operational variance. "
                "Zero data science jargon. Maximum 3 concise business impact bullets."
            )
        else:
            persona_instructions = (
                "You are a Senior Data Scientist conducting Exploratory Data Analysis (EDA).\n"
                "Task: Highlight key statistical insights, skewed distributions, numerical ranges, "
                "and notable categorical balances in 3 to 5 clear paragraphs or bullet points."
            )

        prompt = (
            f"{persona_instructions}\n\n"
            f"Aggregated Column Statistics:\n"
            f"{stats_text}\n"
        )
        try:
            response = llm.invoke(prompt)
            findings = response.content if hasattr(response, "content") else str(response)
            node_logs.append(f"✓ EDA Agent: LLM synthesized statistical narrative across {len(stats)} columns.")
            return {"eda_findings": findings, "trace_logs": node_logs}
        except Exception:
            pass

    # Deterministic Fallback EDA Findings by Persona
    findings_list = []
    for col, data in stats.items():
        num = data.get("numeric")
        cat = data.get("categorical")
        if num:
            outlier_cnt = num.get("outlier_count", 0)
            skew = num.get("skewness")
            if persona == "roast":
                findings_list.append(
                    f"🔥 Column **{col}**: Averages {num.get('mean')} with {outlier_cnt} wild outliers. Looks like some extreme values crashed the party!"
                )
            elif persona == "executive":
                findings_list.append(
                    f"👔 Operational Metric **{col}**: Baseline average of {num.get('mean')} spanning from {num.get('min')} to {num.get('max')}."
                )
            else:
                findings_list.append(
                    f"• Numerical column **{col}** spans from {num.get('min')} to {num.get('max')} with average {num.get('mean')}."
                )
        elif cat:
            unique_cnt = cat.get("unique_count", 0)
            if persona == "roast":
                findings_list.append(
                    f"🔥 Category **{col}**: Has {unique_cnt} distinct categories. Good luck grouping those!"
                )
            elif persona == "executive":
                findings_list.append(
                    f"👔 Dimension **{col}**: Encompasses {unique_cnt} core business classification categories."
                )
            else:
                findings_list.append(
                    f"• Categorical column **{col}** contains {unique_cnt} unique distinct values."
                )

    fallback_findings = "\n".join(findings_list) if findings_list else "No statistical columns found."
    return {"eda_findings": fallback_findings, "trace_logs": node_logs}
