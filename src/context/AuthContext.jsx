import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { clearClientAuthState } from '../api';
import { getMe, login as loginApi, register as registerApi } from '../services/apiAuth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    if (!sessionStorage.getItem('access')) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
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
    const { access } = await loginApi(data);
    sessionStorage.setItem("access", access);
    await checkAuth();
  };

  const register = async (data) => {
    const { access } = await registerApi(data);
    sessionStorage.setItem("access", access);
    await checkAuth();
  };

  const logout = async () => {
    try {
      await api.post("/api/accounts/auth/logout/");
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
