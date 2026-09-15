/**
 * EcoPulse Authentication & Token Management Utilities
 */

const TOKEN_KEYS = ["access", "access_token", "accessToken", "token"];
const REFRESH_KEYS = ["refresh", "refresh_token", "refreshToken"];
const USER_DATA_KEYS = ["role", "name", "user_id", "ward_id", "email"];

/**
 * Retrieve the active access token from storage.
 */
export const getAccessToken = () => {
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

/**
 * Retrieve the active refresh token from storage.
 */
export const getRefreshToken = () => {
  for (const key of REFRESH_KEYS) {
    const token = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

/**
 * Retrieve the authenticated user's role (e.g. CITIZEN, ADMIN, STAFF, RECYCLER).
 */
export const getUserRole = () => {
  return localStorage.getItem("role") || sessionStorage.getItem("role") || null;
};

/**
 * Retrieve the authenticated user's display name.
 */
export const getUserName = () => {
  return localStorage.getItem("name") || sessionStorage.getItem("name") || "";
};

/**
 * Check if the user is currently authenticated.
 */
export const isAuthenticated = () => {
  return Boolean(getAccessToken());
};

/**
 * Clear all authentication credentials, tokens, and session data.
 * Retains harmless app preferences like sound toggles.
 */
export const clearAuthTokens = () => {
  // Clear all known token and user keys
  [...TOKEN_KEYS, ...REFRESH_KEYS, ...USER_DATA_KEYS].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

/**
 * Perform a full logout:
 * 1. Clears token credentials from storage
 * 2. Redirects to /login replacing history to prevent back-button navigation
 */
export const performLogout = (navigate) => {
  clearAuthTokens();
  if (typeof navigate === "function") {
    navigate("/login", { replace: true });
  } else {
    window.location.replace("/login");
  }
};
