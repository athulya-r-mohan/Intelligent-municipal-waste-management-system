import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Activity,
  User,
  Mail,
  MapPin,
  Phone,
  Shield,
  Briefcase,
  Building2,
  Calendar,
  Lock,
  Edit3,
  Check,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import "../components/ProfilePage.css";
import { BASE_URL as API_BASE_URL } from "../api/api";

export default function ProfilePage() {
  const navigate = useNavigate();

  // Authentication & Profile State
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [banner, setBanner] = useState({ type: "", message: "" });

  // Edit Profile Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", address: "" });
  const [editErrors, setEditErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Determine user role and corresponding dashboard path
  const userRole = (profile?.role || localStorage.getItem("role") || "CITIZEN").toUpperCase();

  const getDashboardRoute = () => {
    if (userRole === "ADMIN") return "/admin";
    if (userRole === "STAFF") return "/staff";
    if (userRole === "RECYCLER") return "/recycler";
    return "/user";
  };

  const handleBack = () => {
    navigate(getDashboardRoute());
  };

  // Fetch complete profile on mount
  const fetchProfile = async () => {
    setLoading(true);
    setBanner({ type: "", message: "" });
    try {
      const headers = getAuthHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/profile/`, { headers });
      setProfile(res.data);
      setEditForm({
        name: res.data.name || "",
        email: res.data.email || "",
        address: res.data.address || "",
      });
      // Synchronize stored user name
      if (res.data.name) {
        localStorage.setItem("name", res.data.name);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      const msg = err.response?.data?.error || "Failed to load profile details. Please try again.";
      setBanner({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // -------------------------------------------------------------
  // Edit Profile Handlers & Validation
  // -------------------------------------------------------------
  const validateEditForm = () => {
    const errors = {};
    const trimmedName = editForm.name.trim();
    const trimmedEmail = editForm.email.trim();

    if (!trimmedName) {
      errors.name = "Full name is required.";
    } else if (trimmedName.length < 2) {
      errors.name = "Name must be at least 2 characters.";
    } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
      errors.name = "Name can only contain letters, spaces, hyphens, and dots.";
    }

    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Enter a valid email address.";
    } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(trimmedEmail)) {
      errors.email = "Please enter a valid Gmail address (@gmail.com).";
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    if (editErrors[name]) {
      setEditErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setEditForm({
        name: profile.name || "",
        email: profile.email || "",
        address: profile.address || "",
      });
    }
    setEditErrors({});
    setIsEditing(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    setSavingProfile(true);
    setBanner({ type: "", message: "" });

    try {
      const headers = getAuthHeaders();
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        address: editForm.address.trim(),
      };

      const res = await axios.patch(`${API_BASE_URL}/api/profile/`, payload, { headers });

      if (res.data?.profile) {
        setProfile(res.data.profile);
        setEditForm({
          name: res.data.profile.name || "",
          email: res.data.profile.email || "",
          address: res.data.profile.address || "",
        });
        localStorage.setItem("name", res.data.profile.name);
      }

      setIsEditing(false);
      setBanner({
        type: "success",
        message: res.data?.message || "Profile details saved successfully.",
      });
    } catch (err) {
      console.error("Failed to update profile:", err);
      const backendErr = err.response?.data;
      if (backendErr?.errors) {
        setEditErrors(backendErr.errors);
      }
      const msg = backendErr?.error || "Failed to update profile. Please verify your details.";
      setBanner({ type: "error", message: msg });
    } finally {
      setSavingProfile(false);
    }
  };

  // -------------------------------------------------------------
  // Change Password Handlers & Validation
  // -------------------------------------------------------------
  const validatePasswordForm = () => {
    const errors = {};
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword) {
      errors.currentPassword = "Current password is required.";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required.";
    } else if (newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters.";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      errors.newPassword = "Must include an uppercase letter, lowercase letter, and a number.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your new password.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "New passwords do not match.";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setSavingPassword(true);
    setBanner({ type: "", message: "" });

    try {
      const headers = getAuthHeaders();
      const payload = {
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
        confirm_new_password: passwordForm.confirmPassword,
      };

      const res = await axios.post(`${API_BASE_URL}/api/profile/change-password/`, payload, {
        headers,
      });

      // Update tokens in local storage so the session continues uninterrupted
      if (res.data?.access) {
        localStorage.setItem("access", res.data.access);
      }
      if (res.data?.refresh) {
        localStorage.setItem("refresh", res.data.refresh);
      }

      // Reset form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setBanner({
        type: "success",
        message: res.data?.message || "Password changed successfully.",
      });
    } catch (err) {
      console.error("Failed to change password:", err);
      const backendErr = err.response?.data;
      if (backendErr?.errors) {
        const mappedErrors = {};
        if (backendErr.errors.current_password) {
          mappedErrors.currentPassword = Array.isArray(backendErr.errors.current_password)
            ? backendErr.errors.current_password[0]
            : backendErr.errors.current_password;
        }
        if (backendErr.errors.new_password) {
          mappedErrors.newPassword = Array.isArray(backendErr.errors.new_password)
            ? backendErr.errors.new_password[0]
            : backendErr.errors.new_password;
        }
        if (backendErr.errors.confirm_new_password) {
          mappedErrors.confirmPassword = Array.isArray(backendErr.errors.confirm_new_password)
            ? backendErr.errors.confirm_new_password[0]
            : backendErr.errors.confirm_new_password;
        }
        setPasswordErrors(mappedErrors);
      }
      const msg = backendErr?.error || "Failed to change password. Please check your current password.";
      setBanner({ type: "error", message: msg });
    } finally {
      setSavingPassword(false);
    }
  };

  // Helper for role badge display
  const getRoleBadge = (role) => {
    switch (role) {
      case "ADMIN":
        return <span className="ep-profile-role-badge ep-role-admin">Admin</span>;
      case "STAFF":
        return (
          <span className="ep-profile-role-badge ep-role-staff">
            {profile?.role_specific_details?.designation === "DRIVER" ? "Driver" : "Staff"}
          </span>
        );
      case "RECYCLER":
        return <span className="ep-profile-role-badge ep-role-recycler">Recycler Partner</span>;
      default:
        return <span className="ep-profile-role-badge ep-role-citizen">Citizen</span>;
    }
  };

  return (
    <div className="ep-profile-root">
      {/* Sticky Header */}
      <header className="ep-profile-header">
        <div className="ep-profile-header-inner">
          <button className="ep-profile-back-btn" onClick={handleBack} aria-label="Back to dashboard">
            <ArrowLeft size={16} strokeWidth={2.2} />
            <span>Back to Dashboard</span>
          </button>

          <div
            className="ep-profile-brand"
            onClick={handleBack}
            style={{ cursor: "pointer" }}
            title="EcoPulse Dashboard"
          >
            <div className="ep-profile-brand-icon">
              <Activity size={18} strokeWidth={2.5} color="#ffffff" />
            </div>
            <span>
              Eco<span className="ep-profile-brand-accent">Pulse</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NotificationBell />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ep-profile-main">
        {loading ? (
          <div className="ep-profile-skeleton">
            <Loader2 className="ep-spin" size={32} />
            <span>Loading your EcoPulse profile...</span>
          </div>
        ) : (
          <>
            {/* Banner Messages */}
            {banner.message && (
              <div
                className={`ep-profile-banner ${
                  banner.type === "success" ? "ep-profile-banner-success" : "ep-profile-banner-error"
                }`}
              >
                {banner.type === "success" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                <span>{banner.message}</span>
              </div>
            )}

            {/* Hero Profile Summary Card */}
            <section className="ep-profile-hero">
              <div className="ep-profile-hero-left">
                <div className="ep-profile-avatar">
                  {(profile?.name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="ep-profile-hero-info">
                  <h1>{profile?.name || "EcoPulse User"}</h1>
                  <div className="ep-profile-hero-meta">
                    {getRoleBadge(userRole)}
                    <span className="ep-profile-email-badge">
                      <Mail size={14} />
                      {profile?.email}
                    </span>
                    {profile?.date_joined && (
                      <span className="ep-profile-email-badge">
                        <Calendar size={14} />
                        Joined {new Date(profile.date_joined).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="ep-profile-hero-actions">
                {!isEditing && (
                  <button className="ep-btn-edit" onClick={() => setIsEditing(true)}>
                    <Edit3 size={15} />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </section>

            {/* Grid Layout: Profile Details / Edit Form & Change Password */}
            <div className="ep-profile-grid">
              {/* Left Column: Profile Information / Edit Form */}
              <div className="ep-profile-card">
                <div className="ep-card-header">
                  <h2 className="ep-card-title">
                    <span className="ep-card-title-icon">
                      <User size={18} />
                    </span>
                    {isEditing ? "Edit Personal Details" : "Personal Information"}
                  </h2>
                </div>

                {isEditing ? (
                  /* ============================================================
                     EDIT PROFILE FORM
                     ============================================================ */
                  <form onSubmit={handleSaveProfile} noValidate>
                    {/* Full Name */}
                    <div className="ep-form-group">
                      <label className="ep-form-label" htmlFor="edit-name">
                        Full Name
                      </label>
                      <div className="ep-form-input-wrap">
                        <User size={16} className="ep-form-icon-left" />
                        <input
                          id="edit-name"
                          name="name"
                          type="text"
                          className={`ep-form-input ${editErrors.name ? "ep-form-input-error" : ""}`}
                          placeholder="Your full name"
                          value={editForm.name}
                          onChange={handleEditChange}
                          disabled={savingProfile}
                        />
                      </div>
                      {editErrors.name && (
                        <span className="ep-field-error">{editErrors.name}</span>
                      )}
                    </div>

                    {/* Email ID */}
                    <div className="ep-form-group">
                      <label className="ep-form-label" htmlFor="edit-email">
                        Email ID (Login Username)
                      </label>
                      <div className="ep-form-input-wrap">
                        <Mail size={16} className="ep-form-icon-left" />
                        <input
                          id="edit-email"
                          name="email"
                          type="email"
                          className={`ep-form-input ${editErrors.email ? "ep-form-input-error" : ""}`}
                          placeholder="yourname@gmail.com"
                          value={editForm.email}
                          onChange={handleEditChange}
                          disabled={savingProfile}
                        />
                      </div>
                      {editErrors.email && (
                        <span className="ep-field-error">{editErrors.email}</span>
                      )}
                    </div>

                    {/* Physical Address */}
                    <div className="ep-form-group">
                      <label className="ep-form-label" htmlFor="edit-address">
                        Address / Residence
                      </label>
                      <div className="ep-form-input-wrap">
                        <textarea
                          id="edit-address"
                          name="address"
                          rows={3}
                          className="ep-form-input ep-form-textarea"
                          placeholder="House / Street / Ward address"
                          value={editForm.address}
                          onChange={handleEditChange}
                          disabled={savingProfile}
                        />
                      </div>
                    </div>

                    {/* Form Buttons */}
                    <div className="ep-form-actions">
                      <button
                        type="submit"
                        className="ep-btn-save"
                        disabled={savingProfile}
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="ep-spin" size={15} />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="ep-btn-cancel"
                        onClick={handleCancelEdit}
                        disabled={savingProfile}
                      >
                        <X size={15} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ============================================================
                     READ-ONLY PROFILE DETAILS
                     ============================================================ */
                  <div className="ep-detail-list">
                    <div className="ep-detail-item">
                      <span className="ep-detail-label">Full Name</span>
                      <span className="ep-detail-value">{profile?.name || "Not provided"}</span>
                    </div>

                    <div className="ep-detail-item">
                      <span className="ep-detail-label">Registered Email</span>
                      <span className="ep-detail-value">{profile?.email || "Not provided"}</span>
                    </div>

                    <div className="ep-detail-item">
                      <span className="ep-detail-label">Contact Phone</span>
                      <span className="ep-detail-value">
                        {profile?.phone || <span className="ep-detail-value-empty">No phone number registered</span>}
                      </span>
                    </div>

                    <div className="ep-detail-item">
                      <span className="ep-detail-label">Residential / Facility Address</span>
                      <span className="ep-detail-value">
                        {profile?.address || <span className="ep-detail-value-empty">No address provided</span>}
                      </span>
                    </div>

                    {/* Role-Specific Read-Only Box */}
                    {userRole === "CITIZEN" && (
                      <div className="ep-role-specific-box">
                        <div className="ep-role-specific-title">
                          <MapPin size={14} />
                          Municipal Ward Assignment
                        </div>
                        {profile?.ward_details ? (
                          <div className="ep-role-specific-grid">
                            <div>
                              <span className="ep-detail-label">Ward Number</span>
                              <div className="ep-detail-value">
                                Ward {profile.ward_details.ward_number || profile.ward_details.ward_id}
                              </div>
                            </div>
                            <div>
                              <span className="ep-detail-label">Ward Name</span>
                              <div className="ep-detail-value">{profile.ward_details.ward_name || "N/A"}</div>
                            </div>
                            {profile.ward_details.mcf_location_name && (
                              <div style={{ gridColumn: "1 / -1", marginTop: "4px" }}>
                                <span className="ep-detail-label">Assigned MCF Facility</span>
                                <div className="ep-detail-value" style={{ fontSize: "13px" }}>
                                  {profile.ward_details.mcf_location_name}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="ep-detail-value-empty">Not currently assigned to a ward</span>
                        )}
                      </div>
                    )}

                    {userRole === "STAFF" && (
                      <div className="ep-role-specific-box">
                        <div className="ep-role-specific-title">
                          <Briefcase size={14} />
                          Staff Operation Details
                        </div>
                        <div className="ep-role-specific-grid">
                          <div>
                            <span className="ep-detail-label">Designation</span>
                            <div className="ep-detail-value">
                              {profile?.role_specific_details?.designation === "DRIVER"
                                ? "Vehicle Driver"
                                : "Field Collection Staff"}
                            </div>
                          </div>
                          <div>
                            <span className="ep-detail-label">Staff ID</span>
                            <div className="ep-detail-value">
                              #{profile?.role_specific_details?.staff_id || "N/A"}
                            </div>
                          </div>
                          {profile?.ward_details && (
                            <div>
                              <span className="ep-detail-label">Assigned Ward</span>
                              <div className="ep-detail-value">
                                Ward {profile.ward_details.ward_number || profile.ward_details.ward_id} ({profile.ward_details.ward_name})
                              </div>
                            </div>
                          )}
                          {profile?.role_specific_details?.date_of_joining && (
                            <div>
                              <span className="ep-detail-label">Date of Joining</span>
                              <div className="ep-detail-value">
                                {profile.role_specific_details.date_of_joining}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {userRole === "RECYCLER" && (
                      <div className="ep-role-specific-box">
                        <div className="ep-role-specific-title">
                          <Building2 size={14} />
                          Recycling Partner Credentials
                        </div>
                        <div className="ep-role-specific-grid">
                          <div>
                            <span className="ep-detail-label">Organization</span>
                            <div className="ep-detail-value">
                              {profile?.role_specific_details?.organization || "N/A"}
                            </div>
                          </div>
                          <div>
                            <span className="ep-detail-label">Waste Category</span>
                            <div className="ep-detail-value">
                              {profile?.role_specific_details?.waste_type || "N/A"}
                            </div>
                          </div>
                          {profile?.role_specific_details?.date_of_registration && (
                            <div>
                              <span className="ep-detail-label">Registration Date</span>
                              <div className="ep-detail-value">
                                {profile.role_specific_details.date_of_registration}
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="ep-detail-label">Recycler ID</span>
                            <div className="ep-detail-value">
                              #{profile?.role_specific_details?.recycler_id || "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {userRole === "ADMIN" && (
                      <div className="ep-role-specific-box">
                        <div className="ep-role-specific-title">
                          <Shield size={14} />
                          System Administrator Privileges
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: "#5c7c6d", lineHeight: 1.5 }}>
                          Full municipal administrative authority. Oversees ward dispatch, complaint queues, staff onboarding, recycler agreements, and revenue analytics.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Change Password Section */}
              <div className="ep-profile-card">
                <div className="ep-card-header">
                  <h2 className="ep-card-title">
                    <span className="ep-card-title-icon">
                      <Lock size={18} />
                    </span>
                    Change Password
                  </h2>
                </div>

                <div className="ep-password-hints">
                  <strong>Password Security Requirements:</strong>
                  <ul>
                    <li>At least 8 characters long</li>
                    <li>At least one uppercase and one lowercase letter</li>
                    <li>At least one numeric digit (0-9)</li>
                  </ul>
                </div>

                <form onSubmit={handleSavePassword} noValidate>
                  {/* Current Password */}
                  <div className="ep-form-group">
                    <label className="ep-form-label" htmlFor="current-pass">
                      Current Password
                    </label>
                    <div className="ep-form-input-wrap">
                      <Lock size={16} className="ep-form-icon-left" />
                      <input
                        id="current-pass"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        className={`ep-form-input ${passwordErrors.currentPassword ? "ep-form-input-error" : ""}`}
                        placeholder="Enter your current password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        disabled={savingPassword}
                      />
                      <button
                        type="button"
                        className="ep-form-icon-toggle"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        tabIndex={-1}
                        aria-label="Toggle password visibility"
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <span className="ep-field-error">{passwordErrors.currentPassword}</span>
                    )}
                  </div>

                  {/* New Password */}
                  <div className="ep-form-group">
                    <label className="ep-form-label" htmlFor="new-pass">
                      New Password
                    </label>
                    <div className="ep-form-input-wrap">
                      <Lock size={16} className="ep-form-icon-left" />
                      <input
                        id="new-pass"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        className={`ep-form-input ${passwordErrors.newPassword ? "ep-form-input-error" : ""}`}
                        placeholder="Minimum 8 characters"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        disabled={savingPassword}
                      />
                      <button
                        type="button"
                        className="ep-form-icon-toggle"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        tabIndex={-1}
                        aria-label="Toggle password visibility"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <span className="ep-field-error">{passwordErrors.newPassword}</span>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div className="ep-form-group">
                    <label className="ep-form-label" htmlFor="confirm-pass">
                      Confirm New Password
                    </label>
                    <div className="ep-form-input-wrap">
                      <Lock size={16} className="ep-form-icon-left" />
                      <input
                        id="confirm-pass"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        className={`ep-form-input ${passwordErrors.confirmPassword ? "ep-form-input-error" : ""}`}
                        placeholder="Re-enter your new password"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        disabled={savingPassword}
                      />
                      <button
                        type="button"
                        className="ep-form-icon-toggle"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        tabIndex={-1}
                        aria-label="Toggle password visibility"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <span className="ep-field-error">{passwordErrors.confirmPassword}</span>
                    )}
                  </div>

                  <div className="ep-form-actions">
                    <button
                      type="submit"
                      className="ep-btn-save"
                      disabled={savingPassword}
                    >
                      {savingPassword ? (
                        <>
                          <Loader2 className="ep-spin" size={15} />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
