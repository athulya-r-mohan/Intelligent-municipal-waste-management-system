import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Calendar,
  RefreshCw,
  Navigation,
  Play,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { TaskTable, PickupRouteModal } from "./StaffTaskpage";
import { sortTableData, getNextSortDirection } from "../utils/tableSort";
import StaffOptimizedRouteModal from "../components/StaffOptimizedRouteModal";

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
  const [staffWard, setStaffWard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState({ key: null, dir: null });
  const [activeRoutePickup, setActiveRoutePickup] = useState(null);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Start Collection States
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [startingCollection, setStartingCollection] = useState(false);
  const [startSuccessMessage, setStartSuccessMessage] = useState("");

  // Format date for display (e.g. 2026-10-10 -> 10/10/2026)
  const formattedDate = useMemo(() => {
    if (!date) return "";
    const parts = String(date).split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return date;
  }, [date]);

  // Check if current scheduled date is today (local or UTC)
  const isDateToday = useMemo(() => {
    if (!date) return false;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const localToday = `${year}-${month}-${day}`;
    const utcToday = now.toISOString().slice(0, 10);
    const target = String(date).slice(0, 10);
    return target === localToday || target === utcToday;
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
      if (raw?.staff_ward) {
        setStaffWard(raw.staff_ward);
      }
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
      // Active scheduled tasks where scheduled_pickup_date === date (strictly excludes completed and cancelled)
      const filtered = data
        .filter((item) => {
          const sDate = item.scheduled_pickup_date
            ? String(item.scheduled_pickup_date).slice(0, 10)
            : null;
          const statusUpper = String(item.status || "").trim().toUpperCase();
          return (
            sDate === date &&
            statusUpper !== "COMPLETED" &&
            statusUpper !== "CANCELLED"
          );
        })
        .map((item) => ({
          id: item.request_id || item.id,
          pickup: item.pickup_location || item.location_name || "N/A",
          location_name: item.location_name || item.pickup_location || "N/A",
          latitude: item.latitude,
          longitude: item.longitude,
          ward: item.ward || (item.ward_id ? `Ward ${item.ward_id}` : "N/A"),
          ward_id: item.ward_id ?? null,
          wasteType: item.waste_type || "Waste",
          status: item.status ? String(item.status).trim() : "PENDING",
          date: item.date || "",
          scheduledPickupDate: item.scheduled_pickup_date || null,
          userName: item.user_name || "",
          user_name: item.user_name || "",
          phone: item.phone || "",
          address: item.address || "",
        }));

      setTasks(filtered);
      return filtered;
    } catch (err) {
      console.error("Failed to load scheduled tasks:", err);
      if (err.response?.status === 401) {
        setError("Please login to view your assigned tasks.");
      } else if (err.response?.status === 403) {
        setError("Access restricted to staff members only.");
      } else {
        setError("Failed to load assigned tasks. Please check backend server.");
      }
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, [date]);

  // Derived task collections
  const eligibleUnstartedTasks = useMemo(() => {
    return tasks.filter(
      (t) => String(t.status || "").trim().toUpperCase() === "ASSIGNED"
    );
  }, [tasks]);

  const hasUnstartedTasks = eligibleUnstartedTasks.length > 0;

  const hasInProgressTasks = useMemo(() => {
    return tasks.some(
      (t) => String(t.status || "").trim().toUpperCase() === "IN_PROGRESS"
    );
  }, [tasks]);

  // Collection is considered started when no ASSIGNED tasks remain and at least one task is IN_PROGRESS
  const isCollectionStarted = !hasUnstartedTasks && hasInProgressTasks;

  // Handler for Start Today's Collection confirmation
  const handleConfirmStartCollection = async () => {
    try {
      setStartingCollection(true);
      const token = getAccessToken();
      const config = token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : {};

      const response = await axios.post(
        `${API_BASE_URL}/api/waste/staff/start-today-collection/`,
        { scheduled_pickup_date: date },
        config
      );

      setConfirmModalOpen(false);
      setStartSuccessMessage(
        response.data?.message ||
          "Today's collection started successfully! Citizens can no longer cancel these pickups."
      );
      setTimeout(() => {
        setStartSuccessMessage("");
      }, 5000);

      await fetchMyTasks();
    } catch (err) {
      console.error("Failed to start today's collection:", err);
      alert(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to start today's collection."
      );
    } finally {
      setStartingCollection(false);
    }
  };

  // Handler for "Optimize Today's Route"
  const handleOptimizeRoute = async () => {
    if (optimizing) return;
    try {
      setOptimizing(true);
      // Re-fetch live tasks fresh from the API to include any same-day newly assigned tasks
      const freshTasks = await fetchMyTasks();
      if (!freshTasks || freshTasks.length === 0) {
        alert("No pickup tasks scheduled for this date.");
        return;
      }
      setRouteModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch fresh tasks for route optimization:", err);
      alert("Failed to load tasks for route optimization. Please try again.");
    } finally {
      setOptimizing(false);
    }
  };

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

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#4c7a2e",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Pickup Schedule
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                color: "#1f2e22",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
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
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5f8a45" }}>
              Tasks for {formattedDate || date}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {/* Start Today's Collection Button */}
            {isCollectionStarted ? (
              <button
                type="button"
                disabled
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background: "#e5f3db",
                  border: "1px solid #bbf7d0",
                  color: "#1e6b4e",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "not-allowed",
                  boxShadow: "none",
                  opacity: 0.95,
                }}
                title="Today's collection has already started for all scheduled pickups"
              >
                <CheckCircle2 size={15} color="#15803d" />
                Collection Started
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmModalOpen(true)}
                disabled={
                  startingCollection || tasks.length === 0 || !isDateToday
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  background:
                    tasks.length === 0 || !isDateToday
                      ? "#e2e8f0"
                      : "#15803d",
                  border: "none",
                  color:
                    tasks.length === 0 || !isDateToday
                      ? "#94a3b8"
                      : "#ffffff",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    tasks.length === 0 || !isDateToday
                      ? "not-allowed"
                      : startingCollection
                      ? "wait"
                      : "pointer",
                  boxShadow:
                    tasks.length === 0 || !isDateToday
                      ? "none"
                      : "0 2px 5px rgba(21, 128, 61, 0.25)",
                  transition: "all 0.15s ease",
                  opacity: startingCollection ? 0.75 : 1,
                }}
                title={
                  !isDateToday
                    ? "Collection can only be started for today's scheduled date"
                    : tasks.length === 0
                    ? "No pickup tasks scheduled for this date"
                    : hasInProgressTasks && hasUnstartedTasks
                    ? "Start collection for remaining / newly assigned pickups"
                    : "Start today's collection for all assigned pickups"
                }
              >
                <Play size={13} fill="currentColor" />
                {startingCollection
                  ? "Starting Collection..."
                  : "Start Today's Collection"}
              </button>
            )}

            {/* Optimize Today's Route Button */}
            <button
              type="button"
              onClick={handleOptimizeRoute}
              disabled={optimizing}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "#1e6b4e",
                border: "none",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: optimizing ? "wait" : "pointer",
                boxShadow: "0 2px 5px rgba(30, 107, 78, 0.2)",
                transition: "all 0.15s ease",
                opacity: optimizing ? 0.75 : 1,
              }}
              title="Calculate and display an optimized pickup route for this date"
            >
              <Navigation size={14} />
              {optimizing ? "Optimizing Route..." : "Optimize Today's Route"}
            </button>

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
      </div>

      {/* Success Notification Banner */}
      {startSuccessMessage && (
        <div
          style={{
            marginBottom: 18,
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 10,
            padding: "10px 16px",
            color: "#065f46",
            fontSize: 13.5,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(16, 185, 129, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{startSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setStartSuccessMessage("")}
            style={{
              background: "none",
              border: "none",
              color: "#059669",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Reused Task Table — row-level Start Pickup buttons removed, Citizen Address enabled */}
      <TaskTable
        tasks={sortedTasks}
        loading={loading}
        error={error}
        onStatusClick={handleStatusClick}
        showStartPickup={false}
        showCitizenAddress={true}
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

      {/* Optimized Route Modal */}
      {routeModalOpen && (
        <StaffOptimizedRouteModal
          tasks={tasks}
          staffWard={staffWard}
          date={date}
          formattedDate={formattedDate}
          onClose={() => setRouteModalOpen(false)}
          onRefresh={fetchMyTasks}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !startingCollection && setConfirmModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 14,
              border: "1px solid #cfe7bb",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.18)",
              padding: "24px 28px",
              maxWidth: 480,
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  backgroundColor: "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} color="#d97706" />
              </div>
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#1f2e22",
                  }}
                >
                  Start Today's Collection
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13.5,
                    color: "#4b5563",
                    lineHeight: 1.5,
                  }}
                >
                  Are you sure you want to start today's collection? Once
                  started, citizens will no longer be able to cancel these
                  pickup requests.
                </p>
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 12px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 8,
                    fontSize: 12.5,
                    color: "#166534",
                    fontWeight: 600,
                  }}
                >
                  🚀 {eligibleUnstartedTasks.length} eligible pickup request
                  {eligibleUnstartedTasks.length !== 1 ? "s" : ""} will
                  transition to In Progress.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={startingCollection}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cfe7bb",
                  color: "#2f4a1c",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: startingCollection ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStartCollection}
                disabled={startingCollection}
                style={{
                  background: "#1e6b4e",
                  border: "none",
                  color: "#ffffff",
                  padding: "8px 18px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: startingCollection ? "wait" : "pointer",
                  boxShadow: "0 2px 5px rgba(30, 107, 78, 0.2)",
                  opacity: startingCollection ? 0.75 : 1,
                }}
              >
                {startingCollection
                  ? "Starting Collection..."
                  : "Confirm & Start Collection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
