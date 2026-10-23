import axios from "axios";

// Environment-aware backend URL configuration:
// 1. Vite environment variable: import.meta.env.VITE_API_BASE_URL (.env)
// 2. Vite development mode fallback: http://127.0.0.1:8000
// 3. Production fallback: https://intelligent-municipal-waste-management.onrender.com

const rawEnvUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();

// Normalize URL: remove any trailing slashes and trailing '/api' so BASE_URL is clean origin
const cleanBaseUrl = rawEnvUrl
  ? rawEnvUrl.replace(/\/+$/, "").replace(/\/api$/, "")
  : (import.meta.env.DEV
      ? "http://127.0.0.1:8000"
      : "https://intelligent-municipal-waste-management.onrender.com");

export const BASE_URL = cleanBaseUrl.replace(/\/+$/, "");
export const API_BASE_URL = `${BASE_URL}/api`;

if (typeof window !== "undefined" && import.meta.env.DEV) {
  console.log(`%c[EcoPulse] Backend URL from .env: ${BASE_URL}`, "color: #10b981; font-weight: bold; font-size: 12px;");
}

const API = axios.create({
  baseURL: API_BASE_URL,
});

export default API;