import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Bell,
  LogOut,
  ArrowLeft,
  CalendarDays,
  Activity,
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  Recycle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Download,
  Eye,
  Layers,
  Inbox,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

import "../components/Adminpage.css";
import "../components/AdminAnalytics.css";
import NotificationBell from "../components/NotificationBell";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import RecyclerMonthlyReportModal from "../components/RecyclerMonthlyReportModal";
import { performLogout, getUserName } from "../utils/auth";

const API_BASE_URL = "http://127.0.0.1:8000";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/recycler" },
  { key: "profile", label: "My Profile", icon: User, path: "/profile" },
  { key: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
  { key: "analytics", label: "Analytics", icon: BarChart3, path: "/recycler/analytics" },
];


export default function RecyclerAnalytics() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchAnalytics = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setError(null);
    try {
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(`${API_BASE_URL}/api/waste/recycler/analytics/`, {
        headers,
      });

      if (response.data && response.data.success) {
        setAnalyticsData(response.data);
      } else {
        setError(response.data?.error || "Failed to load recycler analytics data.");
      }
    } catch (err) {
      console.error("Error fetching recycler analytics:", err);
      setError("Unable to load recycler analytics data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    // Auto-refresh every 45 seconds
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenReport = async (item) => {
    setReportLoading(true);
    try {
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        `${API_BASE_URL}/api/waste/recycler/analytics/?year=${item.year}&month=${item.month}`,
        { headers }
      );

      if (response.data && response.data.success && response.data.report) {
        setSelectedReport(response.data.report);
      } else {
        alert("Failed to load recycler report for the selected month.");
      }
    } catch (err) {
      console.error("Error fetching recycler month report:", err);
      alert("Error loading monthly report.");
    } finally {
      setReportLoading(false);
    }
  };

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Prepare Waste Assigned / Came for Recycling Chart Data
  const wasteAssignedData = useMemo(() => {
    if (!analyticsData?.waste_assigned?.categories) return [];
    return analyticsData.waste_assigned.categories.map((c) => ({
      category: c.category,
      "Received Waste (kg)": Number(c.assigned_kg || 0),
    }));
  }, [analyticsData]);

  const hasAssignedData = useMemo(() => {
    return wasteAssignedData.some((c) => c["Received Waste (kg)"] > 0);
  }, [wasteAssignedData]);

  // Prepare Recycled Waste Chart Data
  const recycledWasteData = useMemo(() => {
    if (!analyticsData?.recycled_waste?.categories) return [];
    return analyticsData.recycled_waste.categories.map((c) => ({
      category: c.category,
      "Recycled (kg)": Number(c.recycled_kg || 0),
    }));
  }, [analyticsData]);

  const hasRecycledData = useMemo(() => {
    return recycledWasteData.some((c) => c["Recycled (kg)"] > 0);
  }, [recycledWasteData]);

  // Prepare Previous Month vs Current Month Comparison Data (Received vs Recycled)
  const comparisonData = useMemo(() => {
    if (!analyticsData?.recycler_comparison) return [];
    const prevLabel = analyticsData?.previous_month?.label || "Previous Month";
    const currLabel = analyticsData?.current_month?.label || "Current Month";

    return analyticsData.recycler_comparison.map((item) => ({
      metric: item.metric,
      [prevLabel]: Number(item.prev_month || 0),
      [currLabel]: Number(item.curr_month || 0),
    }));
  }, [analyticsData]);

  const hasComparisonData = useMemo(() => {
    if (!analyticsData?.recycler_comparison) return false;
    return analyticsData.recycler_comparison.some(
      (c) => Number(c.prev_month || 0) > 0 || Number(c.curr_month || 0) > 0
    );
  }, [analyticsData]);

  const orgDisplayName =
    analyticsData?.organization || getUserName() || "Industrial Recycler";

  return (
    <div className="admin-root">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <button className="admin-logo" onClick={() => navigate("/recycler")}>
          <span className="admin-logo-mark">
            <Activity size={18} strokeWidth={2.5} />
          </span>
          <span className="admin-logo-text">
            Eco<span className="admin-logo-accent">Pulse</span>
          </span>
        </button>

        <div className="admin-sidebar-role">Recycler</div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === "analytics";
            return (
              <button
                key={item.key}
                className={isActive ? "admin-nav-item active" : "admin-nav-item"}
                onClick={() => navigate(item.path)}
              >
                <Icon size={17} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-spacer" />

        <button className="admin-logout" onClick={() => setShowLogoutModal(true)}>
          <LogOut size={17} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="admin-main">
        {/* TOPBAR */}
        <div className="admin-topbar">
          <button className="admin-back-btn" onClick={() => navigate("/recycler")}>
            <ArrowLeft size={15} strokeWidth={2.3} />
            Back to Dashboard
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="analytics-refresh-btn"
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing || loading}
              title="Refresh real-time analytics"
            >
              <RefreshCw size={14} className={refreshing ? "spinning" : ""} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <NotificationBell />

            <div className="admin-date-badge">
              <CalendarDays size={16} strokeWidth={2.2} />
              <span>{todayStr}</span>
            </div>
          </div>
        </div>

        {/* PULSE WAVE DIVIDER */}
        <svg className="admin-pulse-divider" viewBox="0 0 800 22" preserveAspectRatio="none">
          <polyline
            points="0,11 260,11 285,2 305,20 325,11 800,11"
            fill="none"
            stroke="#3FA96B"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* PAGE HEADER */}
        <h1 className="admin-page-heading">Recycler Analytics</h1>
        <p className="admin-page-sub">
          Real-time overview of assigned municipal waste and recycling performance &bull; {orgDisplayName}
        </p>

        {/* LOADING STATE */}
        {loading && (
          <div className="analytics-loading-box">
            <RefreshCw size={32} className="spinning" color="#1E6B4E" />
            <div style={{ color: "#6C8479", fontWeight: 500 }}>Loading recycler analytics data...</div>
          </div>
        )}

        {/* ERROR STATE */}
        {error && !loading && (
          <div className="analytics-error-box">
            <AlertCircle size={32} />
            <div>{error}</div>
            <button className="analytics-retry-btn" onClick={() => fetchAnalytics(true)}>
              Retry
            </button>
          </div>
        )}

        {/* ANALYTICS CONTENT */}
        {!loading && !error && analyticsData && (
          <>
            {/* 3 SUMMARY / MONTH CARDS */}
            <div className="analytics-grid-kpis">
              {/* CARD 1: DAYS REMAINING */}
              <div className="analytics-kpi-card">
                <div className="analytics-kpi-header">
                  <span className="analytics-kpi-title">Days Remaining</span>
                  <div className="analytics-kpi-icon">
                    <Clock size={20} />
                  </div>
                </div>
                <div className="analytics-kpi-num highlight">
                  {analyticsData.days_remaining}
                </div>
                <div className="analytics-kpi-sub">
                  <Calendar size={14} />
                  <span>
                    Days remaining in {analyticsData.current_month?.label}
                  </span>
                </div>
              </div>

              {/* CARD 2: CURRENT MONTH */}
              <div className="analytics-kpi-card">
                <div className="analytics-kpi-header">
                  <span className="analytics-kpi-title">Current Month</span>
                  <div className="analytics-kpi-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
                    <Calendar size={20} />
                  </div>
                </div>
                <div className="analytics-kpi-num" style={{ fontSize: "24px", paddingTop: "4px" }}>
                  {analyticsData.current_month?.label}
                </div>
                <div className="analytics-kpi-sub">
                  <span>
                    Recycled: <strong>{analyticsData.recycled_waste?.total_recycled_kg || 0} kg</strong> &bull; Received: <strong>{analyticsData.waste_assigned?.total_assigned_kg || 0} kg</strong>
                  </span>
                </div>
              </div>

              {/* CARD 3: PREVIOUS MONTH */}
              <div className="analytics-kpi-card">
                <div className="analytics-kpi-header">
                  <span className="analytics-kpi-title">Previous Month</span>
                  <div className="analytics-kpi-icon" style={{ background: "#f8fafc", color: "#64748b" }}>
                    <Layers size={20} />
                  </div>
                </div>
                <div className="analytics-kpi-num" style={{ fontSize: "24px", paddingTop: "4px" }}>
                  {analyticsData.previous_month?.label}
                </div>
                <div className="analytics-kpi-sub">
                  <span>Dynamic baseline comparison</span>
                </div>
              </div>
            </div>

            {/* CHARTS GRID: 2 COLUMNS */}
            <div className="analytics-charts-grid">
              {/* CHART 1: WASTE CAME FOR RECYCLING GRAPH */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <div>
                    <h3>
                      <Inbox size={18} color="#1E6B4E" />
                      Waste Came for Recycling
                    </h3>
                    <p>
                      {analyticsData.current_month?.label} &bull; Material Assigned by Category
                    </p>
                  </div>
                  <span className="analytics-chart-badge">
                    Total Assigned: {analyticsData.waste_assigned?.total_assigned_kg || 0} kg
                  </span>
                </div>

                <div className="analytics-chart-body">
                  {!hasAssignedData ? (
                    <div className="analytics-empty-chart">
                      <Inbox size={28} opacity={0.4} />
                      <div>No waste assigned for recycling in {analyticsData.current_month?.label}.</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={wasteAssignedData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="category"
                          tick={{ fill: "#64748B", fontSize: 11 }}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fill: "#64748B", fontSize: 11 }} unit=" kg" />
                        <Tooltip
                          formatter={(value) => [`${value} kg`, "Received Waste"]}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: "10px",
                            border: "1px solid #DCEEE3",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Bar
                          dataKey="Received Waste (kg)"
                          fill="#1E6B4E"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* CHART 2: RECYCLED WASTE GRAPH */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <div>
                    <h3>
                      <Recycle size={18} color="#059669" />
                      Recycled Waste
                    </h3>
                    <p>
                      {analyticsData.current_month?.label} &bull; Processed Output by Category
                    </p>
                  </div>
                  <span className="analytics-chart-badge" style={{ background: "#ecfdf5", color: "#059669" }}>
                    Total Recycled: {analyticsData.recycled_waste?.total_recycled_kg || 0} kg
                  </span>
                </div>

                <div className="analytics-chart-body">
                  {!hasRecycledData ? (
                    <div className="analytics-empty-chart">
                      <Recycle size={28} opacity={0.4} />
                      <div>No recycling activity completed yet in {analyticsData.current_month?.label}.</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={recycledWasteData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="category"
                          tick={{ fill: "#64748B", fontSize: 11 }}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fill: "#64748B", fontSize: 11 }} unit=" kg" />
                        <Tooltip
                          formatter={(value) => [`${value} kg`, "Recycled Material"]}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: "10px",
                            border: "1px solid #DCEEE3",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Bar
                          dataKey="Recycled (kg)"
                          fill="#059669"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* CHART 3: RECYCLER COMPARISON GRAPH (FULL WIDTH) */}
              <div className="analytics-chart-card full-width">
                <div className="analytics-chart-header">
                  <div>
                    <h3>
                      <TrendingUp size={18} color="#1E6B4E" />
                      Previous Month vs Current Month
                    </h3>
                    <p>
                      {analyticsData.previous_month?.label} vs {analyticsData.current_month?.label} &bull; Waste Received vs Waste Recycled
                    </p>
                  </div>
                  <span className="analytics-chart-badge" style={{ background: "#f8fafc", color: "#475569" }}>
                    Grouped Comparison
                  </span>
                </div>

                <div className="analytics-chart-body">
                  {!hasComparisonData ? (
                    <div className="analytics-empty-chart">
                      <TrendingUp size={28} opacity={0.4} />
                      <div>No recycling comparison data available between these months.</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={comparisonData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="metric"
                          tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }}
                        />
                        <YAxis tick={{ fill: "#64748B", fontSize: 11 }} unit=" kg" />
                        <Tooltip
                          formatter={(value) => [`${value} kg`]}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: "10px",
                            border: "1px solid #DCEEE3",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                        <Bar
                          dataKey={analyticsData.previous_month?.label || "Previous Month"}
                          fill="#94A3B8"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey={analyticsData.current_month?.label || "Current Month"}
                          fill="#1E6B4E"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* MONTHLY REPORTS SECTION */}
            <div className="analytics-reports-section">
              <div className="analytics-reports-header">
                <div>
                  <h3>
                    <FileText size={18} color="#1E6B4E" />
                    Monthly Reports
                  </h3>
                  <p>Access and download certified historical monthly municipal waste analytics reports</p>
                </div>
              </div>

              {!analyticsData.monthly_reports || analyticsData.monthly_reports.length === 0 ? (
                <div className="analytics-empty-chart" style={{ height: "140px" }}>
                  <FileText size={24} opacity={0.4} />
                  <div>No historical monthly reports available yet for your organization.</div>
                </div>
              ) : (
                <div className="analytics-reports-table-container">
                  <table className="analytics-reports-table">
                    <thead>
                      <tr>
                        <th>Report Month</th>
                        <th>Waste Received for Recycling</th>
                        <th>Total Recycled</th>
                        <th>Completed Tasks</th>
                        <th>Pending Tasks</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.monthly_reports.map((m) => (
                        <tr key={`${m.year}-${m.month}`}>
                          <td>
                            <strong>{m.label}</strong>
                          </td>
                          <td>{Number(m.waste_received_kg || 0).toFixed(2)} kg</td>
                          <td style={{ color: "#059669", fontWeight: 600 }}>
                            {Number(m.total_recycled_kg || 0).toFixed(2)} kg
                          </td>
                          <td style={{ color: "#1E6B4E" }}>{m.completed_tasks || 0}</td>
                          <td style={{ color: m.pending_tasks > 0 ? "#D97706" : "#64748B" }}>
                            {m.pending_tasks || 0}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="analytics-btn-view"
                              onClick={() => handleOpenReport(m)}
                              disabled={reportLoading}
                            >
                              <Eye size={13} />
                              View
                            </button>
                            <button
                              className="analytics-btn-download"
                              onClick={() => handleOpenReport(m)}
                              disabled={reportLoading}
                            >
                              <Download size={13} />
                              Download Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* RECYCLER MONTHLY REPORT MODAL (VIEW & PRINT/DOWNLOAD PDF) */}
      {selectedReport && (
        <RecyclerMonthlyReportModal
          report={selectedReport}
          organization={orgDisplayName}
          onClose={() => setSelectedReport(null)}
        />
      )}

      {/* LOGOUT CONFIRM MODAL */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => performLogout(navigate)}
      />
    </div>
  );
}
