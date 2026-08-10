import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Recycle,
  Truck,
} from "lucide-react";
 
// ---------------------------------------------------------------------------
// Mock task data — replace with real data from your backend
// ---------------------------------------------------------------------------
const TASKS = [
  {
    id: 1,
    ward: 14,
    pickup: "Municipal (H) Palappara",
    wasteType: "E-Waste",
  },
  {
    id: 2,
    ward: 9,
    pickup: "Municipal (H) Erattupetta North",
    wasteType: "Plastic Waste",
  },
  {
    id: 3,
    ward: 21,
    pickup: "Municipal (H) Kanjirappally Rd",
    wasteType: "Organic Waste",
  },
];
 
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
// `onStatusClick` is called with the task when the Status pill is clicked.
// Wire this up to your own navigation (React Router's `navigate(...)`,
// Next.js `router.push(...)`, or window.location) to go to your status page.
function TaskTable({ tasks, onStatusClick }) {
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
          {tasks.map((t, idx) => (
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
                  Status
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
  // Replace this with your real navigation, e.g.:
  //   const navigate = useNavigate(); // react-router
  //   const handleStatusClick = (task) => navigate(`/status/${task.id}`);
  // or:
  //   const handleStatusClick = (task) => router.push(`/status/${task.id}`); // next.js
  const handleStatusClick = (task) => {
   navigate(`/taskupdate/${task.id}`);
    // TODO: hook this up to your status page route
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
 
      <TaskTable tasks={TASKS} onStatusClick={handleStatusClick} />
    </div>
  );
}
 