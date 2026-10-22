import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import "../components/userpage.css";
import NotificationBell from "../components/NotificationBell";
import PaymentReceiptModal from "../components/PaymentReceiptModal";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import PickupInstructionModal from "../components/PickupInstructionModal";
import { performLogout, getAccessToken } from "../utils/auth";
import { getFullImageUrl } from "../utils/imageUrl";
import { Receipt, Award, CheckCircle2, Clock, FileText } from "lucide-react";
 
const WARD_DATA = [
  { name: "Rosewood", code: "W1" },
  { name: "Greenfield", code: "W2" },
  { name: "Harbor Row", code: "W4" },
  { name: "Millbrook", code: "W5" },
];
 
const HOUSE_COUNT = 6;
const SKIP_INDEX = 3;
 
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
 
const ChevronLeft = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
 
const ChevronRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
 
const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
  </svg>
);
 
const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 3a5 5 0 00-5 5v3.6c0 .5-.2 1-.5 1.4L5 15h14l-1.5-2c-.3-.4-.5-.9-.5-1.4V8a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 18a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
 
const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M12 21s7-6.2 7-11.5A7 7 0 105 9.5C5 14.8 12 21 12 21z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);
 
const TruckSVG = ({ spinning }) => (
  <svg viewBox="0 0 46 30" width="100%" height="100%">
    <rect x="2" y="10" width="22" height="13" rx="2" fill="#ffffff" stroke="#c5e8d7" strokeWidth="1.2" />
    <path d="M24 14h9l6 6v3a1 1 0 01-1 1h-14V14z" fill="#18a862" />
    <rect x="4" y="12.5" width="8" height="6" rx="1" fill="#0f8a4f" opacity=".55" />
    <circle className={spinning ? "ep-wheel" : ""} cx="11" cy="25" r="3.4" fill="#0e2419" />
    <circle cx="11" cy="25" r="1.3" fill="#eafcf1" />
    <circle className={spinning ? "ep-wheel" : ""} cx="34" cy="25" r="3.4" fill="#0e2419" />
    <circle cx="34" cy="25" r="1.3" fill="#eafcf1" />
  </svg>
);
 
const MENU_ITEMS = [
  {
    key: "rewards",
    label: "My Rewards",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
        <circle cx="12" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" />
        <path d="M15.5 13.5L18 21l-6-3-6 3 2.5-7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "history",
    label: "Route history",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3 16V6a1 1 0 011-1h10v11H3zM14 9h4l3 3v4h-7V9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="7" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    key: "complaints",
    label: "Complaint queue",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 5h16v11H8l-4 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "tracking",
    label: "Live tracking",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    active: true,
  },
  { key: "notifications", label: "Notifications", icon: <BellIcon /> },
  {
    key: "instructions",
    label: "Instructions",
    icon: <FileText size={18} />,
  },
  {
    key: "profile",
    label: "My profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "edit_profile",
    label: "Edit Profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];
 
export default function EcoPulseStaff() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeWard, setActiveWard] = useState(0);
  const [houses, setHouses] = useState(Array(HOUSE_COUNT).fill("pending"));
  const [collected, setCollected] = useState(0);
  const [tooltip, setTooltip] = useState({ show: false, left: 0 });
  const [notifyActive, setNotifyActive] = useState(false);
  const [truckLeft, setTruckLeft] = useState(0);
  const [truckIdx, setTruckIdx] = useState(-1);
  const [wardsInView, setWardsInView] = useState(false);

  // User History State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  // Live Pickup Tracking State
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [latestPickup, setLatestPickup] = useState(null);
  const [hasPickup, setHasPickup] = useState(false);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // User Complaints Queue State
  const [complaintsOpen, setComplaintsOpen] = useState(false);
  const [userComplaints, setUserComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState("");
  const [selectedComplaintDetail, setSelectedComplaintDetail] = useState(null);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [showRewardRulesModal, setShowRewardRulesModal] = useState(false);
  const [showPickupInstructions, setShowPickupInstructions] = useState(false);

  // User Rewards & Points State
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [userRewards, setUserRewards] = useState([]);
  const [rewardsSummary, setRewardsSummary] = useState({
    total_earned_points: 0,
    total_bottles: 0,
    active_points: 0,
    claimed_points: 0,
    expired_points: 0,
    active_bottles: 0,
    claimed_bottles: 0,
    expired_bottles: 0,
  });
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [rewardsError, setRewardsError] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [claimSuccess, setClaimSuccess] = useState("");
  const [claimError, setClaimError] = useState("");

  // User info
  const userName = localStorage.getItem("name") || "Citizen User";
  const userRole = localStorage.getItem("role") || "Resident";

 
  const housesRowRef = useRef(null);
  const houseRefs = useRef([]);
  const wardsTrackRef = useRef(null);
  const wardsSectionRef = useRef(null);
  const trackerRef = useRef(null);
  const pickupTrackingRef = useRef(null);
  const [arrows, setArrows] = useState({ prev: true, next: true });
 
  // Inject font once
  useEffect(() => {
    if (!document.getElementById("ep-font-link")) {
      const link = document.createElement("link");
      link.id = "staff-font-link";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);
 
  const positionTruckAt = useCallback((i) => {
    const rowEl = housesRowRef.current;
    const houseEl = houseRefs.current[i];
    if (!rowEl || !houseEl) return;
    const rowRect = rowEl.getBoundingClientRect();
    const houseRect = houseEl.getBoundingClientRect();
    const leftPx = houseRect.left + houseRect.width / 2 - rowRect.left;
    const pct = (leftPx / rowRect.width) * 100;
    setTruckLeft(`calc(${pct}% + ${rowEl.offsetLeft}px)`);
    return { pct, offsetLeft: rowEl.offsetLeft };
  }, []);
 
  // main animation loop
  useEffect(() => {
    let cancelled = false;
    let idx = 0;
 
    const resetCycle = () => {
      setHouses(Array(HOUSE_COUNT).fill("pending"));
      setCollected(0);
      setTooltip({ show: false, left: 0 });
      setNotifyActive(false);
    };
 
    const processHouse = (i) => {
      positionTruckAt(i);
      setTruckIdx(i);
      window.setTimeout(() => {
        if (cancelled) return;
        if (i === SKIP_INDEX) {
          setHouses((prev) => {
            const next = [...prev];
            next[i] = "skipped";
            return next;
          });
          const rowEl = housesRowRef.current;
          const houseEl = houseRefs.current[i];
          if (rowEl && houseEl) {
            const rowRect = rowEl.getBoundingClientRect();
            const houseRect = houseEl.getBoundingClientRect();
            const leftPx = houseRect.left + houseRect.width / 2 - rowRect.left;
            const pct = (leftPx / rowRect.width) * 100;
            setTooltip({ show: true, left: `calc(${pct}% + ${rowEl.offsetLeft}px)` });
          }
          setNotifyActive(true);
        } else {
          setHouses((prev) => {
            const next = [...prev];
            next[i] = "collected";
            return next;
          });
          setCollected((c) => c + 1);
          setTooltip((t) => ({ ...t, show: false }));
        }
      }, 900);
    };
 
    const tick = () => {
      if (cancelled) return;
      if (idx >= HOUSE_COUNT) {
        window.setTimeout(() => {
          if (cancelled) return;
          resetCycle();
          idx = 0;
          setTruckLeft("0px");
          window.setTimeout(tick, 900);
        }, 2600);
        return;
      }
      processHouse(idx);
      idx++;
      window.setTimeout(tick, 1900);
    };
 
    resetCycle();
    const startTimer = window.setTimeout(tick, 700);
 
    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionTruckAt]);
 
  useEffect(() => {
    const onResize = () => truckIdx >= 0 && positionTruckAt(truckIdx);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [truckIdx, positionTruckAt]);
 
  // wards scroll reveal
  useEffect(() => {
    const el = wardsSectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setWardsInView(true)),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
 
  const updateArrows = useCallback(() => {
    const track = wardsTrackRef.current;
    if (!track) return;
    setArrows({
      prev: track.scrollLeft > 4,
      next: track.scrollLeft + track.clientWidth < track.scrollWidth - 4,
    });
  }, []);
 
  useEffect(() => {
    updateArrows();
  }, [updateArrows]);
 
  const scrollWards = (dir) => {
    wardsTrackRef.current?.scrollBy({ left: dir * 232, behavior: "smooth" });
  };
 
  // Fetch completed pickup history for logged-in user
  const fetchUserHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        "";

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await API.get("/waste/user/pickup-history/?status=ALL", { headers });

      if (response.data && response.data.success) {
        setHistoryRecords(response.data.history || []);
      } else {
        setHistoryRecords([]);
      }
    } catch (err) {
      console.error("Error fetching user pickup history:", err);
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load pickup history. Please make sure you are logged in.";
      setHistoryError(errMsg);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Cancel active pickup request
  const handleCancelPickup = async () => {
    if (!latestPickup) return;
    const pickupId = latestPickup.request_id || latestPickup.id;
    try {
      setCancelling(true);
      setCancelError("");
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        "";
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await API.post(`/waste/user/pickup-requests/${pickupId}/cancel/`, {}, { headers });
      if (res.data && res.data.success) {
        setConfirmCancelOpen(false);
        fetchLatestPickup();
        fetchUserHistory();
      } else {
        setCancelError(res.data?.error || "Failed to cancel pickup request.");
      }
    } catch (err) {
      console.error("Cancellation error:", err);
      setCancelError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to cancel pickup request. Please try again."
      );
    } finally {
      setCancelling(false);
    }
  };

  // Fetch latest active pickup request for live tracking
  const fetchLatestPickup = useCallback(async () => {
    setLoadingTracking(true);
    setTrackingError("");
    try {
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        "";

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await API.get("/waste/user/latest-pickup/", { headers });

      if (response.data && response.data.success) {
        setHasPickup(Boolean(response.data.has_pickup && response.data.latest_pickup));
        setLatestPickup(response.data.latest_pickup || null);
      } else {
        setHasPickup(false);
        setLatestPickup(null);
      }
    } catch (err) {
      console.error("Error fetching user latest pickup request:", err);
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to load active pickup status. Please make sure you are logged in.";
      setTrackingError(errMsg);
      setHasPickup(false);
      setLatestPickup(null);
    } finally {
      setLoadingTracking(false);
    }
  }, []);

  // Fetch complaints submitted by logged-in user
  const fetchUserComplaints = useCallback(async () => {
    setLoadingComplaints(true);
    setComplaintsError("");
    try {
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        "";

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await API.get("/waste/complaints/my/", { headers });

      if (response.data && response.data.success) {
        setUserComplaints(response.data.complaints || []);
      } else {
        setUserComplaints([]);
      }
    } catch (err) {
      console.error("Error fetching user complaints:", err);
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to load your complaint queue. Please make sure you are logged in.";
      setComplaintsError(errMsg);
    } finally {
      setLoadingComplaints(false);
    }
  }, []);

  const fetchUserRewards = useCallback(async () => {
    setLoadingRewards(true);
    setRewardsError("");
    try {
      const token = getAccessToken();
      if (!token) return;
      const response = await API.get("/waste/user/rewards/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && response.data.success) {
        setUserRewards(response.data.rewards || []);
        if (response.data.summary) {
          setRewardsSummary(response.data.summary);
        }
      } else {
        setUserRewards([]);
      }
    } catch (err) {
      console.error("Error fetching user rewards:", err);
      const errMsg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Failed to load your rewards.";
      setRewardsError(errMsg);
    } finally {
      setLoadingRewards(false);
    }
  }, []);

  useEffect(() => {
    fetchUserRewards();
  }, [fetchUserRewards]);

  const handleClaimReward = async (id) => {
    setClaimingId(id);
    setClaimError("");
    setClaimSuccess("");
    try {
      const token = getAccessToken();
      const response = await API.post(
        `/waste/reward-submissions/${id}/claim/`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data && response.data.success) {
        setClaimSuccess(response.data.message || "Reward claimed successfully!");
        const updated = response.data.reward;
        setUserRewards((prev) =>
          prev.map((r) => (r.id === id ? updated : r))
        );
        fetchUserRewards();
      } else {
        setClaimError(response.data?.error || "Failed to claim reward.");
      }
    } catch (err) {
      console.error("Claim reward error:", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Failed to claim reward. Please try again.";
      setClaimError(errMsg);
    } finally {
      setClaimingId(null);
    }
  };

  const calculateDaysRemaining = (validTillStr) => {
    if (!validTillStr) return 0;
    const diffMs = new Date(validTillStr).getTime() - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const openRewards = () => {
    setDrawerOpen(false);
    setRewardsOpen(true);
    fetchUserRewards();
  };

  const openHistory = () => {
    setDrawerOpen(false);
    setHistoryOpen(true);
    fetchUserHistory();
  };

  const openTracking = () => {
    setDrawerOpen(false);
    setTrackingOpen(true);
    fetchLatestPickup();
  };

  const openComplaintsQueue = () => {
    setDrawerOpen(false);
    setComplaintsOpen(true);
    fetchUserComplaints();
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    performLogout(navigate);
  };

  const handleMenuClick = (key) => {
    if (key === "rewards" || key === "profile") {
      openRewards();
    } else if (key === "edit_profile") {
      setDrawerOpen(false);
      navigate("/profile");
    } else if (key === "history") {
      openHistory();
    } else if (key === "complaints") {
      openComplaintsQueue();
    } else if (key === "tracking") {
      openTracking();
    } else if (key === "notifications") {
      setDrawerOpen(false);
      navigate("/notifications");
    } else if (key === "instructions") {
      setDrawerOpen(false);
      navigate("/instructions");
    }
  };


  // Group history by date
  const groupedHistory = historyRecords.reduce((acc, item) => {
    const dateKey = item.completed_date || item.date || "Recent Pickups";
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {});

  const selectWard = (i) => {
    setActiveWard(i);
    trackerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
 
  const wardTagText = `${WARD_DATA[activeWard].name} — Ward ${WARD_DATA[activeWard].code.replace("W", "")}`;

  // Helper for tracking timeline stages
  const getTimelineStages = (pickup) => {
    if (!pickup) return [];

    const rawStatus = (pickup.status || "").toUpperCase();
    const isCancelled = rawStatus === "CANCELLED";
    const hasStaff = Boolean(pickup.assigned_staff || pickup.assigned_staff_id);
    const isCollected = rawStatus === "COLLECTED" || rawStatus === "COMPLETED";
    const isCompleted = rawStatus === "COMPLETED";

    // Index mapping:
    // 0: Request Submitted
    // 1: AI Analysis Completed
    // 2: Admin Assigned
    // 3: Staff Assigned
    // 4: Waste Collected
    // 5: Completed

    let currentStageIndex = 0;
    if (isCompleted) {
      currentStageIndex = 5;
    } else if (rawStatus === "COLLECTED") {
      currentStageIndex = 4;
    } else if (rawStatus === "IN_PROGRESS") {
      currentStageIndex = 4;
    } else if (rawStatus === "ASSIGNED" || hasStaff) {
      currentStageIndex = 3;
    } else if (pickup.waste_type && pickup.waste_type !== "Unknown") {
      currentStageIndex = 2;
    } else {
      currentStageIndex = 0;
    }

    const schedDateFormatted = pickup.scheduled_pickup_date
      ? (() => {
          const p = String(pickup.scheduled_pickup_date).slice(0, 10).split("-");
          return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : pickup.scheduled_pickup_date;
        })()
      : null;

    const stages = [
      {
        title: "Request Submitted",
        desc: pickup.date ? `Submitted on ${pickup.date}` : "Request registered in EcoPulse system",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        ),
      },
      {
        title: "AI Analysis Completed",
        desc: pickup.waste_type && pickup.waste_type !== "Unknown"
          ? `Detected: ${pickup.waste_type}${pickup.ai_confidence ? ` (${pickup.ai_confidence}% confidence)` : ""}`
          : "AI waste classification verified",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2.2"/>
            <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="2.2"/>
            <path d="M12 7v4" stroke="currentColor" strokeWidth="2.2"/>
            <line x1="8" y1="16" x2="8" y2="16.01" stroke="currentColor" strokeWidth="2.4"/>
            <line x1="16" y1="16" x2="16" y2="16.01" stroke="currentColor" strokeWidth="2.4"/>
          </svg>
        ),
      },
      {
        title: "Admin Assigned",
        desc: hasStaff || rawStatus !== "PENDING"
          ? (pickup.ward ? `Approved for Ward ${pickup.ward}` : "Request verified & approved by Admin")
          : "Under review by municipal admin",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2.2"/>
            <polyline points="17 11 19 13 23 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
      {
        title: "Staff Assigned",
        desc: pickup.assigned_staff
          ? `Assigned to ${pickup.assigned_staff}${schedDateFormatted ? ` • Scheduled: ${schedDateFormatted}` : ""}`
          : "Assigning field staff for collection",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2.2"/>
          </svg>
        ),
      },
      {
        title: rawStatus === "IN_PROGRESS" ? "Collection in Progress" : "Waste Collected",
        desc: isCollected
          ? (pickup.estimated_weight ? `Collected (${pickup.estimated_weight} kg)` : "Waste collected by field crew")
          : rawStatus === "IN_PROGRESS"
          ? `${pickup.assigned_staff || "Field staff"} has started collection and is en route`
          : (rawStatus === "ASSIGNED" ? (schedDateFormatted ? `Scheduled for ${schedDateFormatted}` : "Field crew dispatched to pickup address") : "Awaiting field collection"),
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="1" y="3" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="2.2"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2.2"/>
            <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2.2"/>
          </svg>
        ),
      },
      {
        title: "Completed",
        desc: isCompleted
          ? (pickup.completed_time ? `Completed at ${pickup.completed_time}` : (pickup.completed_date || "Pickup completed & verified"))
          : "Final record verification & closing",
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
    ];

    return stages.map((s, idx) => {
      let state = "upcoming";
      if (isCancelled) {
        if (idx <= 1) state = "completed";
        else if (idx === 2) state = "cancelled";
        else state = "upcoming";
      } else {
        if (idx < currentStageIndex) {
          state = "completed";
        } else if (idx === currentStageIndex) {
          state = isCompleted && idx === 5 ? "completed" : "current";
        } else {
          state = "upcoming";
        }
      }
      return { ...s, state };
    });
  };
 
  return (
    <div className="staff-root">
      <style>{`
        .staff-root{
          --bg:#f3faf6; --white:#ffffff; --mint:#e3f5eb; --mint-2:#d3eee0; --mint-3:#c5e8d7;
          --green:#18a862; --green-deep:#0f8a4f; --green-bright:#2ecb84;
          --ink:#0e2419; --muted:#5b7268; --panel:#eafcf1; --amber:#e8a33d; --line:#d7ecdf;
          --shadow: 0 1px 2px rgba(14,36,25,.04), 0 12px 28px -12px rgba(14,36,25,.14);
          font-family:'Inter', system-ui, sans-serif;
          background:var(--bg); color:var(--ink); min-height:100vh; overflow-x:hidden;
        }
        .staff-root *{ box-sizing:border-box; }
        .staff-root h1, .ep-root h2, .ep-root h3, .ep-root .ep-brand, .ep-root .ep-eyebrow, .ep-root .ep-ward-name{
          font-family:'Space Grotesk','Inter',sans-serif;
        }
        .staff-root button{ font-family:inherit; cursor:pointer; }
 
        .staff-header{ display:flex; align-items:center; justify-content:space-between; padding:18px 40px;
          background:var(--white); border-bottom:1px solid var(--line); position:sticky; top:0; z-index:40; }
        .staff-header-left{ display:flex; align-items:center; gap:14px; }
        .staff-back-btn{ width:38px; height:38px; border-radius:50%; border:1px solid var(--mint-3); background:var(--mint);
          display:flex; align-items:center; justify-content:center; color:var(--green); transition:transform .18s ease, background .18s ease; }
        .staff-back-btn:hover{ background:var(--mint-2); transform:translateX(-2px); }
        .staff-logo-mark{ width:34px; height:34px; border-radius:10px; background:var(--green); display:flex;
          align-items:center; justify-content:center; box-shadow:0 6px 14px -6px rgba(12,107,69,.55); }
        .staff-brand{ font-size:19px; font-weight:700; color:var(--ink); letter-spacing:-.01em; display:flex; gap:5px; }
        .staff-brand .staff-accent{ color:var(--green); }
        .staff-header-right{ display:flex; align-items:center; gap:10px; }
        .staff-btn{ border-radius:999px; padding:10px 18px; font-size:13.5px; font-weight:600; border:1px solid transparent;
          transition:all .18s ease; white-space:nowrap; }
        .staff-btn-ghost{ background:var(--white); border-color:var(--mint-3); color:var(--green-deep); }
        .staff-btn-ghost:hover{ background:var(--mint); border-color:var(--green-bright); }
        .staff-btn-solid{ background:var(--green); color:#fff; }
        .staff-btn-solid:hover{ background:var(--green-deep); box-shadow:0 8px 18px -8px rgba(12,107,69,.6); }
 
        .staff-main{ max-width:1180px; margin:0 auto; padding:0 40px; }
        .staff-hero{ padding:56px 0 34px; animation:staffRiseIn .7s cubic-bezier(.2,.7,.2,1) both; }
        @keyframes staffRiseIn{ from{opacity:0; transform:translateY(14px);} to{opacity:1; transform:translateY(0);} }
        .staff-eyebrow{ display:inline-flex; align-items:center; gap:8px; background:var(--mint); color:var(--green-deep);
          padding:9px 18px; border-radius:999px; font-size:11.5px; font-weight:700; letter-spacing:.08em;
          text-transform:uppercase; margin-bottom:26px; }
        .staff-eyebrow .staff-dot{ width:6px; height:6px; border-radius:50%; background:var(--green-bright); }
        .staff-hero h1{ font-size:44px; line-height:1.14; font-weight:700; letter-spacing:-.02em; max-width:680px;
          color:var(--ink); margin-bottom:20px; }
        .staff-hero h1 .staff-grad{ color:var(--green); }
        .staff-hero p{ font-size:16px; line-height:1.65; color:var(--muted); max-width:560px; margin-bottom:30px; }
        .staff-hero p b{ color:var(--ink); font-weight:600; }
        .staff-hero-actions{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
        .staff-action-pill{ background:var(--mint); color:var(--green-deep); border:1px solid var(--mint-3);
          padding:12px 20px; border-radius:12px; font-size:14px; font-weight:600; transition:all .18s ease; display:inline-flex; align-items:center; gap:8px; }
        .staff-action-pill:hover{ background:var(--green); color:#fff; transform:translateY(-2px); box-shadow:var(--shadow); }
        .staff-action-pill-accent{ background:var(--green); color:#fff; }
        .staff-action-pill-accent:hover{ background:var(--green-deep); }
        .staff-hero-note{ font-size:13.5px; color:var(--muted); font-style:italic; }

        /* History & Tracking Modal Styles */
        .ep-modal-overlay{ position:fixed; inset:0; background:rgba(9,26,18,.58); backdrop-filter:blur(5px);
          z-index:70; display:flex; align-items:center; justify-content:center; padding:16px; animation:staffRiseIn .25s ease; }
        .ep-modal-card{ background:#fff; width:100%; max-width:860px; max-height:88vh; border-radius:24px;
          border:1px solid var(--mint-3); box-shadow:0 30px 60px -20px rgba(12,107,69,.45); display:flex; flex-direction:column;
          overflow:hidden; position:relative; }
        .ep-modal-head{ padding:22px 28px; background:linear-gradient(135deg, var(--panel) 0%, #fff 70%);
          border-bottom:1px solid var(--line); display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; }
        .ep-modal-title-area h2{ font-size:22px; font-weight:700; color:var(--ink); margin:0 0 4px; display:flex; align-items:center; gap:10px; }
        .ep-modal-title-area p{ font-size:13.5px; color:var(--muted); margin:0; }
        .ep-modal-actions{ display:flex; align-items:center; gap:10px; }
        .ep-modal-refresh-btn{ background:#fff; border:1px solid var(--mint-3); color:var(--green-deep); padding:8px 14px;
          border-radius:10px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px; transition:all .18s ease; }
        .ep-modal-refresh-btn:hover{ background:var(--mint); border-color:var(--green); }
        .ep-modal-close-btn{ width:34px; height:34px; border-radius:50%; border:1px solid var(--mint-3); background:#fff;
          display:flex; align-items:center; justify-content:center; color:var(--muted); transition:all .18s ease; }
        .ep-modal-close-btn:hover{ background:var(--mint); color:var(--ink); }
        .ep-modal-body{ padding:24px 28px; overflow-y:auto; flex:1; }
        
        .ep-date-group{ margin-bottom:28px; }
        .ep-date-badge{ display:inline-flex; align-items:center; gap:8px; background:var(--mint); color:var(--green-deep);
          padding:6px 14px; border-radius:999px; font-size:12.5px; font-weight:700; letter-spacing:.02em; margin-bottom:14px; border:1px solid var(--mint-3); }
        .ep-history-grid{ display:flex; flex-direction:column; gap:14px; }
        .ep-history-card{ background:#fff; border:1px solid var(--line); border-radius:16px; padding:18px 20px;
          box-shadow:0 2px 8px rgba(12,107,69,.04); transition:all .2s ease; display:flex; flex-direction:column; gap:14px; }
        .ep-history-card:hover{ border-color:var(--green-bright); box-shadow:0 12px 24px -10px rgba(12,107,69,.18); transform:translateY(-2px); }
        .ep-card-top{ display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
        .ep-req-id{ font-size:13.5px; font-weight:700; color:var(--ink); display:flex; align-items:center; gap:8px; }
        .ep-req-pill{ background:var(--panel); color:var(--green-deep); padding:3px 10px; border-radius:6px; border:1px solid var(--mint-3); font-size:12px; }
        .ep-status-pill{ display:inline-flex; align-items:center; gap:5px; background:rgba(31,184,116,.15); color:var(--green-deep);
          padding:5px 12px; border-radius:999px; font-size:12px; font-weight:700; border:1px solid rgba(31,184,116,.3); }
        .ep-waste-type-pill{ background:#edf7f2; color:#125232; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:600; border:1px solid #d0ecdc; }
        
        .ep-card-details{ display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; padding:12px 0; border-top:1px dashed var(--line); border-bottom:1px dashed var(--line); }
        .ep-detail-item{ display:flex; align-items:flex-start; gap:8px; font-size:13px; color:var(--muted); }
        .ep-detail-item b{ color:var(--ink); font-weight:600; }
        .ep-detail-icon{ width:16px; height:16px; color:var(--green); flex-shrink:0; margin-top:2px; }

        .ep-card-media{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
        .ep-image-thumb-btn{ display:inline-flex; align-items:center; gap:8px; background:var(--panel); border:1px solid var(--mint-3);
          border-radius:10px; padding:6px 12px; font-size:12.5px; font-weight:600; color:var(--green-deep); transition:all .18s ease; cursor:pointer; }
        .ep-image-thumb-btn:hover{ background:var(--mint); border-color:var(--green); transform:scale(1.02); }
        .ep-thumb-img{ width:30px; height:30px; border-radius:6px; object-fit:cover; border:1px solid var(--mint-3); }

        /* Tracking Details & Timeline Styles */
        .ep-track-overview-card{ background:linear-gradient(145deg, #ffffff 0%, var(--panel) 100%);
          border:1px solid var(--mint-3); border-radius:18px; padding:22px 24px; margin-bottom:24px;
          box-shadow:0 6px 16px -8px rgba(12,107,69,.12); }
        .ep-track-header-row{ display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:16px; }
        .ep-track-id-badge{ display:inline-flex; align-items:center; gap:8px; font-size:15px; font-weight:700; color:var(--ink); }
        .ep-track-id-pill{ background:var(--green); color:#fff; padding:4px 12px; border-radius:8px; font-size:13px; font-weight:700; }
        
        .ep-badge-status{ display:inline-flex; align-items:center; gap:6px; padding:5px 14px; border-radius:999px; font-size:12.5px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .ep-badge-pending{ background:#fef3c7; color:#92400e; border:1px solid #fde68a; }
        .ep-badge-assigned{ background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; }
        .ep-badge-inprogress{ background:#ffedd5; color:#c2410c; border:1px solid #fed7aa; }
        .ep-badge-collected{ background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; }
        .ep-badge-completed{ background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; }
        .ep-badge-cancelled{ background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }

        .ep-track-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; padding-top:14px; border-top:1px solid var(--line); }
        .ep-track-field{ display:flex; align-items:flex-start; gap:10px; }
        .ep-track-icon-box{ width:32px; height:32px; border-radius:8px; background:var(--mint); border:1px solid var(--mint-3);
          display:flex; align-items:center; justify-content:center; color:var(--green-deep); font-size:15px; flex-shrink:0; }
        .ep-track-label{ font-size:11.5px; color:var(--muted); text-transform:uppercase; font-weight:700; letter-spacing:.03em; }
        .ep-track-value{ font-size:13.5px; color:var(--ink); font-weight:600; margin-top:2px; word-break:break-word; }

        /* Visual Timeline */
        .ep-timeline-section{ background:#fff; border:1px solid var(--line); border-radius:18px; padding:22px 24px; box-shadow:0 2px 10px rgba(12,107,69,.04); }
        .ep-timeline-title{ font-size:16px; font-weight:700; color:var(--ink); margin:0 0 20px; display:flex; align-items:center; gap:8px; }
        .ep-timeline{ display:flex; flex-direction:column; gap:0; position:relative; }
        
        .ep-timeline-step{ display:flex; position:relative; padding-bottom:22px; }
        .ep-timeline-step:last-child{ padding-bottom:4px; }
        .ep-timeline-rail{ position:absolute; left:17px; top:36px; bottom:0; width:2px; background:var(--line); z-index:1; }
        .ep-timeline-step.completed .ep-timeline-rail{ background:var(--green); }
        .ep-timeline-step.current .ep-timeline-rail{ background:linear-gradient(to bottom, var(--green-bright) 0%, var(--line) 100%); }
        .ep-timeline-step:last-child .ep-timeline-rail{ display:none; }

        .ep-timeline-marker{ width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center;
          flex-shrink:0; z-index:2; position:relative; transition:all .25s ease; }
        
        .ep-timeline-step.completed .ep-timeline-marker{ background:var(--green); color:#fff; border:2px solid var(--green); box-shadow:0 0 0 3px var(--mint); }
        .ep-timeline-step.current .ep-timeline-marker{ background:#fff; color:var(--green); border:2.5px solid var(--green); box-shadow:0 0 0 4px var(--mint-2); animation:epPulseRing 2s infinite; }
        .ep-timeline-step.upcoming .ep-timeline-marker{ background:#fff; color:var(--muted); border:2px solid var(--line); opacity:.75; }
        .ep-timeline-step.cancelled .ep-timeline-marker{ background:#ef4444; color:#fff; border:2px solid #ef4444; }

        @keyframes epPulseRing{
          0%{ box-shadow:0 0 0 0 rgba(24,168,98,.5); }
          70%{ box-shadow:0 0 0 8px rgba(24,168,98,0); }
          100%{ box-shadow:0 0 0 0 rgba(24,168,98,0); }
        }

        .ep-timeline-content{ margin-left:16px; flex:1; display:flex; flex-direction:column; justify-content:center; min-height:36px; }
        .ep-timeline-head{ display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; }
        .ep-timeline-name{ font-size:14px; font-weight:700; color:var(--ink); }
        .ep-timeline-step.upcoming .ep-timeline-name{ color:var(--muted); font-weight:600; }
        .ep-timeline-step.current .ep-timeline-name{ color:var(--green-deep); font-weight:700; }
        .ep-timeline-state-pill{ font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px; text-transform:uppercase; letter-spacing:.04em; }
        .ep-timeline-step.completed .ep-timeline-state-pill{ background:var(--mint); color:var(--green-deep); border:1px solid var(--mint-3); }
        .ep-timeline-step.current .ep-timeline-state-pill{ background:rgba(46,203,132,.18); color:var(--green-deep); border:1px solid var(--green-bright); }
        .ep-timeline-step.upcoming .ep-timeline-state-pill{ background:#f3f4f6; color:#9ca3af; }
        .ep-timeline-desc{ font-size:12.5px; color:var(--muted); margin-top:3px; line-height:1.4; }

        .ep-lightbox{ position:fixed; inset:0; background:rgba(6,26,17,.88); backdrop-filter:blur(8px);
          z-index:90; display:flex; align-items:center; justify-content:center; padding:20px; }
        .ep-lightbox-content{ position:relative; max-width:600px; width:100%; background:#fff; border-radius:20px; overflow:hidden;
          box-shadow:0 30px 60px rgba(0,0,0,.5); }
        .ep-lightbox-img{ width:100%; max-height:480px; object-fit:cover; display:block; }
        .ep-lightbox-foot{ padding:16px 20px; display:flex; align-items:center; justify-content:space-between; background:#fff; }

        .staff-tracker-wrap{ padding:8px 0 60px; }
        .staff-tracker{ position:relative; background:linear-gradient(160deg, var(--panel) 0%, #ffffff 62%);
          border:1px solid var(--mint-3);
          border-radius:24px; padding:26px 26px 34px; color:var(--ink); overflow:hidden;
          box-shadow:0 30px 60px -34px rgba(12,107,69,.35); }
        .staff-tracker::before{ content:''; position:absolute; inset:0;
          background:radial-gradient(500px 220px at 90% 0%, rgba(46,203,132,.14), transparent 60%); pointer-events:none; }
        .staff-tracker-top{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
          position:relative; z-index:2; }
        .staff-stat-pill{ background:#fff; color:var(--ink); border:1px solid var(--mint-3); border-radius:999px;
          padding:9px 18px; font-size:13.5px; font-weight:700; }
        .staff-notify-pill{ display:flex; align-items:center; gap:8px; background:var(--mint);
          border:1px solid var(--mint-3); color:var(--green-deep); border-radius:999px; padding:9px 16px;
          font-size:13px; font-weight:600; transition:background .25s ease, border-color .25s ease, color .25s ease; }
        .staff-notify-pill.staff-active{ background:rgba(232,163,61,.16); border-color:rgba(232,163,61,.55); color:#9a6111; }
        .staff-notify-pill svg{ width:14px; height:14px; flex-shrink:0; }
 
        .staff-route-stage{ position:relative; height:230px; margin-top:26px; }
        .staff-ward-tag{ position:absolute; top:0; left:50%; transform:translateX(-50%); font-size:12px;
          letter-spacing:.06em; text-transform:uppercase; color:var(--green-deep); opacity:.6; font-weight:600; }
        .staff-tooltip{ position:absolute; top:64px; left:0; transform:translate(-50%, 6px); opacity:0;
          background:#fff; color:var(--ink); border:1px solid var(--mint-3); border-radius:12px; padding:9px 16px;
          font-size:12.5px; font-weight:600; white-space:nowrap; display:flex; align-items:center; gap:7px;
          box-shadow:0 14px 26px -12px rgba(12,107,69,.28);
          transition:opacity .35s ease, transform .35s ease, left .9s cubic-bezier(.35,.1,.25,1); z-index:5; pointer-events:none; }
        .staff-tooltip.staff-show{ opacity:1; transform:translate(-50%, 0); }
        .staff-tooltip .staff-dot{ width:7px; height:7px; border-radius:50%; background:var(--amber); flex-shrink:0; }
 
        .staff-houses{ position:absolute; bottom:64px; left:0; right:0; display:flex; justify-content:space-between; padding:0 18px; }
        .staff-house{ width:70px; display:flex; flex-direction:column; align-items:center; position:relative; }
        .staff-house-roof{ width:0; height:0; border-left:26px solid transparent; border-right:26px solid transparent;
          border-bottom:24px solid var(--mint-3); transition:border-bottom-color .4s ease; }
        .staff-house-body{ width:44px; height:30px; background:#fff; border:1.5px solid var(--mint-3); border-top:none;
          border-radius:0 0 4px 4px; display:flex; align-items:center; justify-content:center; margin-top:-1px;
          transition:background .4s ease, border-color .4s ease; }
        .staff-house-window{ width:11px; height:11px; border-radius:2px; background:var(--amber);
          transition:background .4s ease, opacity .4s ease; }
        .staff-bin{ width:22px; height:16px; border-radius:4px; margin-top:9px; display:flex; align-items:center;
          justify-content:center; background:var(--mint); border:1.5px dashed var(--mint-3);
          transition:all .4s ease; }
        .staff-bin svg{ width:11px; height:11px; opacity:0; transform:scale(.4); transition:opacity .3s ease .1s, transform .3s ease .1s; }
        .staff-house.pending .staff-bin{ background:var(--mint); border:1.5px solid var(--mint-3); opacity:.85; }
        .staff-house.collected .staff-house-roof{ border-bottom-color:var(--green); }
        .staff-house.collected .staff-house-body{ background:var(--green); border-color:var(--green); }
        .staff-house.collected .staff-bin{ background:var(--green-deep); border-style:solid; border-color:var(--green-deep); }
        .staff-house.collected .staff-bin svg{ opacity:1; transform:scale(1); }
        .staff-house.skipped .staff-bin{ background:transparent; border-color:rgba(232,163,61,.75); }
        .staff-house.skipped .staff-house-window{ opacity:.4; }
 
        .staff-road{ position:absolute; bottom:24px; left:0; right:0; height:2px;
          background-image:linear-gradient(90deg, rgba(15,138,79,.3) 0 14px, transparent 14px 26px);
          background-size:26px 2px; background-repeat:repeat-x; }
        .staff-truck{ position:absolute; bottom:10px; left:0; width:46px; height:30px; transform:translateX(-50%);
          transition:left 1.5s cubic-bezier(.4,.05,.2,1); filter:drop-shadow(0 8px 10px rgba(12,107,69,.28)); }
        .staff-wheel{ animation:staffSpin 1.1s linear infinite; transform-origin:center; }
        @keyframes staffSpin{ from{transform:rotate(0)} to{transform:rotate(360deg)} }
 
        .staff-wards-section{ padding:20px 0 90px; opacity:0; transform:translateY(24px);
          transition:opacity .7s ease, transform .7s ease; }
        .staff-wards-section.staff-in-view{ opacity:1; transform:translateY(0); }
        .staff-wards-head{ display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:26px;
          gap:16px; flex-wrap:wrap; }
        .staff-wards-head h2{ font-size:26px; font-weight:700; letter-spacing:-.01em; margin-bottom:6px; }
        .staff-wards-head p{ color:var(--muted); font-size:14.5px; }
        .staff-nav-arrows{ display:flex; gap:10px; }
        .staff-arrow-btn{ width:38px; height:38px; border-radius:50%; background:var(--white); border:1px solid var(--mint-3);
          display:flex; align-items:center; justify-content:center; color:var(--green-deep); transition:all .18s ease; }
        .staff-arrow-btn:hover:not(:disabled){ background:var(--green); color:#fff; border-color:var(--green); }
        .staff-arrow-btn:disabled{ opacity:.35; cursor:default; }
 
        .staff-wards-track{ display:flex; gap:22px; overflow-x:auto; padding:6px 6px 18px; scroll-behavior:smooth; scrollbar-width:none; }
        .staff-wards-track::-webkit-scrollbar{ display:none; }
        .staff-ward-card{ flex:0 0 210px; height:220px; background:var(--white); border:1px solid var(--line);
          border-radius:20px; position:relative; padding:22px; display:flex; flex-direction:column;
          justify-content:space-between; box-shadow:var(--shadow); cursor:pointer;
          transition:transform .28s cubic-bezier(.2,.8,.3,1), box-shadow .28s ease, border-color .28s ease; }
        .staff-ward-card:hover{ transform:translateY(-10px); box-shadow:0 26px 40px -20px rgba(12,107,69,.28); border-color:var(--green-bright); }
        .staff-ward-card.staff-active{ border-color:var(--green); background:linear-gradient(160deg, var(--mint) 0%, var(--white) 60%); }
        .staff-ward-pin{ width:40px; height:40px; border-radius:50%; background:var(--green); display:flex;
          align-items:center; justify-content:center; color:#fff; transition:transform .3s ease; }
        .staff-ward-card:hover .staff-ward-pin{ transform:scale(1.08) rotate(-4deg); }
        .staff-ward-pin svg{ width:19px; height:19px; }
        .staff-ward-illustration{ flex:1; }
        .staff-ward-name{ align-self:flex-start; background:var(--mint); color:var(--green-deep); font-weight:700;
          font-size:13.5px; padding:9px 16px; border-radius:999px; border:1px solid var(--mint-3); }
        .staff-ward-card.staff-active .staff-ward-name{ background:var(--green); color:#fff; border-color:var(--green); }
 
        .staff-overlay{ position:fixed; inset:0; background:rgba(9,26,18,.38); backdrop-filter:blur(2px);
          opacity:0; pointer-events:none; transition:opacity .3s ease; z-index:60; }
        .staff-overlay.staff-show{ opacity:1; pointer-events:auto; }
        .staff-drawer{ position:fixed; top:0; right:0; height:100%; width:340px; max-width:88vw; background:var(--white);
          box-shadow:-24px 0 50px -20px rgba(6,23,15,.35); transform:translateX(100%);
          transition:transform .38s cubic-bezier(.2,.8,.25,1); z-index:61; padding:26px 22px; display:flex; flex-direction:column; }
        .staff-drawer.staff-show{ transform:translateX(0); }
        .staff-drawer-head{ display:flex; align-items:center; gap:12px; margin-bottom:26px; }
        .staff-avatar{ width:44px; height:44px; border-radius:50%; background:var(--green); color:#fff; font-weight:700;
          font-size:17px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .staff-drawer-head .staff-who{ flex:1; }
        .staff-drawer-head .staff-who h3{ font-size:15.5px; font-weight:700; }
        .staff-drawer-head .staff-who p{ font-size:12.5px; color:var(--muted); margin-top:2px; }
        .staff-drawer-close{ width:30px; height:30px; border-radius:50%; border:1px solid var(--mint-3); background:var(--mint);
          display:flex; align-items:center; justify-content:center; color:var(--green-deep); transition:all .18s ease; flex-shrink:0; }
        .staff-drawer-close:hover{ background:var(--green); color:#fff; }
        .staff-drawer-menu{ display:flex; flex-direction:column; gap:5px; }
        .staff-menu-item{ display:flex; align-items:center; gap:13px; padding:13px 14px; border-radius:12px; color:var(--ink);
          font-size:14px; font-weight:600; background:transparent; border:none; text-align:left; width:100%;
          transition:background .18s ease, transform .18s ease; }
        .staff-menu-item:hover{ background:var(--mint); transform:translateX(3px); }
        .staff-menu-item .staff-ic{ width:34px; height:34px; border-radius:9px; background:var(--mint); display:flex;
          align-items:center; justify-content:center; color:var(--green-deep); flex-shrink:0; }
        .staff-menu-item svg{ width:16px; height:16px; }
        .staff-menu-item.staff-active{ background:var(--mint); }
        .staff-menu-item.staff-active .staff-ic{ background:var(--green); color:#fff; }
        .staff-drawer-divider{ height:1px; background:var(--line); margin:16px 0; }
        .staff-drawer-foot{ margin-top:auto; border-top:1px solid var(--line); padding-top:14px; }
 
        @media (max-width:720px){
          .staff-header{ padding:14px 18px; }
          .staff-main{ padding:0 18px; }
          .staff-hero h1{ font-size:32px; }
          .staff-houses{ padding:0 6px; }
          .staff-house{ width:44px; }
          .staff-house-roof{ border-left-width:17px; border-right-width:17px; border-bottom-width:16px; }
          .staff-house-body{ width:30px; height:22px; }
          .ep-modal-body{ padding:18px 16px; }
          .ep-track-header-row{ flex-direction:column; align-items:flex-start; }
          .ep-timeline-desc{ font-size:12px; }
        }
        @media (prefers-reduced-motion: reduce){
          .staff-root *{ animation:none !important; transition:none !important; }
        }
      `}</style>

      <header className="staff-header">
        <div className="staff-header-left">
          <button className="staff-back-btn" aria-label="Back">
            <ChevronLeft />
          </button>
          <div className="staff-logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M2 12h5l2-6 4 12 2-6h7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="staff-brand">
            Eco <span className="staff-accent">Pulse</span>
          </div>
        </div>
        <div className="staff-header-right">
          <NotificationBell />
          <button
            className="staff-btn staff-btn-ghost"
            onClick={openTracking}
          >
            track status
          </button>
          <button
            className="staff-btn staff-btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={() => setShowRewardRulesModal(true)}
          >
            Reward
          </button>
          <button
            className="staff-btn staff-btn-ghost"
            onClick={() => navigate("/instructions")}
          >
            Instructions
          </button>
          <button className="staff-btn staff-btn-solid" onClick={() => setDrawerOpen(true)}>
            my profile
          </button>
        </div>
      </header>

      <main className="staff-main">
        <section className="staff-hero">
          <div className="staff-eyebrow">
            <span className="staff-dot" /> STAFF CONSOLE · PART OF GREENLOOP OS · LIVE ROUTE VIEW
          </div>
          <h1>
            Every ward's round, <span className="staff-grad">tracked as it happens.</span>
          </h1>
          <p>
            Every lift, every skipped bin, every resident query lands on <b>one record</b> — so you know
            what's next, the office knows what happened, and residents get an answer <b>backed by proof</b>.
          </p>
          <div className="staff-hero-actions">
            <button
              className="staff-action-pill staff-action-pill-accent"
              onClick={() => setShowPickupInstructions(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              pickup request
            </button>
            <button
              className="staff-action-pill"
              onClick={openHistory}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              pickup history
            </button>
            <button
              className="staff-action-pill" 
              onClick={() => navigate("/complaintform")}
            >
              complaint
            </button>
            <span className="staff-hero-note">Rosewood is running 8 minutes ahead today.</span>
          </div>
        </section>

        <section className="staff-tracker-wrap">
          <div className="staff-tracker" ref={trackerRef}>
            <div className="staff-tracker-top">
              <div className="staff-stat-pill">
                {collected} of {HOUSE_COUNT} collected
              </div>
              <div className={"staff-notify-pill" + (notifyActive ? " staff-active" : "")}>
                <BellIcon />
                <span>resident notified · return visit offered</span>
              </div>
            </div>

            <div className="staff-route-stage">
              <div className="staff-ward-tag">{wardTagText}</div>
              <div
                className={"staff-tooltip" + (tooltip.show ? " staff-show" : "")}
                style={{ left: tooltip.left }}
              >
                <span className="staff-dot" />
                <span>no bin out · photo logged from the cab</span>
              </div>

              <div className="staff-houses" ref={housesRowRef}>
                {houses.map((status, i) => (
                  <div
                    key={i}
                    ref={(el) => (houseRefs.current[i] = el)}
                    className={"staff-house " + status}
                  >
                    <div className="staff-house-roof" />
                    <div className="staff-house-body">
                      <div className="staff-house-window" />
                    </div>
                    <div className="staff-bin">
                      <CheckIcon />
                    </div>
                  </div>
                ))}
              </div>
              <div className="staff-road" />
              <div className="staff-truck" style={{ left: truckLeft }}>
                <TruckSVG spinning={truckIdx >= 0} />
              </div>
            </div>
          </div>
        </section>

        <section
          className={"staff-wards-section" + (wardsInView ? " staff-in-view" : "")}
          ref={wardsSectionRef}
        >
          <div className="staff-wards-head">
            <div>
              <h2>Your wards</h2>
              <p>Pick a ward to see today's round, live.</p>
            </div>
            <div className="staff-nav-arrows">
              <button className="staff-arrow-btn" onClick={() => scrollWards(-1)} disabled={!arrows.prev} aria-label="Previous">
                <ChevronLeft />
              </button>
              <button className="staff-arrow-btn" onClick={() => scrollWards(1)} disabled={!arrows.next} aria-label="Next">
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="staff-wards-track" ref={wardsTrackRef} onScroll={updateArrows}>
            {WARD_DATA.map((w, i) => (
              <div
                key={w.code}
                className={"staff-ward-card" + (activeWard === i ? " staff-active" : "")}
                onClick={() => selectWard(i)}
              >
                <div className="staff-ward-pin">
                  <PinIcon />
                </div>
                <div className="staff-ward-illustration" />
                <div className="staff-ward-name">
                  {w.name} — {w.code}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className={"staff-overlay" + (drawerOpen ? " staff-show" : "")} onClick={() => setDrawerOpen(false)} />
      <div className={"staff-drawer" + (drawerOpen ? " staff-show" : "")}>
        <div className="staff-drawer-head">
          <div className="staff-avatar">{userName.charAt(0).toUpperCase()}</div>
          <div className="staff-who">
            <h3>{userName}</h3>
            <p>
              {userRole} · Ward {WARD_DATA[activeWard].code.replace("W", "")} ({WARD_DATA[activeWard].name})
            </p>
          </div>
          <button className="staff-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* REWARD SUMMARY CARD IN PROFILE DRAWER */}
        <div
          style={{
            margin: "12px 18px",
            padding: "14px 16px",
            background: "linear-gradient(135deg, var(--panel) 0%, #fff 100%)",
            borderRadius: "16px",
            border: "1.5px solid var(--mint-3)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            cursor: "pointer",
          }}
          onClick={openRewards}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--green-deep)" }}>
              ★ Rewards & Bottles
            </span>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
              🍼 {rewardsSummary.total_bottles} Bottles
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)", lineHeight: 1.1 }}>
                {rewardsSummary.total_earned_points}
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--muted)", marginLeft: "4px" }}>Points</span>
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--muted)", marginTop: "2px" }}>
                Active: {rewardsSummary.active_points} · Claimed: {rewardsSummary.claimed_points}
              </div>
            </div>
            <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: 600 }}>
              View & Claim &rarr;
            </span>
          </div>
        </div>

        <div className="staff-drawer-menu">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key || item.label}
              className={"staff-menu-item" + (item.active ? " staff-active" : "")}
              onClick={() => handleMenuClick(item.key)}
            >
              <span className="staff-ic">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
        <div className="staff-drawer-divider" />
        <div className="staff-drawer-foot">
          <button className="staff-menu-item" onClick={handleLogout}>
            <span className="staff-ic">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Log out
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* LIVE PICKUP STATUS MODAL */}
      {/* ============================================================ */}
      {trackingOpen && (
        <div className="ep-modal-overlay" onClick={() => setTrackingOpen(false)}>
          <div className="ep-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ep-modal-head">
              <div className="ep-modal-title-area">
                <h2>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="var(--green)" strokeWidth="2.2" />
                    <path d="M12 7v5l3.5 2" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                  Live Pickup Status
                </h2>
                <p>Real-time tracking for your active municipal waste collection request</p>
              </div>
              <div className="ep-modal-actions">
                <button
                  className="ep-modal-refresh-btn"
                  onClick={fetchLatestPickup}
                  disabled={loadingTracking}
                  title="Refresh tracking status"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ animation: loadingTracking ? "staffSpin 1s linear infinite" : "none" }}
                  >
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {loadingTracking ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  className="ep-modal-close-btn"
                  onClick={() => setTrackingOpen(false)}
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="ep-modal-body">
              {loadingTracking && !latestPickup ? (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <div style={{ width: 36, height: 36, border: "3px solid var(--mint-3)", borderTopColor: "var(--green)", borderRadius: "50%", margin: "0 auto 16px", animation: "staffSpin 1s linear infinite" }} />
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>Checking active pickup request...</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>Connecting to EcoPulse dispatch system</div>
                </div>
              ) : trackingError ? (
                <div style={{ textAlign: "center", padding: "36px 20px", background: "#fef2f2", borderRadius: 16, border: "1px solid #fecaca" }}>
                  <div style={{ color: "#b91c1c", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Unable to load pickup status</div>
                  <div style={{ color: "#7f1d1d", fontSize: 13, marginBottom: 16 }}>{trackingError}</div>
                  <button
                    className="staff-btn staff-btn-solid"
                    onClick={fetchLatestPickup}
                  >
                    Try Again
                  </button>
                </div>
              ) : !hasPickup || !latestPickup ? (
                <div style={{ textAlign: "center", padding: "56px 20px" }}>
                  <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--panel)", border: "1px solid var(--mint-3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", color: "var(--green-deep)" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>No active pickup request found.</h3>
                  <p style={{ fontSize: 13.5, color: "var(--muted)", maxWidth: 440, margin: "0 auto 22px", lineHeight: 1.5 }}>
                    You currently do not have an active or pending waste collection request in the queue.
                  </p>
                  <button
                    className="staff-btn staff-btn-solid"
                    onClick={() => { setTrackingOpen(false); setShowPickupInstructions(true); }}
                  >
                    Create New Pickup Request
                  </button>
                </div>
              ) : (
                <div>
                  {/* Latest Request Overview Card */}
                  <div className="ep-track-overview-card">
                    <div className="ep-track-header-row">
                      <div className="ep-track-id-badge">
                        <span className="ep-track-id-pill">Pickup #{latestPickup.request_id}</span>
                        <span style={{ fontSize: 13.5, color: "var(--muted)" }}>
                          • {latestPickup.date || "Today"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {(latestPickup.status === "PENDING" || latestPickup.status === "ASSIGNED") && (
                          <button
                            type="button"
                            className="staff-btn"
                            style={{
                              background: "#ffffff",
                              border: "1.5px solid #f87171",
                              color: "#dc2626",
                              fontSize: "12px",
                              padding: "4px 12px",
                              borderRadius: "8px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              transition: "all .15s ease",
                            }}
                            onClick={() => {
                              setCancelError("");
                              setConfirmCancelOpen(true);
                            }}
                            title="Cancel this pickup request before staff starts collection"
                          >
                            ✕ Cancel Request
                          </button>
                        )}
                        <span
                          className={
                            "ep-badge-status " +
                            (latestPickup.status === "PENDING"
                              ? "ep-badge-pending"
                              : latestPickup.status === "ASSIGNED"
                              ? "ep-badge-assigned"
                              : latestPickup.status === "IN_PROGRESS"
                              ? "ep-badge-inprogress"
                              : latestPickup.status === "COLLECTED"
                              ? "ep-badge-collected"
                              : latestPickup.status === "COMPLETED"
                              ? "ep-badge-completed"
                              : "ep-badge-cancelled")
                          }
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              background: "currentColor",
                            }}
                          />
                          {latestPickup.status === "IN_PROGRESS" ? "In Progress" : latestPickup.status}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Fields Grid */}
                    <div className="ep-track-grid">
                      <div className="ep-track-field">
                        <div className="ep-track-icon-box">🏷️</div>
                        <div>
                          <div className="ep-track-label">AI Waste Type</div>
                          <div className="ep-track-value">
                            {latestPickup.waste_type || "N/A"}
                          </div>
                        </div>
                      </div>

                      <div className="ep-track-field">
                        <div className="ep-track-icon-box">🎯</div>
                        <div>
                          <div className="ep-track-label">Detection Confidence</div>
                          <div className="ep-track-value">
                            {latestPickup.ai_confidence !== null && latestPickup.ai_confidence !== undefined
                              ? `${latestPickup.ai_confidence}%`
                              : latestPickup.images?.[0]?.confidence
                              ? `${Math.round(latestPickup.images[0].confidence * 100)}%`
                              : "Verified"}
                          </div>
                        </div>
                      </div>

                      <div className="ep-track-field">
                        <div className="ep-track-icon-box">📍</div>
                        <div>
                          <div className="ep-track-label">Pickup Location</div>
                          <div className="ep-track-value">
                            {latestPickup.pickup_location || "N/A"}
                            {latestPickup.ward && (
                              <span style={{ color: "var(--green-deep)", marginLeft: 6, fontWeight: 700 }}>
                                ({latestPickup.ward})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="ep-track-field">
                        <div className="ep-track-icon-box">📅</div>
                        <div>
                          <div className="ep-track-label">Request Date</div>
                          <div className="ep-track-value">{latestPickup.date || "N/A"}</div>
                        </div>
                      </div>

                      {latestPickup.scheduled_pickup_date && (
                        <div className="ep-track-field">
                          <div className="ep-track-icon-box">🗓️</div>
                          <div>
                            <div className="ep-track-label">Scheduled Pickup Date</div>
                            <div className="ep-track-value" style={{ fontWeight: 700, color: "var(--green-deep)" }}>
                              {(() => {
                                const p = String(latestPickup.scheduled_pickup_date).slice(0, 10).split("-");
                                return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : latestPickup.scheduled_pickup_date;
                              })()}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="ep-track-field">
                        <div className="ep-track-icon-box">👷</div>
                        <div>
                          <div className="ep-track-label">Assigned Field Staff</div>
                          <div className="ep-track-value" style={{ color: latestPickup.assigned_staff ? "var(--green-deep)" : "var(--muted)" }}>
                            {latestPickup.assigned_staff || "Not yet assigned"}
                          </div>
                        </div>
                      </div>

                      <div className="ep-track-field">
                        <div className="ep-track-icon-box">⚡</div>
                        <div>
                          <div className="ep-track-label">Current Status</div>
                          <div className="ep-track-value" style={{ fontWeight: 700 }}>
                            {latestPickup.status}
                          </div>
                        </div>
                      </div>

                      {/* Payment Status Summary */}
                      {(latestPickup.status === "COMPLETED" || latestPickup.has_paid) && (
                        <div className="ep-track-field" style={{ gridColumn: "1 / -1", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px 16px", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 20 }}>💳</span>
                            <div>
                              <div className="ep-track-label" style={{ color: "#065f46" }}>Collection Payment Fee</div>
                              <div style={{ fontWeight: 700, color: "#0f241a", fontSize: 13.5 }}>
                                Amount: <strong>₹50</strong> &bull; Status:{" "}
                                {latestPickup.has_paid || latestPickup.payment_status === "COMPLETED" ? (
                                  <span style={{ color: "#16a34a" }}>Completed</span>
                                ) : (
                                  <span style={{ color: "#d97706" }}>Pending</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {latestPickup.has_paid || latestPickup.payment_status === "COMPLETED" ? (
                            <button
                              type="button"
                              className="staff-btn staff-btn-ghost"
                              style={{ fontSize: 12, padding: "5px 12px", background: "#ffffff", borderColor: "#86efac", color: "#15803d" }}
                              onClick={() => setReceiptPayment({
                                pickup_id: latestPickup.request_id || latestPickup.id,
                                pickup_request: latestPickup.request_id || latestPickup.id,
                                user_name: user?.name || user?.username,
                                user_phone: user?.phone,
                                ward: latestPickup.ward,
                                pickup_location: latestPickup.pickup_location,
                                waste_type: latestPickup.waste_type,
                                completed_weight: latestPickup.estimated_weight,
                                assigned_staff_name: latestPickup.assigned_staff,
                                amount: 50.0,
                                payment_status: "COMPLETED",
                                payment_id: latestPickup.payment_id,
                                transaction_id: latestPickup.transaction_id,
                                payment_date: latestPickup.payment_date,
                              })}
                            >
                              <Receipt size={14} />
                              View Receipt
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="staff-btn staff-btn-solid"
                              style={{ fontSize: 12, padding: "6px 14px", background: "#10b981" }}
                              onClick={() => navigate(`/payment/${latestPickup.request_id || latestPickup.id}`)}
                            >
                              Pay ₹50 →
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Uploaded waste image thumbnail or completion proof */}
                    {(latestPickup.images?.length > 0 || latestPickup.completion_image) && (
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--line)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                        {latestPickup.images?.[0]?.image && (
                          <button
                            type="button"
                            className="ep-image-thumb-btn"
                            onClick={() => setPreviewImage(getFullImageUrl(latestPickup.images[0].image))}
                            title="Click to view submitted waste photo"
                          >
                            <img
                              src={getFullImageUrl(latestPickup.images[0].image)}
                              alt="Submitted waste"
                              className="ep-thumb-img"
                            />
                            <span>View Submitted Waste Photo</span>
                          </button>
                        )}
                        {latestPickup.completion_image && (
                          <button
                            type="button"
                            className="ep-image-thumb-btn"
                            onClick={() => setPreviewImage(getFullImageUrl(latestPickup.completion_image))}
                            title="Click to view completion proof photo"
                          >
                            <img
                              src={getFullImageUrl(latestPickup.completion_image)}
                              alt="Completion proof"
                              className="ep-thumb-img"
                            />
                            <span>View Completion Proof</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress Timeline / Tracker */}
                  <div className="ep-timeline-section">
                    <div className="ep-timeline-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Pickup Progress Timeline
                    </div>

                    <div className="ep-timeline">
                      {getTimelineStages(latestPickup).map((step, idx) => (
                        <div key={idx} className={`ep-timeline-step ${step.state}`}>
                          <div className="ep-timeline-rail" />
                          <div className="ep-timeline-marker">
                            {step.state === "completed" ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            ) : step.state === "cancelled" ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            ) : (
                              step.icon
                            )}
                          </div>
                          <div className="ep-timeline-content">
                            <div className="ep-timeline-head">
                              <div className="ep-timeline-name">{step.title}</div>
                              <span className="ep-timeline-state-pill">
                                {step.state === "completed"
                                  ? "Completed"
                                  : step.state === "current"
                                  ? "In Progress"
                                  : step.state === "cancelled"
                                  ? "Cancelled"
                                  : "Pending"}
                              </span>
                            </div>
                            <div className="ep-timeline-desc">{step.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CANCEL PICKUP CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {confirmCancelOpen && latestPickup && (
        <div
          className="ep-modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => !cancelling && setConfirmCancelOpen(false)}
        >
          <div
            className="ep-modal-card"
            style={{ maxWidth: 480, overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="ep-modal-head"
              style={{
                background: "#fef2f2",
                borderBottom: "1px solid #fee2e2",
              }}
            >
              <div className="ep-modal-title-area">
                <h2 style={{ color: "#991b1b" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#dc2626" strokeWidth="2.2" />
                    <line x1="15" y1="9" x2="9" y2="15" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="9" y1="9" x2="15" y2="15" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                  Cancel Pickup Request
                </h2>
                <p style={{ color: "#7f1d1d" }}>
                  Confirmation required for Pickup #{latestPickup.request_id || latestPickup.id}
                </p>
              </div>
              <button
                className="ep-modal-close-btn"
                onClick={() => setConfirmCancelOpen(false)}
                disabled={cancelling}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="ep-modal-body" style={{ padding: "24px 26px" }}>
              {cancelError && (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 10,
                    color: "#991b1b",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 16,
                  }}
                >
                  {cancelError}
                </div>
              )}

              <p style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.55, margin: "0 0 16px" }}>
                Are you sure you want to cancel your waste pickup request? Once cancelled:
              </p>

              <ul style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 22px 20px", lineHeight: 1.6 }}>
                <li>Field staff will not be dispatched to your location.</li>
                <li>Your request status will immediately change to <strong>Cancelled</strong>.</li>
                <li>This request will be preserved in your pickup history for your records.</li>
              </ul>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
                  className="staff-btn staff-btn-ghost"
                  onClick={() => setConfirmCancelOpen(false)}
                  disabled={cancelling}
                  style={{ padding: "8px 18px", fontSize: 13 }}
                >
                  Keep Request
                </button>
                <button
                  type="button"
                  className="staff-btn"
                  style={{
                    background: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 20px",
                    fontSize: 13,
                    fontWeight: 700,
                    borderRadius: 10,
                    cursor: cancelling ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 6px rgba(220, 38, 38, 0.25)",
                  }}
                  onClick={handleCancelPickup}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* USER PICKUP / ROUTE HISTORY MODAL */}
      {/* ============================================================ */}
      {historyOpen && (
        <div className="ep-modal-overlay" onClick={() => setHistoryOpen(false)}>
          <div className="ep-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ep-modal-head">
              <div className="ep-modal-title-area">
                <h2>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Pickup History
                </h2>
                <p>Permanent records of your completed waste collections & route pickups</p>
              </div>
              <div className="ep-modal-actions">
                <button
                  className="ep-modal-refresh-btn"
                  onClick={fetchUserHistory}
                  disabled={loadingHistory}
                  title="Refresh history"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ animation: loadingHistory ? "staffSpin 1s linear infinite" : "none" }}
                  >
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {loadingHistory ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  className="ep-modal-close-btn"
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="ep-modal-body">
              {loadingHistory && historyRecords.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <div style={{ width: 36, height: 36, border: "3px solid var(--mint-3)", borderTopColor: "var(--green)", borderRadius: "50%", margin: "0 auto 16px", animation: "staffSpin 1s linear infinite" }} />
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>Loading your pickup history...</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>Retrieving verified collection records</div>
                </div>
              ) : historyError ? (
                <div style={{ textAlign: "center", padding: "36px 20px", background: "#fef2f2", borderRadius: 16, border: "1px solid #fecaca" }}>
                  <div style={{ color: "#b91c1c", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Unable to load history</div>
                  <div style={{ color: "#7f1d1d", fontSize: 13, marginBottom: 16 }}>{historyError}</div>
                  <button
                    className="staff-btn staff-btn-solid"
                    onClick={fetchUserHistory}
                  >
                    Try Again
                  </button>
                </div>
              ) : historyRecords.length === 0 ? (
                <div style={{ textAlign: "center", padding: "56px 20px" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--panel)", border: "1px solid var(--mint-3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--green-deep)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>No Completed Pickups Yet</h3>
                  <p style={{ fontSize: 13.5, color: "var(--muted)", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.5 }}>
                    When field staff completes your waste pickup request with weight verification and image proof, it will appear here permanently.
                  </p>
                  <button
                    className="staff-btn staff-btn-solid"
                    onClick={() => { setHistoryOpen(false); setShowPickupInstructions(true); }}
                  >
                    Create New Pickup Request
                  </button>
                </div>
              ) : (
                <div>
                  {Object.entries(groupedHistory).map(([dateLabel, items]) => (
                    <div key={dateLabel} className="ep-date-group">
                      <div className="ep-date-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <span>{dateLabel}</span>
                        <span style={{ opacity: 0.65, fontWeight: 500 }}>({items.length} {items.length === 1 ? "pickup" : "pickups"})</span>
                      </div>

                      <div className="ep-history-grid">
                        {items.map((item) => (
                          <div key={item.request_id} className="ep-history-card">
                            <div className="ep-card-top">
                              <div className="ep-req-id">
                                <span className="ep-req-pill">Pickup #{item.request_id}</span>
                                <span
                                  className="ep-status-pill"
                                  style={
                                    item.status === "CANCELLED"
                                      ? { background: "#fee2e2", color: "#991b1b" }
                                      : {}
                                  }
                                >
                                  {item.status === "CANCELLED" ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                  ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                  {item.status}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span className="ep-waste-type-pill">
                                  AI Type: <b>{item.waste_type || "Waste"}</b>
                                </span>
                              </div>
                            </div>

                            <div className="ep-card-details">
                              <div className="ep-detail-item">
                                <span className="ep-detail-icon">📍</span>
                                <div>
                                  <b>Location:</b> {item.pickup_location || "N/A"}
                                  {item.ward && <span style={{ color: "var(--green-deep)", marginLeft: 6 }}>({item.ward})</span>}
                                </div>
                              </div>

                              <div className="ep-detail-item">
                                <span className="ep-detail-icon">⚖️</span>
                                <div>
                                  <b>Weight:</b>{" "}
                                  <span style={{ color: "var(--green-deep)", fontWeight: 700, fontSize: 13.5 }}>
                                    {item.estimated_weight ? `${item.estimated_weight} kg` : "N/A"}
                                  </span>
                                </div>
                              </div>

                              <div className="ep-detail-item">
                                <span className="ep-detail-icon">🕒</span>
                                <div>
                                  <b>Completed:</b> {item.completed_time ? `${item.completed_time}` : (item.completed_at || item.date)}
                                </div>
                              </div>

                              {item.assigned_staff && (
                                <div className="ep-detail-item">
                                  <span className="ep-detail-icon">👷</span>
                                  <div>
                                    <b>Field Staff:</b> {item.assigned_staff}
                                  </div>
                                </div>
                              )}

                              <div className="ep-detail-item">
                                <span className="ep-detail-icon">💳</span>
                                <div>
                                  <b>Payment:</b>{" "}
                                  {item.has_paid || item.payment_status === "COMPLETED" ? (
                                    <span style={{ color: "#16a34a", fontWeight: 700 }}>
                                      Completed (₹50)
                                    </span>
                                  ) : (
                                    <span style={{ color: "#d97706", fontWeight: 700 }}>
                                      Pending (₹50)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="ep-card-media" style={{ justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                {item.completion_image ? (
                                  <button
                                    type="button"
                                    className="ep-image-thumb-btn"
                                    onClick={() => setPreviewImage(item.completion_image)}
                                    title="Click to view completion photo proof"
                                  >
                                    <img
                                      src={item.completion_image}
                                      alt={`Pickup #${item.request_id} completion proof`}
                                      className="ep-thumb-img"
                                    />
                                    <span>View Completion Proof</span>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                      <path d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  </button>
                                ) : (
                                  <span style={{ fontSize: 12, color: "var(--muted)" }}>No completion image</span>
                                )}
                              </div>

                              <div>
                                {item.has_paid || item.payment_status === "COMPLETED" ? (
                                  <button
                                    type="button"
                                    className="staff-btn staff-btn-ghost"
                                    style={{ fontSize: 12, padding: "6px 12px", borderColor: "#86efac", color: "#15803d", background: "#f0fdf4", display: "inline-flex", alignItems: "center", gap: 5 }}
                                    onClick={() => setReceiptPayment({
                                      pickup_id: item.request_id,
                                      pickup_request: item.request_id,
                                      user_name: user?.name || user?.username,
                                      user_phone: user?.phone,
                                      ward: item.ward,
                                      pickup_location: item.pickup_location,
                                      waste_type: item.waste_type,
                                      completed_weight: item.estimated_weight,
                                      assigned_staff_name: item.assigned_staff,
                                      amount: 50.0,
                                      payment_status: "COMPLETED",
                                      payment_id: item.payment_id,
                                      transaction_id: item.transaction_id,
                                      payment_date: item.payment_date,
                                    })}
                                  >
                                    <Receipt size={13} />
                                    View Receipt
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="staff-btn staff-btn-solid"
                                    style={{ fontSize: 12, padding: "6px 16px", background: "#10b981" }}
                                    onClick={() => navigate(`/payment/${item.request_id}`)}
                                  >
                                    Pay ₹50 →
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PUBLIC COMPLAINT QUEUE MODAL */}
      {/* ============================================================ */}
      {complaintsOpen && (
        <div className="ep-modal-overlay" onClick={() => setComplaintsOpen(false)}>
          <div className="ep-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ep-modal-head">
              <div className="ep-modal-title-area">
                <h2>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M4 5h16v11H8l-4 4V5z" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  My Complaint Queue
                </h2>
                <p>Track status and verified clearing proof for your reported waste complaints</p>
              </div>
              <div className="ep-modal-actions">
                <button
                  className="ep-modal-refresh-btn"
                  onClick={fetchUserComplaints}
                  disabled={loadingComplaints}
                  title="Refresh complaints"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ animation: loadingComplaints ? "staffSpin 1s linear infinite" : "none" }}
                  >
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {loadingComplaints ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  className="ep-modal-close-btn"
                  onClick={() => setComplaintsOpen(false)}
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="ep-modal-body">
              {loadingComplaints && userComplaints.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <div style={{ width: 36, height: 36, border: "3px solid var(--mint-3)", borderTopColor: "var(--green)", borderRadius: "50%", margin: "0 auto 16px", animation: "staffSpin 1s linear infinite" }} />
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>Loading your complaints...</div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>Checking municipal grievance system</div>
                </div>
              ) : complaintsError ? (
                <div style={{ textAlign: "center", padding: "36px 20px", background: "#fef2f2", borderRadius: 16, border: "1px solid #fecaca" }}>
                  <div style={{ color: "#b91c1c", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Unable to load complaints</div>
                  <div style={{ color: "#7f1d1d", fontSize: 13, marginBottom: 16 }}>{complaintsError}</div>
                  <button
                    className="staff-btn staff-btn-solid"
                    onClick={fetchUserComplaints}
                  >
                    Try Again
                  </button>
                </div>
              ) : userComplaints.length === 0 ? (
                <div style={{ textAlign: "center", padding: "56px 20px" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--panel)", border: "1px solid var(--mint-3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--green-deep)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M4 5h16v11H8l-4 4V5z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>No Complaints In Queue</h3>
                  <p style={{ fontSize: 13.5, color: "var(--muted)", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.5 }}>
                    You have not registered any public waste complaints yet. If you spot dumped waste anywhere in the city, report it for immediate pickup.
                  </p>
                  <button
                    className="staff-btn staff-btn-solid"
                    onClick={() => { setComplaintsOpen(false); navigate("/complaintform"); }}
                  >
                    Report Public Waste
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
                      Showing {userComplaints.length} {userComplaints.length === 1 ? "complaint" : "complaints"}
                    </span>
                    <button
                      className="staff-btn staff-btn-ghost"
                      style={{ fontSize: 12, padding: "5px 12px" }}
                      onClick={() => { setComplaintsOpen(false); navigate("/complaintform"); }}
                    >
                      + Report New Spot
                    </button>
                  </div>

                  <div className="ep-history-grid">
                    {userComplaints.map((c) => (
                      <div
                        key={c.id || c.complaint_id}
                        className="ep-history-card"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedComplaintDetail(c)}
                      >
                        <div className="ep-card-top">
                          <div className="ep-req-id">
                            <span className="ep-req-pill">Complaint #{c.id || c.complaint_id}</span>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                background:
                                  c.priority === "HIGH"
                                    ? "#fee2e2"
                                    : c.priority === "MEDIUM"
                                    ? "#fef3c7"
                                    : "#dcfce7",
                                color:
                                  c.priority === "HIGH"
                                    ? "#dc2626"
                                    : c.priority === "MEDIUM"
                                    ? "#d97706"
                                    : "#16a34a",
                              }}
                            >
                              {c.priority} Priority
                            </span>
                          </div>

                          <div>
                            <span
                              className="ep-status-pill"
                              style={{
                                background:
                                  c.status === "RESOLVED"
                                    ? "#dcfce7"
                                    : c.status === "IN_PROGRESS"
                                    ? "#fef3c7"
                                    : c.status === "ASSIGNED"
                                    ? "#f3e8ff"
                                    : "#eff6ff",
                                color:
                                  c.status === "RESOLVED"
                                    ? "#16a34a"
                                    : c.status === "IN_PROGRESS"
                                    ? "#b45309"
                                    : c.status === "ASSIGNED"
                                    ? "#7e22ce"
                                    : "#1d4ed8",
                              }}
                            >
                              {c.status}
                            </span>
                          </div>
                        </div>

                        <div className="ep-card-details">
                          <div className="ep-detail-item">
                            <span className="ep-detail-icon">📍</span>
                            <div>
                              <b>Location:</b> {c.location_name || "N/A"}
                            </div>
                          </div>

                          <div className="ep-detail-item">
                            <span className="ep-detail-icon">📝</span>
                            <div style={{ color: "var(--muted)", fontSize: 12.5 }}>
                              {c.description}
                            </div>
                          </div>

                          <div className="ep-detail-item">
                            <span className="ep-detail-icon">📅</span>
                            <div>
                              <b>Submitted Date:</b> {c.created_at_formatted || (c.created_at ? new Date(c.created_at).toLocaleDateString() : "-")}
                            </div>
                          </div>

                          {c.assigned_staff_name && (
                            <div className="ep-detail-item">
                              <span className="ep-detail-icon">👷</span>
                              <div>
                                <b>Assigned Staff:</b> {c.assigned_staff_name}
                              </div>
                            </div>
                          )}

                          {c.resolved_at_formatted && (
                            <div className="ep-detail-item">
                              <span className="ep-detail-icon">✅</span>
                              <div style={{ color: "var(--green-deep)", fontWeight: 600 }}>
                                <b>Resolved Date:</b> {c.resolved_at_formatted}
                              </div>
                            </div>
                          )}
                        </div>

                        <div
                          className="ep-card-media"
                          style={{ justifyContent: "space-between", alignItems: "center" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: "flex", gap: 8 }}>
                            {c.image_url || c.image ? (
                              <button
                                type="button"
                                className="ep-image-thumb-btn"
                                onClick={() => setPreviewImage(getFullImageUrl(c.image_url || c.image))}
                                title="Click to view original waste photo"
                              >
                                <img
                                  src={getFullImageUrl(c.image_url || c.image)}
                                  alt="Reported waste"
                                  className="ep-thumb-img"
                                />
                                <span>Waste Photo</span>
                              </button>
                            ) : null}

                            {c.proof_image_url || c.proof_image ? (
                              <button
                                type="button"
                                className="ep-image-thumb-btn"
                                style={{ borderColor: "#86efac", background: "#f0fdf4" }}
                                onClick={() => setPreviewImage(c.proof_image_url || c.proof_image)}
                                title="Click to view waste cleared proof"
                              >
                                <img
                                  src={c.proof_image_url || c.proof_image}
                                  alt="Cleared proof"
                                  className="ep-thumb-img"
                                />
                                <span style={{ color: "#16a34a" }}>Cleared Proof</span>
                              </button>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            className="staff-btn staff-btn-solid"
                            style={{ padding: "6px 14px", fontSize: 12.5 }}
                            onClick={() => setSelectedComplaintDetail(c)}
                          >
                            View Details →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* COMPLAINT DETAIL & PROGRESS MODAL */}
      {/* ============================================================ */}
      {selectedComplaintDetail && (
        <div className="ep-modal-overlay" onClick={() => setSelectedComplaintDetail(null)}>
          <div className="ep-modal-card" style={{ maxWidth: 660 }} onClick={(e) => e.stopPropagation()}>
            <div className="ep-modal-head">
              <div className="ep-modal-title-area">
                <h2>
                  Complaint #{selectedComplaintDetail.id || selectedComplaintDetail.complaint_id} Details
                </h2>
                <p>{selectedComplaintDetail.location_name}</p>
              </div>
              <div className="ep-modal-actions">
                <button
                  className="ep-modal-close-btn"
                  onClick={() => setSelectedComplaintDetail(null)}
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="ep-modal-body">
              {/* STATUS & PRIORITY OVERVIEW */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#f6fbf8",
                  border: "1px solid var(--mint-3)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Assigned Priority
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: selectedComplaintDetail.priority === "HIGH" ? "#dc2626" : selectedComplaintDetail.priority === "MEDIUM" ? "#d97706" : "#16a34a" }}>
                    {selectedComplaintDetail.priority} PRIORITY
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Current Status
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: "var(--green-deep)" }}>
                    {selectedComplaintDetail.status}
                  </div>
                </div>

                {selectedComplaintDetail.assigned_staff_name && (
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                      Assigned Field Staff
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2, color: "var(--ink)" }}>
                      {selectedComplaintDetail.assigned_staff_name}
                    </div>
                  </div>
                )}
              </div>

              {/* DETAILS GRID */}
              <div
                style={{
                  background: "#fafafa",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 20,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px 16px",
                  fontSize: 13,
                }}
              >
                <div>
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>Location:</span>{" "}
                  <b>{selectedComplaintDetail.location_name || "N/A"}</b>
                </div>

                {selectedComplaintDetail.latitude && selectedComplaintDetail.longitude && (
                  <div>
                    <span style={{ color: "var(--muted)", fontWeight: 600 }}>Coordinates:</span>{" "}
                    <b>{selectedComplaintDetail.latitude}, {selectedComplaintDetail.longitude}</b>
                  </div>
                )}

                <div>
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>Submitted Date:</span>{" "}
                  <b>{selectedComplaintDetail.created_at_formatted || (selectedComplaintDetail.created_at ? new Date(selectedComplaintDetail.created_at).toLocaleDateString() : "-")}</b>
                </div>

                {selectedComplaintDetail.resolved_at_formatted && (
                  <div>
                    <span style={{ color: "var(--muted)", fontWeight: 600 }}>Resolved Date:</span>{" "}
                    <b style={{ color: "var(--green-deep)" }}>{selectedComplaintDetail.resolved_at_formatted}</b>
                  </div>
                )}

                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>Description:</span>{" "}
                  <span>{selectedComplaintDetail.description || "No description provided."}</span>
                </div>
              </div>

              {/* PROGRESS TIMELINE */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>⏳ Complaint Resolution Timeline</span>
                </div>

                {[
                  {
                    title: "COMPLAINT SUBMITTED",
                    desc: `Registered on ${selectedComplaintDetail.created_at_formatted || "System"}`,
                    done: true,
                    statusText: "● NEW",
                  },
                  {
                    title: "ASSIGNED TO STAFF",
                    desc: selectedComplaintDetail.assigned_staff_name
                      ? `Assigned to field staff: ${selectedComplaintDetail.assigned_staff_name}`
                      : "Awaiting staff assignment by municipal office",
                    done: ["ASSIGNED", "IN_PROGRESS", "RESOLVED"].includes(selectedComplaintDetail.status),
                    statusText: "● ASSIGNED",
                  },
                  {
                    title: "IN PROGRESS",
                    desc: ["IN_PROGRESS", "RESOLVED"].includes(selectedComplaintDetail.status)
                      ? "Field staff dispatched to location"
                      : "Pending work commencement",
                    done: ["IN_PROGRESS", "RESOLVED"].includes(selectedComplaintDetail.status),
                    statusText: "● IN PROGRESS",
                  },
                  {
                    title: "RESOLVED",
                    desc: selectedComplaintDetail.status === "RESOLVED"
                      ? `Waste cleared and verified on ${selectedComplaintDetail.resolved_at_formatted || "Completion"}`
                      : "Proof of clearing pending",
                    done: selectedComplaintDetail.status === "RESOLVED",
                    statusText: "● RESOLVED",
                  },
                ].map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      gap: 14,
                      position: "relative",
                      paddingBottom: idx === 3 ? 0 : 18,
                    }}
                  >
                    {idx < 3 && (
                      <div
                        style={{
                          position: "absolute",
                          left: 12,
                          top: 24,
                          bottom: 0,
                          width: 2,
                          background: step.done ? "var(--green)" : "var(--mint-3)",
                        }}
                      />
                    )}
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: step.done ? "var(--green)" : "#e5e7eb",
                        color: step.done ? "#ffffff" : "#9ca3af",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        zIndex: 1,
                        flexShrink: 0,
                      }}
                    >
                      {step.done ? "✓" : idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: step.done ? "var(--ink)" : "var(--muted)" }}>
                          {step.title}
                        </div>
                        {selectedComplaintDetail.status === step.statusText.replace("● ", "") && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green-deep)", background: "#dcfce7", padding: "2px 8px", borderRadius: 8 }}>
                            Current Stage
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PHOTOS COMPARISON: ORIGINAL VS PROOF */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
                  📸 Photographic Proof Records
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {/* Original Waste Photo */}
                  <div
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
                      Original Reported Waste
                    </div>
                    {selectedComplaintDetail.image_url || selectedComplaintDetail.image ? (
                      <img
                        src={getFullImageUrl(selectedComplaintDetail.image_url || selectedComplaintDetail.image)}
                        alt="Original Waste"
                        onClick={() => setPreviewImage(getFullImageUrl(selectedComplaintDetail.image_url || selectedComplaintDetail.image))}
                        style={{
                          width: "100%",
                          height: 140,
                          objectFit: "cover",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                        title="Click to zoom"
                      />
                    ) : (
                      <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 12 }}>
                        No image uploaded
                      </div>
                    )}
                  </div>

                  {/* Staff Waste Cleared Proof */}
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: 12,
                      padding: 12,
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 8 }}>
                      Staff Cleared Proof Photo
                    </div>
                    {selectedComplaintDetail.proof_image_url || selectedComplaintDetail.proof_image ? (
                      <img
                        src={getFullImageUrl(selectedComplaintDetail.proof_image_url || selectedComplaintDetail.proof_image)}
                        alt="Cleared Waste Proof"
                        onClick={() => setPreviewImage(getFullImageUrl(selectedComplaintDetail.proof_image_url || selectedComplaintDetail.proof_image))}
                        style={{
                          width: "100%",
                          height: 140,
                          objectFit: "cover",
                          borderRadius: 8,
                          cursor: "pointer",
                          border: "1px solid #86efac",
                        }}
                        title="Click to zoom"
                      />
                    ) : (
                      <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 12 }}>
                        {selectedComplaintDetail.status === "RESOLVED"
                          ? "Waste marked cleared"
                          : "Pending staff cleanup"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* COMPLETION IMAGE LIGHTBOX */}
      {/* ============================================================ */}
      {previewImage && (
        <div className="ep-lightbox" onClick={() => setPreviewImage(null)}>
          <div className="ep-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Completion Proof Full View" className="ep-lightbox-img" />
            <div className="ep-lightbox-foot">
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Photographic Record View</span>
              <button
                className="staff-btn staff-btn-solid"
                style={{ padding: "6px 14px", fontSize: 12.5 }}
                onClick={() => setPreviewImage(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* RECEIPT MODAL */}
      {/* ============================================================ */}
      {receiptPayment && (
        <PaymentReceiptModal
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {/* ============================================================ */}
      {/* REWARD RULES & GUIDELINES POPUP */}
      {/* ============================================================ */}
      {showRewardRulesModal && (
        <div className="ep-modal-overlay" onClick={() => setShowRewardRulesModal(false)}>
          <div
            className="ep-modal-card"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ep-modal-head">
              <div className="ep-modal-title-area">
                <h2>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="7"></circle>
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                  </svg>
                  Reward Rules & Guidelines
                </h2>
                <p>Please review the terms before submitting your photo for rewards</p>
              </div>
              <button
                className="ep-modal-close-btn"
                onClick={() => setShowRewardRulesModal(false)}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="ep-modal-body" style={{ padding: "24px 28px" }}>
              <div style={{
                background: "var(--panel)",
                border: "1px solid var(--mint-3)",
                borderRadius: "14px",
                padding: "16px 20px",
                marginBottom: "20px"
              }}>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--green-deep)", fontWeight: 600, lineHeight: 1.5 }}>
                  Ensure your submitted photo accurately demonstrates genuine waste segregation or clean-up activity.
                </p>
              </div>

              <ol style={{
                margin: 0,
                paddingLeft: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                fontSize: "14px",
                color: "var(--ink)",
                lineHeight: 1.55
              }}>
                <li>Upload a clear and genuine photo.</li>
                <li>The uploaded photo must be related to the waste-management/reward activity.</li>
                <li>Do not upload unrelated, duplicate, or inappropriate images.</li>
                <li>The uploaded photo will be reviewed by the administrator.</li>
                <li>Reward eligibility will be decided after admin verification.</li>
                <li>Only submit valid photos.</li>
              </ol>

              <div style={{ marginTop: "28px", display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="staff-btn staff-btn-solid"
                  style={{ minWidth: "120px", padding: "11px 24px", fontSize: "14px" }}
                  onClick={() => {
                    setShowRewardRulesModal(false);
                    navigate("/reward-submission");
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MY REWARDS & BOTTLES MODAL */}
      {/* ============================================================ */}
      {rewardsOpen && (
        <div className="ep-modal-overlay" onClick={() => setRewardsOpen(false)}>
          <div
            className="ep-modal-card"
            style={{ maxWidth: "820px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ep-modal-head">
              <div className="ep-modal-title-area">
                <h2>
                  <Award size={22} color="var(--green)" />
                  My Rewards & Bottles
                </h2>
                <p>Municipal reward points, 30-day validity tracking, and claimed vouchers</p>
              </div>
              <div className="ep-modal-actions">
                <button
                  className="ep-modal-refresh-btn"
                  onClick={fetchUserRewards}
                  disabled={loadingRewards}
                  title="Refresh rewards"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{ animation: loadingRewards ? "staffSpin 1s linear infinite" : "none" }}
                  >
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {loadingRewards ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  className="ep-modal-close-btn"
                  onClick={() => setRewardsOpen(false)}
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="ep-modal-body" style={{ padding: "20px 24px" }}>
              {claimSuccess && (
                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", fontSize: "13.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✓ {claimSuccess}</span>
                </div>
              )}
              {claimError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", fontSize: "13.5px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>⚠️ {claimError}</span>
                </div>
              )}

              {/* POINTS & BOTTLES OVERVIEW SUMMARY */}
              <div
                style={{
                  background: "linear-gradient(135deg, var(--panel) 0%, #fff 100%)",
                  border: "1.5px solid var(--mint-3)",
                  borderRadius: "18px",
                  padding: "18px 22px",
                  marginBottom: "22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--green-deep)" }}>
                      REWARD SUMMARY
                    </span>
                    <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--ink)", lineHeight: 1.1, marginTop: "4px" }}>
                      {rewardsSummary.total_earned_points}{" "}
                      <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--muted)" }}>Total Points</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>Reward Bottles</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--green-deep)", marginTop: "2px" }}>
                      {"🍼 ".repeat(Math.min(rewardsSummary.total_bottles, 6))}
                      {rewardsSummary.total_bottles > 6 && `+${rewardsSummary.total_bottles - 6} `}
                      ({rewardsSummary.total_bottles} Bottles)
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>1 bottle = 5 points</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "10px",
                    paddingTop: "12px",
                    borderTop: "1px dashed var(--mint-3)",
                  }}
                >
                  <div style={{ background: "#fff", border: "1px solid var(--mint-3)", borderRadius: "12px", padding: "10px 12px" }}>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>Active Points</span>
                    <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--green-deep)" }}>
                      {rewardsSummary.active_points} pts
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>🍼 {rewardsSummary.active_bottles || 0} bottles</span>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "10px 12px" }}>
                    <span style={{ fontSize: "11px", color: "#065f46", fontWeight: 600 }}>Claimed Points</span>
                    <div style={{ fontSize: "17px", fontWeight: 700, color: "#059669" }}>
                      {rewardsSummary.claimed_points} pts
                    </div>
                    <span style={{ fontSize: "11px", color: "#065f46" }}>🍼 {rewardsSummary.claimed_bottles || 0} bottles</span>
                  </div>
                  <div style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: "12px", padding: "10px 12px" }}>
                    <span style={{ fontSize: "11px", color: "#991b1b", fontWeight: 600 }}>Expired Points</span>
                    <div style={{ fontSize: "17px", fontWeight: 700, color: "#dc2626" }}>
                      {rewardsSummary.expired_points} pts
                    </div>
                    <span style={{ fontSize: "11px", color: "#991b1b" }}>🍼 {rewardsSummary.expired_bottles || 0} bottles</span>
                  </div>
                </div>
              </div>

              {/* REWARD HISTORY LIST */}
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)", margin: "0 0 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Individual Reward History</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                    {userRewards.length} Reward{userRewards.length === 1 ? "" : "s"} Assigned
                  </span>
                </h3>

                {loadingRewards && userRewards.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ width: 32, height: 32, border: "3px solid var(--mint-3)", borderTopColor: "var(--green)", borderRadius: "50%", margin: "0 auto 12px", animation: "staffSpin 1s linear infinite" }} />
                    <span style={{ fontSize: "13.5px", color: "var(--muted)" }}>Loading your rewards...</span>
                  </div>
                ) : userRewards.length === 0 ? (
                  /* Empty State */
                  <div style={{ textAlign: "center", padding: "44px 20px", background: "#fbfdfc", borderRadius: "16px", border: "1.5px dashed var(--mint-3)" }}>
                    <Award size={44} color="var(--green)" style={{ opacity: 0.35, marginBottom: "10px" }} />
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                      No rewards assigned yet.
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--muted)", margin: "6px auto 16px", maxWidth: "360px" }}>
                      Submit verified photos of your waste segregation through the Reward button to earn points and bottles!
                    </p>
                    <button
                      className="staff-btn staff-btn-solid"
                      onClick={() => {
                        setRewardsOpen(false);
                        setShowRewardRulesModal(true);
                      }}
                      style={{ fontSize: "13px", padding: "8px 18px" }}
                    >
                      Submit for Reward &rarr;
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {userRewards.map((item) => {
                      const st = item.computed_status || item.status;
                      const daysLeft = calculateDaysRemaining(item.valid_till);
                      const isClaimed = st === "Claimed" || Boolean(item.claimed_at);
                      const isExpired = !isClaimed && (st === "Expired" || daysLeft <= 0);

                      return (
                        <div
                          key={item.id}
                          style={{
                            background: "#fff",
                            border: `1.5px solid ${isClaimed ? "#a7f3d0" : isExpired ? "#fecaca" : "var(--mint-3)"}`,
                            borderRadius: "16px",
                            padding: "16px 18px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--ink)" }}>
                                  Reward #{item.id}
                                </span>
                                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                                  • {item.waste_type || "Waste Management"}
                                </span>
                              </div>
                              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                                Activity Date: {item.date || "N/A"} · Quantity: {item.estimated_quantity ? `${item.estimated_quantity} kg` : "N/A"}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <span
                              style={{
                                fontSize: "11.5px",
                                fontWeight: 700,
                                padding: "3px 10px",
                                borderRadius: "999px",
                                background: isClaimed ? "#ecfdf5" : isExpired ? "#fef2f2" : "var(--panel)",
                                color: isClaimed ? "#065f46" : isExpired ? "#991b1b" : "var(--green-deep)",
                                border: `1px solid ${isClaimed ? "#a7f3d0" : isExpired ? "#fecaca" : "var(--mint-3)"}`,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {isClaimed && <CheckCircle2 size={12} />}
                              {isClaimed ? "Claimed" : isExpired ? "Expired" : "Active"}
                            </span>
                          </div>

                          {/* Points & Bottle Display */}
                          <div
                            style={{
                              background: isClaimed ? "linear-gradient(135deg, #f0fdf4 0%, #fff 100%)" : "linear-gradient(135deg, var(--panel) 0%, #fff 100%)",
                              border: `1px solid ${isClaimed ? "#bbf7d0" : "var(--mint-3)"}`,
                              borderRadius: "12px",
                              padding: "10px 14px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "8px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                              <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>
                                {item.points} Points
                              </span>
                              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--green-deep)" }}>
                                {"🍼 ".repeat(Math.min(item.bottle_count || 1, 6))}
                                {(item.bottle_count || 1) > 6 && `+${(item.bottle_count || 1) - 6} `}
                                ({item.bottle_count || 1} Bottle{(item.bottle_count || 1) === 1 ? "" : "s"})
                              </span>
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                              1 bottle = 5 points
                            </span>
                          </div>

                          {/* Validity & Dates Info */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                              gap: "8px",
                              fontSize: "12px",
                              color: "var(--ink)",
                              paddingTop: "6px",
                            }}
                          >
                            <div>
                              <span style={{ color: "var(--muted)" }}>Valid From: </span>
                              <span style={{ fontWeight: 600 }}>{item.valid_from_formatted ? item.valid_from_formatted.split(" ")[0] : item.valid_from ? new Date(item.valid_from).toLocaleDateString() : "N/A"}</span>
                            </div>
                            <div>
                              <span style={{ color: "var(--muted)" }}>Valid Till: </span>
                              <span style={{ fontWeight: 600 }}>{item.valid_till_formatted ? item.valid_till_formatted.split(" ")[0] : item.valid_till ? new Date(item.valid_till).toLocaleDateString() : "N/A"}</span>
                            </div>
                          </div>

                          {/* Action / Countdown Banner */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "10px",
                              paddingTop: "8px",
                              borderTop: "1px dashed var(--mint-3)",
                            }}
                          >
                            {isClaimed ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#065f46", fontSize: "12.5px", fontWeight: 600 }}>
                                <CheckCircle2 size={15} />
                                <span>Claimed On: {item.claimed_at_formatted || new Date(item.claimed_at).toLocaleString()}</span>
                              </div>
                            ) : isExpired ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#991b1b", fontSize: "12.5px", fontWeight: 600 }}>
                                <span>⚠️ This reward expired and can no longer be claimed.</span>
                              </div>
                            ) : (
                              /* Active Reward with Countdown & Claim Button */
                              <>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--green-deep)", fontSize: "13px", fontWeight: 700 }}>
                                  <Clock size={15} />
                                  <span>{daysLeft} day{daysLeft === 1 ? "" : "s"} remaining</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleClaimReward(item.id)}
                                  disabled={claimingId === item.id}
                                  className="staff-btn staff-btn-solid"
                                  style={{
                                    padding: "8px 18px",
                                    fontSize: "12.5px",
                                    cursor: claimingId === item.id ? "not-allowed" : "pointer",
                                    opacity: claimingId === item.id ? 0.7 : 1,
                                    borderRadius: "8px",
                                  }}
                                >
                                  {claimingId === item.id ? "Claiming..." : "Claim Reward"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PICKUP REQUEST INSTRUCTION MODAL */}
      {/* ============================================================ */}
      <PickupInstructionModal
        isOpen={showPickupInstructions}
        onClose={() => setShowPickupInstructions(false)}
        onConfirm={() => {
          setShowPickupInstructions(false);
          navigate("/pickupform");
        }}
      />

      {/* ============================================================ */}
      {/* LOGOUT CONFIRMATION MODAL */}
      {/* ============================================================ */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}

 