import React from "react";
import { Camera, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import "./Instructions.css";

export const PHOTO_GUIDELINES = [
  "Make sure the waste is clearly visible.",
  "Do not upload an image where the waste is completely hidden inside a bag or container.",
  "Avoid images containing only the bin/container when the waste itself is not visible.",
  "Upload a clear and well-lit photo.",
  "Place the waste where the camera can see it properly.",
  "If possible, remove the waste from closed/opaque covers or bags before taking the photo.",
  "Avoid blurry or very dark images.",
  "Try not to cover the waste with other objects.",
  "Keep the waste reasonably close to the camera.",
];

export const SCHEDULE_GUIDELINES = [
  "Your waste will be collected within 10 days of submitting the request.",
  "If the waste cannot be collected on the scheduled day, the pickup will be rescheduled to another suitable date.",
];

export default function InstructionsContent() {
  return (
    <div className="ep-instructions-wrapper">
      {/* SECTION 1: PHOTO GUIDELINES */}
      <div className="ep-instructions-section">
        <div className="ep-instructions-section-head">
          <div className="ep-instructions-icon-badge photo-badge">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="ep-instructions-title">WASTE PHOTO GUIDELINES</h3>
            <p className="ep-instructions-subtitle">
              Follow these rules to ensure fast and accurate AI waste classification
            </p>
          </div>
        </div>

        <ul className="ep-instructions-list">
          {PHOTO_GUIDELINES.map((item, idx) => (
            <li key={idx} className="ep-instructions-item">
              <span className="ep-instructions-check">
                <CheckCircle2 size={16} />
              </span>
              <span className="ep-instructions-text">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* SECTION 2: PICKUP SCHEDULE */}
      <div className="ep-instructions-section" style={{ marginTop: "24px" }}>
        <div className="ep-instructions-section-head">
          <div className="ep-instructions-icon-badge schedule-badge">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="ep-instructions-title">PICKUP SCHEDULE</h3>
            <p className="ep-instructions-subtitle">
              Municipal field collection timeline and rescheduling policy
            </p>
          </div>
        </div>

        <ul className="ep-instructions-list schedule-list">
          {SCHEDULE_GUIDELINES.map((item, idx) => (
            <li key={idx} className="ep-instructions-item schedule-item">
              <span className="ep-instructions-check schedule-check">
                <CheckCircle2 size={16} />
              </span>
              <span className="ep-instructions-text">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
