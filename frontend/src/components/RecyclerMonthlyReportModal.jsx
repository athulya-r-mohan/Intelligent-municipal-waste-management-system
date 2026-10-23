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
  Recycle,
  CheckSquare,
  Building2,
  ClipboardList,
} from "lucide-react";
import "./AdminMonthlyReportModal.css";

export default function RecyclerMonthlyReportModal({ report, organization, onClose }) {
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

  const totalAssignedKg = report.waste_assigned?.total_assigned_kg || 0;
  const assignedCategories = report.waste_assigned?.categories || [];

  const totalRecycledKg = report.recycled_waste?.total_recycled_kg || 0;
  const recycledCategories = report.recycled_waste?.categories || [];

  const completedTasks = report.task_status?.completed || 0;
  const pendingTasks = report.task_status?.pending || 0;
  const totalTasks = completedTasks + pendingTasks;

  const recyclingRate =
    totalAssignedKg > 0 ? ((totalRecycledKg / totalAssignedKg) * 100).toFixed(1) : "0.0";
  const taskCompletionRate =
    totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : "0.0";

  // Individual completed recycling records list
  const records = report.records || report.recycled_waste?.records || [];

  // Map categories side-by-side
  const categoryMap = {};
  assignedCategories.forEach((c) => {
    categoryMap[c.category] = {
      category: c.category,
      assigned_kg: Number(c.assigned_kg || 0),
      recycled_kg: 0,
    };
  });
  recycledCategories.forEach((c) => {
    if (!categoryMap[c.category]) {
      categoryMap[c.category] = {
        category: c.category,
        assigned_kg: 0,
        recycled_kg: Number(c.recycled_kg || 0),
      };
    } else {
      categoryMap[c.category].recycled_kg = Number(c.recycled_kg || 0);
    }
  });
  const categoryRows = Object.values(categoryMap);

  return (
    <div className="ep-analytics-report-overlay" onClick={onClose}>
      <div className="ep-analytics-report-container" onClick={(e) => e.stopPropagation()}>
        {/* MODAL TOP HEADER */}
        <div className="ep-analytics-report-header-bar">
          <h3>
            <FileText size={18} />
            Recycler Monthly Waste Processing Report &mdash; {monthLabel}
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
              Intelligent Municipal Waste Management System &bull; Certified Industrial Recycling Audit &amp; Fulfillment
            </div>
            <div className="ep-analytics-report-title">
              RECYCLER MONTHLY WASTE RECOVERY &amp; PROCESSING REPORT
            </div>
            <div className="ep-analytics-report-period">
              Reporting Month: <strong>{monthLabel}</strong> &bull; Organization: <strong>{organization || "Authorized Recycler"}</strong>
            </div>
          </div>

          <div className="ep-analytics-report-divider" />

          {/* KEY PERFORMANCE HIGHLIGHTS GRID */}
          <div className="ep-analytics-kpi-grid">
            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Waste Received for Recycling</div>
              <div className="ep-analytics-kpi-val">{Number(totalAssignedKg).toLocaleString()} kg</div>
              <div className="ep-analytics-kpi-sub">Total intake for {monthLabel}</div>
            </div>

            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Total Recycled Output</div>
              <div className="ep-analytics-kpi-val" style={{ color: "#059669" }}>
                {Number(totalRecycledKg).toLocaleString()} kg
              </div>
              <div className="ep-analytics-kpi-sub">{recyclingRate}% recovery yield</div>
            </div>

            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Completed Tasks</div>
              <div className="ep-analytics-kpi-val" style={{ color: "#1E6B4E" }}>
                {completedTasks}
              </div>
              <div className="ep-analytics-kpi-sub">{taskCompletionRate}% fulfillment rate</div>
            </div>

            <div className="ep-analytics-kpi-card">
              <div className="ep-analytics-kpi-label">Pending Intake Tasks</div>
              <div className="ep-analytics-kpi-val" style={{ color: pendingTasks > 0 ? "#D97706" : "#059669" }}>
                {pendingTasks}
              </div>
              <div className="ep-analytics-kpi-sub">Awaiting processing</div>
            </div>
          </div>

          {/* SECTION 1: CATEGORY BREAKDOWN TABLE */}
          <div className="ep-analytics-report-section">
            <div className="ep-analytics-report-section-title">
              <Recycle size={16} color="#064e3b" />
              1. Waste Intake vs Recycled Material Breakdown by Category
            </div>
            {categoryRows.length === 0 || (totalAssignedKg === 0 && totalRecycledKg === 0) ? (
              <div className="ep-analytics-empty-note">
                No recycling assignment or processing records found for this month.
              </div>
            ) : (
              <table className="ep-analytics-report-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: "right" }}>Received (kg)</th>
                    <th style={{ textAlign: "right" }}>Recycled (kg)</th>
                    <th style={{ textAlign: "right" }}>Yield Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryRows.map((cat, i) => {
                    const assigned = cat.assigned_kg;
                    const recycled = cat.recycled_kg;
                    const yieldPct = assigned > 0 ? ((recycled / assigned) * 100).toFixed(1) : "-";
                    return (
                      <tr key={cat.category || i}>
                        <td>
                          <strong>{cat.category}</strong>
                        </td>
                        <td style={{ textAlign: "right" }}>{assigned.toFixed(2)} kg</td>
                        <td style={{ textAlign: "right", color: recycled > 0 ? "#059669" : "#64748b" }}>
                          {recycled.toFixed(2)} kg
                        </td>
                        <td style={{ textAlign: "right", color: "#64748b" }}>{yieldPct !== "-" ? `${yieldPct}%` : "-"}</td>
                      </tr>
                    );
                  })}
                  <tr className="ep-analytics-table-total-row">
                    <td>
                      <strong>Total Processed</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{Number(totalAssignedKg).toFixed(2)} kg</strong>
                    </td>
                    <td style={{ textAlign: "right", color: "#059669" }}>
                      <strong>{Number(totalRecycledKg).toFixed(2)} kg</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>{recyclingRate}%</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* SECTION 2: INDIVIDUAL RECYCLING RECORDS AUDIT TABLE */}
          <div className="ep-analytics-report-section">
            <div className="ep-analytics-report-section-title">
              <ClipboardList size={16} color="#064e3b" />
              2. Individual Completed Recycling Records ({records.length} {records.length === 1 ? "Record" : "Records"})
            </div>
            {records.length === 0 ? (
              <div className="ep-analytics-empty-note">
                No individual completed recycling records recorded for this calendar month.
              </div>
            ) : (
              <table className="ep-analytics-report-table">
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Completion Date</th>
                    <th>Category</th>
                    <th style={{ textAlign: "right" }}>Assigned (kg)</th>
                    <th style={{ textAlign: "right" }}>Recycled (kg)</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <strong>{rec.record_id || `REC-${String(rec.id).padStart(4, "0")}`}</strong>
                      </td>
                      <td style={{ color: "#475569" }}>{rec.completed_at || rec.date || "N/A"}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{rec.waste_type || rec.category}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {Number(rec.assigned_quantity_kg || 0).toFixed(2)} kg
                      </td>
                      <td style={{ textAlign: "right", color: "#059669", fontWeight: 600 }}>
                        {Number(rec.recycled_quantity_kg || 0).toFixed(2)} kg
                      </td>
                      <td style={{ color: "#64748b", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {rec.note && rec.note.trim() ? rec.note.trim() : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="ep-analytics-table-total-row">
                    <td colSpan={3}>
                      <strong>Total Verified Output</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong>
                        {records
                          .reduce((acc, r) => acc + Number(r.assigned_quantity_kg || 0), 0)
                          .toFixed(2)}{" "}
                        kg
                      </strong>
                    </td>
                    <td style={{ textAlign: "right", color: "#059669" }}>
                      <strong>
                        {records
                          .reduce((acc, r) => acc + Number(r.recycled_quantity_kg || 0), 0)
                          .toFixed(2)}{" "}
                        kg
                      </strong>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* SECTION 3: TASK COMPLETION STATUS */}
          <div className="ep-analytics-report-section" style={{ pageBreakInside: "avoid" }}>
            <div className="ep-analytics-report-section-title">
              <CheckSquare size={16} color="#064e3b" />
              3. Recycling Assignment Task Status
            </div>
            <div className="ep-analytics-grid-2">
              <div className="ep-analytics-field-box">
                <div className="ep-analytics-field-label">Completed Recycling Assignments</div>
                <div className="ep-analytics-field-val" style={{ color: "#1E6B4E" }}>
                  {completedTasks} tasks
                </div>
                <div className="ep-analytics-field-sub">Processed with verified weight proofs</div>
              </div>

              <div className="ep-analytics-field-box">
                <div className="ep-analytics-field-label">Pending / Scheduled Assignments</div>
                <div className="ep-analytics-field-val" style={{ color: pendingTasks > 0 ? "#D97706" : "#059669" }}>
                  {pendingTasks} tasks
                </div>
                <div className="ep-analytics-field-sub">Active workflow items</div>
              </div>
            </div>
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
              Digitally certified industrial recycling record &mdash; EcoPulse Municipal Waste System.
            </div>
            <div>
              Recycler Partner: <strong>{organization || "Recycler"}</strong> &bull; Generated on: {generatedNow} &bull; Scope: {monthLabel}
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
