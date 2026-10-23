import { useNavigate } from "react-router-dom";
import React, { useState } from 'react';
import axios from "axios";
import { API_BASE_URL } from "../api/api";
import LOGO_IMG from "../assets/logo.png";
import BIN_IMG from "../assets/bin.png";




const STYLES = `
:root {
    --eco-dark: #0b3d2e;
    --eco-green: #1f9d63;
    --eco-green-light: #4cbf8a;
    --eco-mint: #eaf7f0;
    --eco-white: #ffffff;
    --eco-text: #14312a;
    --eco-muted: #6b8b7e;
  }

  * { box-sizing: border-box; }
.page-wrapper {
  position: relative;
  overflow: hidden;
  margin: 0;
  font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;

  background:
    radial-gradient(circle at top left, #d8f8df 0%, transparent 30%),
    radial-gradient(circle at bottom right, #c8f2d4 0%, transparent 35%),
    linear-gradient(135deg, #ffffff 0%, #eefaf2 100%);
}
.stage {
  width: 90%;
  height: 90%;
  display: flex;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(15px);
  border-radius: 25px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.12);
}

  .panel-left {
    flex: 1;
    padding: 44px 40px;F
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: #ffffff;
  }

  .logo-row {
    display: flex;
    align-items: center;
    margin-bottom: 18px;
  }

  .logo-row img {
    height: 30px;
  }

  h1.title {
    font-size: 28px;
    font-weight: 700;
    color: var(--eco-text);
    margin: 0 0 22px 0;
  }

  label {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--eco-muted);
    margin-bottom: 6px;
    margin-top: 16px;
  }

  label:first-of-type { margin-top: 0; }

  .input-wrap {
    position: relative;
  }

  input[type="email"],
  input[type="password"],
  input[type="text"] {
    width: 100%;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1.5px solid #d9ede2;
    background: #f7fdfa;
    font-size: 14px;
    color: var(--eco-text);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  input::placeholder { color: #9fb8ac; }

  input:focus {
    border-color: var(--eco-green);
    box-shadow: 0 0 0 3px rgba(31, 157, 99, 0.15);
  }

  input.invalid-gmail,
  input.error-input {
    border-color: #dc2626 !important;
    text-decoration: underline !important;
    text-decoration-color: #dc2626 !important;
    text-decoration-thickness: 2px !important;
    text-underline-offset: 3px !important;
  }

  input.invalid-gmail::placeholder,
  input.error-input::placeholder {
    text-decoration: none !important;
  }

  input.invalid-gmail:focus,
  input.error-input:focus {
    border-color: #dc2626 !important;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15) !important;
    text-decoration: underline !important;
    text-decoration-color: #dc2626 !important;
    text-decoration-thickness: 2px !important;
    text-underline-offset: 3px !important;
  }

  .error {
    display: block;
    color: #dc2626;
    font-size: 12px;
    margin-top: 5px;
  }

  .eye-toggle {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    color: var(--eco-muted);
    font-size: 13px;
    user-select: none;
  }

  .forgot {
    text-align: right;
    margin-top: 8px;
  }

  .forgot a {
    font-size: 12.5px;
    color: var(--eco-green);
    text-decoration: none;
    font-weight: 600;
  }
  .forgot a:hover { text-decoration: underline; }

  .signin-btn {
    width: 100%;
    margin-top: 20px;
    padding: 12px 0;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--eco-green) 0%, #177d4e 100%);
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 10px 20px -8px rgba(31, 157, 99, 0.55);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .signin-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 24px -8px rgba(31, 157, 99, 0.6);
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 22px 0 16px 0;
    font-size: 12px;
    color: var(--eco-muted);
  }
  .divider::before, .divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: #e2f0e8;
  }

  .social-row {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .social-btn {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    border: 1.5px solid #e2f0e8;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    transition: border-color 0.2s, transform 0.15s;
  }
  .social-btn:hover {
    border-color: var(--eco-green-light);
    transform: translateY(-1px);
  }

  .register-row {
    text-align: center;
    margin-top: 20px;
    font-size: 12.5px;
    color: var(--eco-muted);
  }
  .register-row a {
    color: var(--eco-green);
    font-weight: 700;
    text-decoration: none;
  }
  .register-row a:hover { text-decoration: underline; }

  .panel-right {
    flex: 0.85;
    position: relative;
    background: linear-gradient(160deg, #d3f2e0 0%, #b7e8cd 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .panel-right::before,
  .panel-right::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    filter: blur(1px);
  }
  .panel-right::before {
    width: 90px; height: 90px;
    background: rgba(255,255,255,0.35);
    top: 30px; left: 20px;
  }
  .panel-right::after {
    width: 50px; height: 50px;
    background: rgba(31,157,99,0.18);
    bottom: 40px; right: 30px;
  }

  .confetti {
    position: absolute;
    border-radius: 3px;
  }

  
 .bin-image {
  width: 80%;
  max-width: 450px;
  height: auto;
  object-fit: contain;
}

  @media (max-width: 640px) {
    .stage { flex-direction: column; }
    .panel-right { min-height: 220px; order: -1; }
    .panel-left { padding: 32px 26px; }
  }
`;

export default function EcoPulseLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });
  };

  // Validation
  const validate = () => {
    let newErrors = {};

    // Email Validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)
    ) {
      newErrors.email = "Enter a valid email address";
    }

    // Password Validation
    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validate()) return;

  try {
    const response = await axios.post(
      `${API_BASE_URL}/login/`,
      {
        email: formData.email,
        password: formData.password,
      }
    );

     console.log("LOGIN RESPONSE:", response.data);

    // Save JWT tokens
    localStorage.setItem("access", response.data.access);
    localStorage.setItem("refresh", response.data.refresh);

    // Save user details (optional but useful)
    localStorage.setItem("role", response.data.role);
    localStorage.setItem("name", response.data.name);

    // Redirect based on role (case-insensitive and whitespace-safe)
    const normalizedRole = (response.data.role || "").toString().trim().toUpperCase();

    if (normalizedRole === "CITIZEN") {
      navigate("/user");
    } else if (normalizedRole === "ADMIN") {
      navigate("/admin");
    } else if (normalizedRole === "STAFF") {
      navigate("/staff");
    } else if (normalizedRole === "RECYCLER") {
      navigate("/recycler");
    }

  } catch (error) {
    alert("Invalid email or password");
  }
};

  return (
    <>
      <style>{STYLES}</style>

      <div className="page-wrapper">
        <div className="stage">

          {/* LEFT PANEL */}

          <div className="panel-left">

            <div className="logo-row">
              <img src={LOGO_IMG} alt="Eco Pulse logo" />
            </div>

            <h1 className="title">Login</h1>

            <form onSubmit={handleSubmit}>

              {/* Email */}

              <label htmlFor="email">Email</label>

              <div className="input-wrap">
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="username@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "error-input" : ""}
                />
              </div>

              {errors.email && (
                <span className="error">{errors.email}</span>
              )}

              {/* Password */}

              <label htmlFor="password">Password</label>

              <div className="input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "error-input" : ""}
                />

                <span
                  className="eye-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  👁
                </span>
              </div>

              {errors.password && (
                <span className="error">{errors.password}</span>
              )}

              <div className="forgot">
                <a href="#">Forgot Password?</a>
              </div>

              <button type="submit" className="signin-btn">
                Sign In
              </button>

            </form>

            <div className="divider">
              Or Continue With
            </div>

            <div className="social-row">
              <div className="social-btn">G</div>
              <div className="social-btn">●</div>
              <div className="social-btn">f</div>
            </div>

            <div className="register-row">
              Don't have an account yet?
              <a href="/Register"> Register for free</a>
            </div>

          </div>

          {/* RIGHT PANEL */}

          <div className="panel-right">
            <img
              className="bin-image"
              src={BIN_IMG}
              alt="Recycling bin"
            />
          </div>

        </div>
      </div>
    </>
  );
}