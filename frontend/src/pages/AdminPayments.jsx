import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  DollarSign,
  Search,
  BellRing,
  Receipt,
  FileText,
  X,
  User,
  Phone,
  MapPin,
  Layers,
  Scale,
  RefreshCw,
  Eye,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import PaymentReceiptModal from "../components/PaymentReceiptModal";
import SortableTh from "../components/SortableTh";
import { sortTableData, getNextSortDirection } from "../utils/tableSort";
import "../components/AdminPayments.css";
import { BASE_URL as API_BASE_URL } from "../api/api";

function getAccessToken() {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

export default function AdminPayments() {
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [totals, setTotals] = useState({
    total_payments: 0,
    completed_payments: 0,
    pending_payments: 0,
    total_amount_collected: 0,
    pending_amount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [remindingId, setRemindingId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedPickupDetail, setSelectedPickupDetail] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: null, dir: null });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: getNextSortDirection(prev.key, key, prev.dir),
    }));
  };

  useEffect(() => {
    fetchPayments();
  }, [selectedDate, statusFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      let url = `${API_BASE_URL}/api/waste/payments/admin/`;
      const params = new URLSearchParams();
      if (selectedDate) params.append("date", selectedDate);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await axios.get(url, config);
      if (res.data?.success) {
        setPayments(res.data.payments || []);
        if (res.data.totals) {
          setTotals(res.data.totals);
        }
      }
    } catch (err) {
      console.error("Admin payments fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== "ALL" && p.payment_status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.user_name || "").toLowerCase().includes(q);
      const matchId = String(p.pickup_id || p.pickup_request || "").includes(q);
      const matchPayId = (p.payment_id || "").toLowerCase().includes(q);
      const matchWard = (p.ward || "").toLowerCase().includes(q);
      const matchLoc = (p.pickup_location || "").toLowerCase().includes(q);
      return matchName || matchId || matchPayId || matchWard || matchLoc;
    }
    return true;
  });

  const sortedPayments = sortTableData(filteredPayments, sortConfig.key, sortConfig.dir, {
    pickup_id: (p) => p.pickup_id || p.pickup_request || 0,
    amount: (p) => Number(p.amount) || 50,
  });

  const handleRequestReminder = async (payment) => {
    try {
      setRemindingId(payment.id);
      const token = getAccessToken();
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const res = await axios.post(
        `${API_BASE_URL}/api/waste/payments/${payment.id}/request-payment/`,
        {},
        config
      );

      if (res.data?.success) {
        showToast(`Payment reminder sent to ${payment.user_name || "citizen"}!`);
      } else {
        showToast(res.data?.error || "Failed to send payment reminder.");
      }
    } catch (err) {
      console.error("Payment reminder error:", err);
      showToast(err.response?.data?.error || "Failed to send payment reminder.");
    } finally {
      setRemindingId(null);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  return (
    <div className="ep-admin-pay-page">
      {/* TOPBAR */}
      <header className="ep-admin-pay-topbar">
        <div className="ep-admin-pay-topbar-left">
          <button className="ep-admin-pay-back-btn" onClick={() => navigate("/admin")}>
            <ArrowLeft size={16} />
            Admin Dashboard
          </button>
          <div className="ep-admin-pay-brand">
            Eco<span>Pulse</span> Admin
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NotificationBell />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="ep-admin-pay-container">
        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div style={{ position: "fixed", top: 24, right: 24, background: "#064e3b", color: "#ffffff", padding: "12px 20px", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", zIndex: 10000, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, animation: "receiptSlideUp 0.2s ease" }}>
            <CheckCircle2 size={18} color="#86efac" />
            {toastMessage}
          </div>
        )}

        {/* HEADER & DATE SELECTOR */}
        <div className="ep-admin-pay-header-card">
          <div className="ep-admin-pay-title">
            <h1>Pickup Collection Payments</h1>
            <p>Track fixed ₹50 municipal fees, verified transactions, and dispatch payment reminders</p>
          </div>

          <div className="ep-admin-pay-filter-bar">
            <div className="ep-date-picker-wrap">
              <Calendar size={16} color="#10b981" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                title="Filter payments by pickup or payment date"
              />
              {selectedDate && (
                <button
                  type="button"
                  className="ep-clear-date-btn"
                  onClick={() => setSelectedDate("")}
                  title="Clear date filter"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="ep-btn-table-primary"
              onClick={fetchPayments}
              disabled={loading}
              style={{ padding: "8px 16px" }}
            >
              <RefreshCw size={14} style={{ animation: loading ? "staffSpin 1s linear infinite" : "none" }} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI SUMMARY CARDS */}
        <div className="ep-pay-stats-grid">
          <div className="ep-pay-stat-card">
            <div className="ep-pay-stat-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div className="ep-pay-stat-label">Total Revenue Collected</div>
              <div className="ep-pay-stat-val" style={{ color: "#047857" }}>
                ₹{totals.total_amount_collected}
              </div>
            </div>
          </div>

          <div className="ep-pay-stat-card">
            <div className="ep-pay-stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="ep-pay-stat-label">Completed Payments</div>
              <div className="ep-pay-stat-val">
                {totals.completed_payments} <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>(₹{totals.completed_payments * 50})</span>
              </div>
            </div>
          </div>

          <div className="ep-pay-stat-card">
            <div className="ep-pay-stat-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
              <Clock size={24} />
            </div>
            <div>
              <div className="ep-pay-stat-label">Pending Payments</div>
              <div className="ep-pay-stat-val" style={{ color: "#b45309" }}>
                {totals.pending_payments} <span style={{ fontSize: 13, color: "#92400e", fontWeight: 500 }}>(₹{totals.pending_amount})</span>
              </div>
            </div>
          </div>

          <div className="ep-pay-stat-card">
            <div className="ep-pay-stat-icon" style={{ background: "#f1f5f9", color: "#475569" }}>
              <CreditCard size={24} />
            </div>
            <div>
              <div className="ep-pay-stat-label">Total Pickups</div>
              <div className="ep-pay-stat-val">
                {totals.total_payments}
              </div>
            </div>
          </div>
        </div>

        {/* STATUS FILTER TABS */}
        <div className="ep-pay-tabs-wrap">
          <button
            type="button"
            className={`ep-pay-tab ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => setStatusFilter("ALL")}
          >
            All Pickups ({totals.total_payments})
          </button>
          <button
            type="button"
            className={`ep-pay-tab ${statusFilter === "COMPLETED" ? "active" : ""}`}
            onClick={() => setStatusFilter("COMPLETED")}
          >
            Completed ({totals.completed_payments})
          </button>
          <button
            type="button"
            className={`ep-pay-tab ${statusFilter === "PENDING" ? "active" : ""}`}
            onClick={() => setStatusFilter("PENDING")}
          >
            Pending ({totals.pending_payments})
          </button>
        </div>

        {/* PAYMENTS TABLE */}
        <div className="ep-admin-pay-table-card">
          <div className="ep-admin-pay-table-wrap">
            <table className="ep-admin-pay-table">
              <thead>
                <tr>
                  <SortableTh columnKey="payment_id" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                    Payment ID
                  </SortableTh>
                  <SortableTh columnKey="pickup_id" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                    Pickup
                  </SortableTh>
                  <SortableTh columnKey="user_name" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                    Resident / Contact
                  </SortableTh>
                  <SortableTh columnKey="ward" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                    Ward & Location
                  </SortableTh>
                  <SortableTh columnKey="waste_type" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                    Waste Type
                  </SortableTh>
                  <SortableTh columnKey="amount" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                    Fixed Fee
                  </SortableTh>
                  <SortableTh columnKey="payment_status" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                    Status
                  </SortableTh>
                  <SortableTh columnKey="payment_date" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                    Payment Date / Txn
                  </SortableTh>
                  <SortableTh disabled>
                    Actions
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {loading && sortedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "48px 20px" }}>
                      <div style={{ width: 32, height: 32, border: "3px solid #d1fae5", borderTopColor: "#10b981", borderRadius: "50%", margin: "0 auto 12px", animation: "staffSpin 1s linear infinite" }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#064e3b" }}>Loading payment records...</div>
                    </td>
                  </tr>
                ) : sortedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
                      No payment records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  sortedPayments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong style={{ color: "#059669", fontSize: 13 }}>
                          {p.payment_id || `PAY-${p.id}`}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: "#0f241a" }}>
                          Pickup #{p.pickup_id || p.pickup_request}
                        </span>
                        <div style={{ fontSize: 11.5, color: "#718d7f" }}>
                          {p.pickup_date || "Completed"}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.user_name || "Resident"}</div>
                        <div style={{ fontSize: 12, color: "#718d7f" }}>{p.user_phone || p.user_email || "N/A"}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.pickup_location || "Address"}</div>
                        {p.ward && (
                          <div style={{ fontSize: 11.5, color: "#10b981", fontWeight: 700 }}>
                            {p.ward}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ display: "inline-block", background: "#effbf2", color: "#137a41", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                          {p.waste_type || "Waste"}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "#0f241a", fontSize: 14.5 }}>
                          ₹{p.amount || 50}
                        </strong>
                      </td>
                      <td>
                        {p.payment_status === "COMPLETED" ? (
                          <span className="ep-badge-completed">
                            <CheckCircle2 size={12} />
                            Completed
                          </span>
                        ) : (
                          <span className="ep-badge-pending">
                            <Clock size={12} />
                            Pending
                          </span>
                        )}
                      </td>
                      <td>
                        {p.payment_status === "COMPLETED" ? (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{p.payment_date_formatted || p.payment_date || "Paid"}</div>
                            <div style={{ fontSize: 11, color: "#718d7f", fontFamily: "monospace" }}>{p.transaction_id || "TXN-VERIFIED"}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "#92400e" }}>Awaiting Citizen Payment</span>
                        )}
                      </td>
                      <td>
                        <div className="ep-table-btn-group">
                          <button
                            type="button"
                            className="ep-btn-table-primary"
                            onClick={() => setSelectedPickupDetail(p)}
                            title="View complete pickup details"
                          >
                            <Eye size={13} />
                            Details
                          </button>

                          {p.payment_status === "PENDING" ? (
                            <button
                              type="button"
                              className="ep-btn-table-remind"
                              onClick={() => handleRequestReminder(p)}
                              disabled={remindingId === p.id}
                              title="Send payment reminder notification to user"
                            >
                              <BellRing size={13} />
                              {remindingId === p.id ? "Sending..." : "Request Payment"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="ep-btn-table-primary"
                              onClick={() => setSelectedReceipt(p)}
                              title="View and print official payment receipt"
                            >
                              <Receipt size={13} />
                              Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* PICKUP DETAILS MODAL */}
      {selectedPickupDetail && (
        <div className="ep-pickup-detail-modal-overlay" onClick={() => setSelectedPickupDetail(null)}>
          <div className="ep-pickup-detail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ep-pickup-detail-modal-head">
              <h3>Pickup #{selectedPickupDetail.pickup_id || selectedPickupDetail.pickup_request} Details</h3>
              <button
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#065f46" }}
                onClick={() => setSelectedPickupDetail(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ep-pickup-detail-modal-body">
              <div className="ep-pickup-detail-grid">
                <div className="ep-pickup-detail-box">
                  <label>Citizen Name</label>
                  <span>{selectedPickupDetail.user_name || "N/A"}</span>
                </div>
                <div className="ep-pickup-detail-box">
                  <label>Contact Phone</label>
                  <span>{selectedPickupDetail.user_phone || "N/A"}</span>
                </div>
                <div className="ep-pickup-detail-box">
                  <label>Email</label>
                  <span>{selectedPickupDetail.user_email || "N/A"}</span>
                </div>
                <div className="ep-pickup-detail-box">
                  <label>Ward</label>
                  <span>{selectedPickupDetail.ward || "N/A"}</span>
                </div>
                <div className="ep-pickup-detail-box">
                  <label>Pickup Location</label>
                  <span>{selectedPickupDetail.pickup_location || "N/A"}</span>
                </div>
                <div className="ep-pickup-detail-box">
                  <label>Waste Category</label>
                  <span>{selectedPickupDetail.waste_type || "N/A"}</span>
                </div>
                <div className="ep-pickup-detail-box">
                  <label>Assigned Staff</label>
                  <span>{selectedPickupDetail.assigned_staff_name || "N/A"}</span>
                </div>
                <div className="ep-pickup-detail-box">
                  <label>Verified Net Weight</label>
                  <span>{selectedPickupDetail.completed_weight ? `${selectedPickupDetail.completed_weight} kg` : "N/A"}</span>
                </div>
                <div className="ep-pickup-detail-box">
                  <label>Completion Date</label>
                  <span>{selectedPickupDetail.completed_date || "Completed"}</span>
                </div>
                <div className="ep-pickup-detail-box">
                  <label>Payment Status</label>
                  <span style={{ color: selectedPickupDetail.payment_status === "COMPLETED" ? "#16a34a" : "#d97706" }}>
                    {selectedPickupDetail.payment_status} (₹{selectedPickupDetail.amount || 50})
                  </span>
                </div>
              </div>

              {selectedPickupDetail.completion_image && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#718d7f", display: "block", marginBottom: 6 }}>
                    Field Completion Photo Proof
                  </label>
                  <img
                    src={selectedPickupDetail.completion_image}
                    alt="Completion Proof"
                    style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 12, border: "1px solid #dcefe2" }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <PaymentReceiptModal
          payment={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
