import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Calendar, RefreshCw } from "lucide-react";
import { TaskTable, PickupRouteModal } from "./StaffTaskpage";
import { sortTableData, getNextSortDirection } from "../utils/tableSort";

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

export default function StaffScheduledPickupTasks() {
  const { date } = useParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState({ key: null, dir: null });
  const [activeRoutePickup, setActiveRoutePickup] = useState(null);

  // Format date for display (e.g. 2026-10-10 -> 10/10/2026)
  const formattedDate = useMemo(() => {
    if (!date) return "";
    const parts = String(date).split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return date;
  }, [date]);

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

      // Format and filter:
      // 1. Only active tasks (status !== 'COMPLETED')
      // 2. Only tasks where scheduled_pickup_date === date
      const filtered = data
        .filter((item) => {
          const status = String(item.status || "").toUpperCase();
          if (status === "COMPLETED") return false;
          const sDate = item.scheduled_pickup_date ? String(item.scheduled_pickup_date).slice(0, 10) : null;
          return sDate === date;
        })
        .map((item) => ({
          id: item.request_id || item.id,
          pickup: item.pickup_location || item.location_name || "N/A",
          location_name: item.location_name || item.pickup_location || "N/A",
          latitude: item.latitude,
          longitude: item.longitude,
          ward: item.ward || (item.ward_id ? `Ward ${item.ward_id}` : "N/A"),
          wasteType: item.waste_type || "Waste",
          status: item.status || "ASSIGNED",
          date: item.date || "",
          scheduledPickupDate: item.scheduled_pickup_date || null,
          userName: item.user_name || "",
          phone: item.phone || "",
        }));

      setTasks(filtered);
    } catch (err) {
      console.error("Failed to load scheduled tasks:", err);
      if (err.response?.status === 401) {
        setError("Please login to view your assigned tasks.");
      } else if (err.response?.status === 403) {
        setError("Access restricted to staff members only.");
      } else {
        setError("Failed to load assigned tasks. Please check backend server.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [date]);

  const handleSort = (key) => {
    setSort((prev) => ({
      key,
      dir: getNextSortDirection(prev.key, key, prev.dir),
    }));
  };

  const sortedTasks = useMemo(() => {
    return sortTableData(tasks, sort.key, sort.dir);
  }, [tasks, sort]);

  const handleStatusClick = (task) => {
    navigate(`/taskupdate/${task.id}`);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5faf0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "28px 32px",
      }}
    >
      {/* Top Bar / Navigation */}
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => navigate("/stafftask")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "#1e6b4e",
            fontWeight: 600,
            fontSize: 13.5,
            cursor: "pointer",
            padding: 0,
            marginBottom: 14,
          }}
        >
          <ArrowLeft size={16} /> Back to My Assigned Tasks
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#4c7a2e", textTransform: "uppercase", marginBottom: 4 }}>
              Scheduled Pickup Tasks
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1f2e22", display: "flex", alignItems: "center", gap: 10 }}>
              <Calendar size={22} color="#1e6b4e" />
              <span>{formattedDate || date}</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#2f4a1c",
                  background: "#e5f3db",
                  padding: "3px 10px",
                  borderRadius: 12,
                }}
              >
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
              </span>
            </h1>
          </div>

          <button
            type="button"
            onClick={fetchMyTasks}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#ffffff",
              border: "1px solid #cfe7bb",
              color: "#2f4a1c",
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Reused Task Table */}
      <TaskTable
        tasks={sortedTasks}
        loading={loading}
        error={error}
        onStatusClick={handleStatusClick}
        onOpenRoute={(task) => setActiveRoutePickup(task)}
        sortKey={sort.key}
        sortDir={sort.dir}
        onSort={handleSort}
      />

      {/* Reused Pickup Route Modal */}
      {activeRoutePickup && (
        <PickupRouteModal
          task={activeRoutePickup}
          onClose={() => setActiveRoutePickup(null)}
        />
      )}
    </div>
  );
}
