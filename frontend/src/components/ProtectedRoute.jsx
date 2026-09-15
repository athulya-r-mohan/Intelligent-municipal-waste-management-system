import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated, getUserRole } from "../utils/auth";

/**
 * Route protection wrapper component.
 * Redirects unauthenticated users to /login and handles role-based authorization.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const isAuth = isAuthenticated();
  const currentRole = getUserRole();

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const roleNormalized = (currentRole || "").toUpperCase();
    const hasRole = allowedRoles.some(
      (role) => role.toUpperCase() === roleNormalized
    );

    if (!hasRole) {
      // If user doesn't have the required role, redirect to their home page
      if (roleNormalized === "ADMIN") return <Navigate to="/admin" replace />;
      if (roleNormalized === "STAFF") return <Navigate to="/staff" replace />;
      if (roleNormalized === "RECYCLER") return <Navigate to="/recycler" replace />;
      return <Navigate to="/user" replace />;
    }
  }

  return children ? children : <Outlet />;
}
