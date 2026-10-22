import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  History,
  X,
  ClipboardList,
  AlertTriangle,
  Truck,
} from "lucide-react";
import "../components/Residentdirectory.css";
import SortableTh from "../components/SortableTh";
import { sortTableData, getNextSortDirection } from "../utils/tableSort";

const WARDS = [
  "All Wards",
  "Ward 1",
  "Ward 2",
  "Ward 3",
  "Ward 4",
  "Ward 5",
];

// Temporary history data.
// We will connect this to the database separately.
const HISTORY = {
  1: {
    requests: [
      {
        title: "Bulk waste pickup",
        date: "Aug 6, 2026",
        status: "completed",
        desc: "Old furniture and cartons collected on schedule.",
      },
      {
        title: "Organic waste pickup",
        date: "Jul 29, 2026",
        status: "completed",
        desc: "Regular weekly pickup collected on time.",
      },
    ],
    complaints: [
      {
        title: "Missed pickup — Ward 1",
        date: "Jul 15, 2026",
        status: "pending",
        desc: "Truck did not arrive on the scheduled morning slot.",
      },
    ],
  },

  2: {
    requests: [
      {
        title: "E-waste pickup",
        date: "Aug 2, 2026",
        status: "pending",
        desc: "Request submitted for two old appliances.",
      },
    ],
    complaints: [],
  },

  3: {
    requests: [
      {
        title: "Garden waste pickup",
        date: "Jul 30, 2026",
        status: "completed",
        desc: "Collected same day as requested.",
      },
    ],
    complaints: [
      {
        title: "Overflowing bin",
        date: "Jul 20, 2026",
        status: "completed",
        desc: "Extra bin issued after inspection.",
      },
      {
        title: "Late collection",
        date: "Jun 30, 2026",
        status: "missed",
        desc: "Collection delayed beyond the notified window.",
      },
    ],
  },

  4: {
    requests: [],
    complaints: [],
  },

  5: {
    requests: [
      {
        title: "Plastic waste pickup",
        date: "Aug 9, 2026",
        status: "pending",
        desc: "Awaiting confirmation from ward coordinator.",
      },
    ],
    complaints: [],
  },

  6: {
    requests: [
      {
        title: "Organic waste pickup",
        date: "Aug 1, 2026",
        status: "completed",
        desc: "Collected as per weekly schedule.",
      },
    ],
    complaints: [
      {
        title: "Truck noise complaint",
        date: "Jul 18, 2026",
        status: "completed",
        desc: "Route timing adjusted after review.",
      },
    ],
  },

  7: {
    requests: [],
    complaints: [
      {
        title: "Missed pickup — Ward 2",
        date: "Aug 4, 2026",
        status: "pending",
        desc: "Reported no collection for two consecutive days.",
      },
    ],
  },

  8: {
    requests: [
      {
        title: "Bulk waste pickup",
        date: "Jul 25, 2026",
        status: "missed",
        desc: "Truck skipped the street; rescheduled next day.",
      },
    ],
    complaints: [],
  },
};

function statusMeta(status) {
  if (status === "completed") {
    return {
      label: "Completed",
      cls: "rd-status-completed",
    };
  }

  if (status === "missed") {
    return {
      label: "Missed",
      cls: "rd-status-missed",
    };
  }

  return {
    label: "Pending",
    cls: "rd-status-pending",
  };
}

function EcoPulseLogo() {
  return (
    <div className="rd-logo">
      <div className="rd-logo-mark">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            className="rd-pulse-line"
            d="M2 12h4l2.4-6 3.2 12L14.5 9l1.8 3H22"
          />
        </svg>
      </div>

      <div className="rd-logo-text">
        <span className="rd-eco">Eco</span>
        <span className="rd-pulse">Pulse</span>
      </div>
    </div>
  );
}

export default function ResidentDirectory({ onBack }) {
  const [ward, setWard] = useState("All Wards");
  const [wardOptions, setWardOptions] = useState(WARDS);
  const [nameQuery, setNameQuery] = useState("");
  const [appliedWard, setAppliedWard] = useState("All Wards");
  const [appliedQuery, setAppliedQuery] = useState("");

  const [loading, setLoading] = useState(false);

  const [activeResident, setActiveResident] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: null, dir: null });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: getNextSortDirection(prev.key, key, prev.dir),
    }));
  };

  // Residents fetched from Django UserProfile
  const [residents, setResidents] = useState([]);

  // ---------------------------------------------------------
  // Fetch residents from Django backend
  // ---------------------------------------------------------

  useEffect(() => {
    fetchResidents();
    fetchWards();
  }, []);

  const fetchWards = async () => {
    try {
      const response = await axios.get("https://intelligent-municipal-waste-management.onrender.com/api/wards/");
      if (Array.isArray(response.data) && response.data.length > 0) {
        const numbers = response.data.map((w) => `Ward ${w.ward_number}`);
        const set = new Set(["All Wards", ...numbers]);
        setWardOptions(Array.from(set));
      }
    } catch {
      // Fallback to default WARDS list
    }
  };

  const fetchResidents = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        "https://intelligent-municipal-waste-management.onrender.com/api/resident-directory/"
      );

      setResidents(response.data);
    } catch (error) {
      console.error("Error fetching residents:", error);

      if (error.response) {
        console.error("Backend response:", error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Filter residents
  // ---------------------------------------------------------

  const filtered = useMemo(() => {
    return residents.filter((r) => {
      const wardOk =
        appliedWard === "All Wards" ||
        r.ward === appliedWard ||
        (r.ward && r.ward.startsWith(appliedWard)) ||
        (r.ward_number && appliedWard === `Ward ${r.ward_number}`);

      const qOk =
        appliedQuery.trim() === "" ||
        r.name
          .toLowerCase()
          .includes(appliedQuery.trim().toLowerCase());

      return wardOk && qOk;
    });
  }, [residents, appliedWard, appliedQuery]);

  const sortedResidents = useMemo(() => {
    return sortTableData(filtered, sortConfig.key, sortConfig.dir);
  }, [filtered, sortConfig]);

  // ---------------------------------------------------------
  // Search
  // ---------------------------------------------------------

  const runSearch = () => {
    setLoading(true);

    window.setTimeout(() => {
      setAppliedWard(ward);
      setAppliedQuery(nameQuery);
      setLoading(false);
    }, 600);
  };

  // ---------------------------------------------------------
  // Reset search
  // ---------------------------------------------------------

  const resetSearch = () => {
    setWard("All Wards");
    setNameQuery("");
    setAppliedWard("All Wards");
    setAppliedQuery("");
  };

  // ---------------------------------------------------------
  // Go back
  // ---------------------------------------------------------

  const goBack = () => {
    if (onBack) {
      onBack();
    } else if (
      typeof window !== "undefined" &&
      window.history.length > 1
    ) {
      window.history.back();
    }
  };

  // ---------------------------------------------------------
  // Temporary history
  // ---------------------------------------------------------

  const history = activeResident
    ? HISTORY[activeResident.id] || {
        requests: [],
        complaints: [],
      }
    : null;

  return (
    <div className="resident-directory">

      {/* =====================================================
          TOP BAR
      ====================================================== */}

      <div className="rd-topbar">

        <button
          className="rd-back-btn"
          onClick={goBack}
          aria-label="Go back"
        >
          <ArrowLeft />
        </button>

        <EcoPulseLogo />

        <span className="rd-page-heading">
          Resident Directory
        </span>

      </div>

      <div className="rd-wrap">

        {/* ===================================================
            SEARCH TOOLBAR
        ==================================================== */}

        <div className="rd-toolbar">

          <div className="rd-ward-select-wrap">

            <label className="rd-field-label">
              Ward
            </label>

            <select
              className="rd-ward-select"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
            >
              {wardOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>

          </div>

          <div className="rd-search-input-wrap">

            <label className="rd-field-label">
              Resident name
            </label>

            <input
              className="rd-name-search"
              type="text"
              placeholder="Search by name..."
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  runSearch();
                }
              }}
            />

          </div>

          <button
            className="rd-search-btn"
            onClick={runSearch}
          >
            <Search />
            Search
          </button>

          <button
            className="rd-reset-link"
            onClick={resetSearch}
          >
            Reset
          </button>

        </div>

        {/* ===================================================
            ANIMATED ROAD STRIP
        ==================================================== */}

        <div
          className={`rd-road-strip${
            loading ? " rd-running" : ""
          }`}
        >
          <Truck className="rd-truck-dot" />
        </div>

        {/* ===================================================
            RESULT COUNT
        ==================================================== */}

        <p className="rd-result-meta">

          Showing{" "}
          <b>{filtered.length}</b>{" "}
          of{" "}
          <b>{residents.length}</b>{" "}
          residents

          {appliedWard !== "All Wards" && (
            <>
              {" "}
              in <b>{appliedWard}</b>
            </>
          )}

          {appliedQuery && (
            <>
              {" "}
              matching "<b>{appliedQuery}</b>"
            </>
          )}

        </p>

        {/* ===================================================
            TABLE
        ==================================================== */}

        <div className="rd-table-card">

          <table className="rd-table">

            <thead>
              <tr>
                <SortableTh columnKey="id" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  No
                </SortableTh>
                <SortableTh columnKey="name" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Name
                </SortableTh>
                <SortableTh columnKey="email" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Email
                </SortableTh>
                <SortableTh columnKey="phone" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Phone
                </SortableTh>
                <SortableTh columnKey="address" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Address
                </SortableTh>
                <SortableTh columnKey="ward" currentSortKey={sortConfig.key} currentSortDir={sortConfig.dir} onSort={handleSort}>
                  Ward
                </SortableTh>
                <SortableTh disabled>
                  History
                </SortableTh>
              </tr>
            </thead>

            <tbody>

              {filtered.length === 0 ? (

                <tr className="rd-empty-row">

                  <td colSpan="7">

                    {loading
                      ? "Loading residents..."
                      : "No residents match this search."}

                  </td>

                </tr>

              ) : (

                sortedResidents.map((r, i) => (

                  <tr key={r.id}>

                    <td className="rd-no-cell">
                      {i + 1}
                    </td>

                    <td className="rd-name-cell">
                      {r.name}
                    </td>

                    <td className="rd-muted">
                      {r.email}
                    </td>

                    <td className="rd-muted">
                      {r.phone || "Not provided"}
                    </td>

                    <td className="rd-muted">
                      {r.address || "Not provided"}
                    </td>

                    <td>

                      <span className="rd-ward-chip">
                        {r.ward}
                      </span>

                    </td>

                    <td>

                      <button
                        className="rd-history-btn"
                        onClick={() =>
                          setActiveResident(r)
                        }
                      >
                        <History />
                        History
                      </button>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* =====================================================
          HISTORY SIDE PANEL
      ====================================================== */}

      {activeResident && (

        <div
          className="rd-overlay"
          onClick={() => setActiveResident(null)}
        >

          <div
            className="rd-panel"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Panel header */}

            <div className="rd-panel-head">

              <div>

                <h2>
                  {activeResident.name}
                </h2>

                <p>
                  {activeResident.ward} · Requests &amp;
                  complaints history
                </p>

              </div>

              <button
                className="rd-panel-close"
                onClick={() =>
                  setActiveResident(null)
                }
                aria-label="Close"
              >
                <X />
              </button>

            </div>

            {/* Panel body */}

            <div className="rd-panel-body">

              {/* ===============================
                  PICKUP REQUESTS
              ================================ */}

              <div className="rd-panel-section-title">
                Pickup Requests
              </div>

              {history.requests.length === 0 ? (

                <div className="rd-empty-panel">
                  No pickup requests yet.
                </div>

              ) : (

                history.requests.map((item, idx) => {

                  const s = statusMeta(item.status);

                  return (

                    <div
                      className="rd-timeline-item"
                      key={"req" + idx}
                    >

                      <div className="rd-ti-icon rd-ti-request">
                        <ClipboardList />
                      </div>

                      <div className="rd-ti-body">

                        <div className="rd-ti-top">

                          <span className="rd-ti-title">
                            {item.title}
                          </span>

                          <span className="rd-ti-date">
                            {item.date}
                          </span>

                        </div>

                        <div className="rd-ti-desc">
                          {item.desc}
                        </div>

                        <span
                          className={`rd-status-badge ${s.cls}`}
                        >
                          {s.label}
                        </span>

                      </div>

                    </div>

                  );
                })

              )}

              {/* ===============================
                  COMPLAINTS
              ================================ */}

              <div className="rd-panel-section-title">
                Complaints
              </div>

              {history.complaints.length === 0 ? (

                <div className="rd-empty-panel">
                  No complaints filed.
                </div>

              ) : (

                history.complaints.map((item, idx) => {

                  const s = statusMeta(item.status);

                  return (

                    <div
                      className="rd-timeline-item"
                      key={"comp" + idx}
                    >

                      <div className="rd-ti-icon rd-ti-complaint">
                        <AlertTriangle />
                      </div>

                      <div className="rd-ti-body">

                        <div className="rd-ti-top">

                          <span className="rd-ti-title">
                            {item.title}
                          </span>

                          <span className="rd-ti-date">
                            {item.date}
                          </span>

                        </div>

                        <div className="rd-ti-desc">
                          {item.desc}
                        </div>

                        <span
                          className={`rd-status-badge ${s.cls}`}
                        >
                          {s.label}
                        </span>

                      </div>

                    </div>

                  );
                })

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}