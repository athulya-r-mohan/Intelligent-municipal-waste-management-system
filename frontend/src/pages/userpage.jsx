import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../components/userpage.css";

 
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
    label: "Complaint queue",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M4 5h16v11H8l-4 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Payroll",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: "Live tracking",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    active: true,
  },
  { label: "Notifications", icon: <BellIcon /> },
  {
    label: "My profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];
 
export default function EcoPulseStaff() {
   const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeWard, setActiveWard] = useState(0);
  const [houses, setHouses] = useState(Array(HOUSE_COUNT).fill("pending"));
  const [collected, setCollected] = useState(0);
  const [tooltip, setTooltip] = useState({ show: false, left: 0 });
  const [notifyActive, setNotifyActive] = useState(false);
  const [truckLeft, setTruckLeft] = useState(0);
  const [truckIdx, setTruckIdx] = useState(-1);
  const [wardsInView, setWardsInView] = useState(false);
 
  const housesRowRef = useRef(null);
  const houseRefs = useRef([]);
  const wardsTrackRef = useRef(null);
  const wardsSectionRef = useRef(null);
  const trackerRef = useRef(null);
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
 
  const selectWard = (i) => {
    setActiveWard(i);
    trackerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
 
  const wardTagText = `${WARD_DATA[activeWard].name} — Ward ${WARD_DATA[activeWard].code.replace("W", "")}`;
 
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
          padding:12px 20px; border-radius:12px; font-size:14px; font-weight:600; transition:all .18s ease; }
        .staff-action-pill:hover{ background:var(--green); color:#fff; transform:translateY(-2px); box-shadow:var(--shadow); }
        .staff-hero-note{ font-size:13.5px; color:var(--muted); font-style:italic; }
 
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
          <button
            className="staff-btn staff-btn-ghost"
            onClick={() => trackerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
          >
            track status
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
              className="staff-action-pill"
              onClick={() => navigate("/pickupform")}
            >
              pickup request
            </button>
            <button className="staff-action-pill" 
            onClick={() => navigate("/complaintform")}
            >
              complaint</button>
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
          <div className="staff-avatar">R</div>
          <div className="staff-who">
            <h3>Staff Account</h3>
            <p>
              Ward {WARD_DATA[activeWard].code.replace("W", "")} · {WARD_DATA[activeWard].name}
            </p>
          </div>
          <button className="staff-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="staff-drawer-menu">
          {MENU_ITEMS.map((item) => (
            <button key={item.label} className={"staff-menu-item" + (item.active ? " staff-active" : "")}>
              <span className="staff-ic">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
        <div className="staff-drawer-divider" />
        <div className="staff-drawer-foot">
          <button className="staff-menu-item">
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
    </div>
  );
}
 