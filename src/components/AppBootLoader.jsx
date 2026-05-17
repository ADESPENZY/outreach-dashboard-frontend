import React from 'react';
import { useAuth } from '../context/AuthContext';

const AppBootLoader = () => {
  const { isLoading } = useAuth();
  if (!isLoading) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden pointer-events-none"
      role="progressbar"
      aria-label="Loading"
    >
      <div className="absolute top-0 h-full w-[40%] bg-gradient-to-r from-primary-dark via-primary-light to-primary-dark shadow-[0_0_8px_rgba(255,91,46,0.6)] animate-slide-progress" />
    </div>
  );
};

export default AppBootLoader;
