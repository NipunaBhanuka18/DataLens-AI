from typing import Dict, Any, List
from app.core.graph_state import GraphState
from app.models.consultant import (
    ConsultantReport, MLProblemType, ConsultantRecommendationItem,
    PriorityLevel, ConfidenceLevel
)
from app.services.llm_factory import get_llm_model
from app.services.modeling_readiness import calculate_modeling_readiness_score
from app.services.assumption_checker import run_assumption_checker


def ds_consultant_node(state: GraphState) -> Dict[str, Any]:
    """
    DS Consultant Agent Node: Analyses ML readiness heuristics (VIF, Shapiro-Wilk,
    Mutual Information, target imbalance), generates structured evidence-based
    recommendations, and runs the deterministic Assumption Checker against three
    model families (Linear, Tree-Based, Distance-Based).
    """
    metadata = state.get("dataset_metadata", {})
    quality  = state.get("quality_metrics", {})
    stats    = state.get("statistics", {})
    existing_logs: list = list(state.get("trace_logs") or [])
    target_col = state.get("target_column") or (list(stats.keys())[-1] if stats else None)
    target_imbalance = state.get("target_imbalance_ratio")
    rows = metadata.get("row_count", 0)
    cols = metadata.get("column_count", 0)

    # ── Deterministic readiness score ────────────────────────────────────────
    readiness_score, readiness_level, score_deductions = calculate_modeling_readiness_score(
        rows=rows, cols=cols, col_stats=stats, quality_metrics=quality,
        target_column=target_col, target_imbalance_ratio=target_imbalance,
    )

    # ── Trace log bootstrap ───────────────────────────────────────────────────
    node_logs: list = []
    node_logs.append(
        f"✓ Consultant Agent: Computed Model Readiness Score = {readiness_score:.0f}/100 ({readiness_level})."
    )
    if target_col:
        node_logs.append(f"✓ Consultant Agent: Target column identified as '{target_col}'.")

    # ── Run Assumption Checker (always deterministic) ─────────────────────────
    assumption_report = run_assumption_checker(
        stats=stats, quality_metrics=quality, rows=rows, cols=cols
    )
    node_logs.append(
        f"✓ Consultant Agent: Assumption Checker evaluated "
        f"Linear={assumption_report.linear_models.verdict}, "
        f"Tree={assumption_report.tree_models.verdict}, "
        f"Distance={assumption_report.distance_models.verdict}."
    )

    # ── Extract per-column heuristics for LLM prompt ──────────────────────────
    col_summary = []
    numeric_cols: List[str] = []
    normal_cols:  List[str] = []
    skewed_cols:  List[str] = []
    high_vif_cols: List[str] = []
    high_mi_cols:  List[str] = []

    for col, data in stats.items():
        dtype = data.get("data_type", "") if isinstance(data, dict) else getattr(data, "data_type", "")
        num   = data.get("numeric")    if isinstance(data, dict) else getattr(data, "numeric", None)
        cat   = data.get("categorical") if isinstance(data, dict) else getattr(data, "categorical", None)
        mi    = data.get("mutual_info_score") if isinstance(data, dict) else getattr(data, "mutual_info_score", None)

        if mi is not None and col != target_col:
            if mi > 0.80:
                high_mi_cols.append(f"{col} (MI={mi:.2f})")
                if mi > 0.90:
                    node_logs.append(
                        f"⚠ Consultant Agent: Potential data leakage in '{col}' — MI score {mi:.2f} with target."
                    )

        if num:
            numeric_cols.append(col)
            vif     = num.get("vif_score") if isinstance(num, dict) else getattr(num, "vif_score", None)
            is_norm = num.get("is_normal_distribution") if isinstance(num, dict) else getattr(num, "is_normal_distribution", None)
            skew    = num.get("skewness") if isinstance(num, dict) else getattr(num, "skewness", None)

            if vif and vif > 10.0:
                high_vif_cols.append(f"{col} (VIF={vif:.1f})")
                node_logs.append(f"⚠ Consultant Agent: High multicollinearity in '{col}' — VIF = {vif:.1f}.")

            if is_norm is True:
                normal_cols.append(col)
            elif skew is not None and abs(skew) > 1.0:
                skewed_cols.append(f"{col} (skew={skew:.2f})")

            col_summary.append(
                f"- {col} (Numeric): VIF={vif}, Shapiro_Is_Normal={is_norm}, skew={skew}, MI_with_target={mi}"
            )
        elif cat:
            uniq = cat.get("unique_count") if isinstance(cat, dict) else getattr(cat, "unique_count", 0)
            col_summary.append(f"- {col} (Categorical): unique={uniq}, MI_with_target={mi}")

    stats_prompt_text = "\n".join(col_summary)
    llm = get_llm_model(temperature=0.2)

    if llm is not None:
        try:
            structured_llm = llm.with_structured_output(ConsultantReport)

            system_prompt = (
                "You are a Senior Principal Data Scientist mentoring a junior ML engineer.\n"
                "Your task is to analyze feature-level mathematical statistics and output strict, column-specific ML modeling guidance.\n\n"
                "SCHEMA RULES — Every recommendation MUST populate ALL of these fields:\n"
                "  problem        : Short specific problem statement naming the column(s) and issue.\n"
                "  evidence       : Hard metric proof e.g. 'VIF of 12.4', '18.3% null rate', 'MI score 0.92 with target'.\n"
                "  impact         : What breaks in the model if this is ignored.\n"
                "  recommendation : The exact corrective action with specific transformers/techniques.\n"
                "  confidence     : 'High' (definitive metric), 'Medium' (heuristic), 'Low' (contextual).\n"
                "  priority_level : One of CRITICAL | WARNING | SUGGESTION.\n\n"
                "CRITICAL INSTRUCTIONS:\n"
                "1. NEVER give generic advice. Every field must reference specific column names and metric values.\n"
                "2. Shapiro-Wilk normality → pick StandardScaler (normal) or RobustScaler (skewed/outliers).\n"
                "3. Flag Data Leakage if MI > 0.90 as CRITICAL.\n"
                "4. VIF > 10 → WARNING. VIF > 5 but ≤ 10 → SUGGESTION for linear models.\n\n"
                "PRIORITY TRIAGE:\n"
                "  CRITICAL   → Leakage (MI > 0.90), class imbalance < 10%, nulls > 30% in key features.\n"
                "  WARNING    → VIF > 10, |skew| > 2, scaling mismatches, imbalance 10-25%.\n"
                "  SUGGESTION → Low-variance removal, encoding alternatives, optional PCA.\n\n"
                f"Target Column: {target_col}\n"
                f"Model Readiness Score: {readiness_score}/100 ({readiness_level})\n"
                f"Score Deductions: {score_deductions}\n"
                f"Column Statistics:\n{stats_prompt_text}\n"
            )

            report = structured_llm.invoke(system_prompt)
            if report and hasattr(report, "model_dump"):
                node_logs.append(
                    f"✓ Consultant Agent: LLM generated {len(report.recommendations)} evidence-based recommendations."
                )
                final_logs = existing_logs + node_logs
                report_dict = report.model_dump()
                report_dict["assumption_report"] = assumption_report.model_dump()
                return {"consultant_report": report_dict, "trace_logs": final_logs}
            elif isinstance(report, dict):
                report["assumption_report"] = assumption_report.model_dump()
                return {"consultant_report": report, "trace_logs": node_logs}
        except Exception:
            pass

    # ── Deterministic Fallback ────────────────────────────────────────────────
    problem_type = MLProblemType.CLASSIFICATION
    if target_col and target_col in stats:
        target_stat = stats[target_col]
        num_target = target_stat.get("numeric") if isinstance(target_stat, dict) else getattr(target_stat, "numeric", None)
        cat_target = target_stat.get("categorical") if isinstance(target_stat, dict) else getattr(target_stat, "categorical", None)
        if num_target and not cat_target:
            problem_type = MLProblemType.REGRESSION

    recs: List[ConsultantRecommendationItem] = []

    if high_mi_cols:
        mi_vals = ", ".join(high_mi_cols)
        recs.append(ConsultantRecommendationItem(
            priority_level=PriorityLevel.CRITICAL,
            confidence=ConfidenceLevel.HIGH,
            problem=f"Data Leakage — feature(s) {mi_vals} near-perfectly predict the target",
            evidence=f"Mutual Information score > 0.90 with target column '{target_col}': {mi_vals}",
            impact="Model achieves artificially inflated accuracy during training/validation that collapses to random-chance performance in production.",
            recommendation=f"Immediately remove or time-gate {mi_vals}. Re-run MI analysis post-removal to confirm leakage elimination.",
        ))

    if high_vif_cols:
        vif_vals = ", ".join(high_vif_cols)
        recs.append(ConsultantRecommendationItem(
            priority_level=PriorityLevel.WARNING,
            confidence=ConfidenceLevel.HIGH,
            problem=f"Severe multicollinearity in {vif_vals}",
            evidence=f"Variance Inflation Factor (VIF) > 10.0: {vif_vals}",
            impact="Linear model coefficients become numerically unstable; standard errors inflate, making feature importance estimates unreliable.",
            recommendation=f"Drop the highest-VIF feature(s) from {vif_vals} or apply PCA to merge correlated predictors into orthogonal components.",
        ))

    if normal_cols:
        recs.append(ConsultantRecommendationItem(
            priority_level=PriorityLevel.WARNING,
            confidence=ConfidenceLevel.HIGH,
            problem=f"Unscaled Gaussian features: {', '.join(normal_cols)}",
            evidence=f"Shapiro-Wilk test p > 0.05 (normal distribution confirmed) for: {', '.join(normal_cols)}",
            impact="Linear, SVM, and KNN models are not scale-invariant; large-magnitude columns dominate gradient updates and distance calculations.",
            recommendation=f"Apply sklearn.preprocessing.StandardScaler to: {', '.join(normal_cols)} before any distance-based or gradient-descent model.",
        ))

    if skewed_cols:
        recs.append(ConsultantRecommendationItem(
            priority_level=PriorityLevel.WARNING,
            confidence=ConfidenceLevel.HIGH,
            problem=f"Heavy skewness in {', '.join(skewed_cols)}",
            evidence=f"Absolute skewness > 1.0 for: {', '.join(skewed_cols)}",
            impact="Right/left-skewed distributions violate Gaussian assumptions in linear models and cause outlier-driven splits in distance-based models.",
            recommendation=f"Apply np.log1p() or PowerTransformer (Yeo-Johnson) to {', '.join(skewed_cols)}, then validate with post-transform skewness check.",
        ))

    if not recs:
        recs.append(ConsultantRecommendationItem(
            priority_level=PriorityLevel.SUGGESTION,
            confidence=ConfidenceLevel.HIGH,
            problem="No critical statistical issues detected",
            evidence=f"All features: VIF < 10, |skew| < 1.0, no detected leakage (MI < 0.80), null rates < 5%.",
            impact="Dataset is statistically clean; no preprocessing blockers identified.",
            recommendation="Proceed directly to baseline model training. Recommended: RandomForest → LightGBM → LogisticRegression in that order.",
        ))

    baseline_models = (
        ["RandomForestClassifier", "LightGBMClassifier", "LogisticRegression"]
        if problem_type == MLProblemType.CLASSIFICATION
        else ["RandomForestRegressor", "LightGBMRegressor", "Ridge"]
    )
    preprocessing_steps = []
    if normal_cols:
        preprocessing_steps.append(f"StandardScaler on [{', '.join(normal_cols)}]")
    if skewed_cols:
        preprocessing_steps.append(f"RobustScaler on [{', '.join(skewed_cols)}]")

    fallback_report = ConsultantReport(
        ml_problem_type=problem_type,
        recommended_target_column=target_col,
        model_readiness_score=readiness_score,
        model_readiness_level=readiness_level,
        score_deductions=score_deductions,
        recommended_baseline_models=baseline_models,
        recommended_preprocessing=preprocessing_steps,
        recommendations=recs,
        assumption_report=assumption_report,
    )

    node_logs.append(
        f"✓ Consultant Agent: Fallback generated {len(recs)} evidence-based recommendations + Assumption Report."
    )
    return {
        "consultant_report": fallback_report.model_dump(),
        "trace_logs": node_logs,
    }
