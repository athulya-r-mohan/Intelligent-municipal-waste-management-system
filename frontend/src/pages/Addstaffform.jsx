import React, { useState } from "react";
import { UserPlus, CheckCircle2, Truck, Activity } from "lucide-react";
import axios from "axios";

const WARDS = [
  { id: 1, name: "Ward 1" },
  { id: 2, name: "Ward 2" },
  { id: 3, name: "Ward 3" },
  { id: 4, name: "Ward 4" },
  { id: 5, name: "Ward 5" },
  { id: 6, name: "Ward 6" },
  { id: 7, name: "Ward 7" },
  { id: 8, name: "Ward 8" },
  { id: 9, name: "Ward 9" },
  { id: 10, name: "Ward 10" },
];

const DESIGNATIONS = ["Staff", "Driver"];

function EcoPulseLogo() {
  return (
    <div className="eco-logo">
      <div className="logo-circle">
        <span className="pulse-ring"></span>

        <div className="logo-inner">
          <Activity
            size={24}
            color="white"
            strokeWidth={2.5}
          />
        </div>
      </div>

      <div className="logo-text">
        <span className="eco-text">Eco</span>{" "}
        <span className="pulse-text">Pulse</span>
      </div>
    </div>
  );
}

function PulseDivider() {
  return (
    <div className="pulse-divider">
      <svg
        viewBox="0 0 400 40"
        preserveAspectRatio="none"
      >
        <path
          d="M0,20 L110,20 L125,20 L135,4 L148,36 L160,20 L175,20 L400,20"
          fill="none"
          stroke="#d1fae5"
          strokeWidth="2"
        />

        <path
          d="M0,20 L110,20 L125,20 L135,4 L148,36 L160,20 L175,20 L400,20"
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="100"
          strokeDasharray="18 82"
          className="pulse-trace"
        />
      </svg>
    </div>
  );
}

export default function AddStaffForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    ward: "",
    designation: "",
    dateOfJoining: "",
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [staffCredentials, setStaffCredentials] = useState(null);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const validate = () => {
    const next = {};

    if (!form.name.trim()) {
      next.name = "Name is required";
    }

    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      next.email = "Enter a valid email address";
    }

    if (!form.ward) {
      next.ward = "Ward is required";
    }

    if (!form.designation) {
      next.designation = "Designation is required";
    }

    if (!form.dateOfJoining) {
      next.dateOfJoining = "Date of joining is required";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validate()) return;

  try {
    const response = await axios.post(
      "https://intelligent-municipal-waste-management.onrender.com/api/add-staff/",
      {
        name: form.name,
        email: form.email,
        ward_id: form.ward,
        designation: form.designation.toUpperCase(),
        dateOfJoining: form.dateOfJoining,
      }
    );

    console.log(response.data);

    // Store the username and temporary password
    setStaffCredentials({
      email: response.data.email,
      temporary_password: response.data.temporary_password,
    });

    setSubmitted(true);

    // DO NOT use setTimeout here
    // Otherwise the credentials will disappear.

    setForm({
      name: "",
      email: "",
      ward: "",
      designation: "",
      dateOfJoining: "",
    });

  } catch (error) {
    console.error(error);

    alert(
      error.response?.data?.error ||
        "Failed to add staff"
    );
  }
};

  return (
    <>
      <style>{`

        /* =========================
           PAGE
        ========================= */

        .add-staff-page {
          width: 100%;
          min-height: 100vh;

          background: #ffffff;

          display: flex;
          justify-content: center;
          align-items: flex-start;

          padding: 20px 16px;

          overflow-y: auto;
        }


        /* =========================
           MAIN CARD
        ========================= */

        .staff-card {
          width: 100%;
          max-width: 640px;
          min-height: auto;

          background: #ffffff;

          border: 1px solid #d1fae5;

          border-radius: 18px;

          box-shadow:
            0 4px 15px rgba(16, 185, 129, 0.08);

          padding: 25px 40px 18px 40px;
        }


        /* =========================
           LOGO
        ========================= */

        .eco-logo {
          display: flex;
          align-items: center;

          gap: 12px;

          margin-bottom: 5px;
        }

        .logo-circle {
          position: relative;

          width: 45px;
          height: 45px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pulse-ring {
          position: absolute;

          inset: 0;

          border-radius: 50%;

          background: #34d399;

          opacity: 0.5;

          animation:
            pulse-ring 2.2s
            cubic-bezier(0.4, 0, 0.6, 1)
            infinite;
        }

        .logo-inner {
          position: relative;

          width: 45px;
          height: 45px;

          border-radius: 50%;

          display: flex;
          align-items: center;
          justify-content: center;

          background:
            linear-gradient(
              135deg,
              #0f766e 0%,
              #34d399 100%
            );
        }

        .logo-text {
          font-family: Georgia, serif;

          font-size: 23px;

          line-height: 1;
        }

        .eco-text {
          font-weight: 700;

          color: #0f172a;
        }

        .pulse-text {
          font-weight: 700;

          color: #10b981;
        }


        /* =========================
           HEADING
        ========================= */

        .heading-section {
          margin-bottom: 4px;
        }

        .heading-section h1 {
          margin: 0;

          font-family: Arial, sans-serif;

          font-size: 26px;

          line-height: 1.2;

          font-weight: 600;

          color: #0f172a;
        }

        .heading-section p {
          margin: 4px 0 0;

          font-family: Arial, sans-serif;

          font-size: 16px;

          color: #64748b;
        }


        /* =========================
           ECG DIVIDER
        ========================= */

        .pulse-divider {
          width: 100%;

          height: 28px;

          margin-bottom: 8px;

          overflow: hidden;
        }

        .pulse-divider svg {
          width: 100%;
          height: 100%;
        }

        .pulse-trace {
          animation:
            trace 2.6s linear infinite;
        }


        /* =========================
           FORM
        ========================= */

        .staff-form {
          width: 100%;
        }

        .form-group {
          width: 100%;

          margin-bottom: 11px;
        }

        .form-label {
          display: block;

          margin-bottom: 4px;

          font-family: Arial, sans-serif;

          font-size: 15px;

          font-weight: 500;

          color: #1e293b;
        }


        /* =========================
           INPUTS
        ========================= */

        .form-input,
        .form-select {
          width: 100%;

          height: 43px;

          padding: 0 18px;

          border: 1px solid #dbe3ec;

          border-radius: 9px;

          background: #ffffff;

          color: #0f172a;

          font-family: Arial, sans-serif;

          font-size: 15px;

          outline: none;

          transition: all 0.2s ease;
        }

        .form-input::placeholder {
          color: #94a3b8;
        }

        .form-input:focus,
        .form-select:focus {
          border-color: #10b981;

          box-shadow:
            0 0 0 3px
            rgba(16, 185, 129, 0.12);
        }

        .form-select {
          cursor: pointer;
        }


        /* =========================
           DESIGNATION
        ========================= */

        .designation-grid {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 14px;
        }

        .designation-button {
          height: 43px;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 8px;

          border: 1px solid #dbe3ec;

          border-radius: 9px;

          background: #ffffff;

          color: #475569;

          font-family: Arial, sans-serif;

          font-size: 15px;

          font-weight: 500;

          cursor: pointer;

          transition: all 0.2s ease;
        }

        .designation-button:hover {
          border-color: #6ee7b7;

          color: #059669;
        }

        .designation-button.active {
          background: #10b981;

          border-color: #10b981;

          color: #ffffff;

          box-shadow:
            0 3px 8px
            rgba(16, 185, 129, 0.18);
        }


        /* =========================
           ERROR
        ========================= */

        .error-text {
          margin: 3px 0 0;

          font-family: Arial, sans-serif;

          font-size: 11px;

          color: #dc2626;
        }


        /* =========================
           SUBMIT BUTTON
        ========================= */

        .submit-button {
          width: 100%;

          height: 43px;

          margin-top: 1px;

          border: none;

          border-radius: 9px;

          background: #10b981;

          color: white;

          font-family: Arial, sans-serif;

          font-size: 16px;

          font-weight: 600;

          cursor: pointer;

          transition:
            background 0.2s ease;

          box-shadow:
            0 3px 8px
            rgba(16, 185, 129, 0.18);
        }

        .submit-button:hover {
          background: #059669;
        }


        /* =========================
           SUCCESS MESSAGE
        ========================= */

        .success-banner {
          display: flex;

          align-items: center;

          gap: 8px;

          margin-bottom: 10px;

          padding: 8px 12px;

          border: 1px solid #a7f3d0;

          border-radius: 8px;

          background: #ecfdf5;

          color: #047857;

          font-size: 13px;

          animation:
            fade-in-up 0.35s ease-out;
        }


        /* =========================
           ANIMATIONS
        ========================= */

        @keyframes pulse-ring {

          0% {
            transform: scale(0.9);
            opacity: 0.5;
          }

          70% {
            transform: scale(1.6);
            opacity: 0;
          }

          100% {
            transform: scale(1.6);
            opacity: 0;
          }

        }

        @keyframes trace {

          0% {
            stroke-dashoffset: 100;
          }

          100% {
            stroke-dashoffset: -100;
          }

        }

        @keyframes fade-in-up {

          0% {
            transform: translateY(6px);
            opacity: 0;
          }

          100% {
            transform: translateY(0);
            opacity: 1;
          }

        }


        /* =========================
           SMALL SCREEN
        ========================= */

        @media (max-width: 700px) {

          .add-staff-page {
            padding: 0;
          }

          .staff-card {
            width: 100%;
            height: 100vh;

            border-radius: 0;

            padding:
              20px
              22px
              15px;
          }

          .form-group {
            margin-bottom: 10px;
          }

        }

      `}</style>


      {/* PAGE */}

      <div className="add-staff-page">

        {/* CARD */}

        <div className="staff-card">

          {/* LOGO */}

          <EcoPulseLogo />


          {/* HEADING */}

          <div className="heading-section">

            <h1>
              Add Staff
            </h1>

            <p>
              Waste Management Team Registration
            </p>

          </div>


          {/* ECG */}

          <PulseDivider />


          {/* SUCCESS MESSAGE */}
{submitted && staffCredentials && (
  <div className="success-banner">
    <CheckCircle2 size={16} />

    <div>
      <strong>Staff member added successfully</strong>

      <div>
        Username: {staffCredentials.email}
      </div>

      <div>
        Temporary Password: {staffCredentials.temporary_password}
      </div>

      <small>
        Please provide these login credentials to the staff member.
      </small>
    </div>
  </div>
)}


          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            noValidate
            className="staff-form"
          >

            {/* FULL NAME */}

            <div className="form-group">

              <label
                htmlFor="name"
                className="form-label"
              >
                Full Name
              </label>

              <input
                id="name"
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                placeholder="e.g. Anjali Nair"
                className="form-input"
              />

              {errors.name && (
                <p className="error-text">
                  {errors.name}
                </p>
              )}

            </div>


            {/* EMAIL */}

            <div className="form-group">

              <label
                htmlFor="email"
                className="form-label"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                placeholder="name@panchayat.gov.in"
                className="form-input"
              />

              {errors.email && (
                <p className="error-text">
                  {errors.email}
                </p>
              )}

            </div>


            {/* WARD */}

            <div className="form-group">

              <label
                htmlFor="ward"
                className="form-label"
              >
                Ward
              </label>

              <select
                id="ward"
                value={form.ward}
                onChange={handleChange("ward")}
                className="form-select"
              >

                <option value="">
                  Select ward
                </option>

                {WARDS.map((ward) => (
                  <option
                   key={ward.id}
                  value={ward.id}
                  >  
                   {ward.name}
                </option>
   ))}

              </select>

              {errors.ward && (
                <p className="error-text">
                  {errors.ward}
                </p>
              )}

            </div>


            {/* DESIGNATION */}

            <div className="form-group">

              <label className="form-label">
                Designation
              </label>

              <div className="designation-grid">

                {DESIGNATIONS.map(
                  (designation) => {

                    const Icon =
                      designation === "Driver"
                        ? Truck
                        : UserPlus;

                    const active =
                      form.designation ===
                      designation;

                    return (
                      <button
                        key={designation}
                        type="button"
                        className={
                          `designation-button ${
                            active
                              ? "active"
                              : ""
                          }`
                        }
                        onClick={() => {

                          setForm((prev) => ({
                            ...prev,
                            designation,
                          }));

                          setErrors((prev) => ({
                            ...prev,
                            designation: "",
                          }));

                        }}
                      >

                        <Icon size={19} />

                        {designation}

                      </button>
                    );

                  }
                )}

              </div>

              {errors.designation && (
                <p className="error-text">
                  {errors.designation}
                </p>
              )}

            </div>


            {/* DATE OF JOINING */}

            <div className="form-group">

              <label
                htmlFor="dateOfJoining"
                className="form-label"
              >
                Date of Joining
              </label>

              <input
                id="dateOfJoining"
                type="date"
                value={form.dateOfJoining}
                onChange={handleChange(
                  "dateOfJoining"
                )}
                className="form-input"
              />

              {errors.dateOfJoining && (
                <p className="error-text">
                  {errors.dateOfJoining}
                </p>
              )}

            </div>


            {/* SUBMIT BUTTON */}

            <button
              type="submit"
              className="submit-button"
            >
              Add Staff Member
            </button>

          </form>

        </div>

      </div>
    </>
  );
}