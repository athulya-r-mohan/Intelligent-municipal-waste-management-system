import React from "react";
import { Printer, X, CheckCircle, Receipt, ShieldCheck } from "lucide-react";
import "./PaymentReceiptModal.css";

export default function PaymentReceiptModal({ payment, onClose }) {
  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const receiptId = payment.payment_id || `REC-${payment.pickup_id || "0000"}`;
  const txnId = payment.transaction_id || payment.order_id || "TXN-VERIFIED-ECOPULSE";
  const formattedDate = payment.payment_date_formatted || (payment.payment_date ? new Date(payment.payment_date).toLocaleString() : new Date().toLocaleString());

  return (
    <div className="ep-receipt-overlay" onClick={onClose}>
      <div className="ep-receipt-container" onClick={(e) => e.stopPropagation()}>
        {/* MODAL TOP HEADER */}
        <div className="ep-receipt-header-bar">
          <h3>
            <Receipt size={18} />
            Verified Payment Receipt
          </h3>
          <button className="ep-receipt-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* PRINTABLE RECEIPT CONTENT */}
        <div className="ep-receipt-printable">
          {/* BRAND HEADER */}
          <div className="ep-receipt-brand">
            <div className="ep-receipt-logo">
              Eco<span>Pulse</span>
            </div>
            <div className="ep-receipt-subbrand">
              Municipal Waste Management & Collection Optimization System
            </div>
            <div className="ep-receipt-title">
              Official Collection Payment Receipt
            </div>
          </div>

          {/* META INFO GRID */}
          <div className="ep-receipt-meta-grid">
            <div className="ep-receipt-meta-item">
              <div className="ep-receipt-meta-label">Receipt / Payment ID</div>
              <div className="ep-receipt-meta-val" style={{ color: "#059669" }}>{receiptId}</div>
            </div>

            <div className="ep-receipt-meta-item">
              <div className="ep-receipt-meta-label">Pickup Reference ID</div>
              <div className="ep-receipt-meta-val">Pickup #{payment.pickup_id || payment.pickup_request}</div>
            </div>

            <div className="ep-receipt-meta-item">
              <div className="ep-receipt-meta-label">Transaction ID</div>
              <div className="ep-receipt-meta-val" style={{ fontFamily: "monospace", fontSize: 12 }}>{txnId}</div>
            </div>

            <div className="ep-receipt-meta-item">
              <div className="ep-receipt-meta-label">Payment Date & Time</div>
              <div className="ep-receipt-meta-val">{formattedDate}</div>
            </div>
          </div>

          {/* TABLE OF DETAILS */}
          <table className="ep-receipt-table">
            <thead>
              <tr>
                <th>Service Description</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Citizen / User Name</strong></td>
                <td>{payment.user_name || "EcoPulse Resident"}</td>
              </tr>
              {payment.user_phone && (
                <tr>
                  <td><strong>Contact Phone</strong></td>
                  <td>{payment.user_phone}</td>
                </tr>
              )}
              {payment.ward && (
                <tr>
                  <td><strong>Municipal Ward</strong></td>
                  <td>{payment.ward}</td>
                </tr>
              )}
              <tr>
                <td><strong>Pickup Location</strong></td>
                <td>{payment.pickup_location || "Registered Address"}</td>
              </tr>
              <tr>
                <td><strong>Waste Category</strong></td>
                <td>{payment.waste_type || "Segregated Waste"}</td>
              </tr>
              {payment.completed_weight && (
                <tr>
                  <td><strong>Collected Net Weight</strong></td>
                  <td>{payment.completed_weight} kg</td>
                </tr>
              )}
              {payment.assigned_staff_name && (
                <tr>
                  <td><strong>Assigned Field Staff</strong></td>
                  <td>{payment.assigned_staff_name}</td>
                </tr>
              )}
              <tr>
                <td><strong>Payment Mode</strong></td>
                <td>{payment.payment_method || "UPI / Online Banking"}</td>
              </tr>
              <tr>
                <td><strong>Payment Status</strong></td>
                <td>
                  <span className="ep-receipt-status-badge">
                    <CheckCircle size={14} />
                    COMPLETED & VERIFIED
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TOTAL SUMMARY */}
          <div className="ep-receipt-total-box">
            <div>
              <div className="ep-receipt-total-label">Fixed Collection Fee (Incl. Taxes)</div>
              <div style={{ fontSize: 12, color: "#065f46" }}>Authorized municipal standard rate</div>
            </div>
            <div className="ep-receipt-total-amount">
              ₹50.00
            </div>
          </div>

          {/* FOOTER */}
          <div className="ep-receipt-footer-notes">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4, color: "#065f46", fontWeight: 600 }}>
              <ShieldCheck size={16} />
              Digitally verified and generated by EcoPulse Smart Waste Management System.
            </div>
            <div>This receipt is valid for official municipal tax & accounting records. Thank you for keeping our city clean and green!</div>
          </div>
        </div>

        {/* MODAL ACTIONS */}
        <div className="ep-receipt-actions">
          <button className="ep-receipt-btn-close" onClick={onClose}>
            Close
          </button>
          <button className="ep-receipt-btn-print" onClick={handlePrint}>
            <Printer size={16} />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
