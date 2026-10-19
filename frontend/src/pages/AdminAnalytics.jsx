import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  UserCircle2,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

import "../components/Adminpage.css";
import "../components/AdminAnalytics.css";
import NotificationBell from "../components/NotificationBell";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import AdminMonthlyReportModal from "../components/AdminMonthlyReportModal";
import { performLogout } from "../utils/auth";

const API_BASE_URL = "http://127.0.0.1:8000";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "municipality", label: "Manage Municipality", icon: Building2 },
  { key: "profile", label: "My Profile", icon: UserCircle2 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

const PIE_COLORS = {
  Completed: "#1E6B4E",
  Pending: "#D97706",
};

export default function AdminAnalytics() {
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

      const response = await axios.get(`${API_BASE_URL}/api/waste/admin/analytics/`, {
        headers,
      });

      if (response.data && response.data.success) {
        setAnalyticsData(response.data);
      } else {
        setError("Failed to load analytics data.");
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Unable to load analytics data. Please try again.");
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
        `${API_BASE_URL}/api/waste/admin/analytics/?year=${item.year}&month=${item.month}`,
        { headers }
      );

      if (response.data && response.data.success && response.data.report) {
        setSelectedReport(response.data.report);
      } else {
        alert("Failed to load report for the selected month.");
      }
    } catch (err) {
      console.error("Error fetching month report:", err);
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

  // Prepare chart datasets
  const wasteCollectionData = useMemo(() => {
    if (!analyticsData?.waste_collection?.categories) return [];
    return analyticsData.waste_collection.categories.map((c) => ({
      category: c.category,
      "Collected Waste (kg)": Number(c.collected_kg || 0),
    }));
  }, [analyticsData]);

  const hasCurrentWasteData = useMemo(() => {
    return wasteCollectionData.some((c) => c["Collected Waste (kg)"] > 0);
  }, [wasteCollectionData]);

  const comparisonData = useMemo(() => {
    if (!analyticsData?.waste_comparison) return [];
    const prevLabel = analyticsData?.previous_month?.label || "Previous Month";
    const currLabel = analyticsData?.current_month?.label || "Current Month";

    return analyticsData.waste_comparison.map((item) => ({
      category: item.category,
      [prevLabel]: Number(item.prev_month_kg || 0),
      [currLabel]: Number(item.curr_month_kg || 0),
    }));
  }, [analyticsData]);

  const hasComparisonData = useMemo(() => {
    if (!analyticsData?.waste_comparison) return false;
    return analyticsData.waste_comparison.some(
      (c) => Number(c.prev_month_kg || 0) > 0 || Number(c.curr_month_kg || 0) > 0
    );
  }, [analyticsData]);

  const recycledData = useMemo(() => {
    if (!analyticsData?.recycled_waste?.categories) return [];
    return analyticsData.recycled_waste.categories.map((c) => ({
      category: c.category,
      "Recycled (kg)": Number(c.recycled_kg || 0),
    }));
  }, [analyticsData]);

  const hasRecycledData = useMemo(() => {
    return recycledData.some((c) => c["Recycled (kg)"] > 0);
  }, [recycledData]);

  const taskPieData = useMemo(() => {
    const completed = Number(analyticsData?.task_status?.completed || 0);
    const pending = Number(analyticsData?.task_status?.pending || 0);
    if (completed === 0 && pending === 0) return [];
    return [
      { name: "Completed", value: completed },
      { name: "Pending", value: pending },
    ];
  }, [analyticsData]);

  const totalCurrentTasks =
    (Number(analyticsData?.task_status?.completed) || 0) +
    (Number(analyticsData?.task_status?.pending) || 0);

  return (
    <div className="admin-root">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <button className="admin-logo" onClick={() => navigate("/admin")}>
          <span className="admin-logo-mark">
            <Activity size={18} strokeWidth={2.5} />
          </span>
          <span className="admin-logo-text">
            Eco<span className="admin-logo-accent">Pulse</span>
          </span>
        </button>

        <div className="admin-sidebar-role">Admin</div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === "analytics";
            return (
              <button
                key={item.key}
                className={isActive ? "admin-nav-item active" : "admin-nav-item"}
                onClick={() => {
                  if (item.key === "dashboard") navigate("/admin");
                  else if (item.key === "municipality") navigate("/admin");
                  else if (item.key === "notifications") navigate("/notifications");
                  else if (item.key === "analytics") navigate("/admin/analytics");
                  else if (item.key === "profile") navigate("/profile");
                }}
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
          <button className="admin-back-btn" onClick={() => navigate("/admin")}>
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
        <h1 className="admin-page-heading">Analytics</h1>
        <p className="admin-page-sub">Real-time overview of municipal waste management activity</p>

        {/* LOADING STATE */}
        {loading && (
          <div className="analytics-loading-box">
            <RefreshCw size={32} className="spinning" color="#1E6B4E" />
            <div style={{ color: "#6C8479", fontWeight: 500 }}>Loading analytics data...</div>
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
                    Collected: <strong>{analyticsData.waste_collection?.total_kg || 0} kg</strong>
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

            {/* CHARTS GRID: 2x2 */}
            <div className="analytics-charts-grid">
              {/* CHART 1: CURRENT MONTH WASTE COLLECTION BY CATEGORY */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <div>
                    <h3>
                      <BarChart3 size={18} color="#1E6B4E" />
                      Waste Collection Analytics
                    </h3>
                    <p>
                      {analyticsData.current_month?.label} &bull; Collected Waste by Category
                    </p>
                  </div>
                  <span className="analytics-chart-badge">
                    Total: {analyticsData.waste_collection?.total_kg || 0} kg
                  </span>
                </div>

                <div className="analytics-chart-body">
                  {!hasCurrentWasteData ? (
                    <div className="analytics-empty-chart">
                      <BarChart3 size={28} opacity={0.4} />
                      <div>No waste collection data recorded for {analyticsData.current_month?.label}.</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={wasteCollectionData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
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
                        <Bar dataKey="Collected Waste (kg)" fill="#1E6B4E" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* CHART 2: PREVIOUS MONTH VS CURRENT MONTH COMPARISON */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <div>
                    <h3>
                      <TrendingUp size={18} color="#1E6B4E" />
                      Previous Month vs Current Month
                    </h3>
                    <p>
                      {analyticsData.previous_month?.label} vs {analyticsData.current_month?.label}
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
                      <div>No collection comparison data available between these months.</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
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
                          formatter={(value) => [`${value} kg`]}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: "10px",
                            border: "1px solid #DCEEE3",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                        <Bar dataKey={analyticsData.previous_month?.label || "Previous Month"} fill="#94A3B8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={analyticsData.current_month?.label || "Current Month"} fill="#1E6B4E" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* CHART 3: RECYCLED WASTE ANALYTICS (CURRENT MONTH) */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <div>
                    <h3>
                      <Recycle size={18} color="#059669" />
                      Recycled Waste
                    </h3>
                    <p>
                      {analyticsData.current_month?.label} &bull; Processed Tonnage by Category
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
                      <div>No recycled material completed for {analyticsData.current_month?.label}.</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={recycledData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
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
                        <Bar dataKey="Recycled (kg)" fill="#059669" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* CHART 4: COMPLETED TASKS VS PENDING TASKS (CURRENT MONTH) */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <div>
                    <h3>
                      <CheckCircle2 size={18} color="#1E6B4E" />
                      Collection Task Status
                    </h3>
                    <p>
                      {analyticsData.current_month?.label} &bull; Field Pickup Operations
                    </p>
                  </div>
                  <span className="analytics-chart-badge">
                    Total Tasks: {totalCurrentTasks}
                  </span>
                </div>

                <div className="analytics-chart-body">
                  {totalCurrentTasks === 0 ? (
                    <div className="analytics-empty-chart">
                      <CheckCircle2 size={28} opacity={0.4} />
                      <div>No collection task records for {analyticsData.current_month?.label}.</div>
                    </div>
                  ) : (
                    <div className="analytics-donut-container">
                      <ResponsiveContainer width={180} height={220}>
                        <PieChart>
                          <Pie
                            data={taskPieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                          >
                            {taskPieData.map((entry) => (
                              <Cell key={`cell-${entry.name}`} fill={PIE_COLORS[entry.name]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name) => [`${value} tasks`, name]}
                            contentStyle={{
                              backgroundColor: "#FFFFFF",
                              borderRadius: "10px",
                              border: "1px solid #DCEEE3",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="analytics-donut-stats">
                        <div className="analytics-donut-stat-item">
                          <div className="analytics-donut-dot" style={{ background: PIE_COLORS.Completed }} />
                          <div>
                            <div className="analytics-donut-stat-label">Completed Tasks</div>
                            <div className="analytics-donut-stat-val" style={{ color: PIE_COLORS.Completed }}>
                              {analyticsData.task_status?.completed || 0}
                            </div>
                          </div>
                        </div>

                        <div className="analytics-donut-stat-item">
                          <div className="analytics-donut-dot" style={{ background: PIE_COLORS.Pending }} />
                          <div>
                            <div className="analytics-donut-stat-label">Pending Tasks</div>
                            <div className="analytics-donut-stat-val" style={{ color: PIE_COLORS.Pending }}>
                              {analyticsData.task_status?.pending || 0}
                            </div>
                          </div>
                        </div>

                        <div style={{ paddingTop: 6, borderTop: "1px solid var(--pulse-border)", fontSize: "12px", color: "var(--pulse-muted)" }}>
                          Completion: <strong>{totalCurrentTasks > 0 ? (((analyticsData.task_status?.completed || 0) / totalCurrentTasks) * 100).toFixed(0) : 0}%</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 10-13: MONTHLY REPORTS SECTION */}
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

              {(!analyticsData.monthly_reports || analyticsData.monthly_reports.length === 0) ? (
                <div className="analytics-empty-chart" style={{ height: "140px" }}>
                  <FileText size={24} opacity={0.4} />
                  <div>No historical monthly reports available yet.</div>
                </div>
              ) : (
                <div className="analytics-reports-table-container">
                  <table className="analytics-reports-table">
                    <thead>
                      <tr>
                        <th>Report Month</th>
                        <th>Total Waste Collected</th>
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
                          <td>{Number(m.total_waste_collected_kg || 0).toFixed(2)} kg</td>
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

      {/* MONTHLY REPORT MODAL (VIEW & PRINT/DOWNLOAD PDF) */}
      {selectedReport && (
        <AdminMonthlyReportModal
          report={selectedReport}
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
