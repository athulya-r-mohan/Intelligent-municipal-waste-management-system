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
import { BASE_URL as API_BASE_URL } from "../api/api";


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

  // Prepare Waste Collected / Assigned for Recycling Chart Data (Graph 1)
  const wasteAssignedData = useMemo(() => {
    if (!analyticsData?.waste_assigned?.categories) return [];
    return analyticsData.waste_assigned.categories.map((c) => ({
      category: c.category,
      "Collected Waste (kg)": Number(c.assigned_kg != null ? c.assigned_kg : c.collected_kg || 0),
    }));
  }, [analyticsData]);

  const hasAssignedData = useMemo(() => {
    return wasteAssignedData.some((c) => c["Collected Waste (kg)"] > 0);
  }, [wasteAssignedData]);

  // Prepare Waste Recycled by Category Chart Data (Graph 2)
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

  // Prepare Previous Month vs Current Month Recycling Comparison Data (Graph 3)
  const comparisonData = useMemo(() => {
    const list = analyticsData?.recycling_comparison || analyticsData?.recycler_comparison;
    if (!list || !Array.isArray(list)) return [];
    const prevLabel = analyticsData?.previous_month?.label || "Previous Month";
    const currLabel = analyticsData?.current_month?.label || "Current Month";

    return list.map((item) => ({
      category: item.category || item.metric || "Other",
      [prevLabel]: Number(item.prev_month_kg != null ? item.prev_month_kg : item.prev_month || 0),
      [currLabel]: Number(item.curr_month_kg != null ? item.curr_month_kg : item.curr_month || 0),
    }));
  }, [analyticsData]);

  const hasComparisonData = useMemo(() => {
    if (!comparisonData || comparisonData.length === 0) return false;
    const prevLabel = analyticsData?.previous_month?.label || "Previous Month";
    const currLabel = analyticsData?.current_month?.label || "Current Month";
    return comparisonData.some(
      (c) => Number(c[prevLabel] || 0) > 0 || Number(c[currLabel] || 0) > 0
    );
  }, [comparisonData, analyticsData]);

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
                {analyticsData.previous_month && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      className="analytics-btn-download"
                      style={{ width: "100%", justifyContent: "center", padding: "7px 10px", fontSize: "12px", gap: 6 }}
                      onClick={() => handleOpenReport(analyticsData.previous_month)}
                      disabled={reportLoading}
                      title={`Download official report for ${analyticsData.previous_month.label}`}
                    >
                      <Download size={13} />
                      Download Previous Month Report
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CHARTS GRID: 2 COLUMNS */}
            <div className="analytics-charts-grid">
              {/* CHART 1: WASTE COLLECTED BY CATEGORY (GRAPH 1) */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <div>
                    <h3>
                      <Inbox size={18} color="#1E6B4E" />
                      Waste Collected by Category
                    </h3>
                    <p>
                      {analyticsData.current_month?.label} &bull; Assigned Intake by Waste Category
                    </p>
                  </div>
                  <span className="analytics-chart-badge">
                    Total Collected: {analyticsData.waste_assigned?.total_assigned_kg || 0} kg
                  </span>
                </div>

                <div className="analytics-chart-body">
                  {!hasAssignedData ? (
                    <div className="analytics-empty-chart">
                      <Inbox size={28} opacity={0.4} />
                      <div>No waste collected/assigned for recycling in {analyticsData.current_month?.label}.</div>
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
                          formatter={(value) => [`${value} kg`, "Collected Waste"]}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: "10px",
                            border: "1px solid #DCEEE3",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Bar
                          dataKey="Collected Waste (kg)"
                          fill="#1E6B4E"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* CHART 2: WASTE RECYCLED BY CATEGORY (GRAPH 2) */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <div>
                    <h3>
                      <Recycle size={18} color="#059669" />
                      Waste Recycled by Category
                    </h3>
                    <p>
                      {analyticsData.current_month?.label} &bull; Verified Completed Output by Category
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
                      <div>No completed recycling activity fulfilled yet in {analyticsData.current_month?.label}.</div>
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
                          formatter={(value) => [`${value} kg`, "Actually Recycled"]}
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

              {/* CHART 3: PREVIOUS MONTH VS CURRENT MONTH RECYCLING (GRAPH 3) */}
              <div className="analytics-chart-card full-width">
                <div className="analytics-chart-header">
                  <div>
                    <h3>
                      <TrendingUp size={18} color="#1E6B4E" />
                      Previous Month vs Current Month Recycling
                    </h3>
                    <p>
                      {analyticsData.previous_month?.label} vs {analyticsData.current_month?.label} &bull; Recycled Waste Comparison by Category
                    </p>
                  </div>
                  <span className="analytics-chart-badge" style={{ background: "#f8fafc", color: "#475569" }}>
                    Grouped Category Comparison
                  </span>
                </div>

                <div className="analytics-chart-body">
                  {!hasComparisonData ? (
                    <div className="analytics-empty-chart">
                      <TrendingUp size={28} opacity={0.4} />
                      <div>No completed recycling records found to compare between {analyticsData.previous_month?.label} and {analyticsData.current_month?.label}.</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={comparisonData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="category"
                          tick={{ fill: "#64748B", fontSize: 11 }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
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
                          fill="#059669"
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
              <div className="analytics-reports-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3>
                    <FileText size={18} color="#1E6B4E" />
                    Monthly Reports
                  </h3>
                  <p>Access and download certified historical monthly municipal waste analytics reports</p>
                </div>
                {analyticsData?.previous_month && (
                  <button
                    className="analytics-btn-download"
                    style={{ background: "#1E6B4E", color: "#ffffff", border: "none", padding: "8px 14px", fontWeight: 600 }}
                    onClick={() => handleOpenReport(analyticsData.previous_month)}
                    disabled={reportLoading}
                  >
                    <Download size={14} />
                    Download Previous Month Report ({analyticsData.previous_month.label})
                  </button>
                )}
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
