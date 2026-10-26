import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import InstructionsContent from "../components/InstructionsContent";
import "../components/userpage.css";
import "../components/Instructions.css";
import { getRoleDashboard, safeNavigateBack } from "../utils/navigation";

const ChevronLeft = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function InstructionsPage() {
  const navigate = useNavigate();

  return (
    <div className="staff-root ep-instruction-page-root">
      {/* SCOPED ECOPULSE HEADER STYLING MATCHING USERPAGE */}
      <style>{`
        .staff-header{
          display:flex; align-items:center; justify-content:space-between; padding:18px 40px;
          background:var(--white, #ffffff); border-bottom:1px solid var(--line, #d7ecdf);
          position:sticky; top:0; z-index:40;
        }
        .staff-header-left{ display:flex; align-items:center; gap:14px; }
        .staff-back-btn{
          width:38px; height:38px; border-radius:50%; border:1px solid var(--mint-3, #c5e8d7);
          background:var(--mint, #e3f5eb); display:flex; align-items:center; justify-content:center;
          color:var(--green, #18a862); transition:transform .18s ease, background .18s ease; cursor:pointer;
        }
        .staff-back-btn:hover{ background:var(--mint-2, #d3eee0); transform:translateX(-2px); }
        .staff-logo-mark{
          width:34px; height:34px; border-radius:10px; background:var(--green, #18a862);
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 6px 14px -6px rgba(12,107,69,.55); cursor:pointer;
        }
        .staff-brand{
          font-size:19px; font-weight:700; color:var(--ink, #0e2419); letter-spacing:-.01em;
          display:flex; gap:5px; cursor:pointer;
        }
        .staff-brand .staff-accent{ color:var(--green, #18a862); }
        .staff-header-right{ display:flex; align-items:center; gap:10px; }
        .staff-btn{
          border-radius:999px; padding:10px 18px; font-size:13.5px; font-weight:600;
          border:1px solid transparent; transition:all .18s ease; white-space:nowrap; cursor:pointer;
        }
        .staff-btn-ghost{
          background:var(--white, #ffffff); border-color:var(--mint-3, #c5e8d7);
          color:var(--green-deep, #0f8a4f);
        }
        .staff-btn-ghost:hover{
          background:var(--mint, #e3f5eb); border-color:var(--green-bright, #2ecb84);
        }
        .staff-btn-solid{
          background:var(--green, #18a862); color:#fff;
        }
        .staff-btn-solid:hover{
          background:var(--green-deep, #0f8a4f); box-shadow:0 8px 18px -8px rgba(12,107,69,.6);
        }
        @media (max-width:720px){
          .staff-header{ padding:14px 18px; }
        }
      `}</style>

      {/* HEADER IDENTICAL TO USERPAGE */}
      <header className="staff-header">
        <div className="staff-header-left">
          <button className="staff-back-btn" onClick={() => safeNavigateBack(navigate, getRoleDashboard())} aria-label="Back">
            <ChevronLeft />
          </button>
          <div
            className="staff-logo-mark"
            onClick={() => navigate(getRoleDashboard())}
            style={{ cursor: "pointer" }}
            title="EcoPulse Dashboard"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M2 12h5l2-6 4 12 2-6h7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div
            className="staff-brand"
            onClick={() => navigate(getRoleDashboard())}
            style={{ cursor: "pointer" }}
            title="EcoPulse Dashboard"
          >
            Eco <span className="staff-accent">Pulse</span>
          </div>
        </div>

        <div className="staff-header-right">
          <NotificationBell />
          <button
            className="staff-btn staff-btn-ghost"
            onClick={() => navigate("/user")}
          >
            track status
          </button>
          <button
            className="staff-btn staff-btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={() => navigate("/user")}
          >
            Reward
          </button>
          <button
            className="staff-btn staff-btn-ghost"
            style={{
              background: "var(--mint, #e3f5eb)",
              borderColor: "var(--green-bright, #2ecb84)",
              color: "var(--green-deep, #0f8a4f)",
              fontWeight: 700,
            }}
          >
            Instructions
          </button>
          <button className="staff-btn staff-btn-solid" onClick={() => navigate("/profile")}>
            my profile
          </button>
        </div>
      </header>

      {/* INSTRUCTIONS CONTENT CONTAINER */}
      <main className="ep-instruction-page-container">
        <div className="ep-instruction-page-card">
          <div className="ep-instruction-page-header">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#eaf7ef", color: "#1e6b4e", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
              <FileText size={14} />
              EcoPulse Resident Guide
            </div>
            <h1>Pickup &amp; Waste Guidelines</h1>
            <p>
              Official guidelines for resident municipal waste photography, AI categorization, and collection scheduling.
            </p>
          </div>

          <InstructionsContent />
        </div>
      </main>
    </div>
  );
}
