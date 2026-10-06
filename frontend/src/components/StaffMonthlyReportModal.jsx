import React from "react";
import {
  Printer,
  X,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Clock,
  BarChart3,
  CheckSquare,
  AlertCircle,
  Truck,
  RotateCcw,
} from "lucide-react";
import "./AdminMonthlyReportModal.css";

export default function StaffMonthlyReportModal({ report, staffName, onClose }) {
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

  const completedTasks = report.task_analytics?.completed || 0;
  const pendingTasks = report.task_analytics?.pending || 0;
  const rescheduledTasks = report.task_analytics?.rescheduled || 0;
  const totalTasks =
    report.task_analytics?.total != null
      ? report.task_analytics.total
      : completedTasks + pendingTasks + rescheduledTasks;

  const taskCompletionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : "0.0";

  return (
    <div className="ep-analytics-report-overlay" onClick={onClose}>
      <div className="ep-analytics-report-container" onClick={(e) => e.stopPropagation()}>
        {/* MODAL TOP HEADER */}
        <div className="ep-analytics-report-header-bar">
          <h3>
            <FileText size={18} />
            Staff Monthly Municipal Operations Report &mdash; {monthLabel}
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
              Intelligent Municipal Waste Management System &bull; Certified Staff Operations &amp; Field Report
            </div>
            <div className="ep-analytics-report-title">
              STAFF MONTHLY WASTE COLLECTION &amp; FIELD TASK REPORT
            </div>
            <div className="ep-analytics-report-period">
              Reporting Month: <strong>{monthLabel}</strong> &bull; Assigned Staff: <strong>{staffName || "Field Staff"}</strong>
            </div>
          </div>

          <div className="ep-analytics-report-divider" />

          {/* KEY PERFORMANCE HIGHLIGHTS GRID */}
          <div className="ep-analytics-kpi-grid">
            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Total Waste Collected</div>
              <div className="ep-analytics-kpi-val">{Number(totalWasteKg).toLocaleString()} kg</div>
              <div className="ep-analytics-kpi-sub">MCF Intake for {monthLabel}</div>
            </div>

            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Completed Field Tasks</div>
              <div className="ep-analytics-kpi-val" style={{ color: "#1E6B4E" }}>
                {completedTasks}
              </div>
              <div className="ep-analytics-kpi-sub">{taskCompletionRate}% completion rate</div>
            </div>

            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Pending / Scheduled Tasks</div>
              <div className="ep-analytics-kpi-val" style={{ color: pendingTasks > 0 ? "#D97706" : "#059669" }}>
                {pendingTasks}
              </div>
              <div className="ep-analytics-kpi-sub">Active field assignments</div>
            </div>

            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Rescheduled Tasks</div>
              <div className="ep-analytics-kpi-val" style={{ color: rescheduledTasks > 0 ? "#0284c7" : "#64748b" }}>
                {rescheduledTasks}
              </div>
              <div className="ep-analytics-kpi-sub">Staff marked pending</div>
            </div>
          </div>

          {/* SECTION 1: FIELD TASK STATUS BREAKDOWN */}
          <div className="ep-analytics-report-section" style={{ pageBreakInside: "avoid" }}>
            <div className="ep-analytics-report-section-title">
              <CheckSquare size={16} color="#064e3b" />
              1. Field Pickup Task Status Breakdown
            </div>
            <div className="ep-analytics-grid-2">
              <div className="ep-analytics-field-box">
                <div className="ep-analytics-field-label">Completed Pickups</div>
                <div className="ep-analytics-field-val" style={{ color: "#1E6B4E" }}>
                  {completedTasks} tasks
                </div>
                <div className="ep-analytics-field-sub">Serviced and closed out successfully</div>
              </div>

              <div className="ep-analytics-field-box">
                <div className="ep-analytics-field-label">Pending / Assigned Pickups</div>
                <div className="ep-analytics-field-val" style={{ color: pendingTasks > 0 ? "#D97706" : "#059669" }}>
                  {pendingTasks} tasks
                </div>
                <div className="ep-analytics-field-sub">In queue or scheduled for collection</div>
              </div>
            </div>
          </div>

          {/* SECTION 2: WASTE COLLECTION SUMMARY */}
          <div className="ep-analytics-report-section">
            <div className="ep-analytics-report-section-title">
              <BarChart3 size={16} color="#064e3b" />
              2. Waste Collection Summary by Category
            </div>
            {wasteCategories.length === 0 || totalWasteKg === 0 ? (
              <div className="ep-analytics-empty-note">
                No material collection facility records logged for this month.
              </div>
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
                      <strong>{Number(totalWasteKg).toFixed(2)} kg</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>100.0%</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* FOOTER */}
          <div className="ep-analytics-report-footer-notes">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginBottom: 4,
                color: "#065f46",
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={16} />
              Digitally certified municipal operations record &mdash; EcoPulse Waste Management System.
            </div>
            <div>
              Staff Officer: <strong>{staffName || "Staff Member"}</strong> &bull; Generated on: {generatedNow} &bull; Scope: {monthLabel}
            </div>
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
