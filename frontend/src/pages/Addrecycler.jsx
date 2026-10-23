import React, { useState } from "react";
import {
  CheckCircle2,
  Activity,
} from "lucide-react";
import axios from "axios";
import { BASE_URL } from "../api/api";
import "../components/Addrecycler.css";

const WASTE_TYPES = [
  "Plastic",
  "Paper",
  "Glass",
  "Metal",
  "E-Waste",
  "Organic Waste",
  "Mixed Waste",
];

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

export default function AddRecyclerForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    wasteType: "",
    dateOfRegistration: "",
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [recyclerCredentials, setRecyclerCredentials] =
    useState(null);

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

    if (!form.phone.trim()) {
      next.phone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(form.phone)) {
      next.phone = "Enter a valid 10 digit phone number";
    }

    if (!form.organization.trim()) {
      next.organization =
        "Recycling organization is required";
    }

    if (!form.wasteType) {
      next.wasteType = "Waste type is required";
    }

    if (!form.dateOfRegistration) {
      next.dateOfRegistration =
        "Date of registration is required";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const response = await axios.post(
        `${BASE_URL}/api/add-recycler/`,
        {
          name: form.name,
          email: form.email,
          phone: form.phone,
          organization: form.organization,
          waste_type: form.wasteType,
          date_of_registration:
            form.dateOfRegistration,
        }
      );

      console.log(response.data);

      setRecyclerCredentials({
        email: response.data.email,
        temporary_password:
          response.data.temporary_password,
      });

      setSubmitted(true);

      setForm({
        name: "",
        email: "",
        phone: "",
        organization: "",
        wasteType: "",
        dateOfRegistration: "",
      });
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.error ||
          "Failed to add recycler"
      );
    }
  };

  return (
    <div className="add-recycler-page">
      <div className="recycler-card">

        <EcoPulseLogo />

        <div className="heading-section">
          <h1>Add Recycler</h1>

          <p>
            Recycling Partner Registration
          </p>
        </div>

        <PulseDivider />

        {submitted && recyclerCredentials && (
          <div className="success-banner">
            <CheckCircle2 size={16} />

            <div>
              <strong>
                Recycler added successfully
              </strong>

              <div>
                Username:{" "}
                {recyclerCredentials.email}
              </div>

              <div>
                Temporary Password:{" "}
                {
                  recyclerCredentials
                    .temporary_password
                }
              </div>

              <small>
                Please provide these login
                credentials to the recycler.
              </small>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="recycler-form"
        >

          {/* NAME */}
          <div className="form-group">
            <label
              htmlFor="name"
              className="form-label"
            >
              Recycler Name
            </label>

            <input
              id="name"
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="e.g. Green Earth Recycling"
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
              placeholder="recycler@example.com"
              className="form-input"
            />

            {errors.email && (
              <p className="error-text">
                {errors.email}
              </p>
            )}
          </div>

          {/* PHONE */}
          <div className="form-group">
            <label
              htmlFor="phone"
              className="form-label"
            >
              Phone Number
            </label>

            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="e.g. 9876543210"
              className="form-input"
            />

            {errors.phone && (
              <p className="error-text">
                {errors.phone}
              </p>
            )}
          </div>

          {/* ORGANIZATION */}
          <div className="form-group">
            <label
              htmlFor="organization"
              className="form-label"
            >
              Recycling Organization
            </label>

            <input
              id="organization"
              type="text"
              value={form.organization}
              onChange={handleChange("organization")}
              placeholder="e.g. Green Kerala Recyclers"
              className="form-input"
            />

            {errors.organization && (
              <p className="error-text">
                {errors.organization}
              </p>
            )}
          </div>

          {/* WASTE TYPE */}
          <div className="form-group">
            <label
              htmlFor="wasteType"
              className="form-label"
            >
              Waste Type
            </label>

            <select
              id="wasteType"
              value={form.wasteType}
              onChange={handleChange("wasteType")}
              className="form-select"
            >
              <option value="">
                Select waste type
              </option>

              {WASTE_TYPES.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>

            {errors.wasteType && (
              <p className="error-text">
                {errors.wasteType}
              </p>
            )}
          </div>

          {/* DATE */}
          <div className="form-group">
            <label
              htmlFor="dateOfRegistration"
              className="form-label"
            >
              Date of Registration
            </label>

            <input
              id="dateOfRegistration"
              type="date"
              value={form.dateOfRegistration}
              onChange={handleChange(
                "dateOfRegistration"
              )}
              className="form-input"
            />

            {errors.dateOfRegistration && (
              <p className="error-text">
                {errors.dateOfRegistration}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="submit-button"
          >
            Add Recycler
          </button>

        </form>
      </div>
    </div>
  );
}