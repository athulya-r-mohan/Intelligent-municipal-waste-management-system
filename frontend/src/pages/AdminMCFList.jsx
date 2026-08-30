import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Calendar,
  Layers,
  Scale,
  Users,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  Recycle,
  CheckCircle2,
  AlertCircle,
  Factory,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import "../components/AdminMCFList.css";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function AdminMCFList() {
  const navigate = useNavigate();

  const [dailyTotals, setDailyTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDailyTotals = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE_URL}/api/waste/mcf/admin/daily-totals/`);
      if (res.data?.daily_totals) {
        setDailyTotals(res.data.daily_totals);
      } else {
        setDailyTotals([]);
      }
    } catch (err) {
      console.error("Failed to fetch MCF daily totals:", err);
      setError("Failed to load daily MCF records from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyTotals();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const totalTonnage = dailyTotals.reduce((sum, d) => sum + (parseFloat(d.grand_total) || 0), 0);
    const totalDates = dailyTotals.length;
    const todayStr = new Date().toISOString().split("T")[0];
    const todayRecord = dailyTotals.find((d) => d.date === todayStr);
    const todayTonnage = todayRecord ? parseFloat(todayRecord.grand_total) : 0;

    return {
      totalTonnage: totalTonnage.toFixed(2),
      totalDates,
      todayTonnage: todayTonnage.toFixed(2),
    };
  }, [dailyTotals]);

  // Filtered daily list
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return dailyTotals;
    const term = searchTerm.toLowerCase();
    return dailyTotals.filter(
      (d) =>
        d.date.toLowerCase().includes(term) ||
        (d.date_formatted && d.date_formatted.toLowerCase().includes(term))
    );
  }, [dailyTotals, searchTerm]);

  return (
    <div className="mcf-admin-page">
      {/* TOPBAR */}
      <header className="mcf-admin-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            type="button"
            className="mcf-back-btn"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div className="mcf-brand-logo">
            Eco <span>Pulse</span> · Admin MCF
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <NotificationBell />
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mcf-admin-container">
        {/* KPI STATS ROW */}
        <div className="mcf-stats-row">
          <div className="mcf-stat-card">
            <div className="mcf-stat-icon-wrap" style={{ background: "#e4f7ea", color: "#137a41" }}>
              <Scale size={24} />
            </div>
            <div>
              <div className="mcf-stat-title">All-Time MCF Waste</div>
              <div className="mcf-stat-number">{stats.totalTonnage} kg</div>
            </div>
          </div>

          <div className="mcf-stat-card">
            <div className="mcf-stat-icon-wrap" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <Calendar size={24} />
            </div>
            <div>
              <div className="mcf-stat-title">Collection Days Logged</div>
              <div className="mcf-stat-number">{stats.totalDates} Days</div>
            </div>
          </div>

          <div className="mcf-stat-card">
            <div className="mcf-stat-icon-wrap" style={{ background: "#fefce8", color: "#ca8a04" }}>
              <Factory size={24} />
            </div>
            <div>
              <div className="mcf-stat-title">Today's Total Collection</div>
              <div className="mcf-stat-number">{stats.todayTonnage} kg</div>
            </div>
          </div>
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="mcf-alert-banner mcf-alert-error" style={{ marginBottom: 20 }}>
            <AlertCircle size={18} />
            <div>{error}</div>
          </div>
        )}

        {/* TABLE CARD */}
        <div className="mcf-table-card">
          <div className="mcf-table-header">
            <div>
              <h2>Daily Aggregated Waste Collections</h2>
              <p>Combined MCF deposits collected across all field staff by date</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="mcf-date-search">
                <Search size={15} color="#5c7c6d" />
                <input
                  type="text"
                  placeholder="Filter by date or month..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="mcf-back-btn"
                onClick={fetchDailyTotals}
                title="Refresh data"
                style={{ padding: "7px 10px" }}
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "#5c7c6d" }}>
              <RefreshCw size={24} className="spin" style={{ margin: "0 auto 10px", display: "block" }} />
              Loading MCF daily records...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="mcf-empty-state">
              <div className="mcf-empty-icon">
                <Recycle size={32} />
              </div>
              <div className="mcf-empty-title">No MCF Collections Recorded</div>
              <div className="mcf-empty-text">
                When field staff members record daily MCF deposits from the Staff Console, their collections will be automatically combined and displayed here by date.
              </div>
            </div>
          ) : (
            <table className="mcf-data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Waste Collection</th>
                  <th>Staff Contributed</th>
                  <th>Recycler Assignment</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((row) => {
                  const assignCount = row.assignments_count || 0;
                  const isAllAssigned = assignCount >= 7;
                  const isPartial = assignCount > 0 && assignCount < 7;

                  return (
                    <tr key={row.date}>
                      <td>
                        <div className="mcf-date-cell">
                          <div className="mcf-date-icon">
                            <Calendar size={17} />
                          </div>
                          <div>
                            <div>{row.date_formatted || row.date}</div>
                            <span style={{ fontSize: 11.5, color: "#8fa79b" }}>{row.date}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="mcf-total-cell">{parseFloat(row.grand_total).toFixed(2)} kg</div>
                        <div style={{ fontSize: 11.5, color: "#8fa79b" }}>
                          Paper: {row.total_paper}kg · Plastic: {row.total_plastic}kg · Glass: {row.total_glass}kg
                        </div>
                      </td>

                      <td>
                        <div className="mcf-staff-pill">
                          <Users size={13} />
                          {row.staff_count} {row.staff_count === 1 ? "Staff Member" : "Staff Members"}
                        </div>
                      </td>

                      <td>
                        {isAllAssigned ? (
                          <div className="mcf-assignment-badge mcf-assign-complete">
                            <CheckCircle2 size={13} />
                            All 7 Categories Assigned
                          </div>
                        ) : isPartial ? (
                          <div className="mcf-assignment-badge mcf-assign-partial">
                            <Recycle size={13} />
                            {assignCount} / 7 Categories Assigned
                          </div>
                        ) : (
                          <div className="mcf-assignment-badge mcf-assign-none">
                            Unassigned
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="mcf-view-btn"
                          onClick={() => navigate(`/admin/mcf/details?date=${row.date}`)}
                        >
                          View Details
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
