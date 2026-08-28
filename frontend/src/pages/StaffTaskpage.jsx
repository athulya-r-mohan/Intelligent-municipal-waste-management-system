import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Recycle,
  Truck,
} from "lucide-react";

// ============================================================
// API BASE URL
// ============================================================
const API_BASE_URL = "http://127.0.0.1:8000";

const getAccessToken = () => {
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    ""
  );
};

// ---------------------------------------------------------------------------
// Calendar widget — compact, shows the real current month, today highlighted
// ---------------------------------------------------------------------------
function MiniCalendar() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
 
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
 
  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    return cells;
  }, [viewDate]);
 
  const isToday = (d) =>
    d === today.getDate() &&
    viewDate.getMonth() === today.getMonth() &&
    viewDate.getFullYear() === today.getFullYear();
 
  const changeMonth = (delta) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };
 
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #cfe7bb",
        borderRadius: 12,
        padding: "10px 12px",
        width: 200,
        boxShadow: "0 1px 3px rgba(76,122,46,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <CalendarIcon size={14} color="#4c7a2e" />
        <span style={{ fontWeight: 600, fontSize: 12.5, color: "#2f4a1c" }}>Calendar</span>
      </div>
 
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <button
          onClick={() => changeMonth(-1)}
          style={{
            border: "none",
            background: "#eef7e9",
            borderRadius: 6,
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Previous month"
        >
          <ChevronLeft size={12} color="#4c7a2e" />
        </button>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#2f4a1c" }}>{monthLabel}</span>
        <button
          onClick={() => changeMonth(1)}
          style={{
            border: "none",
            background: "#eef7e9",
            borderRadius: 6,
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          aria-label="Next month"
        >
          <ChevronRight size={12} color="#4c7a2e" />
        </button>
      </div>
 
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginBottom: 2,
        }}
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: 9,
              fontWeight: 600,
              color: "#7fa363",
              padding: "1px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>
 
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {days.map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              fontSize: 10.5,
              padding: "4px 0",
              borderRadius: 6,
              color: d ? (isToday(d) ? "#ffffff" : "#39511f") : "transparent",
              background: d && isToday(d) ? "#6faa3c" : "transparent",
              fontWeight: d && isToday(d) ? 700 : 400,
            }}
          >
            {d || ""}
          </div>
        ))}
      </div>
    </div>
  );
}
 
// ---------------------------------------------------------------------------
// Task table
// ---------------------------------------------------------------------------
function TaskTable({ tasks, loading, error, onStatusClick }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #cfe7bb",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(76,122,46,0.08)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: "#eaf5e0" }}>
            {["S.No", "Today's Pickup", "Ward", "Waste Type", "Task Status"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  color: "#2f4a1c",
                  fontWeight: 600,
                  borderBottom: "1px solid #cfe7bb",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td
                colSpan="5"
                style={{
                  textAlign: "center",
                  padding: "28px",
                  color: "#5f8a45",
                  fontWeight: 500,
                }}
              >
                Loading assigned tasks...
              </td>
            </tr>
          )}

          {!loading && error && (
            <tr>
              <td
                colSpan="5"
                style={{
                  textAlign: "center",
                  padding: "28px",
                  color: "#b64a4a",
                  fontWeight: 500,
                }}
              >
                {error}
              </td>
            </tr>
          )}

          {!loading && !error && tasks.length === 0 && (
            <tr>
              <td
                colSpan="5"
                style={{
                  textAlign: "center",
                  padding: "28px",
                  color: "#5f8a45",
                  fontWeight: 500,
                }}
              >
                No pickup tasks assigned to you yet.
              </td>
            </tr>
          )}

          {!loading && !error && tasks.map((t, idx) => (
            <tr
              key={t.id}
              style={{
                borderBottom: idx === tasks.length - 1 ? "none" : "1px solid #eef3e8",
              }}
            >
              <td style={{ padding: "14px 16px", color: "#39511f" }}>{idx + 1}</td>
              <td style={{ padding: "14px 16px", color: "#243515", fontWeight: 500 }}>
                {t.pickup}
              </td>
              <td style={{ padding: "14px 16px", color: "#39511f" }}>{t.ward}</td>
              <td style={{ padding: "14px 16px", color: "#39511f" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#f2f8ec",
                    color: "#4c7a2e",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 12.5,
                  }}
                >
                  <Recycle size={13} /> {t.wasteType}
                </span>
              </td>
              <td style={{ padding: "14px 16px" }}>
                <button
                  onClick={() => onStatusClick(t)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "#6faa3c",
                    color: "#ffffff",
                    border: "none",
                    padding: "7px 14px",
                    borderRadius: 20,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Truck size={13} />
                  {t.status || "Status"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
 
// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
export default function MyTaskDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchMyTasks = async () => {
      try {
        setLoading(true);
        setError("");

        const token = getAccessToken();

        const config = token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : {};

        const response = await axios.get(
          `${API_BASE_URL}/api/waste/staff/my-tasks/`,
          config
        );

        if (!mounted) return;

        const raw = response.data;
        const data = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.tasks)
          ? raw.tasks
          : Array.isArray(raw?.results)
          ? raw.results
          : Array.isArray(raw?.data)
          ? raw.data
          : [];

        const formatted = data.map((item) => ({
          id: item.request_id || item.id,
          pickup: item.pickup_location || item.location_name || "N/A",
          ward: item.ward || (item.ward_id ? `Ward ${item.ward_id}` : "N/A"),
          wasteType: item.waste_type || "Waste",
          status: item.status || "ASSIGNED",
          date: item.date || "",
          userName: item.user_name || "",
          phone: item.phone || "",
        }));

        setTasks(formatted);
      } catch (err) {
        console.error("Failed to load staff tasks:", err);

        if (!mounted) return;

        if (err.response?.status === 401) {
          setError("Please login to view your assigned tasks.");
        } else if (err.response?.status === 403) {
          setError("Access restricted to staff members only.");
        } else {
          setError("Failed to load assigned tasks. Please check backend server.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchMyTasks();

    return () => {
      mounted = false;
    };
  }, []);

  const handleStatusClick = (task) => {
    navigate(`/taskupdate/${task.id}`);
  };
 
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5faf0",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "28px 32px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 20,
          marginBottom: 26,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#ffffff",
              border: "1px solid #cfe7bb",
              borderRadius: 10,
              padding: "8px 16px",
            }}
          >
            <Trash2 size={16} color="#4c7a2e" />
            <span style={{ fontWeight: 700, fontSize: 15, color: "#2f4a1c" }}>My Tasks</span>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "#5f8a45" }}>
            Waste collection pickups assigned to you today
          </p>
        </div>
        <MiniCalendar />
      </div>
 
      <TaskTable
        tasks={tasks}
        loading={loading}
        error={error}
        onStatusClick={handleStatusClick}
      />
    </div>
  );
}
 