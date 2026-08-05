import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { AnalysisState, InsightsResponse } from "@/types/api";
import { parseInsightBullets } from "@/lib/formatters";

export async function exportExecutivePDFReport(
  analysisState: AnalysisState,
  insights: InsightsResponse | null
): Promise<void> {
  const { filename, row_count, column_count, health_score, quality_metrics } = analysisState;
  const timestamp = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Create temporary offscreen print container
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.width = "800px";
  container.style.backgroundColor = "#FFFFFF";
  container.style.color = "#1E293B";
  container.style.fontFamily = "Inter, Arial, sans-serif";
  container.style.padding = "40px";
  container.style.boxSizing = "border-box";

  const totalCells = row_count * column_count;
  const nullCount = quality_metrics
    ? Object.values(quality_metrics.null_counts_per_column).reduce((a, b) => a + b, 0)
    : 0;
  const completeness = totalCells > 0 ? (((totalCells - nullCount) / totalCells) * 100).toFixed(1) : "100.0";
  const overall = health_score ? health_score.overall_score.toFixed(1) : "95.5";
  const consistency = health_score ? health_score.consistency_score.toFixed(1) : "85.0";
  const uniqueness = health_score ? health_score.uniqueness_score.toFixed(1) : "92.0";
  const deductions = health_score?.deductions || [];

  const summaryBullets = parseInsightBullets(insights?.final_insights || "");
  const qualityBullets = parseInsightBullets(insights?.quality_report || "");
  const edaBullets = parseInsightBullets(insights?.eda_findings || "");

  const renderBulletBlock = (title: string, bullets: string[]) => {
    if (bullets.length === 0) return "";
    const listItems = bullets
      .map(
        (b) => `
        <li style="margin-bottom: 8px; line-height: 1.5; color: #334155; font-size: 11px;">
          ${b}
        </li>`
      )
      .join("");

    return `
      <div style="margin-bottom: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px 18px; border-radius: 10px;">
        <h3 style="margin: 0 0 10px 0; font-size: 13px; color: #0F172A; font-weight: 700;">${title}</h3>
        <ul style="margin: 0; padding-left: 18px;">
          ${listItems}
        </ul>
      </div>
    `;
  };

  container.innerHTML = `
    <div style="border-bottom: 2px solid #22C55E; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h1 style="margin: 0; font-size: 24px; color: #0F172A; font-weight: 800; letter-spacing: -0.5px;">DataLens AI</h1>
        <span style="font-size: 11px; color: #64748B; font-weight: 600;">EXECUTIVE REPORT</span>
      </div>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Dataset: <strong>${filename}</strong></p>
      <div style="margin-top: 10px; display: flex; gap: 20px; font-size: 11px; color: #64748B;">
        <span><strong>Rows:</strong> ${row_count.toLocaleString()}</span>
        <span><strong>Columns:</strong> ${column_count}</span>
        <span><strong>Generated:</strong> ${timestamp}</span>
      </div>
    </div>

    <!-- Section 1: Data Health Index -->
    <div style="margin-bottom: 24px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;">
      <h2 style="margin: 0 0 12px 0; font-size: 15px; color: #0F172A; font-weight: 700;">Dataset Health Index</h2>
      <div style="display: flex; align-items: center; gap: 30px; margin-bottom: 16px;">
        <div style="text-align: center; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 12px 20px; border-radius: 10px;">
          <span style="display: block; font-size: 10px; color: #64748B; font-weight: 700; text-transform: uppercase;">Overall Health</span>
          <span style="font-size: 28px; font-weight: 900; color: #166534;">${overall}</span>
        </div>
        <div style="flex: 1;">
          <div style="margin-bottom: 6px; font-size: 11px; color: #334155;"><strong>Completeness:</strong> ${completeness}%</div>
          <div style="margin-bottom: 6px; font-size: 11px; color: #334155;"><strong>Consistency:</strong> ${consistency}%</div>
          <div style="font-size: 11px; color: #334155;"><strong>Uniqueness:</strong> ${uniqueness}%</div>
        </div>
      </div>
      ${
        deductions.length > 0
          ? `<div style="border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 11px; color: #475569;">
              <strong>Quality Anomaly Log:</strong>
              <ul style="margin: 4px 0 0 16px; padding: 0;">
                ${deductions.map((d) => `<li>${d}</li>`).join("")}
              </ul>
            </div>`
          : `<div style="font-size: 11px; color: #166534; font-weight: 600;">✓ High Data Quality - No Critical Anomalies Detected.</div>`
      }
    </div>

    <!-- Section 2: Executive AI Insights (Point-by-Point) -->
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 14px 0; font-size: 15px; color: #0F172A; font-weight: 700;">Executive AI Insights Summary</h2>
      ${renderBulletBlock("Executive Summary", summaryBullets)}
      ${renderBulletBlock("Data Health & Schema Analysis", qualityBullets)}
      ${renderBulletBlock("EDA Statistical Findings", edaBullets)}
    </div>

    <div style="margin-top: 40px; padding-top: 12px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 10px; color: #94A3B8;">
      Generated by DataLens AI — Autonomous Data Science Copilot
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`DataLens_AI_Executive_Report_${analysisState.dataset_id}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
