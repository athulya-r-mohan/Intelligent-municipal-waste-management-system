import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/Register.css";
import API from "../api/api";

import {
  Recycle,
  Leaf,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  Home,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";


// ---------------------------------------------------------------------------
// EcoRegister — a registration form for a municipal waste-management portal.
// Fields mirror the user table: name, email, phone, password, role, ward_id,
// address. Green / white theme with a signature "sorted bins" illustration.
// ---------------------------------------------------------------------------



const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  
  wardId: "",
  address: "",
};

function validate(form) {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = "Full name is required.";
  } else if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (!/^[a-zA-Z\s.'-]+$/.test(form.name.trim())) {
    errors.name = "Name can only contain letters and spaces.";
  }

  if (!form.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(form.email.trim())) {
    errors.email = "Please enter a valid Gmail address (@gmail.com).";
  }

  if (!form.phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!/^\d{10}$/.test(form.phone.trim().replace(/[\s-]/g, ""))) {
    errors.phone = "Enter a valid 10-digit phone number.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
    errors.password = "Include an uppercase, lowercase letter and a number.";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  

  if (!form.wardId.trim()) {
    errors.wardId = "Ward ID is required.";
  } else if (!/^\d+$/.test(form.wardId.trim())) {
    errors.wardId = "Ward ID must be a number.";
  }

  if (!form.address.trim()) {
    errors.address = "Address is required.";
  } else if (form.address.trim().length < 8) {
    errors.address = "Please enter a fuller address.";
  }

  return errors;
}

function Field({
  id,
  label,
  icon: Icon,
  error,
  touched,
  children,
  wrapClassName = "",
  isInvalid,
}) {
  const showError = isInvalid !== undefined ? isInvalid : (touched && error);
  return (
    <div className="ewf-field">
      <label htmlFor={id} className="ewf-label">
        {label}
      </label>
      <div
        className={`ewf-input-wrap ${showError ? "ewf-input-wrap--error" : ""} ${wrapClassName}`.trim()}
        style={showError ? { borderColor: "#C0392B" } : undefined}
      >
        <Icon size={17} className="ewf-input-icon" aria-hidden="true" />
        {children}
        {showError ? (
          <AlertCircle size={16} className="ewf-status-icon ewf-status-icon--error" />
        ) : touched ? (
          <CheckCircle2 size={16} className="ewf-status-icon ewf-status-icon--ok" />
        ) : null}
      </div>
      {showError && <span className="ewf-error">{error}</span>}
    </div>
  );
}

export default function WasteManagementRegister() {
   const navigate = useNavigate(); 
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;

  const isValidGmail = (email) => {
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
  };

  const isEmailInvalid =
    (touched.email || form.email.length > 0) && !isValidGmail(form.email);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "email") {
      setTouched((t) => ({ ...t, email: true }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
  };

  const handleSubmit = async (e) => {

    e.preventDefault();


    setTouched({

        name:true,
        email:true,
        phone:true,
        password:true,
        confirmPassword:true,
        wardId:true,
        address:true,

    });



    const validationErrors = validate(form);


    if(Object.keys(validationErrors).length === 0){

        try {


            const response = await API.post("/register/",{


                name: form.name,

                email: form.email,

                phone: form.phone,

                password: form.password,

                ward_id: form.wardId,

                address: form.address


            });


            console.log(response.data);


            setSubmitted(true);



        }
        catch(error){

            const errorMsg = error.response?.data?.error || "Registration failed";

            console.log("Registration error:", errorMsg);

            alert(errorMsg);

        }

    }

};

  const handleReset = () => {
    setForm(initialForm);
    setTouched({});
    setSubmitted(false);
  };

  return (
    <div className="ewf-page">
      <style>{`
        .ewf-input-wrap.ewf-input-wrap--error,
        .ewf-input-wrap.ewf-input-wrap--error:focus-within {
          border-color: #C0392B !important;
          box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.15) !important;
        }
        input.invalid-gmail,
        input.error-input {
          text-decoration: underline !important;
          text-decoration-color: #C0392B !important;
          text-decoration-thickness: 2px !important;
          text-underline-offset: 3px !important;
        }
        input.invalid-gmail::placeholder,
        input.error-input::placeholder {
          text-decoration: none !important;
        }
      `}</style>
      <div className="ewf-card">
        {/* -------------------- Illustration side -------------------- */}
        <div className="ewf-hero">
          <div className="ewf-hero-badge">
            <Recycle size={16} />
            Eco Pulse Ward Network
          </div>

          <div>
            <h1>Join your ward's waste-management network</h1>
            <p>
              Register to schedule pickups, report illegal dumping, and track
              your ward's recycling progress in real time.
            </p>
          </div>

          <div className="ewf-hero-illustration">
            <svg viewBox="0 0 320 220" width="100%" height="auto" role="img" aria-label="Illustration of sorted recycling bins beside a growing plant">
              <defs>
                <linearGradient id="binGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#95D5B2" />
                  <stop offset="100%" stopColor="#40916C" />
                </linearGradient>
                <linearGradient id="binLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EAF6EE" />
                  <stop offset="100%" stopColor="#D8F3DC" />
                </linearGradient>
              </defs>

              {/* ground */}
              <ellipse cx="160" cy="200" rx="150" ry="14" fill="rgba(255,255,255,0.08)" />

              {/* left bin (recyclables) */}
              <rect x="35" y="95" width="70" height="95" rx="10" fill="url(#binGreen)" />
              <rect x="35" y="95" width="70" height="18" rx="8" fill="#1B4332" opacity="0.35" />
              <circle cx="70" cy="140" r="16" fill="#EAF6EE" opacity="0.9" />
              <path d="M70 130 l6 10 h-12 z M62 142 l16 0 l-8 10 z M78 142 l0 -10 l8 6 z" fill="#2D6A4F" transform="translate(0,0) scale(0.9) translate(7,7)" />

              {/* middle bin (compost) - taller, front */}
              <rect x="120" y="70" width="80" height="120" rx="12" fill="url(#binLight)" stroke="#95D5B2" strokeWidth="2" />
              <rect x="120" y="70" width="80" height="20" rx="9" fill="#40916C" />
              <path d="M160 108c-14 8-20 20-14 32 6 11 22 11 28 0 6-12 0-24-14-32z" fill="#2D6A4F" />
              <path d="M160 108v40" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" />

              {/* right bin (general) */}
              <rect x="215" y="105" width="66" height="85" rx="10" fill="url(#binGreen)" opacity="0.85" />
              <rect x="215" y="105" width="66" height="16" rx="7" fill="#1B4332" opacity="0.3" />
              <rect x="238" y="130" width="20" height="26" rx="3" fill="#EAF6EE" opacity="0.85" />

              {/* growing sprout beside bins */}
              <path d="M300 190c0-26 -6-42 -6-42" stroke="#D8F3DC" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M294 150c-10-4-16-14-14-24 10 2 18 10 18 20 8-6 10-16 6-26 12 6 16 18 10 28 -4 8-12 4-20 2z" fill="#95D5B2" />

              {/* small floating leaves */}
              <g fill="#D8F3DC" opacity="0.8">
                <ellipse cx="50" cy="55" rx="6" ry="10" transform="rotate(30 50 55)" />
                <ellipse cx="255" cy="50" rx="5" ry="9" transform="rotate(-20 255 50)" />
                <ellipse cx="180" cy="35" rx="5" ry="8" transform="rotate(10 180 35)" />
              </g>
            </svg>
          </div>

          <div className="ewf-hero-foot">
            <Leaf size={14} />
            Cleaner streets start with one registration.
          </div>
        </div>

        {/* -------------------- Form side -------------------- */}
        <div className="ewf-form-panel">
          {submitted ? (
            <div className="ewf-success">
              <div className="ewf-success-icon">
                <CheckCircle2 size={30} />
              </div>
              <h2>Registration Successful</h2>

<p>
  Welcome aboard, {form.name.split(" ")[0]}.
  Your account for Ward {form.wardId} has been created successfully.
</p>

<div className="ewf-success-actions">
  <button
    className="ewf-success-btn"
    onClick={() => navigate("/login")}
  >
    Login Now
  </button>

  <button
    className="ewf-success-btn"
    onClick={handleReset}
  >
    Register Another Account
  </button>
</div>
</div>
) : (
  <>
              <div className="ewf-form-header">
                <h2>Create your account</h2>
                <p>All fields are required to complete registration.</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="ewf-grid">
                  <Field id="name" label="Full name" icon={User} error={errors.name} touched={touched.name}>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Anjali Nair"
                      value={form.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </Field>

                  <Field
                    id="email"
                    label="Email address"
                    icon={Mail}
                    error={isEmailInvalid ? "Please enter a valid Gmail address (@gmail.com)." : errors.email}
                    touched={touched.email || form.email.length > 0}
                    isInvalid={isEmailInvalid}
                  >
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={isEmailInvalid ? "error-input invalid-gmail" : ""}
                      style={
                        isEmailInvalid
                          ? {
                              borderColor: "#C0392B",
                              textDecoration: "underline",
                              textDecorationColor: "#C0392B",
                              textDecorationThickness: "2px",
                              textUnderlineOffset: "3px",
                            }
                          : undefined
                      }
                    />
                  </Field>

                  <Field id="phone" label="Phone number" icon={Phone} error={errors.phone} touched={touched.phone}>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="9876543210"
                      value={form.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                  </Field>

                  <Field
                    id="wardId"
                    label="Ward"
                    icon={MapPin}
                    error={errors.wardId}
                    touched={touched.wardId}
                  >
                    <select
                      id="wardId"
                      name="wardId"
                      value={form.wardId}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <option value="">Select Ward</option>
                      <option value="1">Ward 1</option>
                      <option value="2">Ward 2</option>
                      <option value="3">Ward 3</option>
                    </select>
                  </Field>

                  <Field id="password" label="Password" icon={Lock} error={errors.password} touched={touched.password}>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <button
                      type="button"
                      className="ewf-eye-btn"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </Field>

                  <Field
                    id="confirmPassword"
                    label="Confirm password"
                    icon={Lock}
                    error={errors.confirmPassword}
                    touched={touched.confirmPassword}
                  >
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <button
                      type="button"
                      className="ewf-eye-btn"
                      onClick={() => setShowConfirm((s) => !s)}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </Field>

                  

                  <div className="ewf-span-2">
                    <Field id="address" label="Address" icon={Home} error={errors.address} touched={touched.address}>
                      <textarea
                        id="address"
                        name="address"
                        rows={2}
                        placeholder="House no., street, locality"
                        value={form.address}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Field>
                  </div>
                </div>

                <button type="submit" className="ewf-submit" disabled={touched.name && !isValid && false}>
                  <Recycle size={17} />
                  Register account
                </button>
                <p className="ewf-footnote">
                  By registering you agree to help keep your ward clean and green.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
