# DataLens AI - Production Deployment Guide

This guide provides step-by-step instructions to deploy **DataLens AI**:
- **Backend**: Containerized FastAPI + Polars + LangGraph service deployed to **Railway**.
- **Frontend**: Next.js 15 App Router web application deployed to **Vercel**.

---

## 1. Backend Deployment (Railway)

Railway automatically detects the `Dockerfile` in the root directory and builds a container running Gunicorn + Uvicorn workers.

### Step 1.1: Push Repository to GitHub
Ensure all application files (`Dockerfile`, `main.py`, `app/`, `requirements.txt`) are committed and pushed to your GitHub repository.

### Step 1.2: Create Railway Project
1. Log in to [Railway.app](https://railway.app).
2. Click **+ New Project** $\rightarrow$ **Deploy from GitHub repo**.
3. Select your `DataLens AI` repository.

### Step 1.3: Configure Environment Variables
In Railway, navigate to **Settings** $\rightarrow$ **Variables** and add:

| Environment Variable | Value Example | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini API Key |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app,http://localhost:3000` | Comma-separated list of allowed CORS domains |
| `DEFAULT_LLM_PROVIDER` | `google` | AI provider (`google` or `openai`) |
| `DEFAULT_LLM_MODEL` | `gemini-2.5-flash` | LLM model identifier |
| `PORT` | `8000` | Public port (Railway manages `$PORT` dynamically) |

### Step 1.4: Generate Domain & Copy URL
1. Go to **Settings** $\rightarrow$ **Networking** $\rightarrow$ **Generate Domain**.
2. Note your Railway public URL (e.g. `https://datalens-backend-production.up.railway.app`).

---

## 2. Frontend Deployment (Vercel)

Vercel natively deploys and builds the Next.js 15 App Router application.

### Step 2.1: Import Project into Vercel
1. Log in to [Vercel.com](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your `DataLens AI` GitHub repository.

### Step 2.2: Configure Root Directory & Environment Variables
1. Under **Framework Preset**, select **Next.js**.
2. Click **Edit** next to **Root Directory** and select `frontend`.
3. Expand **Environment Variables** and add:

| Variable Name | Value Example |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://datalens-backend-production.up.railway.app/api/v1` |

4. Click **Deploy**.

---

## 3. Post-Deployment Verification & Security

### Step 3.1: Update Backend CORS
Once Vercel assigns your production domain (e.g. `https://datalens-ai.vercel.app`), return to **Railway** and set `ALLOWED_ORIGINS`:

```bash
ALLOWED_ORIGINS="https://datalens-ai.vercel.app,http://localhost:3000"
```

### Step 3.2: Verification Checklist
1. Access `https://datalens-backend-production.up.railway.app/health` in browser. Verify status response: `{"status": "healthy"}`.
2. Open `https://datalens-ai.vercel.app` in your browser.
3. Drag and drop a sample `.csv` or `.xlsx` file.
4. Confirm real-time progress transitions:
   - **Uploading dataset**
   - **Analyzing Data Engine (Polars)**
   - **AI Generating Insights (LangGraph)**
5. Verify Health Score, Sub-Scores, Plotly Interactive Charts, and AI Insights.
