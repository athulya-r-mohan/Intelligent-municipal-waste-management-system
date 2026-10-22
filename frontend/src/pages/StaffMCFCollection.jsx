import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Scale,
  Info,
  Layers,
  Sparkles,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import "../components/StaffMCFCollection.css";

const API_BASE_URL = "https://intelligent-municipal-waste-management.onrender.com";

const CATEGORIES = [
  {
    key: "paper",
    label: "Paper",
    desc: "Cardboard, newspaper, office paper, magazines",
    icon: "📄",
    bgColor: "#eff6ff",
    textColor: "#2563eb",
  },
  {
    key: "plastic",
    label: "Plastic",
    desc: "PET bottles, containers, polythene, hard plastics",
    icon: "🧴",
    bgColor: "#fefce8",
    textColor: "#ca8a04",
  },
  {
    key: "glass",
    label: "Glass",
    desc: "Bottles, jars, glassware, broken containers",
    icon: "🍾",
    bgColor: "#f5f3ff",
    textColor: "#7c3aed",
  },
  {
    key: "metal",
    label: "Metal",
    desc: "Aluminum cans, tin containers, scrap metal",
    icon: "🥫",
    bgColor: "#f8fafc",
    textColor: "#475569",
  },
  {
    key: "organic",
    label: "Organic",
    desc: "Food waste, compostable greens, garden waste",
    icon: "🍎",
    bgColor: "#f0fdf4",
    textColor: "#16a34a",
  },
  {
    key: "electronics",
    label: "Electronics",
    desc: "E-waste, cables, batteries, small appliances",
    icon: "💻",
    bgColor: "#fef2f2",
    textColor: "#dc2626",
  },
  {
    key: "miscellaneous",
    label: "Miscellaneous",
    desc: "Mixed recyclables, rubber, textiles, other",
    icon: "📦",
    bgColor: "#fff7ed",
    textColor: "#ea580c",
  },
];

export default function StaffMCFCollection() {
  const navigate = useNavigate();

  const [quantities, setQuantities] = useState({
    paper: "",
    plastic: "",
    glass: "",
    metal: "",
    organic: "",
    electronics: "",
    miscellaneous: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const todayStr = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const getAccessToken = () => {
    return (
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      ""
    );
  };

  // Fetch today's collection on mount
  useEffect(() => {
    const fetchTodayCollection = async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const token = getAccessToken();
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        const res = await axios.get(`${API_BASE_URL}/api/waste/mcf/today/`, config);
        if (res.data?.exists && res.data.collection) {
          const col = res.data.collection;
          setQuantities({
            paper: col.paper && parseFloat(col.paper) > 0 ? String(col.paper) : "",
            plastic: col.plastic && parseFloat(col.plastic) > 0 ? String(col.plastic) : "",
            glass: col.glass && parseFloat(col.glass) > 0 ? String(col.glass) : "",
            metal: col.metal && parseFloat(col.metal) > 0 ? String(col.metal) : "",
            organic: col.organic && parseFloat(col.organic) > 0 ? String(col.organic) : "",
            electronics: col.electronics && parseFloat(col.electronics) > 0 ? String(col.electronics) : "",
            miscellaneous: col.miscellaneous && parseFloat(col.miscellaneous) > 0 ? String(col.miscellaneous) : "",
          });
          setIsExisting(true);
          setLastUpdated(col.updated_at || col.created_at);
        } else {
          setIsExisting(false);
        }
      } catch (err) {
        console.error("Failed to load today's MCF collection:", err);
        if (err.response?.status === 401) {
          setErrorMsg("Please login with your staff credentials.");
        } else if (err.response?.status === 403) {
          setErrorMsg("Access restricted to authorized field staff members.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTodayCollection();
  }, []);

  // Compute live total
  const liveTotal = useMemo(() => {
    let sum = 0;
    Object.values(quantities).forEach((val) => {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        sum += num;
      }
    });
    return sum.toFixed(2);
  }, [quantities]);

  const handleInputChange = (catKey, val) => {
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setQuantities((prev) => ({
        ...prev,
        [catKey]: val,
      }));
      setSuccessMsg("");
      setErrorMsg("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg("");
    setSuccessMsg("");

    // Validate quantities
    const parsedPayload = {
      date: todayStr,
    };

    for (const cat of CATEGORIES) {
      const val = quantities[cat.key];
      if (val !== "" && val !== null && val !== undefined) {
        const num = parseFloat(val);
        if (isNaN(num)) {
          setErrorMsg(`Please enter a valid number for ${cat.label}.`);
          return;
        }
        if (num < 0) {
          setErrorMsg(`${cat.label} quantity cannot be negative.`);
          return;
        }
        parsedPayload[cat.key] = num;
      } else {
        parsedPayload[cat.key] = 0;
      }
    }

    try {
      setSubmitting(true);
      const token = getAccessToken();
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const res = await axios.post(`${API_BASE_URL}/api/waste/mcf/submit/`, parsedPayload, config);

      if (res.data?.success) {
        setIsExisting(true);
        setSuccessMsg(
          res.data.created
            ? "MCF daily collection successfully submitted!"
            : "MCF daily collection record updated successfully!"
        );
        if (res.data.collection?.updated_at) {
          setLastUpdated(res.data.collection.updated_at);
        }
      }
    } catch (err) {
      console.error("Failed to submit MCF collection:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to save MCF collection. Please verify all entries and try again.";
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mcf-staff-page">
      {/* TOPBAR */}
      <header className="mcf-staff-topbar">
        <div className="mcf-topbar-left">
          <button className="mcf-back-btn" onClick={() => navigate("/staff")}>
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <div className="mcf-brand-logo">
            Eco <span>Pulse</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NotificationBell />
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="mcf-staff-container">
        {/* HEADER CARD */}
        <div className="mcf-header-card">
          <div className="mcf-header-title">
            <h1>MCF Daily Waste Collection</h1>
            <p>Record and update daily waste collected and deposited at the Material Collection Facility</p>
          </div>
          <div className="mcf-date-badge">
            <Calendar size={15} />
            <span>{formattedToday}</span>
          </div>
        </div>

        {/* NOTIFICATION BANNERS */}
        {isExisting && !successMsg && (
          <div className="mcf-alert-banner mcf-alert-info">
            <Info size={18} />
            <div>
              <strong>Existing record loaded:</strong> You have already recorded waste for today. Submitting will safely update today's quantities without creating duplicate rows.
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mcf-alert-banner mcf-alert-success">
            <CheckCircle2 size={18} />
            <div>{successMsg}</div>
          </div>
        )}

        {errorMsg && (
          <div className="mcf-alert-banner mcf-alert-error">
            <AlertCircle size={18} />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* INPUT FORM */}
        <form onSubmit={handleSubmit}>
          <div className="mcf-categories-grid">
            {CATEGORIES.map((cat) => {
              const currentVal = quantities[cat.key];
              return (
                <div key={cat.key} className="mcf-category-card">
                  <div>
                    <div className="mcf-cat-header">
                      <div
                        className="mcf-cat-icon"
                        style={{ backgroundColor: cat.bgColor, color: cat.textColor }}
                      >
                        {cat.icon}
                      </div>
                      <div>
                        <div className="mcf-cat-name">{cat.label}</div>
                        <div className="mcf-cat-desc">{cat.desc}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mcf-input-wrap">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="mcf-num-input"
                      placeholder="0.00"
                      value={currentVal}
                      onChange={(e) => handleInputChange(cat.key, e.target.value)}
                      disabled={loading || submitting}
                    />
                    <div className="mcf-unit-tag">kg</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SUBMISSION SECTION */}
          <div className="mcf-submission-section">
            <div className="mcf-submission-divider" />
            
            <div className="mcf-submission-card">
              <div className="mcf-total-display">
                <span className="mcf-total-title">Total Collection:</span>
                <span className="mcf-total-value">{liveTotal} kg</span>
              </div>

              <div className="mcf-submit-wrap">
                <button
                  type="submit"
                  className="mcf-submit-button-prominent"
                  disabled={loading || submitting}
                >
                  <Save size={20} />
                  <span>
                    {submitting
                      ? isExisting
                        ? "Updating..."
                        : "Saving..."
                      : isExisting
                      ? "Update Today's Collection"
                      : "Save Today's Collection"}
                  </span>
                </button>
              </div>

              <div className="mcf-submission-hint">
                {isExisting
                  ? "✓ Existing collection loaded for today. Click above to update."
                  : "Clicking save will record today's MCF collection under your staff account."}
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
