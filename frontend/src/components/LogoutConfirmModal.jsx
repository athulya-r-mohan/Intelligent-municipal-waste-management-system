import React, { useEffect } from "react";
import { LogOut, X, AlertTriangle } from "lucide-react";
import "./LogoutConfirmModal.css";

/**
 * Clean confirmation modal for logging out.
 */
export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ep-logout-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ep-logout-card" onClick={(e) => e.stopPropagation()}>
        <div className="ep-logout-head">
          <div className="ep-logout-icon-wrap">
            <LogOut size={22} className="ep-logout-icon" />
          </div>
          <button className="ep-logout-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="ep-logout-body">
          <h3 className="ep-logout-title">Confirm Logout</h3>
          <p className="ep-logout-desc">
            Are you sure you want to log out of your <strong>EcoPulse</strong> account? You will need to sign in again to access your dashboard.
          </p>
        </div>

        <div className="ep-logout-actions">
          <button type="button" className="ep-logout-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ep-logout-btn-confirm" onClick={onConfirm}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
