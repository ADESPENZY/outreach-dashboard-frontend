import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { clearClientAuthState } from '../api';
import { getMe } from '../services/apiAuth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const user = await getMe();
      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch (err) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      clearClientAuthState();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (data) => {
    const response = await api.post("/dashboard/auth/login/", data);
    const { access } = response.data;
    sessionStorage.setItem("access", access);
    await checkAuth();
  };

  const register = async (data) => {
    const response = await api.post("/dashboard/auth/register/", data);
    const { access } = response.data;
    sessionStorage.setItem("access", access);
    await checkAuth();
  };

  const logout = async () => {
    try {
      await api.post("/dashboard/auth/logout/");
    } catch (e) {
      console.error("Logout failed on server, clearing locally", e);
    } finally {
      clearClientAuthState();
      setCurrentUser(null);
      setIsAuthenticated(false);
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, isLoading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
