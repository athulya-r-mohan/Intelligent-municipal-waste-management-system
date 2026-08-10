import { useState, useRef } from "react";
import { ChevronDown, Upload, ImageIcon, CheckCircle2, Clock3, Scale } from "lucide-react";
 
export default function TaskStatusUpdate() {
  const [status, setStatus] = useState("Completed");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [weight, setWeight] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);
 
  const statusOptions = [
    { value: "Completed", icon: CheckCircle2 },
    { value: "Pending", icon: Clock3 },
  ];
 
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target.result);
      reader.readAsDataURL(file);
    }
  };
 
  const handleUpdate = () => {
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2200);
  };
 
  const StatusIcon = statusOptions.find((s) => s.value === status)?.icon ?? CheckCircle2;
 
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(180deg, #eef7ef 0%, #ffffff 55%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Eyebrow / title */}
        <div style={{ marginBottom: 20, paddingLeft: 4 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#4c9a5f",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Field Update
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              color: "#1f2e22",
              letterSpacing: "-0.01em",
            }}
          >
            Task Status
          </h1>
        </div>
 
        {/* Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #dcede0",
            borderRadius: 20,
            boxShadow: "0 12px 32px -16px rgba(44, 110, 66, 0.25)",
            overflow: "visible",
          }}
        >
          {/* Status — single column */}
          <div
            style={{
              padding: "20px 20px 0 20px",
            }}
          >
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Status</label>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                style={{
                  ...fieldStyle,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  background:
                    status === "Completed" ? "#e4f5e7" : "#fdf3e3",
                  color: status === "Completed" ? "#276b3c" : "#8a5a12",
                  fontWeight: 700,
                  border:
                    status === "Completed"
                      ? "1px solid #bde5c6"
                      : "1px solid #f0dcb0",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StatusIcon size={15} />
                  {status}
                </span>
                <ChevronDown
                  size={15}
                  style={{
                    transform: dropdownOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s ease",
                  }}
                />
              </button>
 
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    background: "#ffffff",
                    border: "1px solid #dcede0",
                    borderRadius: 12,
                    boxShadow: "0 10px 28px -10px rgba(30, 80, 50, 0.28)",
                    overflow: "hidden",
                    zIndex: 10,
                  }}
                >
                  {statusOptions.map((opt) => {
                    const Icon = opt.icon;
                    const active = opt.value === status;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => {
                          setStatus(opt.value);
                          setDropdownOpen(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "10px 12px",
                          fontSize: 13.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          color: active ? "#276b3c" : "#3a4a3e",
                          background: active ? "#eef8f0" : "#ffffff",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f2f9f3")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = active
                            ? "#eef8f0"
                            : "#ffffff")
                        }
                      >
                        <Icon size={15} />
                        {opt.value}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
 
          {/* Completion image */}
          <div style={{ padding: "18px 20px 0 20px" }}>
            <label style={labelStyle}>Completion Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: image ? "1px solid #bde5c6" : "1.5px dashed #b7dcc0",
                borderRadius: 14,
                height: 150,
                background: image
                  ? `#f4faf5 url(${image}) center/cover no-repeat`
                  : "#f7fbf8",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                gap: 6,
                transition: "border-color 0.15s ease",
              }}
            >
              {!image && (
                <>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#e4f5e7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Upload size={17} color="#4c9a5f" />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#4c6b53" }}>
                    Tap to upload photo
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8fa896" }}>
                    PNG or JPG, up to 10MB
                  </div>
                </>
              )}
            </div>
            {image && (
              <button
                onClick={() => setImage(null)}
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#c25b4a",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ImageIcon size={13} /> Remove photo
              </button>
            )}
          </div>
 
          {/* Estimated weight */}
          <div style={{ padding: "18px 20px 0 20px" }}>
            <label style={labelStyle}>Estimated Weight</label>
            <div style={{ position: "relative" }}>
              <Scale
                size={16}
                color="#7fae87"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.0"
                inputMode="decimal"
                style={{
                  ...fieldStyle,
                  width: "100%",
                  paddingLeft: 34,
                  boxSizing: "border-box",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#8fa896",
                }}
              >
                kg
              </span>
            </div>
          </div>
 
          {/* Update button */}
          <div style={{ padding: "22px 20px 20px 20px" }}>
            <button
              onClick={handleUpdate}
              style={{
                width: "100%",
                padding: "13px 0",
                borderRadius: 12,
                border: "none",
                background: submitted
                  ? "#3f8a55"
                  : "linear-gradient(180deg, #5cb571 0%, #479a5c 100%)",
                color: "#ffffff",
                fontSize: 14.5,
                fontWeight: 700,
                letterSpacing: "0.01em",
                cursor: "pointer",
                boxShadow: "0 8px 20px -8px rgba(58, 138, 82, 0.55)",
                transition: "background 0.2s ease",
              }}
            >
              {submitted ? "Updated ✓" : "Update Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
 
const labelStyle = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 700,
  color: "#5f8268",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
};
 
const fieldStyle = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #dcede0",
  fontSize: 13.5,
  outline: "none",
};
 