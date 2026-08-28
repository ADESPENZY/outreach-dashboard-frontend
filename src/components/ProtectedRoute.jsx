import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { settingsLink } from '../constants/settingsSections';
import { useIsMobile } from '../hooks/useIsMobile';

const ProtectedRoute = ({ requireOnboarding = false }) => {
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const location = useLocation();
  // Called before the early returns below — hook order must stay stable.
  const isMobile = useIsMobile();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Onboarding is progressive now — there's no standalone wizard. Any caller
  // that still asks for it is sent to the Settings → Profile tab (the setup
  // home) on desktop, or straight to the Profile screen on mobile.
  if (requireOnboarding && currentUser && !currentUser.onboarding_complete) {
    return <Navigate to={settingsLink('profile', isMobile)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;