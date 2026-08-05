# DataLens AI - Production Deployment Guide (Render + Vercel)

This guide provides step-by-step instructions to deploy **DataLens AI**:
- **Backend**: Containerized FastAPI + Polars + LangGraph API service deployed on **Render**.
- **Frontend**: Next.js 15 App Router web application deployed on **Vercel**.

---

## 1. Backend Deployment (Render)

Render builds and runs your container using the `Dockerfile` in the root repository directory.

### Step 1.1: Push Repository to GitHub
Ensure all application files (`Dockerfile`, `main.py`, `app/`, `requirements.txt`, `render.yaml`) are committed and pushed to your GitHub repository.

### Step 1.2: Create Render Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository.
4. Set the following configuration:
   - **Name**: `datalens-backend`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: `Free` (or Starter)

### Step 1.3: Configure Environment Variables on Render
Under **Environment Variables**, add:

| Key | Value Example | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `AIzaSy...` | Your Google Gemini API Key |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app,http://localhost:3000` | Allowed CORS origin URLs |
| `DEFAULT_LLM_PROVIDER` | `google` | `google` or `openai` |
| `DEFAULT_LLM_MODEL` | `gemini-2.5-flash` | LLM model identifier |
| `PORT` | `8000` | Port for FastAPI container |

### Step 1.4: Save & Deploy
1. Click **Create Web Service**.
2. Note your Render public backend URL once deployed (e.g. `https://datalens-backend.onrender.com`).
3. Verify backend health by visiting `https://datalens-backend.onrender.com/health` in your browser. Expected response: `{"status": "healthy"}`.

---

## 2. Frontend Deployment (Vercel)

Vercel natively builds and hosts the Next.js 15 App Router web application.

### Step 2.1: Import Project into Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your `DataLens AI` repository.

### Step 2.2: Configure Root Directory & Environment Variables
1. Framework Preset: **Next.js**
2. Click **Edit** next to **Root Directory** and select `frontend`.
3. Expand **Environment Variables** and set:

| Variable Name | Value Example |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://datalens-backend.onrender.com/api/v1` |

> ⚠️ **CRITICAL**: Include `/api/v1` at the end of `NEXT_PUBLIC_API_URL`.

4. Click **Deploy**.

---

## 3. Post-Deployment Verification & Troubleshooting

### Why Network Errors Happen & How They Are Resolved:
- **Missing `/api/v1` in `NEXT_PUBLIC_API_URL`**: Ensure the Vercel env var points to `https://<render-service>.onrender.com/api/v1`.
- **Render Free Tier Cold Starts**: Render free instances spin down after 15 minutes of inactivity. Initial request after sleep takes ~30-60 seconds. `api.ts` has a 120s timeout configured to accommodate cold starts.
- **Vercel Build Inlining**: `NEXT_PUBLIC_` env vars are baked into JS during build time. Whenever you update `NEXT_PUBLIC_API_URL` in Vercel settings, you must trigger a **Redeploy** on Vercel.
- **Multipart Upload Boundaries**: Axios automatically generates the `multipart/form-data; boundary=...` header. Do NOT manually override `Content-Type` in `uploadDataset`.

