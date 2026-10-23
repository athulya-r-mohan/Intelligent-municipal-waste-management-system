import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Bell,
  LogOut,
  ArrowLeft,
  CalendarDays,
  Activity,
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Download,
  Eye,
  Layers,
  RotateCcw,
  UserCircle2,
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
import StaffMonthlyReportModal from "../components/StaffMonthlyReportModal";
import { performLogout, getUserName } from "../utils/auth";
import { BASE_URL as API_BASE_URL } from "../api/api";


const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/staff" },
  { key: "myTasks", label: "My Tasks", icon: ClipboardList, path: "/stafftask" },
  { key: "profile", label: "My Profile", icon: UserCircle2, path: "/profile" },
  { key: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
  { key: "analytics", label: "Analytics", icon: BarChart3, path: "/staff/analytics" },
];


export default function StaffAnalytics() {
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

      const response = await axios.get(`${API_BASE_URL}/api/waste/staff/analytics/`, {
        headers,
      });

      if (response.data && response.data.success) {
        setAnalyticsData(response.data);
      } else {
        setError(response.data?.error || "Failed to load staff analytics data.");
      }
    } catch (err) {
      console.error("Error fetching staff analytics:", err);
      setError("Unable to load staff analytics data. Please try again.");
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
        `${API_BASE_URL}/api/waste/staff/analytics/?year=${item.year}&month=${item.month}`,
        { headers }
      );

      if (response.data && response.data.success && response.data.report) {
        setSelectedReport(response.data.report);
      } else {
        alert("Failed to load staff report for the selected month.");
      }
    } catch (err) {
      console.error("Error fetching staff month report:", err);
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

  // Prepare Task Analytics Chart Data (Completed, Pending, Rescheduled)
  const taskAnalyticsData = useMemo(() => {
    if (!analyticsData?.task_analytics) return [];
    return [
      {
        status: "Completed",
        "Task Count": Number(analyticsData.task_analytics.completed || 0),
        fill: "#1E6B4E",
      },
      {
        status: "Pending",
        "Task Count": Number(analyticsData.task_analytics.pending || 0),
        fill: "#D97706",
      },
      {
        status: "Rescheduled",
        "Task Count": Number(analyticsData.task_analytics.rescheduled || 0),
        fill: "#0284C7",
      },
    ];
  }, [analyticsData]);

  const hasTaskData = useMemo(() => {
    return taskAnalyticsData.some((t) => t["Task Count"] > 0);
  }, [taskAnalyticsData]);

  // Prepare Previous Month vs Current Month Comparison Data
  const taskComparisonData = useMemo(() => {
    if (!analyticsData?.task_comparison) return [];
    const prevLabel = analyticsData?.previous_month?.label || "Previous Month";
    const currLabel = analyticsData?.current_month?.label || "Current Month";

    return analyticsData.task_comparison.map((item) => ({
      status: item.status,
      [prevLabel]: Number(item.prev_month || 0),
      [currLabel]: Number(item.curr_month || 0),
    }));
  }, [analyticsData]);

  const hasComparisonData = useMemo(() => {
    if (!analyticsData?.task_comparison) return false;
    return analyticsData.task_comparison.some(
      (c) => Number(c.prev_month || 0) > 0 || Number(c.curr_month || 0) > 0
    );
  }, [analyticsData]);

  const totalCurrentTasks =
    Number(analyticsData?.task_analytics?.completed || 0) +
    Number(analyticsData?.task_analytics?.pending || 0) +
    Number(analyticsData?.task_analytics?.rescheduled || 0);

  const staffDisplayName = analyticsData?.staff_name || getUserName() || "Staff Member";

  return (
    <div className="admin-root">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <button className="admin-logo" onClick={() => navigate("/staff")}>
          <span className="admin-logo-mark">
            <Activity size={18} strokeWidth={2.5} />
          </span>
          <span className="admin-logo-text">
            Eco<span className="admin-logo-accent">Pulse</span>
          </span>
        </button>

        <div className="admin-sidebar-role">Staff</div>

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
          <button className="admin-back-btn" onClick={() => navigate("/staff")}>
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
        <h1 className="admin-page-heading">Staff Analytics</h1>
        <p className="admin-page-sub">
          Real-time overview of your assigned field collection tasks and municipal activity &bull; {staffDisplayName}
        </p>

        {/* LOADING STATE */}
        {loading && (
          <div className="analytics-loading-box">
            <RefreshCw size={32} className="spinning" color="#1E6B4E" />
            <div style={{ color: "#6C8479", fontWeight: 500 }}>Loading staff analytics data...</div>
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
                    Completed: <strong>{analyticsData.task_analytics?.completed || 0} tasks</strong> &bull; Collected: <strong>{analyticsData.waste_collection?.total_kg || 0} kg</strong>
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
              {/* CHART 1: STAFF TASK ANALYTICS GRAPH */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <div>
                    <h3>
                      <BarChart3 size={18} color="#1E6B4E" />
                      Staff Task Analytics
                    </h3>
                    <p>
                      {analyticsData.current_month?.label} &bull; My Assigned Field Operations
                    </p>
                  </div>
                  <span className="analytics-chart-badge">
                    Total: {totalCurrentTasks} tasks
                  </span>
                </div>

                <div className="analytics-chart-body">
                  {!hasTaskData ? (
                    <div className="analytics-empty-chart">
                      <BarChart3 size={28} opacity={0.4} />
                      <div>No task data recorded for {analyticsData.current_month?.label}.</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={taskAnalyticsData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="status"
                          tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }}
                        />
                        <YAxis tick={{ fill: "#64748B", fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          formatter={(value, name) => [`${value} tasks`, "Task Count"]}
                          contentStyle={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: "10px",
                            border: "1px solid #DCEEE3",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          }}
                        />
                        <Bar
                          dataKey="Task Count"
                          radius={[6, 6, 0, 0]}
                          barSize={50}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* CHART 2: STAFF PREVIOUS VS CURRENT MONTH GRAPH */}
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
                      <div>No task comparison data available between these months.</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={taskComparisonData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="status"
                          tick={{ fill: "#64748B", fontSize: 12, fontWeight: 500 }}
                        />
                        <YAxis tick={{ fill: "#64748B", fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          formatter={(value) => [`${value} tasks`]}
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
                  <div>No historical monthly reports available yet for your profile.</div>
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

      {/* STAFF MONTHLY REPORT MODAL (VIEW & PRINT/DOWNLOAD PDF) */}
      {selectedReport && (
        <StaffMonthlyReportModal
          report={selectedReport}
          staffName={staffDisplayName}
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
