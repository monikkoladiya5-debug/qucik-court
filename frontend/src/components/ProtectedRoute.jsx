import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps routes that require authentication and/or a specific role.
 *
 * Usage:
 *   <ProtectedRoute>          — requires any authenticated user
 *   <ProtectedRoute role="ADMIN">   — requires ADMIN role
 *   <ProtectedRoute role="OWNER">   — requires OWNER role
 *
 * On failure redirects to /auth.
 * Frontend protection is a UX layer; backend still enforces authorization.
 */
export default function ProtectedRoute({ children, role, allowedRoles }) {
  const { isAuthenticated, role: userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (role && userRole !== role) {
    // Authenticated but wrong role — redirect to their own home
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && Array.isArray(allowedRoles) && !allowedRoles.includes(userRole)) {
    // Authenticated but role not in allowedRoles list — redirect to home
    return <Navigate to="/" replace />;
  }

  return children;
}
