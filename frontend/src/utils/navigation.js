import { getUserRole } from "./auth";

/**
 * Returns the canonical dashboard route for the currently authenticated user.
 * Role mappings:
 *   CITIZEN  -> /user
 *   ADMIN    -> /admin
 *   STAFF    -> /staff
 *   RECYCLER -> /recycler
 */
export const getRoleDashboard = () => {
  const role = (getUserRole() || "").toUpperCase();
  if (role === "ADMIN") return "/admin";
  if (role === "STAFF") return "/staff";
  if (role === "RECYCLER") return "/recycler";
  return "/user";
};

/**
 * Safely navigates the user back.
 * If in-app history is available (state.idx > 0), navigates to the previous page.
 * Otherwise, falls back safely to the specified route or the user's role dashboard.
 */
export const safeNavigateBack = (navigate, fallbackRoute) => {
  const targetFallback = fallbackRoute || getRoleDashboard();
  if (window.history.state && typeof window.history.state.idx === "number" && window.history.state.idx > 0) {
    navigate(-1);
  } else if (typeof navigate === "function") {
    navigate(targetFallback);
  } else {
    window.location.href = targetFallback;
  }
};
