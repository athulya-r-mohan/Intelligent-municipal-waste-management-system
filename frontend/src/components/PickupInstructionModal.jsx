import React, { useEffect } from "react";
import { X, Check, FileText } from "lucide-react";
import InstructionsContent from "./InstructionsContent";
import "./Instructions.css";

export default function PickupInstructionModal({ isOpen, onClose, onConfirm }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ep-instruction-modal-overlay" onClick={onClose}>
      <div className="ep-instruction-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="ep-instruction-modal-head">
          <div className="ep-instruction-modal-title">
            <h2>
              <FileText size={20} color="#18a862" />
              Pickup Request Instructions
            </h2>
            <p>Please review these photo and scheduling guidelines before submitting your request</p>
          </div>
          <button className="ep-instruction-modal-close" onClick={onClose} aria-label="Close instructions">
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY (REUSABLE INSTRUCTIONS CONTENT) */}
        <div className="ep-instruction-modal-body">
          <InstructionsContent />
        </div>

        {/* MODAL FOOTER */}
        <div className="ep-instruction-modal-foot">
          <button className="ep-instruction-btn-ok" onClick={onConfirm}>
            <Check size={18} />
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
