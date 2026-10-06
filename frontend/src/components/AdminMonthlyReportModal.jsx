import React from "react";
import { Printer, X, FileText, CheckCircle2, ShieldCheck, Calendar, Clock, BarChart3, Recycle, CheckSquare, Layers } from "lucide-react";
import "./AdminMonthlyReportModal.css";

export default function AdminMonthlyReportModal({ report, onClose }) {
  if (!report) return null;

  const handlePrint = () => {
    window.print();
  };

  const monthLabel = report.month_label || `${report.year}-${String(report.month).padStart(2, "0")}`;
  const generatedNow = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const totalWasteKg = report.waste_collection?.total_kg || 0;
  const wasteCategories = report.waste_collection?.categories || [];

  const totalRecycledKg = report.recycled_waste?.total_recycled_kg || 0;
  const recycledCategories = report.recycled_waste?.categories || [];

  const completedTasks = report.task_status?.completed || 0;
  const pendingTasks = report.task_status?.pending || 0;
  const totalTasks = report.task_status?.total || (completedTasks + pendingTasks);

  const recyclingEfficiency = totalWasteKg > 0 ? ((totalRecycledKg / totalWasteKg) * 100).toFixed(1) : "0.0";
  const taskCompletionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : "0.0";

  return (
    <div className="ep-analytics-report-overlay" onClick={onClose}>
      <div className="ep-analytics-report-container" onClick={(e) => e.stopPropagation()}>
        {/* MODAL TOP HEADER */}
        <div className="ep-analytics-report-header-bar">
          <h3>
            <FileText size={18} />
            Monthly Municipal Analytics Report &mdash; {monthLabel}
          </h3>
          <button className="ep-analytics-report-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* PRINTABLE DOCUMENT AREA */}
        <div className="ep-analytics-report-printable">
          {/* BRAND & REPORT HEADER */}
          <div className="ep-analytics-report-brand">
            <div className="ep-analytics-report-logo">
              ECO<span>PULSE</span> MUNICIPAL SYSTEM
            </div>
            <div className="ep-analytics-report-subbrand">
              Intelligent Municipal Waste Management System &bull; Official Analytics &amp; Compliance Document
            </div>
            <div className="ep-analytics-report-title">
              MONTHLY WASTE MANAGEMENT ANALYTICS REPORT
            </div>
            <div className="ep-analytics-report-period">
              Reporting Month: <strong>{monthLabel}</strong>
            </div>
          </div>

          <div className="ep-analytics-report-divider" />

          {/* KEY PERFORMANCE HIGHLIGHTS GRID */}
          <div className="ep-analytics-kpi-grid">
            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Total Waste Collected</div>
              <div className="ep-analytics-kpi-val">{totalWasteKg.toLocaleString()} kg</div>
              <div className="ep-analytics-kpi-sub">Facility intake for {monthLabel}</div>
            </div>

            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Total Recycled Material</div>
              <div className="ep-analytics-kpi-val" style={{ color: "#059669" }}>
                {totalRecycledKg.toLocaleString()} kg
              </div>
              <div className="ep-analytics-kpi-sub">{recyclingEfficiency}% of collected material</div>
            </div>

            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Completed Field Tasks</div>
              <div className="ep-analytics-kpi-val" style={{ color: "#1E6B4E" }}>
                {completedTasks}
              </div>
              <div className="ep-analytics-kpi-sub">{taskCompletionRate}% completion rate</div>
            </div>

            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Pending / In-Progress Tasks</div>
              <div className="ep-analytics-kpi-val" style={{ color: pendingTasks > 0 ? "#D97706" : "#059669" }}>
                {pendingTasks}
              </div>
              <div className="ep-analytics-kpi-sub">Active workflow items</div>
            </div>
          </div>

          {/* SECTION 1: WASTE COLLECTION SUMMARY */}
          <div className="ep-analytics-report-section">
            <div className="ep-analytics-report-section-title">
              <BarChart3 size={16} color="#064e3b" />
              1. Waste Collection Summary by Category
            </div>
            {wasteCategories.length === 0 ? (
              <div className="ep-analytics-empty-note">No waste collection data recorded for this month.</div>
            ) : (
              <table className="ep-analytics-report-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: "right" }}>Collected Quantity (kg)</th>
                    <th style={{ textAlign: "right" }}>Share of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteCategories.map((cat, i) => {
                    const qty = Number(cat.collected_kg || 0);
                    const pct = totalWasteKg > 0 ? ((qty / totalWasteKg) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={cat.category || i}>
                        <td>
                          <strong>{cat.category}</strong>
                        </td>
                        <td style={{ textAlign: "right" }}>{qty.toFixed(2)} kg</td>
                        <td style={{ textAlign: "right", color: "#64748b" }}>{pct}%</td>
                      </tr>
                    );
                  })}
                  <tr className="ep-analytics-table-total-row">
                    <td>
                      <strong>Total Waste Collected</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{totalWasteKg.toFixed(2)} kg</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>100.0%</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* SECTION 2: RECYCLED WASTE SUMMARY */}
          <div className="ep-analytics-report-section">
            <div className="ep-analytics-report-section-title">
              <Recycle size={16} color="#064e3b" />
              2. Recycled Waste Summary by Category
            </div>
            {recycledCategories.length === 0 ? (
              <div className="ep-analytics-empty-note">No recycling activities recorded for this month.</div>
            ) : (
              <table className="ep-analytics-report-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: "right" }}>Recycled Quantity (kg)</th>
                    <th style={{ textAlign: "right" }}>Share of Recycled</th>
                  </tr>
                </thead>
                <tbody>
                  {recycledCategories.map((cat, i) => {
                    const qty = Number(cat.recycled_kg || 0);
                    const pct = totalRecycledKg > 0 ? ((qty / totalRecycledKg) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={cat.category || i}>
                        <td>
                          <strong>{cat.category}</strong>
                        </td>
                        <td style={{ textAlign: "right", color: qty > 0 ? "#059669" : "#64748b" }}>
                          {qty.toFixed(2)} kg
                        </td>
                        <td style={{ textAlign: "right", color: "#64748b" }}>{pct}%</td>
                      </tr>
                    );
                  })}
                  <tr className="ep-analytics-table-total-row">
                    <td>
                      <strong>Total Recycled Waste</strong>
                    </td>
                    <td style={{ textAlign: "right", color: "#059669" }}>
                      <strong>{totalRecycledKg.toFixed(2)} kg</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>100.0%</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* SECTION 3: FIELD COLLECTION TASK STATUS */}
          <div className="ep-analytics-report-section" style={{ pageBreakInside: "avoid" }}>
            <div className="ep-analytics-report-section-title">
              <CheckSquare size={16} color="#064e3b" />
              3. Field Collection Task Status
            </div>
            <div className="ep-analytics-grid-2">
              <div className="ep-analytics-field-box">
                <div className="ep-analytics-field-label">Completed Tasks</div>
                <div className="ep-analytics-field-val" style={{ color: "#1E6B4E" }}>
                  {completedTasks} tasks
                </div>
                <div className="ep-analytics-field-sub">Successfully serviced &amp; closed</div>
              </div>

              <div className="ep-analytics-field-box">
                <div className="ep-analytics-field-label">Pending / Scheduled Tasks</div>
                <div className="ep-analytics-field-val" style={{ color: pendingTasks > 0 ? "#D97706" : "#059669" }}>
                  {pendingTasks} tasks
                </div>
                <div className="ep-analytics-field-sub">Pending field pickup or assignment</div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="ep-analytics-report-footer-notes">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4, color: "#065f46", fontWeight: 600 }}>
              <ShieldCheck size={16} />
              Digitally certified municipal analytics record &mdash; EcoPulse Waste Management System.
            </div>
            <div>Generated on: {generatedNow} &bull; Scope: {monthLabel}</div>
          </div>
        </div>

        {/* MODAL BOTTOM ACTIONS */}
        <div className="ep-analytics-report-actions">
          <button className="ep-analytics-report-btn-close" onClick={onClose}>
            Close
          </button>
          <button className="ep-analytics-report-btn-print" onClick={handlePrint}>
            <Printer size={16} />
            Print / Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
