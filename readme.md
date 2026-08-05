# 🚀 DataLens AI: The "First Hour" Data Science Copilot

**DataLens AI** is an advanced, autonomous full-stack decision-support platform designed specifically for the *first hour* of every machine learning project. It helps engineers and analysts understand, validate, and prepare datasets before model development by combining high-speed deterministic math with agentic AI reasoning.

---

## 🏗️ Core Architecture & Philosophy

### 1. The "Zero Raw Data" Strategy
DataLens AI **never transmits raw CSV rows to the LLM.** 
* **How it works:** The high-speed deterministic engine extracts statistical metadata (null ratios, skewness, variance, VIF). This compact summary is packaged into strictly typed Pydantic schemas and fed to the LangGraph agents.
* **Why it matters:** Ensures absolute data privacy, reduces LLM token costs to near-zero, eliminates context window limits, and allows the platform to process 500,000+ row datasets in seconds.

### 2. Stateless Security (No Database)
* **How it works:** Ingested files stream directly to temporary ephemeral storage (`/tmp`), are processed in memory, and are immediately purged when the HTTP response completes.
* **Why it matters:** Provides built-in GDPR/SOC2 compliance, eliminates database hosting overhead, and makes the app natively compatible with serverless/containerized cloud deployments (Render, Railway, Docker).

---

## 🟢 Implemented Features (Base Tier)

### The Backend Math & AI Engine
* **Polars & fastexcel Engine:** Multi-threaded Rust-powered parsing capable of handling massive datasets without RAM bottlenecks.
* **Advanced Scikit-Learn Heuristics:** Computes Variance Inflation Factor (VIF), Mutual Information (predictive power), and Shapiro-Wilk normality tests, backed by a 50,000-row sampling guard to guarantee sub-3-second API response times.
* **Dual Scoring Matrix:** 
  * *Dataset Health Score (0–100):* Evaluates Completeness (40%), Consistency (30%), and Uniqueness (30%).
  * *ML Readiness Score (0–100):* Judges algorithmic viability by penalizing target leakage, class imbalance, and multicollinearity.
* **LangGraph Multi-Agent Pipeline:** Sequential `StateGraph` routing data through specialized nodes (Quality, EDA, Visualization, and Consultant).
* **The Narrative Data Story:** Replaces dry bullet points with a 4-part structured narrative: *Data Quality Reality → Core Pattern → 'Why' (Hypothesis) → Business Impact*.
* **Dynamic AI Personas:** Instant LLM tone switching (Professional, Executive, and viral Roast Mode) without re-running backend math.

### The Decision-Support UI (Next.js 15)
* **Dataset Fingerprint:** A high-density hero card summarizing shape, problem type, ML readiness, and primary risk factors in seconds.
* **Evidence-Based Recommendation Triage:** Categorized into *Fix Now (Critical)*, *Improve Before Modeling*, and *Optional Optimizations*. Each card outlines the **Problem**, **Evidence**, **Impact**, **Recommendation**, and **Confidence Level**.
* **Assumption Checker:** Programmatically evaluates dataset characteristics against baseline model families (Linear, Tree-Based, Distance-Based) to verify architectural requirements.
* **Decision Simulator ("Why?"):** An interactive comparison tool that contrasts default flawed preprocessing methods (e.g., `StandardScaler`) with robust alternatives (`RobustScaler`) using the dataset's actual skewness and outlier metrics.
* **Analysis Trace (Reasoning Timeline):** A visual Chain-of-Thought timeline exposing the exact logical steps taken by the LangGraph agents to build user trust.
* **Chat-to-Chart Command Palette (`Cmd+K`):** Raycast-style natural language interface that instantly generates custom Plotly charts inside a frosted-glass modal.
* **One-Click Executive PDF Export:** Client-side rendering compiling health scores, insights, and chart snapshots into a branded corporate report.

---

## 🔵 Pro Tier Features (Future Roadmap)

* **Jupyter Notebook Export (`.ipynb`):** An automated compilation pipeline that translates the AI Consultant's preprocessing recommendations into an executable Python script, saving boilerplate coding time.
* **Target Feature Leakage Sandbox:** An interactive sandbox allowing users to manually drop high-Mutual-Information features and watch the ML Readiness Score dynamically recalculate in real-time.
* **Advanced Anomaly Clustering:** Integration of Isolation Forests or DBSCAN in the backend to cluster and visually highlight multi-dimensional outliers within frontend charts.