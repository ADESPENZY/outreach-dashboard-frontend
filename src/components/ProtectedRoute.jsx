import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ requireOnboarding = false }) => {
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Onboarding is progressive now — there's no standalone wizard. Any caller
  // that still asks for it is sent to the Profile page (the setup home).
  if (requireOnboarding && currentUser && !currentUser.onboarding_complete) {
    return <Navigate to="/dashboard/profile" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;