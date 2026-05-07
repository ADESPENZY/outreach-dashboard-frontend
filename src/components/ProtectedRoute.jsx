import React from 'react';
import Spinner from './Spinner';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireOnboarding = false }) => {
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireOnboarding && currentUser && !currentUser.onboarding_complete) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default ProtectedRoute;