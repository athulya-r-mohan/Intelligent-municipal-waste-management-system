import React from "react";
import { Printer, X, FileText, CheckCircle2, ShieldCheck, Building2, User, MapPin, Camera } from "lucide-react";
import "./RecycledReportModal.css";

const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "N/A";

  if (includeTime) {
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTimeOnly = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function RecycledReportModal({ record, onClose }) {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  const recordRefId = `#REC-${String(record.id).padStart(4, "0")}`;
  const recyclingDateStr = formatDate(record.completed_at || record.date);
  const recyclingTimeStr = formatTimeOnly(record.completed_at);
  const generatedNow = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const actualQtyStr =
    record.recyclable_quantity != null
      ? `${parseFloat(record.recyclable_quantity).toFixed(2)} kg`
      : `${parseFloat(record.total_quantity || 0).toFixed(2)} kg`;

  const assignedQtyStr = record.total_quantity
    ? `${parseFloat(record.total_quantity).toFixed(2)} kg`
    : "N/A";

  const noteText =
    record.note && record.note.trim() ? record.note.trim() : "No note provided";

  const imgSrc =
    record.recycling_image_url ||
    (record.recycling_image
      ? (record.recycling_image.startsWith("http")
          ? record.recycling_image
          : `https://intelligent-municipal-waste-management.onrender.com${record.recycling_image.startsWith("/") ? "" : "/"}${record.recycling_image}`)
      : null);

  return (
    <div className="ep-report-overlay" onClick={onClose}>
      <div className="ep-report-container" onClick={(e) => e.stopPropagation()}>
        {/* MODAL TOP HEADER */}
        <div className="ep-report-header-bar">
          <h3>
            <FileText size={18} />
            Recycled Waste Item Report
          </h3>
          <button className="ep-report-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* PRINTABLE REPORT DOCUMENT */}
        <div className="ep-report-printable">
          {/* BRAND & REPORT HEADER */}
          <div className="ep-report-brand">
            <div className="ep-report-logo">
              INTELLIGENT MUNICIPAL WASTE MANAGEMENT SYSTEM
            </div>
            <div className="ep-report-subbrand">
              Official Municipal Recycling & Environmental Fulfillment Document
            </div>
            <div className="ep-report-title">
              RECYCLED WASTE REPORT
            </div>
          </div>

          <div className="ep-report-divider" />

          {/* SECTION 1: RECYCLING RECORD DETAILS */}
          <div className="ep-report-section">
            <div className="ep-report-section-title">
              <FileText size={15} color="#064e3b" />
              Recycling Record Details
            </div>
            <div className="ep-report-grid">
              <div className="ep-report-field">
                <div className="ep-report-label">Record ID / Reference</div>
                <div className="ep-report-val" style={{ color: "#059669" }}>
                  {recordRefId}
                </div>
              </div>

              <div className="ep-report-field">
                <div className="ep-report-label">Status</div>
                <div className="ep-report-val" style={{ color: "#047857", display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={14} />
                  {record.status || "COMPLETED"}
                </div>
              </div>

              <div className="ep-report-field">
                <div className="ep-report-label">Recycling Date</div>
                <div className="ep-report-val">{recyclingDateStr}</div>
              </div>

              <div className="ep-report-field">
                <div className="ep-report-label">Recycling Time</div>
                <div className="ep-report-val">{recyclingTimeStr || "N/A"}</div>
              </div>

              <div className="ep-report-field">
                <div className="ep-report-label">Waste Category</div>
                <div className="ep-report-val" style={{ color: "#064e3b" }}>
                  {record.waste_type}
                </div>
              </div>

              <div className="ep-report-field">
                <div className="ep-report-label">Actual Recycled Quantity</div>
                <div className="ep-report-val" style={{ color: "#047857", fontSize: 15 }}>
                  {actualQtyStr}
                </div>
              </div>

              <div className="ep-report-field" style={{ gridColumn: "1 / -1" }}>
                <div className="ep-report-label">Assigned Quantity</div>
                <div className="ep-report-val">{assignedQtyStr}</div>
              </div>
            </div>
          </div>

          {/* SECTION 2: RECYCLER DETAILS */}
          <div className="ep-report-section">
            <div className="ep-report-section-title">
              <Building2 size={15} color="#064e3b" />
              Recycler Details
            </div>
            <div className="ep-report-grid">
              <div className="ep-report-field">
                <div className="ep-report-label">Recycler Name / Organization</div>
                <div className="ep-report-val">{record.recycler_organization || "N/A"}</div>
              </div>

              <div className="ep-report-field">
                <div className="ep-report-label">Recycler Email</div>
                <div className="ep-report-val">{record.recycler_email || "N/A"}</div>
              </div>

              <div className="ep-report-field">
                <div className="ep-report-label">Contact Phone</div>
                <div className="ep-report-val">{record.recycler_phone || "N/A"}</div>
              </div>

              <div className="ep-report-field">
                <div className="ep-report-label">Handled Waste Specialty</div>
                <div className="ep-report-val">{record.recycler_waste_type || record.waste_type || "N/A"}</div>
              </div>

              {record.recycler_address && (
                <div className="ep-report-field" style={{ gridColumn: "1 / -1" }}>
                  <div className="ep-report-label">Recycler Facility Address</div>
                  <div className="ep-report-val">{record.recycler_address}</div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: ASSIGNMENT DETAILS */}
          <div className="ep-report-section">
            <div className="ep-report-section-title">
              <User size={15} color="#064e3b" />
              Assignment Details
            </div>
            <div className="ep-report-grid">
              <div className="ep-report-field">
                <div className="ep-report-label">Assigned By</div>
                <div className="ep-report-val">{record.assigned_by_name || "Admin"}</div>
              </div>

              <div className="ep-report-field">
                <div className="ep-report-label">Assignment Date</div>
                <div className="ep-report-val">{formatDate(record.date)}</div>
              </div>
            </div>
          </div>

          {/* SECTION 4: LOCATION / MUNICIPAL DETAILS */}
          <div className="ep-report-section">
            <div className="ep-report-section-title">
              <MapPin size={15} color="#064e3b" />
              Location & Facility Details
            </div>
            <div className="ep-report-grid">
              <div className="ep-report-field">
                <div className="ep-report-label">Municipal Ward</div>
                <div className="ep-report-val">Central Municipal Ward Zone</div>
              </div>

              <div className="ep-report-field">
                <div className="ep-report-label">MCF / Location</div>
                <div className="ep-report-val">Material Collection Facility (MCF Hub)</div>
              </div>
            </div>
          </div>

          {/* SECTION 5: RECYCLER NOTE */}
          <div className="ep-report-section">
            <div className="ep-report-section-title">
              <FileText size={15} color="#064e3b" />
              Recycler Note
            </div>
            <div className="ep-report-note-box">
              <div className="ep-report-note-title">Saved Process Note</div>
              <div>{noteText}</div>
            </div>
          </div>

          {/* SECTION 6: RECYCLING IMAGE */}
          <div className="ep-report-section" style={{ pageBreakInside: "avoid" }}>
            <div className="ep-report-section-title">
              <Camera size={15} color="#064e3b" />
              Recycling Image
            </div>
            {imgSrc ? (
              <div style={{ marginTop: 10, textAlign: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px" }}>
                <img
                  src={imgSrc}
                  alt="Recycling Proof"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 260,
                    objectFit: "contain",
                    borderRadius: 8,
                    border: "1px solid #d1fae5",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    display: "inline-block",
                  }}
                />
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 8, fontWeight: 500 }}>
                  Verified material & recycling fulfillment photograph submitted by {record.recycler_organization || "recycler"}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#64748b", fontStyle: "italic", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px" }}>
                No recycling image available
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="ep-report-footer-notes">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4, color: "#065f46", fontWeight: 600 }}>
              <ShieldCheck size={16} />
              Digitally generated and verified report — Intelligent Municipal Waste Management System.
            </div>
            <div>Generated on: {generatedNow}</div>
          </div>
        </div>

        {/* MODAL BOTTOM ACTIONS */}
        <div className="ep-report-actions">
          <button className="ep-report-btn-close" onClick={onClose}>
            Close
          </button>
          <button className="ep-report-btn-print" onClick={handlePrint}>
            <Printer size={16} />
            Print / Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
